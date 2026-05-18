from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Any
import time
import urllib.parse
import unicodedata
import concurrent.futures
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

@router.get("/news")
@turbo_cache(ttl_seconds=300)
def get_market_news():
    import requests
    import concurrent.futures
    import sys
    
    def fetch_naver_category(cat):
        url = f"https://m.stock.naver.com/api/news/list?category={cat}&pageSize=5"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                return [
                    {
                        "title": item.get("tit", "").replace("&quot;", "\"").replace("&amp;", "&").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">"),
                        "link": f"https://m.stock.naver.com/investment/news/article/{item.get('oid')}/{item.get('aid')}",
                        "publisher": item.get("ohnm"),
                        "time": item.get("dt", "")[:8],
                    } for item in data
                ]
        except: pass
        return []

    def fetch_global_category():
        try:
            from stock_data import fetch_google_news
            news_list = fetch_google_news("미국 증시 경제", "ko", "KR")
            return [
                {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "publisher": item.get("publisher", ""),
                    "time": item.get("published", "")[:10]
                } for item in news_list[:5]
            ]
        except:
            return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_kr = executor.submit(fetch_naver_category, "mainnews")
        f_us = executor.submit(fetch_global_category)
        
    return {
        "status": "success",
        "data": {
            "domestic": f_kr.result(),
            "global": f_us.result()
        }
    }

@router.get("/indices")
async def market_indices():
    """실시간 시장 지수 전용 데이터 (스파크라인 포함)"""
    from stock_data import get_market_intelligence_indicators
    try:
        # [v5.3.0] 비동기 스레드 실행으로 이벤트 루프 차단 방지
        import asyncio
        data = await asyncio.to_thread(get_market_intelligence_indicators)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/status")
async def market_status():
    """실시간 시장 지수 및 환율 데이터 반환 (요약 형태)"""
    from stock_data import get_market_status
    try:
        import asyncio
        data = await asyncio.to_thread(get_market_status)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/risk-alerts")
def read_risk_alerts():
    """DART 공시 기반 시장 리스크 및 알림 데이터 반환"""
    try:
        from stock_data import get_dart_risk_alerts
        data = get_dart_risk_alerts()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/rank/etf")
@turbo_cache(ttl_seconds=300)
def read_etf_rank(market: str = "KR", category: Optional[str] = None):
    from rank_data import get_etf_ranking
    data = get_etf_ranking(market, category)
    return {"status": "success", "data": data}

@router.get("/etf-detail/{symbol}")
def read_etf_detail(symbol: str):
    """특정 ETF 상세 분석 데이터 반환"""
    try:
        from etf_detail import get_etf_detail
        result = get_etf_detail(symbol)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/daily-history")
@turbo_cache(ttl_seconds=300)
def stock_daily_history(symbol: str, range: str = Query("1mo")):
    """Get historical daily prices from Yahoo Finance."""
    import yfinance as yf
    import pandas as pd
    import re
    try:
        symbol = symbol.strip().upper()
        if re.match(r'^\d{6}$', symbol):
            try:
                ticker = yf.Ticker(f"{symbol}.KS")
                hist = ticker.history(period=range)
                if hist.empty:
                    ticker = yf.Ticker(f"{symbol}.KQ")
                    hist = ticker.history(period=range)
            except: pass
        else:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=range)
        
        # [Fix] Return error status so turbo_cache ignores this empty response.
        if hist.empty: return {"status": "error", "message": "No data found", "data": []}
        hist['PrevClose'] = hist['Close'].shift(1)
        hist['ChangePct'] = ((hist['Close'] - hist['PrevClose']) / hist['PrevClose']) * 100
        hist['ChangeVal'] = hist['Close'] - hist['PrevClose']
        hist_desc = hist.sort_index(ascending=False)
        
        # [Fix V6.0] NEVER drop the oldest day! Dropping it causes severe data loss for newly listed IPO stocks 
        # (e.g. Poled 476850 May 14 listing date was lost) and unnecessarily deletes the first day of any requested range.
        
        res = []
        for date, row in hist_desc.iterrows():
            if pd.isna(row['Close']): continue
            
            # Calculate change: use standard interday change, or fallback to intraday change relative to Open if PrevClose is missing (oldest day/IPO day)
            change_pct = 0.0
            change_val = 0.0
            if pd.notna(row['ChangePct']):
                change_pct = float(row['ChangePct'])
                change_val = float(row['ChangeVal'])
            elif 'Open' in row and pd.notna(row['Open']) and row['Open'] > 0:
                change_pct = ((float(row['Close']) - float(row['Open'])) / float(row['Open'])) * 100
                change_val = float(row['Close']) - float(row['Open'])

            res.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": float(row['Close']),
                "change": change_pct,
                "change_val": change_val,
                "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0,
                "open": float(row['Open']) if 'Open' in row and pd.notna(row['Open']) else 0.0,
                "high": float(row['High']) if 'High' in row and pd.notna(row['High']) else 0.0,
                "low": float(row['Low']) if 'Low' in row and pd.notna(row['Low']) else 0.0
            })
        return {"status": "success", "data": res}
    except Exception as e:
        return {"status": "error", "message": "Failed to fetch history"}

