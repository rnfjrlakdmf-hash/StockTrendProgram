
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
try:
    from GoogleNews import GoogleNews
except ImportError:
    GoogleNews = None
    print("⚠️ [Warning] GoogleNews package not found. News fetch may be limited.")
try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None
    print("⚠️ [Warning] deep_translator package not found. Translation will be disabled.")

from korea_data import (
    get_korean_name, get_naver_flash_news, get_naver_stock_info, 
    get_naver_daily_prices, get_naver_market_index_data, search_korean_stock_symbol,
    search_stock_code, get_korean_stock_name, get_korean_market_indices, get_exchange_rate
)
import korea_data
from risk_analyzer import calculate_analysis_score
from turbo_engine import turbo_cache

# [Market Status] 한국 증시 운영 시간 및 현재상태 판별 (v1.0)
def get_market_status_info():
    """
    KST 기준 현재 시장 운영 상태를 상세히 판별합니다.
    - 장전 시간외: 08:30 ~ 09:00
    - 정규장(장중): 09:00 ~ 15:30
    - 장후 시간외/단일가: 15:30 ~ 18:00
    - 장마감: 18:00 ~ 다음날 08:30 및 주말
    """
    # KST 기준 시간 설정
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
    current_time = now.hour * 100 + now.minute
    weekday = now.weekday() # 0:월, 4:금, 5:토, 6:일

    # 기본값
    status_code = "CLOSED" 
    status_text = "장마감"
    is_open = False
    
    # 주말 처리
    if weekday >= 5:
        return {
            "status": "CLOSED",
            "text": "장마감 (주말)",
            "is_open": False,
            "can_trade_regular": False,
            "current_time_kst": now.strftime("%H:%M") # [Fix] 주말에도 시각 정보 포함
        }

    # 시간대별 상세 판별
    if 830 <= current_time < 900:
        status_code = "PRE_MARKET"
        status_text = "장전 시간외"
        is_open = True # 거래 가능 범위 포함
    elif 900 <= current_time < 1530:
        status_code = "OPEN"
        status_text = "장중 (정규장)"
        is_open = True
    elif 1530 <= current_time < 1800:
        status_code = "AFTER_MARKET"
        status_text = "장후 시간외/단일가"
        is_open = True
    else:
        status_code = "CLOSED"
        status_text = "정규장 종료"
        is_open = False

    return {
        "status": status_code,
        "text": status_text,
        "is_open": is_open,
        "can_trade_regular": (status_code == "OPEN"),
        "current_time_kst": now.strftime("%H:%M")
    }

# [Cache] Memory Cache for Static Data
NAME_CACHE = {}
STOCK_DATA_CACHE = {}  # {symbol: (data, timestamp)}
CACHE_TTL = 300  # 300 seconds (5 minutes)
ASSETS_CACHE = {
    "data": None,
    "timestamp": 0
}

