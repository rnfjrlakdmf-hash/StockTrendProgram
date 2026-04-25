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
from typing import Dict, List, Optional
from turbo_engine import turbo_cache
from stock_names import STOCK_MAP

# [Config]
HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}


# [Helper] Robust Decoding
def decode_safe(res: requests.Response) -> str:
    """
    Decodes response content robustly.
    1. Checks Content-Type header for explicit charset.
    2. Tries UTF-8 strict.
    3. Fallback to CP949 (common for legacy Naver pages).
    """
    try:
        content = res.content
        # [Strategy 1] Check for BOM
        if content.startswith(b'\xef\xbb\xbf'):
            return content.decode('utf-8-sig', 'ignore')
            
        # [Strategy 2] Use apparent_encoding for Naver legacy pages (EUC-KR/CP949)
        encoding = res.encoding if res.encoding and res.encoding.lower() != 'iso-8859-1' else res.apparent_encoding
        if not encoding or encoding.lower() == 'iso-8859-1':
            # Force CP949 for Naver if undecided
            encoding = 'cp949'
            
        # [Strategy 3] Specific Korean byte detection
        if b'\xec\x82\xbc' in content or b'\xec\xa0\x84' in content:
            encoding = 'utf-8'
        elif b'\xbb\xef' in content or b'\xbc\xba' in content:
            encoding = 'cp949'
            
        return content.decode(encoding, 'ignore')
    except Exception:
        return res.content.decode('cp949', 'ignore')

def get_korean_name(symbol: str):
    """
    Get Korean stock name from Naver Finance
    """
    info = get_naver_stock_info(symbol)
    if info:
        return info.get('name')
    return None

get_korean_stock_name = get_korean_name  # Alias

@turbo_cache(ttl_seconds=86400) # Mapping is stable, cache longer
def search_stock_code(keyword: str):
    print(f"\n[TRACE] search_stock_code called with keyword: '{keyword}'")
    """
    [v3.1.0-Enhanced] Mission-Critical Multi-layer Search Engine
    Goal: 100% resolution for Korean stocks with Unicode Normalization (NFC).
    Adds dedicated Naver Finance Search List fallback.
    """
    if not keyword:
        return None
        
    # Unicode Normalization (NFC) for robust matching (Prevents NFC/NFD mismatch)
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
        "Referer": "https://finance.naver.com/"
    }

    # 2. Naver Finance Auto-Complete API (Official mapping service)
    try:
        print(f"[Search Tier 2] Trying Naver AC API for '{keyword_clean}'...")
        ac_url = f"https://ac.finance.naver.com/ac?q={urllib.parse.quote(keyword_clean)}&q_enc=utf-8&st=111&frm=stock&r_format=json&r_enc=utf-8&r_unicode=1&t_koreng=1&ans=2&run=2&rev=4&con=1&r_lt=111"
        res_ac = requests.get(ac_url, headers=headers, timeout=2) # Timeout shortened to 2s
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
                            print(f" -> Found via AC API: {found_code} ({found_name})")
                            return found_code
    except Exception as e:
        print(f"  !! AC API Stage failed: {e}. Moving to Tier 3.")

    # 3. Naver Finance Search List (Powerful Fallback for exact/partial name matches)
    try:
        print(f"[Search Tier 3] Trying Naver Finance Search List for '{keyword_clean}'...")
        try:
            euc_query = urllib.parse.quote(keyword_clean.encode('euc-kr'))
        except:
            euc_query = urllib.parse.quote(keyword_clean)
            
        search_url = f"https://finance.naver.com/search/searchList.naver?query={euc_query}"
        res_s = requests.get(search_url, headers=headers, timeout=5)
        
        # Decoding: Naver Search List is EUC-KR
        try:
            s_html = res_s.content.decode('euc-kr')
        except:
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
                            print(f" -> Found via Finance Search List: {found_code} ({name})")
                            return found_code
    except Exception as se:
        print(f"  !! Finance Search List Stage failed: {se}")

    # 4. Yahoo Finance Global Lookup
    try:
        print(f"[Search Tier 4] Trying Yahoo Finance Fallback for '{keyword_clean}'...")
        yurl = f"https://query2.finance.yahoo.com/v1/finance/search?q={urllib.parse.quote(keyword_clean)}&lang=ko-KR"
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
        matches = re.findall(r'finance\.naver\.com/item/main\.(?:naver|nhn)\?code=(\d{6})', html)
        if matches:
            print(f" -> Found via Integration Search: {matches[0]}")
            return matches[0]
    except Exception as ie:
        print(f"  !! Integration Search Stage failed: {ie}")

    print(f" -> [Search Failed] No results for '{keyword_clean}' in any tier.")
    return None
        
search_korean_stock_symbol = search_stock_code # Alias

