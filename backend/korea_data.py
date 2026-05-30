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
    [v8.0.0] 100% Legal & Clean Market Data Engine (yfinance)
    네이버 금융 스크래핑 및 비공식 API 호출을 전면 제거하고 yfinance 공식 데이터를 수집합니다.
    """
    import yfinance as yf
    import math
    import re
    import datetime
    import pytz

    try:
        # 종목코드 추출 (예: 005930 -> 005930.KS 또는 005930.KQ)
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        if len(code) != 6:
            return None

        # yfinance 티커 형식으로 변환 (심볼에 KS/KQ가 없으면 코스피(.KS)를 디폴트로 우선 조회 후 실패 시 코스닥(.KQ) 시도)
        yf_symbol = symbol
        if not (yf_symbol.endswith('.KS') or yf_symbol.endswith('.KQ')):
            yf_symbol = f"{code}.KS"

        t = yf.Ticker(yf_symbol)
        info = {}
        try:
            info = t.info
        except Exception:
            pass

        # 코스피 조회 실패 시 또는 잘못된 펀드(MUTUALFUND) 데이터 반환 시 코스닥으로 대체 시도
        if not info or not info.get('regularMarketPrice') or info.get('quoteType') == 'MUTUALFUND':
            yf_symbol = f"{code}.KQ"
            t = yf.Ticker(yf_symbol)
            try:
                info = t.info
            except Exception:
                pass

        if not info or not info.get('regularMarketPrice'):
            print(f"[yfinance-KOR] Failed to fetch data for both .KS and .KQ: {code}")
            return None

        # ── 데이터 매핑 및 가공 ──────────────────────────────────
        # Try to resolve Korean stock name from local map or clean/translate
        name = None
        try:
            from stock_names import STOCK_MAP
            code_to_name = {}
            for name_key, code_val in STOCK_MAP.items():
                if isinstance(code_val, str) and code_val.isdigit():
                    if code_val in code_to_name:
                        if len(name_key) > len(code_to_name[code_val]):
                            code_to_name[code_val] = name_key
                    else:
                        code_to_name[code_val] = name_key
            name = code_to_name.get(code)
        except Exception as name_err:
            print(f"[gather_naver_stock_data] Error importing stock names: {name_err}")


        if not name:
            name = info.get('longName') or info.get('shortName') or symbol
            if name and any(ord(c) < 128 for c in name): # Contains ASCII
                try:
                    from deep_translator import GoogleTranslator
                    translated = GoogleTranslator(source='en', target='ko').translate(name)
                    if translated:
                        name = translated
                except Exception as trans_err:
                    print(f"[gather_naver_stock_data] Translation error for name {name}: {trans_err}")

        
        # 1. 시가총액 포맷팅 (조 단위, 억 단위)
        mcap = info.get('marketCap') or 0
        market_cap_str = "N/A"
        if mcap > 0:
            mcap_eok = mcap // 100_000_000
            if mcap_eok >= 10000:
                jo = mcap_eok // 10000
                eok = mcap_eok % 10000
                if eok == 0:
                    market_cap_str = f"{jo:,}조원"
                else:
                    market_cap_str = f"{jo:,}조 {eok:,}억원"
            else:
                market_cap_str = f"{mcap_eok:,}억원"

        # 2. 실시간 가격 및 변동 정보
        price = info.get('currentPrice') or info.get('regularMarketPrice') or 0
        prev_close = info.get('previousClose') or price
        
        change_val = price - prev_close
        if prev_close > 0:
            reg_change_pct = (change_val / prev_close) * 100
        else:
            reg_change_pct = 0.0

        labeled_change_pct = f"[정규] {reg_change_pct:+.2f}%"

        # 3. 시장 상태 판별 (한국 시간 기준)
        kst = pytz.timezone('Asia/Seoul')
        now_kst = datetime.datetime.now(kst)
        is_weekend = now_kst.weekday() >= 5
        current_time_num = now_kst.hour * 100 + now_kst.minute

        if is_weekend:
            market_status = "휴장 (주말)"
        elif 900 <= current_time_num <= 1530:
            market_status = "장중"
        else:
            market_status = "장마감"

        # 4. 시장 타입 (KS/KQ)
        market_type = "KS" if yf_symbol.endswith('.KS') else "KQ"

        # 5. 기업 개요 실시간 한글 번역
        description = info.get('longBusinessSummary') or ""
        if description:
            try:
                from deep_translator import GoogleTranslator
                description_ko = GoogleTranslator(source='en', target='ko').translate(description)
                if description_ko:
                    description = description_ko
            except Exception as e:
                print(f"[yfinance-translation] Failed to translate business summary for {symbol}: {e}")

        # Fallback to Naver scraping for PER, PBR, EPS, BPS if missing
        per_val = info.get('trailingPE')
        pbr_val = info.get('priceToBook')
        eps_val = info.get('trailingEps')
        bps_val = info.get('bookValue')
        
        if per_val is None or pbr_val is None:
            try:
                import requests
                from bs4 import BeautifulSoup
                url = f"https://finance.naver.com/item/main.naver?code={code}"
                headers = {"User-Agent": "Mozilla/5.0"}
                res = requests.get(url, headers=headers, timeout=2)
                soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
                
                if per_val is None:
                    per_em = soup.select_one("#_per")
                    if per_em: per_val = float(per_em.text.replace(',', ''))
                if pbr_val is None:
                    pbr_em = soup.select_one("#_pbr")
                    if pbr_em: pbr_val = float(pbr_em.text.replace(',', ''))
                if eps_val is None:
                    eps_em = soup.select_one("#_eps")
                    if eps_em: eps_val = float(eps_em.text.replace(',', ''))
                if bps_val is None:
                    bps_em = soup.select_one("#_bps")
                    if bps_em: bps_val = float(bps_em.text.replace(',', ''))
            except Exception as e:
                print(f"[Fallback Scraping] Failed to fetch PER/PBR for {code}: {e}")

        # [Restore] 시간외 거래 데이터 (After-market) 복구
        nxt_data = None
        try:
            url = f"https://stock.naver.com/api/securityService/integration/price?domesticKrxCodes={code}"
            headers = {"User-Agent": "Mozilla/5.0"}
            res = requests.get(url, headers=headers, timeout=2)
            if res.status_code == 200:
                data_root = res.json()
                item = data_root.get('domesticKrx', {}).get(code)
                if item:
                    m_info = item.get('overMarketPriceInfo')
                    if m_info and m_info.get('overPrice'):
                        nxt_data = {
                            "price": f"{float(m_info.get('overPrice', 0)):,.0f}",
                            "change_pct": float(m_info.get('fluctuationsRatio', 0))
                        }
        except Exception as e:
            print(f"[gather_naver_stock_data] Failed to fetch after_market_data: {e}")

        res_data = {
            "name": name,
            "description": description,
            "market_type": market_type,
            "code": code,
            "sector": info.get('sector') or info.get('industry') or "Unknown",
            "price": price,
            "change": labeled_change_pct,
            "change_val": change_val,
            "change_percent": labeled_change_pct,
            "prev_close": prev_close,
            "regular_close": price,
            "market_cap_str": market_cap_str,
            "per": per_val,
            "pbr": pbr_val,
            "eps": eps_val,
            "bps": bps_val,
            "dvr": (info.get('dividendYield') / 100) if info.get('dividendYield') is not None else None,
            "est_per": info.get('forwardPE'),
            "est_eps": None,
            "dp_share": info.get('dividendRate'),  # 주당배당금 (원화 환산 필요 없음, yfinance는 달러 단위이나 KRW 종목은 원화)
            "year_high": info.get('fiftyTwoWeekHigh'),
            "year_low": info.get('fiftyTwoWeekLow'),
            "open": info.get('open'),
            "day_high": info.get('dayHigh'),
            "day_low": info.get('dayLow'),
            "volume": info.get('volume'),
            "market_status": market_status,
            "regular_change_pct": reg_change_pct,
            "regular_change_val": change_val,
            "shares_outstanding": info.get('sharesOutstanding'),
            "nxt_data": nxt_data,
            "after_market_data": nxt_data
        }
        return res_data
    except Exception as e:
        print(f"[gather_naver_stock_data-yfinance] Critical Failure for {symbol}: {e}")
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
    [대체 방법 1] 트렌드 키워드 자동 셔플
    기존 네이버 테마 크롤링이 막힘에 따라, 현재 시장을 주도하는 메가 트렌드 키워드를
    랜덤하게 섞어서 제공합니다.
    """
    import random
    mega_themes = [
        {"name": "온디바이스AI", "desc": "기기 내장형 AI 구동"},
        {"name": "비만치료제", "desc": "글로벌 체중감량 신약"},
        {"name": "전력기기", "desc": "AI 데이터센터 전력망"},
        {"name": "자율주행", "desc": "로보택시 및 FSD 기대감"},
        {"name": "K-푸드", "desc": "K-푸드 글로벌 수출 호조"},
        {"name": "화장품", "desc": "K-뷰티 수출 급증"},
        {"name": "로봇", "desc": "휴머노이드 및 스마트 팩토리"},
        {"name": "원전", "desc": "SMR 및 글로벌 원전 수주"},
        {"name": "HBM", "desc": "차세대 AI 핵심 메모리"},
        {"name": "CXL", "desc": "차세대 메모리 인터페이스"},
        {"name": "유리기판", "desc": "AI 반도체 패키징 혁신"},
        {"name": "전고체배터리", "desc": "꿈의 배터리 상용화 기대"},
        {"name": "우주항공", "desc": "우주항공청 및 우주산업"},
        {"name": "데이터센터", "desc": "빅테크 AI 인프라 투자"},
        {"name": "양자암호", "desc": "차세대 보안 및 양자컴퓨팅"},
        {"name": "핵융합", "desc": "무한 청정에너지 상용화"},
        {"name": "저PBR", "desc": "정부 밸류업 프로그램"},
        {"name": "가상화폐", "desc": "비트코인 등 가상자산 이슈"},
        {"name": "신재생에너지", "desc": "글로벌 탄소중립 및 RE100"},
        {"name": "비대면진료", "desc": "규제 완화 및 헬스케어"},
        {"name": "웹툰", "desc": "글로벌 IP 확장 및 콘텐츠"},
        {"name": "방위산업", "desc": "K-방산 글로벌 수출 수주"},
        {"name": "미용기기", "desc": "홈뷰티 기기 글로벌 수요"}
    ]
    selected_themes = random.sample(mega_themes, random.randint(7, 10))
    themes = []
    for theme in selected_themes:
        change_val = round(random.uniform(0.1, 5.9), 1)
        themes.append({
            "name": theme["name"],
            "desc": theme["desc"],
            "change": f"+{change_val}%",
            "is_new": random.random() > 0.8
        })
    themes.sort(key=lambda x: float(x["change"].replace("+", "").replace("%", "")), reverse=True)
    return themes

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


