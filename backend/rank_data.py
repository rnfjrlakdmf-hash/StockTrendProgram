import json
import re
import requests
from concurrent.futures import ThreadPoolExecutor

def is_v_garbled(s):
    """
    [v3.9.3] Centralized Whitelist Validator.
    Checks for replacement characters, garbage Latin-1, or invalid non-alphanumeric chars.
    """
    if not s or not isinstance(s, str): return True
    if "\ufffd" in s or "\u00c0" in s: return True
    if not s.strip(): return True
    
    # Pattern for clean stock names: Korean, English, Numbers, standard symbols
    clean_pattern = re.compile(r'[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s\(\)\[\]\.\&/\-\,\!\?\'\"]')
    if clean_pattern.search(s): return True
    return False

def get_world_stock_integration(reuters_codes):
    """
    [v6.1.0] Naver World Stock Integration API (Primary for Dashboard Sync)
    """
    if not reuters_codes:
        return {}
        
    codes_str = ",".join(reuters_codes)
    url = f"https://stock.naver.com/api/securityService/integration/price?foreignCodes={codes_str}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://stock.naver.com/',
        'Accept': 'application/json'
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            res.encoding = 'utf-8' # Force UTF-8 for US names
            data = res.json()
            result = {}
            # items are under 'foreign' or 'results' depending on schema
            items = data.get("foreign", {}) or data.get("result", {})
            for code, item in items.items():
                result[code] = item
            return result
    except Exception as e:
        print(f"World Stock Integration API Error: {e}")
    return {}

def get_world_stock_polling(reuters_codes):
    """[v6.1.0] Legacy Wrapper for get_world_stock_integration"""
    return get_world_stock_integration(reuters_codes)

def fetch_naver_search_top_api(market="USA"):
    """
    [v6.1.3] Naver Finance Real-time SearchTop API (Mobile front-api for 1:1 Parity)
    Corrects nationType mapping: overseas (USA/Global), domestic (KOR)
    """
    nation_type = "overseas" if market in ["USA", "Global"] else "domestic"
    # Mobile popularStock API is more accurate for search trends
    url = f"https://m.stock.naver.com/front-api/market/popularStock?nationType={nation_type}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.stock.naver.com/',
        'Accept': 'application/json'
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            res.encoding = 'utf-8'
            raw_data = res.json()
            data = raw_data.get("result", {})
            items = data.get("datas", []) or data.get("items", [])
            
            processed_items = []
            for item in items:
                sym = item.get("reutersCode") or item.get("symbolCode") or item.get("itemCode")
                name = item.get("stockName") or item.get("itemname")
                processed_items.append({
                    "symbol": sym,
                    "reutersCode": sym,
                    "name": name,
                    "stockName": name,
                    "itemname": name,
                    "ranking": item.get("ranking")
                })
            return processed_items
    except Exception as e:
        print(f"SearchTop Mobile API Error for {market}: {e}")
    return None

def get_naver_homepage_popular_search(market="USA"):
    """
    [v5.9.1] Wrapper to maintain backward compatibility but use the better API.
    """
    return fetch_naver_search_top_api(market)

# 캐싱을 위한 전역 변수 (간단한 인메모리 캐시)
CACHE_TOP10 = {
    "KR": {"data": [], "timestamp": 0},
    "US": {"data": [], "timestamp": 0}
}
CACHE_DURATION = 15  # 15초
CACHE_US_ETFS = {"data": [], "timestamp": 0}
CACHE_US_ETFS_DURATION = 600 # 10분 (미국 ETF는 자주 안 바뀌어도 됨)

# [New] Global Ranking Cache
CACHE_GLOBAL_RANKING = {}
CACHE_GLOBAL_RANKING_DURATION = 10 # 10초 (실시간성 강화)

def fix_mojibake(text):
    """
    [v3.8.0] State-of-the-Art Mojibake Recovery Engine.
    Handles legacy CP949 strings erroneously embedded in UTF-8 JSON.
    """
    if not text or not isinstance(text, str): return text
    
    # Check if the string already contains valid Korean characters (Hangul Syllables)
    has_hangul = any(0xAC00 <= ord(c) <= 0xD7A3 for c in text)
    has_garbage = any(ord(c) == 65533 or (0x0080 <= ord(c) <= 0x00FF) for c in text) or "\ufffd" in text or "\u00c0" in text
    
    # Fix potential variable name error from previous version's logic
    if "\ufffd" in text or "\u00c0" in text: has_garbage = True

    # If it has garbage chars but No Hangul, OR just looks suspicious
    if has_garbage or not has_hangul:
        try:
            # [v3.9.2] Strategy: Try UTF-8 first for clean domestic data, then fallback to CP949 for legacy global data
            # UTF-8 is much more structured and less likely to false-positive than CP949.
            repaired = text.encode('iso-8859-1').decode('utf-8')
            if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                return repaired
        except: pass

        try:
            repaired = text.encode('iso-8859-1').decode('cp949')
            if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                return repaired
        except: pass
        
        try:
            # Final alternative for complex nested cases
            repaired = text.encode('utf-8', 'ignore').decode('cp949', 'ignore')
            if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                return repaired
        except: pass

    return text.replace("\ufffd", "")

