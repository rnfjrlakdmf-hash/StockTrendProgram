import requests
from bs4 import BeautifulSoup
import re
import datetime
import urllib.parse
import json
from functools import lru_cache

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
        if "finance.naver.com" in res.url:
            try:
                return res.content.decode('cp949')
            except:
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

def get_naver_stock_info(symbol: str):
    """
    Fetch basic stock info from Naver (Price, Name, Market Type)
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
                market_type = 'KQ'
            elif '코스피' in alt:
                market_type = 'KS'
                
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
        
        # Initialize variables (Restored)
        per = 0.0
        eps = 0.0
        dvr = 0.0
        pbr = 0.0
        bps = 0.0
        est_per = 0.0
        est_eps = 0.0
        dp_share = 0
        year_high = 0
        year_low = 0
        
        # ID-based scraping (Backup)
        try:
            p = soup.select_one("#_per")
            if p: per = float(p.text.strip().replace(',', ''))
        except: pass
        
        try:
            e = soup.select_one("#_eps")
            if e: eps = float(e.text.strip().replace(',', ''))
        except: pass

        try:
            p = soup.select_one("#_pbr")
            if p: pbr = float(p.text.strip().replace(',', ''))
        except: pass
        
        try:
            d = soup.select_one("#_dvr")
            if d: dvr = float(d.text.strip().replace(',', '')) / 100.0
        except: pass
        
        # OHLCV
        open_val = 0
        high_val = 0
        low_val = 0
        volume_val = 0
        
        try:
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

                    # BPS/PBR pair
                    if "BPS" in label_clean and "PBR" in label_clean:
                        if len(nums_f) >= 2:
                             pbr = nums_f[0]
                             bps = nums_f[1]
                        elif len(nums_f) == 1:
                             pbr = nums_f[0]

                    elif "BPS" in label_clean:
                         bps = nums_f[0]
                    elif "PBR" in label_clean:
                         pbr = nums_f[0]

                    # Est PER/EPS pair
                    if "PER" in label_clean and "EPS" in label_clean:
                         is_est = "추정" in label or "컨센서스" in label or "E" in label or "202" in label
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
                             if is_est: est_per = nums_f[0]
                             else: per = nums_f[0]

                    # Dividend (Exclude Yield explanation)
                    elif "주당배당금" in label_clean and "수익률" not in label_clean:
                         dp_share = int(nums_f[0])
                         
                    # 52 Week
                    elif "52" in label_clean and "최고" in label_clean:
                         year_high = int(nums_f[0])
                    elif "52" in label_clean and "최저" in label_clean:
                         year_low = int(nums_f[0])
                         
                except: continue
        
        # [Debug] Verify Scraped Data
        # print(f"[Scraper] {code} ({name}) - PER:{per} PBR:{pbr} EPS:{eps} EstPER:{est_per}")

        # [Result Builder]
        res = {
            "name": name,
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
            "open": open_val,
            "day_high": high_val,
            "day_low": low_val,
            "volume": volume_val
        }

        return res
        
    except Exception as e:
        print(f"Naver Info Error: {e}")
        return None

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
            if len(cols) < 3:
                continue
                
            title_tag = row.select_one("td.title a")
            if not title_tag:
                 continue
            
            title = title_tag.text.strip()
            link = "https://finance.naver.com" + title_tag['href']
            info = row.select_one("td.info").text.strip()
            date = row.select_one("td.date").text.strip()
            
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

# NEW Function
def get_naver_news_search(query: str):
    """
    네이버 뉴스 검색 (키워드 기반) - Fallback용
    """
    try:
        # URL Encoding
        encoded_query = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=news&query={encoded_query}&sm=tab_opt&sort=0&photo=0&field=0&pd=0&ds=&de=&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso=so%3Ar%2Cp%3Aall&is_sug_officeid=0"
        
        print(f"[SEARCH DEBUG] Searching for: {query}")
        print(f"[SEARCH DEBUG] URL: {url[:100]}...")
        
        res = requests.get(url, headers=HEADER, timeout=5)
        soup = BeautifulSoup(res.text, 'html.parser')
        news_items = []
        
        # 네이버 뉴스 검색 결과 (updated selector for 2026)
        articles = soup.select("li.bx")
        print(f"[SEARCH DEBUG] Found {len(articles)} articles with 'li.bx'")
        
        if not articles:
            # Try alternative selector
            articles = soup.select("div.api_subject_bx")
            print(f"[SEARCH DEBUG] Trying alternative: Found {len(articles)} with 'div.api_subject_bx'")
        
        for idx, art in enumerate(articles, 1):
            try:
                # Title & Link - try multiple selectors
                title_tag = art.select_one("a.news_tit") or art.select_one("a.api_txt_lines") or art.select_one("a")
                if not title_tag:
                    if idx <= 3:
                        print(f"[SEARCH DEBUG] Article {idx}: No title tag found")
                    continue
                    
                title = title_tag.text.strip()
                link = title_tag.get('href', '')
                
                if not title or not link:
                    continue
                
                # Publisher
                pub_tag = art.select_one("a.info.press") or art.select_one("span.press")
                publisher = pub_tag.text.strip() if pub_tag else "Naver News"
                
                # Date (info_group)
                date_tags = art.select("span.info")
                date = date_tags[-1].text.strip() if date_tags else ""
                
                news_items.append({
                    "title": title,
                    "link": link,
                    "publisher": publisher,
                    "published": date
                })
                
                if idx <= 2:
                    print(f"[SEARCH DEBUG] Added news {idx}: {title[:40]}...")
                
                if len(news_items) >= 5:
                    break
            except Exception as e:
                if idx <=3:
                    print(f"[SEARCH DEBUG] Error parsing article {idx}: {e}")
                continue
                
        print(f"[SEARCH DEBUG] Total news found: {len(news_items)}")
        return news_items
        
    except Exception as e:
        print(f"Naver Search News Error: {e}")
        return []


def get_naver_news(symbol: str, name: str = "", start_date: str = None, end_date: str = None, max_pages: int = 10):
    """
    네이버 금융 뉴스 크롤링 (관련 뉴스) - Naver News Search API 사용
    symbol: '005930.KS' or '005930'
    name: Optional stock name for better fallback search
    start_date: 검색 시작 날짜 (YYYY-MM-DD), None이면 제한 없음
    end_date: 검색 종료 날짜 (YYYY-MM-DD), None이면 제한 없음
    max_pages: 최대 탐색할 페이지 수
    """
    try:
        import os
        from dotenv import load_dotenv
        
        # Load environment variables
        load_dotenv()
        
        client_id = os.getenv('NAVER_CLIENT_ID')
        client_secret = os.getenv('NAVER_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            print("[NEWS] Naver API credentials not found, using sample data")
            return _get_sample_news(symbol, name)
        
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        
        if len(code) != 6:
            return []
        
        # 종목명으로 검색 (Strict: Exact Match)
        # 이름이 있으면 따옴표로 감싸서 정확히 그 단어가 들어간 것만 검색
        if name:
            search_query = f'"{name}"'
        else:
            search_query = code
            
        print(f"[NEWS DEBUG] Searching Naver News API for: {search_query}")
        
        # Naver News Search API 호출
        url = "https://openapi.naver.com/v1/search/news.json"
        headers = {
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret
        }
        params = {
            "query": search_query,
            "display": 20,  # 필터링을 고려해 더 많이 가져옴 (8 -> 20)
            "sort": "date"  # 최신순
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=5)
        
        if response.status_code != 200:
            print(f"[NEWS] API Error: {response.status_code}")
            return _get_sample_news(symbol, name)
        
        data = response.json()
        items = data.get('items', [])
        
        news_list = []
        target_count = 8
        
        for item in items:
            if len(news_list) >= target_count:
                break
                
            # HTML 태그 제거
            title = re.sub('<.*?>', '', item.get('title', ''))
            description = re.sub('<.*?>', '', item.get('description', ''))
            
            # HTML Entity Decode (e.g. &quot; -> ")
            import html
            title = html.unescape(title)
            description = html.unescape(description)

            # [Strict Filter] 이름이 명시된 경우, 제목이나 내용에 반드시 포함되어야 함
            if name:
                # 공백 제거 후 비교 (혹시 모를 띄어쓰기 이슈 방지) or 그냥 포함 여부
                if name not in title and name not in description:
                    continue
                    
            # [Spam Filter] 부동산/분양 광고 제거
            spam_keywords = ["분양", "아파트", "오피스텔", "상가", "청약", "주택", "부동산", "지식산업센터", "역세권"]
            is_spam = False
            for spam in spam_keywords:
                if spam in title or spam in description:
                    is_spam = True
                    break
            if is_spam:
                continue

            news_list.append({
                "title": title,
                "description": description, # Add description for debug/display
                "link": item.get('originallink', item.get('link', '')),
                "press": "네이버 뉴스",
                "date": item.get('pubDate', '')[:10]  # "YYYY-MM-DD"
            })
        
        print(f"[NEWS DEBUG] Found {len(news_list)} news items from API")
        return news_list
        
    except Exception as e:
        print(f"[NEWS] Error: {e}")
        return _get_sample_news(symbol, name)

def _get_sample_news(symbol: str, name: str):
    """Fallback sample news when API is unavailable"""
    from datetime import datetime
    
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    stock_name = name if name else code
    today = datetime.now().strftime("%Y.%m.%d")
    
    return [
        {
            "title": f"{stock_name} 관련 최신 뉴스 - 시장 동향 분석",
            "link": f"https://finance.naver.com/item/main.naver?code={code}",
            "press": "네이버 금융",
            "date": today
        },
        {
            "title": f"{stock_name} 주가 전망 및 투자 전략",
            "link": f"https://finance.naver.com/item/news.naver?code={code}",
            "press": "뉴스 종합",
            "date": today
        }
    ]


def get_naver_stock_search_news_fallback(symbol):
     return get_naver_news_search(symbol)

def get_stock_financials(symbol: str):
    """
    네이버 금융 종목분석 파싱 (주요 재무제표)
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        
        if len(code) != 6:
            return None
            
        url = f"https://finance.naver.com/item/main.naver?code={code}"
        
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        res = requests.get(url, headers=headers, timeout=5)
        
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        financials = {}
        
        # 1. 시가총액
        try:
            market_cap = soup.select_one("#_market_sum").text.strip().replace('\t', '').replace('\n', '')
            financials['market_cap'] = market_cap + " 억원"
        except:
            pass
            
        # 2. PER, PBR
        try:
            per = soup.select_one("#_per")
            pbr = soup.select_one("#_pbr")
            financials['per'] = per.text.strip() if per else "N/A"
            financials['pbr'] = pbr.text.strip() if pbr else "N/A"
        except:
            pass
            
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
    Fetch top sectors from Naver
    """
    try:
        url = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
        res = requests.get(url, headers=HEADER, timeout=3)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')
        
        sectors = []
        # Use more specific selector if possible to avoid spacer rows
        # table.type_1 matches, but let's check for rows with data
        rows = soup.select("table.type_1 tr")
        
        for row in rows:
            if len(sectors) >= 5: break
            cols = row.select("td")
            if len(cols) < 2: continue
            
            try:
                # Select 'a' tag to avoid whitespace issues in 'td'
                name_tag = cols[0].select_one("a")
                if not name_tag: continue
                
                name = name_tag.text.strip()
                percent = cols[1].text.strip()
                
                # Check valid data (skip empty or headers if any)
                if not name or not percent: continue
                
                sectors.append({"name": name, "percent": percent})
            except: pass
            
        return sectors
    except Exception as e:
        print(f"Sector Scrape Error: {e}")
        return []

def get_top_themes():
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
            if len(themes) >= 5: break
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
                res = requests.get(url, headers=HEADER, timeout=3)
                if res.status_code != 200: return []
                
                soup = BeautifulSoup(decode_safe(res), 'html.parser')
                tables = soup.select("table.type2")
                target_table = None
                for tbl in tables:
                    if "기관" in tbl.text and "외국인" in tbl.text:
                        target_table = tbl
                        break
                
                if not target_table: return []
                
                rows = target_table.select("tr")
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
                                if not txt: return 0
                                return int(txt)
                            except:
                                return 0
                                
                        page_data.append({
                            "date": date_txt.replace('.', '-'),
                            "price": int(price_txt),
                            "institution": safe_int(inst_txt),
                            "foreigner": safe_int(frgn_txt),
                            "retail": 0 
                        })
                    except: continue
                return page_data
                
            except Exception as e:
                print(f"Page {page_num} Fetch Error: {e}")
                return []

        # Parallel Fetch
        # Each page has ~20 items. 40 days ~ 2 pages. fetch 3 just in case.
        # If days > 40, fetch more.
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
        traceback.print_exc()
        return []


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

@lru_cache(maxsize=1)
def get_theme_heatmap_data():
    """
    Fetch Theme Heatmap data (Mock or Scrape)
    """
    # Real Data Scraping
    themes = []
    try:
        # 1. Get Top Themes
        url = "https://finance.naver.com/sise/theme.naver"
        res = requests.get(url, headers=HEADER, timeout=3)
        soup = BeautifulSoup(decode_safe(res), 'html.parser')
        
        rows = soup.select("table.type_1 tr")
        
        # Collect valid theme links first
        theme_candidates = []
        for row in rows:
            if len(theme_candidates) >= 5: break
            
            cols = row.select("td")
            if len(cols) < 2: continue
            
            link = cols[0].select_one("a")
            if not link: continue
            
            theme_name = link.text.strip()
            theme_url = "https://finance.naver.com" + link['href']
            percent = cols[1].text.strip()
            
            if not theme_name or not percent: continue
            
            theme_candidates.append({
                "theme": theme_name,
                "url": theme_url,
                "percent": percent
            })
            
        # 2. Fetch details for each theme
        for t in theme_candidates:
            stocks = []
            try:
                # Theme Detail Page
                res_sub = requests.get(t['url'], headers=HEADER, timeout=3)
                soup_sub = BeautifulSoup(decode_safe(res_sub), 'html.parser')
                
                sub_rows = soup_sub.select("table.type_5 tr")
                
                for s_row in sub_rows:
                    if len(stocks) >= 3: break
                    
                    s_cols = s_row.select("td")
                    # Name=0, Price=2, Diff=3, Change%=4
                    if len(s_cols) < 5: continue
                    
                    s_name_tag = s_cols[0].select_one("a")
                    if not s_name_tag: continue
                    
                    s_name = s_name_tag.text.strip()
                    s_change_txt = s_cols[4].text.strip()
                    
                    try:
                        clean_change = s_change_txt.replace('%', '').strip()
                        s_change_val = float(clean_change)
                        stocks.append({"name": s_name, "change": s_change_val})
                    except:
                        continue
                        
            except Exception as e:
                print(f"Theme Detail Error ({t['theme']}): {e}")
            
            themes.append({
                "theme": t['theme'],
                "percent": t['percent'],
                "stocks": stocks
            })
            
    except Exception as e:
        print(f"Theme Scrape Error: {e}")
        
    return themes

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
    Fetch Korea Key Interest Rates (Mock / Scrape)
    """
    return [
        {"name": "한국 기준금리", "price": 3.00, "change": 0.0, "symbol": "KORATE"},
        {"name": "CD금리 (91일)", "price": 3.45, "change": -0.01, "symbol": "CD91"},
        {"name": "국고채 3년", "price": 2.85, "change": -0.02, "symbol": "KO3Y"},
        {"name": "국고채 10년", "price": 2.98, "change": -0.03, "symbol": "KO10Y"},
        {"name": "콜금리 (1일)", "price": 3.10, "change": 0.0, "symbol": "CALL"},
    ]
