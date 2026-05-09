import aiohttp
import asyncio
import requests
from bs4 import BeautifulSoup
import re
import datetime
import urllib.parse
import json
import unicodedata
from functools import lru_cache
from typing import Dict, List, Optional, Any
from turbo_engine import turbo_cache
from stock_names import STOCK_MAP

# [Config]
HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://stock.naver.com/",
    "Origin": "https://stock.naver.com"}


# [Helper] Robust Decoding
def decode_safe(res: requests.Response) -> str:
    """
    [v4.0.0] Ultra-Robust Decoding for Naver Finance (EUC-KR Priority).
    """
    if not res or not res.content:
        return ""
    
    # [1] Try to get encoding from headers
    header_enc = res.encoding
    if header_enc and header_enc.lower() in ['euc-kr', 'cp949', 'ks_c_5601-1987']:
        try:
            return res.content.decode('cp949', errors='replace')
        except: pass

    # [2] Heuristic Search
    content = res.content
    candidates = []
    # CP949 is the most common for Naver
    for enc in ['cp949', 'utf-8', 'euc-kr', 'iso-8859-1']:
        try:
            decoded = content.decode(enc, errors='replace')
            # Check for actual Hangul characters (NFC)
            kor_count = sum(1 for c in decoded if 0xAC00 <= ord(c) <= 0xD7A3)
            # Penalize replacement characters
            rep_count = decoded.count('\ufffd')
            score = kor_count - (rep_count * 10)
            candidates.append((score, decoded))
        except:
            pass

    if not candidates:
        return res.text
    
    # Sort by score descending
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def robust_name(s: str) -> str:
    """
    [v4.0.0] The Silver Bullet for Naver's mixed-encoding madness.
    Recovers Korean text even if the page has mixed UTF-8 and CP949.
    """
    if not s or not isinstance(s, str) or s == "-":
        return s

    # 1. If it has Korean, it's probably fine, but check for "Half-Mojibake"
    # (e.g. some chars are fine, some are garbled)
    # But for now, if it has any Korean, we trust it mostly.
    if any(0xAC00 <= ord(c) <= 0xD7A3 for c in s):
        # Even if it has Korean, it might contain \ufffd or Mojibake markers
        if "\ufffd" not in s and "" not in s and "Ｚ" not in s:
            return s

    # 2. Recovery Strategies
    strategies = [
        ('iso-8859-1', 'utf-8'),
        ('iso-8859-1', 'cp949'),
        ('utf-8', 'cp949'),
        ('cp949', 'utf-8')
    ]

    for enc_from, enc_to in strategies:
        try:
            # We try to re-encode the "garbage" and decode it correctly
            repaired = s.encode(
                enc_from,
                errors='ignore').decode(
                enc_to,
                errors='ignore')
            if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                # Check if it looks "clean"
                if "\ufffd" not in repaired and "" not in repaired:
                    return repaired
        except BaseException:
            pass

    # 3. Clean up remaining garbage characters
    s = s.replace("\ufffd", "").replace("", "")
    return s.strip()


def get_korean_name(symbol: str):
    """
    Get Korean stock name from Naver Finance
    """
    info = get_naver_stock_info(symbol)
    if info:
        return info.get('name')
    return None


get_korean_stock_name = get_korean_name  # Alias


@turbo_cache(ttl_seconds=86400)  # Mapping is stable, cache longer
def search_stock_code(keyword: str):
    print(f"\n[TRACE] search_stock_code called with keyword: '{keyword}'")
    """
    [v3.1.0-Enhanced] Mission-Critical Multi-layer Search Engine
    Goal: 100% resolution for Korean stocks with Unicode Normalization (NFC).
    Adds dedicated Naver Finance Search List fallback.
    """
    if not keyword:
        return None

    # Unicode Normalization (NFC) for robust matching (Prevents NFC/NFD
    # mismatch)
    keyword_clean = unicodedata.normalize('NFC', keyword.strip())
    print(f"\n[Search Tier 0] Processing: '{keyword_clean}' (Standardized)")

    # 0. Direct Ticker Check (6 digits)
    code = re.sub(r'[^0-9]', '', keyword_clean)
    if len(code) == 6 and code.isdigit():
        print(f" -> Found direct code: {code}")
        return code

    # 1. Internal Mapping Table (Fastest & 100% Reliable for major stocks)
    if keyword_clean in STOCK_MAP:
        found_code = STOCK_MAP[keyword_clean]
        print(f" -> Found in internal map: {found_code}")
        return found_code

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://finance.naver.com/"}

    # 2. Naver Finance Auto-Complete API (Official mapping service)
    try:
        print(f"[Search Tier 2] Trying Naver AC API for '{keyword_clean}'...")
        encoded_keyword = urllib.parse.quote(keyword_clean)
        ac_url = f"https://ac.finance.naver.com/ac?q={encoded_keyword}&q_enc=utf-8&st=111&frm=stock&r_format=json&r_enc=utf-8&r_unicode=1&t_koreng=1&ans=2&run=2&rev=4&con=1&r_lt=111"
        res_ac = requests.get(
            ac_url,
            headers=headers,
            timeout=2)  # Timeout shortened to 2s
        if res_ac.status_code == 200:
            data = res_ac.json()
            items = data.get("items", [])
            if items and len(items) > 0 and len(items[0]) > 0:
                for match in items[0]:
                    if match and len(match) > 0 and len(match[0]) >= 2:
                        found_name = match[0][0]
                        found_code = match[0][1]
                        # Exact match or high similarity
                        if keyword_clean in found_name or found_name in keyword_clean:
                            print(
                                f" -> Found via AC API: {found_code} ({found_name})")
                            return found_code
    except Exception as e:
        print(f"  !! AC API Stage failed: {e}. Moving to Tier 3.")

    # 3. Naver Finance Search List (Powerful Fallback for exact/partial name
    # matches)
    try:
        print(
            f"[Search Tier 3] Trying Naver Finance Search List for '{keyword_clean}'...")
        try:
            euc_query = urllib.parse.quote(keyword_clean.encode('euc-kr'))
        except BaseException:
            euc_query = urllib.parse.quote(keyword_clean)

        search_url = f"https://finance.naver.com/search/searchList.naver?query={euc_query}"
        res_s = requests.get(search_url, headers=headers, timeout=5)

        # Decoding: Naver Search List is EUC-KR
        try:
            s_html = res_s.content.decode('euc-kr')
        except BaseException:
            s_html = res_s.text

        s_soup = BeautifulSoup(s_html, 'html.parser')
        result_rows = s_soup.select(".tbl_search tbody tr")
        if result_rows:
            for row in result_rows:
                # Naver Finance search table structure
                a_tag = row.select_one("td.tit a")
                if a_tag:
                    name = a_tag.text.strip()
                    href = a_tag.get('href', '')
                    code_match = re.search(r'code=(\d{6})', href)
                    if code_match:
                        found_code = code_match.group(1)
                        if keyword_clean in name or name in keyword_clean:
                            print(
                                f" -> Found via Finance Search List: {found_code} ({name})")
                            return found_code
    except Exception as se:
        print(f"  !! Finance Search List Stage failed: {se}")

    # 4. Yahoo Finance Global Lookup
    try:
        print(
            f"[Search Tier 4] Trying Yahoo Finance Fallback for '{keyword_clean}'...")
        encoded_keyword = urllib.parse.quote(keyword_clean)
        yurl = f"https://query2.finance.yahoo.com/v1/finance/search?q={encoded_keyword}&lang=ko-KR"
        res_y = requests.get(yurl, headers=headers, timeout=5)
        ydata = res_y.json()
        if ydata.get('quotes'):
            for q in ydata['quotes']:
                symbol = q.get('symbol', '')
                if symbol.endswith('.KS') or symbol.endswith('.KQ'):
                    ycode = symbol.split('.')[0]
                    if len(ycode) == 6 and ycode.isdigit():
                        print(f" -> Found via Yahoo: {ycode} ({symbol})")
                        return ycode
    except Exception as ye:
        print(f"  !! Yahoo Stage failed: {ye}")

    # 5. Final Fallback: Naver Integration Search
    try:
        print(f"[Search Tier 5] Trying Naver Integration Search Fallback...")
        query = f"{keyword_clean} 주가"
        encoded = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query={encoded}"
        res = requests.get(url, headers=headers, timeout=5)
        # Integration search is UTF-8
        html = res.content.decode('utf-8', 'ignore')
        matches = re.findall(
            r'finance\.naver\.com/item/main\.(?:naver|nhn)\?code=(\d{6})', html)
        if matches:
            print(f" -> Found via Integration Search: {matches[0]}")
            return matches[0]
    except Exception as ie:
        print(f"  !! Integration Search Stage failed: {ie}")

    print(f" -> [Search Failed] No results for '{keyword_clean}' in any tier.")
    return None


search_korean_stock_symbol = search_stock_code  # Alias


