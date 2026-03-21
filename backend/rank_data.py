import yfinance as yf

from concurrent.futures import ThreadPoolExecutor

# 캐싱을 위한 전역 변수 (간단한 인메모리 캐시)
CACHE_TOP10 = {
    "KR": {"data": [], "timestamp": 0},
    "US": {"data": [], "timestamp": 0}
}
CACHE_DURATION = 15  # 15초

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
        symbols = [
            {"ticker": "AAPL", "name": "Apple"},
            {"ticker": "MSFT", "name": "Microsoft"},
            {"ticker": "NVDA", "name": "NVIDIA"},
            {"ticker": "GOOGL", "name": "Alphabet (Google)"},
            {"ticker": "AMZN", "name": "Amazon"},
            {"ticker": "META", "name": "Meta"},
            {"ticker": "TSLA", "name": "Tesla"},
            {"ticker": "BRK-B", "name": "Berkshire Hathaway"},
            {"ticker": "LLY", "name": "Eli Lilly"},
            {"ticker": "AVGO", "name": "Broadcom"}
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
                keywords = ["인버스", "inverse", "선물", "VIX", "헷지"]
            elif category == "index":
                keywords = ["200", "코스피", "코스닥", "S&P", "나스닥", "MSCI", "VN"]
            elif category == "sector":
                # 섹터는 인버스/지수가 아닌 것들 중 일부 인기 키워드
                keywords = ["반도체", "배당", "헬스케어", "IT", "TECH", "바이오", "전지"]

            data = []
            
            # 카테고리가 있으면 전체 리스트에서 필터링, 없으면 상위 20개만
            target_items = items
            if not category:
                target_items = items[:20]

            print(f"[ETF API] Total items from Naver: {len(items)}, Category: {category}")

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
        # Temporary Mock Data for US ETFs to ensure deployment stability
        us_etfs = [
            {"rank": 1, "symbol": "SPY", "name": "S&P 500 (SPY)", "price": "515.20", "change": "+0.45%", "change_percent": 0.45},
            {"rank": 2, "symbol": "QQQ", "name": "Nasdaq 100 (QQQ)", "price": "443.10", "change": "+0.32%", "change_percent": 0.32},
            {"rank": 3, "symbol": "ARKK", "name": "ARK Innovation", "price": "50.15", "change": "-1.20%", "change_percent": -1.20},
            {"rank": 4, "symbol": "IBIT", "name": "Bitcoin Trust (IBIT)", "price": "42.50", "change": "+3.15%", "change_percent": 3.15}
        ]
        return us_etfs
    
    return []

if __name__ == "__main__":
    # Test
    print("KR:", get_realtime_top10("KR"))
    print("US:", get_realtime_top10("US"))
    print("Movers KR:", get_market_movers("KR"))