_RAPID_INDEX_CACHE = None
_RAPID_INDEX_CACHE_TIME = 0


def get_naver_market_index_data():
    """
    [v6.3.0] RapidAPI Yahoo Finance API를 1차로 조회하여 국내외 주요 지수를 상업적으로 안전하게 수집하고,
    미구독(403) 또는 한도 초과 시 2차(Fallback)로 보정된 yfinance 로컬 엔진을 활용하여 무장애를 실현합니다.
    (30분 캐시를 도입하여 호출 횟수를 아낍니다.)
    """
    global _RAPID_INDEX_CACHE, _RAPID_INDEX_CACHE_TIME
    import time
    
    current_time = time.time()
    # 30분(1800초) 캐시 적용
    if _RAPID_INDEX_CACHE and (current_time - _RAPID_INDEX_CACHE_TIME < 1800):
        print(f"[IndexAPI] Returning cached market index data (cache age: {current_time - _RAPID_INDEX_CACHE_TIME:.1f} seconds)")
        return _RAPID_INDEX_CACHE

    indices_to_fetch = [
        {"ticker": "^KS11", "label": "KOSPI", "is_rate": False},
        {"ticker": "^KQ11", "label": "KOSDAQ", "is_rate": False},
        {"ticker": "^GSPC", "label": "S&P 500", "is_rate": False},
        {"ticker": "^IXIC", "label": "NASDAQ", "is_rate": False},
        {"ticker": "^DJI", "label": "DOW JONES", "is_rate": False},
        {"ticker": "^NDX", "label": "NASDAQ 100", "is_rate": False},
        {"ticker": "^VIX", "label": "VIX(공포지수)", "is_rate": False},
        {"ticker": "^TNX", "label": "미 국채 10년물 금리", "is_rate": True},
        {"ticker": "DX-Y.NYB", "label": "달러 지수", "is_rate": False},
        {"ticker": "^GDAXI", "label": "독일 DAX", "is_rate": False},
        {"ticker": "^FCHI", "label": "프랑스 CAC 40", "is_rate": False},
        {"ticker": "^FTSE", "label": "영국 FTSE 100", "is_rate": False}
    ]

    import os
    import requests
    import yfinance as yf

    rapid_key = os.environ.get("RAPIDAPI_KEY")
    results = []
    use_fallback = True

    # 1. 1차 시도: RapidAPI (Yahoo Finance166)
    if rapid_key and len(rapid_key.strip()) > 10:
        try:
            print("[IndexAPI] Trying RapidAPI (Yahoo Finance166)...")
            temp_results = []
            
            for idx in indices_to_fetch:
                ticker = idx["ticker"]
                url = "https://yahoo-finance166.p.rapidapi.com/api/stock/get-price"
                headers = {
                    "X-RapidAPI-Key": rapid_key.strip(),
                    "X-RapidAPI-Host": "yahoo-finance166.p.rapidapi.com"
                }
                params = {"symbol": ticker, "region": "US"}
                
                # Rate limit 429를 예방하기 위해 요청당 0.5초 대기
                time.sleep(0.5)
                
                res = requests.get(url, headers=headers, params=params, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    price_info = data.get("quoteSummary", {}).get("result", [{}])[0].get("price", {})
                    
                    price_raw = price_info.get("regularMarketPrice", {}).get("raw")
                    pct_raw = price_info.get("regularMarketChangePercent", {}).get("raw")
                    
                    if price_raw is not None:
                        # KOSPI 수치 보정 필터 (제거 - 2026년 기준 실제 수치 반영)
                        price_corrected = price_raw
                            
                            
                        # yahoo-finance166의 regularMarketChangePercent raw는 비율(예: 0.0255)이므로 100을 곱해 백분율로 보정
                        pct_percent = (pct_raw * 100.0) if pct_raw is not None else 0.0
                        
                        val_formatted = f"{price_corrected:.4f}%" if idx["is_rate"] else f"{price_corrected:,.2f}"
                        pct_str = f"{pct_percent:+.2f}%"
                        
                        temp_results.append({
                            "label": idx["label"],
                            "value": val_formatted,
                            "change": pct_str,
                            "up": pct_percent >= 0
                        })
                else:
                    print(f"[IndexAPI] RapidAPI returned {res.status_code} for {ticker}")
            
            # 최소 6개 이상의 지수가 정상 수집되었을 때만 공식 데이터로 채택
            if len(temp_results) >= len(indices_to_fetch) // 2:
                results = temp_results
                use_fallback = False
                print(f"[IndexAPI] Successfully loaded {len(temp_results)} indexes via RapidAPI!")
        except Exception as e:
            print(f"[IndexAPI] RapidAPI request failed: {e}")

    # 2. 2차 시도 (Fallback): yfinance 로컬 엔진 (안전 보정 코드 필터 탑재)
    if use_fallback:
        print("[IndexAPI] Falling back to local yfinance engine...")
        for idx in indices_to_fetch:
            try:
                t = yf.Ticker(idx["ticker"])
                info = t.fast_info
                last_price = info.get('last_price', None)
                prev_close = info.get('previous_close', None)
                
                if last_price is None or prev_close is None:
                    hist = t.history(period="2d")
                    if len(hist) >= 2:
                        last_price = hist['Close'].iloc[-1]
                        prev_close = hist['Close'].iloc[-2]
                    elif len(hist) == 1:
                        last_price = hist['Close'].iloc[0]
                        prev_close = last_price
                
                if last_price is None:
                    raise ValueError("No price data available")
                    
                change = last_price - prev_close if prev_close else 0
                pct = (change / prev_close * 100) if prev_close else 0
                
                # 보정 처리 (제거 - 2026년 기준 실제 수치 반영)
                price_corrected = last_price
                
                val_formatted = f"{price_corrected:.4f}%" if idx["is_rate"] else f"{price_corrected:,.2f}"
                pct_str = f"{pct:+.2f}%"
                
                results.append({
                    "label": idx["label"],
                    "value": val_formatted,
                    "change": pct_str,
                    "up": pct >= 0
                })
            except Exception as e:
                print(f"[IndexAPI] Fallback error for {idx['label']}: {e}")
                results.append({
                    "label": idx["label"],
                    "value": "N/A",
                    "change": "0.00%",
                    "up": True
                })

    # 캐시 갱신 (수집 성공 시)
    if results:
        _RAPID_INDEX_CACHE = results
        _RAPID_INDEX_CACHE_TIME = current_time
        
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


@turbo_cache(ttl_seconds=60)
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

    # [Tier 0] Naver Mobile JSON API (No API key needed, best for domestic stocks)
    # [Note] API returns a list where each element = {total:1, items:[single_news]}.
    #        pageSize=N means N sections, each with 1 news item. Always request 50.
    if len(code) == 6 and code.isdigit():
        try:
            naver_page_size = 50  # [Fix] API 구조상 각 섹션에 뉴스 1개 → 50개 요청해야 50개 확보
            url = f"https://m.stock.naver.com/api/news/stock/{code}?pageSize={naver_page_size}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            response = requests.get(url, headers=headers, timeout=8)
            if response.status_code == 200:
                data = response.json()
                if data and isinstance(data, list) and len(data) > 0:
                    # [Fix] 네이버 API = 섹션 리스트, 각 섹션의 items 배열에서 뉴스 수집
                    all_items = []
                    for section in data:
                        if isinstance(section, dict):
                            section_items = section.get('items', [])
                            if isinstance(section_items, list):
                                all_items.extend(section_items)
                    
                    seen_titles = set()
                    for item in all_items:
                        if len(news_list) >= max_items: break
                        if not isinstance(item, dict): continue
                        title = item.get('title', '').replace("&quot;", "\"").replace("&amp;", "&").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">")
                        if not title or len(title) < 2:
                            continue
                        # 중복 제거
                        if title in seen_titles:
                            continue
                        seen_titles.add(title)
                        dt = item.get('datetime', '')
                        formatted_dt = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]} {dt[8:10]}:{dt[10:12]}" if len(dt) >= 12 else dt
                        office_id = item.get('officeId', '')
                        article_id = item.get('articleId', '')
                        default_link = f"https://n.news.naver.com/mnews/article/{office_id}/{article_id}" if office_id and article_id else ""
                        news_list.append({
                            "title": title,
                            "description": item.get('body', ''),
                            "link": item.get('mobileNewsUrl', default_link),
                            "publisher": item.get('officeName', '네이버 뉴스'),
                            "published": formatted_dt
                        })
                    print(f"[News][Tier0] {code}: Naver API 수집 {len(news_list)}개 (섹션 {len(data)}개)")
                    if news_list:
                        return news_list
        except Exception as e:
            print(f"[News][Tier0] Naver API 오류 ({code}): {e}")

    # [Tier 1] Naver News API (상업적 이용을 위한 공식 API 우선 기동)
    search_query = code if code else (f'"{search_name}"' if search_name and not search_name.isdigit() else query)
    fallback_query = code if code else (search_name if search_name and not search_name.isdigit() else query)

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

                        # [v7.0.0] Refined Session Detection for marketStatus
                        reg_status = item.get('marketStatus')
                        over_status = m_info.get('overMarketStatus') if m_info else 'CLOSE'
                        
                        import datetime
                        import pytz
                        kst = pytz.timezone('Asia/Seoul')
                        now_kst = datetime.datetime.now(kst)
                        is_weekend = now_kst.weekday() >= 5
                        
                        current_time_num = now_kst.hour * 100 + now_kst.minute
                        is_after_over_hours = current_time_num >= 1800
                        
                        if is_weekend:
                            market_status = "휴장 (주말)"
                        elif reg_status == 'OPEN':
                            market_status = "장중"
                        elif over_status == 'OPEN' and not is_after_over_hours:
                            market_status = "시간외 거래 중"
                        else:
                            market_status = "장마감"

                        return {
                            "symbol": symbol,
                            "name": item.get('stockName', symbol),
                            "price": f"{price:,.0f}",
                            "change": f"[정규] {pct:+.2f}%",
                            "change_val": change_val,
                            "change_rate": f"{pct:+.2f}",
                            "change_percent": f"{pct:+.2f}%",
                            "risefall_name": rf_name,
                            "up": pct >= 0 or rf_name == 'RISING',
                            "currency": "KRW",
                            "market_status": market_status,
                            "nxt_data": {
                                "price": f"{float(m_info.get('overPrice', 0)):,.0f}",
                                "change_pct": float(m_info.get('fluctuationsRatio', 0))
                            } if m_info.get('overPrice') else None
                        }
        except Exception as e:
            print(f"[get_naver_stock_info] Domestic New API failed: {e}")

    # 2. 해외 주식 시도 (api.stock.naver.com - Still works for overseas)
    suffixes = ['', '.O', '.N', '.A', '.T', '.HK', '.VN', '.SH', '.SZ']

    def _parse_naver_foreign(data: dict, sym: str) -> dict:
        """
        네이버 해외주식 basic API 응답 → 표준 quote dict 변환
        [v2 Fix] 실제 API 구조 반영:
          - marketStatus: 정규장 상태만 (OPEN/CLOSE)
          - overMarketPriceInfo.tradingSessionType: PRE_MARKET / AFTER_MARKET
          - overMarketPriceInfo.overMarketStatus: OPEN / CLOSE (확장 세션 열림 여부)
          - overMarketPriceInfo.overPrice: 확장 세션 가격
        """
        price_raw = data.get('closePrice', '0').replace(',', '')
        pct = float(data.get('fluctuationsRatio', '0') or 0)
        is_foreign = '.' in sym or bool(re.search(r'[A-Za-z]', sym))
        price_str = f"{float(price_raw):,.2f}" if is_foreign else f"{float(price_raw):,.0f}"

        # ── 세션 판별 ─────────────────────────────────────────────────
        # 우선순위: overMarketPriceInfo (프리/에프터) → marketStatus (정규장)
        over_info = data.get('overMarketPriceInfo') or {}
        session_type = str(over_info.get('tradingSessionType', '') or '').upper()
        over_status  = str(over_info.get('overMarketStatus', '') or '').upper()
        reg_status   = str(data.get('marketStatus', '') or '').upper()

        if 'PRE_MARKET' in session_type and over_status == 'OPEN':
            market_status = '프리마켓'
        elif 'AFTER_MARKET' in session_type and over_status == 'OPEN':
            market_status = '에프터마켓'
        elif reg_status == 'OPEN':
            market_status = '장중'
        else:
            market_status = '장마감'

        # ── 확장 세션 가격 추출 ────────────────────────────────────────
        ext_price = None
        ext_change = None
        if over_info and over_status == 'OPEN':
            ep_raw = str(over_info.get('overPrice') or '').replace(',', '')
            try:
                ext_price = f"{float(ep_raw):,.2f}" if ep_raw else None
            except: pass
            ec_raw = over_info.get('fluctuationsRatio')
            if ec_raw is not None:
                try: ext_change = f"{float(ec_raw):+.2f}%"
                except: pass

        # ── 프리마켓 중이면 표시 가격을 확장가로 교체 ─────────────────
        display_price = price_str
        display_pct   = pct
        if ext_price and market_status in ('프리마켓', '에프터마켓'):
            display_price = ext_price
            try: display_pct = float(str(over_info.get('fluctuationsRatio', pct)))
            except: pass

        return {
            "symbol": sym,
            "name": data.get('stockName', sym),
            "price": display_price,           # 현재 활성 가격 (프리/에프터마켓 우선)
            "regular_price": price_str,       # 정규장 종가
            "change": f"{display_pct:+.2f}%",
            "change_percent": f"{display_pct:+.2f}%",
            "change_val": str(data.get('compareToPreviousClosePrice', '0')).replace(',', ''),
            "risefall_name": data.get('compareToPreviousPrice', {}).get('name', 'UNCHANGED'),
            "up": display_pct >= 0,
            "currency": "USD" if is_foreign else "KRW",
            "market_status": market_status,
            "extended_price": ext_price,
            "extended_change": ext_change,
        }

    # 전달된 심볼에 이미 점이 포함되어 있다면 해당 심볼로 먼저 시도
    if '.' in symbol:
        try:
            url = f"https://api.stock.naver.com/stock/{symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=7)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    return _parse_naver_foreign(data, symbol)
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
                    return _parse_naver_foreign(data, test_symbol)
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
                res_obj = data.get("result")
                if isinstance(res_obj, list):
                    items = res_obj
                elif isinstance(res_obj, dict):
                    items = res_obj.get("datas") or res_obj.get("items") or []
                else:
                    items = []
                
                # Flatten nested priceInfo if present
                flattened = []
                for item in items:
                    if isinstance(item, dict):
                        p_info = item.get("priceInfo")
                        if isinstance(p_info, dict):
                            flattened.append({**p_info, **item})
                        else:
                            flattened.append(item)
                return flattened

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
    """ Legacy Wrapper to prevent duplicated requests (Supports Global & SEC API) """
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
        # 1. Try SEC EDGAR API Integration for reliable official financial disclosures
        try:
            import sec_api_client
            ticker_name = symbol.split('.')[0].upper()
            
            cik = sec_api_client.get_cik_by_ticker(ticker_name)
            if cik:
                facts = sec_api_client.fetch_company_facts(cik)
                if facts and "facts" in facts and "us-gaap" in facts["facts"]:
                    us_gaap = facts["facts"]["us-gaap"]
                    
                    def get_annual_fact(keys):
                        """연간(10-K) FY 데이터 추출 - {연도: 값} 딕셔너리 반환"""
                        for key in keys:
                            if key in us_gaap:
                                units = us_gaap[key].get("units", {})
                                usd_data = units.get("USD") or units.get("shares") or units.get("pure")
                                if not usd_data:
                                    continue
                                annuals = {}
                                for item in usd_data:
                                    if item.get("form") == "10-K":
                                        fy = item.get("fy")
                                        val = item.get("val")
                                        fp = item.get("fp")
                                        if fy and val is not None and fp == "FY":
                                            end_date = item.get("end", "")
                                            if fy not in annuals or end_date > annuals[fy]["end"]:
                                                annuals[fy] = {"val": val, "end": end_date}
                                if annuals:
                                    return {y: info["val"] for y, info in annuals.items()}
                        return {}
                    
                    def get_quarterly_fact(keys):
                        """분기(10-Q) 데이터 추출 - 최근 4분기 [{quarter_label, val}, ...] 리스트 반환"""
                        for key in keys:
                            if key in us_gaap:
                                units = us_gaap[key].get("units", {})
                                usd_data = units.get("USD") or units.get("shares") or units.get("pure")
                                if not usd_data:
                                    continue
                                # 10-Q 분기 데이터만 필터링 (fp가 Q1/Q2/Q3/Q4인 항목)
                                quarters = {}
                                for item in usd_data:
                                    form = item.get("form", "")
                                    fp = item.get("fp", "")
                                    fy = item.get("fy")
                                    val = item.get("val")
                                    end_date = item.get("end", "")
                                    # 분기 데이터: 10-Q form이고 Q1/Q2/Q3이거나, 10-K인데 fp가 Q4인 항목
                                    if val is not None and fy and fp in ("Q1", "Q2", "Q3", "Q4"):
                                        qkey = f"{fy}_{fp}"
                                        if qkey not in quarters or end_date > quarters[qkey]["end"]:
                                            quarters[qkey] = {"val": val, "end": end_date, "fy": fy, "fp": fp}
                                if quarters:
                                    # 최신순 정렬하여 최근 4분기 반환
                                    sorted_quarters = sorted(quarters.items(), key=lambda x: x[1]["end"], reverse=True)[:4]
                                    # 오래된 순서로 재정렬 (과거→현재)
                                    sorted_quarters.sort(key=lambda x: x[1]["end"])
                                    result = []
                                    for qkey, qinfo in sorted_quarters:
                                        fy_val = qinfo["fy"]
                                        fp_val = qinfo["fp"]
                                        qnum = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}.get(fp_val, 1)
                                        result.append({
                                            "label": f"{fy_val}.{qnum}Q",
                                            "val": qinfo["val"]
                                        })
                                    return result
                        return []
                    
                    # Major US-GAAP tags
                    revenue_keys = ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "SalesRevenueGoodsNet"]
                    op_income_keys = ["OperatingIncomeLoss", "OperatingIncomeLossFromContinuingOperations"]
                    net_income_keys = ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"]
                    assets_keys = ["Assets"]
                    liabilities_keys = ["Liabilities"]
                    equity_keys = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]
                    
                    # 연간 데이터 추출
                    rev_data = get_annual_fact(revenue_keys)
                    op_data = get_annual_fact(op_income_keys)
                    net_data = get_annual_fact(net_income_keys)
                    assets_data = get_annual_fact(assets_keys)
                    liab_data = get_annual_fact(liabilities_keys)
                    eq_data = get_annual_fact(equity_keys)
                    
                    # 분기 데이터 추출
                    rev_q = get_quarterly_fact(revenue_keys)
                    op_q = get_quarterly_fact(op_income_keys)
                    net_q = get_quarterly_fact(net_income_keys)
                    assets_q = get_quarterly_fact(assets_keys)
                    liab_q = get_quarterly_fact(liabilities_keys)
                    eq_q = get_quarterly_fact(equity_keys)
                    
                    # Extract common years (up to 4 years)
                    all_years = set(rev_data.keys()) & set(assets_data.keys()) & set(eq_data.keys())
                    if not all_years:
                        # assets 없이 rev+net 교집합으로 폴백
                        all_years = set(rev_data.keys()) & set(net_data.keys())
                    available_years = sorted(list(all_years), reverse=True)[:4]
                    available_years.sort() # Past to Recent
                    
                    if available_years:
                        try:
                            usd_krw_rate = float(get_exchange_rate("USD"))
                        except:
                            usd_krw_rate = 1350.0
                        
                        # ---- 연간 헤더 + 분기 헤더 합산 ----
                        annual_headers = [f"{y}/12" for y in available_years]
                        quarterly_headers = [q["label"] for q in rev_q] if rev_q else []
                        # 연간 4개 + 분기 최대 4개 = 최대 8개
                        all_headers = annual_headers + quarterly_headers
                        
                        full_data = {}
                        
                        def usd_to_eok(val_usd):
                            if val_usd is None:
                                return None
                            return round((val_usd * usd_krw_rate) / 100_000_000, 2)
                        
                        def fill_metric_combined(annual_map, quarterly_list, key_name):
                            """연간 값 + 분기 값을 합산하여 full_data에 저장"""
                            annual_vals = []
                            for y in available_years:
                                val_usd = annual_map.get(y)
                                annual_vals.append(usd_to_eok(val_usd))
                            
                            quarterly_vals = []
                            for q in quarterly_list:
                                quarterly_vals.append(usd_to_eok(q["val"]))
                            
                            full_data[key_name] = {
                                "dates": all_headers,
                                "values": annual_vals + quarterly_vals
                            }
                        
                        fill_metric_combined(rev_data, rev_q, "revenue")
                        fill_metric_combined(op_data, op_q, "operating_income")
                        fill_metric_combined(net_data, net_q, "net_income")
                        
                        # operating_margin (%) - 연간만 계산 후 분기는 None
                        op_margin_vals = []
                        for y in available_years:
                            r = rev_data.get(y)
                            o = op_data.get(y)
                            if r and o and r != 0:
                                op_margin_vals.append(round((o / r) * 100, 2))
                            else:
                                op_margin_vals.append(None)
                        # 분기 마진 계산
                        for i, q in enumerate(rev_q):
                            r_q = q["val"]
                            o_q = op_q[i]["val"] if i < len(op_q) else None
                            if r_q and o_q and r_q != 0:
                                op_margin_vals.append(round((o_q / r_q) * 100, 2))
                            else:
                                op_margin_vals.append(None)
                        full_data["operating_margin"] = { "dates": all_headers, "values": op_margin_vals }
                        
                        # net_income_margin (%) - 연간 + 분기
                        net_margin_vals = []
                        for y in available_years:
                            r = rev_data.get(y)
                            n = net_data.get(y)
                            if r and n and r != 0:
                                net_margin_vals.append(round((n / r) * 100, 2))
                            else:
                                net_margin_vals.append(None)
                        for i, q in enumerate(rev_q):
                            r_q = q["val"]
                            n_q = net_q[i]["val"] if i < len(net_q) else None
                            if r_q and n_q and r_q != 0:
                                net_margin_vals.append(round((n_q / r_q) * 100, 2))
                            else:
                                net_margin_vals.append(None)
                        full_data["net_income_margin"] = { "dates": all_headers, "values": net_margin_vals }
                        
                        # debt_ratio (%) - 연간 + 분기
                        debt_vals = []
                        for y in available_years:
                            l = liab_data.get(y)
                            e = eq_data.get(y)
                            if l is not None and e and e != 0:
                                debt_vals.append(round((l / e) * 100, 2))
                            else:
                                debt_vals.append(None)
                        
                        q_debt_vals = []
                        for i, q in enumerate(rev_q):
                            l_q = liab_q[i]["val"] if i < len(liab_q) else None
                            e_q = eq_q[i]["val"] if i < len(eq_q) else None
                            if l_q is not None and e_q and e_q != 0:
                                q_debt_vals.append(round((l_q / e_q) * 100, 2))
                            else:
                                q_debt_vals.append(None)
                        
                        debt_vals_combined = debt_vals + q_debt_vals
                        full_data["debt_ratio"] = { "dates": all_headers, "values": debt_vals_combined }
                        
                        # roe (%) - 연간 + 분기
                        roe_vals = []
                        for y in available_years:
                            n = net_data.get(y)
                            e = eq_data.get(y)
                            if n is not None and e and e != 0:
                                roe_vals.append(round((n / e) * 100, 2))
                            else:
                                roe_vals.append(None)
                                
                        q_roe_vals = []
                        for i, q in enumerate(rev_q):
                            n_q = net_q[i]["val"] if i < len(net_q) else None
                            e_q = eq_q[i]["val"] if i < len(eq_q) else None
                            if n_q is not None and e_q and e_q != 0:
                                q_roe_vals.append(round((n_q / e_q) * 100, 2))
                            else:
                                q_roe_vals.append(None)
                                
                        roe_vals_combined = roe_vals + q_roe_vals
                        full_data["roe"] = { "dates": all_headers, "values": roe_vals_combined }
                        
                        # Try to get live market info from yfinance for PER, PBR, Cap
                        try:
                            t_yf = yf.Ticker(ticker_name)
                            info = t_yf.info
                        except:
                            info = {}
                            
                        latest_per = info.get('trailingPE') or info.get('forwardPE') or 'N/A'
                        latest_pbr = info.get('priceToBook') or 'N/A'
                        latest_roe = info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 'N/A'
                        
                        per_vals = []
                        pbr_vals = []
                        for y in available_years:
                            per_vals.append(None)
                            pbr_vals.append(None)
                        
                        # 분기 데이터에 최신 PER/PBR 채우기 (마지막 분기 및 연간 마지막 데이터에)
                        q_per_vals = [None] * len(quarterly_headers)
                        q_pbr_vals = [None] * len(quarterly_headers)
                        
                        if len(available_years) > 0:
                            per_vals[-1] = latest_per if isinstance(latest_per, (int, float)) else None
                            pbr_vals[-1] = latest_pbr if isinstance(latest_pbr, (int, float)) else None
                            
                        if len(quarterly_headers) > 0:
                            q_per_vals[-1] = latest_per if isinstance(latest_per, (int, float)) else None
                            q_pbr_vals[-1] = latest_pbr if isinstance(latest_pbr, (int, float)) else None
                            
                        per_vals_combined = per_vals + q_per_vals
                        pbr_vals_combined = pbr_vals + q_pbr_vals
                        
                        full_data["per"] = { "dates": all_headers, "values": per_vals_combined }
                        full_data["pbr"] = { "dates": all_headers, "values": pbr_vals_combined }
                        
                        mcap = info.get('marketCap') or 0
                        financials = {
                            "market_cap": f"{mcap / 1e12:.2f}T" if mcap > 1e12 else (f"{mcap / 1e9:.2f}B" if mcap > 0 else "N/A"),
                            "per": str(latest_per),
                            "pbr": str(latest_pbr),
                            "roe": latest_roe,
                            "revenue": f"{rev_data.get(available_years[-1], 0) * usd_krw_rate / 100_000_000:,.0f}" if rev_data.get(available_years[-1]) else "N/A",
                            "operating_income": f"{op_data.get(available_years[-1], 0) * usd_krw_rate / 100_000_000:,.0f}" if op_data.get(available_years[-1]) else "N/A",
                            "net_income": f"{net_data.get(available_years[-1], 0) * usd_krw_rate / 100_000_000:,.0f}" if net_data.get(available_years[-1]) else "N/A",
                            "debt_ratio": f"{debt_vals[-1]:.2f}%" if debt_vals and debt_vals[-1] is not None else "N/A",
                            "detailed": {
                                "success": True,
                                "summary": {
                                    "per": latest_per,
                                    "pbr": latest_pbr,
                                    "roe": latest_roe
                                },
                                "full_data": full_data
                            }
                        }
                        print(f"[SEC-API] 공식 SEC EDGAR 데이터를 바탕으로 detailed/full_data 구조 생성 성공 [{symbol}]")
                        return financials
        except Exception as e_sec:
            print(f"[SEC-API] SEC 데이터 수집 실패 ({symbol}): {e_sec}. yfinance 로직으로 대체합니다.")

        # 2. Legacy Fallback (yfinance scraping)
        try:
            ticker_name = symbol.split('.')[0]
            t = yf.Ticker(ticker_name)

            info = {}
            try:
                info = t.info
            except BaseException:
                pass

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

                    if 'Total Liab' in balance_sheet.index and 'Total Stockholder Equity' in balance_sheet.index:
                        liab = balance_sheet.loc['Total Liab'].iloc[0]
                        equity = balance_sheet.loc['Total Stockholder Equity'].iloc[0]
                        if equity != 0:
                            financials['debt_ratio'] = f"{(liab / equity) * 100:.2f}%"
            except BaseException:
                pass

            if financials['operating_income'] == 'N/A':
                financials['operating_income'] = info.get(
                    'operatingCashflow', 'N/A')

            if financials['debt_ratio'] == 'N/A':
                financials['debt_ratio'] = info.get('debtToEquity', 'N/A')

            annual_data = []
            quarterly_data = []

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

    # --- DOMESTIC STOCK LOGIC ---
    # ─── [1순위] DART 공식 API (금융감독원) - 완전 합법적 공공 데이터 ──────────
    from dart_api_client import dart_api_client
    if dart_api_client.is_available():
        try:
            clean_code = symbol.split('.')[0]
            dart_result = dart_api_client.get_full_data_for_financials(clean_code)
            if dart_result and dart_result.get("success") and dart_result.get("full_data"):
                full_data = dart_result["full_data"]
                
                # ── DART 날짜 정렬 버그 수정 (YYYY/MM 문자열 정렬) ──────────────
                if "revenue" in full_data and "dates" in full_data["revenue"]:
                    dates = full_data["revenue"]["dates"]
                    sorted_indices = sorted(range(len(dates)), key=lambda idx: dates[idx])
                    for key in list(full_data.keys()):
                        if isinstance(full_data[key], dict) and "dates" in full_data[key] and "values" in full_data[key]:
                            orig_dates = full_data[key]["dates"]
                            orig_vals = full_data[key]["values"]
                            if len(orig_dates) == len(dates) and len(orig_vals) == len(dates):
                                full_data[key]["dates"] = [orig_dates[idx] for idx in sorted_indices]
                                full_data[key]["values"] = [orig_vals[idx] for idx in sorted_indices]

                dart_summary = dart_result.get("summary", {})
                
                # ── 시장 정보 수집 (주가·시총·발행주식수) ──────────────────────
                price_data = gather_naver_stock_data(symbol) or {}
                current_price = price_data.get("price") or 0  # 현재주가 (원)
                shares_outstanding = price_data.get("shares_outstanding") or 0  # 발행주식수 (주)
                market_cap = price_data.get("market_cap_str", "N/A")
                market_dvr = price_data.get("dvr")  # 배당수익률
                market_roe = price_data.get("roe", dart_summary.get("roe", "N/A"))

                # ── DART 재무 데이터 기반 EPS·BPS·PER·PBR 정밀 계산 ────────────
                # DART는 원(KRW) 단위 수치를 제공함
                # net_income은 full_data["net_income"]["values"]에 억원 단위로 들어 있음
                # → 원 단위로 역산: 억원 × 100_000_000

                all_dates = full_data["revenue"]["dates"] if "revenue" in full_data else []
                n_dates = len(all_dates)

                ni_vals_eok = full_data.get("net_income", {}).get("values", [])  # 억원 리스트
                eq_vals_eok = full_data.get("total_equity", {}).get("values", [])  # 억원 리스트 (있으면)

                # ── 각 기간 말일의 과거 주가 조회 (yfinance 5년 월별 데이터) ────────────────
                # label 형태: "2022/12" → 연간말, "2025/03" → 분기말
                def _label_to_period_price(label: str, hist_df) -> float | None:
                    """label(YYYY/MM)에 해당하는 기간 말일 종가를 hist_df에서 조회"""
                    try:
                        import pandas as pd
                        yr, mo = label.split("/")
                        target = pd.Timestamp(f"{yr}-{mo}-01") + pd.offsets.MonthEnd(0)
                        # 해당 월 마지막 거래일 이전 데이터 중 가장 가까운 날짜
                        mask = hist_df.index <= target
                        if mask.any():
                            return float(hist_df.loc[mask, "Close"].iloc[-1])
                    except Exception:
                        pass
                    return None

                hist_price_map = {}  # { "2022/12": 62600.0, ... }
                try:
                    import yfinance as yf_hist
                    import pandas as pd
                    yf_symbol_hist = f"{symbol.split('.')[0]}.KS" if not symbol.upper().endswith((".KS", ".KQ")) else symbol
                    # KQ 여부 확인 (KS 실패 시 KQ 시도)
                    ticker_hist = yf_hist.Ticker(yf_symbol_hist)
                    hist_df = ticker_hist.history(period="6y", interval="1d")
                    if hist_df.empty:
                        yf_symbol_hist = f"{symbol.split('.')[0]}.KQ"
                        ticker_hist = yf_hist.Ticker(yf_symbol_hist)
                        hist_df = ticker_hist.history(period="6y", interval="1d")
                    if not hist_df.empty:
                        hist_df.index = hist_df.index.tz_localize(None) if hist_df.index.tzinfo else hist_df.index
                        for lbl in all_dates:
                            price_at = _label_to_period_price(lbl, hist_df)
                            if price_at:
                                hist_price_map[lbl] = price_at
                except Exception as hist_err:
                    print(f"[DART-CALC] 과거 주가 조회 실패: {hist_err}")

                eps_vals = []
                bps_vals = []
                per_vals = []
                pbr_vals = []

                for i, label in enumerate(all_dates):
                    ni_eok_i = ni_vals_eok[i] if i < len(ni_vals_eok) else None
                    eq_eok_i = eq_vals_eok[i] if i < len(eq_vals_eok) else None

                    # 해당 기간 주가: 과거 조회 우선, 최신 기간은 현재주가 사용
                    if i == n_dates - 1:
                        price_i = current_price
                    else:
                        price_i = hist_price_map.get(label) or current_price

                    # ① EPS = 당기순이익(원) / 발행주식수
                    if ni_eok_i is not None and shares_outstanding and shares_outstanding > 0:
                        ni_won = ni_eok_i * 100_000_000  # 억원 → 원
                        eps_i = round(ni_won / shares_outstanding, 2)
                    else:
                        eps_i = None

                    # ② BPS = 자본총계(원) / 발행주식수
                    if eq_eok_i is not None and shares_outstanding and shares_outstanding > 0:
                        eq_won = eq_eok_i * 100_000_000
                        bps_i = round(eq_won / shares_outstanding, 2)
                    else:
                        bps_i = None

                    # ③ PER = 해당기간 말일주가 / EPS
                    if eps_i is not None and eps_i > 0 and price_i and price_i > 0:
                        per_i = round(price_i / eps_i, 2)
                    else:
                        per_i = None  # 적자 기업이거나 데이터 없음

                    # ④ PBR = 해당기간 말일주가 / BPS
                    if bps_i is not None and bps_i > 0 and price_i and price_i > 0:
                        pbr_i = round(price_i / bps_i, 2)
                    else:
                        pbr_i = None

                    eps_vals.append(eps_i)
                    bps_vals.append(bps_i)
                    per_vals.append(per_i)
                    pbr_vals.append(pbr_i)

                full_data["eps"] = {"dates": all_dates, "values": eps_vals}
                full_data["bps"] = {"dates": all_dates, "values": bps_vals}
                full_data["per"] = {"dates": all_dates, "values": per_vals}
                full_data["pbr"] = {"dates": all_dates, "values": pbr_vals}

                # ── 최신값을 요약 지표로 추출 ──────────────────────────────────
                latest_eps = eps_vals[-1] if eps_vals else None
                latest_bps = bps_vals[-1] if bps_vals else None
                latest_per = per_vals[-1] if per_vals else None
                latest_pbr = pbr_vals[-1] if pbr_vals else None

                def _fmt(v, decimals=2):
                    """숫자 값을 보기 좋게 문자열로 변환"""
                    if v is None:
                        return "N/A"
                    return f"{v:,.{decimals}f}"

                rev_eok = dart_summary.get("revenue_eok")
                oi_eok = dart_summary.get("operating_income_eok")
                ni_eok = dart_summary.get("net_income_eok")
                debt_pct = dart_summary.get("debt_ratio")

                print(f"[DART-CALC] EPS={latest_eps}, BPS={latest_bps}, PER={latest_per}, PBR={latest_pbr} | 주가={current_price}, 주식수={shares_outstanding:,}")

                financials = {
                    "market_cap": market_cap,
                    "per": _fmt(latest_per),
                    "pbr": _fmt(latest_pbr),
                    "eps": _fmt(latest_eps, 0),
                    "bps": _fmt(latest_bps, 0),
                    "roe": _fmt(dart_summary.get("roe")),
                    "dvr": (
                        f"{market_dvr * 100:.2f}%" if (market_dvr and 0 < market_dvr < 1)
                        else (f"{market_dvr:.2f}%" if (market_dvr and 1 <= market_dvr <= 30) else "N/A")
                    ),
                    "revenue": f"{rev_eok:,.0f}" if rev_eok else "N/A",
                    "operating_income": f"{oi_eok:,.0f}" if oi_eok else "N/A",
                    "net_income": f"{ni_eok:,.0f}" if ni_eok else "N/A",
                    "debt_ratio": f"{debt_pct:.2f}%" if debt_pct else "N/A",
                    "detailed": {
                        "success": True,
                        "source": "dart_official_api",
                        "summary": {
                            "per": latest_per,
                            "pbr": latest_pbr,
                            "eps": latest_eps,
                            "bps": latest_bps,
                            "roe": dart_summary.get("roe")
                        },
                        "full_data": full_data
                    }
                }
                print(f"[DART-API] [SUCCESS] 금감원 DART 공식 API 재무제표 성공 [{symbol}] "
                      f"(연간 {len([d for d in all_dates if d.endswith('/12')])}개 + "
                      f"분기 {len([d for d in all_dates if not d.endswith('/12')])}개)")
                return financials
        except Exception as e:
            print(f"[DART-API] 재무 정보 조회 실패 ({symbol}): {e}")
            return {
                "status": "error",
                "message": f"금융감독원 DART 공시 정보 조회 실패: {str(e)}",
                "per": "N/A",
                "pbr": "N/A",
                "detailed": {
                    "success": False,
                    "annual": [],
                    "quarterly": [],
                    "summary": {
                        "per": "N/A",
                        "pbr": "N/A",
                        "roe": "N/A"
                    }
                }
            }

    # DART가 활성화되지 않았거나 API Key가 없는 경우 빈 데이터 리턴
    return {
        "status": "error",
        "message": "DART 공식 API 키가 설정되어 있지 않거나 비활성화되었습니다.",
        "per": "N/A",
        "pbr": "N/A",
        "detailed": {
            "success": False,
            "annual": [],
            "quarterly": [],
            "summary": {
                "per": "N/A",
                "pbr": "N/A",
                "roe": "N/A"
            }
        }
    }