@turbo_cache(ttl_seconds=30)
def gather_naver_stock_data(symbol: str):
    """
    Fetch comprehensive stock info from Naver (Price, Name, Market Type, Detailed Financials).
    [v6.0.0] Uses new JSON APIs as primary sources for Domestic Stocks.
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

        if len(code) != 6:
            return None

        # Initialize variables
        price = 0
        name = symbol
        market_type = "KS"
        per = eps = dvr = pbr = bps = None
        est_per = est_eps = dp_share = None
        year_high = year_low = None
        open_val = high_val = low_val = volume_val = None
        description = ""
        market_status = "Unknown"
        change_pct_str = "0.00%"
        change_val = 0
        nxt_data = None
        sector_name = "Unknown"
        market_cap_str = "N/A"

        # 1. New Detail API (Primary for Financials)
        try:
            detail_url = f"https://stock.naver.com/api/domestic/detail/{code}/detail?codeType=KRX"
            d_res = requests.get(detail_url, headers=HEADER, timeout=5)
            if d_res.status_code == 200:
                d_data = d_res.json()

                # Extract Metrics
                def to_f(v):
                    if v is None or v == "":
                        return None
                    try:
                        return float(str(v).replace(',', ''))
                    except BaseException:
                        return None

                per = to_f(d_data.get('per'))
                eps = to_f(d_data.get('eps'))
                pbr = to_f(d_data.get('pbr'))
                bps = to_f(d_data.get('bps'))
                # Naver Detail API dividendRate is often in %
                dvr = to_f(d_data.get('dividendRate'))
                if dvr is not None:
                    dvr = dvr / 100.0

                est_per = to_f(d_data.get('estimatedPer'))
                est_eps = to_f(d_data.get('estimatedEps'))

                year_high = to_f(d_data.get('week52HighPrice'))
                year_low = to_f(d_data.get('week52LowPrice'))

                name = d_data.get('stockName', name)
                print(
                    f"[gather_naver_stock_data] New Detail API success for {code}")
        except Exception as e:
            print(f"[gather_naver_stock_data] Detail API failed: {e}")

        # 2. Integration Price API (Primary for Price/Status)
        try:
            p_url = f"https://stock.naver.com/api/securityService/integration/price?domesticKrxCodes={code}"
            p_res = requests.get(p_url, headers=HEADER, timeout=5)
            if p_res.status_code == 200:
                p_root = p_res.json()
                item = p_root.get('domesticKrx', {}).get(code)
                if item:
                    m_info = item.get('overMarketPriceInfo', {})
                    # [v7.1.0] Distinct price extraction
                    # regular_close should be the current regular session price
                    reg_price = float(str(item.get('currentPrice') or item.get('closePrice') or '0').replace(',', ''))
                    over_price = float(str(m_info.get('overPrice', '0')).replace(',', '')) if m_info else 0

                    # [v7.1.2] Regular Close fallback for off-hours
                    # If we are in NXT or After-hours, 'currentPrice' might be the after-hours price.
                    # We verify against daily prices to get the true 15:30 regular close.
                    market_status_raw = item.get('marketStatus', '')
                    if market_status_raw != 'OPEN' or over_price > 0:
                        try:
                            # We can get the last regular close from daily prices
                            # This avoids NXT price contaminating the KRX price card
                            d_history = get_naver_daily_prices(code)
                            if d_history and len(d_history) > 0:
                                reg_price = float(d_history[0].get('close', reg_price))
                        except:
                            pass
                    
                    # Main 'price' field will be the LATEST available price for backward compatibility,
                    # but we will rely on regular_close for the UI separation.
                    price = over_price if over_price > 0 else reg_price
                    regular_close = reg_price

                    # [Fix] Fetch stock name from Price API
                    name = item.get('stockName', name)

                    # [v7.1.1] Session-aware changes
                    # Regular change (vs yesterday)
                    reg_change_val = int(str(item.get('compareToPreviousClosePrice', '0')).replace(',', ''))
                    reg_change_pct = float(item.get('fluctuationsRatio', '0'))
                    
                    # Over-hours change (vs today's regular close)
                    over_change_val = int(str(m_info.get('fluctuations', '0')).replace(',', '')) if m_info else 0
                    over_change_pct = float(m_info.get('fluctuationsRatio', '0')) if m_info else 0

                    change_pct_str = f"{reg_change_pct:+.2f}%"
                    change_val = reg_change_val

                    open_val = to_f(item.get('openPrice'))
                    high_val = to_f(item.get('highPrice'))
                    low_val = to_f(item.get('lowPrice'))
                    volume_val = to_f(item.get('accumulatedTradingVolume'))

                    # [v7.0.0] Refined Session Detection
                    reg_status = item.get('marketStatus')
                    over_status = m_info.get('overMarketStatus') if m_info else 'CLOSE'
                    
                    import datetime
                    now_dt = datetime.datetime.now()
                    is_weekend = now_dt.weekday() >= 5
                    
                    if is_weekend:
                        market_status = "휴장 (주말)"
                    elif reg_status == 'OPEN':
                        market_status = "장중"
                    elif over_status == 'OPEN':
                        market_status = "시간외 거래 중"
                    elif nxt_data and nxt_data.get('price'):
                        # [v7.0.1] Detect NXT active status
                        market_status = "야간거래(NXT) 진행 중"
                    else:
                        market_status = "장마감"

                    if item.get('marketType') == 'KOSPI':
                        market_type = 'KS'
                    elif item.get('marketType') == 'KOSDAQ':
                        market_type = 'KQ'

                    # NXT Data
                    nxt_item = p_root.get('domesticNxt', {}).get(code)
                    if nxt_item:
                        nxt_price = to_f(nxt_item.get('closePrice'))
                        if nxt_price:
                            nxt_pct = float(nxt_item.get(
                                'fluctuationsRatio', 0))
                            nxt_data = {
                                "price": nxt_price,
                                "change_val": int(
                                    str(
                                        nxt_item.get(
                                            'compareToPreviousClosePrice',
                                            '0')).replace(
                                        ',',
                                        '')),
                                "change_pct": nxt_pct}
                    print(
                        f"[gather_naver_stock_data] New Price API success for {code}")
        except Exception as e:
            print(f"[gather_naver_stock_data] Price API failed: {e}")

        # 3. Fallback/Legacy Scraping for Description & Extras
        url = f"https://finance.naver.com/item/main.naver?code={code}"
        res = requests.get(url, headers=HEADER, timeout=10)
        decoded_str = decode_safe(res)
        soup = BeautifulSoup(decoded_str, 'html.parser')

        # [Fallback Name] If still code, try legacy scraping for name
        if name == symbol or name == code:
            title_tag = soup.select_one(
                "div.wrap_company h2 a") or soup.select_one("div.h_company h2 a")
            if title_tag:
                name = title_tag.text.strip()

        # [Description]
        try:
            co_url = f"https://finance.naver.com/item/coinfo.naver?code={code}&target=corp"
            co_res = requests.get(co_url, headers=HEADER, timeout=4)
            co_html = co_res.content.decode('euc-kr', errors='replace')
            co_soup = BeautifulSoup(co_html, 'html.parser')
            desc_parts = []
            paras = co_soup.select("p")
            for p in paras:
                t = p.text.strip()
                if (30 < len(t) < 300
                        and '네이버파이낸셜' not in t
                        and 'PER' not in t and 'PBR' not in t
                        and '코스피' not in t and '코스닥' not in t
                        and '시가총액' not in t and '외국인' not in t):
                    desc_parts.append(t)
                    if len(desc_parts) >= 3:
                        break
            description = " ".join(desc_parts)
        except BaseException:
            pass

        # [Sector Fallback]
        try:
            sector_tag = soup.select_one("h4.h_sub.sub_tit7 a")
            if sector_tag:
                sector_name = sector_tag.text.strip()
        except BaseException:
            pass

        # [Market Cap Fallback]
        mc = soup.select_one("#_market_sum")
        if mc:
            # [Fix] Robust cleaning for Korean characters and numbers
            raw_mc = mc.text.strip()
            clean_mc = "".join([c for c in raw_mc if c.isdigit() or c in ['\uc870', '\uc5b5', '\uc6d0', ',']])
            market_cap_str = clean_mc + "\uc6d0" if not clean_mc.endswith("\uc6d0") else clean_mc

        # [Session Logic v7.2]
        # We use the prices extracted from the Integration API above.
        regular_close = reg_price
        
        # Determine the "Active" session and promote its price/change to the main fields
        if nxt_data and nxt_data.get('price') and market_status and ("NXT" in market_status or "야간거래" in market_status):
            # Promote NXT (18:00 - 23:50)
            price = nxt_data['price']
            labeled_change_pct = nxt_data.get('change_pct_labeled', f"[야간] {nxt_data.get('change_pct')}")
            change_val = nxt_data.get('change_val', 0)
        elif over_price > 0:
            # Promote After-hours (15:30 - 18:00)
            price = over_price
            labeled_change_pct = f"[시간외] {over_change_pct:+.2f}%"
            change_val = over_change_val
        else:
            # Regular Session (09:00 - 15:30)
            price = reg_price
            labeled_change_pct = f"[정규] {reg_change_pct:+.2f}%"
            change_val = reg_change_val

        # Add labels to nxt_data if present
        if nxt_data and nxt_data.get('change_pct'):
            nxt_data['change_pct_labeled'] = f"[야간] {nxt_data['change_pct']}%" if '%' not in str(nxt_data['change_pct']) else f"[야간] {nxt_data['change_pct']}"

        # [Result Builder]
        res_data = {
            "name": name,
            "description": description,
            "market_type": market_type,
            "code": code,
            "sector": sector_name,
            "price": price,
            "change": labeled_change_pct,
            "change_val": change_val,
            "change_percent": labeled_change_pct,
            "prev_close": price - change_val,
            "regular_close": regular_close,
            "market_cap_str": market_cap_str,
            "per": per,
            "pbr": pbr,
            "eps": eps,
            "bps": bps,
            "dvr": dvr,
            "est_per": est_per,
            "est_eps": est_eps,
            "dp_share": dp_share,
            "year_high": year_high,
            "year_low": year_low,
            "open": open_val,
            "day_high": high_val,
            "day_low": low_val,
            "volume": volume_val,
            "market_status": market_status,
            "regular_change_pct": reg_change_pct,
            "regular_change_val": reg_change_val,
            "nxt_data": nxt_data
        }
        return res_data
    except Exception as e:
        print(f"[gather_naver_stock_data] Critical Failure for {symbol}: {e}")
        return None


@turbo_cache(ttl_seconds=3600)
def get_naver_daily_prices(symbol: str):
    """
    Get daily price history (10 days)
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

        url = f"https://finance.naver.com/item/sise_day.naver?code={code}"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        history = []
        rows = soup.select("table.type2 tr")

        for row in rows:
            cols = row.select("td")
            if len(cols) < 6:
                continue

            try:
                date_txt = cols[0].text.strip()
                if not re.match(r'\d{4}\.\d{2}\.\d{2}', date_txt):
                    continue

                date = date_txt.replace('.', '-')
                close = int(cols[1].text.replace(',', ''))

                # [Fix] Robust change parsing
                # Naver uses EUC-KR. The decode_safe should handle it, but let's be extra careful.
                # The structure is usually <td><img><span>5,000</span></td>

                # 1. Get the direction
                is_drop = False
                is_up = False
                # Check for em classes (bu_pup for up, bu_pdn for down)
                em = cols[2].select_one('em')
                if em:
                    cls = " ".join(em.get('class', []))
                    if 'bu_pup' in cls:
                        is_up = True
                    elif 'bu_pdn' in cls:
                        is_drop = True

                # Check for images (legacy up/down icons)
                img = cols[2].select_one('img')
                if img:
                    alt = img.get('alt', '')
                    src = img.get('src', '')
                    if '하락' in alt or 'nv' in src or 'down' in src.lower():
                        is_drop = True
                    elif '상승' in alt or 'pc' in src or 'up' in src.lower():
                        is_up = True

                # Fallback: Check for span class names (red02 for up, nv01 for
                # down)
                span = cols[2].select_one('span')
                if span:
                    cls = " ".join(span.get('class', []))
                    if 'red' in cls:
                        is_up = True
                    elif 'nv' in cls or 'blue' in cls:
                        is_drop = True

                # 2. Get the value
                raw_txt = cols[2].text.strip().replace(',', '')
                diff_match = re.search(r'(\d+)', raw_txt)
                diff = int(diff_match.group(1)) if diff_match else 0

                if is_drop:
                    diff = -abs(diff)
                elif is_up:
                    diff = abs(diff)

                open_p = int(cols[3].text.replace(',', ''))
                high = int(cols[4].text.replace(',', ''))
                low = int(cols[5].text.replace(',', ''))
                vol = int(cols[6].text.replace(',', ''))

                # Calculate Previous Close for Percentage
                prev_close = close - diff
                change_percent = 0.0
                if prev_close != 0:
                    change_percent = (diff / prev_close) * 100

                # [Safety] Magnitude check for daily history changes
                if abs(change_percent) > 500:
                    change_percent = 0.0

                history.append({
                    "date": date,
                    "close": close,
                    "change": float(change_percent),
                    "change_val": diff,
                    "open": open_p,
                    "high": high,
                    "low": low,
                    "volume": vol
                })
            except BaseException:
                continue

        return history[:10]  # Return top 10
    except Exception as e:
        print(f"Naver History Error: {e}")
        return []


@turbo_cache(ttl_seconds=300)
def get_naver_theme_rank():
    """
    네이버 금융에서 실시간 테마 순위(상위 10-20개)를 상세 데이터와 함께 가져옵니다.
    """
    try:
        url = "https://finance.naver.com/sise/theme.naver"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0",
            "Referer": "https://finance.naver.com/"}
        res = requests.get(url, headers=headers, timeout=5)
        html = decode_safe(res)
        if not html:
            return [{"name": "전선", "change": "+5.2%"},
                    {"name": "반도체", "change": "+3.1%"}]

        soup = BeautifulSoup(html, 'html.parser')

        themes = []
        rows = soup.select("table.type_1 tr")

        for row in rows:
            # col_type1 contains the theme name link
            name_tag = row.select_one("td.col_type1 a")
            if not name_tag:
                name_tag = row.select_one("td.col_type_1 a")

            if name_tag:
                theme_name = name_tag.text.strip()
                # Use robust_name to ensure clean string
                theme_name = theme_name.replace('\u200b', '').strip()
                
                # 등락률 찾기 (2번째 td - col_type2)
                tds = row.select("td")
                change_val = "0.00%"
                if len(tds) >= 2:
                    # Look for col_type2 specifically or the second td
                    change_node = row.select_one("td.col_type2")
                    if change_node:
                        change_val = change_node.text.strip()
                    else:
                        change_val = tds[1].text.strip()

                themes.append({
                    "name": theme_name,
                    "change": change_val,
                    "is_new": "new" in (row.get("class") or [])
                })

            if len(themes) >= 20:
                break

        # Supplement with popular search stocks if themes are few
        if len(themes) < 5:
            try:
                # No need to import fetch_naver_ranking_data, it's in the same
                # file
                search_stocks = fetch_naver_ranking_data("KOR", "searchTop")
                if search_stocks:
                    seen_names = {t['name'] for t in themes}
                    for s in search_stocks[:10]:
                        name = s.get("itemName") or s.get("stockName") or ""
                        if name and name not in seen_names:
                            themes.append({
                                "name": name,
                                "change": s.get("changeRate", "0%"),
                                "is_stock": True
                            })
                            seen_names.add(name)
            except BaseException:
                pass

        return themes
    except Exception as e:
        print(f"Theme Rank Scraping Error: {e}")
        return [{"name": "반도체", "change": "+2.5%"},
                {"name": "전선", "change": "+1.8%"}]


@turbo_cache(ttl_seconds=300)
def get_naver_flash_news():
    """
    Main market news
    """
    try:
        url = "https://finance.naver.com/news/mainnews.naver"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        items = []

        # title-only for now
        articles = soup.select("dl.articleList dd.articleSubject a")
        for a in articles:
            items.append({
                "title": a.text.strip(),
                "link": "https://finance.naver.com" + a['href'],
                "publisher": "Naver Finance",
                "time": ""
            })
        return items[:5]
    except BaseException:
        return []


def get_naver_market_index_data():
    """
    네이버 모바일 API를 사용하여 국내외 주요 지수 및 매크로 지표(금리, VIX, 환율 등)를 통합 수집합니다.
    """
    # [v5.5.0] 네이버 API 경로 최적화 및 다우존스 추가
    indices_to_fetch = [
        {"code": "KOSPI", "label": "KOSPI", "type": "dom"},
        {"code": "KOSDAQ", "label": "KOSDAQ", "type": "dom"},
        {"code": ".INX", "label": "S&P 500", "type": "world"},
        {"code": ".IXIC", "label": "NASDAQ", "type": "world"},
        {"code": ".DJI", "label": "DOW JONES", "type": "world"},
        {"code": ".NDX", "label": "NASDAQ 100", "type": "world"},
        # [Macro Intelligence]
        {"code": ".VIX", "label": "VIX(공포지수)", "type": "world"},
        {"code": "CMTS@TY10", "label": "미 국채 10년물 금리", "type": "old"},
        {"code": "FRX@DXY", "label": "달러 지수", "type": "old"},
        # [European Indices]
        {"code": ".GDAXI", "label": "독일 DAX", "type": "world"},
        {"code": ".FCHI", "label": "프랑스 CAC 40", "type": "world"},
        {"code": ".FTSE", "label": "영국 FTSE 100", "type": "world"}
    ]

    results = []

    def _fetch_one(idx):
        try:
            if idx["type"] == "world":
                url = f"https://api.stock.naver.com/index/{idx['code']}/basic"
            elif idx["type"] == "dom":
                url = f"https://m.stock.naver.com/front-api/realTime/marketPrice?itemCodes={idx['code']}&endType=index&stockType=domestic"
            else:
                url = f"https://m.stock.naver.com/api/index/{idx['code']}/basic"

            res = requests.get(url, headers=HEADER, timeout=5)
            if res.status_code == 200:
                data = res.json()

                if idx["type"] == "dom":
                    datas = data.get("result", {}).get("datas", [])
                    if datas:
                        stock_item = datas[0]
                        price = stock_item.get(
                            'closePrice', '0').replace(
                            ',', '')
                        pct = stock_item.get('fluctuationsRatio', '0')
                    else:
                        price, pct = '0', '0'
                else:
                    price = data.get('closePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')

                is_rate = "금리" in idx["label"] or "TY10" in idx["code"]
                try:
                    price_val = float(price)
                    val_formatted = f"{price_val:.4f}%" if is_rate else f"{price_val:,.2f}"
                except BaseException:
                    val_formatted = price

                return {
                    "label": idx["label"],
                    "value": val_formatted,
                    "change": float(pct),
                    "up": float(pct) >= 0
                }
        except Exception as e:
            print(f"Error fetching index {idx['label']}: {e}")
            return {
                "label": idx["label"],
                "value": "N/A",
                "change": "0.00%",
                "up": True}
        return None

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(indices_to_fetch)) as executor:
        futures = {
            executor.submit(
                _fetch_one,
                idx): idx for idx in indices_to_fetch}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    return results


def get_top_us_stocks_data():
    """
    미국 증시의 풍향계 역할을 하는 시총 상위 및 핵심 테크 15개 종목의 실시간 시세를 수집합니다.
    """
    tickers = [
        "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA",  # Mag 7
        "AVGO", "AMD", "INTC", "ASML", "TSM",  # 핵심 반도체
        "ORCL", "NFLX", "QCOM"  # 기타 주요 테크
    ]

    results = []
    for symbol in tickers:
        data = get_naver_global_stock_data(symbol)
        if data:
            results.append(data)
    return results


def get_naver_global_stock_data(symbol: str):
    """
    네이버 모바일 API를 사용하여 해외 주식(미국 등)의 실시간 시세를 수집합니다.
    야후 파이낸스 차단 상황을 대비한 고가용성 데이터 엔진입니다.
    """
    symbol = symbol.upper()
    # 네이버 해외 주식 코드는 보통 'AAPL.O'(나스닥) 혹은 'AAPL.N'(뉴욕) 형식을 사용합니다.
    # 안전하게 두 가지 모두 시도하거나 대표 거래소를 추측합니다.
    suffixes = ['.O', '.N', '.A']

    for suffix in suffixes:
        test_symbol = symbol + suffix
        try:
            url = f"https://m.stock.naver.com/api/stock/{test_symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    price = data.get('closePrice', '0').replace(',', '')
                    change = data.get(
                        'compareToPreviousClosePrice',
                        '0').replace(
                        ',',
                        '')
                    pct = data.get('fluctuationsRatio', '0')
                    name = data.get('stockName', symbol)

                    return {
                        "symbol": symbol,
                        "name": name,
                        "price": f"{float(price):,.2f}",
                        "change": float(pct),
                        "up": float(pct) >= 0
                    }
        except BaseException:
            continue

    return None


