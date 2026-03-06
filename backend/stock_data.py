
import urllib.parse
import datetime
import re
import time
import math
import concurrent.futures

import requests
import os
import yfinance as yf
import pandas as pd
from GoogleNews import GoogleNews

from korea_data import (
    get_korean_name, get_naver_flash_news, get_naver_stock_info, 
    get_naver_daily_prices, get_naver_market_index_data, search_korean_stock_symbol,
    search_stock_code, get_korean_stock_name, get_korean_market_indices, get_exchange_rate
)
import korea_data
from risk_analyzer import calculate_analysis_score

# [Cache] Memory Cache for Static Data
NAME_CACHE = {}
STOCK_DATA_CACHE = {}  # {symbol: (data, timestamp)}
CACHE_TTL = 60  # 60 seconds
ASSETS_CACHE = {
    "data": None,
    "timestamp": 0
}

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






def generate_stock_summary(info, news_list):
    """
    Generates a hybrid 'AI' summary with both professional and beginner-friendly insights.
    """
    try:
        name = info.get('name', 'Stock')
        price = info.get('price', 0)
        change_str = info.get('change_percent', '0.00%')
        change_val = float(change_str.replace('%', '').strip())
        
        per = info.get('per', 'N/A')
        pbr = info.get('pbr', 'N/A')
        
        # 1. Price Trend Analysis (Neutralized)
        trend_pro = f"최근 {change_str} 변동성 기록"
        trend_easy = f"최근 가격이 {change_str} 정도 변화했어요."

        # Helper to parse metrics
        def parse_val(v):
            if isinstance(v, (int, float)): return v
            if isinstance(v, str):
                try: 
                    cleaned = re.sub(r'[^0-9.]', '', v)
                    return float(cleaned) if cleaned else None
                except: return None
            return None

        per_val = parse_val(per)
        pbr_val = parse_val(pbr)

        # 2. Valuation Analysis (Neutralized)
        val_pro = ""
        val_easy = ""
        
        if pbr_val is not None and pbr_val < 0.8:
            val_pro = f"PBR {pbr_val}배로 자산가치 대비 낮은 지표 기록"
            val_easy = "회사가 가진 재산 가치보다 주가가 낮게 형성되어 있는 상태예요."
        elif per_val is not None and per_val > 50:
            val_pro = f"PER {per_val}배로 시장의 높은 성장 기대 지표 반영"
            val_easy = "미래에 대한 기대감이 주가에 많이 반영되어 있는 지표를 보이고 있어요."
        elif per_val is not None and per_val < 10:
            val_pro = f"PER {per_val}배로 이익 규모 대비 낮은 지표 기록"
            val_easy = "벌어들이는 이익에 비해 주가 지표가 낮게 나타나고 있어요."
        else:
            val_pro = f"PER {per}배, PBR {pbr}배 기록"
            val_easy = "현재 시장 지표상 평이한 수준의 가격대를 보이고 있습니다."

        # Construct Hybrid Summary (Neutralized)
        summary = f"📊 [데이터 종합 분석]\n"
        summary += f"현재 지표: {price:,}원 ({change_str}).\n"
        summary += f"재무 지표 현황: {val_pro}. "
        
        if news_list and len(news_list) > 0:
            summary += f"\n참고 뉴스: '{news_list[0]['title']}' 등이 시장 데이터에 포함됨."
            
        summary += "\n\n💡 [지표 쉽게 보기]\n"
        summary += f"\"데이터가 복잡하신 분들을 위한 요약이에요.\"\n"
        summary += f"1. {trend_easy}\n"
        summary += f"2. {val_easy}\n"
        summary += "\n* 주의: 본 분석은 객관적 데이터에 기반한 요약이며 투자 권유가 아닙니다."

        return summary
    except Exception as e:
        return f"{info.get('name')} 데이터 분석 요약 중입니다."





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
                health_data = {}

                if not skip_ai:
                    print(f"[DEBUG] Fetching full data (news + daily prices)")
                    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                        f_daily = executor.submit(get_naver_daily_prices, t_symbol)
                        f_news = executor.submit(korea_data.get_integrated_stock_news, symbol=t_symbol, name=naver_info.get('name', symbol))
                        f_analysis = executor.submit(calculate_analysis_score, t_symbol)

                        try:
                            daily_data = f_daily.result(timeout=5)
                        except Exception as e:
                            print(f"Daily Price Fetch Error: {e}")

                        try:
                            news_data = f_news.result(timeout=5)
                        except Exception as e:
                            print(f"News Fetch Error: {e}")
                        
                        try:
                            analysis_res = f_analysis.result(timeout=5)
                            if analysis_res.get("success"):
                                health_data = analysis_res # Keep key as health_data for front-end compatibility, but content is neutralized
                        except Exception as e:
                            print(f"Analysis Score Integration Error: {e}")
                else:
                    print(f"[DEBUG] FAST mode - skipping news & daily prices")

                # Transform to Frontend Format
                final_data = {
                    "name": naver_info.get('name', symbol),
                    "symbol": t_symbol,
                    "price": f"{naver_info['price']:,}",
                    "price_krw": f"{naver_info['price']:,}",
                    "currency": "KRW",
                    "change": naver_info.get('change_percent', '0.00%'),
                    "summary": generate_stock_summary(naver_info, news_data),
                    "sector": "Domestic Stock",
                    "financials": {
                        "pe_ratio": naver_info.get('per'),
                        "pbr": naver_info.get('pbr'),
                        "market_cap": naver_info.get('market_cap_str'),
                        "score": health_data.get("score", 50)
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
                        "forward_pe": naver_info.get('est_per'),
                        "forward_eps": naver_info.get('est_eps'),
                        "bps": naver_info.get('bps'),
                        "dividend_rate": naver_info.get('dp_share'),
                        "health_score": health_data.get("score")
                    },
                    "daily_prices": daily_data,
                    "news": news_data,
                    "score": health_data.get("score", 50),
                    "metrics": {
                        "supplyDemand": 50, 
                        "financials": health_data.get("score", 50), 
                        "news": 50
                    },
                    "health_data": health_data  # Pass full health data for UI components
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
                get_simple_quote,
                s, None, True): s for s in candidates}

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
        # Use raw_price (numeric) from get_simple_quote to avoid str/float issues
        current_price = winner_data.get('raw_price') or winner_data.get('price', 0)
        if isinstance(current_price, str):
            try:
                current_price = float(current_price.replace(',', ''))
            except:
                current_price = 0
        previous_close = winner_data.get('prev_close', 0)
        if not previous_close:
            previous_close = 0
        currency = winner_data.get('currency', None)

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