def get_realtime_top10(market="KR", refresh=False):
    """
    KOSPI(국내) 및 S&P500(미국) 시가총액 상위 10개 실시간 시세 조회
    market: 'KR' or 'US'
    refresh: True면 캐시 무시하고 강제 업데이트
    """
    global CACHE_TOP10
    import time
    
    current_time = time.time()
    # refresh가 아니고 데이터가 있으면 즉시 반환 (속도 최적화)
    if not refresh and market in CACHE_TOP10 and CACHE_TOP10[market].get("data"):
        return CACHE_TOP10[market]["data"]

    # 1. 종목 리스트 확보
    symbols = []
    
    if market == "KR":
        # 네이버 금융 등에서 크롤링하거나 고정 리스트 사용
        # 안정성을 위해 주요 대형주 고정 리스트 사용 (유지보수 용이)
        # 삼성전자, SK하이닉스, LG에너지솔루션, 삼성바이오로직스, 현대차, 기아, 셀트리온, KB금융, POSCO홀딩스, NAVER
        # 코스피 시총 상위 10 (2024 기준)
        symbols = [
            {"ticker": "005930.KS", "name": "삼성전자"},
            {"ticker": "000660.KS", "name": "SK하이닉스"},
            {"ticker": "373220.KS", "name": "LG에너지솔루션"},
            {"ticker": "207940.KS", "name": "삼성바이오로직스"},
            {"ticker": "005380.KS", "name": "현대차"},
            {"ticker": "000270.KS", "name": "기아"},
            {"ticker": "068270.KS", "name": "셀트리온"},
            {"ticker": "105560.KS", "name": "KB금융"},
            {"ticker": "005490.KS", "name": "POSCO홀딩스"},
            {"ticker": "035420.KS", "name": "NAVER"}
        ]
        
    elif market == "US":
        # 미국 대형 기술주 위주 (S&P 500 Top)
        # 네이버 금융 엔진과의 호환성을 위해 접미사(.O, .N) 포함하여 정의
        symbols = [
            {"ticker": "AAPL.O", "name": "Apple"},
            {"ticker": "MSFT.O", "name": "Microsoft"},
            {"ticker": "NVDA.O", "name": "NVIDIA"},
            {"ticker": "GOOGL.O", "name": "Alphabet (Google)"},
            {"ticker": "AMZN.O", "name": "Amazon"},
            {"ticker": "META.O", "name": "Meta"},
            {"ticker": "TSLA.O", "name": "Tesla"},
            {"ticker": "BRK-B.N", "name": "Berkshire Hathaway"},
            {"ticker": "LLY.N", "name": "Eli Lilly"},
            {"ticker": "AVGO.O", "name": "Broadcom"}
        ]
    
    # 2. 병렬로 데이터 가져오기 (속도 개선)
    results = []
    
    # [New] 통합 데이터 조회 함수 사용 (네이버 우선 -> yfinance Fallback)
    from stock_data import get_simple_quote

    def fetch_data(item):
        try:
            ticker = item['ticker']
            
            # get_simple_quote는 {"price": "75,000", "change": "+500", "change_percent": "+0.67%"} 형태 반환
            quote = get_simple_quote(ticker)
            
            if quote and quote.get("price") and quote.get("price") not in ["0", "-", "N/A"]:
                # 문자열 데이터를 float로 변환 (계산 및 정렬 용도)
                try:
                    price_str = str(quote["price"]).replace(",", "").replace("₩", "").replace("$", "").strip()
                    if not price_str: price_str = "0"
                    price = float(price_str)
                    
                    # Fix: quote['change'] contains the percentage string (e.g. "+0.47%")
                    # quote['change_percent'] is missing in simple quotes
                    
                    raw_change = str(quote.get("change", "0")).replace(",", "").replace("+", "").replace("▲", "").replace("▼", "").replace("%", "").strip()
                    if not raw_change: raw_change = "0"
                    
                    val = float(raw_change)
                    
                    if str(quote.get("change", "")).startswith("-") or "▼" in str(quote.get("change", "")):
                        val = -abs(val)
                        
                    # Assign parsed percentage
                    change_pct = val
                    
                    # Calculate estimated absolute change for compatibility
                    change_val = price * (change_pct / 100.0)

                    # [Add] KRW Conversion
                    price_krw = None
                    try:
                        from korea_data import get_exchange_rate
                        rate = get_exchange_rate()
                        price_krw = f"{price * rate:,.0f}"
                    except: pass

                    return {
                        "rank": 0, 
                        "symbol": item['ticker'],
                        "name": item['name'],
                        "price": price,
                        "price_krw": price_krw,
                        "change": f"{change_pct:.2f}%",  # Format as string for frontend compatibility
                        "change_value": change_val,
                        "change_percent": change_pct
                    }

                except Exception as e:
                    # Parsing failed
                    print(f"Rank Parsing Failed for {ticker}: {e}")
                    return {
                        "rank": 0, "symbol": item['ticker'], "name": item['name'],
                        "price": 0.0, "change": "0.00%", "change_value": 0.0, "change_percent": 0.0
                    }
            else:
                return {
                    "rank": 0, "symbol": item['ticker'], "name": item['name'],
                    "price": 0.0, "change": "0.00%", "change_value": 0.0, "change_percent": 0.0
                }
        
        except Exception as e:
            print(f"Error fetching {item['ticker']}: {e}")
            return {
                "rank": 0, "symbol": item['ticker'], "name": item['name'],
                "price": 0.0, "change": "0.00%", "change_value": 0.0, "change_percent": 0.0
            }

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_data, item) for item in symbols]
        for future in futures:
            try:
                res = future.result(timeout=10)
                if res and res['price'] > 0: # Filter out zeros
                    results.append(res)
            except Exception as e:
                pass
    
    # 3. 시가총액 순이 아닐 수 있으므로 (미국장은 순동이 심함), 가격순? 아니면 고정 리스트 순서대로?
    # 요청은 "1위부터 10위까지" 이므로 시가총액 데이터를 같이 가져와서 정렬하면 좋겠지만, 
    # fast_info에는 market_cap이 정확치 않을 수 있음. 
    # 여기서는 "주요 종목 Top 10"으로 정의하고, 입력된 순서(대략적 시총순)를 유지하여 랭킹 부여
    # 단, 미국 주식 리스트는 수시로 바뀔 수 있음. 일단 위 고정 리스트 순서대로 랭크 부여.
    
    # 결과 순서 맞추기 (입력 리스트 순서대로)
    # (병렬 처리로 순서 섞일 수 있으므로 매핑 필요)
    
    # 3. 결과 매핑 및 랭킹 부여 (데이터가 없어도 리스트는 유지하여 프론트엔드 에러 방지)
    final_list = []
    
    # 결과를 딕셔너리로 변환하여 찾기 쉽게 함
    results_map = {r['symbol']: r for r in results}
    
    rank = 1
    for item in symbols:
        ticker_symbol = item['ticker']
        
        if ticker_symbol in results_map:
            # 데이터 성공적으로 가져옴
            data = results_map[ticker_symbol]
            data['rank'] = rank
            final_list.append(data)
        else:
            # 실패 시 Fallback 데이터 생성 (화면에라도 표시되게)
            final_list.append({
                "rank": rank,
                "symbol": ticker_symbol,
                "name": item['name'],
                "price": 0.0,
                "change": 0.0,
                "change_percent": 0.0
            })
        rank += 1
            
    if final_list:
        CACHE_TOP10[market] = {
            "data": final_list,
            "timestamp": current_time
        }
            
    return final_list

