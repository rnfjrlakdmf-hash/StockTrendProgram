
import urllib.parse
import datetime
import re
import time
import math
import concurrent.futures

import requests
import yfinance as yf
import pandas as pd
from GoogleNews import GoogleNews

from korea_data import (
    get_korean_name, get_naver_flash_news, get_naver_stock_info, 
    get_naver_daily_prices, get_naver_market_index_data, search_korean_stock_symbol,
    search_stock_code, get_korean_stock_name
)

# [Cache] Memory Cache for Static Data
NAME_CACHE = {}
STOCK_DATA_CACHE = {}  # {symbol: (data, timestamp)}
CACHE_TTL = 60  # 60 seconds

# [Config] Global Stock Korean Name Mapping
GLOBAL_KOREAN_NAMES = {
    "AAPL": "애플",
    "TSLA": "테슬라",
    "MSFT": "마이크로소프트",
    "NVDA": "엔비디아",
    "AMZN": "아마존",
    "GOOGL": "구글 (알파벳)",
    "GOOG": "구글 (알파벳)",
    "META": "메타 (페이스북)",
    "NFLX": "넷플릭스",
    "AMD": "AMD",
    "INTC": "인텔",
    "QCOM": "퀄컴",
    "AVGO": "브로드컴",
    "TXN": "텍사스 인스트루먼트",
    "ASML": "ASML",
    "KO": "코카콜라",
    "PEP": "펩시",
    "SBUX": "스타벅스",
    "NKE": "나이키",
    "DIS": "디즈니",
    "MCD": "맥도날드",
    "JNJ": "존슨앤존슨",
    "PFE": "화이자",
    "MRNA": "모더나",
    "PLTR": "팔란티어",
    "IONQ": "아이온큐",
    "U": "유니티",
    "RBLX": "로블록스",
    "COIN": "코인베이스",
    "RIVN": "리비안",
    "LCID": "루시드",
    "TQQQ": "TQQQ (나스닥 3배)",
    "SOXL": "SOXL (반도체 3배)",
    "SCHD": "SCHD (배당 성장)",
    "JEPI": "JEPI (커버드콜)",
    "SPY": "SPY (S&P500)",
    "QQQ": "QQQ (나스닥100)",
    "O": "리얼티인컴",
    "CPNG": "쿠팡",
    "BA": "보잉",
    "BAC": "뱅크오브아메리카",
    "WMT": "월마트",
    "COST": "코스트코",
    "HD": "홈디포",
    "PG": "P&G",
    "V": "비자",
    "MA": "마스터카드",
}

def search_yahoo_finance(keyword: str) -> str | None:
    """
    Search for a global stock ticker using Yahoo Finance API.
    Returns the symbol of the first relevant match.
    """
    try:
        url = "https://query2.finance.yahoo.com/v1/finance/search"
        params = {
            "q": keyword,
            "lang": "en-US",
            "region": "US",
            "quotesCount": 5,
            "newsCount": 0,
            "enableFuzzyQuery": "false",
            "quotesQueryId": "tss_match_phrase_query"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        resp = requests.get(url, params=params, headers=headers, timeout=3)
        data = resp.json()
        
        if "quotes" in data and len(data["quotes"]) > 0:
            # Filter for Equity or ETF
            for quote in data["quotes"]:
                if quote.get("quoteType") in ["EQUITY", "ETF"]:
                    symbol = quote.get("symbol")
                    return symbol
                    
        return None
    except Exception as e:
        print(f"Yahoo Search Error for '{keyword}': {e}")
        return None


def safe_float(val):
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except BaseException:
        return 0.0


def get_daily_prices_data(ticker):
    """Helper to fetch and process daily prices (history) in a separate thread"""
    daily_prices = []
    try:
        # Fetch slightly more data to calculate changes
        hist_asc = ticker.history(period="3mo")
        if hist_asc.empty:
            return []

        # Calculate daily change
        hist_asc['PrevClose'] = hist_asc['Close'].shift(1)
        hist_asc['Change'] = (
            (hist_asc['Close'] - hist_asc['PrevClose']) / hist_asc['PrevClose']) * 100

        # Sort desc and take top 20
        hist_desc = hist_asc.sort_index(ascending=False).head(20)

        for date, row in hist_desc.iterrows():
            if pd.isna(row['Close']):
                continue
            daily_prices.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": safe_float(row['Open']),
                "high": safe_float(row['High']),
                "low": safe_float(row['Low']),
                "close": safe_float(row['Close']),
                "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0,
                "change": safe_float(row['Change']) if pd.notna(row['Change']) else 0.0
            })
        return daily_prices
    except Exception as e:
        print(f"History fetch error: {e}")
        return []


def fetch_basic_quote(symbol):
    """
    Fastest possible check for price using fast_info.
    Returns dict with essential data and the ticker object.
    """
    try:
        t = yf.Ticker(symbol)
        # Trigger fast_info access
        price = t.fast_info.last_price
        if price and price > 0:
            return {
                "symbol": symbol,
                "price": price,
                "prev_close": t.fast_info.previous_close,
                "currency": t.fast_info.currency,
                "market_cap": t.fast_info.market_cap,
                "ticker": t
            }
    except BaseException:
        pass
    return None