@router.get("/rank/themes")
@turbo_cache(ttl_seconds=60)
def read_theme_rank():
    from korea_data import get_naver_theme_rank
    data = get_naver_theme_rank()
    return {"status": "success", "data": data}

@router.get("/rank/top10/{market}")
@turbo_cache(ttl_seconds=60)
def read_rank_top10(market: str):
    from rank_data import get_realtime_top10
    market = market.upper()
    data = get_realtime_top10(market)
    return {"status": "success", "data": data}

@router.get("/rank/global")
@turbo_cache(ttl_seconds=60)
def read_global_rank(market: str = "KOSPI", category: str = "trading_volume"):
    from rank_data import get_global_ranking
    data = get_global_ranking(market, category)
    return {"status": "success", "data": data}

@router.get("/rank/naver/{market}/{rank_type}")
@turbo_cache(ttl_seconds=60)
def read_naver_rank(market: str, rank_type: str):
    """네이버 금융 TOP종목 순위 (NaverTopWidget 호환)"""
    from rank_data import get_naver_ranking
    try:
        data = get_naver_ranking(market, rank_type)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/rank/movers/{market}")
@turbo_cache(ttl_seconds=60)
def read_rank_movers(market: str):
    """실시간 상승/하락 종목 (RankingWidget 호환)"""
    from rank_data import crawl_naver_movers, fetch_yahoo_movers
    try:
        if market.upper() == "KR":
            data = crawl_naver_movers()
        else:
            data = fetch_yahoo_movers()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/major")
def read_major_indicators():
    from major_indicators import get_normalized_major_indicators
    data = get_normalized_major_indicators()
    return {"status": "success", "data": data}

