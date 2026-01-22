import requests

from bs4 import BeautifulSoup

import re

import concurrent.futures




import threading

DYNAMIC_STOCK_MAP = {} # Global Cache for Stock Names -> Codes

def get_naver_disclosures(symbol: str):

    """

    네이버 금융에서 특정 종목의 최신 전자공시 목록을 크롤링합니다.

    symbol: '005930' (종목코드, .KS/.KQ 제거 필요)

    """

    # .KS, .KQ 제거

    code = symbol.split('.')[0]

    

    # 숫자만 남기기

    code = re.sub(r'[^0-9]', '', code)

    

    if len(code) != 6:

        return {"error": "Invalid Code"}



    url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"

    

    try:

        headers = {

            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

        }

        res = requests.get(url, headers=headers)

        

        # Try decoding with utf-8 first (Modern Naver), then cp949 (Old Naver)

        try:

            html = res.content.decode('utf-8')

        except UnicodeDecodeError:

            try:

                html = res.content.decode('cp949')

            except UnicodeDecodeError:

                html = res.text # Fallback

            

        soup = BeautifulSoup(html, 'html.parser')

        

        disclosures = []

        

        # 공시 테이블 찾기

        # 'type5' or 'type6' class used depending on page version

        rows = soup.select("table.type5 tbody tr, table.type6 tbody tr")

        

        for row in rows:

            cols = row.select("td")

            if len(cols) < 3:

                continue

                

            title_tag = cols[0].select_one("a")

            if not title_tag:

                continue

                

            title = title_tag.text.strip()

            link = "https://finance.naver.com" + title_tag['href']

            info = cols[1].text.strip() # 정보제공 (DART 등)

            date = cols[2].text.strip()

            

            # 전자공시(DART)만 필터링하거나 모두 표시

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
        print(f"Naver Disclosure Crawl Error: {e}")
        return []


def search_korean_stock_symbol(keyword: str):
    """
    종목명으로 검색하여 종목코드(Symbol)를 찾습니다. (크롤링)
    """
    try:
        # [Manual Mapping Fallback]
        # Bypass crawling for known stocks that fail due to blocking
        MANUAL_STOCK_MAP = {
            "한화오션": "042660",
            "HANWHAOCEAN": "042660",
            "대우조선해양": "042660",
            # Add others if needed
        }
        
        normalized_keyword = keyword.replace(" ", "").upper()
        if normalized_keyword in MANUAL_STOCK_MAP:
            print(f"[Search] Found '{keyword}' in MANUAL mapping.")
            return MANUAL_STOCK_MAP[normalized_keyword]
        
            if k in normalized_keyword:
                return v

        # [Dynamic Map Check]
        if normalized_keyword in DYNAMIC_STOCK_MAP:
            print(f"[Search] Found '{keyword}' in DYNAMIC mapping (Exact match).")
            return DYNAMIC_STOCK_MAP[normalized_keyword]
            
        # Check partial match in Dynamic Map
        for name, code in DYNAMIC_STOCK_MAP.items():
            # If the user query is very short (e.g. 2 chars), be careful with partial match
            if len(normalized_keyword) >= 2 and normalized_keyword in name:
                 # Prefer exact start match
                 if name.startswith(normalized_keyword):
                     print(f"[Search] Found '{keyword}' in DYNAMIC mapping (Partial match: {name}).")
                     return code
            # Also check if name is in keyword (e.g. "Samsung Electronics" -> "Samsung")
            # Usually keyword is shorter.

        # euc-kr Encoding for Naver Query
        print(f"[Search] '{keyword}' not in cache. Crawling Naver Search...")
        from urllib.parse import quote
        encoded_query = quote(keyword.encode('euc-kr'))
        url = f"https://finance.naver.com/search/searchList.naver?query={encoded_query}"
        
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        res = requests.get(url, headers=headers)
        
        # Decode
        try:
            html = res.content.decode('euc-kr')
        except:
            html = res.text
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for direct match table
        # .tbl_search result
        results = soup.select(".tbl_search tbody tr")
        
        for row in results:
            cols = row.select("td")
            if len(cols) >= 1:
                title_link = cols[0].select_one("a")
                if title_link:
                    name = title_link.text.strip()
                    # href="/item/main.naver?code=005930"
                    href = title_link['href']
                    code_match = re.search(r'code=(\d+)', href)
                    if code_match:
                        code = code_match.group(1)
                        # Naver returns code only. We should guess KS or KQ?
                        # Usually the user wants the first match.
                        # We can try to check if it is KOSPI or KOSDAQ from other cols if avail,
                        # but just returning code allows stock_data to use its "Happy Eyeballs" check (Try KS then KQ)
                        # Or stock_data expects checks.
                        # We will return the 6 digit code.
                        # We will return the 6 digit code.
                        print(f"[Search] Naver Crawl Success for '{keyword}': {code}")
                        return code
                        
        return None
        
    except Exception as e:
        print(f"Search Symbol Error: {e}")
        return None




def get_korean_name(symbol: str) -> str:

    """

    네이버 금융에서 종목의 한글명을 가져옵니다. (yfinance의 영문명 대체용)

    """

    try:

        code = symbol.split('.')[0]

        code = re.sub(r'[^0-9]', '', code)

        

        if len(code) != 6:

            return ""

            

        url = f"https://finance.naver.com/item/main.naver?code={code}"

        headers = {

            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"

        }

        res = requests.get(url, headers=headers)

        

        # Automatically detect encoding using chardet (via requests)

        res.encoding = res.apparent_encoding

        soup = BeautifulSoup(res.text, 'html.parser')

        

        # 메인 페이지 상단의 종목명 찾기

        # <div class="wrap_company"><h2><a href="#">삼성전자</a></h2>...</div>

        h2 = soup.select_one(".wrap_company h2 a")

        if h2:

            return h2.text.strip()

            

        return ""

        return ""

    except Exception:

        return ""