def get_naver_disclosures(symbol: str):
    """
    네이버 금융에서 종목별 최신 공시 정보를 스크래핑합니다.
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

        url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        disclosures = []
        rows = soup.select("table.type5 tbody tr, table.type6 tbody tr")

        for row in rows:
            cols = row.select("td")
            if len(cols) < 3:
                continue

            title_node = cols[0].select_one("a")
            if not title_node:
                continue

            title = title_node.text.strip()
            link = "https://finance.naver.com" + title_node['href']
            info = cols[1].text.strip()
            date = cols[2].text.strip()

            disclosures.append({
                "title": title,
                "link": link,
                "publisher": info,
                "date": date
            })

            if len(disclosures) >= 10:
                break

        return disclosures
    except Exception as e:
        print(f"Disclosure Error: {e}")
        return []

# 실시간 공시용 에일리어스 (main.py에서 사용)


def get_live_disclosures(symbol: str):
    return get_naver_disclosures(symbol)


def get_naver_market_details():
    """
    네이버 금융에서 코스피/코스닥의 투자자별 매매동향 및 등락 종목 수 통계를 수집합니다.
    """
    results = {}
    markets = {"KOSPI": "KOSPI", "KOSDAQ": "KOSDAQ"}

    for m_id, m_name in markets.items():
        try:
            url = f"https://finance.naver.com/sise/sise_index.naver?code={m_id}"
            res = requests.get(url, headers=HEADER, timeout=5)
            soup = BeautifulSoup(decode_safe(res), 'html.parser')

            # 1. 투자자별 매매동향 (수급)
            trading_box = soup.select_one(".dd_box")
            flow = {"개인": "0", "외국인": "0", "기관": "0"}
            if trading_box:
                dls = trading_box.select("dl")
                for dl in dls:
                    label = dl.select_one("dt").text.strip()
                    value = dl.select_one("dd").text.strip()
                    # 억 원 단위 숫자만 추출
                    clean_val = re.sub(r'[^0-9-]', '', value)
                    if label in flow:
                        flow[label] = clean_val

            # 2. 등락 종목 수 통계
            stat_box = soup.select_one(".sub_sum")
            counts = {"상승": "0", "하락": "0", "보합": "0", "상한가": "0", "하한가": "0"}
            if stat_box:
                lis = stat_box.select("li")
                for li in lis:
                    text = li.text.strip()
                    # 예: "상승 639" -> "상승", "639"
                    match = re.search(r'([가-힣]+)\s*(\d+)', text)
                    if match:
                        l = match.group(1)
                        v = match.group(2)
                        if l in counts:
                            counts[l] = v
                    if "상한가" in text:
                        m_up = re.search(r'상한가\s*(\d+)', text)
                        if m_up:
                            counts["상한가"] = m_up.group(1)
                    if "하한가" in text:
                        m_down = re.search(r'하한가\s*(\d+)', text)
                        if m_down:
                            counts["하한가"] = m_down.group(1)

            results[m_id] = {
                "investor_flow": flow,
                "stock_counts": counts
            }
        except Exception as e:
            print(f"[MarketDetails] Error for {m_id}: {e}")

    return results


def get_top_market_cap_stocks(limit=10):
    """
    네이버 금융 시가총액 상위 종목들의 실시간 시세를 수집합니다.
    sosok=0 (KOSPI), sosok=1 (KOSDAQ)
    """
    results = []
    market_types = {"KOSPI": 0, "KOSDAQ": 1}

    for m_name, sosok in market_types.items():
        try:
            url = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}"
            res = requests.get(url, headers=HEADER, timeout=5)
            soup = BeautifulSoup(decode_safe(res), 'html.parser')

            rows = soup.select("table.type_2 tbody tr")
            count = 0
            for row in rows:
                if count >= limit:
                    break

                a_tag = row.select_one("a.tltle")
                if not a_tag:
                    continue

                name = a_tag.text.strip()
                link = a_tag['href']
                code = re.search(r'code=(\d{6})', link).group(1)

                tds = row.select("td")
                # 네이버 시총 페이지 구조: N(0), 종목명(1), 현재가(2), 전일비(3), 등락률(4) ...
                price = tds[2].text.strip().replace(',', '')
                change_pct = tds[4].text.strip().replace('%', '')

                results.append({
                    "market": m_name,
                    "name": name,
                    "code": code,
                    "price": f"{float(price):,.0f}원",
                    "change": float(change_pct)
                })
                count += 1
        except Exception as e:
            print(f"[TopStocks] Error for {m_name}: {e}")

    return results


@turbo_cache(ttl_seconds=120)
def get_integrated_stock_news(
        symbol: str = "",
        name: str = "",
        query: str = "",
        days: int = 1):
    """
    통합 뉴스 수집 엔진 (Tier 0: Naver Finance (Scraping) -> Tier 1: Naver API -> Tier 2: Google RSS)
    days: 0 (전체/1년), 90 (3개월), 180 (6개월), 365 (1년)
    """
    import os
    import re
    from dotenv import load_dotenv
    import urllib.request
    import urllib.parse
    import xml.etree.ElementTree as ET
    from datetime import datetime, timedelta
    import requests
    import html

    news_list = []
    limit_date = datetime.now() - timedelta(days=days if days > 0 else 365)

    # Scale max_items by days
    if days <= 1:
        max_items = 20
        max_pages = 5
    elif days <= 30:
        max_items = 50
        max_pages = 10
    elif days <= 180:
        max_items = 100
        max_pages = 20
    else:
        max_items = 150
        max_pages = 30

    code = ""
    if symbol:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

    search_name = name
    if not search_name and len(code) == 6:
        search_name = code

    # [Tier 0] Naver Finance (Best for Specific Stocks over time)
    if code:
        try:
            print(
                f"[NEWS DEBUG] Scraping Naver Finance News for {code} (Period: {days} days)")
            for page in range(
                    1, max_pages + 1):  # Fetch historical periods based on days
                url = f"https://finance.naver.com/item/news_list.naver?code={code}&page={page}"
                res = requests.get(url, headers=HEADER, timeout=5)
                soup = BeautifulSoup(decode_safe(res), 'html.parser')

                rows = soup.select("table.type5 tbody tr")
                if not rows:
                    break

                page_all_older = True
                for row in rows:
                    cols = row.select("td")
                    if len(cols) < 3:
                        continue

                    title_tag = row.select_one("td.title a")
                    if not title_tag:
                        continue

                    title = title_tag.text.strip()
                    link = "https://finance.naver.com" + title_tag['href']
                    info = row.select_one("td.info").text.strip()
                    date_str = row.select_one("td.date").text.strip()

                    try:
                        news_date = datetime.strptime(
                            date_str, "%Y.%m.%d %H:%M")
                        if news_date < limit_date:
                            continue
                        page_all_older = False
                    except BaseException:
                        pass

                    news_list.append({
                        "title": title,
                        "link": link,
                        "publisher": info,
                        # YYYY-MM-DD
                        "published": date_str.split()[0].replace('.', '-')
                    })

                    if len(news_list) >= max_items:
                        break

                if page_all_older or len(news_list) >= max_items:
                    break

            if news_list:
                return news_list
        except Exception as e:
            print(f"[NEWS] Tier 0 Scraping Error: {e}")

    # [Tier 1] Naver News API
    search_query = f'"{search_name}"' if search_name and not search_name.isdigit(
    ) else (query or search_name or code)
    fallback_query = search_name if (
        search_name and not search_name.isdigit()) else (
        query or code)

    load_dotenv()
    client_id = os.getenv('NAVER_CLIENT_ID')
    client_secret = os.getenv('NAVER_CLIENT_SECRET')

    if client_id and client_secret:
        try:
            url = "https://openapi.naver.com/v1/search/news.json"
            headers = {
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret}
            params = {
                "query": search_query,
                "display": min(
                    max_items,
                    100),
                "sort": "date"}
            response = requests.get(
                url, headers=headers, params=params, timeout=5)
            if response.status_code == 200:
                items = response.json().get('items', [])
                for item in items:
                    if len(news_list) >= max_items:
                        break
                    news_list.append({
                        "title": html.unescape(re.sub('<.*?>', '', item.get('title', ''))),
                        "description": html.unescape(re.sub('<.*?>', '', item.get('description', ''))),
                        "link": item.get('originallink', item.get('link', '')),
                        "publisher": "네이버 뉴스",
                        "published": item.get('pubDate', '')[:16]
                    })
                if news_list:
                    return news_list
        except BaseException:
            pass

    # [Tier 2] Google RSS
    try:
        if not fallback_query:
            return []
        encoded_query = urllib.parse.quote(fallback_query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=ko&gl=KR&ceid=KR:ko"
        req = urllib.request.Request(
            url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            root = ET.fromstring(response.read())
            items = root.find('channel').findall('item')
            for item in items[:max_items]:
                news_list.append({
                    "title": item.find('title').text if item.find('title') is not None else "",
                    "link": item.find('link').text if item.find('link') is not None else "",
                    "publisher": "Google News",
                    "published": item.find('pubDate').text[:16] if item.find('pubDate') is not None else ""
                })
        return news_list
    except BaseException:
        return news_list


def get_naver_stock_info(symbol: str):
    """
    네이버 통합 API를 사용하여 국내 및 해외 주식 시세를 수집합니다.
    [v6.0.0] New Integration API Support for Domestic Stocks.
    """
    symbol = symbol.upper()
    # 국내 주식 코드 처리 (005930.KS -> 005930)
    clean_code = re.sub(r'[^0-9A-Z]', '', symbol.split('.')[0])

    # 1. 국내 주식 시도 (New Integration API)
    if len(clean_code) == 6 and clean_code.isdigit():
        try:
            # [v6.0.1] New path for domestic stocks
            url = f"https://stock.naver.com/api/securityService/integration/price?domesticKrxCodes={clean_code}"
            res = requests.get(url, headers=HEADER, timeout=5)
            if res.status_code == 200:
                data_root = res.json()
                # Domestic KRX structure
                item = data_root.get('domesticKrx', {}).get(clean_code)
                if item:
                    # price is in 'overMarketPriceInfo' or top level if open
                    m_info = item.get('overMarketPriceInfo', {})
                    price_str = m_info.get(
                        'overPrice') or item.get('closePrice', '0')
                    price = float(str(price_str).replace(',', ''))

                    if price > 0:
                        pct = float(
                            m_info.get('fluctuationsRatio') or item.get(
                                'fluctuationsRatio', '0'))
                        change_val = str(
                            m_info.get('fluctuations') or item.get(
                                'compareToPreviousClosePrice', '0')).replace(
                            ',', '')
                        rf_name = m_info.get('fluctuationsType') or item.get(
                            'compareToPreviousPrice', {}).get('name', 'UNCHANGED')

                        return {
                            "symbol": symbol,
                            "name": item.get('stockName', symbol),
                            "price": f"{price:,.0f}",
                            "change": float(pct),
                            "change_val": change_val,
                            "change_rate": f"{pct:+.2f}",
                            "change_percent": float(pct),
                            "risefall_name": rf_name,
                            "up": pct >= 0 or rf_name == 'RISING',
                            "currency": "KRW",
                            "nxt_data": {
                                "price": f"{float(m_info.get('overPrice', 0)):,.0f}",
                                "change_pct": float(m_info.get('fluctuationsRatio', 0))
                            } if m_info.get('overPrice') else None
                        }
        except Exception as e:
            print(f"[get_naver_stock_info] Domestic New API failed: {e}")

    # 2. 해외 주식 시도 (api.stock.naver.com - Still works for overseas)
    suffixes = ['', '.O', '.N', '.A', '.T', '.HK', '.VN', '.SH', '.SZ']

    # 전달된 심볼에 이미 점이 포함되어 있다면 해당 심볼로 먼저 시도
    if '.' in symbol:
        try:
            url = f"https://api.stock.naver.com/stock/{symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=7)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    price = data.get('closePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')
                    is_foreign = '.' in symbol or bool(
                        re.search(r'[A-Za-z]', symbol))

                    return {
                        "symbol": symbol,
                        "name": data.get(
                            'stockName',
                            symbol),
                        "price": f"{float(price):,.2f}" if is_foreign else f"{float(price):,.0f}",
                        "change": float(pct),
                        "change_val": str(
                            data.get(
                                'compareToPreviousClosePrice',
                                '0')).replace(
                                ',',
                                ''),
                        "risefall_name": data.get(
                            'compareToPreviousPrice',
                            {}).get(
                            'name',
                            'UNCHANGED'),
                        "up": float(pct) >= 0,
                        "currency": "USD" if is_foreign else "KRW"}
        except BaseException:
            pass

    # 접미사 프로빙 루프 (해외주식용)
    for suffix in suffixes:
        test_symbol = clean_code + suffix
        if test_symbol == symbol:
            continue
        try:
            url = f"https://api.stock.naver.com/stock/{test_symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=7)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    price = data.get('closePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')
                    return {
                        "symbol": test_symbol,
                        "name": data.get(
                            'stockName',
                            test_symbol),
                        "price": f"{float(price):,.2f}",
                        "change": float(pct),
                        "change_val": str(
                            data.get(
                                'compareToPreviousClosePrice',
                                '0')).replace(
                            ',',
                            ''),
                        "risefall_name": data.get(
                            'compareToPreviousPrice',
                            {}).get(
                                    'name',
                                    'UNCHANGED'),
                        "up": float(pct) >= 0}
        except BaseException:
            continue

    # 3. 최후의 수단: 기존 스크래핑 엔진 (상세 재무 지표를 포함하므로 비상용/상세조회용으로 유지)
    return gather_naver_stock_data(symbol)


def robust_name(name):
    if not name:
        return ""
    import unicodedata
    try:
        if isinstance(name, bytes):
            # Try common encodings
            for enc in ['utf-8', 'euc-kr', 'cp949']:
                try:
                    name = name.decode(enc)
                    break
                except BaseException:
                    continue

        name = str(name)
        # Remove replacement characters
        name = name.replace('\ufffd', '').replace('', '')
        # Basic normalization
        name = unicodedata.normalize('NFC', name).strip()
        return name
    except BaseException:
        return str(name).strip()


def fetch_naver_ranking_data(nation: str, order_type: str) -> list:
    """
    [v5.0.0] Unified Stable Ranking Engine - Fixed Name Resolution.
    nation: KOR, USA, JPN, HKG, CHN, VNM
    order_type: quantTop, priceTop, searchTop
    """
    import requests
    from concurrent.futures import ThreadPoolExecutor

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0',
        'Referer': 'https://stock.naver.com/',
        'Accept': 'application/json'}

    try:
        if order_type == "searchTop" and nation == "KOR":
            # [v5.0.0] KOR searchTop: returns reutersCode only, no name
            url = f"https://stock.naver.com/api/domestic/market/searchTop?nationType={nation}&startIdx=0&pageSize=15"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code != 200:
                return []

            raw_list = res.json()
            if not isinstance(raw_list, list):
                return []

            codes = [item.get("reutersCode", "")
                     for item in raw_list if item.get("reutersCode")]

            # Batch resolve stock names via Naver mobile API
            def get_name_for_code(code: str) -> str:
                try:
                    from stock_names import STOCK_MAP
                    code_to_name = {
                        v: k for k, v in STOCK_MAP.items() if isinstance(
                            v, str) and v.isdigit()}
                    if code in code_to_name:
                        return code_to_name[code]
                    # Fallback: Naver mobile stock API
                    r = requests.get(
                        f"https://m.stock.naver.com/api/stock/{code}/basic",
                        headers=headers, timeout=3
                    )
                    if r.status_code == 200:
                        d = r.json()
                        name = d.get("stockName") or d.get("itemname") or ""
                        if name:
                            return robust_name(name)
                except Exception:
                    pass
                return code

            name_map = {}
            with ThreadPoolExecutor(max_workers=10) as ex:
                futures = {ex.submit(get_name_for_code, c): c for c in codes}
                for f, c in futures.items():
                    try:
                        name_map[c] = f.result(timeout=6)
                    except Exception:
                        name_map[c] = c

            enriched = []
            for item in raw_list:
                code = item.get("reutersCode", "")
                enriched.append({
                    **item,
                    "itemname": name_map.get(code, code),
                    "itemcode": code,
                    "reutersCode": code,
                    "nowPrice": None,
                    "prevChangeRate": None,
                    "prevChangePrice": None,
                    "upDownGb": 3,
                    "tradeVolume": item.get("sumCount"),
                    "tradeAmount": None,
                })
            return enriched

        elif order_type == "searchTop":
            # Foreign searchTop via mobile API
            mobile_headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
                'Referer': 'https://m.stock.naver.com/',
                'Accept': 'application/json'}
            url = f"https://m.stock.naver.com/front-api/market/popularStock?nationType={nation}"
            res = requests.get(url, headers=mobile_headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                items = (data.get("result") or {}).get("datas") or (
                    data.get("result") or {}).get("items") or []
                return items if isinstance(items, list) else []

        elif nation == "KOR":
            # Domestic Volume/Amount
            url = f"https://stock.naver.com/api/domestic/market/stock/default?tradeType=KRX&marketType=ALL&orderType={order_type}&startIdx=0&pageSize=15"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list):
                    # [v5.0.0] Fix: itemname may be mojibake encoded
                    try:
                        from stock_names import STOCK_MAP
                        code_to_name = {
                            v: k for k, v in STOCK_MAP.items() if isinstance(
                                v, str) and v.isdigit()}
                    except Exception:
                        code_to_name = {}

                    for item in data:
                        code = item.get("itemcode", "")
                        # 1) Try local map first
                        if code and code in code_to_name:
                            item["itemname"] = code_to_name[code]
                        else:
                            # 2) Try to repair mojibake
                            raw_name = item.get("itemname", "")
                            if raw_name:
                                repaired = robust_name(raw_name)
                                if repaired and any(
                                        0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                                    item["itemname"] = repaired
                    return data
                elif isinstance(data, dict):
                    return data.get("items") or data.get("stocks") or []
        else:
            # Foreign Volume/Amount
            url = f"https://stock.naver.com/api/foreign/market/stock/global?nation={nation}&tradeType=ALL&orderType={order_type}&startIdx=0&pageSize=15"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list):
                    # [v5.0.0] Fix: koreanCodeName may be mojibake, fallback to englishCodeName
                    for item in data:
                        ko_name = item.get("koreanCodeName") or ""
                        en_name = item.get("englishCodeName") or ""
                        if ko_name:
                            repaired = robust_name(ko_name)
                            has_korean = any(
                                0xAC00 <= ord(c) <= 0xD7A3 for c in repaired)
                            if has_korean:
                                item["koreanCodeName"] = repaired
                            else:
                                # Korean still garbled -> use English name
                                item["koreanCodeName"] = en_name or item.get(
                                    "reutersCode", "")
                        else:
                            item["koreanCodeName"] = en_name or item.get(
                                "reutersCode", "")
                    return data
                elif isinstance(data, dict):
                    return data.get("items") or data.get("stocks") or []

    except Exception as e:
        print(f"[ERROR] fetch_naver_ranking_data({nation}, {order_type}): {e}")

    return []

# ============================================================
# [호환성 유지] 구 API 이름 → 통합 함수로 리다이렉트


def get_naver_news(symbol: str = "", *args, **kwargs):
    """ Legacy alias → get_integrated_stock_news """
    return get_integrated_stock_news(symbol=symbol)


def get_naver_news_search(query: str):
    """ Legacy alias → get_integrated_stock_news """
    return get_integrated_stock_news(query=query)


def get_naver_stock_search_news_fallback(query: str = "", symbol: str = ""):
    """ Legacy alias → get_integrated_stock_news """
    return get_integrated_stock_news(symbol=symbol, query=query)


def get_detailed_financials(symbol: str) -> dict:
    """ Legacy Wrapper to prevent duplicated requests """
    res = gather_naver_stock_data(symbol)
    if res and "detailed_financials" in res:
        return res["detailed_financials"]
    return {"success": False, "error": "Fetch failed"}


def get_stock_financials(symbol: str):
    """ Legacy Wrapper to prevent duplicated requests (Supports Global) """
    import re
    import yfinance as yf
    import math

    # Check if it's a US/Global stock
    is_global = False
    try:
        is_global = bool(
            re.search(
                r'[A-Za-z]',
                symbol)) and not symbol.endswith(
            ('.KS',
             '.KQ'))
    except BaseException:
        pass

    if is_global:
        try:
            # Global Stock Logic (yfinance) - Using safer fast_info where
            # possible
            ticker_name = symbol.split('.')[0]
            t = yf.Ticker(ticker_name)

            # [Fix] info is slow and can trigger rate limits/errors, try fast_info first
            info = {}
            try:
                info = t.info  # Still need for some fields
            except BaseException:
                pass

            # Format to match Korean data structure with aggressive fallbacks
            mcap = info.get('marketCap') or 0
            financials = {
                "market_cap": f"{mcap / 1e12:.2f}T" if mcap > 1e12 else (f"{mcap / 1e9:.2f}B" if mcap > 0 else "N/A"),
                "per": str(
                    info.get(
                        'trailingPE',
                        'N/A')),
                "pbr": str(
                    info.get(
                        'priceToBook',
                        'N/A')),
                "roe": info.get(
                    'returnOnEquity',
                    0) *
                100 if info.get('returnOnEquity') else 'N/A',
                "revenue": 'N/A',
                "net_income": 'N/A',
                "total_assets": 'N/A',
                                "operating_income": 'N/A',
                "debt_ratio": 'N/A'}

            # Fetch Financial Statements
            try:
                income_stmt = t.income_stmt
                if not income_stmt.empty:
                    # yfinance uses different labels sometimes, check common
                    # ones
                    rev_keys = ['Total Revenue', 'Revenue']
                    for rk in rev_keys:
                        if rk in income_stmt.index:
                            rev = income_stmt.loc[rk].iloc[0]
                            financials['revenue'] = f"{rev:,.0f}"
                            break

                    ni_keys = ['Net Income', 'Net Income Common Stockholders']
                    for nk in ni_keys:
                        if nk in income_stmt.index:
                            ni = income_stmt.loc[nk].iloc[0]
                            financials['net_income'] = f"{ni:,.0f}"
                            break

                    oi_keys = ['Operating Income', 'EBIT']
                    for ok in oi_keys:
                        if ok in income_stmt.index:
                            oi = income_stmt.loc[ok].iloc[0]
                            financials['operating_income'] = f"{oi:,.0f}"
                            break
            except BaseException:
                pass

            try:
                balance_sheet = t.balance_sheet
                if not balance_sheet.empty:
                    as_keys = ['Total Assets']
                    for ak in as_keys:
                        if ak in balance_sheet.index:
                            assets = balance_sheet.loc[ak].iloc[0]
                            financials['total_assets'] = f"{assets:,.0f}"
                            break

                    # Debt to Equity
                    if 'Total Liab' in balance_sheet.index and 'Total Stockholder Equity' in balance_sheet.index:
                        liab = balance_sheet.loc['Total Liab'].iloc[0]
                        equity = balance_sheet.loc['Total Stockholder Equity'].iloc[0]
                        if equity != 0:
                            financials['debt_ratio'] = f"{(liab / equity) * 100:.2f}%"
            except BaseException:
                pass

            # If operating_income still N/A, try info
            if financials['operating_income'] == 'N/A':
                financials['operating_income'] = info.get(
                    'operatingCashflow', 'N/A')

            if financials['debt_ratio'] == 'N/A':
                financials['debt_ratio'] = info.get('debtToEquity', 'N/A')

            # Populate Detailed History (Annual / Quarterly)
            annual_data = []
            quarterly_data = []

            # Helper to get value from dataframe safely
            def get_val(df, key, col):
                if df.empty or key not in df.index or col not in df.columns:
                    return 0
                val = df.loc[key, col]
                import pandas as pd
                if pd.isna(val):
                    return 0
                return float(val)

            try:
                # Annual
                for i, date in enumerate(income_stmt.columns[:4]):
                    d_str = str(date.year)

                    # Get assets from balance sheet if available
                    assets = get_val(balance_sheet, 'Total Assets', date)

                    annual_data.append({
                        "date": d_str,
                        "revenue": get_val(income_stmt, 'Total Revenue', date),
                        "operating_income": get_val(income_stmt, 'Operating Income', date),
                        "net_income": get_val(income_stmt, 'Net Income', date),
                        "total_assets": assets
                    })

                # Quarterly
                q_stmt = t.quarterly_income_stmt
                if not q_stmt.empty:
                    for i, date in enumerate(q_stmt.columns[:4]):
                        d_str = f"{date.year}.{((date.month - 1) // 3) + 1}Q"
                        quarterly_data.append({
                            "date": d_str,
                            "revenue": get_val(q_stmt, 'Total Revenue', date),
                            "operating_income": get_val(q_stmt, 'Operating Income', date),
                            "net_income": get_val(q_stmt, 'Net Income', date)
                        })
            except Exception as e:
                print(f"Global financials detailed error: {e}")

            financials.update({
                "detailed": {
                    "success": True,
                    "summary": {
                        "per": info.get('trailingPE', 'N/A'),
                        "pbr": info.get('priceToBook', 'N/A'),
                        "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 'N/A'
                    },
                    "annual": annual_data,
                    "quarterly": quarterly_data
                }
            })
            return financials
        except Exception as e:
            print(f"Global info fetch error for {symbol}: {e}")
            # Fall through to domestic if global logic fails for a numeric
            # symbol
            if not any(c.isalpha() for c in symbol):
                pass
            else:
                return {
                    "per": "N/A",
                    "pbr": "N/A",
                    "success": False,
                    "detailed": {
                        "success": False,
                        "annual": [],
                        "quarterly": [],
                        "summary": {
                            "per": "N/A",
                            "pbr": "N/A",
                            "roe": "N/A"}}}

    # --- DOMESTIC STOCK LOGIC (Naver) ---
    try:
        res = gather_naver_stock_data(symbol)
        if not res:
            print(
                f"[get_stock_financials] Warning: gather_naver_stock_data failed for {symbol}. Proceeding to fallbacks.")
            res = {
                "market_cap_str": "N/A",
                "per": "N/A",
                "pbr": "N/A",
                "roe": "N/A",
                "revenue": "N/A",
                "operating_income": "N/A",
                "net_income": "N/A",
                "debt_ratio": "N/A"}

        detailed = { "success": False, "summary": {}, "full_data": {} }
        code = symbol.split('.')[0]
        
        # 1. Primary: HTML Scrape (Main Page)
        try:
            from bs4 import BeautifulSoup
            url = f"https://finance.naver.com/item/main.naver?code={code}"
            resp = requests.get(url, headers=HEADER, timeout=7)
            if resp.ok:
                soup = BeautifulSoup(resp.content.decode('euc-kr', 'ignore'), 'html.parser')
                # Find the '기업실적분석' section
                section = soup.select_one('div.section.cop_analysis')
                if section:
                    table = section.find('table')
                    if table:
                        import pandas as pd
                        import io
                        df = pd.read_html(io.StringIO(str(table)))[0]
                        if isinstance(df.columns, pd.MultiIndex):
                            df.columns = df.columns.get_level_values(-1)
                        
                        headers = [str(c).strip() for c in df.columns[1:]]
                        clean_headers = []
                        for h in headers:
                            h = h.replace('\n','').strip()
                            if '.' in h:
                                pts = h.split('.')
                                clean_headers.append(f"{pts[0]}/{pts[1]}")
                            else: clean_headers.append(h)
                            
                        mapping = {
                            "매출액": "revenue", "영업이익": "operating_income", "당기순이익": "net_income",
                            "영업이익률": "operating_margin", "순이익률": "net_income_margin", "ROE": "roe",
                            "부채비율": "debt_ratio", "당좌비율": "quick_ratio", "유보율": "reserve_ratio",
                            "EPS": "eps", "PER": "per", "BPS": "bps", "PBR": "pbr"
                        }
                        
                        for _, row in df.iterrows():
                            label = str(row.iloc[0]).strip()
                            key = next((v for k, v in mapping.items() if k in label), None)
                            if key:
                                vals = []
                                for rv in row.values[1:]:
                                    try:
                                        v_s = str(rv).replace(',', '').strip()
                                        if v_s in ["", "-", "nan"]: vals.append(None)
                                        else: vals.append(float(v_s))
                                    except: vals.append(None)
                                detailed["full_data"][key] = { "dates": clean_headers, "values": vals }
                                # Use latest non-None value for summary
                                for v in reversed(vals):
                                    if v is not None:
                                        detailed["summary"][key] = v
                                        break
                        detailed["success"] = True
        except Exception as e:
            print(f"Primary Scrape Error for {symbol}: {e}")

        # 2. Secondary: WiseReport Backup (Multi-Report Fallback)
        if not detailed["success"] or len(detailed["full_data"]) < 5:
            for rpt_type in ["3", "1"]: # Try Indicators then Financials
                wr_data = get_korean_investment_indicators(symbol, rpt=rpt_type)
                if wr_data and wr_data.get("status") == "success":
                    headers = wr_data["headers"]
                    # Robust mapping for both types
                    wr_map = { 
                        "211500": "roe", "222100": "per", "222400": "pbr", 
                        "211000": "revenue", "111000": "revenue", 
                        "211200": "operating_income", "113000": "operating_income",
                        "211300": "net_income", "115000": "net_income"
                    }
                    for ind in wr_data["indicators"]:
                        key = wr_map.get(ind["accode"])
                        if key and key not in detailed["full_data"]:
                            vals = [ind["values"].get(h) for h in headers]
                            detailed["full_data"][key] = { "dates": headers, "values": vals }
                            # Use latest non-None value for summary
                            for v in reversed(vals):
                                if v is not None:
                                    detailed["summary"][key] = v
                                    break
                    detailed["success"] = True
                if len(detailed["full_data"]) >= 8: break

        financials = {
            "status": "success",
            "symbol": symbol,
            "market_cap": res.get("market_cap_str", "N/A"),
            "per": str(detailed["summary"].get('per', res.get("per", 'N/A'))),
            "pbr": str(detailed["summary"].get('pbr', res.get("pbr", 'N/A'))),
            "roe": detailed["summary"].get('roe', res.get("roe", 'N/A')),
            "revenue": detailed["summary"].get('revenue', 'N/A'),
            "detailed": detailed
        }
        return financials
    except Exception as e:
        print(f"Financials error for {symbol}: {e}")
        return { "status": "error", "message": str(e), "per": "N/A", "pbr": "N/A" }


def get_korean_market_indices():
    """
    Fetch major Korean indices (KOSPI, KOSDAQ, KOSPI200)
    """
    indices = {
        "kospi": {
            "value": "0",
            "change": "0",
            "percent": "0.00%",
            "direction": "Equal"},
        "kosdaq": {
            "value": "0",
            "change": "0",
            "percent": "0.00%",
            "direction": "Equal"},
        "kospi200": {
            "value": "0",
            "change": "0",
            "percent": "0.00%",
            "direction": "Equal"}}

    def fetch_one(code):
        try:
            url = f"https://finance.naver.com/sise/sise_index.naver?code={code}"
            res = requests.get(url, headers=HEADER, timeout=3)
            # Use decode_safe
            soup = BeautifulSoup(decode_safe(res), 'html.parser')

            val_node = soup.select_one("#now_value")
            # Fallback for now_value if nested
            if not val_node:
                val_node = soup.select_one(".quotient #now_value")

            # KOSPI/KOSDAQ common
            change_node = soup.select_one("#change_value_and_rate")
            if not change_node:
                change_node = soup.select_one(".quotient #change_value_and_rate")

            val = val_node.text.strip() if val_node else "0"
            percent = "0.00%"
            change = "0"
            direction = "Equal"

            if change_node:
                txt = change_node.text.strip().replace('\n', '').replace('\t', '')
                import re
                # Extract percentage like +0.11% or -1.23%
                p_match = re.search(r'([+-]?\d+\.\d+%)', txt)
                if p_match:
                    percent = p_match.group(1)
                
                # Extract numeric change value
                # Usually txt is like "7.95 +0.11%상승"
                parts = txt.split()
                if parts:
                    change = parts[0]
                
                if "+" in txt or "상승" in txt or "up" in str(change_node.get('class', [])):
                    direction = "Up"
                elif "-" in txt or "하락" in txt or "dn" in str(change_node.get('class', [])):
                    direction = "Down"
            else:
                # KOSPI200 Fallback
                c_val_node = soup.select_one("#change_value")
                c_rate_node = soup.select_one("#change_rate")
                if c_val_node and c_rate_node:
                    change = c_val_node.text.strip()
                    percent = c_rate_node.text.strip()
                    if "+" in percent or "상승" in percent:
                        direction = "Up"
                    elif "-" in percent or "하락" in percent:
                        direction = "Down"

            return {
                "value": val,
                "change": change,
                "percent": percent,
                "direction": direction}
        except BaseException:
            pass
        return {
            "value": "0",
            "change": "0",
            "percent": "0.00%",
            "direction": "Equal"}

    indices["kospi"] = fetch_one("KOSPI")
    indices["kosdaq"] = fetch_one("KOSDAQ")
    indices["kospi200"] = fetch_one("KPI200")

    return indices


def get_top_sectors():
    """
    Fetch ALL sectors from Naver (상승/하락 모두 포함)
    """
    try:
        url = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        sectors = []
        rows = soup.select("table.type_1 tr")

        for row in rows:
            cols = row.select("td")
            if len(cols) < 2:
                continue
            try:
                name_tag = cols[0].select_one("a")
                if not name_tag:
                    continue

                name = name_tag.text.strip()
                percent_text = cols[1].text.strip()

                if not name or not percent_text:
                    continue

                # 숫자 추출 및 부호 처리
                # 네이버는 ▲ (상승) / ▼ (하락) 텍스트를 포함할 수 있음
                raw = percent_text.replace(",", "").replace("%", "").strip()
                if "▼" in raw or "-" in raw:
                    val = - \
                        abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or "+" in raw:
                    val = abs(
                        float(
                            raw.replace(
                                "▲",
                                "").replace(
                                "+",
                                "").strip() or "0"))
                else:
                    # 숫자만 있는 경우
                    nums = raw.replace("▲", "").replace("▼", "").strip()
                    val = float(nums) if nums else 0.0

                sectors.append(
                    {"name": name, "percent": f"{val:+.2f}", "change": val})
            except Exception as ex:
                continue

        return sectors
    except Exception as e:
        print(f"Sector Scrape Error: {e}")
        return []


def get_top_trending_themes(limit: int = 6):
    """
    Fetch top themes from Naver
    """
    try:
        url = "https://finance.naver.com/sise/theme.naver"
        res = requests.get(url, headers=HEADER, timeout=3)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        themes = []
        rows = soup.select("table.type_1 tr")

        for row in rows:
            if len(themes) >= limit:
                break
            cols = row.select("td")
            if len(cols) < 2:
                continue

            try:
                name_tag = cols[0].select_one("a")
                if not name_tag:
                    continue

                name = name_tag.text.strip()
                percent = cols[1].text.strip()

                if not name or not percent:
                    continue

                themes.append({"name": name, "percent": percent})
            except BaseException:
                pass

        return themes
    except BaseException:
        return []


get_top_themes = get_top_trending_themes  # Alias


def get_investor_history(symbol: str, days: int = 40):
    """
    Fetch historical investor breakdown (Foreigner, Institution) for 'Whale Tracker'.
    Scrapes 'https://finance.naver.com/item/frgn.naver' (Pagination).
    Uses ThreadPoolExecutor for parallel fetching to avoid timeout.

    Args:
        symbol: Stock code (e.g. '005930.KS')
        days: Number of trading days to fetch (Default reduces to 40)
    """
    import concurrent.futures
    import traceback

    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

        # Helper to fetch a single page
        def fetch_page(page_num):
            try:
                url = f"https://finance.naver.com/item/frgn.naver?code={code}&page={page_num}"
                res = requests.get(url, headers=HEADER, timeout=5)
                if res.status_code != 200:
                    return []

                soup = BeautifulSoup(decode_safe(res), 'html.parser')
                # Fixed: Look for table with summary containing "순매매"
                target_table = None
                tables = soup.select("table")
                for tbl in tables:
                    summary = tbl.get("summary", "")
                    if "순매매" in summary and "외국인" in summary:
                        target_table = tbl
                        break

                if not target_table:
                    return []

                rows = target_table.select("tbody tr")
                page_data = []

                for row in rows:
                    cols = row.select("td")
                    if len(cols) < 7:
                        continue

                    try:
                        date_txt = cols[0].text.strip()
                        if not re.match(r'\d{4}\.\d{2}\.\d{2}', date_txt):
                            continue

                        inst_txt = cols[5].text.strip().replace(',', '')
                        frgn_txt = cols[6].text.strip().replace(',', '')
                        price_txt = cols[1].text.strip().replace(',', '')

                        def safe_int(txt):
                            try:
                                if not txt or not txt.strip():
                                    return 0
                                # Handle numbers with signs
                                clean = re.sub(r'[^0-9-]', '', txt)
                                return int(clean) if clean else 0
                            except BaseException:
                                return 0

                        inst_val = safe_int(inst_txt)
                        frgn_val = safe_int(frgn_txt)
                        retail_val = -(inst_val + frgn_val)

                        page_data.append({
                            "date": date_txt.replace('.', '-'),
                            "price": int(price_txt.replace(',', '')),
                            "institution": inst_val,
                            "foreigner": frgn_val,
                            "retail": retail_val
                        })
                    except BaseException:
                        continue
                return page_data

            except Exception as e:
                print(f"Page {page_num} Fetch Error: {e}")
                return []

        # Parallel Fetch
        pages_to_fetch = (days // 20) + 2
        if pages_to_fetch > 5:
            pages_to_fetch = 5

        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_page = {
                executor.submit(
                    fetch_page,
                    p): p for p in range(
                    1,
                    pages_to_fetch + 1)}
            for future in concurrent.futures.as_completed(future_to_page):
                page_data = future.result()
                all_data.extend(page_data)

        # Sort by Date Descending
        all_data.sort(key=lambda x: x['date'], reverse=True)

        # Deduplicate
        unique_data = []
        seen_dates = set()
        for d in all_data:
            if d['date'] not in seen_dates:
                seen_dates.add(d['date'])
                unique_data.append(d)

        return unique_data[:days]

    except Exception as e:
        print(f"Investor History Error: {e}")
        return []


def get_naver_investor_data(symbol: str, trader_day: int = 1):
    """
    [Integration] Fetch both Brokerage Info and Detailed Trend for a specific period (1, 5, 20, 60 days).
    Url: https://finance.naver.com/item/frgn.naver?code={code}&trader_day={trader_day}
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)

        url = f"https://finance.naver.com/item/frgn.naver?code={code}&trader_day={trader_day}"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        # 1. & 2. Identify tables by structural analysis (column counts)
        brokerage = {"sell": [], "buy": [], "foreign_estimate": None}
        trend = []
        broker_table = None
        trend_table = None

        # Select all tables and find by column count
        # This is robust against encoding issues that might break class
        # selection
        all_tables = soup.select("table")
        for tbl in all_tables:
            rows = tbl.select("tr")
            if len(rows) < 3:
                continue

            # Check a few rows for definitive column counts
            for i in range(min(len(rows), 8)):
                c_data = rows[i].select("td")
                # Brokerage table (usually 4 or 8 columns)
                if len(c_data) == 4 and not broker_table:
                    broker_table = tbl
                # Trend table (usually 9 columns in PC view)
                elif len(c_data) == 9 and not trend_table:
                    trend_table = tbl

            if broker_table and trend_table:
                break

        # 3. Parse Brokerage Table
        if broker_table:
            rows = broker_table.select("tr")
            for row in rows:
                if "total" in row.get("class", []):
                    cols = row.select("td")
                    if len(cols) >= 4:
                        def parse_v(txt): return int(
                            re.sub(r'[^0-9-]', '', txt.strip()) or 0)
                        brokerage["foreign_estimate"] = {
                            "sell": parse_v(cols[1].text),
                            "net": parse_v(cols[2].text),
                            "buy": parse_v(cols[3].text)
                        }
                    continue

                cols = row.select("td")
                if len(cols) >= 4:
                    s_name = cols[0].text.strip()
                    s_vol = cols[1].text.strip().replace(',', '')
                    if s_name and not any(
                        kw in s_name for kw in [
                            "매도상위", "거래량", "거래원"]):
                        brokerage["sell"].append(
                            {"name": s_name, "volume": int(s_vol) if s_vol.isdigit() else 0})

                    b_name = cols[2].text.strip()
                    b_vol = cols[3].text.strip().replace(',', '')
                    if b_name and not any(
                        kw in b_name for kw in [
                            "매수상위", "거래량", "거래원"]):
                        brokerage["buy"].append(
                            {"name": b_name, "volume": int(b_vol) if b_vol.isdigit() else 0})

        # 4. Parse Daily Trend using Mobile API (for Individual data and multi-page support)
        # 1-year is approx 250 trading days. pageSize=50 is stable.
        trend = []
        target_count = trader_day if trader_day > 1 else 20  # default 20 for chart
        if trader_day == 1:
            target_count = 1  # Just today

        # Fallback to get listed shares for calculation (Mobile API trend
        # doesn't provide holdings quantity)
        def get_listed_shares():
            try:
                pc_url = f"https://finance.naver.com/item/main.naver?code={code}"
                res = requests.get(pc_url, headers=HEADER, timeout=5)
                # Parse <th>상장주식수</th><td><em>5,969,782,550</em></td>
                m = re.search(
                    r'상장주식수</th>\s*<td>\s*<em>([^<]+)</em>', res.text)
                if m:
                    return int(m.group(1).replace(',', ''))
                # Backup regex
                m = re.search(
                    r'상장주식수\s*</strong>\s*<span>([^<]+)</span>', res.text)
                if m:
                    return int(m.group(1).replace(',', ''))
            except BaseException:
                pass
            return 0

        total_shares = get_listed_shares()

        last_bizdate = ''
        fetched_count = 0
        max_loop = 10  # Safety limit

        while fetched_count < target_count and max_loop > 0:
            max_loop -= 1
            try:
                # Use bizdate cursor for pagination
                page_size = 50
                m_url = f"https://m.stock.naver.com/api/stock/{code}/trend?pageSize={page_size}"
                if last_bizdate:
                    m_url += f"&bizdate={last_bizdate}"

                m_res = requests.get(m_url, headers=HEADER, timeout=5)
                m_data = m_res.json()

                if not isinstance(m_data, list) or not m_data:
                    break

                new_items = []
                for item in m_data:
                    dt_raw = item.get('bizdate', '')
                    if not dt_raw:
                        continue

                    dt = f"{dt_raw[:4]}-{dt_raw[4:6]}-{dt_raw[6:8]}"
                    if any(d['date'] == dt for d in trend):
                        continue

                    def clean_i(v): return int(
                        re.sub(r'[^0-9-]', '', str(v or 0)))

                    f_ratio = float(str(item.get('foreignerHoldRatio', 0)).replace(
                        ',', '').replace('%', ''))
                    # Calculate holdings quantity if not available
                    f_holdings = clean_i(item.get('foreignerHoldQuant', 0))
                    if f_holdings == 0 and total_shares > 0:
                        f_holdings = int(total_shares * (f_ratio / 100.0))

                    close_val = clean_i(item.get('closePrice', 0))
                    diff_val = clean_i(
                        item.get(
                            'compareToPreviousClosePrice', 0))
                    prev_close = close_val - diff_val
                    change_pct = 0.0
                    if prev_close != 0:
                        change_pct = (diff_val / prev_close) * 100

                    new_items.append({
                        "date": dt,
                        "close": close_val,
                        "diff": diff_val,
                        "change": round(change_pct, 2),
                        "volume": clean_i(item.get('accumulatedTradingVolume', 0)),
                        "institution": clean_i(item.get('organPureBuyQuant', 0)),
                        "foreigner": clean_i(item.get('foreignerPureBuyQuant', 0)),
                        "retail": clean_i(item.get('individualPureBuyQuant', 0)),
                        "foreign_holdings": f_holdings,
                        "foreign_ratio": f_ratio
                    })

                if not new_items:
                    break
                trend.extend(new_items)
                fetched_count = len(trend)
                last_bizdate = m_data[-1].get('bizdate', '')

                if fetched_count >= target_count:
                    trend = trend[:target_count]
                    break
            except Exception as e:
                print(
                    f"Mobile API Fetch Error (last_bizdate={last_bizdate}): {e}")
                break

        # [New] Merge today's live/confirmed data if missing from mobile API trend
        try:
            import pytz
            kst = pytz.timezone('Asia/Seoul')
            today_str = datetime.datetime.now(kst).strftime("%Y-%m-%d")
            # If the first trend item is not today, try to get today's data
            if not trend or trend[0].get("date") != today_str:
                live_data = get_live_investor_estimates(code)
                latest_live = live_data[-1] if live_data and len(
                    live_data) > 0 else {}

                # Find price if missing
                current_price = trend[0].get("close", 0) if trend else 0
                if current_price == 0:
                    try:
                        from stock_data import get_simple_quote
                        q = get_simple_quote(symbol)
                        if q:
                            current_price = float(
                                str(q.get("price")).replace(',', ''))
                    except BaseException:
                        pass

                # Create a trend-compatible item
                today_item = {
                    "date": today_str,
                    "close": current_price,
                    "diff": current_price - (trend[0].get("close", current_price) if trend else current_price),
                    "change": 0.0,
                    "volume": 0,
                    "institution": latest_live.get("institution", 0),
                    "foreigner": latest_live.get("foreigner", 0),
                    "retail": 0,
                    "foreign_holdings": trend[0].get("foreign_holdings", 0) if trend else 0,
                    "foreign_ratio": trend[0].get("foreign_ratio", 0) if trend else 0
                }
                trend.insert(0, today_item)
        except Exception as merge_err:
            print(f"Investor Merge Error: {merge_err}")

        return {
            "status": "success",
            "data": {
                "brokerage": brokerage,
                "trend": trend
            }
        }
    except Exception as e:
        print(f"Investor Data Scrape Error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "data": {
                "brokerage": {
                    "sell": [],
                    "buy": [],
                    "foreign_estimate": None},
                "trend": []}}