@router.get("/stock/search")
@turbo_cache(ttl_seconds=3600)
def search_stock_api(q: str = None, query: str = None):
    # Support both 'q' and 'query' for backward compatibility
    search_q = q or query
    if not search_q: return {"status": "error", "message": "Query parameter 'q' or 'query' is required"}
    q = search_q # Use the resolved one
    from stock_data import GLOBAL_KOREAN_NAMES
    from korea_data import search_stock_code
    from global_search import search_global_ticker
    import unicodedata
    import urllib.parse
    
    # [Fix] Decode URL encoded characters and Normalize to NFC
    try:
        q_decoded = urllib.parse.unquote(q)
        q_norm = unicodedata.normalize('NFC', q_decoded.strip()).replace(" ", "")
    except:
        q_norm = unicodedata.normalize('NFC', q.strip()).replace(" ", "")
    
    results = []
    seen_codes = set()
    
    def add_result(code, name, market):
        if not code or not name: return
        # [Fix] Filter out results where code is same as Korean name (invalid ticker)
        # Ticker should be alphanumeric/dots (Global) or 6-digit (KR)
        import re
        is_valid_global = bool(re.match(r'^[A-Z0-9.]{1,10}$', code.upper()))
        is_valid_kr = bool(re.match(r'^\d{6}$', code))
        
        if not (is_valid_global or is_valid_kr):
            return

        if code not in seen_codes:
            results.append({"code": code, "symbol": code, "name": name, "market": market})
            seen_codes.add(code)

    # 1. Direct Ticker Check (6-digit KR or simple Alpha Global)
    if q_norm.isdigit() and len(q_norm) == 6:
        add_result(q_norm, q_norm, "KR")
    elif q_norm.isalpha() and 1 <= len(q_norm) <= 5:
        # Looks like a US ticker
        add_result(q_norm.upper(), q_norm.upper(), "Global")
    
    # 2. High-Priority Global Mapping Check (e.g. '애플' -> 'AAPL')
    for ticker, ko_names in GLOBAL_KOREAN_NAMES.items():
        # Support both string and list of names
        names = ko_names if isinstance(ko_names, list) else [ko_names]
        for ko_name in names:
            clean_ko = ko_name.replace(" ", "").strip()
            if q_norm == clean_ko or q_norm in clean_ko or clean_ko in q_norm:
                add_result(ticker, ko_name, "Global")
                break # Found for this ticker
    
    # 3. Domestic Search Fallback
    kr_result = search_stock_code(q_norm)
    if kr_result:
        m_type = "KR" if (kr_result.isdigit() and len(kr_result) == 6) else "Global"
        add_result(kr_result, q_norm, m_type)
        
    # 4. Global Search Fallback
    if not results or any(c.isalpha() for c in q_norm):
        gb_result = search_global_ticker(q_norm)
        if gb_result:
            add_result(gb_result, q_norm, "Global")
            
    if results:
        return {"status": "success", "data": results}
        
    return {"status": "error", "message": f"해당 종목을 찾을 수 없습니다: '{q_norm}'"}

@router.get("/quote/{symbol}")
def read_quote(symbol: str):
    symbol = urllib.parse.unquote(symbol).strip()
    
    import re
    if not re.match(r'^[A-Za-z0-9.]+$', symbol):
        import unicodedata
        from korea_data import search_stock_code
        from stock_data import GLOBAL_KOREAN_NAMES
        q_norm = unicodedata.normalize('NFC', symbol).replace(" ", "")
        resolved = None
        for t, k_names in GLOBAL_KOREAN_NAMES.items():
            names = k_names if isinstance(k_names, list) else [k_names]
            if any(q_norm == name.replace(" ", "").strip() or q_norm in name.replace(" ", "").strip() for name in names):
                resolved = t
                break
        if not resolved:
            resolved = search_stock_code(q_norm)
        if resolved:
            symbol = resolved

    cache_key = f"quote_simple_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached: return {"status": "success", "data": cached, "turbo": True}
    from stock_data import get_simple_quote
    data = get_simple_quote(symbol)
    if data:
        turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    return {"status": "error", "message": "Failed to fetch quote"}

@router.get("/stock/quotes/multi")
def get_multi_quotes(symbols: str = Query(...)):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    results = {}
    from stock_data import get_simple_quote
    from korea_data import get_exchange_rate
    rate = get_exchange_rate("USD")
    
    for sym in symbol_list:
        try:
            data = get_simple_quote(sym)
            if data:
                results[sym] = {
                    "price": data.get("price", "확인불가"), 
                    "change": data.get("change", "0.00%"), 
                    "up": data.get("up", True),
                    "currency": data.get("currency", "KRW")
                }
        except Exception as e:
            print(f"[MarketAPI] Failed to get multi-quote for {sym}: {e}")
            results[sym] = {"price": "확인불가", "change": "0.00%"}
    
    return {"status": "success", "data": results, "usd_krw": rate}

@router.get("/korea/sector_heatmap")
async def read_sector_heatmap():
    """업종별 히트맵 데이터 반환"""
    from korea_data import get_sector_heatmap_data
    try:
        data = await get_sector_heatmap_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/korea/heatmap")
async def read_theme_heatmap():
    """테마별 히트맵 데이터 반환"""
    from korea_data import get_theme_heatmap_data
    try:
        data = await get_theme_heatmap_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/investors/top")