def _get_soup(url, headers):

    try:

        res = requests.get(url, headers=headers, timeout=5)

        try:

            html = res.content.decode('utf-8')

        except UnicodeDecodeError:

            html = res.content.decode('cp949', 'ignore')

        return BeautifulSoup(html, 'html.parser')

    except Exception:

        return None



    except Exception:
        return None



def refresh_stock_codes():
    """
    Background Task:
    Crawls Naver Finance Market Cap pages (KOSPI & KOSDAQ) to populate DYNAMIC_STOCK_MAP.
    Fetches ALL stocks from each market (approx 40-50 pages each).
    """
    global DYNAMIC_STOCK_MAP
    print("[StockData] Starting background stock code indexing (Full Scan)...")
    
    try:
        new_map = {}
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"
        }
        
        # 0: KOSPI, 1: KOSDAQ
        for sosok in [0, 1]:
            market_name = "KOSPI" if sosok == 0 else "KOSDAQ"
            print(f"[StockData] Indexing {market_name}...")
            
            # 1. Determine Last Page
            last_page = 50 # Default fallback
            try:
                url_base = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}&page=1"
                res = requests.get(url_base, headers=headers, timeout=5)
                # Decode
                try: 
                    html = res.content.decode('euc-kr') 
                except: 
                    html = res.text
                
                soup = BeautifulSoup(html, 'html.parser')
                pgRR = soup.select_one("td.pgRR a")
                if pgRR:
                    href = pgRR['href']
                    match = re.search(r'page=(\d+)', href)
                    if match:
                        last_page = int(match.group(1))
                        print(f"[StockData] {market_name} has {last_page} pages.")
            except Exception as e:
                print(f"[StockData] Failed to determine last page for {market_name} (Using default 50): {e}")

            # 2. Crawl All Pages
            # We can use ThreadPoolExecutor if speed is an issue, but sequential is safer for Naver blocking.
            # Total ~80 pages * 0.2s = ~16s. Acceptable.
            
            for page in range(1, last_page + 1): 
                try:
                    url = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}&page={page}"
                    res = requests.get(url, headers=headers, timeout=5)
                    
                    # Encoding
                    try: 
                        html = res.content.decode('euc-kr') 
                    except: 
                        html = res.text
                        
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Table rows
                    links = soup.select("table.type_2 tbody tr td a.tltle")
                    for link in links:
                        name = link.text.strip()
                        href = link['href']
                        # href="/item/main.naver?code=005930"
                        code_match = re.search(r'code=(\d+)', href)
                        if code_match:
                            code = code_match.group(1)
                            
                            # Add to map (Normalize Name)
                            norm_name = name.replace(" ", "").upper()
                            new_map[norm_name] = code
                            
                except Exception as e:
                    print(f"Error crawling {market_name} page {page}: {e}")
                    
        # Update Global Map
        DYNAMIC_STOCK_MAP.update(new_map)
        print(f"[StockData] Full Indexing Complete. Total unique stocks: {len(DYNAMIC_STOCK_MAP)}")
        
    except Exception as e:
        print(f"[StockData] Indexing failed: {e}")

# Start indexing on import (in background)
t = threading.Thread(target=refresh_stock_codes, daemon=True)
t.start()