@turbo_cache(ttl_seconds=60)  # [Fix] 1시간 → 1분으로 단축 (실시간성 확보)
def get_exchange_rate(currency="USD"):
    """
    Fetch exchange rates from Naver Market Index
    currency: USD, JPY, CNY, HKD, VND
    """
    # Mapping to Naver symbol IDs
    symbol_map = {
        "USD": "FX_USDKRW",
        "JPY": "FX_JPYKRW",
        "CNY": "FX_CNYKRW",
        "HKD": "FX_HKDKRW",
        "VND": "FX_VNDKRW"
    }
    # Yahoo Finance fallback 티커
    yahoo_map = {
        "USD": "KRW=X",
        "JPY": "JPYKRW=X",
        "CNY": "CNYKRW=X",
        "HKD": "HKDKRW=X",
    }

    symbol = symbol_map.get(currency.upper(), "FX_USDKRW")

    # 1차: 네이버 금융 스크래핑 (셀렉터: .today em)
    try:
        url = f"https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd={symbol}"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')
        # 실제 DOM 구조: .today em 또는 p.no_today em
        val_tag = soup.select_one(
            ".today em") or soup.select_one("p.no_today em")
        if val_tag:
            rate = float(val_tag.text.replace(',', ''))
            if "JPY" in symbol or "VND" in symbol:
                rate = rate / 100.0
            return rate
    except Exception as e:
        print(f"[ExchangeRate] Naver scrape failed ({currency}): {e}")

    # 2차: Yahoo Finance 실시간 폴백 (하드코딩 값 사용 안 함)
    try:
        import yfinance as yf
        ticker_sym = yahoo_map.get(currency.upper(), "KRW=X")
        t = yf.Ticker(ticker_sym)
        price = t.fast_info.last_price
        if price and price > 0:
            print(f"[ExchangeRate] Yahoo fallback used: {currency} = {price}")
            return round(price, 2)
    except Exception as e2:
        print(f"[ExchangeRate] Yahoo fallback failed ({currency}): {e2}")

    # 3차: 최후 안전망 (실시간 연동 불가 시에만 사용)
    print(f"[ExchangeRate] WARNING: Using hardcoded fallback for {currency}")
    fallbacks = {
        "USD": 1480.0,
        "JPY": 9.2,
        "CNY": 195.0,
        "HKD": 178.0,
        "VND": 0.055}
    return fallbacks.get(currency.upper(), 1450.0)