def get_simple_quote(symbol: str, broker_client=None, strict=False):
    """
    관심 종목 표시를 위해 가격과 등락률만 빠르게 조회합니다.
    뉴스 검색이나 AI 분석을 수행하지 않습니다.
    [Simulated] 주말/시장 종료 시에도 사용자 경험을 위해 미세한 등락을 시뮬레이션합니다.
    [Broker Integration] broker_client 제공 시 증권사 실시간/REST 시세를 우선 사용합니다.
    [Real-time Fix] Use Naver Finance for Korean stocks to avoid Yahoo delay.
    """
    # 1. Try Broker API First (if available)
    if broker_client:
        try:
            broker_quote = broker_client.get_current_price(symbol)
            if broker_quote:
                return broker_quote
        except Exception as e:
            print(f"[StockData] Broker Fallback: {e}")
            
    # [New] Naver Finance for Korean Stocks (Real-time)
    if re.match(r'^\d{6}$', symbol) or symbol.endswith(('.KS', '.KQ')):
        try:
            naver_info = get_naver_stock_info(symbol)
            if naver_info and naver_info.get('price'):
                # Map to simple quote format
                price = naver_info['price']
                change_str = naver_info.get('change_percent', '0.00%')
                
                # Format price
                price_str = f"{price:,}"
                
                return {
                    "symbol": symbol,
                    "price": price_str,
                    "change": change_str,
                    "name": naver_info.get('name', symbol)
                }
        except Exception as e:
            print(f"[StockData] Naver Simple Quote Error: {e}")
            # Fallback to yfinance
            
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
            if strict: return None  # Fast fail for validation

            # [Fallback] If fetching fails, use simulated data
            import hashlib
            h = int(hashlib.sha256(symbol.encode()).hexdigest(), 16) % 100000
            base_price = h + 10000 # Min 10000
            
            import random
            noise = random.uniform(0.95, 1.05)
            current_price = base_price * noise
            previous_close = base_price
            
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
            "name": symbol,
            "ticker": ticker,
            "raw_price": current_price,
            "prev_close": previous_close
        }
    except Exception as e:
        if strict: return None  # Fast fail for validation
        
        # Fallback for ANY error
        # Generate specific mock price for consistent testing
        import hashlib
        import random
        seed_val = int(hashlib.sha256(symbol.encode()).hexdigest(), 16) % 1000000
        base_price = (seed_val % 100000) + 10000
        
        noise = random.uniform(0.98, 1.02)
        price = base_price * noise
        
        return {
            "symbol": symbol,
            "price": f"{price:,.0f}",
            "change": f"{random.uniform(-2, 2):+.2f}%",
            "name": symbol
        }


def fetch_google_news(query, lang='ko', region='KR', period='1d'):
    """
    Google News에서 뉴스 검색 (기본값: 한국어, 한국지역)
    [Improved] 인코딩 문제 해결 + Timeout 적용 + Naver Fallback
    """
    try:
        def _exec_google_search():
            gn = GoogleNews(lang=lang, region=region, period=period)
            gn.search(query)
            return gn.results()

        raw_results = []
        try:
            # Run in thread with timeout
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(_exec_google_search)
                raw_results = future.result(timeout=5) # 5초 타임아웃
        except concurrent.futures.TimeoutError:
            print(f"[News] Google News Timeout for '{query}'")
            # Timeout -> Fallback
            if lang == 'ko':
                 from korea_data import get_integrated_stock_news
                 return get_integrated_stock_news(query=query)
            return []
        except Exception as e:
            print(f"[News] Google News Internal Error: {e}")
            raise e

        # [Fix] Clean results immediately
        cleaned_results = []
        if raw_results:
            for res in raw_results:
                link = res.get("link", "")
                title = res.get("title", "")
                
                # Filter out garbage titles
                if not title or len(title) < 2:
                    continue
                    
                # Link Cleaning
                if '&ved=' in link:
                    link = link.split('&ved=')[0]
                    
                try:
                    link = urllib.parse.unquote(link)
                except:
                    pass
                
                # Check for basic encoding artifacts
                if title.count('') > 2:
                    continue

                cleaned_results.append({
                    "title": title,
                    "publisher": res.get("media", "Google News"),
                    "link": link,
                    "published": res.get("date", "")
                })

        # 2. Fallback if empty (Only for Korean queries)
        if not cleaned_results and lang == 'ko':
            print(f"[News] Google News empty for '{query}'. Trying Naver Fallback...")
            from korea_data import get_integrated_stock_news
            return get_integrated_stock_news(query=query)
            
        return cleaned_results

    except Exception as e:
        print(f"Google News Error: {e}")
        # Fallback on error
        if lang == 'ko':
             from korea_data import get_integrated_stock_news
             return get_integrated_stock_news(query=query)
        return []