# [Config] Global Stock Korean Name Mapping
GLOBAL_KOREAN_NAMES = {
    "AAPL": "애플", "TSLA": "테슬라", "MSFT": "마이크로소프트", "NVDA": "엔비디아",
    "AMZN": "아마존", "GOOGL": "구글", "GOOG": "구글",
    "META": "메타",
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
    "TQQQ": "TQQQ",
    "SOXL": "SOXL",
    "SCHD": "슈드",
    "JEPI": "JEPI",
    "SPY": "SPY",
    "QQQ": "QQQ",
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
    "PANW": "팔로알토 네트웍스",
    "SNOW": "스노우플레이크",
    "ARM": "ARM 홀딩스",
    "SMCI": "슈퍼마이크로컴퓨터",
    "MSTR": "마이크로스트래티지",
    "DELL": "델 테크놀로지스",
    "MBLY": "모빌아이",
    "PATH": "유아이패스",
    "AI": "C3.ai",
    "BABA": "알리바바",
    "PDD": "핀듀오듀오",
    "TME": "텐센트 뮤직",
    "LI": "리 오토",
    "XPEV": "샤오펑",
    "NIO": "니오",
    "COIN": "코인베이스",
    "HOOD": "로빈후드",
    "SQ": "블록 (스퀘어)",
    "PYPL": "페이팔",
    "SOXL": "SOXL (반도체 3배)",
    "SOXS": "SOXS (반도체 인버스 3배)",
    "TQQQ": "TQQQ (나스닥 3배)",
    "SQQQ": "SQQQ (나스닥 인버스 3배)",
    "LABU": "LABU (바이오 3배)",
    "LABD": "LABD (바이오 인버스 3배)",
    "BITO": "비트코인 선물 ETF",
    "GLD": "금 ETF",
    "SLV": "은 ETF",
    "TLT": "미국채 20년+ ETF",
    "TMF": "미국채 20년+ 3배 ETF",
    "NVDL": "엔비디아 2배 레버리지",
    "TSLL": "테슬라 2배 레버리지",
    "MU": "마이크론",
    "SNDK": "샌디스크",
    "AIXI": "아이엑시스",
    "CRCL": "써클",
    "ARM": "ARM 홀딩스",
    "USD": "달러/원 환율",
    "KRW": "원화",
    "BTC": "비트코인",
    "ETH": "이더리움",
}

import unicodedata

def normalize_text(text: str) -> str:
    """NFC 정규화 및 공백 제거"""
    if not text: return ""
    return unicodedata.normalize('NFC', text.strip())