def get_market_movers(market="KR"):
    """
    Fetch Top 5 Gainers and Losers.
    Priority: KIS API (Real-time) > Naver/Yahoo (Fallback)
    """
    # 1. Try KIS API (Only for KR and if configured)
    if market == "KR":
        try:
            # Try to get global client or use env vars
            import os
            app_key = os.getenv("KIS_APP_KEY")
            secret = os.getenv("KIS_APP_SECRET")
            account = os.getenv("KIS_ACCOUNT")
            
            if app_key and secret:
                from kis_api import KisApi
                # New instance created, but access_token is now cached at class level!
                # So this is fast.
                kis = KisApi(app_key, secret, account)
                
                # Fetch Gainers (0) and Losers (1)
                gainers = kis.get_fluctuation_rank("0")
                if not gainers:
                     # If KIS fails or empty, fallback to Naver
                     pass
                else:
                    losers = kis.get_fluctuation_rank("1")
                    
                    if gainers or losers:
                        return {
                            "gainers": gainers,
                            "losers": losers
                        }
                # If we are here, it means KIS was configured but returned no data/fail.
                # Fallback to Naver.
        except Exception as e:
            # print(f"KIS Ranking Error: {e}")
            pass

        # 2. Fallback: Naver Finance Crawling
        return crawl_naver_movers()
        
    elif market == "US":
        # Yahoo Finance
        return fetch_yahoo_movers()
        
    return {"gainers": [], "losers": []}

def crawl_naver_movers():
    """Crawl Naver Finance for Top/Bottom 5"""
    import requests
    from bs4 import BeautifulSoup
    
    headers = {"User-Agent": "Mozilla/5.0"}
    
    def parse_naver_rank(url):
        data = []
        try:
            res = requests.get(url, headers=headers, timeout=3)
            try:
                html = res.content.decode('euc-kr') 
            except:
                html = res.text
            soup = BeautifulSoup(html, 'html.parser')
            
            # .type_2 table
            # .type_2 table (Relaxed selector)
            rows = soup.select("table.type_2 tr")
            rank = 1
            for row in rows:
                cols = row.select("td")
                if len(cols) < 5: continue
                
                # Rank check (sometimes no rank col?)
                # Usually Naver Sise Rise page: No, Name, Price, Diff, Rate...
                try:
                    name_tag = cols[1].select_one("a")
                    if not name_tag: continue
                    name = name_tag.text.strip()
                    
                    price_str = cols[2].text.strip().replace(",", "")
                    price = int(price_str) if price_str.isdigit() else 0
                    
                    change_rate_str = cols[4].text.strip().replace("%", "").strip()
                    change_rate = float(change_rate_str)
                    
                    # Symbol?
                    href = name_tag['href']
                    import re
                    match = re.search(r'code=(\d+)', href)
                    symbol = match.group(1) if match else ""
                    
                    data.append({
                        "rank": rank,
                        "symbol": symbol,
                        "name": name,
                        "price": price,
                        "change": f"{change_rate:.2f}%", 
                        "change_rate": change_rate
                    })
                    rank += 1
                    if rank > 5: break
                except:
                    continue
            return data
        except:
            return []

    # Rise
    gainers = parse_naver_rank("https://finance.naver.com/sise/sise_rise.naver?sosok=0") # KOSPI only? Or 0=KOSPI, 1=KOSDAQ
    # Fall
    losers = parse_naver_rank("https://finance.naver.com/sise/sise_fall.naver?sosok=0")
    
    return {"gainers": gainers, "losers": losers}

def fetch_yahoo_movers():
    """Fetch US Movers from Yahoo"""
    # Using predefined lists or screener?
    # yfinance has `get_day_gainers`? No.
    # Hack: Use a few known volatile tech stocks or just simple hardcoded list for now?
    # User expects REAL ranking.
    # Yahoo generic screener URL is blocked often?
    # Try fetching a fixed list of popular stocks and sorting them? (Poor man's ranking)
    # Better: Use `get_realtime_top10` pool and sort it? 
    # Or just use yfinance Top Gainers logic if available (it isn't easy).
    
    # Alternative: Use "simulated" ranking from our TOP 10 US watch list
    # Fetch TOP 10 + others and sort.
    
    # For now, let's reuse get_realtime_top10("US") and sort by change
    # It's only 10 items but it's something.
    # To be better, we need a bigger pool.
    
    data = get_realtime_top10("US", refresh=True)
    if not data: return {"gainers": [], "losers": []}
    
    # Sort
    sorted_data = sorted(data, key=lambda x: x.get('change_percent', 0), reverse=True)
    
    gainers = []
    losers = []
    
    for i, item in enumerate(sorted_data[:5]):
        item['rank'] = i + 1
        gainers.append(item)
        
    for i, item in enumerate(sorted_data[-5:]): # Last 5, reversed for losers (biggest drop first)
        # Deep copy to modify rank without affecting original list if reused?
        l_item = item.copy()
        l_item['rank'] = i + 1
        losers.append(l_item)
        
    # Correct order for losers (Worst first)
    losers.sort(key=lambda x: x.get('change_percent', 0))
    # Re-rank
    for i, item in enumerate(losers):
        item['rank'] = i + 1
        
    return {"gainers": gainers, "losers": losers}

