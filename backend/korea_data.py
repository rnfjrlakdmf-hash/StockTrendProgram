import aiohttp
import asyncio
import requests
from bs4 import BeautifulSoup
import re
import datetime
import urllib.parse
import json
from functools import lru_cache
from typing import Dict, List, Optional
from turbo_engine import turbo_cache

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
        # 1. Trust header if explicit
        content_type = res.headers.get('Content-Type', '').lower()
        if 'charset=utf-8' in content_type:
            return res.content.decode('utf-8', 'replace')
        if 'charset=euc-kr' in content_type:
             return res.content.decode('cp949', 'ignore')
             
        # 2. Heuristic: Naver Finance is usually CP949
        if "finance.naver.com" in res.url or "navercomp.wisereport.co.kr" in res.url:
            try:
                # WiseReport is usually UTF-8, Finance is CP949
                if "wisereport.co.kr" in res.url:
                    return res.content.decode('utf-8')
                return res.content.decode('cp949')
            except:
                return res.content.decode('cp949', 'ignore')
                pass

        # 3. Try UTF-8 strict
        return res.content.decode('utf-8')
    except UnicodeDecodeError:
        # 4. Fallback
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

@turbo_cache(ttl_seconds=3600)
def search_stock_code(keyword: str):
    """
    Search stock by name/code and return code (6 digits)
    [Improved] Scrapes Naver Search (Integration) instead of Finance Search (Blocked).
    """
    try:
        # Use Naver Integration Search (more robust, UTF-8 supported)
        query = f"{keyword} 주가"
        encoded = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query={encoded}"
        
        # Standard Browser Headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        res = requests.get(url, headers=headers, timeout=5)
        html = res.text # Naver Search is UTF-8 usually
        
        # Regex to find finance.naver.com links with code
        # Pattern: finance.naver.com/item/main.naver?code=005930
        matches = re.findall(r'finance\.naver\.com/item/main.*code=(\d{6})', html)
        
        if matches:
            # Return first finding (Best Match)
            return matches[0]
            
        return None
    except Exception as e:
        print(f"Search Code Error: {e}")
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
        res = requests.get(url, headers=HEADER, timeout=5)
        
        # [Fix] Smart Decoding v2: UTF-8 First
        # EUC-KR bytes are often invalid UTF-8 (fail fast), 
        # whereas UTF-8 bytes can look like valid EUC-KR (garbage success).
        # So we MUST try UTF-8 first.
        content = res.content
        try:
            html = content.decode('euc-kr') # Naver Finance is predominantly EUC-KR
        except UnicodeDecodeError:
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
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
                market_type = 'KOSDAQ'
            elif '코스피' in alt:
                market_type = 'KOSPI'
                
        # [New] Company Description (Summary) - Mobile API integration
        description = ""
        try:
            m_sum_url = f"https://m.stock.naver.com/api/stock/{code}/overview"
            m_sum_res = requests.get(m_sum_url, headers=HEADER, timeout=3)
            m_sum_json = m_sum_res.json()
            description = m_sum_json.get('description', '')
        except:
            pass

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
        # Try multiple common selectors for market status on Naver Finance
        status_selectors = ["#market_status", "#time", ".description span.blind", ".description"]
        for selector in status_selectors:
            status_tag = soup.select_one(selector)
            if status_tag:
                text = status_tag.text.strip()
                # Use regex to find the actual status part (e.g., 장중, 장마감)
                match = re.search(r'(장중|장마감|야간거래\(NXT\)|장외|정규장종료|거래정지)', text)
                if match:
                    market_status = match.group(1)
                    break
                elif any(word in text for word in ["장중", "장마감", "야간거래(NXT)"]):
                    if "장중" in text: market_status = "장중"
                    elif "야간거래(NXT)" in text: market_status = "야간거래(NXT)"
                    elif "장마감" in text: market_status = "장마감"
                    break
        
        # 3. Fallback: Search for keywords in common status containers
        if market_status == "Unknown":
            for tag in soup.select(".description, .date, .no_today, #time"):
                text = tag.text.strip()
                if "장중" in text: market_status = "장중"; break
                if "장마감" in text: market_status = "장마감"; break
                if "야간거래" in text: market_status = "야간거래(NXT)"; break
                if "정규장종료" in text: market_status = "장마감"; break

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

        # Extra details (Restored)
        market_cap_str = ""
        try:
            mc = soup.select_one("#_market_sum")
            if mc:
                raw = mc.text.strip()
                market_cap_str = re.sub(r'\s+', ' ', raw) + " 억원"
        except: pass
        
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
                    mapping = {
                        "매출액": "revenue", "영업이익률": "operating_margin", "영업이익": "operating_income",
                        "순이익률": "net_income_margin", "당기순이익": "net_income", "ROE": "roe", "ROA": "roa",
                        "부채비율": "debt_ratio", "당좌비율": "quick_ratio", "유보율": "reserve_ratio",
                        "유동비율": "current_ratio", "자산회전율": "asset_turnover", "매출총이익률": "gross_margin",
                        "EPS": "eps", "BPS": "bps", "PER": "per", "PBR": "pbr",
                        "주당배당금": "dps", "시가배당률": "dividend_yield", "배당성향": "payout_ratio"
                    }

                    key = None
                    for k in sorted(mapping.keys(), key=len, reverse=True):
                        if k in r_title_clean:
                            key = mapping[k]
                            break
                    if key:
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
                # Text is like "\n\t\t\t\t하락\n\t\t\t\t8,500"
                # Remove all whitespace and non-digit chars EXCEPT for signs if any (Naver signs are words usually)
                raw_diff_text = cols[2].text.strip()
                # Extract number
                diff_match = re.search(r'[\d,]+', raw_diff_text)
                diff = 0
                if diff_match:
                    diff = int(diff_match.group().replace(',', ''))
                
                # Check direction (images or text)
                is_drop = False
                if '하락' in raw_diff_text or '파란색' in str(cols[2]): # weak text check
                    is_drop = True
                else:
                    # Check img alt
                    img = cols[2].select_one('img')
                    if img and ('하락' in img.get('alt', '') or 'nv' in img.get('src', '')):
                         is_drop = True
                
                if is_drop:
                    diff = -diff
                
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
                    "change": change_percent, # Return % to match Yahoo behavior
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
    return []