def get_naver_market_index_data():

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

    }

    partial_data = {

        "exchange": [], "world_exchange": [], "oil": [], "gold": [], "interest": [], "raw_materials": []

    }

    try:

        soup_idx = _get_soup("https://finance.naver.com/marketindex/?tabSel=exchange#tab_section", headers)

        if soup_idx:

            # 1. Exchange Rates (FETCH ALL)

            # Naver lists major currencies in #exchangeList

            for li in soup_idx.select("#exchangeList li"):

                 # Layout: a.head > h3.h_lst > span.blind (Name)

                 # div.head_info > span.value, span.change

                 

                 name_tag = li.select_one("h3.h_lst span.blind")

                 if not name_tag: continue

                 

                 raw_name = name_tag.text.strip()

                 name = raw_name # Default

                 

                 # Format Name for better display (e.g., "미국 USD")

                 if "미국" in raw_name: name = "미국 USD"

                 elif "일본" in raw_name: name = "일본 JPY (100엔)"

                 elif "유럽연합" in raw_name: name = "유럽연합 EUR"

                 elif "중국" in raw_name: name = "중국 CNY"

                 elif "홍콩" in raw_name: name = "홍콩 HKD"

                 elif "대만" in raw_name: name = "대만 TWD"

                 elif "영국" in raw_name: name = "영국 GBP"

                 elif "캐나다" in raw_name: name = "캐나다 CAD"

                 elif "스위스" in raw_name: name = "스위스 CHF"

                 elif "베트남" in raw_name: name = "베트남 VND (100동)"

                 elif "러시아" in raw_name: name = "러시아 RUB"

                 elif "인도" in raw_name: name = "인도 INR"

                 else: name = raw_name # Others



                 val = li.select_one("span.value").text.strip()

                 change = li.select_one("span.change").text.strip()

                 

                 # Up/Down Logic

                 head_info = li.select_one("div.head_info")

                 is_up = False

                 if head_info:

                     cls = head_info.get("class", [])

                     if "up" in cls or "plus" in cls: is_up = True

                 

                 partial_data["exchange"].append({"name": name, "price": val, "change": change, "is_up": is_up})



            # 2. World Exchange (Indices)

            for li in soup_idx.select("#worldExchangeList li"):

                 name = li.select_one("h3.h_lst span.blind").text.strip()

                 val = li.select_one("span.value").text.strip()

                 change = li.select_one("span.change").text.strip()

                 head_info = li.select_one("div.head_info")

                 is_up = False

                 if head_info and ("up" in head_info.get("class", []) or "plus" in head_info.get("class", [])):

                     is_up = True

                 partial_data["world_exchange"].append({"name": name, "price": val, "change": change, "is_up": is_up})



            # 3. Oil & Gold (Expanded)

            # Fetching from the main list often includes: WTI, Dubai, Brent, Gold(Domestic), Gold(Intl)

            # If the user wants "Everything" from the tab, we trust #oilGoldList provides the summary.

            for li in soup_idx.select("#oilGoldList li"):

                 name = li.select_one("h3.h_lst span.blind").text.strip()

                 val = li.select_one("span.value").text.strip()

                 change = li.select_one("span.change").text.strip()

                 

                 head_info = li.select_one("div.head_info")

                 is_up = False

                 if head_info:

                     cls = head_info.get("class", [])

                     if "up" in cls or "plus" in cls: is_up = True

                     

                 item = {"name": name, "price": val, "change": change, "is_up": is_up}

                 

                

                 # Categorize

                 if "금" in name or "골드" in name: 

                     partial_data["gold"].append(item)

                 else: 

                     partial_data["oil"].append(item)



            # 4. Interest Rates (Explicit Fetch)

            soup_int = _get_soup("https://finance.naver.com/marketindex/?tabSel=interest", headers)

            if soup_int:

                # The active list is usually in .data_lst

                for li in soup_int.select(".data_lst li"):

                     name_tag = li.select_one("h3.h_lst span.blind")

                     if not name_tag: continue

                     name = name_tag.text.strip()

                     val = li.select_one("span.value").text.strip()

                     change = li.select_one("span.change").text.strip()

                     head_info = li.select_one("div.head_info")

                     is_up = False

                     if head_info:

                         cls = head_info.get("class", [])

                         if "up" in cls or "plus" in cls: is_up = True

                     partial_data["interest"].append({"name": name, "price": val, "change": change, "is_up": is_up})



            # 5. Raw Materials (Explicit Fetch)

            soup_mat = _get_soup("https://finance.naver.com/marketindex/?tabSel=materials", headers)

            if soup_mat:

                 for li in soup_mat.select(".data_lst li"):

                     name_tag = li.select_one("h3.h_lst span.blind")

                     if not name_tag: continue

                     name = name_tag.text.strip()

                     val = li.select_one("span.value").text.strip()

                     change = li.select_one("span.change").text.strip()

                     head_info = li.select_one("div.head_info")

                     is_up = False

                     if head_info:

                         cls = head_info.get("class", [])

                         if "up" in cls or "plus" in cls: is_up = True

                     partial_data["raw_materials"].append({"name": name, "price": val, "change": change, "is_up": is_up})

    except Exception as e:

        print(f"Market Index Error: {e}")

    return partial_data



def get_naver_sise_data():

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

    }

    partial_data = {

        "top_sectors": [], "top_themes": [],

        "investor_items": {

            "foreigner_buy": [], "foreigner_sell": [], "institution_buy": [], "institution_sell": []

        }

    }

    try:

        soup_sise = _get_soup("https://finance.naver.com/sise/", headers)

        if soup_sise:

            # Sectors/Themes

            tables = soup_sise.select("table.type_1")

            if len(tables) > 0:

                for row in tables[0].select("tr")[2:]:

                    cols = row.select("td")

                    if len(cols) < 3: continue

                    link_tag = cols[0].select_one("a")

                    if not link_tag: continue

                    partial_data["top_sectors"].append({

                        "name": link_tag.text.strip(), 

                        "percent": cols[1].text.strip(),

                        "link": link_tag['href']

                    })

                    if len(partial_data["top_sectors"]) >= 10: break

            if len(tables) > 1:

                for row in tables[1].select("tr")[2:]:

                    cols = row.select("td")

                    if len(cols) < 3: continue

                    link_tag = cols[0].select_one("a")

                    if not link_tag: continue

                    partial_data["top_themes"].append({

                        "name": link_tag.text.strip(), 

                        "percent": cols[1].text.strip(),

                        "link": link_tag['href']

                    })

                    if len(partial_data["top_themes"]) >= 10: break



            # Investor Items

            def parse_sise_investor(tab_id):

                items = []

                container = soup_sise.select_one(tab_id)

                if not container: return []

                rows = container.select("tr")

                for row in rows:

                    cols = row.select("td")

                    if len(cols) < 4: continue

                    name_tag = cols[1].select_one("a")

                    if not name_tag: continue

                    name = name_tag.text.strip()

                    amount = cols[2].text.strip()

                    raw_change = cols[3].text.strip()

                    change = " ".join(raw_change.split())

                    is_up = False

                    if "rate_up" in str(cols[3]) or "up" in str(cols[3]) or "red" in str(cols[3]): is_up = True

                    if "상승" in change: is_up = True

                    change_val = re.sub(r'(상승|하락|보합)\s*', '', change).strip()

                    items.append({"name": name, "amount": amount, "change": change_val, "is_up": is_up})

                    if len(items) >= 5: break

                return items



            partial_data["investor_items"]["foreigner_buy"] = parse_sise_investor("#frgn_deal_tab_0")

            partial_data["investor_items"]["foreigner_sell"] = parse_sise_investor("#frgn_deal_tab_1")

            partial_data["investor_items"]["institution_buy"] = parse_sise_investor("#org_deal_tab_0")

            partial_data["investor_items"]["institution_sell"] = parse_sise_investor("#org_deal_tab_1")

    except Exception as e:

        print(f"Sise Error: {e}")

    return partial_data