def read_investor_top():
    """수급 및 상승률 상위 데이터 반환"""
    from korea_data import get_investor_ranking_data
    try:
        data = get_investor_ranking_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market-insights")
def read_market_insights():
    """인기 검색 및 거래대금 상위 데이터 반환"""
    from korea_data import get_market_insights_data
    try:
        data = get_market_insights_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/assets")
def get_assets():
    """통합 시장 자산 지표(환율, 원자재, 채권 등) 반환"""
    from major_indicators import get_normalized_major_indicators
    try:
        data = get_normalized_major_indicators()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar")
def get_global_macro_calendar():
    """오늘의 글로벌 경제 일정 반환"""
    from stock_data import get_macro_calendar
    try:
        data = get_macro_calendar()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar/korea")
def get_korea_macro_calendar():
    """오늘의 한국 경제 및 시장 일정 반환"""
    from stock_data import get_macro_calendar
    try:
        data = get_macro_calendar()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar/events")
def get_calendar_events():
    """전 종목 실적 및 배당 일정 반환"""
    from stock_data import get_real_stock_events
    try:
        data = get_real_stock_events()
        import datetime
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        filtered = [ev for ev in data if ev.get("date") and ev.get("date") >= today_str]
        return {"status": "success", "data": filtered}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar/watchlist")