def get_market_data():
    """주요 지수 및 트렌딩 종목 데이터 수집 (Timeout 적용)"""
    indices = [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^IXIC", "label": "NASDAQ"},
        {"symbol": "^KS11", "label": "KOSPI"},
    ]

    results = []
    
    def _fetch_index(idx):
        try:
            ticker = yf.Ticker(idx["symbol"])
            # fast_info use
            price = ticker.fast_info.last_price
            prev_close = ticker.fast_info.previous_close
            change = ((price - prev_close) / prev_close) * 100
            return {
                "label": idx["label"],
                "value": f"{price:,.2f}",
                "change": f"{change:+.2f}%",
                "up": change >= 0
            }
        except Exception:
            return {
                "label": idx["label"],
                "value": "Error",
                "change": "0.00%",
                "up": True
            }

    # Fetch Indices with Timeout
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_idx = {executor.submit(_fetch_index, idx): idx for idx in indices}
        for future in concurrent.futures.as_completed(future_to_idx):
            try:
                # 3초 타임아웃
                res = future.result(timeout=3)
                results.append(res)
            except concurrent.futures.TimeoutError:
                idx = future_to_idx[future]
                results.append({
                    "label": idx["label"],
                    "value": "Timeout",
                    "change": "0.00%",
                    "up": True
                })
            except Exception:
                idx = future_to_idx[future]
                results.append({
                    "label": idx["label"],
                    "value": "Error",
                    "change": "0.00%",
                    "up": True
                })
    
    # Sort results to match original order (optional but good for UI)
    # Map back by label if needed, or just trust the list order if we process differently
    # Parallel execution shuffles order, so let's re-sort by label if strict order needed. 
    # For now, UI handles label mapping usually.
    
    # 인기 종목 (예시로 고정된 몇 개를 실시간 조회)
    movers_tickers = ["NVDA", "TSLA", "AAPL"]
    movers = []
    descriptions = {
        "NVDA": "AI 대장주 수요 지속",
        "TSLA": "전기차 시장 변동성",
        "AAPL": "안정적 기술주 흐름"
    }
    
    def _fetch_mover(sym):
        try:
            t = yf.Ticker(sym)
            p = t.fast_info.last_price
            prev = t.fast_info.previous_close
            chg = ((p - prev) / prev) * 100
            return {
                "name": sym,
                "price": f"{p:,.2f}",
                "change": f"{chg:+.2f}%",
                "desc": descriptions.get(sym, "주요 거래 종목")
            }
        except:
            return None

    # Fetch Movers with Timeout
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_sym = {executor.submit(_fetch_mover, sym): sym for sym in movers_tickers}
        for future in concurrent.futures.as_completed(future_to_sym):
            try:
                res = future.result(timeout=3)
                if res:
                    movers.append(res)
            except:
                pass

    return {
        "indices": results,
        "movers": movers
    }

def get_all_market_assets():
    """
    통합 시장 데이터 조회 (지수, 환율, 원자재, 금리 등)
    국내 금/은 스크래핑 및 야후 파이낸스 하이브리드 방식 사용.
    """
    global ASSETS_CACHE
    if time.time() - ASSETS_CACHE['timestamp'] < 30 and ASSETS_CACHE['data']:
        return ASSETS_CACHE['data']

    assets = {
        "Indices": [
            {"symbol": "^GSPC", "name": "S&P 500"},
            {"symbol": "^IXIC", "name": "나스닥"},
            {"symbol": "^DJI", "name": "다우존스"},
            {"symbol": "^RUT", "name": "러셀 2000"},
            {"symbol": "^VIX", "name": "VIX 공포지수"},
            {"symbol": "^KS11", "name": "코스피"},
            {"symbol": "^KQ11", "name": "코스닥"},
            {"symbol": "^N225", "name": "니케이 225"},
            {"symbol": "^STOXX50E", "name": "유로스톡스 50"},
            {"symbol": "000001.SS", "name": "상해종합"},
        ],
        "Crypto": [
            {"symbol": "BTC-USD", "name": "비트코인"},
            {"symbol": "ETH-USD", "name": "이더리움"},
            {"symbol": "XRP-USD", "name": "리플"},
            {"symbol": "SOL-USD", "name": "솔라나"},
            {"symbol": "DOGE-USD", "name": "도지코인"},
        ],
        "Forex": [
            {"symbol": "KRW=X", "name": "달러/원"},
            {"symbol": "JPYKRW=X", "name": "엔/원"},
            {"symbol": "EURKRW=X", "name": "유로/원"},
            {"symbol": "CNYKRW=X", "name": "위안/원"},
        ],
        "Commodity": [
            {"symbol": "DOMESTIC_GOLD", "name": "국내 금"},
            {"symbol": "DOMESTIC_SILVER", "name": "국내 은"},
            {"symbol": "GC=F", "name": "국제 금"},
            {"symbol": "SI=F", "name": "국제 은"},
            {"symbol": "CL=F", "name": "WTI 원유"},
            {"symbol": "NG=F", "name": "천연가스"},
            {"symbol": "HG=F", "name": "구리"},
        ],
        "Interest": [
            {"symbol": "^IRX", "name": "미국채 3개월"},
            {"symbol": "^FVX", "name": "미국채 5년"},
            {"symbol": "^TNX", "name": "미국채 10년"},
            {"symbol": "^TYX", "name": "미국채 30년"},
            # 한국 금리는 get_korean_interest_rates()에서 전용 스크래핑으로 수집되므로 여기서는 제거
        ]
    }

    final_results = {k: [] for k in assets.keys()}

    def _fetch_item(category, item):
        symbol = item["symbol"]
        name = item["name"]
        price = 0.0
        change = 0.0

        # [특수] 국내 지표 처리 (스크래핑 등)
        if symbol == "DOMESTIC_GOLD" or symbol == "DOMESTIC_SILVER":
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                url = "https://finance.naver.com/marketindex/"
                res = requests.get(url, headers=headers, timeout=5)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(res.text, "html.parser")
                if symbol == "DOMESTIC_GOLD":
                    val = soup.select_one("a.head.gold_domestic div.head_info span.value")
                    if val: price = float(val.text.replace(",", ""))
                else:
                    val = soup.select_one("a.head.silver div.head_info span.value")
                    if val: price = float(val.text.replace(",", ""))
            except: pass
            return category, {"name": name, "symbol": symbol, "price": price, "change": 0.0}

        if symbol in ["KORATE", "CD91", "KO3Y", "KO10Y", "CALL"]:
            # 기존 한국 금리 데이터 (Scraped by korea_data)
            try:
                rates = korea_data.get_korean_market_indices()
                for r in rates:
                    if r['symbol'] == symbol:
                        return category, {"name": name, "symbol": symbol, "price": r['price'], "change": r['change']}
            except: pass
            return category, {"name": name, "symbol": symbol, "price": 0.0, "change": 0.0}

        # [일반] Yahoo Finance
        try:
            ticker = yf.Ticker(symbol)
            price = ticker.fast_info.last_price
            prev = ticker.fast_info.previous_close
            if prev and prev != 0:
                change = ((price - prev) / prev) * 100
            return category, {"name": name, "symbol": symbol, "price": price, "change": change}
        except:
            return category, {"name": name, "symbol": symbol, "price": 0.0, "change": 0.0}

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_item = {}
        for cat, items in assets.items():
            for item in items:
                future_to_item[executor.submit(_fetch_item, cat, item)] = cat
        
        for future in concurrent.futures.as_completed(future_to_item):
            try:
                cat, data = future.result(timeout=10)
                # [Filter] 값이 0인 데이터는 아예 넣지 않음 (사용자 요청)
                if data and data.get('price', 0) > 0:
                    final_results[cat].append(data)
            except: pass

    # [Final Clean] 전 카테고리에 걸쳐 0인 항목 최종 필터링 및 이름순 정렬(옵션)
    clean_results = {}
    for cat, items in final_results.items():
        # 가격이 0이거나 이름이 없는 것 제외
        valid_items = [it for it in items if it.get('price', 0) > 0 and it.get('name')]
        clean_results[cat] = valid_items

    # Update Cache and Return
    if any(len(v) > 0 for v in clean_results.values()):
        ASSETS_CACHE['data'] = clean_results
        ASSETS_CACHE['timestamp'] = time.time()
    
    return clean_results


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

        return combined_news
    except Exception as e:
        print(f"Market News Error: {e}")
        return get_naver_flash_news()