def fetch_full_info(ticker):
    """
    Fetches the heavy 'info' property.
    """
    try:
        return ticker.info
    except BaseException:
        return {}


def get_stock_info(symbol: str, skip_ai: bool = False):
    # [Cache Check]
    if symbol in STOCK_DATA_CACHE:
        cached_data, timestamp = STOCK_DATA_CACHE[symbol]
        if time.time() - timestamp < CACHE_TTL:
            return cached_data

    # [New] 증시/뉴스 검색 시 시장 전반 데이터 반환
    if symbol == "^MARKET":
        try:
            sp500 = yf.Ticker("^GSPC")
            try:
                price = sp500.fast_info.last_price
                prev = sp500.fast_info.previous_close
            except BaseException:
                hist = sp500.history(period="2d")
                price = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]

            change_percent = ((price - prev) / prev) * 100
            change_str = f"{change_percent:+.2f}%"

            raw_news = get_market_news()
            formatted_news = []
            for n in raw_news:
                formatted_news.append(
                    {
                        "title": n['title'],
                        "publisher": n['source'],
                        "link": n['link'],
                        "published": n['time']})

            return {
                "name": "글로벌 증시 & 주요 뉴스",
                "symbol": "MARKET",
                "price": f"{price:,.2f}",
                "currency": "USD (S&P500)",
                "change": change_str,
                "summary": "현재 시장의 주요 지수 흐름과 최신 경제 뉴스를 종합하여 보여줍니다.",
                "sector": "지수/시장 (Market Index)",
                "financials": {},
                "news": formatted_news,
                "score": 50,
                "metrics": {
                    "supplyDemand": 50,
                    "financials": 50,
                    "news": 50}}
        except Exception as e:
            print(f"Error fetching market info: {e}")
            return None



    # [Optimization] Prefer Naver for Korean Stocks
    if re.match(r'^\d{6}$', symbol) or symbol.endswith(('.KS', '.KQ')):
        try:
            # Normalize symbol
            t_symbol = symbol
            if re.match(r'^\d{6}$', t_symbol):
                t_symbol += ".KS"  # Try KS first default

            # Use Naver Crawler
            naver_info = get_naver_stock_info(t_symbol)
            if naver_info:
                # [Fix] Correct Symbol Suffix (KS vs KQ)
                # Naver search works by code, so we trust its returned market type
                if naver_info.get('market_type') == 'KQ' and t_symbol.endswith('.KS'):
                    t_symbol = t_symbol.replace('.KS', '.KQ')
                elif naver_info.get('market_type') == 'KS' and t_symbol.endswith('.KQ'):
                    t_symbol = t_symbol.replace('.KQ', '.KS')
                    
                # Parallel fetch for extras (Daily Prices & News)
                daily_data = []
                news_data = []

                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    f_daily = executor.submit(get_naver_daily_prices, t_symbol)
                    # Search news by Stock Name
                    f_news = executor.submit(
                        fetch_google_news, naver_info.get(
                            'name', symbol), 'ko', 'KR')

                    try:
                        daily_data = f_daily.result(timeout=5)
                    except Exception as e:
                        print(f"Daily Price Fetch Error: {e}")

                    try:
                        news_data = f_news.result(timeout=5)
                    except Exception as e:
                        print(f"News Fetch Error: {e}")

                # Transform to Frontend Format
                final_data = {
                    "name": naver_info.get('name', symbol),
                    "symbol": t_symbol,
                    "price": f"{naver_info['price']:,}",
                    "price_krw": f"{naver_info['price']:,}",
                    "currency": "KRW",
                    "change": naver_info.get('change_percent', '0.00%'),
                    "summary": "네이버 금융 실시간 데이터입니다.",
                    "sector": "Domestic Stock",
                    "financials": {
                        "pe_ratio": naver_info.get('per'),
                        "pbr": naver_info.get('pbr'),
                        "market_cap": naver_info.get('market_cap_str')
                    },
                    "details": {
                        "prev_close": naver_info.get('prev_close'),
                        "market_cap": naver_info.get('market_cap_str'),
                        "pe_ratio": naver_info.get('per'),
                        "eps": naver_info.get('eps'),
                        "pbr": naver_info.get('pbr'),
                        "dividend_yield": naver_info.get('dvr'),
                        "open": naver_info.get('open'),
                        "day_high": naver_info.get('day_high'),
                        "day_low": naver_info.get('day_low'),
                        "volume": naver_info.get('volume'),
                        "year_high": naver_info.get('year_high'),
                        "year_low": naver_info.get('year_low'),
                        "forward_pe": naver_info.get('forward_pe'),
                        "forward_eps": naver_info.get('forward_eps'),
                        "bps": naver_info.get('bps'),
                        "dividend_rate": naver_info.get('dividend_rate')
                    },
                    "daily_prices": daily_data,
                    "news": news_data,
                    "score": 50,
                    "metrics": {"supplyDemand": 50, "financials": 50, "news": 50}
                }

                # Update Cache
                STOCK_DATA_CACHE[symbol] = (final_data, time.time())
                return final_data

        except Exception as e:
            print(f"Naver Fetch Error: {e}")
            # Fallback to yfinance if Naver fails

    # [Aggressive Parallel Execution]
    # We use more workers to race KS/KQ and fetch details simultaneously
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=6)

    try:
        symbol = symbol.strip()

        # 1. Race / Identify Ticker
        # If 6 digits, launch both KS and KQ checks in parallel ("Happy Eyeballs")
        # If explicit, launch single check

        candidates = []
        if re.match(r'^\d{6}$', symbol):
            candidates = [f"{symbol}.KS", f"{symbol}.KQ"]
        else:
            candidates = [symbol]

        quote_futures = {
            executor.submit(
                fetch_basic_quote,
                s): s for s in candidates}

        winner_data = None

        # Wait up to 5 seconds for a winner (Increased from 2.0s)
        done, _ = concurrent.futures.wait(
            quote_futures.keys(), timeout=5.0, return_when=concurrent.futures.ALL_COMPLETED)

        # Logic to pick winner: Prefer KS if both valid, otherwise first valid
        results_map = {}
        for f in done:
            try:
                res = f.result()
                if res:
                    results_map[res['symbol']] = res
            except BaseException:
                pass

        if len(candidates) > 1:
            # Check KS first
            if candidates[0] in results_map:
                winner_data = results_map[candidates[0]]
            elif candidates[1] in results_map:
                winner_data = results_map[candidates[1]]
        elif len(candidates) == 1:
            if candidates[0] in results_map:
                winner_data = results_map[candidates[0]]

        # If no valid ticker found via fast check
        if not winner_data:
            # [Fallback] Try to search by name (Korean Stock)
            print(f"Direct ticker check failed for '{symbol}'. Searching by name...")
            found_code = search_korean_stock_symbol(symbol)
            
            if found_code:
                print(f"Found Korean code '{found_code}' for name '{symbol}'. Retrying...")
                return get_stock_info(found_code, skip_ai=skip_ai)
            
            # [New] Global Stock Search Fallback (Yahoo Finance)
            # If Korean search failed, try global search
            print(f"Korean search failed for '{symbol}'. Trying Global Search...")
            global_symbol = search_yahoo_finance(symbol)
            
            if global_symbol:
                print(f"Found Global symbol '{global_symbol}' for name '{symbol}'. Retrying...")
                return get_stock_info(global_symbol, skip_ai=skip_ai)

            return None  # Give up

        # 2. Winner Found! Launch Details Fetch
        # winner_data has: symbol, price, prev_close, currency, market_cap,
        # ticker
        target_symbol = winner_data['symbol']
        ticker = winner_data['ticker']

        # Sub-tasks
        f_info = executor.submit(fetch_full_info, ticker)  # Slowest
        f_hist = executor.submit(get_daily_prices_data, ticker)  # Medium

        f_name = None
        if target_symbol.endswith('.KS') or target_symbol.endswith('.KQ'):
            if target_symbol in NAME_CACHE:
                pass  # Already cached
            else:
                f_name = executor.submit(get_korean_name, target_symbol)

        # We need Name for News, so wait for Name first?
        # Actually News is not critical for "Fast" display, but users like it.
        # We can fire news fetch with "assumed" name (from cache or None) or wait slightly?
        # Let's fire Name first. If cache hit, fire News immediately.
        # If cache miss, we might delay news slightly or just searching by
        # symbol.

        stock_name = target_symbol  # Default
        if target_symbol in NAME_CACHE:
            stock_name = NAME_CACHE[target_symbol]

        # Fire News
        f_news = None
        if target_symbol.endswith('.KS') or target_symbol.endswith('.KQ'):
            # If we don't have name yet, we might search by symbol or wait?
            # Let's search by symbol if name not ready to avoid blocking?
            # No, Google News by Code often fails.
            # We rely on f_name. Let's chain it?
            # For speed, let's just submit the news fetch if we HAVE the name.
            # If not, we'll try to fetch news after name resolves (blocking
            # main thread slightly).
            if target_symbol in NAME_CACHE:
                f_news = executor.submit(
                    fetch_google_news, stock_name, 'ko', 'KR')
        else:
            # Foreign
            pass  # Logic handles later

        # 3. Assemble Data (Wait with rigid timeouts)

        # Info (Detailed Summary, Sector, Metrics)
        # Give it 1.5s max. If fails, we use partial data.
        info = {}
        try:
            # Increased from 1.5s to 10.0s for heavy info fetch
            info = f_info.result(timeout=10.0)
        except Exception:
            print("Info fetch timed out/failed. Using partial data.")

        # Name (Korean)
        if f_name:
            try:
                kor_name = f_name.result(timeout=3.0)  # Increased from 1.0s
                if kor_name:
                    stock_name = kor_name
                    NAME_CACHE[target_symbol] = kor_name
            except BaseException:
                pass

        # News (Late launch if name wasn't cached)
        if not f_news and (target_symbol.endswith(
                '.KS') or target_symbol.endswith('.KQ')):
            if stock_name != target_symbol:  # We got a name
                f_news = executor.submit(
                    fetch_google_news, stock_name, 'ko', 'KR')

        # 4. Finalize Values
        current_price = winner_data['price']
        previous_close = winner_data['prev_close']
        currency = winner_data['currency']

        # KRW Fix
        if target_symbol.endswith(('.KS', '.KQ')):
            currency = 'KRW'
        if not currency:
            currency = 'USD'

        if previous_close and previous_close != 0:
            change_percent = (
                (current_price - previous_close) / previous_close) * 100
            change_str = f"{change_percent:+.2f}%"
        else:
            change_str = "0.00%"

        if currency == 'KRW':
            price_str = f"{current_price:,.0f}"
        else:
            price_str = f"{current_price:,.2f}"

        # Fetch Exchange Rate for Foreign Stocks
        exchange_rate = 1.0
        price_krw = None
        if currency != 'KRW':
            try:
                # Use cached or fresh rate
                rate_ticker = yf.Ticker("KRW=X")
                exchange_rate = rate_ticker.fast_info.last_price
                if exchange_rate:
                    krw_val = current_price * exchange_rate
                    price_krw = f"{krw_val:,.0f}"  # Display as Integer
            except Exception as e:
                print(f"Exchange Rate Error: {e}")

        # Resolve History
        daily_prices = []
        try:
            daily_prices = f_hist.result(timeout=5.0)  # Increased from 2.0s
        except BaseException:
            pass

        # Resolve News
        stock_news = []
        if f_news:
            try:
                stock_news = f_news.result(timeout=5.0)  # Increased from 1.5s
            except BaseException:
                pass
        elif not (target_symbol.endswith('.KS') or target_symbol.endswith('.KQ')):
            # Simple yfinance news fallback
            try:
                stock_news = [{
                    "title": n.get('content', {}).get('title', ''),
                    "publisher": n.get('content', {}).get('provider', {}).get('displayName', 'Yahoo'),
                    "link": n.get('content', {}).get('clickThroughUrl', {}).get('url', ''),
                    "published": n.get('content', {}).get('pubDate', '')
                } for n in ticker.news if n.get('content')]
            except BaseException:
                pass

        # Metrics from Info (or Fast Info Fallback)
        pe = info.get('trailingPE')
        pbr = info.get('priceToBook')
        roe = info.get('returnOnEquity')
        rev_growth = info.get('revenueGrowth')

        m_cap = info.get('marketCap')
        if not m_cap:
            m_cap = winner_data['market_cap']  # Fallback

        if m_cap:
            if m_cap > 1e12:
                mkt_cap_str = f"{m_cap / 1e12:.2f}T"
            elif m_cap > 1e9:
                mkt_cap_str = f"{m_cap / 1e9:.2f}B"
            else:
                mkt_cap_str = f"{m_cap / 1e6:.2f}M"
        else:
            mkt_cap_str = "N/A"

        executor.shutdown(wait=False)

        # Determine Display Name
        # For Korean stocks, prefer the Korean name (stock_name) over
        # yfinance's shortName (English)
        display_name = info.get('shortName', stock_name)
        
        # [New] Global Korean Name Mapping
        # If it's a known global stock, use the Korean friendly name
        if target_symbol in GLOBAL_KOREAN_NAMES:
             display_name = GLOBAL_KOREAN_NAMES[target_symbol]
        
        if target_symbol.endswith(('.KS', '.KQ')):
            if stock_name and stock_name != target_symbol:
                display_name = stock_name

        result_data = {
            "name": display_name,
            "symbol": target_symbol,
            "price": price_str,
            "price_krw": price_krw,  # Added field
            "currency": currency,
            "change": change_str,
            "summary": info.get('longBusinessSummary', '상세 정보 로딩 시간이 지연되어 기본 데이터만 표시합니다.'),
            "sector": info.get('sector', 'N/A'),
            "financials": {
                "pe_ratio": pe, "pbr": pbr, "roe": roe, "revenue_growth": rev_growth, "market_cap": mkt_cap_str
            },
            "details": {
                "prev_close": previous_close,
                "open": info.get('open'),
                "day_low": info.get('dayLow'),
                "day_high": info.get('dayHigh'),
                "year_low": info.get('fiftyTwoWeekLow'),
                "year_high": info.get('fiftyTwoWeekHigh'),
                "volume": info.get('volume'),
                "market_cap": mkt_cap_str,
                "pe_ratio": pe,
                "eps": info.get('trailingEps'),
                "dividend_yield": info.get('dividendYield'),
                "forward_pe": info.get('forwardPE'),
                "forward_eps": info.get('forwardEps'),
                "pbr": info.get('priceToBook'),
                "bps": info.get('bookValue'),
                "dividend_rate": info.get('dividendRate')
            },
            "daily_prices": daily_prices,
            "news": stock_news[:5],
            "score": 0, "metrics": {"supplyDemand": 0, "financials": 0, "news": 0}
        }

        # Update Cache (for yfinance results too)
        STOCK_DATA_CACHE[symbol] = (result_data, time.time())
        return result_data

    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None


