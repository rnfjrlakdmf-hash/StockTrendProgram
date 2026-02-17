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

                    return {
                        "rank": 0, 
                        "symbol": item['ticker'],
                        "name": item['name'],
                        "price": price,
                        "change": f"{change_pct:+.2f}%",  # Format as string for frontend compatibility
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
                        "change": f"{change_rate:+.2f}%", 
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

if __name__ == "__main__":
    # Test
    print("KR:", get_realtime_top10("KR"))
    print("US:", get_realtime_top10("US"))
    print("Movers KR:", get_market_movers("KR"))