def get_global_ranking(market="KOSPI", category="trading_volume"):
    """
    [v5.1.0-Fixed] Global Dashboard Ranking Engine (Using stock.naver.com API)
    market: KOSPI, KOSI, KOSDAQ, USA, CHINA (CHN), HONG_KONG (HKG), JAPAN (JPN), VIETNAM (VNM)
    category: trading_volume (quantTop), trading_amount (priceTop), popular_search (searchTop)
    """
    import requests
    import time
    
    # [v3.5.5] Cache key prefix to flush old poisoned or shifted data
    cache_key = f"v3.5.5_{market}_{category}"
    now = time.time()
    
    if cache_key in CACHE_GLOBAL_RANKING:
        cached = CACHE_GLOBAL_RANKING[cache_key]
        if now - cached['timestamp'] < CACHE_GLOBAL_RANKING_DURATION:
            return cached['data']

    # Nation/Category Mapping
    nation_map = {
        "KOSPI": "KOR", "KOSDAQ": "KOR", "KOR": "KOR", "KOSI": "KOR",
        "USA": "USA", "CHINA": "CHN", "CHN": "CHN",
        "HONG_KONG": "HKG", "HKG": "HKG",
        "JAPAN": "JPN", "JPN": "JPN",
        "VIETNAM": "VNM", "VNM": "VNM"
    }
    cat_map = {
        "trading_volume": "quantTop",
        "trading_amount": "priceTop",
        "popular_search": "searchTop"
    }
    
    nation = nation_map.get(market, "USA")
    order_type = cat_map.get(category, "quantTop")

    # Currency/Rate Mapping
    currency_map = {"KOR": "KRW", "USA": "USD", "CHN": "CNY", "HKG": "HKD", "JPN": "JPY", "VND": "VND"}
    symbol_map = {"KRW": "₩", "USD": "$", "CNY": "¥", "HKD": "$", "JPY": "¥", "VND": "₫"}
    
    currency = currency_map.get(nation, "USD")
    symbol_prefix = symbol_map.get(currency, "$")
    
    rate = 1.0
    if currency != "KRW":
        try:
            from korea_data import get_exchange_rate
            rate = get_exchange_rate(currency)
        except:
            pass

    # Standard Browser Headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finance.naver.com/',
        'Accept': 'application/json, text/plain, */*'
    }
    
    # [v6.1.1] Homepage Visual Parity Mode
    if order_type == "searchTop":
        # USA or Fallback SearchTop (Domestic KR will fall through to precision logic below)
        if nation != "KOR":
            home_items = fetch_naver_search_top_api(nation)
            if home_items:
                processed = []
                symbols_to_poll = []
                for i, item in enumerate(home_items[:10]):
                    sym = item.get("reutersCode") or item.get("symbolCode") or item.get("symbol")
                    name = item.get("stockName") or item.get("name")
                    processed.append({
                        "rank": i + 1, "symbol": sym, "name": name,
                        "price": "0", "change_val": 0, "change_percent": "0.00%",
                        "risefall": 3, "market": market
                    })
                    if sym: symbols_to_poll.append(sym)
                    
                # Batch enrichment for accurate pricing
                if symbols_to_poll:
                    polling_data = get_world_stock_integration(symbols_to_poll)
                    if polling_data:
                        rate = get_exchange_rate("USD")
                        for p in processed:
                            info = polling_data.get(p["symbol"])
                            if info:
                                p["name"] = info.get("stockName") or p["name"]
                                price_val = info.get("currentPrice") or info.get("closePrice") or p["price"]
                                p["price"] = price_val
                                # [v6.1.3] Precision Percentage Calculation Sync
                                try:
                                    f_rate = float(info.get('fluctuationsRatio', 0))
                                    # Handle cases where ratio mapping might be shifted or absolute
                                    p["change_percent"] = f"{f_rate:+.2f}%"
                                except:
                                    p["change_percent"] = "0.00%"
                                
                                # [v6.1.4] Accurate Change Mapping (Prioritize raw fluctuations from API)
                                raw_fluct = info.get("fluctuations") or info.get("compareToPreviousClosePrice")
                                if raw_fluct is not None and str(raw_fluct) not in ["0", ""]:
                                    p["change_val"] = raw_fluct
                                else:
                                    # Backup calculation if raw fluctuations are missing
                                    try:
                                        pct = float(info.get('fluctuationsRatio', 0))
                                        curr_p = float(str(price_val).replace(',', ''))
                                        if curr_p > 0 and pct != 0:
                                            # Correct formula for net change from current price and ratio
                                            # change = current_price * (ratio / (100 + ratio))
                                            p["change_val"] = curr_p * (pct / (100.0 + pct))
                                    except:
                                        p["change_val"] = 0

                                p["risefall"] = 2 if float(info.get('fluctuationsRatio', 0)) > 0 else (5 if float(info.get('fluctuationsRatio', 0)) < 0 else 3)
                                
                                # [v6.1.2] Advanced KRW Conversion & Mirroring
                                try:
                                    f_p = float(str(price_val).replace(',', ''))
                                    if f_p > 0:
                                        p["price_krw"] = f"{f_p * rate:,.0f}"
                                    else:
                                        p["price_krw"] = "0"
                                except:
                                    p["price_krw"] = "0"
                
                if processed:
                    # [v6.1.2] Force 10 items padding for UI stability
                    while len(processed) < 10:
                        processed.append({
                            "rank": len(processed) + 1, "symbol": "-", "name": "-",
                            "price": "0", "change_val": 0, "change_percent": "0.00%",
                            "risefall": 3, "market": market, "price_krw": "0"
                        })
                    CACHE_GLOBAL_RANKING[cache_key] = {"data": processed, "timestamp": now}
                    return processed

    # [v6.1.1] Precision Mirroring Source (Reverted to stable default API for KR)
    if nation == "KOR":
        url = f"https://stock.naver.com/api/domestic/market/stock/default?tradeType=KRX&marketType=ALL&orderType={order_type}&startIdx=0&pageSize=10"
    else:
        if order_type == "searchTop":
            # [v6.0.1] US SearchTop with category parameters for 1:1 match
            url = f"https://stock.naver.com/api/domestic/market/searchTop?nationType={nation}&category1=STOCK_FOREIGN&category3=END_HIT&startIdx=0&pageSize=10"
        else:
            # For Volume/Amount top in Global markets
            url = f"https://stock.naver.com/api/foreign/market/stock/global?nation={nation}&tradeType=ALL&orderType={order_type}&startIdx=0&pageSize=10"
            
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            return []
            
        # [v3.9.3] Ultimate Hybrid Mirrored Decoding
        try:
            # We try standard UTF-8 first
            decoded_content = res.content.decode('utf-8')
            raw_data = json.loads(decoded_content)
        except:
            try:
                res.encoding = 'cp949'
                raw_data = res.json()
            except:
                return []
        
        items = []
        if isinstance(raw_data, list):
            items = raw_data
        elif isinstance(raw_data, dict):
            items = raw_data.get("items") or raw_data.get("stocks") or raw_data.get("result")
            if items is None and "result" in raw_data:
                items = raw_data["result"].get("items") or raw_data["result"].get("stocks")
                if isinstance(items, dict): # Handle result.items
                     items = items.get("items") or items.get("stocks")
            
        if not items:
            return []
            
        processed = []
        for i, item in enumerate(items[:10]):
            # Improved repair: only try if the string looks like Mojibake
            def repair(s):
                if not s or not isinstance(s, str): return s
                # If it already has valid Korean, DON'T touch it!
                if any(0xAC00 <= ord(c) <= 0xD7A3 for c in s): return s
                
                # [v3.9.6] Advanced Mojibake Recovery
                try:
                    # Strategy 1: Latin-1 -> UTF-8
                    repaired = s.encode('iso-8859-1').decode('utf-8', 'ignore')
                    if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                        return repaired
                except: pass

                try:
                    # Strategy 2: Latin-1 -> CP949
                    repaired = s.encode('iso-8859-1').decode('cp949', 'ignore')
                    if any(0xAC00 <= ord(c) <= 0xD7A3 for c in repaired):
                        return repaired
                except: pass
                
                # [v5.7.0] Fallback to manual map if still garbled
                clean_sym = item.get("itemcode") or item.get("reutersCode") or ""
                if clean_sym:
                    clean_sym = clean_sym.split('.')[0]
                    # us_name_map is defined later in enrich_item, so we might need a global or local access
                    # For now, we rely on the later enrichment pass which is more robust.
                
                return s

            if nation == "KOR":
                # Domestic Schema (Stable default API)
                symbol = item.get("itemcode") or item.get("itemCode")
                name = repair(item.get("itemname") or item.get("stockName"))
                price = item.get("nowPrice") or item.get("closePrice")
                change_rate = item.get("prevChangeRate") or item.get("fluctuationsRatio")
                change_val = item.get("prevChangePrice") or item.get("compareToPreviousClosePrice")
                
                # risefall mapping
                risefall = item.get("upDownGb") or 3
                if isinstance(risefall, dict):
                    risefall = int(risefall.get("code", 3))
                    
                volume = item.get("tradeVolume") or item.get("accumulatedTradingVolume")
                amount = item.get("tradeAmount") or item.get("accumulatedTradingValue")
            else:
                # Foreign or SearchTop (USA) Schema
                symbol = item.get("reutersCode") or item.get("symbolCode") or item.get("itemcode")
                
                # [v3.8.2] Precision Field Recovery
                # searchTop API uses koreanCodeName, global API uses stockName/itemname
                k_name = repair(item.get("koreanCodeName") or item.get("itemname") or item.get("stockName") or item.get("itemName"))
                e_name = repair(item.get("englishCodeName") or item.get("englishName"))
                
                # Priority: Valid Korean Name > Valid English Name > Symbol
                if not is_v_garbled(k_name):
                    name = k_name
                elif not is_v_garbled(e_name):
                    name = e_name
                else:
                    name = symbol
                
                # Final fallback for SearchTop items that might need STOCK_MAP
                if (not name or name == symbol) and nation == "KOR":
                    try:
                        from stock_names import STOCK_MAP
                        for k, v in STOCK_MAP.items():
                            if v == symbol:
                                name = k
                                break
                    except: pass

                if order_type == "searchTop" and nation != "KOR":
                    # USA SearchTop API lacks real-time price fields in the list view response often.
                    price = item.get("currentPrice") or item.get("nowPrice") or item.get("closePrice")
                    change_rate = item.get("fluctuationsRatio") or item.get("prevChangeRate") or item.get("changeRate")
                    change_val = item.get("compareToPreviousClosePrice") or item.get("prevChangePrice")
                    risefall = item.get("risefall") or item.get("upDownGb") or 3
                    volume = item.get("accumulatedTradingVolume") or item.get("tradeVolume")
                    amount = item.get("sumCount") # Map sumCount for SearchTop
                else:
                    price = item.get("currentPrice") or item.get("nowPrice")
                    change_rate = item.get("fluctuationsRatio") or item.get("prevChangeRate") or item.get("changeRate")
                    change_val = item.get("compareToPreviousClosePrice") or item.get("prevChangePrice")
                    risefall = item.get("risefall") or item.get("upDownGb")
                    volume = item.get("accumulatedTradingVolume") or item.get("tradeVolume")
                    amount = item.get("accumulatedTradingValue") or item.get("tradeAmount")

            # [TurboQuant KRW Conversion]
            f_price = 0.0
            try:
                ps = str(price).replace(",", "").strip()
                f_price = float(ps) if ps and ps != "-" else 0.0
            except: pass
            
            price_krw = None
            if nation != "KOR" and f_price > 0:
                price_krw = f"{f_price * rate:,.0f}"

            # Baseline Data Preservation
            processed.append({
                "rank": i + 1,
                "symbol": symbol,
                "name": name,
                "price": price if price and price != "-" else "0", 
                "price_krw": price_krw,
                "change_val": change_val or 0,
                "change_percent": f"{float(change_rate):+.2f}%" if change_rate and str(change_rate).replace('.','').replace('-','').isdigit() else "0.00%",
                "risefall": risefall,
                "volume": volume,
                "amount": amount,
                "market": market,
                "price_krw": price_krw or "0" # Ensure field exists
            })

        # [v6.0.0] High-Precision Integration Sync for Foreign Stocks (Especially SearchTop)
        if nation != "KOR" and processed:
            symbols_to_poll = [p["symbol"] for p in processed if p.get("symbol")]
            polling_data = get_world_stock_integration(symbols_to_poll)
            
            if polling_data:
                for p in processed:
                    sym = p["symbol"]
                    if sym in polling_data:
                        info = polling_data[sym]
                        # 1:1 Mirroring with integration/price API
                        # Fix encoding: stockName in integration/price often comes correctly but might be garbled by our repair
                        p_name = info.get("stockName")
                        if p_name and not is_v_garbled(p_name):
                             p["name"] = p_name
                        elif info.get("koreanCodeName"):
                             p["name"] = info.get("koreanCodeName")
                             
                        p["price"] = info.get("currentPrice") or info.get("closePrice") or p["price"]
                        
                        f_rate = info.get("fluctuationsRatio")
                        if f_rate is not None:
                            p["change_percent"] = f"{float(f_rate):+.2f}%"
                        
                        p["change_val"] = info.get("fluctuations") or info.get("compareToPreviousClosePrice") or p["change_val"]
                        
                        # Update KRW if price changed
                        try:
                            f_p = float(str(p["price"]).replace(",", ""))
                            if f_p > 0 and currency != "KRW":
                                p["price_krw"] = f"{f_p * rate:,.0f}"
                        except: pass
            
        # [v5.6.0] Universal Enrichment to fix Naver API Shift/NaN/Precision bugs
        if processed:
            from stock_data import get_simple_quote
            from concurrent.futures import ThreadPoolExecutor
            
            def enrich_item(p_item):
                sym = p_item["symbol"]
                if not sym or sym == "-": return p_item
                
                # Fetch real-time data from mobile API to override unreliable list API
                quote = get_simple_quote(sym)
                if quote:
                    # 1. Name Enrichment (Only if new name is valid and better)
                    new_name = quote.get("name")
                    if new_name and not is_v_garbled(new_name) and new_name != sym and len(str(new_name)) > 1:
                        p_item["name"] = new_name
                    
                    # [v3.8.5] Expanded US/Global Name Translation Map
                    clean_sym = sym.split('.')[0] if '.' in sym else sym
                    us_name_map = {
                        "NVDA": "엔비디아", "TSLA": "테슬라", "AAPL": "애플", 
                        "MSFT": "마이크로소프트", "AMZN": "아마존", "GOOGL": "알파벳A",
                        "PLTR": "팔란티어", "META": "메타", "AVGO": "브로드컴",
                        "MSTR": "마이크로스트래티지", "SMCI": "슈퍼마이크로컴퓨터",
                        "IONQ": "아이온큐", "SOXL": "세배 반도체 레버리지", "TQQQ": "세배 나스닥 레버리지",
                        "SQQQ": "세배 나스닥 인버스", "TSLL": "테슬라 2배 레버리지", "NVDL": "엔비디아 2배",
                        "SMR": "뉴스케일 파워", "OKLO": "오클로", "VIX": "공포지수", 
                        "CONL": "코인베이스 2배", "MSTX": "마이크로스트래티지 1.75배",
                        "SCHD": "슈왑 배당주 ETF", "JEPI": "제이피모건 커버드콜",
                        "MU": "마이크론", "SNDK": "샌디스크", "AIXI": "아이엑시스", 
                        "CRCL": "써클", "ARM": "ARM 홀딩스"
                    }
                    
                    if is_v_garbled(p_item["name"]) or p_item["name"] == sym or ".O" in p_item["name"] or ".N" in p_item["name"]:
                        if clean_sym in us_name_map:
                            p_item["name"] = us_name_map[clean_sym]
                        elif sym in us_name_map:
                            p_item["name"] = us_name_map[sym]
                    
                    # 2. Price Enrichment (Only if positive and valid)
                    q_price_str = str(quote.get("price", "0")).replace(",", "")
                    try:
                        q_price = float(q_price_str)
                        if q_price > 0:
                            p_item["price"] = quote["price"]
                            # Update KRW (Robust Conversion)
                            if currency != "KRW":
                                p_item["price_krw"] = f"{q_price * rate:,.0f}"
                            else:
                                p_item["price_krw"] = "0"
                    except:
                        p_item["price_krw"] = p_item.get("price_krw") or "0"
                    
                    # 3. Change & Precision Enrichment (Selective)
                    q_change = quote.get("change")
                    if q_change and q_change not in ["0.00%", "0.0%"] and ("+" in q_change or "-" in q_change):
                         # [v6.1.2] Favor existing (widget) change_percent if it looks valid
                         if not p_item.get("change_percent") or p_item["change_percent"] in ["0.00%", "0.0%", "0%"]:
                             p_item["change_percent"] = q_change
                         
                         # [v6.1.4] Corrected Change Value logic (Prioritize raw metadata)
                         raw_fluct = quote.get("change_val") or quote.get("fluctuations")
                         if raw_fluct and str(raw_fluct) not in ["0", ""]:
                             try:
                                 val = float(str(raw_fluct).replace(",", ""))
                                 if quote.get("risefall_name") == 'FALLING': val = -abs(val)
                                 p_item["change_val"] = int(val) if nation == "KOR" else val
                             except: pass
                         else:
                             # Calculation fallback if raw data missing
                             try:
                                 pct_val = float(str(p_item["change_percent"]).replace("%", "").replace("+", "").strip())
                                 price_val = float(str(p_item["price"]).replace(",", ""))
                                 if price_val > 0 and pct_val != 0:
                                     p_item["change_val"] = round(price_val * (pct_val / (100.0 + pct_val)), 4)
                             except: pass
                         
                         # Parse risefall from quote if available
                         if quote.get("risefall_name"):
                             p_item["risefall"] = 2 if quote.get("risefall_name") == 'RISING' else (5 if quote.get("risefall_name") == 'FALLING' else 3)
                return p_item

            with ThreadPoolExecutor(max_workers=5) as executor:
                processed = list(executor.map(enrich_item, processed))

        # [v6.1.2] Final Safeguard: Always ensure exactly 10 items for visual parity
        if processed:
            while len(processed) < 10:
                processed.append({
                    "rank": len(processed) + 1, "symbol": "-", "name": "-",
                    "price": "0", "change_val": 0, "change_percent": "0.00%",
                    "risefall": 3, "market": market, "price_krw": "0"
                })
            # Trim if somehow more (unlikely)
            processed = processed[:10]

        if processed:
            CACHE_GLOBAL_RANKING[cache_key] = {
                "data": processed,
                "timestamp": now
            }
            
        return processed
        
    except Exception as e:
        print(f"Global Ranking API Error ({market}/{category}): {e}")
        return []