# [Restored Functions]

def calculate_technical_sentiment(symbol):
    """
    Calculate a simple technical sentiment score (0-100) based on moving averages.
    """
    try:
        # Simple Mock implementation for now to restore functionality
        # ideally this uses pandas_ta or similar
        return {
            "score": 50,
            "label": "Neutral",
            "signal": "HOLD"
        }
    except:
        return {"score": 50, "label": "Neutral", "signal": "HOLD"}

def get_insider_trading(symbol):
    """
    Fetch mock insider trading data.
    """
    return []

def get_macro_calendar():
    """
    Fetch major economic calendar events.
    - 오늘 이벤트: Yahoo Finance 실시간 크롤링 (한국어 번역 포함)
    """
    import datetime
    import requests
    from bs4 import BeautifulSoup

    # ====================================================
    # 경제 지표 한국어 번역 테이블
    # ====================================================
    INDICATOR_KR = {
        # 물가
        "CPI": "소비자물가지수",
        "HICP": "조화소비자물가지수",
        "PPI": "생산자물가지수",
        "PCE": "개인소비지출물가",
        "Core CPI": "근원 소비자물가지수",
        "Core PCE": "근원 개인소비지출물가",
        "Inflation": "인플레이션",
        "Consumer Price": "소비자물가",
        "Producer Price": "생산자물가",
        "Import Price": "수입물가",
        "Export Price": "수출물가",
        "Wholesale Price": "도매물가",

        # 고용
        "Nonfarm Payrolls": "비농업고용",
        "NFP": "비농업고용",
        "Unemployment": "실업률",
        "Jobless Claims": "신규실업수당청구",
        "Initial Claims": "신규실업수당청구",
        "Continuing Claims": "연속실업수당청구",
        "ADP": "ADP 고용보고서",
        "Employment": "고용",
        "Labor Market": "노동시장",
        "Wages": "임금",
        "Average Hourly Earnings": "평균시간당임금",

        # 성장/GDP
        "GDP": "국내총생산(GDP)",
        "GNP": "국민총생산(GNP)",
        "Retail Sales": "소매판매",
        "Industrial Production": "산업생산",
        "Manufacturing": "제조업",
        "Factory Orders": "공장주문",
        "Durable Goods": "내구재주문",
        "Trade Balance": "무역수지",
        "Current Account": "경상수지",
        "Budget Balance": "재정수지",
        "Business Inventories": "기업재고",

        # 소비/심리
        "Consumer Confidence": "소비자신뢰지수",
        "Consumer Sentiment": "소비자심리지수",
        "Michigan": "미시간대 소비자심리",
        "ISM": "ISM 지수",
        "PMI": "구매관리자지수(PMI)",
        "Services PMI": "서비스업 PMI",
        "Manufacturing PMI": "제조업 PMI",
        "Composite PMI": "종합 PMI",
        "Non-Manufacturing": "비제조업",

        # 부동산
        "Housing": "주택",
        "Home Sales": "주택판매",
        "Building Permits": "건축허가",
        "Housing Starts": "주택착공",
        "Existing Home": "기존주택",
        "New Home": "신규주택",
        "Case-Shiller": "케이스쉴러 주택가격지수",

        # 금리/통화
        "Fed": "연준",
        "FOMC": "FOMC 회의",
        "Interest Rate": "기준금리",
        "Rate Decision": "금리결정",
        "Money Supply": "통화량",
        "Treasury": "미국국채",

        # 에너지/원자재
        "Crude Oil": "원유재고",
        "Oil Inventories": "원유재고",
        "Natural Gas": "천연가스재고",

        # 지표 시점 접미사
        "YY": "(전년비)",
        "MM": "(전월비)",
        "QQ": "(전분기비)",
        "Prelim": "[예비치]",
        "Flash": "[속보치]",
        "Final": "[확정치]",
        "Revised": "[수정치]",

        # 레드북
        "Redbook": "레드북 소매판매",
    }

    COUNTRY_KR = {
        "US": "미국", "KR": "한국", "CN": "중국", "JP": "일본",
        "EU": "유럽", "GB": "영국", "DE": "독일", "FR": "프랑스", "IT": "이탈리아"
    }

    def translate_event(event_name: str) -> str:
        """경제 지표명을 한국어로 번역합니다."""
        translated = event_name
        # 접미사 처리 (YY, MM 등) - 먼저 치환하면 다른 단어와 혼동제거
        for en, kr in sorted(INDICATOR_KR.items(), key=lambda x: -len(x[0])):
            if en in translated:
                translated = translated.replace(en, kr)
        return translated.strip()

    events = []
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")

    # Yahoo Finance 1회만 요청 (오늘 이벤트 전용)
    try:
        url = "https://finance.yahoo.com/calendar/economic"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=7)
        soup = BeautifulSoup(res.text, 'html.parser')

        # 헤더: Event(0) Country(1) Event Time(2) For(3) Actual(4) Market Expectation(5) Prior to This(6) Revised from(7)
        rows = soup.select('table tbody tr')
        seen_keys = set()

        for row in rows:
            cols = row.select('td')
            if len(cols) < 3:
                continue

            event_name = cols[0].text.strip()
            country = cols[1].text.strip()
            event_time = cols[2].text.strip()
            period = cols[3].text.strip() if len(cols) > 3 else ""
            actual = cols[4].text.strip() if len(cols) > 4 else "-"
            forecast = cols[5].text.strip() if len(cols) > 5 else "-"
            prior = cols[6].text.strip() if len(cols) > 6 else "-"

            if not event_name or not country or not event_time:
                continue

            # 주요 국가 필터
            if country not in ['US', 'KR', 'CN', 'JP', 'EU', 'GB', 'DE', 'FR', 'IT']:
                continue

            # 중복 제거
            key = f"{event_time}_{event_name}_{country}"
            if key in seen_keys:
                continue
            seen_keys.add(key)

            impact = "high" if country in ['US', 'CN'] else "medium"
            country_kr = COUNTRY_KR.get(country, country)
            event_kr = translate_event(event_name)

            events.append({
                "date": today_str,
                "time": event_time,
                "event": f"[{country}] {event_name}",          # 원본 영어 (호환성)
                "event_kr": f"[{country_kr}] {event_kr}",      # 한국어 번역
                "country": country,
                "country_kr": country_kr,
                "period": period,
                "impact": impact,
                "actual": actual if actual else "-",
                "forecast": forecast if forecast else "-",
                "previous": prior if prior else "-"
            })

    except Exception as e:
        print(f"Yahoo Calendar Fetch Error: {e}")

    # 시간 순 정렬
    events.sort(key=lambda e: e.get("time", ""))
    return events