@turbo_cache(ttl_seconds=3600)
def get_ipo_data():
    """
    국내 최대 비상장/IPO 정보 사이트(38.co.kr)에서
    최신 공모주 청약 일정을 실시간으로 수집합니다.
    """
    url = "http://www.38.co.kr/html/fund/index.htm?o=k"
    data = []

    try:
        res = requests.get(url, headers=HEADER, timeout=7)
        # 38.co.kr은 EUC-KR 인코딩을 사용하므로 변환 필요
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        # 공모주 청약일정 테이블 탐색
        table = soup.select_one("table[summary='공모주 청약일정']")
        if not table:
            # Fallback: 다른 구조일 경우 대비
            rows = soup.select("table tr")
        else:
            rows = table.select("tr")

        for row in rows:
            cols = row.select("td")
            if len(cols) < 5:
                continue

            name = cols[0].text.strip()
            # 종목명이 비어있거나 헤더인 경우 건너븀
            if not name or "종목명" in name:
                continue

            dates = cols[1].text.strip().replace('\xa0', '').replace('\t', '')
            fixed_price = cols[2].text.strip().replace(
                '\xa0', '').replace('\t', '')
            hope_price = cols[3].text.strip().replace(
                '\xa0', '').replace('\t', '')
            competition = cols[4].text.strip().replace(
                '\xa0', '').replace('\t', '')  # 주관사 또는 경쟁률

            data.append({
                "name": name,
                "date": dates,
                "price": fixed_price,
                "band": hope_price,
                "detail": competition
            })
            if len(data) >= 15:
                break  # 최신 15개 정도면 충분

    except Exception as e:
        print(f"[IPO] 실시간 수집 에러: {e}")

    return data