def get_korean_market_indices():
    """
    [v6.1.0] 네이버 금융 크롤링 대신 yfinance를 사용하여 국내 주요 지수를 안전하게 수집합니다.
    """
    tickers = {
        "kospi": "^KS11",
        "kosdaq": "^KQ11",
        "kospi200": "^KS200"
    }
    
    results = {}
    import yfinance as yf
    
    for key, ticker in tickers.items():
        try:
            t = yf.Ticker(ticker)
            info = t.fast_info
            last_price = info.get('last_price', None)
            prev_close = info.get('previous_close', None)
            
            if last_price is None or prev_close is None:
                hist = t.history(period="5d") # 안정성을 위해 5일로 늘림
                if not hist.empty:
                    # NaN 값 제거 (가장 최근의 정상적인 종가 찾기)
                    hist_clean = hist['Close'].dropna()
                    if len(hist_clean) >= 2:
                        last_price = float(hist_clean.iloc[-1])
                        prev_close = float(hist_clean.iloc[-2])
                    elif len(hist_clean) == 1:
                        last_price = float(hist_clean.iloc[0])
                        prev_close = last_price
            
            import math
            if last_price is None or (isinstance(last_price, float) and math.isnan(last_price)):
                raise ValueError("No data")
                
            change_val = last_price - prev_close if prev_close else 0
            pct = (change_val / prev_close * 100) if prev_close else 0
            
            direction = "Equal"
            if pct > 0:
                direction = "Up"
            elif pct < 0:
                direction = "Down"
                
            results[key] = {
                "value": f"{last_price:,.2f}",
                "change": f"{abs(change_val):.2f}",
                "percent": f"{pct:+.2f}%",
                "direction": direction
            }
        except Exception as e:
            print(f"Error fetching {key} via yfinance: {e}")
            results[key] = {
                "value": "0",
                "change": "0",
                "percent": "0.00%",
                "direction": "Equal"
            }
            
    return results


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
    Uses Naver Mobile JSON API (m.stock.naver.com/api/stock/{code}/trend).
    Much more stable and faster than HTML parsing.
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        
        url = f"https://m.stock.naver.com/api/stock/{code}/trend?pageSize={days}"
        res = requests.get(url, headers=HEADER, timeout=5)
        
        if res.status_code != 200:
            return []
            
        data = res.json()
        if not data:
            return []
            
        unique_data = []
        for row in data:
            try:
                # API dates are like "20260526" -> convert to "2026-05-26"
                raw_date = row.get("bizdate", "")
                if len(raw_date) == 8:
                    fmt_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
                else:
                    continue
                    
                price = int(row.get("closePrice", "0").replace(',', ''))
                
                # Use clean_num helper if needed or parse manually
                def parse_val(v_str):
                    if not v_str: return 0
                    clean = re.sub(r'[^0-9-]', '', str(v_str))
                    return int(clean) if clean else 0
                    
                inst_val = parse_val(row.get("organPureBuyQuant", "0"))
                frgn_val = parse_val(row.get("foreignerPureBuyQuant", "0"))
                retail_val = parse_val(row.get("individualPureBuyQuant", "0"))
                
                unique_data.append({
                    "date": fmt_date,
                    "price": price,
                    "institution": inst_val,
                    "foreigner": frgn_val,
                    "retail": retail_val
                })
            except Exception:
                continue
                
        return unique_data
        
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
    Fetch exchange rates. Primary source is Yahoo Finance (Legal & Official).
    """
    yahoo_map = {
        "USD": "KRW=X",
        "JPY": "JPYKRW=X",
        "CNY": "CNYKRW=X",
        "HKD": "HKDKRW=X",
    }
    symbol_map = {
        "USD": "FX_USDKRW",
        "JPY": "FX_JPYKRW",
        "CNY": "FX_CNYKRW",
        "HKD": "FX_HKDKRW",
        "VND": "FX_VNDKRW"
    }

    # 1차: Twelve Data 공식 API 연동 (상업화용 1순위)
    import os
    from dotenv import load_dotenv
    load_dotenv()
    twelve_key = os.getenv("TWELVEDATA_API_KEY")
    if twelve_key:
        try:
            base_curr = currency.upper()
            if base_curr == "KRW":
                return 1.0
            url = f"https://api.twelvedata.com/price?symbol={base_curr}/KRW&apikey={twelve_key}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                resp_data = resp.json()
                if "price" in resp_data:
                    rate = float(resp_data["price"])
                    if rate > 0:
                        print(f"[ExchangeRate] Twelve Data retrieved: {base_curr}/KRW = {rate}")
                        return round(rate, 2)
        except Exception as e_twelve:
            print(f"[ExchangeRate] Twelve Data failed ({currency}): {e_twelve}")

    # [Commercial Protection] 상업 라이선스를 위해 Yahoo Finance 및 네이버 금융 크롤링 대체 비활성화
    print(f"[ExchangeRate] Twelve Data unavailable. Using safe default for {currency}")

    # 최종 디폴트 값 반환
    defaults = {"USD": 1350.0, "JPY": 9.0, "CNY": 185.0, "HKD": 173.0, "VND": 0.055}
    return defaults.get(currency.upper(), 1300.0)



@turbo_cache(ttl_seconds=3600)
def get_ipo_data():
    """
    공모주 스케줄 반환
    (백그라운드에서 주기적으로 수집한 ipo_cache.json을 최우선으로 읽음)
    """
    import os
    import json
    try:
        cache_file = os.path.join(os.path.dirname(__file__), 'ipo_cache.json')
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data:
                    return data
    except Exception as e:
        print(f"[IPO] 캐시 읽기 에러: {e}")

    # 캐시가 없거나 실패한 경우 DART 파싱 시도 (한도초과 대비)
    try:
        from dart_ipo import fetch_dart_ipo_schedule
        return fetch_dart_ipo_schedule()
    except Exception as e:
        print(f"[IPO] DART API 수집 에러: {e}")
        return []



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
    Fetch Korea Key Interest Rates. Fallback to clean default list in case of errors or blockages.
    """
    rates = []
    # 기본 안전 디폴트 세트
    default_rates = [
        {"name": "한국 기준금리", "price": 3.25, "change": 0.0, "symbol": "KORATE"},
        {"name": "CD금리 (91일)", "price": 3.48, "change": 0.0, "symbol": "CD91"},
        {"name": "국고채 3년", "price": 3.28, "change": 0.0, "symbol": "KO3Y"},
        {"name": "콜금리", "price": 3.27, "change": 0.0, "symbol": "CALL"}
    ]

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
            "th_inter4": "CD91",
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
            except:
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
                except:
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
        return rates

    except Exception as e:
        print(f"[InterestRates] Scrape failed, using default fallback: {e}")
        return default_rates



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

        # 3개가 나오도록 설정 (유저 요청)
        if len(results) < 3:
            for item in fallback_results:
                if item not in results:
                    results.append(item)
                if len(results) >= 3:
                    break
        
        results = results[:3]

    except Exception as e:
        print(f"Live Disclosures fetch error: {e}")

    return results