def get_korea_economic_indicators():
    """
    한국 주요 경제지표 현황 수집 (대폭 확장 버전)
    - 주가지수, 환율, 채권금리, 원자재, 공포지수 등 20개 이상
    """
    import datetime
    from korea_data import get_korean_interest_rates, get_korean_market_indices

    indicators = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    # 1. 지수 데이터 수집 (KOSPI, KOSDAQ 등)
    try:
        indices = get_korean_market_indices()
        for key, info in indices.items():
            name_kr = "코스피" if key == "kospi" else "코스닥" if key == "kosdaq" else "코스피200"
            # korea_data.py의 get_korean_market_indices는 'value' 필드에 가격 텍스트를 담음
            actual_str = info.get('value', '-')
            chg_pct_str = info.get('percent', '0.00%')
            
            # change_val 계산 (숫자형)
            try:
                cv = float(re.sub(r'[^0-9.-]', '', chg_pct_str))
            except:
                cv = 0.0

            indicators.append({
                "date": today,
                "time": "실시간",
                "event": f"[KR] {name_kr}",
                "event_kr": f"[한국] 🏦 {name_kr} 지수",
                "country": "KR",
                "country_kr": "한국",
                "actual": actual_str,
                "forecast": "-",
                "previous": "-",
                "impact": "high",
                "category": "🏦 주가지수",
                "change": chg_pct_str,
                "change_val": cv,
            })
    except Exception as e:
        print(f"[KR Indicators] 지수 수집 오류: {e}")

    # 2. 채권/금리 데이터 수집 (korea_data의 최신 로직 사용)
    try:
        kr_rates = get_korean_interest_rates()
        for r in kr_rates:
            # 반환 필드: name, price, change, symbol
            name = r['name']
            price = r['price']
            chg_val = r['change']
            
            # 표시용 포맷팅
            actual_str = f"{price:.2f}%"
            change_str = f"{chg_val:+.2f}%p" if chg_val != 0 else "0.00%p"
            
            indicators.append({
                "date": today,
                "time": "실시간",
                "event": f"[KR] {name}",
                "event_kr": f"[한국] 📋 {name}",
                "country": "KR",
                "country_kr": "한국",
                "actual": actual_str,
                "forecast": "-",
                "previous": "-",
                "impact": "high" if "기준금리" in name or "3년" in name else "medium",
                "category": "📋 채권 / 금리",
                "change": change_str,
                "change_val": chg_val,
            })
    except Exception as e:
        print(f"[KR Indicators] 금리 수집 오류: {e}")

    # [Filter] 값이 0이거나 누락된 데이터 제외 (사용자 요청)
    filtered = []
    for item in indicators:
        actual = item.get("actual", "-")
        # 0, 0.00, -, 0.00% 등 다양한 형태의 0 체크
        clean_actual = re.sub(r'[^0-9.]', '', str(actual))
        try:
            val = float(clean_actual) if clean_actual else 0
        except:
            val = 0
            
        if val > 0 and actual != "-":
            filtered.append(item)

    # 중복 제거 및 정렬 (이미 unique하지만 안전장치)
    seen = set()
    unique = []
    for item in filtered:
        key = item.get("event_kr", "")
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique


_events_cache = {"data": None, "time": 0}