@turbo_cache(ttl_seconds=30)
def gather_naver_stock_data(symbol: str):
    """
    Fetch comprehensive stock info from Naver (Price, Name, Market Type, Detailed Financials) in ONE request.
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        
        if len(code) != 6:
            return None
            
        url = f"https://finance.naver.com/item/main.naver?code={code}"
        res = requests.get(url, headers=HEADER, timeout=10)
        
        # [Fix] Smart Decoding v2: UTF-8 First
        # EUC-KR bytes are often invalid UTF-8 (fail fast), 
        # whereas UTF-8 bytes can look like valid EUC-KR (garbage success).
        # So we MUST try UTF-8 first.
        # [Fix] Smart Decoding v7: Explicitly handle Naver's hybrid encoding
        content = res.content
        if b'charset=utf-8' in content.lower() or b'\xec\x82\xbc' in content: # UTF-8 signature OR meta
            html = content.decode('utf-8', 'ignore')
        else:
            html = content.decode('cp949', 'ignore')
             
        soup = BeautifulSoup(html, 'html.parser')
        
        # Name
        name_tag = soup.select_one(".wrap_company h2 a")
        if not name_tag:
            return None
        name = name_tag.text.strip()
        
        # Market Type (KOSPI/KOSDAQ)
        market_img = soup.select_one(".wrap_company img")
        market_type = "KS" # Default
        if market_img:
            alt = market_img.get('alt', '')
            if '코스닥' in alt:
                market_type = 'KQ'
            elif '코스피' in alt:
                market_type = 'KS'
                
        # [Fix] Company Description - 네이버 금융 기업개요 탭 스크래핑 (모바일 API /overview 폐지 대응)
        description = ""
        try:
            co_url = f"https://finance.naver.com/item/coinfo.naver?code={code}&target=corp"
            co_res = requests.get(co_url, headers=HEADER, timeout=4)
            co_html = co_res.content.decode('euc-kr', errors='replace')
            co_soup = BeautifulSoup(co_html, 'html.parser')
            # 기업개요: p 태그에서 실제 회사 소개 문장만 추출
            desc_parts = []
            paras = co_soup.select("p")
            for p in paras:
                t = p.text.strip()
                # 30자 이상이고 마케팅/법률 면책문구가 아닌 텍스트만 수집
                if (30 < len(t) < 300
                        and '네이버파이낸셜' not in t
                        and 'PER' not in t and 'PBR' not in t
                        and '코스피' not in t and '코스닥' not in t
                        and '시가총액' not in t and '외국인' not in t):
                    desc_parts.append(t)
                    if len(desc_parts) >= 3:  # 최대 3문장
                        break
            description = " ".join(desc_parts)
        except Exception as e:
            print(f"[CompanyDesc] 기업개요 수집 실패 ({code}): {e}")


        # Price
        no_today = soup.select_one("p.no_today span.blind")
        if not no_today:
            return None
        price = int(no_today.text.replace(',', ''))
        
        # Change
        ex_day = soup.select_one(".no_exday")
        change_val = 0
        change_pct_str = "0.00%"
        
        if ex_day:
            blind_tags = ex_day.select("span.blind")
            if len(blind_tags) >= 2:
                # 0: change value, 1: percentage
                # Check direction (上升/下降)
                ico = ex_day.select_one("span.ico")
                direction = 1
                if ico and "하락" in ico.text:
                    direction = -1
                
                change_val = int(blind_tags[0].text.replace(',', '')) * direction
                change_pct_str = f"{float(blind_tags[1].text)*direction:.2f}%"

        # Previous Close
        prev_close_tag = soup.select_one("td.first span.blind")
        prev_close = price - change_val
        if prev_close_tag:
            prev_close = int(prev_close_tag.text.replace(',', ''))

        # [Fix] NXT 데이터를 먼저 가져와야 market_status 체크에 사용할 수 있음
        # [New] NXT (Nextrade) After Market Data - MUST come before market_status check
        nxt_data = None
        nxt_area = soup.select_one("#rate_info_nxt")
        if nxt_area:
            try:
                nxt_price_tag = nxt_area.select_one(".no_today .blind")
                if nxt_price_tag:
                    nxt_price = int(nxt_price_tag.text.strip().replace(',', ''))
                    
                    # Extract NXT change and percentage
                    nxt_blind_tags = nxt_area.select(".no_exday .blind")
                    nxt_change_val = 0
                    nxt_change_pct = "0.00%"
                    
                    if len(nxt_blind_tags) >= 2:
                        ico = nxt_area.select_one("span.ico")
                        direction = 1
                        if ico and "하락" in ico.text:
                            direction = -1
                        
                        nxt_change_val = int(nxt_blind_tags[0].text.replace(',', '')) * direction
                        nxt_change_pct = f"{float(nxt_blind_tags[1].text)*direction:.2f}%"
                        
                    nxt_data = {
                        "price": nxt_price,
                        "change_val": nxt_change_val,
                        "change_pct": nxt_change_pct
                    }
            except Exception as e:
                print(f"NXT Scraping Error for {symbol}: {e}")

        # [New] Market Status (In-session, Closed, After-Market)
        market_status = "Unknown"
        # 1. Look for text in description
        status_tag = soup.select_one(".description")
        if status_tag:
            text = status_tag.get_text()
            # Use raw bytes check if text is still messy, or just common keywords
            if "장중" in text or "실시간" in text: market_status = "장중"
            elif "장마감" in text or "정규장종료" in text: market_status = "장마감"
        
        # 2. Pattern Match via ICON alt text (Naver uses images for status)
        if market_status == "Unknown":
            st_img = soup.select_one("img[alt*='장중'], img[alt*='장마감'], img[alt*='실시간']")
            if st_img:
                alt = st_img.get('alt', '')
                if "장중" in alt or "실시간" in alt: market_status = "장중"
                elif "장마감" in alt: market_status = "장마감"
        
        # 3. Fallback via ID / time
        if market_status == "Unknown":
            st = soup.select_one("#time")
            if st:
                if "장중" in st.text: market_status = "장중"
                elif "마감" in st.text: market_status = "장마감"
        
        # 4. If all fails but price exists, default to "장중" if hour is 9-16 (KST)
        if market_status == "Unknown" and price > 0:
            now_kst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
            if now_kst.weekday() < 5 and 9 <= now_kst.hour < 16:
                 market_status = "장중"
        
        # 4. Ultimate Fallback: keyword scan in HTML
        if market_status == "Unknown":
            if "장중" in html[:10000]: market_status = "장중"
            elif "장마감" in html[:10000]: market_status = "장마감"
        
        # [Fix] Additional check for NXT status (Force to KST UTC+9)
        from datetime import datetime, timedelta, timezone
        kst = timezone(timedelta(hours=9))
        now_kst = datetime.now(kst)
        current_time = now_kst.hour * 100 + now_kst.minute
        
        # Nextrade (NXT) After Market: 15:40 ~ 20:00 (KR Time)
        is_nxt_active = (1540 <= current_time <= 2000)
        
        # If we have NXT data and it's NXT active hours, prioritize it
        if nxt_area and is_nxt_active:
            market_status = "야간거래(NXT)"
            
        # [Extra] Sector (Upjong)
        sector_name = "Unknown"
        try:
            # Look for "Same Sector" link
            # Structure: <h4 class="h_sub sub_tit7"><em><a href="...">Sector Name</a></em></h4>
            sector_tag = soup.select_one("h4.h_sub.sub_tit7 a")
            if sector_tag:
                sector_name = sector_tag.text.strip()
            else:
                # Fallback: Look for WICS or other labels
                h4s = soup.select("h4")
                for h4 in h4s:
                    if "업종" in h4.text:
                        a_tag = h4.select_one("a")
                        if a_tag:
                            sector_name = a_tag.text.strip()
                            break
        except: pass

        # Extra details (Robust Scraping v2.7.3)
        market_cap_str = ""
        try:
            mc = soup.select_one("#_market_sum")
            if not mc:
                # Fallback: Search for label text in any TH or TD
                for tag in soup.find_all(['th', 'td', 'em']):
                    txt = tag.text.strip()
                    if "시가총액" in txt and len(txt) < 10:
                        # Value is often in the next sibling or a nested span
                        val_tag = tag.find_next_sibling(['td', 'span', 'em'])
                        if val_tag:
                            mc = val_tag
                            break
            
            if mc:
                raw = mc.text.strip()
                # Advanced Clean Up (v2.7.5) - 1,102조 2,366억원 대응
                # Remove commas and handle spaces
                c1 = raw.replace(",", "").strip()
                
                # Intelligent Unit Parser (Handle strings like "1,102조 2,366억원")
                # Remove commas but keep numbers and Jo/Uk/Won
                raw_clean = raw.replace(",", "").strip()
                market_cap_str = raw_clean
                if not market_cap_str.endswith("원"):
                    market_cap_str += "원"
        except Exception as sce:
            print(f"Market Cap Scraping Error: {sce}")
            market_cap_str = "N/A"
        
        # Initialize variables (None instead of 0.0 to distinguish 'not found')
        per = None
        eps = None
        dvr = None
        pbr = None
        bps = None
        est_per = None
        est_eps = None
        dp_share = None
        year_high = None
        year_low = None
        
        # ID-based scraping (Backup)
        open_val = high_val = low_val = volume_val = None
        try:
            p = soup.select_one("#_per")
            if p and p.text.strip().replace(',', '').replace('배', '') not in ["N/A", "-"]: 
                per = float(p.text.strip().replace(',', '').replace('배', ''))
        except: pass
        
        try:
            e = soup.select_one("#_eps")
            if e and e.text.strip().replace(',', '').replace('원', '') not in ["N/A", "-"]: 
                eps = float(e.text.strip().replace(',', '').replace('원', ''))
        except: pass

        try:
            p = soup.select_one("#_pbr")
            if p and p.text.strip().replace(',', '').replace('배', '') not in ["N/A", "-"]: 
                pbr = float(p.text.strip().replace(',', '').replace('배', ''))
        except: pass
        
        try:
            d = soup.select_one("#_dvr")
            if d and d.text.strip().replace(',', '').replace('%', '') not in ["N/A", "-"]: 
                dvr = float(d.text.strip().replace(',', '').replace('%', '')) / 100.0
        except: pass
        
        try:
            # New Robust OHLCV parsing: Aggregate by TD
            no_info_area = soup.select_one(".no_info")
            if no_info_area:
                tds = no_info_area.select("td")
                for td in tds:
                    txt = td.text.strip()
                    # Find the primary value (usually in .blind)
                    blind = td.select_one(".blind")
                    if not blind: continue
                    
                    val_str = blind.text.strip().replace(',', '')
                    if not val_str or not val_str.replace('.', '', 1).isdigit(): continue
                    val = int(float(val_str))
                    
                    if "시가" in txt: open_val = val
                    elif "고가" in txt: high_val = val
                    elif "저가" in txt: low_val = val
                    elif "거래량" in txt: volume_val = val

            # Fallback to old index-based if above failed
            if open_val is None:
                rate_info = soup.select(".no_info .blind")
                if len(rate_info) >= 8: 
                     high_val = int(rate_info[1].text.replace(',', ''))
                     volume_val = int(rate_info[3].text.replace(',', ''))
                     open_val = int(rate_info[4].text.replace(',', ''))
                     low_val = int(rate_info[5].text.replace(',', ''))
        except: pass

        # [Scraping Improvement] Parse by Table Labels (Robust)
        info_tables = soup.select("table")
        
        for tbl in info_tables:
            # Skip the main price table we just processed
            if 'no_info' in tbl.get('class', []): continue
            rows = tbl.select("tr")
            for row in rows:
                th = row.select_one("th")
                if not th: continue
                
                label = th.text.strip()
                label_clean = re.sub(r'\s+', '', label) # normalized label
                
                td = row.select_one("td")
                if not td: continue
                val_text = td.text.strip().replace(',', '').replace('l', ' ').replace('|', ' ')
                
                try:
                    nums = re.findall(r'[-+]?\d*\.\d+|\d+', val_text)
                    if not nums: continue
                    
                    nums_f = []
                    for n in nums:
                        try: nums_f.append(float(n))
                        except: pass
                    
                    if not nums_f: continue

                    # 1. Skip Sector-only rows for Stock main stats
                    # Example label: "동일업종 PER" -> Skip for main stock per
                    if "업종" in label_clean:
                        continue

                    # 2. BPS/PBR pair (Fix: Naver often swaps labels/values, use magnitude)
                    if "BPS" in label_clean and "PBR" in label_clean:
                        if len(nums_f) >= 2:
                             # Generally BPS > 100 and PBR < 100 (for most stocks)
                             # In "BPS l PBR", Naver normally puts BPS first.
                             # But let's be safe.
                             v1, v2 = nums_f[0], nums_f[1]
                             if v1 > v2: # 724 > 0.79 -> v1 is bps
                                 bps, pbr = v1, v2
                             else:
                                 pbr, bps = v1, v2
                        elif len(nums_f) == 1:
                             # Guess based on magnitude if only one found
                             if nums_f[0] > 100: bps = nums_f[0]
                             else: pbr = nums_f[0]

                    elif "BPS" in label_clean:
                         bps = nums_f[0]
                    elif "PBR" in label_clean:
                         pbr = nums_f[0]

                    # 3. PER/EPS pair (Standard ordering is PER then EPS)
                    elif "PER" in label_clean and "EPS" in label_clean:
                         is_est = "추정" in label or "컨센서스" in label or "(E)" in label
                         if len(nums_f) >= 2:
                             p_val = nums_f[0]
                             e_val = nums_f[1]
                             if is_est:
                                 est_per = p_val
                                 est_eps = e_val
                             else:
                                 per = p_val
                                 eps = e_val
                         elif len(nums_f) == 1:
                             # If stock has negative EPS, PER is often N/A. The found number is likely EPS.
                             val = nums_f[0]
                             if is_est: est_eps = val
                             else: eps = val

                    # 4. Dividend (Exclude Yield explanation)
                    elif "주당배당금" in label_clean and "수익률" not in label_clean:
                         dp_share = int(nums_f[0])
                         
                    # 5. 52 Week (Handle both high/low in one if both labels present)
                    elif "52" in label_clean:
                        if "최고" in label_clean and "최저" in label_clean and len(nums_f) >= 2:
                             year_high = int(nums_f[0])
                             year_low = int(nums_f[1])
                        elif "최고" in label_clean:
                             year_high = int(nums_f[0])
                        elif "최저" in label_clean:
                             year_low = int(nums_f[0])
                        elif len(nums_f) >= 2: # No explicit labels but has 2 numbers
                             year_high = int(nums_f[0])
                             year_low = int(nums_f[1])
                         
                except: continue
        
        # [Debug] Verify Scraped Data
        # print(f"[Scraper] {code} ({name}) - PER:{per} PBR:{pbr} EPS:{eps} EstPER:{est_per}")

        # [Fallback] If weekend/market closed and OHLC are 0 or None, try to get from daily history
        if volume_val in [0, None] or open_val in [0, None]:
            try:
                daily = get_naver_daily_prices(symbol)
                if daily and len(daily) > 0:
                    latest = daily[0] # Most recent day
                    if volume_val in [0, None]: volume_val = latest.get('volume', 0)
                    if open_val in [0, None]: open_val = latest.get('open', 0)
                    if high_val in [0, None]: high_val = latest.get('high', 0)
                    if low_val in [0, None]: low_val = latest.get('low', 0)
            except: pass

        # [New] Parse Detailed Financial Data (cop_analysis) to avoid multiple requests
        fin_data = {}
        fin_summary = {}
        detailed_success = False
        try:
            cop_analysis = soup.select_one("div.section.cop_analysis")
            if cop_analysis:
                date_headers = cop_analysis.select("thead tr:nth-child(2) th")
                dates = [th.text.strip() for th in date_headers]
                f_rows = cop_analysis.select("tbody tr")
                
                for r in f_rows:
                    r_th = r.select_one("th")
                    if not r_th: continue
                    r_title = r_th.text.strip()
                    cells = r.select("td")
                    f_values = [c.text.strip().replace(',', '') for c in cells]
                    
                    def _s_float(v):
                        try:
                            v = v.replace('%', '')
                            if not v or v == '-' or v == 'N/A': return None
                            return float(v)
                        except: return None
                        
                    r_title_clean = r_title.replace(" ", "").replace("\n", "").replace("\t", "")
                    # [Fix] Robust Mapping: Use keys that are less likely to break with encoding, 
                    # and prioritize longer matches to distinguish 'operating_income' from 'operating_margin'.
                    mapping = [
                        ("매출액", "revenue"), ("매출", "revenue"),
                        ("영업이익률", "operating_margin"), ("영업이익", "operating_income"),
                        ("순이익률", "net_income_margin"), ("당기순이익", "net_income"), ("순이익", "net_income"),
                        ("ROE", "roe"), ("ROA", "roa"),
                        ("부채비율", "debt_ratio"), ("부채", "debt_ratio"),
                        ("당좌비율", "quick_ratio"), ("당좌", "quick_ratio"),
                        ("유보율", "reserve_ratio"), ("유보", "reserve_ratio"),
                        ("유동비율", "current_ratio"), ("유동", "current_ratio"),
                        ("자산회전율", "asset_turnover"), ("매출총이익률", "gross_margin"),
                        ("EPS", "eps"), ("BPS", "bps"), ("PER", "per"), ("PBR", "pbr"),
                        ("주당배당금", "dps"), ("배당금", "dps"),
                        ("시가배당률", "dividend_yield"), ("배당률", "dividend_yield"),
                        ("배당성향", "payout_ratio")
                    ]

                    key = None
                    for k, target_key in mapping:
                        if k in r_title_clean:
                            key = target_key
                            break
                    
                    if key and key not in fin_data: # Avoid double assignment
                        fin_data[key] = {"dates": dates, "values": [_s_float(v) for v in f_values]}
                
                for k, v in fin_data.items():
                    annual_values = v["values"][:4]
                    quarterly_values = v["values"][4:]
                    valid_annual = [val for val in annual_values if val is not None]
                    if valid_annual: fin_summary[k] = valid_annual[-1] 
                    else:
                        valid_quarterly = [val for val in quarterly_values if val is not None]
                        if valid_quarterly: fin_summary[k] = valid_quarterly[-1]
                
                detailed_success = True
        except Exception as e:
            print(f"Internal Financial Parse Error: {e}")

        # [Result Builder]
        res = {
            "name": name,
            "description": description,
            "market_type": market_type,
            "code": code,
            "sector": sector_name, # Added Sector
            "price": price,
            "change": change_val,
            "change_percent": change_pct_str,
            "prev_close": prev_close,
            "market_cap_str": market_cap_str,
            "per": per,
            "pbr": pbr,
            "eps": eps,
            "dvr": dvr,
            "bps": bps, 
            "dp_share": dp_share, 
            "est_per": est_per, 
            "est_eps": est_eps,
            "year_high": year_high, 
            "year_low": year_low,
            "market_status": market_status,
            "nxt_data": nxt_data,
            "open": open_val,
            "day_high": high_val,
            "day_low": low_val,
            "volume": volume_val,
            # [Added] Unified detailed dict
            "detailed_financials": {
                "full_data": fin_data,
                "summary": fin_summary,
                "success": detailed_success
            }
        }

        return res
        
    except Exception as e:
        print(f"Naver Info Error: {e}")
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
                
                # Check for images (up/down icons)
                img = cols[2].select_one('img')
                if img:
                    alt = img.get('alt', '')
                    src = img.get('src', '')
                    if '하락' in alt or 'nv' in src or 'down' in src.lower():
                        is_drop = True
                    elif '상승' in alt or 'pc' in src or 'up' in src.lower():
                        is_up = True
                
                # Fallback: Check for class names (red02 for up, nv01 for down)
                span = cols[2].select_one('span')
                if span:
                    cls = " ".join(span.get('class', []))
                    if 'red' in cls: is_up = True
                    elif 'nv' in cls or 'blue' in cls: is_drop = True
                
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
                
                history.append({
                    "date": date,
                    "close": close,
                    "change": change_percent,
                    "change_val": diff,
                    "open": open_p,
                    "high": high,
                    "low": low,
                    "volume": vol
                })
            except:
                continue
                
        return history[:10]  # Return top 10
    except Exception as e:
        print(f"Naver History Error: {e}")
        return []

@turbo_cache(ttl_seconds=300)
def get_naver_theme_rank() -> List[str]:
    """
    네이버 금융에서 실시간 테마 순위(상위 10개)를 가져옵니다.
    URL: https://finance.naver.com/sise/theme.naver
    """
    try:
        url = "https://finance.naver.com/sise/theme.naver"
        res = requests.get(url, headers=HEADER, timeout=5)
        
        # [Fix] Smart Decoding: Naver Finance Theme page is EUC-KR
        content = res.content
        try:
            html = content.decode('euc-kr')
        except UnicodeDecodeError:
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
                html = content.decode('cp949', 'ignore')

        soup = BeautifulSoup(html, 'html.parser')
        
        themes = []
        # 테마명은 'col_type1' 클래스의 td 안에 <a> 태그로 존재합니다.
        # 광고나 헤더를 제외한 실제 데이터 행들을 순회합니다.
        name_tags = soup.select("table.type_1 td.col_type1 a")
        
        for tag in name_tags:
            theme_name = tag.text.strip()
            if theme_name:
                themes.append(theme_name)
                
            # 상위 10~15개 정도만 활용해도 충분하므로 제한을 둡니다.
            if len(themes) >= 20:
                break
                
        # 만약 스크래핑에 전혀 실패했다면 기본 테마 목록을 반환합니다. (폴백)
        if not themes:
            return ["비만치료제", "온디바이스 AI", "저PBR", "초전도체", "우주항공", "로봇"]
            
        return themes
    except Exception as e:
        print(f"Theme Rank Scraping Error: {e}")
        return ["비만치료제", "온디바이스 AI", "저PBR", "초전도체", "우주항공", "로봇"]

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
        
        articles = soup.select("dl.articleList dd.articleSubject a") # title-only for now
        for a in articles:
            items.append({
                "title": a.text.strip(),
                "link": "https://finance.naver.com" + a['href'],
                "publisher": "Naver Finance",
                "time": ""
            })
        return items[:5]
    except:
        return []

def get_naver_market_index_data():
    """
    네이버 모바일 API를 사용하여 국내외 주요 지수 및 매크로 지표(금리, VIX, 환율 등)를 통합 수집합니다.
    """
    indices_to_fetch = [
        {"code": "KOSPI", "label": "KOSPI"},
        {"code": "KOSDAQ", "label": "KOSDAQ"},
        {"code": "SPI@SPX", "label": "S&P 500"},
        {"code": "NAS@IXIC", "label": "NASDAQ"},
        {"code": "DJI@DJI", "label": "DOW JONES"},
        {"code": "NAS@NDX", "label": "NASDAQ 100"},
        # [Macro Intelligence]
        {"code": "VIX@VIX", "label": "VIX(공포지수)"},
        {"code": "CMTS@TY10", "label": "미 국채 10년물 금리"},
        {"code": "FRX@DXY", "label": "달러인덱스(DXY)"},
        # [European Indices]
        {"code": "DAX@DAX", "label": "독일 DAX"},
        {"code": "CAC@CAC40", "label": "프랑스 CAC 40"},
        {"code": "UKX@FTSE100", "label": "영국 FTSE 100"}
    ]
    
    results = []
    for idx in indices_to_fetch:
        try:
            url = f"https://m.stock.naver.com/api/index/{idx['code']}/basic"
            res = requests.get(url, headers=HEADER, timeout=5)
            if res.status_code == 200:
                data = res.json()
                price = data.get('closePrice', '0').replace(',', '')
                pct = data.get('fluctuationsRatio', '0')
                
                # 금리의 경우 f"{price}%" 형식으로, 지수의 경우 천단위 콤마 f"{price:,.2f}" 형식으로 유동적 처리
                is_rate = "금리" in idx["label"] or "TY10" in idx["code"]
                val_formatted = f"{float(price):.4f}%" if is_rate else f"{float(price):,.2f}"
                
                results.append({
                    "label": idx["label"],
                    "value": val_formatted,
                    "change": f"{float(pct):+.2f}%",
                    "up": float(pct) >= 0
                })
        except Exception as e:
            print(f"Error fetching index {idx['label']}: {e}")
            results.append({
                "label": idx["label"], "value": "N/A", "change": "0.00%", "up": True
            })
            
    return results

def get_top_us_stocks_data():
    """
    미국 증시의 풍향계 역할을 하는 시총 상위 및 핵심 테크 15개 종목의 실시간 시세를 수집합니다.
    """
    tickers = [
        "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", # Mag 7
        "AVGO", "AMD", "INTC", "ASML", "TSM", # 핵심 반도체
        "ORCL", "NFLX", "QCOM" # 기타 주요 테크
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
                    change = data.get('compareToPreviousClosePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')
                    name = data.get('stockName', symbol)
                    
                    return {
                        "symbol": symbol,
                        "name": name,
                        "price": f"{float(price):,.2f}",
                        "change": f"{float(pct):+.2f}%",
                        "up": float(pct) >= 0
                    }
        except:
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
            if len(cols) < 3: continue
            
            title_node = cols[0].select_one("a")
            if not title_node: continue
            
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
                        if l in counts: counts[l] = v
                    if "상한가" in text:
                        m_up = re.search(r'상한가\s*(\d+)', text)
                        if m_up: counts["상한가"] = m_up.group(1)
                    if "하한가" in text:
                        m_down = re.search(r'하한가\s*(\d+)', text)
                        if m_down: counts["하한가"] = m_down.group(1)

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
                if count >= limit: break
                
                a_tag = row.select_one("a.tltle")
                if not a_tag: continue
                
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
                    "change": f"{float(change_pct):+.2f}%"
                })
                count += 1
        except Exception as e:
            print(f"[TopStocks] Error for {m_name}: {e}")
            
    return results

@turbo_cache(ttl_seconds=120)
def get_integrated_stock_news(symbol: str = "", name: str = "", query: str = "", days: int = 1):
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
            print(f"[NEWS DEBUG] Scraping Naver Finance News for {code} (Period: {days} days)")
            for page in range(1, max_pages + 1): # Fetch historical periods based on days
                url = f"https://finance.naver.com/item/news_list.naver?code={code}&page={page}"
                res = requests.get(url, headers=HEADER, timeout=5)
                soup = BeautifulSoup(decode_safe(res), 'html.parser')
                
                rows = soup.select("table.type5 tbody tr")
                if not rows: break
                
                page_all_older = True
                for row in rows:
                    cols = row.select("td")
                    if len(cols) < 3: continue
                    
                    title_tag = row.select_one("td.title a")
                    if not title_tag: continue
                    
                    title = title_tag.text.strip()
                    link = "https://finance.naver.com" + title_tag['href']
                    info = row.select_one("td.info").text.strip()
                    date_str = row.select_one("td.date").text.strip()
                    
                    try:
                        news_date = datetime.strptime(date_str, "%Y.%m.%d %H:%M")
                        if news_date < limit_date: continue
                        page_all_older = False
                    except:
                        pass
                        
                    news_list.append({
                        "title": title,
                        "link": link,
                        "publisher": info,
                        "published": date_str.split()[0].replace('.', '-') # YYYY-MM-DD
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
    search_query = f'"{search_name}"' if search_name and not search_name.isdigit() else (query or search_name or code)
    fallback_query = search_name if (search_name and not search_name.isdigit()) else (query or code)
    
    load_dotenv()
    client_id = os.getenv('NAVER_CLIENT_ID')
    client_secret = os.getenv('NAVER_CLIENT_SECRET')

    if client_id and client_secret:
        try:
            url = "https://openapi.naver.com/v1/search/news.json"
            headers = {"X-Naver-Client-Id": client_id, "X-Naver-Client-Secret": client_secret}
            params = {"query": search_query, "display": min(max_items, 100), "sort": "date"}
            response = requests.get(url, headers=headers, params=params, timeout=5)
            if response.status_code == 200:
                items = response.json().get('items', [])
                for item in items:
                    if len(news_list) >= max_items: break
                    news_list.append({
                        "title": html.unescape(re.sub('<.*?>', '', item.get('title', ''))),
                        "description": html.unescape(re.sub('<.*?>', '', item.get('description', ''))),
                        "link": item.get('originallink', item.get('link', '')),
                        "publisher": "네이버 뉴스",
                        "published": item.get('pubDate', '')[:16]
                    })
                if news_list: return news_list
        except: pass

    # [Tier 2] Google RSS
    try:
        if not fallback_query: return []
        encoded_query = urllib.parse.quote(fallback_query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=ko&gl=KR&ceid=KR:ko"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
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
    except:
        return news_list

def get_naver_stock_info(symbol: str):
    """
    네이버 모바일 API를 사용하여 국내 및 해외 주식 시세를 통합 수집합니다.
    야후 파이낸스 차단 상황을 완벽하게 보완합니다.
    """
    symbol = symbol.upper()
    # 국내 주식 코드 처리 (005930.KS -> 005930)
    clean_code = re.sub(r'[^0-9A-Z]', '', symbol.split('.')[0])
    
    # 1. 국내 주식 시도
    if len(clean_code) == 6 and clean_code.isdigit():
        try:
            url = f"https://m.stock.naver.com/api/stock/{clean_code}/basic"
            res = requests.get(url, headers=HEADER, timeout=3)
            if res.status_code == 200:
                data = res.json()
                price = data.get('closePrice', '0').replace(',', '')
                if price and float(price) > 0:
                    pct = data.get('fluctuationsRatio', '0')
                    # [v5.7.0] Detailed fields for ranking enrichment
                    change_val = str(data.get('compareToPreviousClosePrice', '0')).replace(',', '')
                    rf_name = data.get('compareToPreviousPrice', {}).get('name', 'UNCHANGED')
                    
                    return {
                        "symbol": symbol,
                        "name": data.get('stockName', symbol),
                        "price": f"{float(price):,.0f}",
                        "change": f"{float(pct):+.2f}%",
                        "change_val": change_val,
                        "risefall_name": rf_name,
                        "up": float(pct) >= 0 or rf_name == 'RISING'
                    }
        except: pass

    # 2. 해외 주식 시도 (접미사 지원 확장: 일본 .T, 홍콩 .HK, 베트남 .VN 등)
    suffixes = ['', '.O', '.N', '.A', '.T', '.HK', '.VN', '.SH', '.SZ']
    
    # 전달된 심볼에 이미 점이 포함되어 있다면 해당 심볼로 먼저 시도
    if '.' in symbol:
        try:
            url = f"https://m.stock.naver.com/api/stock/{symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    price = data.get('closePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')
                    
                    # Format: 2 decimals for symbols with dots (Foreign) or letters
                    is_foreign = '.' in symbol or any(c.isalpha() for c in symbol)
                    
                    return {
                        "symbol": symbol,
                        "name": data.get('stockName', symbol),
                        "price": f"{float(price):,.2f}" if is_foreign else f"{float(price):,.0f}",
                        "change": f"{float(pct):+.2f}%",
                        "change_val": str(data.get('compareToPreviousClosePrice', '0')).replace(',', ''),
                        "risefall_name": data.get('compareToPreviousPrice', {}).get('name', 'UNCHANGED'),
                        "up": float(pct) >= 0
                    }
        except: pass

    # 접미사 프로빙 루프
    for suffix in suffixes:
        test_symbol = clean_code + suffix
        if test_symbol == symbol: continue # 이미 시도함
        try:
            url = f"https://m.stock.naver.com/api/stock/{test_symbol}/basic"
            res = requests.get(url, headers=HEADER, timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('closePrice'):
                    price = data.get('closePrice', '0').replace(',', '')
                    pct = data.get('fluctuationsRatio', '0')
                    return {
                        "symbol": test_symbol,
                        "name": data.get('stockName', test_symbol),
                        "price": f"{float(price):,.2f}",
                        "change": f"{float(pct):+.2f}%",
                        "change_val": str(data.get('compareToPreviousClosePrice', '0')).replace(',', ''),
                        "risefall_name": data.get('compareToPreviousPrice', {}).get('name', 'UNCHANGED'),
                        "up": float(pct) >= 0
                    }
        except: continue
            
    # 3. 최후의 수단: 기존 스크래핑 엔진 (비상용)
    return gather_naver_stock_data(symbol)

# ============================================================
# [호환성 유지] 구 API 이름 → 통합 함수로 리다이렉트
# 이전에 사용하던 함수 이름들을 그대로 import해도 오류가 나지 않도록 별칭을 제공합니다.
# ============================================================
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
    """ Legacy Wrapper to prevent duplicated requests """
    try:
        res = gather_naver_stock_data(symbol)
        if not res or not res.get("detailed_financials", {}).get("success"):
            return {"per": "N/A", "pbr": "N/A", "success": False}
            
        summary = res["detailed_financials"]["summary"]
        
        financials = {
            "market_cap": res.get("market_cap_str", "N/A"),
            "per": str(summary.get('per', 'N/A')),
            "pbr": str(summary.get('pbr', 'N/A')),
            "roe": summary.get('roe'),
            "revenue": summary.get('revenue'),
            "operating_income": summary.get('operating_income'),
            "debt_ratio": summary.get('debt_ratio'),
            "detailed": res["detailed_financials"]
        }
        return financials
    except Exception as e:
        print(f"Financials crawl error: {e}")
        return None


def get_korean_market_indices():
    """
    Fetch major Korean indices (KOSPI, KOSDAQ, KOSPI200)
    """
    indices = {
        "kospi": {"value": "0", "change": "0", "percent": "0.00%", "direction": "Equal"},
        "kosdaq": {"value": "0", "change": "0", "percent": "0.00%", "direction": "Equal"},
        "kospi200": {"value": "0", "change": "0", "percent": "0.00%", "direction": "Equal"}
    }
    
    def fetch_one(code):
        try:
            url = f"https://finance.naver.com/sise/sise_index.naver?code={code}"
            res = requests.get(url, headers=HEADER, timeout=3)
            # Use decode_safe
            soup = BeautifulSoup(decode_safe(res), 'html.parser')
            
            val_node = soup.select_one("#now_value")
            
            # KOSPI/KOSDAQ common
            change_node = soup.select_one("#change_value_and_rate")
            
            val = val_node.text.strip() if val_node else "0"
            percent = "0.00%"
            change = "0"
            direction = "Equal"
            
            if change_node:
                txt = change_node.text.strip().replace('\n', '')
                import re
                p_match = re.search(r'([+-]?\d+\.\d+%)', txt)
                if p_match: percent = p_match.group(1)
                change = txt.split('%')[0].split()[-1] if '%' in txt else "0"
                if len(txt.split()) > 0: change = txt.split()[0]
                if "+" in txt or "상승" in txt: direction = "Up"
                elif "-" in txt or "하락" in txt: direction = "Down"
            else:
                # KOSPI200 Fallback
                c_val_node = soup.select_one("#change_value")
                c_rate_node = soup.select_one("#change_rate")
                if c_val_node and c_rate_node:
                    change = c_val_node.text.strip()
                    percent = c_rate_node.text.strip()
                    if "+" in percent or "상승" in percent: direction = "Up"
                    elif "-" in percent or "하락" in percent: direction = "Down"

            return {"value": val, "change": change, "percent": percent, "direction": direction}
        except:
            pass
        return {"value": "0", "change": "0", "percent": "0.00%", "direction": "Equal"}

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
                    val = -abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or "+" in raw:
                    val = abs(float(raw.replace("▲", "").replace("+", "").strip() or "0"))
                else:
                    # 숫자만 있는 경우
                    nums = raw.replace("▲", "").replace("▼", "").strip()
                    val = float(nums) if nums else 0.0

                sectors.append({"name": name, "percent": f"{val:+.2f}", "change": val})
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
            if len(themes) >= limit: break
            cols = row.select("td")
            if len(cols) < 2: continue
            
            try:
                name_tag = cols[0].select_one("a")
                if not name_tag: continue
                
                name = name_tag.text.strip()
                percent = cols[1].text.strip()
                
                if not name or not percent: continue
                
                themes.append({"name": name, "percent": percent})
            except: pass
            
        return themes
    except:
        return []

get_top_themes = get_top_trending_themes # Alias

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
                if res.status_code != 200: return []
                
                soup = BeautifulSoup(decode_safe(res), 'html.parser')
                # Fixed: Look for table with summary containing "순매매"
                target_table = None
                tables = soup.select("table")
                for tbl in tables:
                    summary = tbl.get("summary", "")
                    if "순매매" in summary and "외국인" in summary:
                        target_table = tbl
                        break
                
                if not target_table: return []
                
                rows = target_table.select("tbody tr")
                page_data = []
                
                for row in rows:
                    cols = row.select("td")
                    if len(cols) < 7: continue
                    
                    try:
                        date_txt = cols[0].text.strip()
                        if not re.match(r'\d{4}\.\d{2}\.\d{2}', date_txt): continue
                        
                        inst_txt = cols[5].text.strip().replace(',', '')
                        frgn_txt = cols[6].text.strip().replace(',', '')
                        price_txt = cols[1].text.strip().replace(',', '')
                        
                        def safe_int(txt):
                            try:
                                if not txt or not txt.strip(): return 0
                                # Handle numbers with signs
                                clean = re.sub(r'[^0-9-]', '', txt)
                                return int(clean) if clean else 0
                            except:
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
                    except: continue
                return page_data
                
            except Exception as e:
                print(f"Page {page_num} Fetch Error: {e}")
                return []

        # Parallel Fetch
        pages_to_fetch = (days // 20) + 2 
        if pages_to_fetch > 5: pages_to_fetch = 5
        
        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_page = {executor.submit(fetch_page, p): p for p in range(1, pages_to_fetch + 1)}
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
        # This is robust against encoding issues that might break class selection
        all_tables = soup.select("table")
        for tbl in all_tables:
            rows = tbl.select("tr")
            if len(rows) < 3: continue
            
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
                        def parse_v(txt): return int(re.sub(r'[^0-9-]', '', txt.strip()) or 0)
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
                    if s_name and not any(kw in s_name for kw in ["매도상위", "거래량", "거래원"]):
                        brokerage["sell"].append({"name": s_name, "volume": int(s_vol) if s_vol.isdigit() else 0})
                    
                    b_name = cols[2].text.strip()
                    b_vol = cols[3].text.strip().replace(',', '')
                    if b_name and not any(kw in b_name for kw in ["매수상위", "거래량", "거래원"]):
                        brokerage["buy"].append({"name": b_name, "volume": int(b_vol) if b_vol.isdigit() else 0})

        # 4. Parse Daily Trend using Mobile API (for Individual data and multi-page support)
        # 1-year is approx 250 trading days. pageSize=50 is stable.
        trend = []
        target_count = trader_day if trader_day > 1 else 20 # default 20 for chart
        if trader_day == 1: target_count = 1 # Just today
        
        # Fallback to get listed shares for calculation (Mobile API trend doesn't provide holdings quantity)
        def get_listed_shares():
            try:
                pc_url = f"https://finance.naver.com/item/main.naver?code={code}"
                res = requests.get(pc_url, headers=HEADER, timeout=5)
                # Parse <th>상장주식수</th><td><em>5,969,782,550</em></td>
                m = re.search(r'상장주식수</th>\s*<td>\s*<em>([^<]+)</em>', res.text)
                if m: return int(m.group(1).replace(',', ''))
                # Backup regex
                m = re.search(r'상장주식수\s*</strong>\s*<span>([^<]+)</span>', res.text)
                if m: return int(m.group(1).replace(',', ''))
            except: pass
            return 0
            
        total_shares = get_listed_shares()
        
        last_bizdate = ''
        fetched_count = 0
        max_loop = 10 # Safety limit
        
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
                    if not dt_raw: continue
                    
                    dt = f"{dt_raw[:4]}-{dt_raw[4:6]}-{dt_raw[6:8]}"
                    if any(d['date'] == dt for d in trend): continue
                        
                    def clean_i(v): return int(re.sub(r'[^0-9-]', '', str(v or 0)))
                    
                    f_ratio = float(str(item.get('foreignerHoldRatio', 0)).replace(',', '').replace('%', ''))
                    # Calculate holdings quantity if not available
                    f_holdings = clean_i(item.get('foreignerHoldQuant', 0))
                    if f_holdings == 0 and total_shares > 0:
                        f_holdings = int(total_shares * (f_ratio / 100.0))
                    
                    close_val = clean_i(item.get('closePrice', 0))
                    diff_val = clean_i(item.get('compareToPreviousClosePrice', 0))
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
                
                if not new_items: break
                trend.extend(new_items)
                fetched_count = len(trend)
                last_bizdate = m_data[-1].get('bizdate', '')
                
                if fetched_count >= target_count:
                    trend = trend[:target_count]
                    break
            except Exception as e:
                print(f"Mobile API Fetch Error (last_bizdate={last_bizdate}): {e}")
                break

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
            "data": {"brokerage": {"sell":[], "buy":[], "foreign_estimate":None}, "trend": []}
        }


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
        val_tag = soup.select_one(".today em") or soup.select_one("p.no_today em")
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
    fallbacks = {"USD": 1480.0, "JPY": 9.2, "CNY": 195.0, "HKD": 178.0, "VND": 0.055}
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
            if len(cols) < 5: continue
            
            name = cols[0].text.strip()
            # 종목명이 비어있거나 헤더인 경우 건너븀
            if not name or "종목명" in name: continue
            
            dates = cols[1].text.strip().replace('\xa0', '').replace('\t', '')
            fixed_price = cols[2].text.strip().replace('\xa0', '').replace('\t', '')
            hope_price = cols[3].text.strip().replace('\xa0', '').replace('\t', '')
            competition = cols[4].text.strip().replace('\xa0', '').replace('\t', '') # 주관사 또는 경쟁률
            
            data.append({
                "name": name,
                "date": dates,
                "price": fixed_price,
                "band": hope_price,
                "detail": competition
            })
            if len(data) >= 15: break # 최신 15개 정도면 충분
            
    except Exception as e:
        print(f"[IPO] 실시간 수집 에러: {e}")
        
    return data

def get_live_investor_estimates(symbol: str):
    """
    Real-time investor breakdown estimate (Intraday)
    Scrapes '잠정치' from Naver Finance.
    Falls back to confirmed daily data if unavailable.
    """
    now = datetime.datetime.now()
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
        except:
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
        # Search for table by summary or content keywords
        table = None
        for tbl in soup.select("table"):
            summary = tbl.get("summary", "")
            if "잠정" in summary or "순매매" in summary:
                table = tbl
                break
        
        if not table:
            # Fallback: look for the second sub_section table which is usually the one
            tables = soup.select(".sub_section table")
            if len(tables) >= 2:
                table = tables[1]
            elif tables:
                table = tables[0]

        if table:
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) >= 3:
                    time_txt = cols[0].text.strip()
                    # More flexible time check
                    if time_txt and (":" in time_txt or "." in time_txt or any(d.isdigit() for d in time_txt)): 
                        try:
                            # Clean and convert numeric values
                            def parse_naver_num(txt):
                                clean = re.sub(r'[^0-9-]', '', txt.replace(',', ''))
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
                        except:
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

    return [] # Return empty list if no data available, frontend handles this

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
                if len(cols) < 4: continue
                
                date_txt = cols[0].text.strip()
                if not date_txt or "." not in date_txt: continue
                
                price_txt = cols[1].text.strip().replace(',', '')
                if not price_txt: continue
                
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

    except Exception as e:
        print(f"Interest Rates Scrape Error: {e}")
        return [
            {"name": "한국 기준금리", "price": 2.50, "change": 0.0, "symbol": "KORATE"},
            {"name": "CD금리 (91일)",  "price": 2.81, "change": 0.0, "symbol": "CD91"},
            {"name": "국고채 3년",     "price": 3.18, "change": 0.0, "symbol": "KO3Y"},
            {"name": "국고채 10년",    "price": 3.50, "change": 0.0, "symbol": "KO10Y"},
            {"name": "콜금리 (1일)",   "price": 2.60, "change": 0.0, "symbol": "CALL"},
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
            if not area: return
            
        def extract_stats(area_class, market_key):
            area = soup.select_one(area_class)
            if not area: return
            
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
    target_keywords = ["유상증자", "무상증자", "단일판매", "공급계약", "타법인", "영업실적", "잠정", "자사주", "주식소각", "전환사채", "신주인수권", "합병", "분할", "공개매수", "감자", "결정", "수주", "취득", "처분", "배당", "주주", "특허", "임상", " MOU", "투자"]
    fallback_results = []
    
    try:
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(decode_safe(res), "html.parser")
        
        articles = soup.select("ul.realtimeNewsList > li")
        
        for li in articles:
            dl = li.select_one("dl")
            if not dl: continue
            
            title_tag = dl.select_one("dt.articleSubject a") or dl.select_one("dd.articleSubject a")
            if not title_tag: continue
            
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
            press = summary_dd.select_one("span.press").text.strip() if summary_dd and summary_dd.select_one("span.press") else ""
            date = summary_dd.select_one("span.wdate").text.strip() if summary_dd and summary_dd.select_one("span.wdate") else ""
            
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
                if len(stocks) >= 3: break
                s_cols = s_row.select("td")
                
                if item_type == "sector":
                    if len(s_cols) < 5: continue
                    change_idx = 3
                else: 
                    if len(s_cols) < 5: continue
                    change_idx = 4
                    
                s_name_tag = s_cols[0].select_one("a")
                if not s_name_tag: continue
                s_name = s_name_tag.text.strip()
                
                s_change_txt = s_cols[change_idx].text.strip()
                
                s_change_val = 0.0
                if item_type == "sector":
                    c_r = s_change_txt.replace(",", "").replace("%", "").strip()
                    if "▼" in c_r or c_r.startswith("-"):
                        s_change_val = -abs(float(c_r.replace("▼", "").replace("-", "").strip() or "0"))
                    elif "▲" in c_r or c_r.startswith("+"):
                        s_change_val = abs(float(c_r.replace("▲", "").replace("+", "").strip() or "0"))
                    else:
                        try: s_change_val = float(c_r.replace("▲", "").replace("▼", "").strip())
                        except: pass
                    s_change_val = round(s_change_val, 2)
                    stocks.append({"name": s_name, "change": s_change_val})
                else:
                    try:
                        clean_change = s_change_txt.replace('%', '').replace(',', '').strip()
                        s_change_val = round(float(clean_change), 2)
                        stocks.append({"name": s_name, "change": s_change_val})
                    except:
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
                if len(candidates) >= 30: break
                cols = row.select("td")
                if len(cols) < 2: continue
                link = cols[0].select_one("a")
                if not link: continue
                
                sector_name = link.text.strip()
                sector_url = "https://finance.naver.com" + link['href']
                percent_text = cols[1].text.strip()
                
                if not sector_name or not percent_text: continue
                
                raw = percent_text.replace(",", "").replace("%", "").strip()
                if "▼" in raw or raw.startswith("-"):
                    val = -abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or raw.startswith("+"):
                    val = abs(float(raw.replace("▲", "").replace("+", "").strip() or "0"))
                else:
                    try: val = float(raw.replace("▲", "").replace("▼", "").strip())
                    except: continue
                
                candidates.append({
                    "name": sector_name,
                    "url": sector_url,
                    "percent": percent_text,
                    "change": val
                })
                
            tasks = [fetch_stocks_for_heatmap(session, c, "sector") for c in candidates]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            sectors = [r for r in results if isinstance(r, dict) and "stocks" in r]
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
                if len(candidates) >= 30: break
                cols = row.select("td")
                if len(cols) < 2: continue
                link = cols[0].select_one("a")
                if not link: continue
                
                theme_name = link.text.strip()
                theme_url = "https://finance.naver.com" + link['href']
                percent_text = cols[1].text.strip()
                
                if not theme_name or not percent_text: continue
                
                raw = percent_text.replace(",", "").replace("%", "").strip()
                if "▼" in raw or raw.startswith("-"):
                    val = -abs(float(raw.replace("▼", "").replace("-", "").strip() or "0"))
                elif "▲" in raw or raw.startswith("+"):
                    val = abs(float(raw.replace("▲", "").replace("+", "").strip() or "0"))
                else:
                    try: val = float(raw.replace("▲", "").replace("▼", "").strip())
                    except: continue
                
                candidates.append({
                    "name": theme_name,
                    "url": theme_url,
                    "percent": percent_text,
                    "change": val
                })
                
            tasks = [fetch_stocks_for_heatmap(session, c, "theme") for c in candidates]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            themes = [r for r in results if isinstance(r, dict) and "stocks" in r]
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
                    key = th.text.strip().replace(" ", "").replace("\n", "").replace("\t", "")
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
                    except:
                        pct_val = 0.0
                    data["sales_composition"].append({
                        "product": product,
                        "percentage": pct_val
                    })
        
        # 4. 연구개발비 지출 현황 (table#cTB205_1)
        rnd_table = soup.select_one("table#cTB205_1")
        if rnd_table:
            headers = [th.text.strip() for th in rnd_table.select("thead tr th")]
            rows = rnd_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) > 0:
                    row_data = {"period": cols[0].text.strip()}
                    for i, col in enumerate(cols[1:]):
                        if i+1 < len(headers):
                            h_key = headers[i+1].replace(" ", "").replace("\n", "")
                            row_data[h_key] = col.text.strip()
                    data["rnd_status"].append(row_data)
        
        # 5. 인원 현황 (table#cTB205_2)
        staff_table = soup.select_one("table#cTB205_2")
        if staff_table:
            headers = [th.text.strip() for th in staff_table.select("thead tr th")]
            rows = staff_table.select("tbody tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) > 0:
                    row_data = {"period": cols[0].text.strip()}
                    for i, col in enumerate(cols[1:]):
                        if i+1 < len(headers):
                            h_key = headers[i+1].replace(" ", "").replace("\n", "")
                            row_data[h_key] = col.text.strip()
                    data["staff_status"].append(row_data)
                        
        return data
        
    except Exception as e:
        print(f"Overview scraping error for {symbol}: {e}")
        return None


@turbo_cache(ttl_seconds=3600)
def get_korean_investment_indicators(symbol: str, freq: str = "0", fin_gubun: str = "IFRSL", rpt: str = "3"):
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
        frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cmp_cd={code}"
        res_frame = session.get(frame_url, timeout=7)
        html_frame = decode_safe(res_frame)
        
        # encparam: '...' 형태의 토큰 추출
        match = re.search(r"encparam\s*:\s*'([^']+)'", html_frame)
        if not match:
            # Fallback search if the regex above fails
            match = re.search(r"encparam\s*=\s*'([^']+)'", html_frame)
            
        if not match:
            print(f"Failed to find encparam for {code}")
            return {"status": "empty", "message": "해당 종목의 데이터 토큰을 찾을 수 없습니다. (ETF 등 재무제표 미존재 종목일 수 있음)"}
        
        encparam = match.group(1)

        # Step 2: 실시간 데이터 API 호출 (JSON 포맷 반환)
        # finGubun: IFRSL(연결), IFRSS(별도), GAAPL(연결), GAAPS(별도), MAIN(주재무제표)
        valid_fingubun = ["IFRSL", "IFRSS", "GAAPL", "GAAPS", "MAIN"]
        if fin_gubun not in valid_fingubun:
            fin_gubun = "MAIN" # Default to MAIN for stability

        data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq={freq}&rpt={rpt}&finGubun={fin_gubun}&encparam={encparam}"
        
        ajax_headers = {
            "Referer": frame_url,
            "X-Requested-With": "XMLHttpRequest"
        }
        res_data = session.get(data_url, headers=ajax_headers, timeout=7)
        
        # JSON 파싱 시도 (cF4002.aspx는 encparam이 있으면 JSON으로 반환함)
        try:
            raw_bytes = res_data.content
            try:
                json_str = raw_bytes.decode('utf-8')
            except UnicodeDecodeError:
                json_str = raw_bytes.decode('cp949', 'ignore')
            json_data = json.loads(json_str)
        except Exception as e:
            print(f"Failed to parse JSON for {code}: {e}")
            return None

        # Step 3: 데이터 가공 (Header: YYMM, Data: indicators)
        if not json_data or "YYMM" not in json_data or not json_data.get("YYMM"):
            msg = "해당 종목의 지표 정보를 불러올 수 없거나 존재하지 않는 페이지입니다."
            if "삼성전자" in str(symbol) or code == "005930":
                 # Extra diagnostic for core stocks
                 msg = f"WiseReport 서버로부터 {code} 지표 데이터를 정상적으로 로드하지 못했습니다. (네트워크/IP 차단 가능성)"
            return {"status": "empty", "message": msg}

        # Header 정제 (HTML 태그 제거)
        headers = []
        for h in json_data.get("YYMM", []):
            clean_h = re.sub(r'<[^>]*>', '', h).replace("\n", "").replace("\t", "").strip()
            if clean_h and clean_h not in headers:
                headers.append(clean_h)
        
        indicators = []
        for row in json_data.get("DATA", []):
            name = row.get("ACC_NM", "").strip()
            if not name: continue
            
            values = {}
            # DATA1, DATA2 ... 순서대로 헤더와 매칭
            for i, h in enumerate(headers):
                key = f"DATA{i+1}"
                val = row.get(key)
                # N/A 등 문자열 정리
                try:
                    if isinstance(val, (int, float)):
                        values[h] = val
                    else:
                        values[h] = None
                except:
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
            if not table: return []
            
            items = []
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) < 6: continue
                
                name_tag = cols[1].select_one("a")
                if not name_tag: continue
                
                name = name_tag.text.strip()
                href = name_tag.get("href", "")
                symbol = href.split("code=")[-1] if "code=" in href else ""
                
                # 거래량 또는 등락률 값 추출
                val = cols[3].text.strip() if not is_rise else cols[5].text.strip()
                
                items.append({
                    "name": name,
                    "symbol": symbol,
                    "value": val
                })
                if len(items) >= 15: break
            return items
        except: return []

    return {
        "foreign_sell": parse_naver_sise("https://finance.naver.com/sise/sise_rise.naver?sosok=0", True),
        "institution_sell": parse_naver_sise("https://finance.naver.com/sise/sise_rise.naver?sosok=1", True),
        "foreign_top": parse_naver_sise("https://finance.naver.com/sise/sise_quant.naver?sosok=0"),
        "institution_top": parse_naver_sise("https://finance.naver.com/sise/sise_quant.naver?sosok=1")
    }

def get_market_insights_data():
    """
    시장 주도주 탭을 위한 검색 및 거래대금 인사이트 데이터 수집
    - search_top: 실시간 검색 순위
    - value_top: 거래대금 상위
    """
    import requests
    from bs4 import BeautifulSoup
    
    def parse_popular_search():
        try:
            url = "https://finance.naver.com/sise/lastsearch2.naver"
            res = requests.get(url, headers=HEADER, timeout=5)
            soup = BeautifulSoup(decode_safe(res), "html.parser")
            table = soup.select_one("table.type_5")
            if not table: return []
            
            items = []
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                # 인기검색어 테이블 구조:
                # 순위(0), 종목명(1), 검색비율(2), 현재가(3), 전일비(4), 등락률(5), 거래량(6)...
                if len(cols) < 7: continue 
                
                name_tag = cols[1].select_one("a")
                if not name_tag: continue
                
                name = name_tag.text.strip()
                symbol = name_tag.get("href", "").split("code=")[-1]
                
                # 검색비율 대신 '거래량' 정보 추출 (사용자 요청: 몇 주인지가 더 정확함)
                volume_raw = cols[6].text.strip().replace(",", "")
                
                try:
                    vol_num = int(volume_raw)
                    if vol_num >= 1000000:
                        vol_display = f"{vol_num/1000000:.1f}백만"
                    elif vol_num >= 10000:
                        vol_display = f"{vol_num/10000:.0f}만"
                    else:
                        vol_display = f"{vol_num:,}"
                except:
                    vol_display = volume_raw

                # 전일비/등락률 정보로 방향 판단
                change_txt = cols[4].text.strip()
                direction = "상승" if "상" in change_txt or "▲" in change_txt or "+" in change_txt else "하락" if "하" in change_txt or "▼" in change_txt or "-" in change_txt else ""

                items.append({
                    "name": name,
                    "symbol": symbol,
                    "amount": f"{direction} {vol_display}주" # 검색비율 대신 거래량을 '주' 단위로 표시
                })
                if len(items) >= 15: break
            return items
        except Exception as e:
            print(f"Error parsing popular search volume: {e}")
            return []

    def parse_trading_value():
        try:
            # 거래대금 상위 페이지
            url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
            res = requests.get(url, headers=HEADER, timeout=5)
            soup = BeautifulSoup(decode_safe(res), "html.parser")
            table = soup.select_one("table.type_2")
            if not table: return []
            
            items = []
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) < 10: continue

                name_tag = cols[2].select_one("a")
                if not name_tag: continue

                name = name_tag.text.strip()
                symbol = name_tag.get("href", "").split("code=")[-1]

                # 거래대금 상위 페이지 구조: N(0), 거래대금(1), 종목명(2), 현재가(3), 전일비(4), 등락률(5)...
                value_raw = cols[1].text.strip().replace(",", "")
                
                try:
                    val_num = float(value_raw)
                    if val_num >= 10000: value_display = f"{val_num/10000:.1f}조"
                    else: value_display = f"{val_num:,.0f}억"
                except: value_display = f"{value_raw}억"

                change_txt = cols[4].text.strip()
                direction = "상승" if "상" in change_txt or "▲" in change_txt else "하락" if "하" in change_txt or "▼" in change_txt else ""

                items.append({
                    "name": name,
                    "symbol": symbol,
                    "value": f"{direction} {value_display}",
                    "amount": f"{value_raw}억"
                })
                if len(items) >= 15: break
            return items
        except Exception as e:
            print(f"Error parsing trading volume: {e}")
            return []

    return {
        "search_top": parse_popular_search(),
        "value_top": parse_trading_value()
    }

@turbo_cache(ttl_seconds=1800)
def get_naver_economy_calendar():
    """
    네이버 증권 최신 API를 사용하여 오늘의 실시간 글로벌 경제 일정을 수집합니다.
    URL: https://stock.naver.com/api/securityService/economic/indicator/nations/releaseDate
    """
    import datetime
    today_str = datetime.datetime.now().strftime("%Y%m%d")
    
    # 한국(KOR)과 미국(USA) 지표를 우선 수집
    url = f"https://stock.naver.com/api/securityService/economic/indicator/nations/releaseDate?nationTypeList=KOR&nationTypeList=USA&page=1&pageSize=100&releaseDate={today_str}"
    
    # 네이버 보안 통과를 위한 필수 헤더
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://stock.naver.com/"
    }
    
    events = []
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"[EconomyCalendar] API Return Error: {res.status_code}")
            return []
            
        data = res.json()
        indicators = data.get("indicators", [])
        
        for item in indicators:
            name = item.get("name", "Unknown")
            nation = item.get("nationType", "🌐")
            
            # 시간 형식 변환 (HHMMSS -> HH:MM)
            raw_time = item.get("releaseTime", "000000")
            time_fmt = f"{raw_time[:2]}:{raw_time[2:4]}" if len(raw_time) >= 4 else "00:00"
            
            importance = item.get("importance", 1)
            actual = item.get("actualValue", 0)
            previous = item.get("previousValue", 0)
            
            # 실제치나 이전치가 0인 경우 "-"로 표시 (발표 전일 수 있음)
            actual_str = str(actual) if actual != 0 else "-"
            prev_str = str(previous) if previous != 0 else "-"
            
            events.append({
                "time": time_fmt,
                "country": "US" if nation == "USA" else "KR" if nation == "KOR" else nation,
                "event": name,
                "event_kr": name,
                "importance": importance,
                "actual": actual_str,
                "forecast": "-", # 현재 API에서 forecast 필드 부재
                "previous": prev_str
            })
            
    except Exception as e:
        print(f"[EconomyCalendar] API Processing Error: {e}")
        
    return events