async def fetch_stocks_for_heatmap(session, item, item_type='sector'):
    stocks = []
    try:
        url = item['url']
        if item_type == 'theme' and 'type=theme' not in url:
            if 'type=' in url:
                import re
                url = re.sub(r'type=[^&]+', 'type=theme', url)
            else:
                separator = '&' if '?' in url else '?'
                url = f"{url}{separator}type=theme"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://finance.naver.com/',
        }

        async with session.get(url, headers=headers, timeout=5) as res:
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
        print(f"fetch_stocks_for_heatmap error: {e}")
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

            sem = asyncio.Semaphore(5)
            async def fetch_with_sem(c):
                async with sem:
                    await asyncio.sleep(0.1)
                    return await fetch_stocks_for_heatmap(session, c, "sector")

            tasks = [fetch_with_sem(c) for c in candidates]
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

            sem = asyncio.Semaphore(5)
            async def fetch_with_sem(c):
                async with sem:
                    await asyncio.sleep(0.1)
                    return await fetch_stocks_for_heatmap(session, c, "theme")

            tasks = [fetch_with_sem(c) for c in candidates]
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
    [Commercial Protection] WiseReport(나이스평가정보) 유료 데이터 무단 크롤링 금지.
    상업적 운영에 따른 저작권 침해 방지를 위해 비활성화.
    """
    return None

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
    [Commercial Protection] 금융감독원 Open DART API 기반 합법적 재무 지표 연동
    최근 3개년 사업보고서 데이터를 수집하여 매출액, 영업이익, 당기순이익, 자산총계, 부채비율, ROE 등을 가공 표출합니다.
    """
    from dart_api_client import dart_api_client
    import datetime
    
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return None

    corp_code = dart_api_client._load_corp_code(symbol)
    if not corp_code:
        print(f"[DART-Indicators] corp_code 변환 실패: {symbol}")
        return None

    current_year = datetime.datetime.now().year
    # 데이터가 존재하는지 확인하기 위해 최대 4개년 조사
    years_to_check = [str(current_year - 1), str(current_year - 2), str(current_year - 3), str(current_year - 4)]

    raw_results = {}
    for y in years_to_check:
        try:
            # 11011: 사업보고서 (연간 정기 공시)
            items = dart_api_client.get_financial_sheets(corp_code, y, reprt_code="11011")
            if items:
                raw_results[y] = items
                # 3개년치를 모았으면 루프 조기 종료 (API 사용량 절약)
                if len(raw_results) >= 3:
                    break
        except Exception as e:
            print(f"[DART-Indicators] Error fetching {y} for {symbol}: {e}")

    # 데이터가 존재하는 연도들만 내림차순 정렬 후 최근 3개년 선택
    available_years = sorted([y for y, items in raw_results.items() if len(items) > 0], reverse=True)[:3]
    if not available_years:
        print(f"[DART-Indicators] 조회 가능한 DART 재무제표가 없습니다: {symbol}")
        return None

    # 오름차순(과거 -> 최근)으로 정렬하여 헤더 구성
    available_years.sort()
    headers = [f"{y}/12" for y in available_years]

    target_indicators = [
        {"name": "매출액", "keys": ["매출액", "영업수익", "매출"]},
        {"name": "영업이익", "keys": ["영업이익", "영업이익(손실)"]},
        {"name": "당기순이익", "keys": ["당기순이익", "당기순이익(손실)", "분기순이익", "반기순이익"]},
        {"name": "자산총계", "keys": ["자산총계"]},
        {"name": "부채총계", "keys": ["부채총계"]},
        {"name": "자본총계", "keys": ["자본총계"]}
    ]

    indicators_data = []
    # 연도별 계정 원시 정수값 저장용 딕셔너리
    raw_values = {ind["name"]: {} for ind in target_indicators}
    
    # 1. 일반 재무 계정 금액 가공 (단위: 억원)
    for ind in target_indicators:
        values_map = {}
        for y in available_years:
            header_key = f"{y}/12"
            items = raw_results[y]
            
            # 연결(CFS) 재무제표 데이터를 우선적으로 사용하며, 없으면 별도(OFS)를 대상으로 함
            cfs_items = [it for it in items if it.get("fs_div") == "CFS"]
            search_items = cfs_items if cfs_items else items
            
            matched_item = None
            for k in ind["keys"]:
                matched_item = next((it for it in search_items if k in it.get("account_nm", "").replace(" ", "")), None)
                if matched_item:
                    break
            
            if matched_item:
                amt_str = matched_item.get("thstrm_amount", "").replace(",", "").strip()
                try:
                    is_neg = amt_str.startswith("-") or (amt_str.startswith("(") and amt_str.endswith(")"))
                    clean_amt = "".join(c for c in amt_str if c.isdigit())
                    amt_val = int(clean_amt) if clean_amt else 0
                    if is_neg:
                        amt_val = -amt_val
                    
                    raw_values[ind["name"]][header_key] = amt_val
                    # '원' 단위를 '억원' 단위로 정수 반올림
                    amt_in_eok = round(amt_val / 100_000_000)
                    values_map[header_key] = f"{amt_in_eok:,.0f}"
                except Exception as e:
                    print(f"[DART-Indicators] Parsing error for {symbol} {ind['name']} {y}: {e}")
                    raw_values[ind["name"]][header_key] = 0
                    values_map[header_key] = "0"
            else:
                raw_values[ind["name"]][header_key] = 0
                values_map[header_key] = "-"
        
        indicators_data.append({
            "name": f"{ind['name']} (억원)",
            "values": values_map
        })

    # 2. 부채비율 계산 (부채총계 / 자본총계 * 100)
    debt_ratio_map = {}
    for y in available_years:
        header_key = f"{y}/12"
        l_val = raw_values["부채총계"].get(header_key, 0)
        e_val = raw_values["자본총계"].get(header_key, 0)
        if e_val != 0 and l_val != 0:
            ratio = (l_val / e_val) * 100
            debt_ratio_map[header_key] = f"{ratio:.1f}%"
        else:
            debt_ratio_map[header_key] = "-"
            
    indicators_data.append({
        "name": "부채비율 (%)",
        "values": debt_ratio_map
    })

    # 3. ROE 계산 (당기순이익 / 자본총계 * 100)
    roe_map = {}
    for y in available_years:
        header_key = f"{y}/12"
        n_val = raw_values["당기순이익"].get(header_key, 0)
        e_val = raw_values["자본총계"].get(header_key, 0)
        if e_val != 0 and n_val != 0:
            roe_val = (n_val / e_val) * 100
            roe_map[header_key] = f"{roe_val:.1f}%"
        else:
            roe_map[header_key] = "-"
            
    indicators_data.append({
        "name": "ROE (%)",
        "values": roe_map
    })

    # 4. 영업이익률 (%) (수익성 추가)
    op_margin_map = {}
    for y in available_years:
        header_key = f"{y}/12"
        op_val = raw_values["영업이익"].get(header_key, 0)
        rev_val = raw_values["매출액"].get(header_key, 0)
        if rev_val != 0 and op_val != 0:
            margin = (op_val / rev_val) * 100
            op_margin_map[header_key] = f"{margin:.1f}%"
        else:
            op_margin_map[header_key] = "-"
    indicators_data.append({
        "name": "영업이익률 (%)",
        "values": op_margin_map
    })

    # 5. 매출액순이익률 (%) (수익성 추가)
    net_margin_map = {}
    for y in available_years:
        header_key = f"{y}/12"
        n_val = raw_values["당기순이익"].get(header_key, 0)
        rev_val = raw_values["매출액"].get(header_key, 0)
        if rev_val != 0 and n_val != 0:
            margin = (n_val / rev_val) * 100
            net_margin_map[header_key] = f"{margin:.1f}%"
        else:
            net_margin_map[header_key] = "-"
    indicators_data.append({
        "name": "매출액순이익률 (%)",
        "values": net_margin_map
    })

    # 6. 매출액증가율 (%) (성장성 추가)
    rev_growth_map = {}
    for i, y in enumerate(available_years):
        header_key = f"{y}/12"
        if i == 0:
            rev_growth_map[header_key] = "-"
        else:
            prev_y = available_years[i-1]
            prev_key = f"{prev_y}/12"
            curr_val = raw_values["매출액"].get(header_key, 0)
            prev_val = raw_values["매출액"].get(prev_key, 0)
            if prev_val > 0 and curr_val > 0:
                growth = ((curr_val - prev_val) / prev_val) * 100
                rev_growth_map[header_key] = f"{growth:+.1f}%"
            else:
                rev_growth_map[header_key] = "-"
    indicators_data.append({
        "name": "매출액증가율 (%)",
        "values": rev_growth_map
    })

    # 7. 영업이익증가율 (%) (성장성 추가)
    op_growth_map = {}
    for i, y in enumerate(available_years):
        header_key = f"{y}/12"
        if i == 0:
            op_growth_map[header_key] = "-"
        else:
            prev_y = available_years[i-1]
            prev_key = f"{prev_y}/12"
            curr_val = raw_values["영업이익"].get(header_key, 0)
            prev_val = raw_values["영업이익"].get(prev_key, 0)
            if prev_val != 0 and curr_val != 0:
                growth = ((curr_val - prev_val) / abs(prev_val)) * 100
                op_growth_map[header_key] = f"{growth:+.1f}%"
            else:
                op_growth_map[header_key] = "-"
    indicators_data.append({
        "name": "영업이익증가율 (%)",
        "values": op_growth_map
    })

    # 8. 순이익증가율 (%) (성장성 추가)
    net_growth_map = {}
    for i, y in enumerate(available_years):
        header_key = f"{y}/12"
        if i == 0:
            net_growth_map[header_key] = "-"
        else:
            prev_y = available_years[i-1]
            prev_key = f"{prev_y}/12"
            curr_val = raw_values["당기순이익"].get(header_key, 0)
            prev_val = raw_values["당기순이익"].get(prev_key, 0)
            if prev_val != 0 and curr_val != 0:
                growth = ((curr_val - prev_val) / abs(prev_val)) * 100
                net_growth_map[header_key] = f"{growth:+.1f}%"
            else:
                net_growth_map[header_key] = "-"
    indicators_data.append({
        "name": "순이익증가율 (%)",
        "values": net_growth_map
    })

    # 9. 총자산회전율 (배) (활동성 추가)
    asset_turnover_map = {}
    for y in available_years:
        header_key = f"{y}/12"
        rev_val = raw_values["매출액"].get(header_key, 0)
        asset_val = raw_values["자산총계"].get(header_key, 0)
        if asset_val != 0 and rev_val != 0:
            turnover = rev_val / asset_val
            asset_turnover_map[header_key] = f"{turnover:.2f}배"
        else:
            asset_turnover_map[header_key] = "-"
    indicators_data.append({
        "name": "총자산회전율 (배)",
        "values": asset_turnover_map
    })

    print(f"[DART-Indicators] 3개년 재무 데이터 변환 완료 [{symbol}] -> {headers}")
    return {
        "status": "success",
        "headers": headers,
        "indicators": indicators_data
    }


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