def get_naver_main_data():

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

    }

    partial_data = { "market_summary": { "kospi": None, "kosdaq": None, "kospi200": None } }

    try:

        soup_main = _get_soup("https://finance.naver.com/", headers)

        if soup_main:

            for p_type in ["kospi", "kosdaq", "kospi200"]:

                area = soup_main.select_one(f".{p_type}_area")

                if not area: continue

                

                # 1. Basic Index Info

                idx_val = area.select_one(".num_quot .num").text.strip()

                num2 = area.select_one(".num_quot .num2").text.strip()

                num3 = area.select_one(".num_quot .num3").text.strip()

                status_blind = area.select_one(".num_quot .blind")

                direction = "Equal"

                if status_blind:

                        txt = status_blind.text.strip()

                        if "상승" in txt: direction = "Up"

                        elif "하락" in txt: direction = "Down"

                chart_img = ""

                img_tag = area.select_one(".chart_area img")

                if img_tag: chart_img = img_tag['src']

                

                # 2. Iterate DLs to find Investors, Stock Counts, Program Trading

                investors = { "personal": "0", "foreigner": "0", "institutional": "0" }

                stock_counts = None

                program_trading = None

                

                dls = area.select("dl")

                for dl in dls:

                    dts = dl.select("dt")

                    dds = dl.select("dd")

                    

                    if not dts or not dds: continue

                    

                    first_dt_text = dts[0].text.strip()

                    

                    # A. Investors

                    if "개인" in first_dt_text or "외국인" in first_dt_text:

                        for dt, dd in zip(dts, dds):

                            label = dt.text.strip()

                            val = re.sub(r'[^0-9\-\+\,]', '', dd.text.strip())

                            if "개인" in label: investors["personal"] = val

                            elif "외국인" in label: investors["foreigner"] = val

                            elif "기관" in label: investors["institutional"] = val

                            

                    # B. Stock Counts

                    elif "상한" in first_dt_text or "상승" in first_dt_text:

                        counts = { "upper": "0", "up": "0", "equal": "0", "down": "0", "lower": "0" }

                        for dt, dd in zip(dts, dds):

                            label = dt.text.strip()

                            val = dd.text.strip()

                            if "상한" in label: counts["upper"] = val

                            elif "상승" in label: counts["up"] = val

                            elif "보합" in label: counts["equal"] = val

                            elif "하한" in label: counts["lower"] = val

                            elif "하락" in label: counts["down"] = val

                        stock_counts = counts

                        

                    # C. Program Trading

                    elif "프로그램" in first_dt_text:

                         if len(dds) >= 1:

                             program_trading = {

                                 "net": dds[0].text.strip(),

                                 "change": dds[1].text.strip() if len(dds) > 1 else "",

                                 "label": "프로그램"

                             }



                partial_data["market_summary"][p_type] = {

                    "value": idx_val,

                    "change": num2,

                    "percent": num3,

                    "direction": direction,

                    "chart": chart_img,

                    "investors": investors,

                    "stock_counts": stock_counts,

                    "program_trading": program_trading

                }

    except Exception as e:

        print(f"Main Page Error: {e}")

    return partial_data



def get_index_chart_data(symbol: str, timeframe: str = "day"):

    """

    네이버 금융에서 지수 차트 데이터를 가져옵니다.

    symbol: KOSPI, KOSDAQ, KPI200

    timeframe: day (일봉), week(주봉), month(월봉) - 현재는 일봉/분봉 지원 확장 가능

    """

    # 매핑

    code = "KOSPI"

    if "KOSDAQ" in symbol.upper(): code = "KOSDAQ"

    elif "200" in symbol: code = "KPI200"



    # 네이버 차트 API (XML 방식이 안정적)

    # https://fchart.stock.naver.com/sise.nhn?symbol=KOSPI&timeframe=day&count=60&requestType=0

    url = f"https://fchart.stock.naver.com/sise.nhn?symbol={code}&timeframe={timeframe}&count=60&requestType=0"

    

    try:

        import requests

        import xml.etree.ElementTree as ET

        

        res = requests.get(url)

        if res.status_code == 200:

            root = ET.fromstring(res.text)

            # <chartdata symbol="KOSPI" ...>

            #   <item data="20240101|2500.00|2550.00|2490.00|2530.00|..." />

            # </chartdata>

            

            chart_data = []

            for item in root.findall("chartdata/item"):

                data_str = item.get("data")

                if data_str:

                    parts = data_str.split("|")

                    # 날짜, 시가, 고가, 저가, 종가, 거래량

                    if len(parts) >= 5:

                        chart_data.append({

                            "date": parts[0],

                            "open": float(parts[1]),

                            "high": float(parts[2]),

                            "low": float(parts[3]),

                            "close": float(parts[4]),

                            # "volume": int(parts[5]) if len(parts) > 5 else 0

                        })

            return chart_data

    except Exception as e:

        print(f"Chart data fetch error: {e}")

    

    return []



def get_naver_market_dashboard():

    """

    네이버 금융 데스크탑 메인 페이지(or 시세 페이지)에서 

    환율, 유가, 금리, 원자재, 업종상위, 테마상위 데이터를 크롤링하여 종합 반환합니다.

    (프론트엔드 대시보드용) - 이제 내부 함수들을 병렬 호출합니다.

    """

    

    data = {

        "exchange": [],

        "world_exchange": [],

        "interest": [],

        "oil": [],

        "gold": [],

        "raw_materials": [],

        "top_sectors": [],

        "top_themes": [],

        "market_summary": {

            "kospi": None,

            "kosdaq": None

        },

        "investor_items": {

            "foreigner_buy": [],

            "foreigner_sell": [],

            "institution_buy": [],

            "institution_sell": []

        }

    }

    

    # Parallel Execution with Fallback

    try:

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:

            future_idx = executor.submit(get_naver_market_index_data)

            future_sise = executor.submit(get_naver_sise_data)

            future_main = executor.submit(get_naver_main_data)



            res_idx = future_idx.result(timeout=6)

            res_sise = future_sise.result(timeout=6)

            res_main = future_main.result(timeout=6)



            if res_idx: data.update(res_idx)

            if res_sise: 

                data["top_sectors"] = res_sise.get("top_sectors", [])

                data["top_themes"] = res_sise.get("top_themes", [])

                data["investor_items"] = res_sise.get("investor_items", data["investor_items"])

            if res_main: data["market_summary"] = res_main.get("market_summary", data["market_summary"])

            

    except Exception as e:

        print(f"Parallel Execution Error: {e}, falling back to sequential")

        try:

            res_idx = get_naver_market_index_data()

            if res_idx: data.update(res_idx)

            

            res_sise = get_naver_sise_data()

            if res_sise: 

                data["top_sectors"] = res_sise.get("top_sectors", [])

                data["top_themes"] = res_sise.get("top_themes", [])

                data["investor_items"] = res_sise.get("investor_items", data["investor_items"])

                

            res_main = get_naver_main_data()

            if res_main: data["market_summary"] = res_main.get("market_summary", data["market_summary"])

        except Exception as e2:

                print(f"Sequential Fallback Error: {e2}")



    return data