def get_live_investor_estimates(symbol: str):
    """
    Real-time investor breakdown estimate (Intraday)
    Scrapes '잠정치' from Naver Finance.
    Falls back to confirmed daily data if unavailable.
    """
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.datetime.now(kst)
    today_str = now.strftime("%Y-%m-%d")

    # 0. Fix Symbol Format (digit only for Naver)
    clean_code = symbol.split('.')[0]
    clean_code = re.sub(r'[^0-9]', '', clean_code)

    # [Logic Update] If market is closed (after 15:40), try fetching CONFIRMED history first.
    if now.hour >= 16 or (now.hour == 15 and now.minute >= 40):
        try:
            history = get_investor_history(clean_code, days=1)
            if history and len(history) > 0:
                latest = history[0]
                if latest.get("date") == today_str:
                    # Frontend expects a LIST of historical or live points
                    return [{
                        "institution": latest.get("institution", 0),
                        "foreigner": latest.get("foreigner", 0),
                        "program": 0,
                        "is_daily": True,
                        "is_today": True,
                        "time": "장마감",
                        "date": latest.get("date")
                    }]
        except BaseException:
            pass

    # 1. Try fetching real-time provisional data (Scraping)
    all_points = []
    try:
        url = f"https://finance.naver.com/item/frgn.naver?code={clean_code}"
        res = requests.get(url, headers=HEADER, timeout=3)
        # frgn.naver is still strictly EUC-KR (CP949)
        html = res.content.decode('cp949', 'ignore')
        soup = BeautifulSoup(html, 'html.parser')

        # Find the table containing "잠정" (Provisional)
        # Search for table by column headers since 'summary' attribute was
        # removed by Naver
        table = None
        for tbl in soup.select("table"):
            headers = [th.text.strip() for th in tbl.select("th")]
            if "시간" in headers and "외국인" in headers and "기관" in headers:
                table = tbl
                break

        if table:
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) >= 3:
                    time_txt = cols[0].text.strip()
                    # More flexible time check
                    if time_txt and (
                        ":" in time_txt or "." in time_txt or any(
                            d.isdigit() for d in time_txt)):
                        try:
                            # Clean and convert numeric values
                            def parse_naver_num(txt):
                                clean = re.sub(
                                    r'[^0-9-]', '', txt.replace(',', ''))
                                return int(clean) if clean else 0

                            foreigner_val = parse_naver_num(cols[1].text)
                            institution_val = parse_naver_num(cols[2].text)

                            if foreigner_val != 0 or institution_val != 0:
                                all_points.append({
                                    "institution": institution_val,
                                    "foreigner": foreigner_val,
                                    "program": 0,
                                    "is_daily": False,
                                    "is_today": True,
                                    "time": time_txt,
                                    "date": today_str
                                })
                        except BaseException:
                            continue
        if all_points:
            # Sort by time ascending
            all_points.sort(key=lambda x: x['time'])
            return all_points

    except Exception as e:
        print(f"Investor Scrape Error: {e}")

    # 2. Fallback: Get latest confirmed daily data (Yesterday or older)
    try:
        history = get_investor_history(clean_code, days=1)
        if history and len(history) > 0:
            latest = history[0]
            # Return as a list with one item
            return [{
                "institution": latest.get("institution", 0),
                "foreigner": latest.get("foreigner", 0),
                "program": 0,
                "is_daily": True,
                "is_today": False,
                "time": latest.get("date"),
                "date": latest.get("date")
            }]
    except Exception as e:
        print(f"Investor Estimate Fallback Error: {e}")

    return []  # Return empty list if no data available, frontend handles this


def get_indexing_status():
    """
    Market Indexing Status (e.g. KOSPI 200 inclusion)
    """
    return {}


def get_market_investors():
    """
    Fetch market-wide investor trend (KOSPI/KOSDAQ)
    """
    return {
        "kospi": {"foreigner": 0, "institution": 0, "retail": 0},
        "kosdaq": {"foreigner": 0, "institution": 0, "retail": 0}
    }


def get_fear_greed_index():
    """
    Fear & Greed Index (Mock)
    """
    return {"score": 50, "rating": "Neutral"}


def get_market_momentum():
    """
    Market Momentum (Mock)
    """
    return {"score": 50, "rating": "Neutral"}


@lru_cache(maxsize=4)
def get_index_chart_data(index_code: str):
    """
    Fetch historical chart data for Market Index (KOSPI/KOSDAQ)
    """
    # Real Data Scraping
    code_map = {
        "KOSPI": "KOSPI",
        "KOSDAQ": "KOSDAQ",
        "KOSPI200": "KPI200"
    }

    target_code = code_map.get(index_code.upper(), index_code)
    url = f"https://finance.naver.com/sise/sise_index_day.naver?code={target_code}"

    data = []

    try:
        # Fetch up to 6 pages (~36 days)
        for page in range(1, 7):
            p_url = f"{url}&page={page}"
            res = requests.get(p_url, headers=HEADER, timeout=3)
            soup = BeautifulSoup(decode_safe(res), 'html.parser')

            rows = soup.select("table.type_1 tr")

            for row in rows:
                cols = row.select("td")
                if len(cols) < 4:
                    continue

                date_txt = cols[0].text.strip()
                if not date_txt or "." not in date_txt:
                    continue

                price_txt = cols[1].text.strip().replace(',', '')
                if not price_txt:
                    continue

                date_fmt = date_txt.replace('.', '-')
                price = float(price_txt)

                data.append({"date": date_fmt, "close": price})

    except Exception as e:
        print(f"Index Scrape Error: {e}")

    # Sort asc by date and take last 30
    data.sort(key=lambda x: x['date'])
    return data[-30:]


def get_korean_interest_rates():
    """
    Fetch Korea Key Interest Rates from Naver Finance Market Index.
    URL:      https://finance.naver.com/marketindex/
    Structure: <tr class='up|down|same'>
                 <th class='th_interN'><a><span>NAME</span></a></th>
                 <td>VALUE</td>
                 <td><img alt='up|down|same'/>CHANGE</td>
               </tr>
    """
    rates = []
    try:
        url = "https://finance.naver.com/marketindex/"
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        # th CSS 클래스 -> 심볼 매핑
        # th_inter1=콜금리, th_inter2=국채(3년), th_inter3=회사채(3년)
        # th_inter4=CD금리(91일), th_inter5=COFIX잔단위, th_inter6=COFIX신규형
        class_to_sym = {
            "th_inter1": "CALL",
            "th_inter2": "KO3Y",
            # th_inter3 = 회사채 -> 생략
            "th_inter4": "CD91",
            # th_inter5, th_inter6 = COFIX -> 생략
        }

        rows = soup.select("table.tbl_exchange tbody tr")
        for row in rows:
            th = row.select_one("th")
            tds = row.select("td")
            if not th or len(tds) < 1:
                continue

            # 심볼 매핑 (th CSS 클래스 기준)
            th_classes = th.get("class", [])
            match_sym = None
            for cls in th_classes:
                if cls in class_to_sym:
                    match_sym = class_to_sym[cls]
                    break
            if match_sym is None:
                continue

            # 표시명 (텍스트)
            name_span = th.select_one("span")
            name_raw = name_span.text.strip() if name_span else th.text.strip()

            # 금리 값
            try:
                price_val = float(tds[0].text.strip().replace(",", ""))
            except BaseException:
                continue

            # 변동폭 및 방향
            change_val = 0.0
            if len(tds) >= 2:
                try:
                    chg_raw = re.sub(r"[^0-9.]", "", tds[1].text.strip())
                    chg_num = float(chg_raw) if chg_raw else 0.0
                    # tr class 또는 img alt로 하락 판단
                    row_cls = " ".join(row.get("class", []))
                    img = tds[1].select_one("img")
                    img_alt = img.get("alt", "") if img else ""
                    if "down" in row_cls or "하락" in img_alt:
                        chg_num = -chg_num
                    change_val = chg_num
                except BaseException:
                    pass

            rates.append({
                "name": name_raw,
                "price": price_val,
                "change": change_val,
                "symbol": match_sym,
            })

        # 기준금리는 이 테이블에 없으므로 fallback으로 보장
        if not any(r["symbol"] == "KORATE" for r in rates):
            rates.insert(0, {
                "name": "한국 기준금리",
                "price": 3.25,
                "change": 0.0,
                "symbol": "KORATE",
            })

    except Exception as e:
        print(f"Interest Rates Scrape Error: {e}")
        return [
            {"name": "한국 기준금리", "price": 2.50, "change": 0.0, "symbol": "KORATE"},
            {"name": "CD금리 (91일)", "price": 2.81, "change": 0.0, "symbol": "CD91"},
            {"name": "국고채 3년", "price": 3.18, "change": 0.0, "symbol": "KO3Y"},
            {"name": "국고채 10년", "price": 3.50, "change": 0.0, "symbol": "KO10Y"},
            {"name": "콜금리 (1일)", "price": 2.60, "change": 0.0, "symbol": "CALL"},
        ]

    return rates