@turbo_cache(ttl_seconds=3600)
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
        hist_asc['ChangeVal'] = hist_asc['Close'] - hist_asc['PrevClose']

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
                "change": safe_float(row['Change']) if pd.notna(row['Change']) else 0.0,
                "change_val": safe_float(row['ChangeVal']) if pd.notna(row['ChangeVal']) else 0.0
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
    symbol = symbol.strip()
    print(f"[get_stock_info] Searching for: '{symbol}'")
    
    # [Fix] Resolve Korean Names to Codes (e.g., '삼성전자' -> '005930')
    if not re.match(r'^\d{6}$', symbol) and not symbol.endswith(('.KS', '.KQ')) and not re.match(r'^[A-Z]+$', symbol):
        from korea_data import search_korean_stock_symbol
        found_code = search_korean_stock_symbol(symbol)
        if found_code:
            print(f"[get_stock_info] Resolved '{symbol}' to code: {found_code}")
            symbol = found_code
        else:
            print(f"[get_stock_info] FAILED to resolve name '{symbol}' to code.")

    # [Cache Check]
    # if symbol in STOCK_DATA_CACHE:
    #     cached_data, timestamp = STOCK_DATA_CACHE[symbol]
    #     if time.time() - timestamp < CACHE_TTL:
    #         return cached_data



    # [Optimization] Prefer Naver for Korean Stocks
    if re.match(r'^\d{6}$', symbol) or symbol.endswith(('.KS', '.KQ')):
        try:
            # Normalize symbol
            t_symbol = symbol
            if re.match(r'^\d{6}$', t_symbol):
                t_symbol += ".KS"  # Try KS first default

            # Use Comprehensive Naver Crawler (Gather all details at once)
            from korea_data import gather_naver_stock_data
            naver_info = gather_naver_stock_data(t_symbol)
            
            if naver_info:
                print(f"[get_stock_info] Naver data fetch SUCCESS for '{t_symbol}'")
            else:
                print(f"[get_stock_info] Naver data fetch FAILED (None) for '{t_symbol}'")
                
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
                            analysis_res = f_analysis.result(timeout=10)
                            if analysis_res.get("success"):
                                health_data = analysis_res # Keep key as health_data for front-end compatibility, but content is neutralized
                        except Exception as e:
                            print(f"Analysis Score Integration Error: {e}")
                else:
                    print(f"[DEBUG] FAST mode - skipping news & daily prices")

                # Transform to Frontend Format
                final_data = {
                    "name": naver_info.get('name', symbol),
                    "description": naver_info.get('description', ''),
                    "symbol": t_symbol,
                    "price": f"{float(str(naver_info['price']).replace(',', '')):,.0f}" if isinstance(naver_info['price'], (int, float, str)) and str(naver_info['price']).replace(',','').replace('.','').isdigit() else str(naver_info['price']),
                    "price_krw": f"{float(str(naver_info['price']).replace(',', '')):,.0f}" if isinstance(naver_info['price'], (int, float, str)) and str(naver_info['price']).replace(',','').replace('.','').isdigit() else str(naver_info['price']),
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
                        "health_score": health_data.get("score"),
                        "market_status": naver_info.get('market_status'),
                        "nxt_data": naver_info.get('nxt_data')
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
        # winner_data has: symbol, price, prev_close, currency, market_cap
        target_symbol = winner_data['symbol']
        
        # [Fix] Ensure 'ticker' object exists (yf.Ticker)
        ticker_obj = winner_data.get('ticker')
        if not ticker_obj:
            ticker_obj = yf.Ticker(target_symbol)

        # Sub-tasks
        f_info = executor.submit(fetch_full_info, ticker_obj)  # Slowest
        f_hist = executor.submit(get_daily_prices_data, ticker_obj)  # Medium

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
            try:
                # Always convert to float for safe formatting with commas
                f_price = float(str(current_price).replace(',', ''))
                price_str = f"{f_price:,.0f}"
            except:
                price_str = str(current_price)
        else:
            try:
                f_price = float(str(current_price).replace(',', ''))
                price_str = f"{f_price:,.2f}"
            except:
                price_str = str(current_price)

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
                } for n in ticker_obj.news if n.get('content')]
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
        else:
             # Translate explicitly if it's a foreign stock
             if not (target_symbol.endswith('.KS') or target_symbol.endswith('.KQ')):
                 try:
                     translated = GoogleTranslator(source='en', target='ko').translate(display_name)
                     if translated:
                         display_name = translated.replace("결과", "").replace("Inc.", "주식회사").replace("Corp.", "").strip()
                 except Exception as e:
                     print(f"Deep-Translator error: {e}")
        
        if target_symbol.endswith(('.KS', '.KQ')):
            if stock_name and stock_name != target_symbol:
                display_name = stock_name

        result_data = {
            "name": display_name,
            "description": info.get('longBusinessSummary', ''),
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

        # [New] Translate Description for Foreign Stocks (if not KR)
        if not (target_symbol.endswith('.KS') or target_symbol.endswith('.KQ')):
            if result_data.get("description"):
                try:
                    translated_desc = GoogleTranslator(source='en', target='ko').translate(result_data["description"][:4500])
                    if translated_desc:
                         result_data["description"] = translated_desc
                except: pass

        # Update Cache (for yfinance results too)
        STOCK_DATA_CACHE[symbol] = (result_data, time.time())
        return result_data

    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

@turbo_cache(ttl_seconds=60)
def get_simple_quote(symbol: str, broker_client=None, strict=False):
    """
    고객님이 요청한 '실시간 정보' 확보를 최우선으로 합니다.
    야후 파이낸스 차단 상황을 대비하여 네이버 통합 API를 최우선으로 사용합니다.
    """
    # 0. Resolve Name to Code if needed
    import re
    if not re.match(r'^[A-Za-z0-9.]+$', symbol):
        from korea_data import search_stock_code
        from stock_data import GLOBAL_KOREAN_NAMES
        import unicodedata
        q_norm = unicodedata.normalize('NFC', symbol).replace(" ", "")
        resolved = None
        for t, k in GLOBAL_KOREAN_NAMES.items():
            if q_norm == k or q_norm in k:
                resolved = t
                break
        if not resolved:
            resolved = search_stock_code(q_norm)
        if resolved:
            symbol = resolved

    # 1. 네이버 통합 API 시도 (국내/해외 모두 지원)
    try:
        naver_info = get_naver_stock_info(symbol)
        if naver_info and naver_info.get('price') and naver_info['price'] != "확인불가":
            return naver_info
    except Exception as e:
        print(f"[StockData] Naver Primary Check Error for {symbol}: {e}")

    # 2. 브로커 클라이언트 사용 시도
    if broker_client:
        try:
            broker_quote = broker_client.get_current_price(symbol)
            if broker_quote:
                return broker_quote
        except: pass

    try:
        # [v3.7.2] Robust Universal Ticker Normalization (Strip all suffixes for US equities)
        yf_symbol = symbol
        is_us_stock = False
        
        # Determine if it's a US stock: Contains letters or explicitly US suffix
        if re.search(r'[A-Z]', symbol.split('.')[0]) or symbol.endswith(('.O', '.N', '.A', '.K')):
            is_us_stock = True
            # Strip Naver/Reuters suffixes for yfinance compatibility
            if '.' in symbol:
                yf_symbol = symbol.split('.')[0]
            
        ticker = yf.Ticker(yf_symbol)
        
        # [v3.7.5] Multi-layer price extraction for yfinance reliability
        current_price = ticker.fast_info.last_price
        if not current_price or math.isnan(current_price):
            current_price = ticker.info.get('currentPrice') or ticker.info.get('regularMarketPrice')
            
        prev_close = ticker.fast_info.previous_close
        if not prev_close or math.isnan(prev_close):
            prev_close = ticker.info.get('previousClose') or ticker.info.get('regularMarketPreviousClose')
        
        # [Fix] Handle NaN from yfinance
        import math
        if current_price and current_price > 0 and not math.isnan(current_price):
            change_pct = ((current_price - prev_close) / prev_close * 100) if prev_close and not math.isnan(prev_close) else 0
            
            # Format price: 2 decimals for US stocks, 0 for Korean stocks (digits)
            if is_us_stock:
                price_str = f"{current_price:,.2f}"
            else:
                price_str = f"{current_price:,.0f}"

            return {
                "symbol": symbol,
                "name": symbol,
                "price": price_str,
                "change": f"{change_pct:+.2f}%",
                "up": change_pct >= 0,
                "currency": "USD" if is_us_stock else "KRW"
            }
    except: pass

    if strict: return None
    
    return {
        "symbol": symbol,
        "name": symbol,
        "price": "확인불가",
        "change": "0.00%",
        "up": True
    }


def fetch_google_news(query, lang='ko', region='KR', period='1d'):
    """
    Google News에서 뉴스 검색 (기본값: 한국어, 한국지역)
    [Improved] 인코딩 문제 해결 + Timeout 적용 + Naver Fallback
    """
    try:
        def _exec_google_search():
            if GoogleNews is None:
                return []
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
    """주요 지수, 매크로 지표 및 주도주 데이터 수집 (Turbo Cached)"""
    from turbo_engine import turbo_engine
    
    # [Turbo Mode] Check for existing high-speed cache (0ms)
    cached = turbo_engine.get_cache("MARKET_INDICES_SNAPSHOT")
    if cached:
        return cached

    indices = [
        {"symbol": "^KS11", "label": "KOSPI", "naver_code": "KOSPI", "icon": "🇰🇷"},
        {"symbol": "^KQ11", "label": "KOSDAQ", "naver_code": "KOSDAQ", "icon": "🇰🇷"},
        {"symbol": "^IXIC", "label": "NASDAQ", "naver_code": "NAS@IXIC", "icon": "🇺🇸"},
        {"symbol": "^GSPC", "label": "S&P 500", "naver_code": "SPI@SPX", "icon": "🇺🇸"},
        {"symbol": "USDKRW=X", "label": "USD/KRW", "naver_code": "FX_USDKRW", "icon": "💵"},
        {"symbol": "^TNX", "label": "미 10년 국채금리", "naver_code": "US10Y", "icon": "📉"}, 
        {"symbol": "CL=F", "label": "WTI 유가", "naver_code": "OIL_WTI", "icon": "🛢️"},
        {"symbol": "GC=F", "label": "금 시세", "naver_code": "GOLD", "icon": "💰"},
        {"symbol": "^VIX", "label": "VIX Index", "naver_code": "VIX", "icon": "⚠️"},
        {"symbol": "DX-Y.NYB", "label": "달러인덱스", "naver_code": "DXY", "icon": "🌐"},
    ]
    
    results = []
    
    def _fetch_index_info(idx):
        label = idx["label"]
        icon = idx.get("icon", "")
        # 1. Primary: Naver Mobile API
        try:
            url = f"https://m.stock.naver.com/api/index/{idx['naver_code']}/basic"
            if "FX_" in idx['naver_code']:
                url = f"https://m.stock.naver.com/api/exchange/{idx['naver_code']}/basic"
            
            res = requests.get(url, timeout=3, headers={"User-Agent": "Mozilla/5.0"})
            if res.status_code == 200:
                data = res.json()
                price_raw = str(data.get('closePrice', '0')).replace(',', '')
                pct_raw = str(data.get('fluctuationsRatio', '0'))
                
                try:
                    price_val = float(price_raw)
                    pct_val = float(pct_raw)
                    return {
                        "label": label, "icon": icon,
                        "value": f"{price_val:,.2f}",
                        "change": f"{pct_val:+.2f}%",
                        "up": pct_val >= 0, "sparkline": []
                    }
                except: pass
        except: pass

        # 2. Secondary: Yahoo Finance
        try:
            ticker = yf.Ticker(idx["symbol"])
            fast = ticker.fast_info
            p = fast.last_price
            pc = fast.previous_close
            if p and pc:
                chg = ((p - pc) / pc) * 100
                return {
                    "label": label, "icon": icon,
                    "value": f"{p:,.2f}",
                    "change": f"{chg:+.2f}%",
                    "up": chg >= 0, "sparkline": []
                }
        except: pass

        # 3. Last Resort
        return {
            "label": label, "icon": icon,
            "value": "준비중", "change": "0.00%", "up": True, "sparkline": []
        }


    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_fetch_index_info, idx) for idx in indices]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
    
    # Sorting
    results.sort(key=lambda x: [idx['label'] for idx in indices].index(x['label']))

    # movers... (stay similar but use yfinance for sparklines if needed later)
    movers = []
    movers_list = ["NVDA", "TSLA", "AAPL"]
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
        future_to_sym = {executor.submit(_fetch_mover, sym): sym for sym in movers_list}
        for future in concurrent.futures.as_completed(future_to_sym):
            try:
                res = future.result(timeout=3)
                if res:
                    movers.append(res)
            except:
                pass

    return results

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
                
            # 일본 엔화(JPY)는 대한민국 기준 관행상 100엔 단위로 표기
            if symbol == "JPYKRW=X":
                price = price * 100
                
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