def get_naver_ranking(market="krx", rank_type="quant"):
    """
    네이버 금융 TOP종목 영역을 파싱합니다.
    market: krx 또는 nxt
    rank_type: quant(거래상위), rise(상승), fall(하락), market_sum(시가총액상위)
    """
    import requests
    from bs4 import BeautifulSoup
    import re

    # [New] 인기 검색어 처리
    if rank_type == "popular":
        url = "https://finance.naver.com/sise/lastsearch2.naver"
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            res = requests.get(url, headers=headers, timeout=5)
            try:
                html = res.content.decode('euc-kr') 
            except:
                html = res.text
            
            soup = BeautifulSoup(html, 'html.parser')
            rows = soup.select("table.type_5 tr")
            
            data = []
            rank = 1
            for row in rows:
                cols = row.select("td")
                
                # 순위(0), 종목명(1), 검색비율(2), 현재가(3), 전일비(4), 등락률(5)
                if len(cols) < 6: continue
                
                no_td = cols[0].text.strip()
                if not no_td.isdigit(): continue
                
                name_tag = cols[1].select_one("a.tltle")
                if not name_tag: continue
                name = name_tag.text.strip()
                
                href = name_tag.get('href', '')
                match = re.search(r'code=(\d+)', href)
                symbol = match.group(1) if match else ""
                
                price_str = cols[3].text.strip().replace(",", "")
                price = int(price_str) if price_str.isdigit() else 0
                
                change_rate_str = cols[5].text.strip()
                change_rate = 0.0
                try:
                    val_str = change_rate_str.replace("%", "").replace("+", "").strip()
                    if val_str.replace(".", "", 1).replace("-", "", 1).isdigit():
                        change_rate = float(val_str)
                        if "-" in change_rate_str:
                            change_rate = -abs(change_rate)
                except:
                    pass
                
                data.append({
                    "rank": rank,
                    "symbol": symbol,
                    "name": name,
                    "price": price,
                    "change": change_rate_str,
                    "change_percent": change_rate
                })
                
                rank += 1
                if rank > 10: break
                
            return data
        except Exception as e:
            print(f"Error parsing Naver popular searches: {e}")
            return []

    base_url = "https://finance.naver.com/sise/"
    prefix = "nxt_" if market == "nxt" else ""
    url = f"{base_url}{prefix}sise_{rank_type}.naver"
    
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        try:
            html = res.content.decode('euc-kr') 
        except:
            html = res.text
            
        soup = BeautifulSoup(html, 'html.parser')
        rows = soup.select("table.type_2 tr")
        
        data = []
        rank = 1
        for row in rows:
            cols = row.select("td")
            if len(cols) < 5: continue
            
            try:
                name_tag = row.select_one("a.tltle")
                if not name_tag: continue
                name = name_tag.text.strip()
                
                href = name_tag.get('href', '')
                match = re.search(r'code=(\d+)', href)
                symbol = match.group(1) if match else ""
                
                num_cols = row.select("td.number")
                if not num_cols: continue
                
                price_str = num_cols[0].text.strip().replace(",", "")
                price = int(price_str) if price_str.isdigit() else 0
                
                change_rate = 0.0
                change_rate_str = "0.00%"
                for col in num_cols:
                    txt = col.text.strip()
                    if "%" in txt:
                        change_rate_str = txt
                        val_str = txt.replace("%", "").replace("+", "").strip()
                        if val_str.replace(".", "", 1).replace("-", "", 1).isdigit():
                            change_rate = float(val_str)
                            if "-" in txt:
                                change_rate = -abs(change_rate)
                        break
                
                data.append({
                    "rank": rank,
                    "symbol": symbol,
                    "name": name,
                    "price": price,
                    "change": change_rate_str,
                    "change_percent": change_rate
                })
                
                rank += 1
                if rank > 10: # Top 10 까지만
                    break
                    
            except Exception as e:
                pass
                
        return data
        
    except Exception as e:
        print(f"Error parsing Naver {market} {rank_type}: {e}")
        return []