def get_market_summary_stats():
    """
    네이버 국내증시 통합시세 폐지에 대응하여, 네이버 금융 메인(finance.naver.com)의
    우측 지수 박스(kospi_area, kosdaq_area)에서 실시간 상승/하락/보합 종목 수를 크롤링합니다.
    """
    stats = {
        "kospi": {"up": 0, "same": 0, "down": 0},
        "kosdaq": {"up": 0, "same": 0, "down": 0}
    }

    try:
        url = "https://finance.naver.com/"
        res = requests.get(url, headers=HEADER, timeout=5)
        # 중요: euc-kr 디코드 후 BS4로 파싱해야 정규식이 한글을 제대로 인식합니다.
        html = res.content.decode('euc-kr', 'replace')
        soup = BeautifulSoup(html, 'html.parser')
        import re

        def extract_stats(area_class, market_key):
            area = soup.select_one(area_class)
            if not area:
                return

        def extract_stats(area_class, market_key):
            area = soup.select_one(area_class)
            if not area:
                return

            # HTML 특수문자 및 한글 깨짐에 완벽히 대응하는 후위 숫자 추출법
            # 지수 % 변동률 뒤에 항상 투자자 동향 -> 상하락 종목수가 렌더링됨
            tail_text = area.text.replace(',', '').split('%')[-1]
            nums = re.findall(r'\d+', tail_text)

            # 최소 5개의 숫자가 있어야 함 (상한, 상승, 보합, 하락, 하한)
            if len(nums) >= 5:
                # 무조건 맨 뒤 5개의 숫자가 종목 개수임 (네이버 증권 공통 구조)
                v_up_limit = int(nums[-5])
                v_up = int(nums[-4])
                v_same = int(nums[-3])
                v_down = int(nums[-2])
                v_down_limit = int(nums[-1])

                stats[market_key]['up'] = v_up + v_up_limit
                stats[market_key]['same'] = v_same
                stats[market_key]['down'] = v_down + v_down_limit

        extract_stats('.kospi_area', 'kospi')
        extract_stats('.kosdaq_area', 'kosdaq')

    except Exception as e:
        print(f"Market stats fetch error: {e}")

    return stats


def get_live_disclosures():
    """
    네이버 증권 '공시' 탭 최신 뉴스 1페이지를 스크랩하여,
    투자자들이 주목할 만한 특이 공시(계약, 증자, 타법인 등)만 필터링해 반환합니다.
    """
    url = "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258"
    results = []

    # 필터링할 관심(특이) 키워드
    target_keywords = [
        "유상증자",
        "무상증자",
        "단일판매",
        "공급계약",
        "타법인",
        "영업실적",
        "잠정",
        "자사주",
        "주식소각",
        "전환사채",
        "신주인수권",
        "합병",
        "분할",
        "공개매수",
        "감자",
        "결정",
        "수주",
        "취득",
        "처분",
        "배당",
        "주주",
        "특허",
        "임상",
        " MOU",
        "투자"]
    fallback_results = []

    try:
        res = requests.get(url, headers=HEADER, timeout=5)
        res.encoding = 'cp949'
        html = res.text
        soup = BeautifulSoup(html, "html.parser")

        articles = soup.select("ul.realtimeNewsList > li")

        for li in articles:
            dl = li.select_one("dl")
            if not dl:
                continue

            title_tag = dl.select_one(
                "dt.articleSubject a") or dl.select_one("dd.articleSubject a")
            if not title_tag:
                continue

            title = title_tag.text.strip()
            href = title_tag.get("href", "")

            # 모바일/PC 하이브리드 지원을 위한 통합 네이버 뉴스 주소 추출
            import urllib.parse
            parsed = urllib.parse.urlparse(href)
            qs = urllib.parse.parse_qs(parsed.query)
            aid = qs.get("article_id", [""])[0]
            oid = qs.get("office_id", [""])[0]

            if aid and oid:
                link = f"https://n.news.naver.com/mnews/article/{oid}/{aid}"
            else:
                link = "https://finance.naver.com" + href

            summary_dd = dl.select_one("dd.articleSummary")
            press = summary_dd.select_one("span.press").text.strip(
            ) if summary_dd and summary_dd.select_one("span.press") else ""
            date = summary_dd.select_one("span.wdate").text.strip(
            ) if summary_dd and summary_dd.select_one("span.wdate") else ""

            item = {
                "title": title,
                "link": link,
                "press": press,
                "date": date
            }
            fallback_results.append(item)

            # 관심 키워드 포함 여부 판별
            is_target = any(kw in title for kw in target_keywords)
            if is_target:
                results.append(item)

        # 만약 필터링된 결과가 단 하나도 없다면, 빈 화면(오해 소지) 방지를 위해 가장 최근 공시 4개를 띄워줌
        if len(results) == 0 and len(fallback_results) > 0:
            results = fallback_results[:4]

    except Exception as e:
        print(f"Live Disclosures fetch error: {e}")

    return results


async def fetch_stocks_for_heatmap(session, item, item_type='sector'):
    stocks = []
    try:
        async with session.get(item['url'], headers={'User-Agent': 'Mozilla/5.0'}, timeout=5) as res:
            text = await res.text('euc-kr', 'replace')
            from bs4 import BeautifulSoup
            soup_sub = BeautifulSoup(text, 'html.parser')

            sub_rows = soup_sub.select("table.type_5 tr")
            for s_row in sub_rows:
                if len(stocks) >= 3:
                    break
                s_cols = s_row.select("td")

                if item_type == "sector":
                    if len(s_cols) < 5:
                        continue
                    change_idx = 3
                else:
                    if len(s_cols) < 5:
                        continue
                    change_idx = 4

                s_name_tag = s_cols[0].select_one("a")
                if not s_name_tag:
                    continue
                s_name = s_name_tag.text.strip()

                s_change_txt = s_cols[change_idx].text.strip()

                s_change_val = 0.0
                if item_type == "sector":
                    c_r = s_change_txt.replace(
                        ",", "").replace(
                        "%", "").strip()
                    if "▼" in c_r or c_r.startswith("-"):
                        s_change_val = - \
                            abs(float(c_r.replace("▼", "").replace("-", "").strip() or "0"))
                    elif "▲" in c_r or c_r.startswith("+"):
                        s_change_val = abs(
                            float(
                                c_r.replace(
                                    "▲",
                                    "").replace(
                                    "+",
                                    "").strip() or "0"))
                    else:
                        try:
                            s_change_val = float(
                                c_r.replace(
                                    "▲", "").replace(
                                    "▼", "").strip())
                        except BaseException:
                            pass
                    s_change_val = round(s_change_val, 2)
                    stocks.append({"name": s_name, "change": s_change_val})
                else:
                    try:
                        clean_change = s_change_txt.replace(
                            '%', '').replace(',', '').strip()
                        s_change_val = round(float(clean_change), 2)
                        stocks.append({"name": s_name, "change": s_change_val})
                    except BaseException:
                        continue
    except Exception as e:
        pass

    return {
        "name" if item_type == 'sector' else "theme": item['name'],
        "percent": item['percent'],
        "change": item['change'],
        "stocks": stocks
    }


async def get_sector_heatmap_data():
    try:
        url = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
        async with aiohttp.ClientSession() as session:
            from bs4 import BeautifulSoup
            async with session.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5) as res:
                text = await res.text('euc-kr', 'replace')
            soup = BeautifulSoup(text, 'html.parser')
            rows = soup.select("table.type_1 tr")

            candidates = []
            for row in rows:
                if len(candidates) >= 30:
                    break
                cols = row.select("td")
                if len(cols) < 2:
                    continue
                link = cols[0].select_one("a")
                if not link:
                    continue

                sector_name = link.text.strip()
                sector_url = "https://finance.naver.com" + link['href']
                percent_text = cols[1].text.strip()

                if not sector_name or not percent_text:
                    continue

                raw = percent_text.replace(",", "").replace("%", "").strip()
                if "▼" in raw or raw.startswith("-"):
                    val = - \
                        abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or raw.startswith("+"):
                    val = abs(
                        float(
                            raw.replace(
                                "▲",
                                "").replace(
                                "+",
                                "").strip() or "0"))
                else:
                    try:
                        val = float(
                            raw.replace(
                                "▲", "").replace(
                                "▼", "").strip())
                    except BaseException:
                        continue

                candidates.append({
                    "name": sector_name,
                    "url": sector_url,
                    "percent": percent_text,
                    "change": val
                })

            tasks = [
                fetch_stocks_for_heatmap(
                    session,
                    c,
                    "sector") for c in candidates]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            sectors = [
                r for r in results if isinstance(
                    r, dict) and "stocks" in r]
            sectors.sort(key=lambda x: x['change'], reverse=True)
            return sectors
    except Exception as e:
        print(f"Sector Heatmap Async Error: {e}")
        return []


async def get_theme_heatmap_data():
    try:
        url = "https://finance.naver.com/sise/theme.naver"
        async with aiohttp.ClientSession() as session:
            from bs4 import BeautifulSoup
            async with session.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5) as res:
                text = await res.text('euc-kr', 'replace')
            soup = BeautifulSoup(text, 'html.parser')
            rows = soup.select("table.type_1 tr")

            candidates = []
            for row in rows:
                if len(candidates) >= 30:
                    break
                cols = row.select("td")
                if len(cols) < 2:
                    continue
                link = cols[0].select_one("a")
                if not link:
                    continue

                theme_name = link.text.strip()
                theme_url = "https://finance.naver.com" + link['href']
                percent_text = cols[1].text.strip()

                if not theme_name or not percent_text:
                    continue

                raw = percent_text.replace(",", "").replace("%", "").strip()
                if "▼" in raw or raw.startswith("-"):
                    val = - \
                        abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or raw.startswith("+"):
                    val = abs(
                        float(
                            raw.replace(
                                "▲",
                                "").replace(
                                "+",
                                "").strip() or "0"))
                else:
                    try:
                        val = float(
                            raw.replace(
                                "▲", "").replace(
                                "▼", "").strip())
                    except BaseException:
                        continue

                candidates.append({
                    "name": theme_name,
                    "url": theme_url,
                    "percent": percent_text,
                    "change": val
                })

            tasks = [
                fetch_stocks_for_heatmap(
                    session,
                    c,
                    "theme") for c in candidates]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            themes = [
                r for r in results if isinstance(
                    r, dict) and "stocks" in r]
            themes.sort(key=lambda x: x['change'], reverse=True)
            return themes
    except Exception as e:
        print(f"Theme Heatmap Async Error: {e}")
        return []