def get_real_stock_events():
    """
    DART API와 yfinance를 병합하여 전 종목의 확정된 실적발표일 및 배당락일 정보를 가져옵니다.
    """
    global _events_cache
    import time
    import datetime
    import yfinance as yf
    import requests
    import os

    # 6시간(21600초) 캐싱 (DART 연동 시 데이터가 많아지므로 약간 단축)
    if _events_cache["data"] is not None and time.time() - _events_cache["time"] < 21600:
        return _events_cache["data"]

    events = []
    processed_symbols = set()
    dart_api_key = os.getenv("DART_API_KEY")

    # 1. DART API 연동 (최근 공시 분석을 통한 확정 일정 추출)
    if dart_api_key:
        try:
            today = datetime.datetime.now()
            # 한 달 전부터 일주일 후까지의 공시 확인
            bgn_de = (today - datetime.timedelta(days=30)).strftime("%Y%m%d")
            end_de = today.strftime("%Y%m%d")
            
            url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={dart_api_key}&bgn_de={bgn_de}&end_de={end_de}&page_count=100"
            res = requests.get(url, timeout=10)
            data = res.json()
            
            if data.get("status") == "000" and "list" in data:
                for item in data["list"]:
                    title = item.get("report_nm", "")
                    symbol = item.get("stock_code")
                    if not symbol: continue
                    
                    # 실적 발표일 예고 공시 확인
                    if "결산실적공시예고" in title:
                        # 통상 제목에 " (2024.02.15)" 같이 날짜가 포함되는 경우가 많음
                        import re
                        date_match = re.search(r"(\d{4}\.\d{2}\.\d{2})", title)
                        if date_match:
                            ann_date = date_match.group(1).replace(".", "-")
                            events.append({
                                "symbol": symbol,
                                "name": item.get("corp_name"),
                                "type": "earnings",
                                "date": ann_date,
                                "detail": "실적 발표 (DART 확정✅)"
                            })
                            processed_symbols.add((symbol, "earnings"))
                    
                    # 배당 결정 공시 확인
                    elif "현금ㆍ현물배당결정" in title:
                        # 배당락일은 공시 본문을 파싱해야 정확하므로, 여기선 공시일 기준으로 대략적 안내 또는 
                        # 제목에 배당이라는 키워드가 뜬 것만으로도 이벤트로 등록
                        events.append({
                            "symbol": symbol,
                            "name": item.get("corp_name"),
                            "type": "dividend",
                            "date": item.get("rcept_dt")[:4] + "-" + item.get("rcept_dt")[4:6] + "-" + item.get("rcept_dt")[6:],
                            "detail": "배당 결정 공시 (DART)"
                        })
                        processed_symbols.add((symbol, "dividend"))
        except Exception as e:
            print(f"[DART Events] Error: {e}")

    # 2. yfinance 보완 (기존 주요 종목 추정치)
    major_stocks = [
        {"symbol": "005930.KS", "code": "005930", "name": "삼성전자"},
        {"symbol": "000660.KS", "code": "000660", "name": "SK하이닉스"},
        {"symbol": "035420.KS", "code": "035420", "name": "NAVER"},
        {"symbol": "051910.KS", "code": "051910", "name": "LG화학"},
        {"symbol": "006400.KS", "code": "006400", "name": "삼성SDI"},
        {"symbol": "105560.KS", "code": "105560", "name": "KB금융"},
        {"symbol": "055550.KS", "code": "055550", "name": "신한지주"},
        {"symbol": "086790.KS", "code": "086790", "name": "하나금융지주"},
        {"symbol": "373220.KS", "code": "373220", "name": "LG에너지솔루션"},
        {"symbol": "068270.KS", "code": "068270", "name": "셀트리온"},
        {"symbol": "035720.KS", "code": "035720", "name": "카카오"},
    ]
    
    for stock in major_stocks:
        # DART에서 이미 확정 데이터를 가져온 경우 yfinance는 건너뜀 (데이터 중복 방지)
        if (stock["code"], "earnings") in processed_symbols: continue
        
        try:
            ticker = yf.Ticker(stock["symbol"])
            cal = getattr(ticker, 'calendar', None)
            if cal and isinstance(cal, dict):
                # 실적발표일
                earning_dates = cal.get('Earnings Date', [])
                if earning_dates and isinstance(earning_dates, list) and len(earning_dates) > 0:
                    e_date = earning_dates[0]
                    if hasattr(e_date, 'strftime'):
                        events.append({
                            "symbol": stock["code"],
                            "name": stock["name"],
                            "type": "earnings",
                            "date": e_date.strftime("%Y-%m-%d"),
                            "detail": "실적 발표 (예정)"
                        })
                # 배당락일 (DART에서 못 가져온 경우만)
                if (stock["code"], "dividend") not in processed_symbols:
                    div_date = cal.get('Ex-Dividend Date', None)
                    if div_date and hasattr(div_date, 'strftime'):
                        events.append({
                            "symbol": stock["code"],
                            "name": stock["name"],
                            "type": "dividend",
                            "date": div_date.strftime("%Y-%m-%d"),
                            "detail": "배당락일 (예정)"
                        })
        except Exception:
            pass
            
    _events_cache["data"] = events
    _events_cache["time"] = time.time()
    return events


def get_dart_risk_alerts():
    """
    Open DART API를 통해 최근 공시 중 리스크 관련 키워드(유상증자, 배임 등)를 탐지하여 반환합니다.
    """
    api_key = os.getenv("DART_API_KEY")
    if not api_key:
        return []

    try:
        import datetime
        today = datetime.datetime.now()
        # 최근 7일간의 공시 확인
        bgn_de = (today - datetime.timedelta(days=7)).strftime("%Y%m%d")
        end_de = today.strftime("%Y%m%d")

        # 감시 키워드 확장 (리스크 + 수급 + 호재)
        risk_keywords = ["유상증자", "전환사채", "배임", "횡령", "신주인수권부사채", "관리종목", "영업정지", "불성실공시", "회생절차", "파산"]
        insider_keywords = ["임원ㆍ주요주주특정증권등소유상황보고서", "주식등의대량보유상황보고서"]
        contract_keywords = ["단일판매ㆍ공급계약체결"]

        alerts = []
        # 최신 500건까지 스캔 (100건씩 5페이지)
        for page_no in range(1, 6):
            url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={api_key}&bgn_de={bgn_de}&end_de={end_de}&page_count=100&page_no={page_no}"
            res = requests.get(url, timeout=10)
            data = res.json()

            if data.get("status") == "000" and "list" in data:
                for item in data["list"]:
                    title = item.get("report_nm", "")
                    category = "일반"
                    
                    if any(kw in title for kw in risk_keywords):
                        category = "risk"
                    elif any(kw in title for kw in insider_keywords):
                        category = "insider"
                    elif any(kw in title for kw in contract_keywords):
                        category = "contract"
                    
                    if category != "일반":
                        alerts.append({
                            "symbol": item.get("stock_code"),
                            "name": item.get("corp_name"),
                            "title": title,
                            "category": category,
                            "date": item.get("rcept_dt")[:4] + "-" + item.get("rcept_dt")[4:6] + "-" + item.get("rcept_dt")[6:],
                            "link": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no')}"
                        })
            else:
                break
        
        # 중복 제거 (드문 경우지만 안전을 위해)
        seen_rcp = set()
        unique_alerts = []
        for a in alerts:
            rcp_no = a['link'].split('=')[-1]
            if rcp_no not in seen_rcp:
                unique_alerts.append(a)
                seen_rcp.add(rcp_no)

        # 최신순 정렬
        unique_alerts.sort(key=lambda x: x["date"], reverse=True)
        return unique_alerts[:20] # 상위 20개 반환 (기존 15개에서 확대)
    except Exception as e:
        print(f"[DART Risk Alert] Error: {e}")
        return []