def get_simple_quote(symbol: str):
    """
    관심 종목 표시를 위해 가격과 등락률만 빠르게 조회합니다.
    뉴스 검색이나 AI 분석을 수행하지 않습니다.
    """
    try:
        ticker = yf.Ticker(symbol)

        # fast_info 사용 (속도 최신화)
        try:
            current_price = ticker.fast_info.last_price
            previous_close = ticker.fast_info.previous_close
        except BaseException:
            # fast_info 실패 시 info 사용 (느림)
            info = ticker.info
            current_price = info.get(
                'currentPrice', info.get(
                    'regularMarketPrice', 0))
            previous_close = info.get(
                'previousClose', info.get(
                    'regularMarketPreviousClose', 0))

        # 데이터가 없거나 0인 경우 처리
        if not current_price:
            return None

        if previous_close and previous_close != 0:
            change_percent = (
                (current_price - previous_close) / previous_close) * 100
            change_str = f"{change_percent:+.2f}%"
        else:
            change_str = "0.00%"

        # KRW formatting check
        if symbol.endswith('.KS') or symbol.endswith(
                '.KQ') or symbol == 'KRW=X':
            price_str = f"{current_price:,.0f}"
        else:
            price_str = f"{current_price:,.2f}"

        return {
            "symbol": symbol,
            "price": price_str,
            "change": change_str,
            "name": symbol
        }
    except Exception as e:
        # print(f"Simple Quote Error for {symbol}: {e}")
        return None