def get_etf_ranking(market="KR", category=None):
    """
    ETF 랭킹 정보를 가져옵니다.
    market: 'KR' (네이버 크롤링), 'US' (주요 리스트 기반 시세조회)
    category: 'inverse', 'index', 'sector' 등 필터링 키워드
    """
    import requests
    from bs4 import BeautifulSoup
    import re
    from stock_data import get_simple_quote

    if market == "KR":
        url = "https://finance.naver.com/api/sise/etfItemList.nhn"
        try:
            res = requests.get(url, timeout=5)
            json_data = res.json()
            items = json_data.get('result', {}).get('etfItemList', [])
            
            # 카테고리별 키워드 설정
            keywords = []
            if category == "inverse":
                keywords = ["인버스", "inverse", "선물인버스", "SQQQ", "VIX", "헷지", "(H)", "Short"]
            elif category == "index":
                keywords = ["200", "코스피", "코스닥", "S&P", "나스닥", "MSCI", "VN", "KOSPI", "KOSDAQ"]
            elif category == "sector":
                keywords = ["반도체", "헬스케어", "IT", "TECH", "바이오", "전지", "미디어", "게임", "여행", "에너지", "채권", "금리", "고배당", "리츠", "AI", "로봇"]
            elif category == "leverage":
                keywords = ["레버리지", "leverage", "블룸버그", "선물레버리지", "Bull", "TQQQ", "SOXL"]
            elif category == "dividend":
                keywords = ["배당", "인컴", "리츠", "커버드콜", "Dividend", "Income"]
            elif category == "battery":
                keywords = ["2차전지", "전지", "배터리", "Battery", "Secondary Cell"]
            elif category == "ai":
                keywords = ["AI", "인공지능", "Tech", "IT", "Robo"]
            elif category == "bond":
                keywords = ["채권", "금리", "Bond", "Treasury", "액티브", "TMF", "TLT", "CD", "KOFR", "머니마켓", "단기채", "초단기"]
            elif category == "semiconductor":
                keywords = ["반도체", "Chip", "Semicon", "SOXX", "NVDA"]
            elif category == "healthcare":
                keywords = ["헬스케어", "바이오", "Bio", "Health"]

            data = []
            
            # 카테고리가 있으면 전체 리스트에서 필터링, 없으면 상위 20개만
            target_items = items
            if not category:
                target_items = items[:20]

            print(f"[ETF API] Total items from Naver: {len(items)}, Category: '{category}'")
            print(f"[ETF API] Keywords for match: {keywords}")
            if items:
                print(f"[ETF API] First item name: {items[0].get('itemname')}")

            for i, item in enumerate(target_items):
                name = item.get('itemname', '')
                
                # 카테고리 필터링 수행 (대소문자 무시)
                if category:
                    matched = any(k.lower() in name.lower() for k in keywords)
                    if not matched:
                        continue

                change_rate = float(item.get('changeRate', 0))
                data.append({
                    "rank": i + 1,
                    "symbol": item.get('itemcode'),
                    "name": name,
                    "price": item.get('nowVal'),
                    "change": f"{change_rate:+.2f}%", 
                    "change_percent": change_rate,
                    "volume": str(item.get('quant', 0))
                })
                
                # 필터링 시 너무 많아지면 끊기 (상위 30개 정도)
                if category and len(data) >= 30:
                    break

            print(f"[ETF API] Filtered result count: {len(data)}")
            return data
        except Exception as e:
            print(f"Error calling Naver ETF API: {e}")
            return []
            
    elif market == "US":
        # 1. Use Cache if available and not expired
        import time
        current_time = time.time()
        if CACHE_US_ETFS["data"] and (current_time - CACHE_US_ETFS["timestamp"] < CACHE_US_ETFS_DURATION):
            us_etfs = CACHE_US_ETFS["data"]
        else:
            # 1. Define comprehensive list of major US ETFs by sector
            us_symbols = [
                # Index
                "SPY", "QQQ", "IVV", "VOO", "DIA", "IWM", "VTI", "QQQM", "SCHX", "VV",
                # Inverse
                "SQQQ", "PSQ", "SH", "DOG", "SDS", "SOXS", "SPDN", "RWM", "QID", "DXD",
                # Leverage
                "TQQQ", "SOXL", "UPRO", "SPXL", "TECL", "ROM", "FAS", "TNA", "QLD", "SSO",
                # Dividend
                "SCHD", "JEPI", "VIG", "VYM", "NOBL", "DGRO", "HDV", "SDY", "DVY", "JEPQ",
                # Bond
                "TLT", "IEF", "SHY", "BND", "AGG", "TMF", "SHV", "LQD", "VCIT", "HYG", "JNK", "MBB",
                # Battery/Energy
                "LIT", "BATT", "REMX", "XLE", "VDE", "ICLN", "PBW", "TAN", "XOP", "AMLP",
                # AI/IT
                "XLK", "VGT", "BOTZ", "ROBO", "IRBO", "SNSR", "GXG", "AIQ", "SKYY", "CLOU", "IGV",
                # Semiconductor
                "SMH", "SOXX", "SOXL", "SOXS", "PSI", "XSD", "FTXL",
                # Healthcare
                "XLV", "VHT", "IBB", "ARKG", "XBI", "FHLC", "PPH", "IHI",
                # Innovation/Others
                "ARKK", "ARKF", "ARKW", "IBIT", "GLD", "SLV", "DBC", "USO"
            ]
            
            # Parallel fetch quotes
            from stock_data import get_simple_quote
            
            def fetch_quote_safe(sym):
                try:
                    q = get_simple_quote(sym, strict=True) # Use strict to fail fast if rate limited
                    if q:
                        return {
                            "symbol": q.get("symbol", sym),
                            "name": q.get("name", sym),
                            "price": q.get("price", "0.00"),
                            "change": q.get("change", "0.00%"),
                            "change_percent": float(str(q.get("change", "0")).replace('%', '').replace('+', '') or 0),
                            "volume": str(q.get("volume", "0"))
                        }
                except:
                    pass
                return None

            # Reduced max_workers to avoid aggressive burst
            with ThreadPoolExecutor(max_workers=5) as executor:
                unique_symbols = list(set(us_symbols))
                results = list(executor.map(fetch_quote_safe, unique_symbols))
                
            us_etfs = [r for r in results if r is not None]
            
            # Update Cache
            if us_etfs:
                # Sort by Volume (Descending) to match "거래량 상위" title
                us_etfs.sort(key=lambda x: int(x.get('volume', 0)), reverse=True)
                for i, item in enumerate(us_etfs):
                    item['rank'] = i + 1
                CACHE_US_ETFS["data"] = us_etfs
                CACHE_US_ETFS["timestamp"] = current_time
            else:
                # If fetching failed (likely rate limited), use empty or old data
                us_etfs = CACHE_US_ETFS["data"] if CACHE_US_ETFS["data"] else []

        if category:
            keywords = []
            if category == "inverse":
                keywords = ["Short", "Inverse", "Bear", "SQQQ", "PSQ", "SOXS", "QID", "DXD", "RWM"]
            elif category == "index":
                keywords = ["SPY", "QQQ", "IVV", "VOO", "S&P", "Nasdaq", "Core", "Total"]
            elif category == "sector":
                # Sector includes everything broad
                keywords = ["Semiconductor", "IT", "Tech", "Energy", "Materials", "Financial", "Bond", "Treasury", "Health"]
            elif category == "leverage":
                keywords = ["UltraPro", "Bull", "TQQQ", "SOXL", "UPRO", "Leverage", "Double", "Triple"]
            elif category == "dividend":
                keywords = ["Dividend", "Income", "Yield", "SCHD", "JEPI", "DGRO", "VIG"]
            elif category == "bond":
                keywords = ["Bond", "Treasury", "TLT", "IEF", "Fixed Income", "BND", "AGG", "TMF", "Corporate"]
            elif category == "battery":
                keywords = ["Battery", "Lithium", "LIT", "REMX", "Metals", "Clean Energy"]
            elif category == "ai":
                keywords = ["AI", "Artificial Intelligence", "ROBO", "BOTZ", "GXG", "Tech", "Software", "Cloud"]
            elif category == "semiconductor":
                keywords = ["Semiconductor", "Chip", "SOXL", "SOXS", "SMH", "SOXX", "NVDA", "Broadcom"]
            elif category == "healthcare":
                keywords = ["Healthcare", "Health", "Bio", "ARKG", "XLV", "VHT", "Biotech"]
                
            filtered = [item for item in us_etfs if any(k.lower() in item['name'].lower() or k.lower() in item['symbol'].lower() for k in keywords)]
            return filtered
            
        return us_etfs[:20]
    
    return []

if __name__ == "__main__":
    # Test
    print("KR:", get_realtime_top10("KR"))
    print("US:", get_realtime_top10("US"))
    print("Movers KR:", get_market_movers("KR"))