def get_global_assets_data():
    """
    yfinance를 활용하여 원유(WTI), 금(Gold), 구리(Copper), 나스닥, S&P500, 환율 데이터를 수집합니다.
    """
    assets = {
        "WTI 원유": "CL=F",
        "국제 금": "GC=F",
        "국제 구리": "HG=F",
        "나스닥 지수": "^IXIC",
        "S&P 500": "^GSPC",
        "달러/원 환율": "KRW=X"
    }
    
    mapping_kr = {
        "WTI 원유": "🛢️ WTI 원유 (선물)",
        "국제 금": "💰 국제 금 가격",
        "국제 구리": "🏗️ 국제 구리 가격",
        "나스닥 지수": "🇺🇸 나스닥 종합 지수",
        "S&P 500": "🇺🇸 S&P 500 지수",
        "달러/원 환율": "💵 달러/원 환율"
    }

    results = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # 병렬 수집으로 속도 극대화
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(assets)) as executor:
        future_to_asset = {executor.submit(yf.Ticker, sym): (name, sym) for name, sym in assets.items()}
        
        for future in concurrent.futures.as_completed(future_to_asset):
            name, sym = future_to_asset[future]
            try:
                ticker = future.result()
                # 최신 5일치 데이터를 가져와 변동률 계산
                hist = ticker.history(period="5d")
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                    change = current_price - prev_price
                    change_pct = (change / prev_price) * 100 if prev_price != 0 else 0
                    
                    # 카테고리 분류
                    category = "💰 원자재" if "원유" in name or "금" in name or "구리" in name else \
                               "🏦 글로벌 지수" if "지수" in name or "500" in name else "💵 외환"
                    
                    results.append({
                        "date": today,
                        "time": "실시간",
                        "event": name,
                        "event_kr": mapping_kr.get(name, name),
                        "country": "US" if "지수" in name else "Global",
                        "country_kr": "미국" if "지수" in name else "글로벌",
                        "actual": f"{current_price:,.2f}",
                        "forecast": "-",
                        "previous": f"{prev_price:,.2f}",
                        "impact": "high",
                        "category": category,
                        "change": f"{change_pct:+.2f}%",
                        "change_val": change_pct
                    })
            except Exception as e:
                print(f"[GlobalAssets] Error fetching {name}: {e}")
                
    return results