@turbo_cache(ttl_seconds=300)
def get_naver_disclosures(symbol: str):
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
            
            title = cols[0].text.strip()
            link = "https://finance.naver.com" + cols[0].select_one("a")['href']
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
            for page in range(1, 10): # Fetch up to 10 pages for historical periods
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
                    
                    if len(news_list) >= 30:
                        break
                        
                if page_all_older or len(news_list) >= 30:
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
            params = {"query": search_query, "display": 50, "sort": "date"}
            response = requests.get(url, headers=headers, params=params, timeout=5)
            if response.status_code == 200:
                items = response.json().get('items', [])
                for item in items:
                    if len(news_list) >= 20: break
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
            for item in items[:20]:
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
    """ Legacy Wrapper for basic stock info """
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
        
        for tbl in soup.select("table.type2"):
            rows = tbl.select("tr")
            if len(rows) < 3: continue
            
            # Check rows 3 and 4 for definitive column counts
            for i in range(min(len(rows), 6)):
                c_data = rows[i].select("td")
                if len(c_data) == 4 and not broker_table:
                    broker_table = tbl
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
                    
                    new_items.append({
                        "date": dt,
                        "close": clean_i(item.get('closePrice', 0)),
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


def get_exchange_rate():
    """
    Fetch KRW/USD exchange rate from Naver
    """
    try:
        url = "https://finance.naver.com/marketindex/"
        res = requests.get(url, headers=HEADER, timeout=3)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')
        
        # USD
        usd_tag = soup.select_one("#exchangeList > li.on > a.head.usd > div > span.value")
        if usd_tag:
            return float(usd_tag.text.replace(',', ''))
            
        return 1300.0 # Fallback
    except:
        return 1300.0

@lru_cache(maxsize=1)
def get_ipo_data():
    """
    Fetch IPO schedule from 38.co.kr
    """
    url = "http://www.38.co.kr/html/fund/index.htm?o=k"
    data = []
    
    try:
        res = requests.get(url, headers=HEADER, timeout=3)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')
        
        rows = soup.select("table[summary='공모주 청약일정'] tr")
        
        for row in rows:
            cols = row.select("td")
            if len(cols) < 5: continue
            
            name = cols[0].text.strip()
            dates = cols[1].text.strip().replace('\xa0', '')
            fixed_price = cols[2].text.strip().replace('\xa0', '')
            hope_price = cols[3].text.strip().replace('\xa0', '')
            
            if not name or "종목명" in name: continue
            
            data.append({
                "name": name,
                "date": dates,
                "price": fixed_price,
                "band": hope_price
            })
            
    except Exception as e:
        print(f"IPO Scrape Error: {e}")
        
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
        soup = BeautifulSoup(decode_safe(res), 'html.parser')

        # Find the table containing "잠정" (Provisional)
        sections = soup.select(".sub_section")
        for sec in sections:
            if "잠정" in sec.text:
                table = sec.select_one("table")
                if table:
                    rows = table.select("tr")
                    for row in rows:
                        cols = row.select("td")
                        if len(cols) >= 3:
                            time_txt = cols[0].text.strip()
                            if ":" in time_txt: 
                                try:
                                    foreigner_val = int(cols[1].text.replace(',', ''))
                                    institution_val = int(cols[2].text.replace(',', ''))
                                    
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
            # Sort by time ascending (for table/chart logic if needed)
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
            {"name": "한국 기준금리", "price": 3.25, "change": 0.0, "symbol": "KORATE"},
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
def get_korean_investment_indicators(symbol: str, freq: str = "0", fin_gubun: str = "IFRSL"):
    """
    네이버 금융 투자지표(WiseReport cF4002.aspx)로부터 상세 안정성 지표를 스크랩합니다.
    (부채비율, 유동비율, 이자보상배율 등)
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return None

    # WiseReport Data Endpoint (rpt=3 for Stability Indicators)
    # n-th tab is often represented by rpt (3=Stability, 1=Profitability, 2=Growth, etc.)
    url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&rpt=3&frq={freq}&finGubun={fin_gubun}"
    
    try:
        res = requests.get(url, headers=HEADER, timeout=7)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        # The data is in table#draggable-table-body
        tbody = soup.select_one("#draggable-table-body")
        if not tbody:
            # Fallback check if search returned no results
            if "검색 결과가 없습니다" in html:
                return {"status": "empty", "message": "해당 조건의 데이터가 없습니다."}
            return None
            
        # Get Headers (Years/Quarters) from the fixed header row (usually above the draggable body)
        headers = []
        # In cF4002.aspx, headers are often in th.num elements within the same response
        header_cols = soup.select("th.num")
        for h in header_cols:
            clean_h = h.text.strip().replace("\n", "").replace("\t", "")
            if clean_h and clean_h not in headers:
                headers.append(clean_h)
        
        rows = tbody.select("tr")
        indicators = []
        
        for row in rows:
            # First <th> is the indicator name
            name_col = row.select_one("th")
            if not name_col: continue
            
            # Clean name (remove symbols like +, -)
            indicator_name = name_col.text.strip().replace(" ", "").replace("\n", "").replace("\t", "")
            # Remove leading +/- used for expanding tree
            indicator_name = re.sub(r'^[+-]', '', indicator_name)
            
            if not indicator_name: continue
            
            values_cols = row.select("td")
            values = {}
            
            for i, col in enumerate(values_cols):
                if i < len(headers):
                    year_key = headers[i]
                    val_str = col.text.strip().replace(",", "")
                    try:
                        # Clean special chars like % or N/A
                        clean_val = re.sub(r'[^0-9.-]', '', val_str)
                        val = float(clean_val) if clean_val else None
                    except:
                        val = None
                    values[year_key] = val
            
            indicators.append({
                "name": indicator_name,
                "values": values
            })
            
        return {
            "status": "success",
            "symbol": symbol,
            "freq": freq,
            "finGubun": fin_gubun,
            "headers": headers,
            "indicators": indicators
        }
        
    except Exception as e:
        print(f"Indicators scraping error for {symbol}: {e}")
        return None