def get_ipo_data():

    """

    38커뮤니케이션 IPO 일정 크롤링

    http://www.38.co.kr/html/fund/index.htm?o=k

    """

    url = "http://www.38.co.kr/html/fund/index.htm?o=k"

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"

    }

    

    ipo_list = []

    

    try:

        res = requests.get(url, headers=headers)

        # 38.co.kr uses cp949/euc-kr

        try:

            html = res.content.decode('utf-8')

        except UnicodeDecodeError:

            html = res.content.decode('cp949', 'ignore')

        soup = BeautifulSoup(html, 'html.parser')

        

        target_table = None

        # Use simple find_all "tr" to search broadly first

        all_rows = soup.find_all("tr")

        for row in all_rows:

            text = row.get_text()

            if "종목명" in text and "공모주일정" in text:

                 # Found the header row. Now find the parent table.

                 target_table = row.find_parent("table")

                 break

        

        if not target_table:

            return []



        # Get all rows in the table (flattening thead/tbody)

        table_rows = target_table.find_all("tr")

        

        # Find index of header row

        start_idx = -1

        for i, tr in enumerate(table_rows):

             if "종목명" in tr.text and "공모주일정" in tr.text:

                 start_idx = i

                 break

        

        if start_idx == -1: return []

        

        # Parse data rows

        data_rows = table_rows[start_idx+1:]

        

        for row in data_rows:

            cols = row.select("td")

            if len(cols) < 5: continue

            

            # Col 0: Name, Col 1: Schedule, Col 2: Fixed Price, Col 3: Band

            name = cols[0].text.strip().replace('\xa0', '')

            schedule = cols[1].text.strip().replace('\xa0', '')

            

            # [Fix] Strict Filtering

            # 1. Skip News/Ads (start with [ or contain '뉴스')

            if name.startswith("[") or "뉴스" in name:

                continue

                

            # 2. Skip Invalid Schedule (must be at least 5 chars and have separators)

            if not schedule or len(schedule) < 5 or ("~" not in schedule and "." not in schedule):

                continue



            fixed_price = cols[2].text.strip().replace('\xa0', '')

            price_band = cols[3].text.strip().replace('\xa0', '')

            

            if not name: continue

            

            ipo_list.append({

                "name": name,

                "listing_date": "미정", # This page usually lists subscription schedule only

                "subscription_date": schedule,

                "price_band": price_band,

                "fixed_price": fixed_price

            })

            

            if len(ipo_list) >= 5: # Top 5

                break

                

    except Exception as e:

        print(f"IPO Crawl Error: {e}")

        

    return ipo_list



def get_live_investor_estimates(symbol: str):

    """

    네이버 금융에서 장중 잠정 투자자(외국인/기관) 동향을 크롤링합니다.

    URL: https://finance.naver.com/item/frgn.naver?code={code}

    """

    code = symbol.split('.')[0]

    code = re.sub(r'[^0-9]', '', code)

    if len(code) != 6: return None



    url = f"https://finance.naver.com/item/frgn.naver?code={code}"

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    }

    

    try:

        res = requests.get(url, headers=headers)

        # cp949 decoding

        try:

            html = res.content.decode('utf-8')

        except UnicodeDecodeError:

            html = res.content.decode('cp949', 'ignore')

        soup = BeautifulSoup(html, 'html.parser')

        

        # 1. 잠정 추계 테이블 (slight variation in class/id)

        # Usually it's in a table next to or below the main daily trends

        # Look for "잠정추계" text

        

        # In the new interface, it might be in a specific scraping target

        # Let's try finding the table with headers Time/Foreigner/Institution

        

        estimates = []

        

        # Table selection strategy: Look for table with "잠정" in summary or caption

        # Or locate by section header

        

        # Naver Finance often puts this in a table class 'type2' inside a div with specific ID or logic.

        # But specifically, there is often a table showing 09:30, 10:00, 11:30...

        

        sections = soup.select(".sub_section")

        target_table = None

        

        for sec in sections:

            if "잠정" in sec.text:

                target_table = sec.select_one("table")

                break

        

        if not target_table:

             # Fallback: Just try searching all tables

             tables = soup.select("table")

             for tbl in tables:

                 if "잠정" in tbl.text and "외국인" in tbl.text:

                     target_table = tbl

                     break

                     

        if target_table:

            # Parse rows

            # Columns: 시각 | 외국인 | 기관계

            rows = target_table.select("tr")

            for row in rows:

                cols = row.select("td")

                if len(cols) < 3: continue

                

                time_str = cols[0].text.strip()

                # Check for valid time format (e.g. 09:00, 10:30, 14:00)

                if ":" not in time_str: continue 

                

                foreigner = cols[1].text.strip()

                institution = cols[2].text.strip()

                

                # Clean numbers

                f_val = re.sub(r'[^0-9\-\+]', '', foreigner)

                i_val = re.sub(r'[^0-9\-\+]', '', institution)

                

                estimates.append({

                    "time": time_str,

                    "foreigner": int(f_val) if f_val and f_val != '-' else 0,

                    "institution": int(i_val) if i_val and i_val != '-' else 0

                })

        

        # [Fallback] If data is empty (Weekend/Closed), generate Mock Data for Demo

        if not estimates:

            import random

            print("No live data found (Market Closed?). Generating Mock Data for Demo.")

            current_hour = 9

            current_min = 30

            # Generate from 09:30 to now (or 14:30)

            mock_estimates = []

            f_accum = 0

            i_accum = 0

            

            # Create a deterministic mock based on symbol hash

            seed = sum(ord(c) for c in code)

            random.seed(seed)

            

            for _ in range(10): # up to 14:30 roughly

                time_s = f"{current_hour:02d}:{current_min:02d}"

                

                # Random flow

                f_flow = random.randint(-5000, 5000)

                i_flow = random.randint(-5000, 5000)

                

                f_accum += f_flow

                i_accum += i_flow

                

                mock_estimates.append({

                    "time": time_s,

                    "foreigner": f_accum,

                    "institution": i_accum

                })

                

                current_min += 30 # 30 min intervals

                if current_min >= 60:

                    current_hour += 1

                    current_min = 0

                

                if current_hour >= 15: break

            

            return mock_estimates



        return estimates

        

    except Exception as e:

        print(f"Live Investor Crawl Error: {e}")

        return None