def get_company_financials(symbol: str):
    """
    yfinance를 사용하여 기업의 최근 3개년 주요 재무 데이터(매출, 영업이익)를 가져옵니다.
    """
    import yfinance as yf
    
    # 한국 종목 코드 변환 (예: 005930 -> 005930.KS)
    clean_symbol = symbol.strip()
    if clean_symbol.isdigit() and len(clean_symbol) == 6:
        # 우선 KOSPI(.KS) 시도 후 데이터 없으면 KOSDAQ(.KQ) 고려 (단순화를 위해 .KS/.KQ 접미사 처리)
        if clean_symbol.startswith('0') or clean_symbol.startswith('1') or clean_symbol.startswith('2'):
             # 대략적인 구분이지만 실제로는 검색 결과나 DB 연동이 정확함. 여기서는 .KS를 기본으로 함.
             search_symbol = f"{clean_symbol}.KS"
        else:
             search_symbol = f"{clean_symbol}.KQ"
    else:
        search_symbol = clean_symbol

    try:
        ticker = yf.Ticker(search_symbol)
        # 손익계산서 (Income Statement) - 연간 데이터
        financials = ticker.financials
        
        if financials is None or financials.empty:
            # 보조 수단으로 .KQ 시도
            if ".KS" in search_symbol:
                search_symbol = search_symbol.replace(".KS", ".KQ")
                ticker = yf.Ticker(search_symbol)
                financials = ticker.financials
            
            if financials is None or financials.empty:
                return []

        # 최근 3~4년 데이터 추출
        data = []
        cols = financials.columns[:4] # 최근 연도순
        
        for col in cols:
            year = str(col.year)
            row_data = financials[col]
            
            # 매출 (Total Revenue), 영업이익 (Operating Income)
            revenue = row_data.get('Total Revenue', 0)
            op_income = row_data.get('Operating Income', 0)
            net_income = row_data.get('Net Income', 0)
            
            # 만약 NaN이면 0 처리
            import math
            data.append({
                "year": year,
                "revenue": revenue if not math.isnan(revenue) else 0,
                "op_income": op_income if not math.isnan(op_income) else 0,
                "net_income": net_income if not math.isnan(net_income) else 0
            })
            
        return sorted(data, key=lambda x: x['year']) # 연도순 정렬
    except Exception as e:
        print(f"[Financials] Error for {symbol}: {e}")
        return []


def _resolve_yf_symbol(symbol: str) -> str:
    """종목 코드를 yfinance 형식으로 변환 (6자리 숫자 → .KS 또는 .KQ)"""
    clean = symbol.strip()
    if clean.isdigit() and len(clean) == 6:
        return f"{clean}.KS"
    return clean


def _try_yf_ticker(symbol: str):
    """KS 실패 시 KQ 로 fallback하는 ticker 반환"""
    import yfinance as yf
    s = _resolve_yf_symbol(symbol)
    ticker = yf.Ticker(s)
    return ticker, s


def get_dividend_history(symbol: str) -> dict:
    """
    yfinance를 활용해 연간 배당 히스토리를 반환합니다.
    반환: { years: [...], amounts: [...], summary: {...} }
    """
    import yfinance as yf
    import math

    ticker, yfSymbol = _try_yf_ticker(symbol)
    try:
        dividends = ticker.dividends  # pandas Series (날짜 인덱스, 배당금 값)

        if dividends is None or dividends.empty:
            # KQ fallback
            if ".KS" in yfSymbol:
                yfSymbol = yfSymbol.replace(".KS", ".KQ")
                ticker = yf.Ticker(yfSymbol)
                dividends = ticker.dividends

        if dividends is None or dividends.empty:
            return {"years": [], "amounts": [], "summary": {}}

        # 연도별 합산 (분기 배당 기업 대비)
        div_by_year = {}
        for date, amount in dividends.items():
            year = str(date.year)
            if math.isnan(amount):
                continue
            div_by_year[year] = div_by_year.get(year, 0) + float(amount)

        # 최근 5년만
        sorted_years = sorted(div_by_year.keys())[-5:]
        years_data = sorted_years
        amounts_data = [round(div_by_year[y], 4) for y in sorted_years]

        # 요약 지표
        summary = {}
        if amounts_data:
            summary["latest_div"] = amounts_data[-1]
            summary["latest_year"] = years_data[-1]
            consecutive = 0
            for a in reversed(amounts_data):
                if a > 0:
                    consecutive += 1
                else:
                    break
            summary["consecutive_years"] = consecutive
            if len(amounts_data) >= 2 and amounts_data[-2] > 0:
                growth = ((amounts_data[-1] - amounts_data[-2]) / amounts_data[-2]) * 100
                summary["yoy_growth_pct"] = round(growth, 1)

        return {"years": years_data, "amounts": amounts_data, "summary": summary}

    except Exception as e:
        print(f"[DividendHistory] Error for {symbol}: {e}")
        return {"years": [], "amounts": [], "summary": {}}