def fetch_google_news(query, lang='ko', region='KR', period='1d'):
    """Google News에서 뉴스 검색 (기본값: 한국어, 한국지역)"""
    try:
        googlenews = GoogleNews(lang=lang, region=region, period=period)
        googlenews.search(query)  # search 메서드 사용이 더 정확함
        results = googlenews.results()

        cleaned_results = []
        for res in results:
            link = res.get("link", "")

            # [Fix] Google News Link Cleaning
            # 1. Remove tracking params (&ved=...)
            if '&ved=' in link:
                link = link.split('&ved=')[0]

            # 2. Decode URL (Fix double encoding like %25 -> %)
            try:
                link = urllib.parse.unquote(link)
            except BaseException:
                pass

            cleaned_results.append({
                "title": res.get("title", ""),
                "publisher": res.get("media", "Google News"),
                "link": link,
                "published": res.get("date", "")  # 날짜 형식 문자열 그대로 전달
            })
        return cleaned_results
    except Exception as e:
        print(f"Google News Error: {e}")
        return []


def get_market_data():
    """주요 지수 및 트렌딩 종목 데이터 수집"""
    indices = [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^IXIC", "label": "NASDAQ"},
        {"symbol": "^KS11", "label": "KOSPI"},
    ]

    results = []
    for idx in indices:
        try:
            ticker = yf.Ticker(idx["symbol"])
            # fast_info가 더 빠르고 안정적일 때가 많음
            price = ticker.fast_info.last_price
            prev_close = ticker.fast_info.previous_close
            change = ((price - prev_close) / prev_close) * 100

            results.append({
                "label": idx["label"],
                "value": f"{price:,.2f}",
                "change": f"{change:+.2f}%",
                "up": change >= 0
            })
        except BaseException:
            # 에러 시 기본값 (이전 가짜 데이터 구조 유지)
            results.append({
                "label": idx["label"],
                "value": "Error",
                "change": "0.00%",
                "up": True
            })

    # 인기 종목 (예시로 고정된 몇 개를 실시간 조회)
    movers_tickers = ["NVDA", "TSLA", "AAPL"]
    movers = []

    descriptions = {
        "NVDA": "AI 대장주 수요 지속",
        "TSLA": "전기차 시장 변동성",
        "AAPL": "안정적 기술주 흐름"
    }

    for sym in movers_tickers:
        try:
            t = yf.Ticker(sym)
            p = t.fast_info.last_price
            prev = t.fast_info.previous_close
            chg = ((p - prev) / prev) * 100

            movers.append({
                "name": sym,
                "price": f"{p:,.2f}",
                "change": f"{chg:+.2f}%",
                "desc": descriptions.get(sym, "주요 거래 종목")
            })
        except BaseException:
            pass

    return {
        "indices": results,
        "movers": movers
    }