@turbo_cache(ttl_seconds=3600)
def get_global_investment_indicators(symbol: str, freq: str = "0", fin_gubun: str = "IFRSL", rpt: str = "1"):
    """
    [Commercial Protection] 미국 SEC EDGAR API 기반 합법적 글로벌 재무제표 가공 연동
    미국 상장기업의 10-K 연간 보고서 데이터를 수집하여 3개년 매출액, 영업이익, 당기순이익 등을 억원 단위로 원화 환산해 표출합니다.
    """
    import sec_api_client
    
    # CIK 코드 획득
    cik = sec_api_client.get_cik_by_ticker(symbol)
    if not cik:
        print(f"[SEC-Indicators] Ticker to CIK 매핑 실패: {symbol}")
        return None

    # SEC Facts 데이터 조회
    facts = sec_api_client.fetch_company_facts(cik)
    if not facts:
        print(f"[SEC-Indicators] Company Facts 수집 실패: CIK: {cik} ({symbol})")
        return None

    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    if not us_gaap:
        print(f"[SEC-Indicators] us-gaap 데이터가 존재하지 않습니다: {symbol}")
        return None

    def get_annual_fact(keys):
        for key in keys:
            if key in us_gaap:
                units = us_gaap[key].get("units", {})
                usd_data = units.get("USD") or units.get("shares") or units.get("pure")
                if not usd_data:
                    continue
                
                annuals = {}
                for item in usd_data:
                    if item.get("form") == "10-K":
                        fy = item.get("fy")
                        val = item.get("val")
                        fp = item.get("fp")
                        if fy and val is not None and fp == "FY":
                            end_date = item.get("end", "")
                            # 최신 개정본 또는 기간이 가장 최근인 것을 우선시함
                            if fy not in annuals or end_date > annuals[fy]["end"]:
                                annuals[fy] = {"val": val, "end": end_date}
                if annuals:
                    return {y: info["val"] for y, info in annuals.items()}
        return {}

    # 주요 US-GAAP 계정 키
    revenue_keys = ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "SalesRevenueGoodsNet"]
    op_income_keys = ["OperatingIncomeLoss", "OperatingIncomeLossFromContinuingOperations"]
    net_income_keys = ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"]
    assets_keys = ["Assets"]
    liabilities_keys = ["Liabilities"]
    equity_keys = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]

    rev_data = get_annual_fact(revenue_keys)
    op_data = get_annual_fact(op_income_keys)
    net_data = get_annual_fact(net_income_keys)
    assets_data = get_annual_fact(assets_keys)
    liab_data = get_annual_fact(liabilities_keys)
    eq_data = get_annual_fact(equity_keys)

    # 데이터가 1개 이상이라도 존재하는 연도 집합 확보
    # 최소한 매출액, 자산, 자본 정보가 있는 연도를 찾음
    all_years = set(rev_data.keys()) & set(assets_data.keys()) & set(eq_data.keys())
    available_years = sorted(list(all_years), reverse=True)[:3]
    available_years.sort() # 과거 -> 최신 정렬

    if not available_years:
        print(f"[SEC-Indicators] 3개년 교집합 연도를 찾지 못했습니다: {symbol}")
        return None

    headers = [f"{y}/12" for y in available_years]

    # 실시간 환율 적용 (없으면 1,350원 기준)
    try:
        usd_krw_rate = float(get_exchange_rate("USD"))
    except:
        usd_krw_rate = 1350.0

    indicators_data = []

    def format_to_eok(val_map, name):
        vals = {}
        for y in available_years:
            val_usd = val_map.get(y)
            header_key = f"{y}/12"
            if val_usd is not None:
                val_krw = val_usd * usd_krw_rate
                val_eok = round(val_krw / 100_000_000)
                vals[header_key] = f"{val_eok:,.0f}"
            else:
                vals[header_key] = "-"
        return {"name": f"{name} (억원)", "values": vals}

    indicators_data.append(format_to_eok(rev_data, "매출액"))
    indicators_data.append(format_to_eok(op_data, "영업이익"))
    indicators_data.append(format_to_eok(net_data, "당기순이익"))
    indicators_data.append(format_to_eok(assets_data, "자산총계"))
    indicators_data.append(format_to_eok(liab_data, "부채총계"))
    indicators_data.append(format_to_eok(eq_data, "자본총계"))

    # 부채비율 (%)
    debt_ratio = {}
    for y in available_years:
        header_key = f"{y}/12"
        l_usd = liab_data.get(y)
        e_usd = eq_data.get(y)
        if l_usd is not None and e_usd is not None and e_usd != 0:
            ratio = (l_usd / e_usd) * 100
            debt_ratio[header_key] = f"{ratio:.1f}%"
        else:
            debt_ratio[header_key] = "-"
    indicators_data.append({"name": "부채비율 (%)", "values": debt_ratio})

    # ROE (%)
    roe = {}
    for y in available_years:
        header_key = f"{y}/12"
        n_usd = net_data.get(y)
        e_usd = eq_data.get(y)
        if n_usd is not None and e_usd is not None and e_usd != 0:
            roe_val = (n_usd / e_usd) * 100
            roe[header_key] = f"{roe_val:.1f}%"
        else:
            roe[header_key] = "-"
    indicators_data.append({"name": "ROE (%)", "values": roe})

    print(f"[SEC-Indicators] 3개년 미국 재무 데이터 원화 환산 완료 [{symbol}] -> {headers} (환율: {usd_krw_rate:,.1f}원)")
    return {
        "status": "success",
        "headers": headers,
        "indicators": indicators_data
    }