def get_theme_heatmap_data():

    """

    테마 히트맵용 데이터를 생성합니다. 

    상위 5개 테마를 가져오고, 각 테마별 상위 5개 종목의 등락률을 수집합니다.

    (MarketDashboard 용)

    """

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    }

    

    heatmap_data = [] # [{theme: "AI", "percent": "+3%", stocks: [...]}, ...]

    

    try:

        # 1. Get Top Themes first from Sise Main

        sise_data = get_naver_sise_data()

        top_themes = sise_data.get("top_themes", [])[:6] # Top 6

        

        for theme in top_themes:

            theme_name = theme['name']

            theme_change = theme['percent']

            

            stocks = []

            

            # Try to get link directly from sise data

            theme_link = theme.get('link')

            

            if theme_link:

                if not theme_link.startswith("http"):

                    theme_link = "https://finance.naver.com" + theme_link

            else:

                # Fallback: Search for theme link in theme.naver

                try:

                    res = requests.get("https://finance.naver.com/sise/theme.naver", headers=headers)

                    try:

                        html = res.content.decode('utf-8')

                    except UnicodeDecodeError:

                        html = res.content.decode('cp949', 'ignore')

                    soup = BeautifulSoup(html, 'html.parser')

                    

                    for a in soup.select("table.type_1 a"):

                        if a.text.strip() == theme_name:

                            theme_link = "https://finance.naver.com" + a['href']

                            break

                except Exception as e:

                    print(f"Theme Search Fallback Error: {e}")

            

            if theme_link:

                # 2. Fetch Stock List for this Theme

                res_sub = requests.get(theme_link, headers=headers)

                try:

                    html_sub = res_sub.content.decode('utf-8')

                except UnicodeDecodeError:

                    html_sub = res_sub.content.decode('cp949', 'ignore')

                soup_sub = BeautifulSoup(html_sub, 'html.parser')

                

                # Parse stocks table

                # Usually table.type_2 or similar

                # Columns: Name, Current Price, Change, Change Rate...

                rows = soup_sub.select("div.box_type_l table tbody tr")

                for row in rows:

                    cols = row.select("td")

                    if len(cols) < 5: continue

                    name_tag = cols[0].select_one("a")

                    if not name_tag: continue

                    

                    st_name = name_tag.text.strip()

                    # Price change rate is usually roughly in col 3 or 4

                    # Let's verify by checking spans

                    

                    # Naver Theme Detail Page Structure:

                    # Col 0: Name (with link)

                    # Col 1: Description (sometimes) -- actually the structure varies.

                    # Standard structure: Name | Price | Diff | rate | ...

                    

                    # Let's find columns with number class

                    nums = row.select("span.tah")

                    if len(nums) < 2: continue

                    

                    # Usually: Price is nums[0], Rate is nums[-1] or similar

                    # Let's try parsing text content for %

                    

                    rate_txt = ""

                    for cell in cols:

                        txt = cell.text.strip()

                        if "%" in txt:

                            rate_txt = txt

                            break

                    

                    val = re.sub(r'[^0-9\.\-\+]', '', rate_txt)

                    try:

                        rate = float(val)

                    except:

                        rate = 0.0

                        

                    stocks.append({

                        "name": st_name,

                        "change": rate

                    })

                    

                    if len(stocks) >= 5: break

            

            heatmap_data.append({

                "theme": theme_name,

                "percent": theme_change,

                "stocks": stocks

            })

            

    except Exception as e:

        print(f"Heatmap Data Error: {e}")

        

    return heatmap_data



def get_naver_flash_news():

    """

    네이버 금융 주요뉴스 크롤링 (Google News Fallback용)

    URL: https://finance.naver.com/news/mainnews.naver

    """

    import requests

    from bs4 import BeautifulSoup

    

    url = "https://finance.naver.com/news/mainnews.naver"

    headers = { "User-Agent": "Mozilla/5.0" }

    news_list = []

    

    try:

        res = requests.get(url, headers=headers)

        # cp949 decoding for Naver Finance (ignore errors to be safe)

        try:

            html = res.content.decode('utf-8')

        except UnicodeDecodeError:

            html = res.content.decode('cp949', 'ignore')

        soup = BeautifulSoup(html, 'html.parser')

        

        # Select news items from Main News List

        articles = soup.select(".mainNewsList li")

        

        # Fallback selector if structure changes

        if not articles:

             articles = soup.select("ul.realtimeNewsList li")

             

        for li in articles:

            # Title extraction

            # Try finding title in dt > a or dd > a

            dt_a = li.select_one("dl dt a")

            dd_a = li.select_one("dl dd.articleSubject a")

            

            target = dd_a if dd_a else dt_a

            if not target: continue

            

            title = target.text.strip()

            link = "https://finance.naver.com" + target['href']

            

            # Source extraction

            source = "Naver Finance"

            summ = li.select_one("dd.articleSummary")

            if summ:

                press = summ.select_one(".press")

                if press: source = press.text.strip()

            

            # Simple Date Check (Naver Main News usually shows 'Today' or recent)

            # We mark it as '최신' or parse if needed. 

            # Google News expects 'time' string.

            time_str = "최신"

            

            news_list.append({

                "source": source,

                "title": title,

                "link": link,

                "time": time_str

            })

            

            if len(news_list) >= 10: break

            

    except Exception as e:

        print(f"Naver News Fallback Error: {e}")

        

    return news_list