def get_market_news():
    """시장 전반의 주요 뉴스 수집 (한국어)"""
    # 글로벌 증시, 미국 증시, 국내 증시 주요 키워드로 검색
    try:
        # 여러 키워드 혼합 검색
        news_queries = ["글로벌 증시", "미국 주식", "국내 주식 시장"]
        combined_news = []
        seen_links = set()

        for q in news_queries:
            news_items = fetch_google_news(
                q, lang='ko', region='KR', period='1d')
            for n in news_items:
                if n['link'] not in seen_links:
                    combined_news.append({
                        "source": n['publisher'],
                        "title": n['title'],
                        "link": n['link'],
                        "time": n['published']  # 시간 포맷은 Google News에서 주는대로 사용
                    })
                    seen_links.add(n['link'])

        # 섞기 보다는 순서대로 (최신순 보장 안되므로 날짜 파싱이 어렵다면 그대로)
        if not combined_news:
            # Fallback to Naver News
            print("Google News empty/blocked. Using Naver News Fallback.")
            return get_naver_flash_news()

        return combined_news[:10]

    except Exception as e:
        print(f"Error fetching market news: {e}")
        return get_naver_flash_news()


def get_stock_chart_data(
        symbol: str,
        period: str = "1d",
        interval: str = "5m"):
    """
    yfinance를 사용하여 개별 종목의 차트 데이터를 가져옵니다.
    기본값: 하루(1d) 동안의 5분봉(5m) 데이터 (실시간 느낌)
    """
    try:
        ticker = yf.Ticker(symbol)
        # intraday data is available for last 60 days
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            return []

        chart_data = []
        # Index is Datetime
        for date, row in hist.iterrows():
            chart_data.append({
                # date는 Timestamp 객체이므로 문자열로 변환 (HH:mm)
                "date": date.strftime("%H:%M") if period == "1d" else date.strftime("%Y-%m-%d"),
                "close": safe_float(row["Close"]),
                "open": safe_float(row["Open"]),
                "high": safe_float(row["High"]),
                "low": safe_float(row["Low"]),
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0
            })
        return chart_data
    except Exception as e:
        print(f"Stock Chart Data Error: {e}")
        return []