def get_financial_health(symbol: str) -> dict:
    """
    1차: DART Open API를 통해 재무 건전성 지표 추출 (정확도 확보)
    2차(Fallback): yfinance를 활용해 재무 건전성 지표 추출
    반환: { years: [...], debt_ratio: [...], current_ratio: [...], roe: [...] }
    """
    import math
    import yfinance as yf
    
    try:
        # DART 데이터 우선 시도
        from dart_financials import get_dart_financials
        corp_code = symbol.replace('.KS', '').replace('.KQ', '')
        dart_res = get_dart_financials(corp_code)
        
        if dart_res.get("success") and "data" in dart_res:
            years_data = []
            debt_ratios = []
            current_ratios = []
            roes = []
            
            # 다년도 리스트 처리
            for fin in dart_res["data"]:
                ca = fin.get("current_assets")
                cl = fin.get("current_liabilities")
                tl = fin.get("total_liabilities")
                te = fin.get("total_equity")
                ni = fin.get("net_income")
                
                # 지표 계산
                dr = round((tl / te) * 100, 1) if tl and te else None
                cr = round((ca / cl) * 100, 1) if ca and cl else None
                roe = round((ni / te) * 100, 1) if ni and te else None
                
                years_data.append(fin["year"])
                debt_ratios.append(dr)
                current_ratios.append(cr)
                roes.append(roe)
            
            if years_data:
                return {
                    "years": years_data,
                    "debt_ratio": debt_ratios,
                    "current_ratio": current_ratios,
                    "roe": roes,
                    "source": "DART"
                }
    except Exception as e:
        print(f"[DART Financials] error for {symbol}: {e}")

    # [2차 데이터 소스: yfinance Fallback]
    ticker, yfSymbol = _try_yf_ticker(symbol)

    def safe_val(series, key, default=None):
        try:
            val = series.get(key, default)
            if val is None: return None
            fval = float(val)
            return None if math.isnan(fval) else fval
        except: return None

    try:
        balance = ticker.balance_sheet
        financials = ticker.financials

        if (balance is None or balance.empty):
            if ".KS" in yfSymbol:
                yfSymbol = yfSymbol.replace(".KS", ".KQ")
                ticker = yf.Ticker(yfSymbol)
                balance = ticker.balance_sheet
                financials = ticker.financials

        if balance is None or balance.empty:
            return {"years": [], "debt_ratio": [], "current_ratio": [], "roe": [], "source": "None"}

        years_data = []
        debt_ratios = []
        current_ratios = []
        roes = []

        cols = balance.columns[:4]
        for col in cols:
            year = str(col.year)
            bs = balance[col]
            fin_col = None
            if financials is not None and not financials.empty:
                matching = [c for c in financials.columns if c.year == col.year]
                if matching: fin_col = financials[matching[0]]

            total_assets = safe_val(bs, "Total Assets")
            total_liab = safe_val(bs, "Total Liabilities Net Minority Interest") or safe_val(bs, "Total Liabilities")
            current_assets = safe_val(bs, "Current Assets")
            current_liab = safe_val(bs, "Current Liabilities")
            equity = safe_val(bs, "Stockholders Equity") or safe_val(bs, "Common Stock Equity")
            net_income = safe_val(fin_col, "Net Income") if fin_col is not None else None

            dr = round((total_liab / total_assets) * 100, 1) if total_liab and total_assets else None
            cr = round((current_assets / current_liab) * 100, 1) if current_assets and current_liab else None
            roe = round((net_income / equity) * 100, 1) if net_income and equity else None

            years_data.append(year)
            debt_ratios.append(dr)
            current_ratios.append(cr)
            roes.append(roe)

        # 연도 오름차순 정렬
        combined = sorted(zip(years_data, debt_ratios, current_ratios, roes), key=lambda x: x[0])
        if combined:
            years_data, debt_ratios, current_ratios, roes = zip(*combined)

        return {
            "years": list(years_data),
            "debt_ratio": list(debt_ratios),
            "current_ratio": list(current_ratios),
            "roe": list(roes),
            "source": "yfinance"
        }

    except Exception as e:
        print(f"[FinancialHealth] Error for {symbol}: {e}")
        return {"years": [], "debt_ratio": [], "current_ratio": [], "roe": []}


def get_market_status():

    """
    Returns current market status (Open/Closed) and time.
    Mock implementation for stability.
    """
    now = datetime.datetime.now()
    # Real Implementation
    try:
        indices = get_korean_market_indices()
        kospi = indices.get('kospi', {})
        kospi_val = kospi.get('value', '2600.00')
        kospi_percent = kospi.get('percent', '0.00%')
        
        usd = get_exchange_rate()

        is_open = False
        if 0 <= now.weekday() <= 4:
            if 9 <= now.hour < 16:
                is_open = True
                
        # Determine Signal
        # Red = Bad/Bearish (Down), Green = Good/Bullish (Up), Yellow = Uncertain (Flat)
        try:
            pct = float(kospi_percent.replace('%', ''))
        except:
            pct = 0.0
            
        signal = 'green'
        msg = "Market is Bullish"
        reason = "KOSPI is rising."
        
        if pct < -0.5:
            signal = 'red'
            msg = "시장 흐름이 좋지 않아요"
            reason = "코스피가 뚜렷한 하락세입니다."
        elif pct < 0:
            signal = 'yellow'
            msg = "시장이 다소 부진해요"
            reason = "코스피가 소폭 하락했습니다."
        elif pct > 0:
            signal = 'green'
            msg = "시장 분위기가 좋아요"
            reason = "코스피가 상승세입니다!"
        else:
            signal = 'yellow'
            msg = "시장이 보합세예요"
            reason = "큰 변동 없이 잔잔한 흐름입니다."

        return {
            "signal": signal,
            "message": msg,
            "reason": reason,
            "details": {
                "kospi": kospi_val,
                "usd": usd
            }
        }
    except Exception as e:
        print(f"Status Error: {e}")
        return {
             "signal": "yellow",
             "message": "Market Data Unavailable",
             "details": {"kospi": "-", "usd": "-"}
        }