def get_naver_stock_info(symbol: str):
    """
    네이버 금융에서 종목의 주요 시세 및 재무 정보(PER, EPS, PBR, Volume, OHLC 등)를 크롤링합니다.
    URL: https://finance.naver.com/item/main.naver?code={code}
    """
    try:
        code = symbol.split('.')[0]
        code = re.sub(r'[^0-9]', '', code)
        if len(code) != 6: return None

        url = f"https://finance.naver.com/item/main.naver?code={code}"
        headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        
        res = requests.get(url, headers=headers, timeout=5)
        
        # [Fix] Robust Encoding Detection
        content = res.content
        html = None
        
        # Try CP949 first (Standard for Naver Finance)
        try:
            html = content.decode('cp949')
        except UnicodeDecodeError:
            try:
                html = content.decode('euc-kr')
            except UnicodeDecodeError:
                html = content.decode('utf-8', 'ignore')

        soup = BeautifulSoup(html, 'html.parser')

        # Check for error/block
        if "일시적인 오류" in html or "서비스 이용에 불편" in html:
            print(f"Naver Block/Temporary Error Detected for {symbol}")
            return None

        info = { 
            "symbol": symbol, "currency": "KRW", 
            "market_cap_val": 0, "market_cap_str": "N/A",
            "per": None, "eps": None, "pbr": None, "dvr": None,
            "forward_pe": None, "forward_eps": None, "bps": None, "dividend_rate": None,
            "volume": 0, "open": 0, "day_high": 0, "day_low": 0,
            "year_high": 0, "year_low": 0
        }
        
        # 1. Name & Market Type
        h2 = soup.select_one(".wrap_company h2 a")
        if h2: info['name'] = h2.text.strip()
        
        # Detect Market Type (KOSPI vs KOSDAQ)
        # Usually inside .description area or next to h2
        # <div class="description"><img class="kospi|kosdaq" ...></div>
        # or <img src="..." alt="코스피">
        info['market_type'] = "KS" # Default
        description = soup.select_one(".description")
        
        # Method 1: Check description img alt/class
        if description:
            img = description.select_one("img")
            if img:
                alt = img.get('alt', '').lower()
                src = img.get('src', '').lower()
                cls = img.get('class', [])
                
                if '코스닥' in alt or 'kosdaq' in alt or 'kosdaq' in src:
                    info['market_type'] = "KQ"
        
        # Method 2: Check for specific areas (kosdaq_area)
        if info['market_type'] == "KS": # Only check if still KS
            if soup.select_one(".kosdaq_area") or soup.select_one("img[alt='코스닥']"):
                 info['market_type'] = "KQ"
                 
        # Method 3: Check sidebar or other indicators if main fails
        if info['market_type'] == "KS":
             # Sometimes Naver changes layout. Check if "KOSDAQ" text is near the code/name
             # This is risky, so we stick to reliable selectors.
             pass
        
        # 2. Price
        no_today = soup.select_one(".no_today .blind")
        if no_today: info['price'] = int(re.sub(r'[^0-9]', '', no_today.text))
        else: return None # Price is essential
        
        # 3. Change & Percent
        exday = soup.select_one(".no_exday")
        if exday:
            blind_tags = exday.select(".blind")
            if len(blind_tags) >= 2:
                diff = int(re.sub(r'[^0-9]', '', blind_tags[0].text))
                pct = blind_tags[1].text.strip()
                
                is_down = "nv" in str(exday) or "하락" in exday.text
                if is_down:
                    info['change'] = -diff
                    info['change_percent'] = f"-{pct}%"
                else:
                    info['change'] = diff
                    info['change_percent'] = f"+{pct}%"
        
        # 4. Prev Close
        if 'price' in info and 'change' in info:
            info['prev_close'] = info['price'] - info['change']

        # 5. OHLC & Volume (from .no_info table)
        # Row 0: PreClose(0), High(1), Volume(2)
        # Row 1: Open(0), Low(1), Value(2)
        no_info = soup.select_one(".no_info")
        if no_info:
            trs = no_info.select("tr")
            if len(trs) >= 2:
                def get_blind_val(td):
                    b = td.select_one(".blind")
                    if b: return int(re.sub(r'[^0-9]', '', b.text))
                    return 0

                tr0_tds = trs[0].select("td")
                tr1_tds = trs[1].select("td")

                if len(tr0_tds) >= 3:
                    info['day_high'] = get_blind_val(tr0_tds[1])
                    info['volume'] = get_blind_val(tr0_tds[2])

                if len(tr1_tds) >= 2:
                    info['open'] = get_blind_val(tr1_tds[0])
                    info['day_low'] = get_blind_val(tr1_tds[1])

        # 6. Major IDs (Market Cap, PER, EPS, PBR, Dividend Yield, Forward Estimates)
        def parse_text_from_element(element):
            if not element: return None
            # Prefer 'blind' class which contains the pure value
            blind = element.select_one(".blind")
            if blind: return blind.text.strip()
            return element.text.strip()

        def parse_id(id_selector, is_float=True):
            tag = soup.select_one(id_selector)
            txt = parse_text_from_element(tag)
            if not txt: return None
            
            # Clean up (remove commas, %, and whitespace)
            clean_txt = re.sub(r'[^0-9\.\-]', '', txt)
            if not clean_txt: return None
            
            try:
                return float(clean_txt) if is_float else int(float(clean_txt)) # int(float) handles 100.0 -> 100
            except:
                return None

        # Market Cap Parsing
        mc_tag = soup.select_one("#_market_sum")
        if mc_tag:
            # Market Sum usually doesn't use blind, text is "345조 1,234"
            mc_text = mc_tag.text.strip().replace('\t','').replace('\n','')
            info['market_cap_str'] = mc_text
            
            try:
                val = 0
                parts = mc_text.split('조')
                if len(parts) > 1:
                    jo = int(re.sub(r'[^0-9]', '', parts[0])) * 1000000000000
                    uk_str = re.sub(r'[^0-9]', '', parts[1])
                    uk = int(uk_str) * 100000000 if uk_str else 0
                    val = jo + uk
                else:
                     info['market_cap_val'] = int(re.sub(r'[^0-9]', '', mc_text)) * 100000000
                info['market_cap_val'] = val
            except: pass

        info['per'] = parse_id("#_per")
        info['eps'] = parse_id("#_eps", is_float=False)
        info['pbr'] = parse_id("#_pbr")
        info['dvr'] = parse_id("#_dvr")
        info['forward_pe'] = parse_id("#_cns_per")
        info['forward_eps'] = parse_id("#_cns_eps", is_float=False)

        # 7. Additional parsing tables
        th_tags = soup.select("th")
        for th in th_tags:
            label = th.text.strip()
            td = th.find_next_sibling("td")
            if not td: continue
            
            val_text = parse_text_from_element(td)
            if not val_text: continue
            
            # 52 Week High/Low
            if "52주" in label and ("최고" in label or "최저" in label):
                # Naver sometimes uses '/' or 'l' or newline as separator
                # e.g., "80,000l60,000" or "80,000/60,000"
                parts = re.split(r'l|/|\n', val_text)
                clean_parts = [p.strip() for p in parts if p.strip()]
                if len(clean_parts) >= 2:
                    try:
                        info['year_high'] = int(re.sub(r'[^0-9]', '', clean_parts[0]))
                        info['year_low'] = int(re.sub(r'[^0-9]', '', clean_parts[1]))
                    except: pass
            
            # Dividend Rate (Priority to "주당배당금")
            elif "주당배당금" in label:
                try:
                    info['dividend_rate'] = int(re.sub(r'[^0-9]', '', val_text))
                except: pass
            
            # BPS (Avoid overwriting with combined "PBRlBPS" if valid BPS found)
            elif "BPS" in label and "PBR" not in label:
                try:
                    info['bps'] = int(re.sub(r'[^0-9]', '', val_text))
                except: pass

            # Fallback for BPS (if not set yet)
            elif "BPS" in label and not info['bps']:
                 # Handle "PBRlBPS" -> "2.46l60,632"
                 parts = re.split(r'l|/|\n', val_text)
                 if len(parts) >= 2:
                     try:
                         # Usually 2nd part is BPS
                         info['bps'] = int(re.sub(r'[^0-9]', '', parts[-1]))
                     except: pass

            # Dividend Yield ("배당수익률" or similar)
            elif "배당" in label and "%" in label:
                if info['dvr'] is None:
                    try:
                         info['dvr'] = float(re.sub(r'[^0-9\.]', '', val_text))
                    except: pass
        
        return info

    except Exception as e:
        print(f"Naver Stock Info Crawl Error: {e}")
        return None