def get_watchlist_events(symbols: str = ""):
    """
    [관심종목 전용 v2] DART 공시(한국) + yfinance(미국) 병합으로
    실적/배당/자사주/대주주변동 일정을 실시간 수집합니다.
    symbols: 쉼표로 구분된 종목코드 (예: 005930,000660,AAPL)
    """
    import datetime, os, requests, yfinance as yf
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if not symbols:
        return {"status": "success", "data": []}

    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()][:30]
    events = []
    today = datetime.datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # --- 한국 종목 코드 / 해외 종목 코드 분리 ---
    kr_symbols = [s for s in symbol_list if s.isdigit() and len(s) == 6]
    us_symbols = [s for s in symbol_list if not (s.isdigit() and len(s) == 6)]

    # =============================================
    # [1] DART API — 한국 종목 전용 (실제 공시 기반)
    # =============================================
    dart_api_key = os.getenv("DART_API_KEY", "f4ec215eba3e7ef30b5102e2bc3f30616ab9a858")
    if dart_api_key and kr_symbols:
        try:
            # 검색 범위: 60일 전 ~ 60일 후 (과거 발표 + 미래 예고 모두 포착)
            bgn_de = (today - datetime.timedelta(days=60)).strftime("%Y%m%d")
            end_de = (today + datetime.timedelta(days=60)).strftime("%Y%m%d")

            # 실제 DART에서 쓰이는 정확한 공시 키워드
            EARNINGS_KEYWORDS = [
                "영업(잠정)실적",      # ✅ 삼성전자 실제 사용
                "잠정실적",
                "연결재무제표기준영업",
                "결산실적공시",
                "분기보고서",
                "사업보고서",
            ]
            DIVIDEND_KEYWORDS = [
                "현금ㆍ현물배당결정",  # ✅ 삼성전자 실제 사용
                "현금배당결정",
                "배당금지급",
            ]
            BUYBACK_KEYWORDS = [
                "자기주식취득결과보고서",
                "자기주식취득결정",
            ]
            HOLDER_KEYWORDS = [
                "주식등의대량보유상황보고서",
                "임원ㆍ주요주주특정증권등소유상황보고서",
            ]

            dart_url = (
                f"https://opendart.fss.or.kr/api/list.json"
                f"?crtfc_key={dart_api_key}"
                f"&bgn_de={bgn_de}&end_de={end_de}"
                f"&page_count=100"
            )
            resp = requests.get(dart_url, timeout=10)
            dart_data = resp.json()

            if dart_data.get("status") == "000" and "list" in dart_data:
                for item in dart_data["list"]:
                    stock_code = item.get("stock_code", "")
                    if not stock_code or stock_code not in kr_symbols:
                        continue

                    title = item.get("report_nm", "")
                    corp_name = item.get("corp_name", stock_code)
                    rcept_dt = item.get("rcept_dt", "")
                    if len(rcept_dt) == 8:
                        date_str = f"{rcept_dt[:4]}-{rcept_dt[4:6]}-{rcept_dt[6:]}"
                    else:
                        date_str = today_str

                    dart_link = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}"

                    # 📈 실적 공시
                    if any(kw in title for kw in EARNINGS_KEYWORDS):
                        events.append({
                            "symbol": stock_code,
                            "name": corp_name,
                            "type": "earnings",
                            "date": date_str,
                            "detail": f"📋 실적 공시: {title[:30]} (DART 확정✅)",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "실적",
                        })

                    # 💰 배당 공시
                    elif any(kw in title for kw in DIVIDEND_KEYWORDS):
                        events.append({
                            "symbol": stock_code,
                            "name": corp_name,
                            "type": "dividend",
                            "date": date_str,
                            "detail": f"💰 배당 결정: {title[:30]} (DART 확정✅)",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "배당",
                        })

                    # 🔄 자사주 매입
                    elif any(kw in title for kw in BUYBACK_KEYWORDS):
                        events.append({
                            "symbol": stock_code,
                            "name": corp_name,
                            "type": "buyback",
                            "date": date_str,
                            "detail": f"🔄 자사주: {title[:30]} (DART)",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "자사주",
                        })

                    # 👤 대주주 변동
                    elif any(kw in title for kw in HOLDER_KEYWORDS):
                        events.append({
                            "symbol": stock_code,
                            "name": corp_name,
                            "type": "holder",
                            "date": date_str,
                            "detail": f"👤 지분변동: {title[:30]} (DART)",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "지분변동",
                        })

        except Exception as e:
            print(f"[DART Watchlist] Error: {e}")

    # =============================================
    # [2] yfinance — 미국 종목 + 한국 yfinance 보완
    # =============================================
    def fetch_yf(raw_sym: str):
        results = []
        yfSym = f"{raw_sym}.KS" if (raw_sym.isdigit() and len(raw_sym) == 6) else raw_sym.upper()

        for attempt_sym in ([yfSym, yfSym.replace(".KS", ".KQ")] if ".KS" in yfSym else [yfSym]):
            try:
                ticker = yf.Ticker(attempt_sym)
                cal = getattr(ticker, "calendar", None) or {}
                try:
                    name = ticker.info.get("shortName") or ticker.info.get("longName") or raw_sym
                except:
                    name = raw_sym

                # 실적 발표일
                for ed in (cal.get("Earnings Date") or [])[:2]:
                    if hasattr(ed, "strftime"):
                        div_info = ""
                        div_rate = cal.get("Dividend Rate")
                        div_yield = cal.get("Dividend Yield")
                        if div_rate:
                            div_info += f" | 주당 ${div_rate}"
                        if div_yield:
                            div_info += f" | 수익률 {div_yield*100:.2f}%"
                        results.append({
                            "symbol": raw_sym,
                            "name": name,
                            "type": "earnings",
                            "date": ed.strftime("%Y-%m-%d"),
                            "detail": f"📈 실적 발표 예정{div_info}",
                            "source": "yfinance",
                            "badge": "실적",
                        })

                # 배당락일
                div_date = cal.get("Ex-Dividend Date")
                if div_date and hasattr(div_date, "strftime"):
                    div_rate = cal.get("Dividend Rate")
                    div_yield = cal.get("Dividend Yield")
                    detail = "💰 배당락일"
                    if div_rate:
                        detail += f" | 주당 ${div_rate:.2f}"
                    if div_yield:
                        detail += f" | 수익률 {div_yield*100:.2f}%"
                    results.append({
                        "symbol": raw_sym,
                        "name": name,
                        "type": "dividend",
                        "date": div_date.strftime("%Y-%m-%d"),
                        "detail": detail,
                        "source": "yfinance",
                        "badge": "배당",
                    })

                if results:
                    break  # 첫 번째 시도에서 데이터 나오면 KQ fallback 불필요
            except:
                continue
        return results

    # 미국 종목은 yfinance로 항상 수집 / 한국 종목도 yfinance 보완 수집
    yf_targets = us_symbols + kr_symbols  # 둘 다
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_yf, sym): sym for sym in yf_targets}
        for future in as_completed(futures, timeout=20):
            try:
                res = future.result()
                # DART에서 이미 수집된 한국 종목의 실적/배당은 yfinance로 중복 추가 안 함
                dart_keys = {(e["symbol"], e["type"]) for e in events if e.get("source") == "DART"}
                for r in res:
                    if (r["symbol"], r["type"]) not in dart_keys:
                        events.append(r)
            except:
                pass

    # 날짜순 정렬 (과거 포함, 최근 60일 이후부터 표시)
    past_cutoff = (today - datetime.timedelta(days=7)).strftime("%Y-%m-%d")  # 1주일 전까지 포함
    visible = [ev for ev in events if ev.get("date", "") >= past_cutoff]
    visible.sort(key=lambda x: x.get("date", ""))

    return {
        "status": "success",
        "data": visible,
        "fetched": len(symbol_list),
        "dart_count": len([e for e in visible if e.get("source") == "DART"]),
        "yf_count": len([e for e in visible if e.get("source") == "yfinance"]),
    }