@turbo_cache(ttl_seconds=3600)
def get_korean_company_overview(symbol: str):
    """
    네이버 금융 기업정보(WiseReport Iframe)로부터 상세 기업 개요를 스크랩합니다.
    (기본정보, 최근연혁, 매출구성, 연구개발비, 인원현황 등)
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return None

    # WiseReport Iframe URL (Overview Tab: c1020001.aspx)
    url = f"https://navercomp.wisereport.co.kr/v2/company/c1020001.aspx?cmp_cd={code}"

    try:
        res = requests.get(url, headers=HEADER, timeout=7)
        # Naver components are often UTF-8 or CP949
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')

        data = {
            "basic_info": {},
            "history": [],
            "sales_composition": [],
            "rnd_status": [],
            "staff_status": []
        }

        # 1. 기본 정보 (table#cTB201)
        basic_table = soup.select_one("table#cTB201")
        if basic_table:
            rows = basic_table.select("tr")
            for row in rows:
                th_list = row.select("th")
                td_list = row.select("td")
                for th, td in zip(th_list, td_list):
                    key = th.text.strip().replace(
                        " ",
                        "").replace(
                        "\n",
                        "").replace(
                        "\t",
                        "")
                    val = td.text.strip()
                    if key:
                        data["basic_info"][key] = val

        # 2. 최근 연혁 (table#cTB202)
        history_table = soup.select_one("table#cTB202")
        if history_table:
            rows = history_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) >= 2:
                    data["history"].append({
                        "date": cols[0].text.strip(),
                        "content": cols[1].text.strip()
                    })

        # 3. 주요제품 및 매출구성 (table#cTB203)
        sales_table = soup.select_one("table#cTB203")
        if sales_table:
            rows = sales_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) >= 2:
                    product = cols[0].text.strip()
                    pct_str = cols[1].text.strip()
                    try:
                        pct_val = float(re.sub(r'[^0-9.]', '', pct_str))
                    except BaseException:
                        pct_val = 0.0
                    data["sales_composition"].append({
                        "product": product,
                        "percentage": pct_val
                    })

        # 4. 연구개발비 지출 현황 (table#cTB205_1)
        rnd_table = soup.select_one("table#cTB205_1")
        if rnd_table:
            headers = [th.text.strip()
                       for th in rnd_table.select("thead tr th")]
            rows = rnd_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) > 0:
                    row_data = {"period": cols[0].text.strip()}
                    for i, col in enumerate(cols[1:]):
                        if i + 1 < len(headers):
                            h_key = headers[i +
                                            1].replace(" ", "").replace("\n", "")
                            row_data[h_key] = col.text.strip()
                    data["rnd_status"].append(row_data)

        # 5. 인원 현황 (table#cTB205_2)
        staff_table = soup.select_one("table#cTB205_2")
        if staff_table:
            headers = [th.text.strip()
                       for th in staff_table.select("thead tr th")]
            rows = staff_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) > 0:
                    row_data = {"period": cols[0].text.strip()}
                    for i, col in enumerate(cols[1:]):
                        if i + 1 < len(headers):
                            h_key = headers[i +
                                            1].replace(" ", "").replace("\n", "")
                            row_data[h_key] = col.text.strip()
                    data["staff_status"].append(row_data)

        return data

    except Exception as e:
        print(f"Overview scraping error for {symbol}: {e}")
        return None


@turbo_cache(ttl_seconds=3600)
def get_korean_investment_indicators(
        symbol: str,
        freq: str = "0",
        fin_gubun: str = "IFRSL",
        rpt: str = "3"):
    """
    네이버 금융 투자지표(WiseReport cF4002.aspx)로부터 상세 지표를 스크랩합니다.
    (수익성, 성장성, 안정성, 활동성 통합 지원)
    - encparam 보안 토큰을 실시간 파싱하여 정밀 요청을 수행합니다.
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return None

    try:
        session = requests.Session()
        session.headers.update(HEADER)

        # Step 1: Parent Frame에 접속하여 보안 토큰(encparam) 추출
        # [Fix] c1040001.aspx 대신 가장 안정적인 c1010001.aspx(기업개요)에서 encparam을 추출합니다.
        frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}"
        res_frame = session.get(frame_url, timeout=7)
        html_frame = decode_safe(res_frame)

        # encparam: '...' 형태의 토큰 추출 (다양한 패턴 대응)
        match = re.search(r"encparam\s*[:=]\s*'([^']+)'", html_frame)
        if not match:
            # [Secondary Fallback] find in all script blocks
            match = re.search(r"encparam\s*[:=]\s*\"([^\"]+)\"", html_frame)

        if not match:
            print(f"Failed to find encparam for {code}")
            # [Ultra Fallback] If still not found, try the old URL just in case
            old_url = f"https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cmp_cd={code}"
            res_old = session.get(old_url, timeout=5)
            match = re.search(
                r"encparam\s*[:=]\s*'([^']+)'",
                decode_safe(res_old))

        if not match:
            return {"status": "empty", "message": "해당 종목의 데이터 토큰을 찾을 수 없습니다."}

        encparam = match.group(1)

        # Step 2: 실시간 데이터 API 호출 (JSON 포맷 반환)
        # finGubun: IFRSL(연결), IFRSS(별도), GAAPL(연결), GAAPS(별도), MAIN(주재무제표)
        valid_fingubun = ["IFRSL", "IFRSS", "GAAPL", "GAAPS", "MAIN"]
        if fin_gubun not in valid_fingubun:
            fin_gubun = "MAIN"  # Default to MAIN for stability

        data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq={freq}&rpt={rpt}&finGubun={fin_gubun}&encparam={encparam}"

        ajax_headers = {
            "Referer": frame_url,
            "X-Requested-With": "XMLHttpRequest"
        }
        res_data = session.get(data_url, headers=ajax_headers, timeout=7)

        # JSON 파싱 시도 (cF4002.aspx는 encparam이 있으면 JSON으로 반환함)
        try:
            raw_bytes = res_data.content
            # [Fix] Try CP949 first for NaverComp data, then fallback to UTF-8
            try:
                json_str = raw_bytes.decode('cp949')
            except UnicodeDecodeError:
                json_str = raw_bytes.decode('utf-8', 'ignore')
            json_data = json.loads(json_str)
        except Exception as e:
            print(f"Failed to parse JSON for {code}: {e}")
            return None

        # Step 3: 데이터 가공 (Header: YYMM, Data: indicators)
        if not json_data or "YYMM" not in json_data or not json_data.get(
                "YYMM"):
            msg = "해당 종목의 지표 정보를 불러올 수 없거나 존재하지 않는 페이지입니다."
            if "삼성전자" in str(symbol) or code == "005930":
                # Extra diagnostic for core stocks
                msg = f"WiseReport 서버로부터 {code} 지표 데이터를 정상적으로 로드하지 못했습니다. (네트워크/IP 차단 가능성)"
            return {"status": "empty", "message": msg}

        # Header 정제 (HTML 태그 제거)
        headers = []
        for h in json_data.get("YYMM", []):
            clean_h = re.sub(
                r'<[^>]*>',
                '',
                h).replace(
                "\n",
                "").replace(
                "\t",
                "").strip()
            if clean_h and clean_h not in headers:
                headers.append(clean_h)

        indicators = []
        for row in json_data.get("DATA", []):
            name = row.get("ACC_NM", "").strip()
            if not name:
                continue

            values = {}
            # DATA1, DATA2 ... 순서대로 헤더와 매칭
            for i, h in enumerate(headers):
                key = f"DATA{i + 1}"
                val = row.get(key)
                # N/A 등 문자열 정리
                try:
                    if isinstance(val, (int, float)):
                        values[h] = val
                    else:
                        values[h] = None
                except BaseException:
                    values[h] = None

            indicators.append({
                "name": name,
                "values": values
            })

        return {
            "status": "success",
            "symbol": symbol,
            "freq": freq,
            "finGubun": fin_gubun,
            "category": rpt,
            "headers": headers,
            "indicators": indicators
        }

    except Exception as e:
        print(f"Indicators intensive scraping error for {symbol}: {e}")
        return None


def get_investor_ranking_data():
    """
    시장 주도주 탭을 위한 수급 및 상승률 랭킹 데이터 수집
    프론트엔드 변수명에 맞춰 매핑:
    - foreign_sell: KOSPI 상승률 TOP
    - institution_sell: KOSDAQ 상승률 TOP
    - foreign_top: KOSPI 거래량 TOP
    - institution_top: KOSDAQ 거래량 TOP
    """
    import requests
    from bs4 import BeautifulSoup

    def parse_naver_sise(url, is_rise=False):
        try:
            res = requests.get(url, headers=HEADER, timeout=5)
            soup = BeautifulSoup(decode_safe(res), "html.parser")
            table = soup.select_one("table.type_2")
            if not table:
                return []

            items = []
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) < 6:
                    continue

                name_tag = cols[1].select_one("a")
                if not name_tag:
                    continue

                name = name_tag.text.strip()
                href = name_tag.get("href", "")
                symbol = href.split("code=")[-1] if "code=" in href else ""

                # 거래량 또는 등락률 값 추출
                val = cols[3].text.strip(
                ) if not is_rise else cols[5].text.strip()

                items.append({
                    "name": name,
                    "symbol": symbol,
                    "value": val
                })
                if len(items) >= 15:
                    break
            return items
        except BaseException:
            return []

    return {
        "foreign_sell": parse_naver_sise(
            "https://finance.naver.com/sise/sise_rise.naver?sosok=0",
            True),
        "institution_sell": parse_naver_sise(
            "https://finance.naver.com/sise/sise_rise.naver?sosok=1",
            True),
        "foreign_top": parse_naver_sise("https://finance.naver.com/sise/sise_quant.naver?sosok=0"),
        "institution_top": parse_naver_sise("https://finance.naver.com/sise/sise_quant.naver?sosok=1")}


def get_market_insights_data():
    """
    시장 주도주 탭을 위한 검색 및 거래대금 인사이트 데이터 수집.
    [v5.1.0] 병렬 처리 최적화 - 순차 API 호출 제거, ThreadPoolExecutor 사용.
    """
    import time
    from concurrent.futures import ThreadPoolExecutor

    # 간단한 인메모리 캐시 (60초)
    cache_attr = "_market_insights_cache"
    cache_ts_attr = "_market_insights_cache_ts"
    cached_data = globals().get(cache_attr)
    cached_ts = globals().get(cache_ts_attr, 0)
    if cached_data and (time.time() - cached_ts) < 60:
        return cached_data

    from korea_data import fetch_naver_ranking_data, robust_name
    from stock_data import get_simple_quote

    def process_item(item, value_mode=False):
        symbol = (item.get("reutersCode") or item.get("symbolCode") or
                  item.get("itemCode") or item.get("itemcode") or "")
        if not symbol:
            return None

        # 이미 이름이 있으면 quote 생략
        pre_name = (item.get("itemname") or item.get(
            "stockName") or item.get("itemName") or "")
        pre_name = robust_name(pre_name) if pre_name else ""
        has_valid_name = bool(pre_name) and any(
            0xAC00 <= ord(c) <= 0xD7A3 for c in pre_name)

        quote = {}
        if not has_valid_name:
            try:
                q = get_simple_quote(symbol)
                if q:
                    quote = q
            except Exception:
                pass

        name = (quote.get("name") if quote.get("name") and quote.get(
            "name") != symbol else None) or pre_name or symbol

        if value_mode:
            val_num = 0
            try:
                val_num = float(item.get("tradeAmount") or item.get(
                    "accumulatedTradingValue") or 0)
            except BaseException:
                pass
            if val_num >= 1000000000000:
                value_display = f"{val_num / 1000000000000:.1f}조"
            elif val_num >= 100000000:
                value_display = f"{val_num / 100000000:,.0f}억"
            else:
                value_display = f"{val_num:,.0f}"
            return {
                "name": name,
                "symbol": symbol,
                "value": value_display,
                "amount": f"{val_num / 100000000:,.0f}억" if val_num > 0 else "0억"}
        else:
            vol_num = 0
            try:
                vol_num = int(quote.get("volume") or item.get(
                    "accumulatedTradingVolume") or item.get("tradeVolume") or 0)
            except BaseException:
                pass
            if vol_num >= 1000000:
                vol_display = f"{vol_num / 1000000:.1f}백만"
            elif vol_num >= 10000:
                vol_display = f"{vol_num / 10000:.0f}만"
            else:
                vol_display = f"{vol_num:,}"
            return {
                "name": name,
                "symbol": symbol,
                "amount": f"{vol_display}주"}

    search_items = fetch_naver_ranking_data("KOR", "searchTop") or []
    value_items = fetch_naver_ranking_data("KOR", "priceTop") or []

    search_top = []
    value_top = []

    # 두 목록을 한꺼번에 병렬로 처리
    all_tasks = [(item, False) for item in search_items[:15]] + \
        [(item, True) for item in value_items[:15]]

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(process_item, item, mode)
                   for item, mode in all_tasks]
        results = [f.result() for f in futures]

    search_top = [r for r in results[:len(search_items[:15])] if r]
    value_top = [r for r in results[len(search_items[:15]):] if r]

    data = {"search_top": search_top, "value_top": value_top}
    globals()[cache_attr] = data
    globals()[cache_ts_attr] = time.time()
    return data


@turbo_cache(ttl_seconds=1800)
def get_naver_economy_calendar():
    """
    네이버 증권 최신 API를 사용하여 오늘부터 7일 후까지의 글로벌 경제 일정을 수집합니다.
    URL: https://stock.naver.com/api/securityService/economic/indicator/nations/releaseDate
    """
    import datetime

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://stock.naver.com/"}

    events = []

    try:
        # Check from today up to 7 days ahead
        for i in range(7):
            target_date = datetime.datetime.now() + datetime.timedelta(days=i)
            target_str = target_date.strftime("%Y%m%d")

            url = f"https://stock.naver.com/api/securityService/economic/indicator/nations/releaseDate?nationTypeList=KOR&nationTypeList=USA&page=1&pageSize=100&releaseDate={target_str}"

            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code != 200:
                continue

            data = res.json()
            indicators = data.get("indicators", [])

            for item in indicators:
                name = item.get("name", "Unknown")
                nation = item.get("nationType", "🌐")

                # 시간 형식 변환 (MM/DD HH:MM)
                raw_time = item.get("releaseTime", "000000")
                if not raw_time:
                    raw_time = "000000"
                time_fmt = f"{raw_time[:2]}:{raw_time[2:4]}" if len(
                    raw_time) >= 4 else "00:00"
                date_prefix = target_date.strftime("%m/%d")
                final_time_str = f"{date_prefix} {time_fmt}"

                importance = item.get("importance", 1)
                actual = item.get("actualValue", 0)
                previous = item.get("previousValue", 0)

                actual_str = str(actual) if actual != 0 else "-"
                prev_str = str(previous) if previous != 0 else "-"

                events.append({
                    "time": final_time_str,
                    "country": "US" if nation == "USA" else "KR" if nation == "KOR" else nation,
                    "event": name,
                    "event_kr": name,
                    "importance": importance,
                    "actual": actual_str,
                    "forecast": "-",
                    "previous": prev_str
                })

            if len(events) >= 15:
                break

    except Exception as e:
        print(f"[EconomyCalendar] API Processing Error: {e}")

    return events

def get_korean_investment_indicators(symbol: str, freq: str = "0", rpt: str = "3"):
    """
    Naver WiseReport (cF4002.aspx) 실시간 데이터 크롤링
    freq: '0'(연간), '1'(분기)
    rpt: '1'(재무제표), '2'(재무상태표), '3'(투자지표)
    """
    try:
        code = symbol.split('.')[0]
        import requests, re, json
        HEADER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}"
        res_frame = requests.get(frame_url, headers=HEADER, timeout=7)
        match = re.search(r"encparam:\s*'([^']*)'", res_frame.text)
        if not match: return None
        encparam = match.group(1)
        data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq={freq}&rpt={rpt}&finGubun=MAIN&encparam={encparam}"
        res_data = requests.get(data_url, headers={"Referer": frame_url, "User-Agent": HEADER["User-Agent"]}, timeout=7)
        try: json_data = res_data.json()
        except: json_data = json.loads(res_data.content.decode('utf-8', 'ignore'))
        headers = []
        for h in json_data.get("YYMM", []):
            clean_h = re.sub(r'<[^>]*>', '', h).replace("\n", "").replace("\t", "").strip()
            match = re.search(r'(\d{4}/\d{2})', clean_h)
            if match:
                hdr = match.group(1)
                if "(E)" in clean_h: hdr += "(E)"
                headers.append(hdr)
            else: headers.append(None)
        indicators = []
        for row in json_data.get("DATA", []):
            name, accode, vals = str(row.get("ACC_NM", "")).strip(), str(row.get("ACCODE", "")), {}
            for i, h in enumerate(headers):
                if h:
                    v = row.get(f"DATA{i+1}")
                    try: vals[h] = float(str(v).replace(',', '')) if v is not None and str(v).strip() not in ["", "-"] else None
                    except: vals[h] = None
            indicators.append({"name": name, "accode": accode, "values": vals})
        return {"status": "success", "headers": [h for h in headers if h], "indicators": indicators}
    except Exception as e:
        print(f"WiseReport error for {symbol}: {e}")
        return None