def get_market_intelligence_indicators():
    """
    [Integrated Engine] 글로벌 원자재, 지수, 환율, 국내 수급, 등락 종목 수 및 대형주 시세를 통합 수집합니다.
    """
    indicators = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    # 1. 글로벌 및 매크로 지수 데이터 수집 (지수, 금리, VIX, 유럽 등)
    try:
        from korea_data import get_naver_market_index_data, get_top_us_stocks_data
        
        # 1.1 주요 글로벌 지표 (VIX, 미 국채 금리, 유럽 지표 포함)
        global_indices = get_naver_market_index_data()
        for idx in global_indices:
            label = idx['label']
            cat = "📉 공포지수" if "VIX" in label else "📋 글로벌 금리" if "금리" in label else "🌍 글로벌 지수"
            
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[글로벌] {label}",
                "actual": idx['value'],
                "category": cat, "impact": "high", "change": idx['change'], "change_val": 0
            })

        # 1.2 미국 핵심 테크주 시세 (Top 15)
        us_stocks = get_top_us_stocks_data()
        for s in us_stocks:
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[미국주] 🇺🇸 {s['name']} ({s['symbol']})",
                "actual": f"${s['price']}",
                "category": "🇺🇸 미국 핵심주", "impact": "medium", "change": s['change'], "change_val": 0
            })

        # 1.3 기존 원자재 데이터 (WTI, 금, 구리 등)
        global_assets = get_global_assets_data()
        indicators.extend(global_assets)
    except Exception as e:
        print(f"[Global Intelligence Sync] Error: {e}")

    # 2. 국내 증시 디테일 데이터 수집 (수급, 등락 종목 수, 상위 종목)
    try:
        from korea_data import (
            get_korean_market_indices, get_korean_interest_rates, 
            get_naver_market_details, get_top_market_cap_stocks
        )
        
        # 2.1 투자자별 수급 및 등락 종목 수
        m_details = get_naver_market_details()
        for m_id, detail in m_details.items():
            flow = detail['investor_flow']
            counts = detail['stock_counts']
            m_name = "코스피" if m_id == "KOSPI" else "코스닥"
            
            # 수급 데이터를 인디케이터에 추가
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[수급] 🧾 {m_name} 투자자 (외국인/기관)",
                "actual": f"외인:{flow['외국인']}억 / 기관:{flow['기관']}억",
                "category": "⚖️ 수급 동향", "impact": "high", "change": f"개인:{flow['개인']}억", "change_val": 0
            })
            
            # 등락 종목 수 통계를 인디케이터에 추가
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[통계] 📉 {m_name} 등락 종목",
                "actual": f"상승:{counts['상승']}(상한:{counts['상한가']}) / 하락:{counts['하락']}(하한:{counts['하한가']})",
                "category": "📊 시장 통계", "impact": "high", "change": f"보합:{counts['보합']}", "change_val": 0
            })

        # 2.2 시가총액 상위 종목 시세 (TOP 10)
        top_stocks = get_top_market_cap_stocks(limit=10)
        for s in top_stocks:
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[대형주] 💾 {s['name']} ({s['market']})",
                "actual": s['price'],
                "category": "💾 주요 대형주", "impact": "medium", "change": s['change'], "change_val": 0
            })

        # 2.3 지수 데이터 수집 (KOSPI, KOSDAQ 등)
        indices = get_korean_market_indices()
        for key, info in indices.items():
            name_kr = "코스피" if key == "kospi" else "코스닥" if key == "kosdaq" else "코스피200"
            actual_str = info.get('value', '-')
            chg_pct_str = info.get('percent', '0.00%')
            
            try:
                cv = float(re.sub(r'[^0-9.-]', '', chg_pct_str))
            except: cv = 0.0

            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[한국] 🏦 {name_kr} 지수",
                "actual": actual_str,
                "category": "🏦 주가지수", "impact": "high", "change": chg_pct_str, "change_val": cv,
            })
            
        # 3. 채권/금리 데이터 수집
        kr_rates = get_korean_interest_rates()
        for r in kr_rates:
            name = r['name']
            price = r['price']
            chg_val = r['change']
            actual_str = f"{price:.2f}%"
            change_str = f"{chg_val:+.2f}%p" if chg_val != 0 else "0.00%p"
            
            indicators.append({
                "date": today, "time": "실시간",
                "event_kr": f"[한국] 📋 {name}",
                "actual": actual_str,
                "category": "📋 채권 / 금리", "impact": "medium", "change": change_str, "change_val": chg_val,
            })
    except Exception as e:
        print(f"[Market Data Engine] Detail Sync Error: {e}")

    # 4. 필터링 및 정규화
    filtered = []
    seen = set()
    for item in indicators:
        key = item.get("event_kr", "")
        actual = item.get("actual", "-")
        if actual != "-" and key not in seen:
            seen.add(key)
            filtered.append(item)

    return filtered

def get_macro_calendar():
    """
    네이버 금융 글로벌 경제 캘린더에서 오늘의 실시간 경제 일정 및 지표를 수집합니다.
    """
    try:
        from korea_data import get_naver_economy_calendar
        return get_naver_economy_calendar()
    except Exception as e:
        print(f"[Macro Calendar] Error: {e}")
        return []

def get_market_news():
    """
    네이버 금융 상위 뉴스 및 특징주 뉴스를 수집합니다.
    """
    try:
        from korea_data import get_korean_market_news
        return get_korean_market_news()
    except:
        return []

def get_dart_risk_alerts():
    """
    DART(전자공시)에서 리스크 관련 공시(유상증자, 전환사채 등)를 필터링하여 수집합니다.
    """
    try:
        # 기존 구현된 공시 수집기 활용
        from korea_data import get_dart_disclosures
        disclosures = get_dart_disclosures()
        risk_keywords = ["유상증자", "전환사채", "신주인수권", "감자", "횡령"]
        alerts = []
        for d in disclosures:
            if any(k in d.get('title', '') for k in risk_keywords):
                alerts.append(d)
        return alerts
    except:
        return []


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