@router.get("/korea/ipo")
def get_korean_ipo():
    """신규 상장 및 공모주 일정 반환"""
    from korea_data import get_ipo_data
    try:
        data = get_ipo_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/test-push")
def test_push_notification(type: str = "generic"):
    """푸시 알림 테스트용 엔드포인트"""
    try:
        from firebase_config import send_multicast_notification
        from db_manager import get_all_fcm_tokens
        
        # 저장된 모든 토큰 가져오기
        tokens = get_all_fcm_tokens()
        if not tokens:
            return {"status": "error", "message": "등록된 기기(토큰)가 없습니다. 먼저 브라우저에서 알림을 허용해주세요."}
            
        if type == "news_naver":
            title = "🇰🇷 삼성전자 속보!"
            body = "[매일경제] 삼성전자, 차세대 AI 반도체 양산 시작... 글로벌 시장 정조준"
            data = {"url": "/discovery?symbol=005930"}
        elif type == "news_google":
            title = "🌍 애플(AAPL) 속보!"
            body = "[블룸버그] Apple unveils groundbreaking AI features for the next iPhone"
            data = {"url": "/discovery?symbol=AAPL"}
        elif type == "price_up":
            title = "🚀 급등 포착 (현대차)"
            body = "주식 가격이 5.2% 올랐어요! (253,000원)"
            data = {"url": "/discovery?symbol=005380"}
        elif type == "price_high":
            title = "🏆 신고가 경신 (카카오)"
            body = "최근 1년 중 최고가를 기록했어요! (65,400원)"
            data = {"url": "/discovery?symbol=035720"}
        else:
            title = "🔔 시스템 테스트 알림"
            body = "유저님! 정상적으로 푸시 알림이 연결되었습니다. 앞으로 관심종목 시세/뉴스 알림이 이곳으로 도착합니다!"
            data = {"url": "/"}
            
        result = send_multicast_notification(
            tokens=tokens,
            title=title,
            body=body,
            data=data
        )
        return {"status": "success", "message": f"{len(tokens)}개 기기에 발송 완료!", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/debug/tokens")
def get_debug_tokens():
    """임시: 등록된 토큰 확인 엔드포인트"""
    from db_manager import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fcm_tokens")
        rows = cursor.fetchall()
        conn.close()
        return {"status": "success", "count": len(rows), "tokens": [dict(r) for r in rows]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/scanner")
@turbo_cache(ttl_seconds=30)
def read_market_scanner():
    """오늘의 증시 스캐너 데이터 (상승/하락 종목 수 및 특이 공시)"""
    from korea_data import get_market_summary_stats, get_live_disclosures
    import concurrent.futures
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f_stats = executor.submit(get_market_summary_stats)
            f_disc = executor.submit(get_live_disclosures)
            
        return {
            "status": "success",
            "data": {
                "stats": f_stats.result(),
                "disclosures": f_disc.result()
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