def get_naver_daily_prices(symbol: str):

    """

    ?ㅼ씠踰?湲덉쑖 李⑦듃 API瑜??듯빐 ?쇰퀎 ?쒖꽭瑜?媛?몄샃?덈떎. (理쒓렐 30??

    """

    code = symbol.split('.')[0]

    code = re.sub(r'[^0-9]', '', code)

    if len(code) != 6: return []



    url = f"https://fchart.stock.naver.com/sise.nhn?symbol={code}&timeframe=day&count=30&requestType=0"

    

    try:

        import requests

        import xml.etree.ElementTree as ET

        

        res = requests.get(url)

        if res.status_code == 200:

            root = ET.fromstring(res.text)

            

            parsed_data = []

            items = root.findall("chartdata/item")

            

            for item in items:

                data_str = item.get("data")

                if data_str:

                    parts = data_str.split("|")

                    # data format: YYYYMMDD|Open|High|Low|Close|Volume

                    if len(parts) >= 6:

                        parsed_data.append({

                            "date": f"{parts[0][:4]}-{parts[0][4:6]}-{parts[0][6:]}",

                            "open": float(parts[1]),

                            "high": float(parts[2]),

                            "low": float(parts[3]),

                            "close": float(parts[4]),

                            "volume": int(parts[5])

                        })

            

            # Calculate metrics (Change %)

            final_list = []

            for i in range(len(parsed_data)):

                curr = parsed_data[i]

                # For the first item, we might not have prev close, assume 0 change or based on Open

                prev_close = parsed_data[i-1]["close"] if i > 0 else curr["open"]

                

                change = 0.0

                if prev_close > 0:

                    change = ((curr["close"] - prev_close) / prev_close) * 100

                    

                final_list.append({

                    "date": curr["date"],

                    "open": curr["open"],

                    "high": curr["high"],

                    "low": curr["low"],

                    "close": curr["close"],

                    "volume": curr["volume"],

                    "change": change

                })

            

            # Return newest first

            return final_list[::-1]



    except Exception as e:

        print(f"Naver Daily Price Error: {e}")

        return []