def calculate_technical_sentiment(symbol="^GSPC"):
    """
    기술적 지표를 기반으로 시장 점수(0~100)를 산출합니다.
    - 50일/200일 이동평균선
    - RSI
    - 모멘텀
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6mo")

        if hist.empty:
            return 50  # 기본값

        # 1. 이동평균선 점수 (40점 만점)
        # 데이터가 부족할 수 있으므로 안전하게 처리
        if len(hist) < 200:
            ma50 = hist['Close'].iloc[-1]
            ma200 = hist['Close'].iloc[-1]
        else:
            ma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1]

        current = hist['Close'].iloc[-1]

        ma_score = 20
        if current > ma50:
            ma_score += 10
        if current > ma200:
            ma_score += 10
        if ma50 > ma200:
            ma_score += 5  # 골든크로스 상태

        # 2. RSI 점수 (30점 만점)
        # 공포/탐욕 지수: RSI가 높으면(탐욕), 낮으면(공포)
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()

        # loss가 0인 경우 처리
        if loss.iloc[-1] == 0:
            rsi_val = 100
        else:
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            rsi_val = rsi.iloc[-1]

        # 50을 기준으로 ±15점 변동
        # (rsi - 50) * 0.6 -> ±30 * 0.6 = ±18
        rsi_score = 15 + (rsi_val - 50) * 0.6
        rsi_score = max(0, min(30, rsi_score))

        # 3. 모멘텀 점수 (30점 만점)
        month_ago = hist['Close'].iloc[-20] if len(
            hist) > 20 else hist['Close'].iloc[0]
        momentum = (current - month_ago) / month_ago * 100

        # 모멘텀 1%당 2점
        mom_score = 15 + (momentum * 2)
        mom_score = max(0, min(30, mom_score))

        total_score = ma_score + rsi_score + mom_score
        return int(max(0, min(100, total_score)))

    except Exception as e:
        print(f"Technical Sentiment Error: {e}")
        return 50


def get_market_status():
    """
    시장 신호등 (Traffic Light) - 매매 가능 여부 판독기
    종합 지수(KOSPI)와 환율, 외국인 수급(추정)을 분석하여 신호등 색상을 반환합니다.
    """
    try:
        # KOSPI & USD/KRW
        tickers = ["^KS11", "KRW=X"]
        data = yf.download(tickers, period="1mo", progress=False)['Close']

        # 데이터가 없을 경우 처리
        if data.empty:
            return {
                "signal": "yellow",
                "message": "데이터 수신 지연. 관망하세요.",
                "score": 50}

        # KOSPI 분석
        kospi = data["^KS11"]
        kospi_now = kospi.iloc[-1]
        kospi_ma20 = kospi.rolling(window=20).mean().iloc[-1]

        # 환율 분석
        usd = data["KRW=X"]
        usd_now = usd.iloc[-1]

        # 신호 결정 로직 & 이유
        signal = "yellow"
        message = "도로가 미끄럽습니다. (변동성 심함) 단타 고수가 아니라면 관망하세요."
        reason = "코스피가 20일 이동평균선 부근에서 횡보하고 있습니다."
        score = 50

        # 1. 초록불 (맑음): 코스피가 20일선 위에 있고, 환율이 안정적(1400원 미만 혹은 하락세)
        if kospi_now > kospi_ma20 and usd_now < 1400:
            signal = "green"
            message = "날씨가 맑습니다! (수급 양호) 적극적으로 매수 기회를 노려보세요."
            reason = f"코스피가 20일 이동평균선({kospi_ma20:,.0f}p)을 상회하고, 환율이 안정권에 진입했습니다."
            score = 80

        # 2. 빨간불 (폭우): 코스피가 20일선 아래로 급락하거나, 환율이 급등(1400원 돌파 등)
        elif kospi_now < kospi_ma20 * 0.98 or usd_now > 1420:  # 2% 이상 괴리 혹은 고환율
            signal = "red"
            message = "폭우가 쏟아집니다. (전체 시장 하락세) 오늘은 매매를 쉬고 현금을 지키세요."
            if usd_now > 1420:
                reason = f"환율이 {usd_now:,.1f}원으로 치솟아 외국인 수급 이탈 우려가 큽니다."
            else:
                reason = f"코스피가 20일 이동평균선({kospi_ma20:,.0f}p) 아래로 크게 하락하여 추세가 꺾였습니다."
            score = 20

        # 나머지는 노란불 (기본값)

        return {
            "signal": signal,
            "message": message,
            "reason": reason,
            "score": score,
            "details": {
                "kospi": f"{kospi_now:,.0f}",
                "kospi_trend": "Bull" if kospi_now > kospi_ma20 else "Bear",
                "usd": f"{usd_now:,.1f}"
            }
        }

    except Exception as e:
        print(f"Market Status Error: {e}")
        return {
            "signal": "yellow",
            "message": "시장 데이터 분석 중 오류 발생.",
            "score": 50}


def get_insider_trading(symbol: str):
    """
    해당 종목의 내부자 거래 내역을 가져옵니다.
    """
    try:
        ticker = yf.Ticker(symbol)

        # yfinance의 insider_transactions (or insider_purchases)
        # DataFrame을 반환하므로 리스트 dict로 변환해야 함
        insider = ticker.insider_transactions

        if insider is None or insider.empty:
            return []

        # 최신 10개만, 날짜순 정렬
        # 컬럼명이 다를 수 있으므로 확인 필요하나 보통: 'Shares', 'Value', 'Text', 'Start Date' 등
        trades = []

        # 인덱스가 날짜인 경우가 많음, 혹은 'Start Date' 컬럼
        # reset_index를 통해 모든 데이터를 컬럼으로
        df = insider.reset_index()

        # 컬럼 이름 표준화 시도 (yfinance 버전에 따라 다름)
        # 보통: 'Insider', 'Position', 'URL', 'Text', 'Start Date', 'Ownership',
        # 'Value', 'Shares'

        for _, row in df.head(10).iterrows():
            # 날짜 처리
            date_val = row.get('Start Date', row.get('Date', 'N/A'))
            if isinstance(date_val, (pd.Timestamp, datetime.datetime)):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)

            trades.append({
                "insider": row.get('Insider', 'Unknown'),
                "position": row.get('Position', ''),
                "date": date_str,
                "shares": int(row.get('Shares', 0)) if pd.notna(row.get('Shares')) else 0,
                "value": int(row.get('Value', 0)) if pd.notna(row.get('Value')) else 0,
                "text": row.get('Text', '')  # Sale / Purchase ...
            })

        return trades

    except Exception as e:
        print(f"Insider Data Error for {symbol}: {e}")
        return []


def get_macro_calendar():
    """
    주요 거시경제 일정을 반환합니다.
    실제 API 연동 대신 데모용 정적 데이터를 반환합니다.
    추후 Fred API나 Investing.com 크롤링으로 대체 가능.
    """
    # 데모 데이터: 현재 날짜 기준으로 동적으로 생성하거나 고정된 중요 이벤트 표시
    today = datetime.date.today()

    # 예시 이벤트 리스트
    events = [
        {"event": "CPI 발표 (소비자물가지수)", "importance": "High", "time": "22:30"},
        {"event": "FOMC 회의록 공개", "importance": "High", "time": "04:00 (익일)"},
        {"event": "신규 실업수당 청구건수", "importance": "Medium", "time": "22:30"},
        {"event": "비농업 고용지수", "importance": "High", "time": "21:30"},
        {"event": "PPI 발표 (생산자물가지수)", "importance": "Medium", "time": "22:30"}
    ]

    # 이번 주 월요일 계산 (월요일=0, 일요일=6)
    start_of_week = today - datetime.timedelta(days=today.weekday())

    weekly_calendar = []

    for i in range(5):
        day = start_of_week + datetime.timedelta(days=i)

        # 임의로 이벤트 배정 (실제론 날짜 매핑 필요 - 현재는 데모용으로 고정 요일에 할당)
        # 매주 같은 요일에 이벤트가 표시되게 됩니다.
        day_events = []
        if i == 1:  # 화
            day_events.append(events[0])
        elif i == 2:  # 수
            day_events.append(events[1])
        elif i == 3:  # 목
            day_events.append(events[2])
        elif i == 4:  # 금
            day_events.append(events[3])
            day_events.append(events[4])

        weekly_calendar.append({
            "date": day.strftime("%Y-%m-%d"),
            "day": day.strftime("%A"),
            "events": day_events
        })

    return weekly_calendar


# Global Cache for Asset Data
ASSET_DATA_CACHE = {
    "data": {},
    "timestamp": 0
}
ASSET_CACHE_DURATION = 15  # 15 seconds cache to prevent rate limiting


def get_all_assets():
    """
    주식, 코인, 환율, 원자재 등 다양한 자산군의 현재 시세를 반환합니다.
    (병렬 처리로 속도 개선 + 캐싱 적용)
    """
    global ASSET_DATA_CACHE

    current_time = time.time()
    if ASSET_DATA_CACHE["data"] and (
            current_time -
            ASSET_DATA_CACHE["timestamp"] < ASSET_CACHE_DURATION):
        return ASSET_DATA_CACHE["data"]

    result = {
        "Indices": [],
        "Crypto": [],
        "Forex": [],
        "Commodity": [],
        "Interest": []  # [New] Add Interest Rates
    }

    # 1. Fetch Naver Market Data (Indices, Forex, Commodity, Interest)
    try:
        naver_data = get_naver_market_index_data()

        # Indices (World Exchange)
        # Naver returns: [{"name": "다우산업(미국)", "price": "34,000.00", "change":
        # "-10.00", "is_up": False}, ...]
        if "world_exchange" in naver_data:
            for item in naver_data["world_exchange"]:
                # Filter useful indices if needed, or take all
                result["Indices"].append(item)

        # Forex (Exchange)
        if "exchange" in naver_data:
            result["Forex"] = naver_data["exchange"]

        # Interest Rates (New)
        if "interest" in naver_data:
            result["Interest"] = naver_data["interest"]

        # Commodity (Oil, Gold, Raw Materials)
        if "oil" in naver_data:
            result["Commodity"].extend(naver_data["oil"])
        if "gold" in naver_data:
            result["Commodity"].extend(naver_data["gold"])
        if "raw_materials" in naver_data:
            # [Fix] Filter out currency items mixed in raw_materials
            safe_raw = [
                m for m in naver_data["raw_materials"] if not any(
                    c in m['name'].upper() for c in [
                        'USD',
                        'EUR',
                        'JPY',
                        'CNY',
                        '환율',
                        '달러',
                        '유로',
                        '엔'])]
            result["Commodity"].extend(safe_raw)

        # [Deduplication] Remove duplicates by name
        unique_commodities = {}
        for item in result["Commodity"]:
            unique_commodities[item['name']] = item
        result["Commodity"] = list(unique_commodities.values())

        # [Fallback/Enrichment] Fetch Extra Commodities via yfinance if list is short or missing key items
        # Silver, Copper, Natural Gas, Corn
        extra_tickers = {
            "SI=F": "국제 은 (Silver)",
            "HG=F": "구리 (Copper)",
            "NG=F": "천연가스 (Nat Gas)",
            "ZC=F": "옥수수 (Corn)"
        }

        # Check if we already have them (simple check)
        existing_names = "".join([c['name'] for c in result["Commodity"]])


        for sym, name in extra_tickers.items():
            # If name keyword not in existing list (e.g. '은' not in '국제 금...')
            # Simple heuristic: exclude if very similar name exists
            should_add = True
            if "은" in name and "은" in existing_names:
                should_add = False
            if "구리" in name and "구리" in existing_names:
                should_add = False
            if "가스" in name and "가스" in existing_names:
                should_add = False
            if "옥수수" in name and "옥수수" in existing_names:
                should_add = False

            if should_add:
                try:
                    yg = yf.Ticker(sym)
                    price = yg.fast_info.last_price
                    prev = yg.fast_info.previous_close
                    if price and prev:
                        change = ((price - prev) / prev) * 100
                        curr_sym = "$"  # Commodities usually USD

                        item = {
                            "name": name,
                            "price": f"{price:,.2f}",
                            "change": f"{abs(change):.2f}%",
                            "is_up": change >= 0
                        }
                        result["Commodity"].append(item)
                except BaseException:
                    pass

    except Exception as e:
        print(f"Naver Data Fetch Error in get_all_assets: {e}")

    # 2. Fetch Crypto Data (Upbit API)
    # Markets: BTC, ETH, XRP, SOL, DOGE, ADA, DOT, AVX, ETC, LINK (Top 10ish)
    upbit_codes = [
        "KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE",
        "KRW-ADA", "KRW-TRX", "KRW-AVAX", "KRW-LINK", "KRW-SHIB"
    ]
    try:
        url = "https://api.upbit.com/v1/ticker"
        params = {"markets": ",".join(upbit_codes)}
        res = requests.get(url, params=params, timeout=3)
        if res.status_code == 200:
            crypto_data = res.json()
            # crypto_data is a list of objects
            for c in crypto_data:
                market = c['market']  # KRW-BTC
                symbol = market.split('-')[1]  # BTC

                # Name Mapping
                name_map = {
                    "BTC": "Bitcoin",
                    "ETH": "Ethereum",
                    "XRP": "Ripple",
                    "SOL": "Solana",
                    "DOGE": "Dogecoin",
                    "ADA": "Cardano",
                    "TRX": "Tron",
                    "AVAX": "Avalanche",
                    "LINK": "Chainlink",
                    "SHIB": "Shiba Inu"}
                name = name_map.get(symbol, symbol)

                price = c['trade_price']
                prev_price = c['prev_closing_price']
                change_rate = c['signed_change_rate'] * 100  # -0.01 -> -1.0

                # Upbit returns change rate, so we use it directly
                is_up = change_rate >= 0

                item = {
                    "symbol": f"{symbol}-KRW",
                    "name": name,
                    "price": price,  # Number format (KRW)
                    # Without % sign, will be added by frontend or logic
                    "change": f"{abs(change_rate):.2f}",
                    "is_up": is_up
                }
                result["Crypto"].append(item)
    except Exception as e:
        print(f"Upbit API Error: {e}")

    # Update Cache
    if result["Indices"] or result["Crypto"]:
        ASSET_DATA_CACHE["data"] = result
        ASSET_DATA_CACHE["timestamp"] = time.time()

    return result
