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
        url = f"https://m.stock.naver.com/api/news/list?category={cat}&pageSize=6"
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
                        "link": f"https://n.news.naver.com/mnews/article/{item.get('oid')}/{item.get('aid')}",
                        "publisher": item.get("ohnm") or "주요 언론사",
                        "time": item.get("dt", "")[:8],
                    } for item in data[:6]
                ]
        except: pass
        return []

    def fetch_global_category():
        result = []
        # 1. [공식 정석] 네이버 공식 뉴스 검색 OpenAPI (네이버 개발자 정식 인증 키 사용)
        try:
            import os, requests, re
            cid = os.getenv("NAVER_CLIENT_ID")
            sec = os.getenv("NAVER_CLIENT_SECRET")
            if cid and sec:
                headers = {"X-Naver-Client-Id": cid, "X-Naver-Client-Secret": sec}
                url = "https://openapi.naver.com/v1/search/news.json?query=미국 증시&display=6&sort=sim"
                res = requests.get(url, headers=headers, timeout=3)
                if res.status_code == 200:
                    items = res.json().get("items", [])
                    for item in items:
                        t = item.get("title", "")
                        t = re.sub(r'<[^>]+>', '', t).replace("&quot;", "\"").replace("&amp;", "&").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">")
                        l = item.get("link", "")
                        final_link = l if "naver.com" in l else (item.get("originallink") or l)
                        result.append({
                            "title": t,
                            "link": final_link,
                            "publisher": "글로벌 특보",
                            "time": item.get("pubDate", "")[:16]
                        })
                        if len(result) >= 6:
                            break
        except Exception:
            pass

        # 2. [보강 폴백] 네이버 금융 해외증시 뉴스 (공식 API가 실패하거나 6개 미만일 때)
        if len(result) < 6:
            try:
                import requests
                from bs4 import BeautifulSoup
                url = "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258"
                res = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=3)
                if res.status_code == 200:
                    res.encoding = "cp949"
                    soup = BeautifulSoup(res.text, "html.parser")
                    for dl in soup.select("ul.realtimeNewsList li dl"):
                        a_tag = dl.select_one("dd.articleSubject a") or dl.select_one("dt.articleSubject a")
                        press = dl.select_one("span.press")
                        wdate = dl.select_one("span.wdate")
                        if a_tag:
                            t = a_tag.text.strip().replace("&quot;", "\"").replace("&amp;", "&")
                            l = "https://finance.naver.com" + a_tag["href"]
                            p = press.text.strip() if press else "해외증시"
                            tm = wdate.text.strip() if wdate else ""
                            if not any(r["title"] == t for r in result):
                                result.append({
                                    "title": t,
                                    "link": l,
                                    "publisher": p,
                                    "time": tm
                                })
                            if len(result) >= 6:
                                break
            except Exception:
                pass

        # 3. [최종 폴백] 구글 비즈니스 토픽 RSS
        if len(result) < 6:
            try:
                import xml.etree.ElementTree as ET
                import requests
                topic_url = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko"
                res = requests.get(topic_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, timeout=3)
                if res.status_code == 200:
                    root = ET.fromstring(res.text)
                    items = root.findall(".//item")
                    for item in items:
                        raw_title = item.find("title").text if item.find("title") is not None else ""
                        raw_link = item.find("link").text if item.find("link") is not None else ""
                        raw_time = item.find("pubDate").text[:16] if item.find("pubDate") is not None else ""
                        publisher = "글로벌 경제"
                        clean_title = raw_title
                        if " - " in raw_title:
                            parts = raw_title.rsplit(" - ", 1)
                            clean_title = parts[0].strip()
                            publisher = parts[1].strip()
                        if not any(r["title"] == clean_title for r in result):
                            result.append({
                                "title": clean_title,
                                "link": raw_link,
                                "publisher": publisher,
                                "time": raw_time
                            })
                        if len(result) >= 6:
                            break
            except Exception:
                pass

        return result[:6]

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
        from etf_detail import get_etf_detail, clean_nan_values
        result = get_etf_detail(symbol)
        return clean_nan_values(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"ETF 상세 정보 조회 중 오류가 발생했습니다: {str(e)}"}

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
            
            # [Fix] Patch KRX NaN/missing latest data with Naver fchart API
            try:
                from chart_analysis import patch_kr_daily_df_with_naver
                hist = patch_kr_daily_df_with_naver(hist, symbol)
            except Exception as e:
                import logging
                logging.getLogger("DailyHistory").error(f"Naver patch error for {symbol}: {e}")
        else:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=range)
        
        # [Fix] Return error status so turbo_cache ignores this empty response.
        if hist.empty: return {"status": "error", "message": "No data found", "data": []}
        hist = hist.sort_index()
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
    from stock_names import STOCK_MAP
    import unicodedata
    import urllib.parse
    import re
    
    # [Fix] Decode URL encoded characters and Normalize to NFC
    try:
        q_decoded = urllib.parse.unquote(q)
        q_norm = unicodedata.normalize('NFC', q_decoded.strip()).replace(" ", "").upper()
    except:
        q_norm = unicodedata.normalize('NFC', q.strip()).replace(" ", "").upper()
    
    if not q_norm:
        return {"status": "error", "message": "검색어가 비어있습니다."}

    results = []
    seen_codes = set()
    
    def add_result(code, name, market):
        if not code or not name: return
        # Validation
        is_valid_global = bool(re.match(r'^[A-Z0-9.]{1,10}$', code.upper()))
        is_valid_kr = bool(re.match(r'^\d{6}$', code))
        
        if not (is_valid_global or is_valid_kr):
            return

        if code not in seen_codes:
            results.append({"code": code, "symbol": code, "name": name, "market": market})
            seen_codes.add(code)

    # 1. Direct Ticker Check (6-digit KR or 1~5 ASCII Alpha Global)
    if q_norm.isdigit() and len(q_norm) == 6:
        kr_name = next((n for n, c in STOCK_MAP.items() if c == q_norm), q_norm)
        add_result(q_norm, kr_name, "KR")
    elif q_norm.isalpha() and 1 <= len(q_norm) <= 5 and q_norm.isascii():
        add_result(q_norm, q_norm, "Global")
    
    # 2. High-Priority Global Mapping Check (e.g. '애플' -> 'AAPL', '엔비' -> 'NVDA')
    for ticker, ko_names in GLOBAL_KOREAN_NAMES.items():
        names = ko_names if isinstance(ko_names, list) else [ko_names]
        for ko_name in names:
            clean_ko = ko_name.replace(" ", "").upper()
            if q_norm == clean_ko or clean_ko.startswith(q_norm) or q_norm in clean_ko:
                add_result(ticker, names[0], "Global")
                break
    
    # 3. [초고속 0.001초 인메모리 검색] STOCK_MAP (2,892개 한국 상장 종목 전체)
    exact_kr = []
    prefix_kr = []
    contain_kr = []

    for s_name, s_code in STOCK_MAP.items():
        s_name_clean = s_name.replace(" ", "").upper()
        if s_name_clean == q_norm:
            exact_kr.append((s_code, s_name, "KR"))
        elif s_name_clean.startswith(q_norm):
            prefix_kr.append((s_code, s_name, "KR"))
        elif q_norm in s_name_clean or (q_norm.isdigit() and s_code.startswith(q_norm)):
            contain_kr.append((s_code, s_name, "KR"))

    # 정확 일치 -> 접두사 일치 -> 부분 일치 순서로 결과 추가 (최대 10개)
    for code, name, market in (exact_kr + prefix_kr + contain_kr):
        add_result(code, name, market)
        if len(results) >= 10:
            break
            
    # 4. Fallback: 만약 메모리에서 못 찾았을 경우에만 외부 크롤링/야후 검색 실행
    if not results:
        from korea_data import search_stock_code
        from global_search import search_global_ticker
        
        kr_result = search_stock_code(q_norm)
        if kr_result:
            m_type = "KR" if (kr_result.isdigit() and len(kr_result) == 6) else "Global"
            add_result(kr_result, q_norm, m_type)
            
        if not results or any(c.isalpha() and c.isascii() for c in q_norm):
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
    """
    관심종목 일괄 시세 조회.
    [v3] 개선사항:
      - market_status: get_simple_quote에서 직접 반환 (프리마켓/장중/에프터마켓/장마감)
      - price_krw: 해외주식 원화 환산가 ($399.75 → ₩558,xxx)
      - extended_price / extended_change: 확장 세션 가격
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    results = {}
    from stock_data import get_simple_quote
    from korea_data import get_exchange_rate
    import re
    rate = get_exchange_rate("USD")   # 현재 USD/KRW 환율

    import concurrent.futures

    def fetch_q(sym):
        try:
            data = get_simple_quote(sym)
            if data:
                currency = data.get("currency", "KRW")
                price_str = data.get("price", "-")
                
                # [v3] 원화 환산가 계산 (해외 주식 전용)
                price_krw = None
                if currency != "KRW" and rate:
                    try:
                        raw = float(str(price_str).replace(",", ""))
                        price_krw = f"{raw * rate:,.0f}"
                    except: pass

                # market_status는 get_simple_quote → _parse_naver_foreign에서 이미 설정
                # (프리마켓/장중/에프터마켓/장마감)
                market_status = data.get("market_status", "장마감")

                # 확장 세션 가격 (get_simple_quote가 이미 채워서 반환)
                ext_price  = data.get("extended_price")
                ext_change = data.get("extended_change")

                return sym, {
                    "price": price_str,
                    "change": data.get("change", "0.00%"),
                    "change_percent": data.get("change_percent") or data.get("change", "0.00%"),
                    "up": data.get("up", True),
                    "currency": currency,
                    "price_krw": price_krw,          # ← 신규: 원화 환산가
                    "name": data.get("name", sym),
                    "market_status": market_status,
                    "extended_price": ext_price,
                    "extended_change": ext_change,
                    "nxt_data": data.get("nxt_data") or data.get("after_market_data"),
                    "after_market_data": data.get("after_market_data") or data.get("nxt_data"),
                }
        except Exception as e:
            print(f"[MarketAPI] Failed to get multi-quote for {sym}: {e}")
        return sym, {"price": "-", "change": "0.00%", "market_status": "장마감"}

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_sym = {executor.submit(fetch_q, sym): sym for sym in symbol_list}
        for future in concurrent.futures.as_completed(future_to_sym):
            sym, res = future.result()
            results[sym] = res
    
    return {"status": "success", "data": results, "usd_krw": rate}


PRO_INSIGHTS_CACHE = {}  # {sym: (timestamp, data)}
PRO_INSIGHTS_TTL = 120  # 2 minutes cache

@router.get("/stock/pro-insights")
def get_stock_pro_insights(symbols: str = Query(...)):
    """
    관심종목 전문 데이터 지표 (외인/기관 수급 연속일수, 증권사 리서치 컨센서스 목표가, 밸류에이션)
    - 100% 무료 공시 및 공개 통계 데이터 기반 (API 비용 0원)
    - 유사투자자문업 규제 준수: 객관적 통계 수치 및 증권사 공개 컨센서스 단순 집계 정보 제공
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    now = time.time()
    results = {}
    import concurrent.futures
    import requests, re

    # ETF 랭킹 캐시/데이터에서 실시간 ETF 지표 맵 구성
    etf_rank_map = {}
    try:
        from rank_data import get_etf_ranking
        for mkt in ("KR", "US"):
            r_list = get_etf_ranking(mkt) or []
            for r_item in r_list:
                s_key = str(r_item.get("symbol", "")).strip().upper()
                if s_key:
                    etf_rank_map[s_key] = r_item
    except Exception as e:
        print(f"[ProInsights] ETF map load warning: {e}")

    def fetch_insight(sym):
        cached = PRO_INSIGHTS_CACHE.get(sym)
        if cached and (now - cached[0] < PRO_INSIGHTS_TTL) and ("is_etf" in cached[1]):
            return sym, cached[1]

        clean_code = re.sub(r'[^0-9A-Z]', '', sym.split('.')[0].upper())
        rank_item = etf_rank_map.get(clean_code) or {}
        insight = {
            "symbol": sym,
            "is_etf": bool(rank_item),
            "etf_info": None,
            "target_price": None,
            "target_upside": None,
            "foreign_streak": 0,
            "organ_streak": 0,
            "latest_foreign": 0,
            "latest_organ": 0,
            "is_double_buy": False,
            "per": None,
            "pbr": None,
            "high_52w": None,
            "low_52w": None,
            "summary_tags": [],
        }

        try:
            if len(clean_code) == 6 and (clean_code.isdigit() or clean_code[0].isdigit()):
                # 국내 주식/ETF 네이버 금융 공개 데이터
                url = f"https://m.stock.naver.com/api/stock/{clean_code}/integration"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                res = requests.get(url, headers=headers, timeout=4)
                if res.status_code == 200:
                    rjson = res.json()
                    stock_name = str(rjson.get('stockName') or '')
                    deal_trends = rjson.get('dealTrendInfos', [])
                    consensus = rjson.get('consensusInfo') or {}
                    total_infos = {info['code']: info.get('value') for info in rjson.get('totalInfos', []) if 'code' in info}
                    etf_ind = rjson.get('etfKeyIndicator') or {}

                    foreign_streak = 0
                    organ_streak = 0
                    latest_foreign = 0
                    latest_organ = 0
                    
                    if deal_trends:
                        latest = deal_trends[0]
                        latest_foreign = int(str(latest.get('foreignerPureBuyQuant', '0')).replace(',', ''))
                        latest_organ = int(str(latest.get('organPureBuyQuant', '0')).replace(',', ''))
                        
                        for item in deal_trends:
                            f = int(str(item.get('foreignerPureBuyQuant', '0')).replace(',', ''))
                            if f > 0: foreign_streak += 1
                            else: break
                            
                        for item in deal_trends:
                            o = int(str(item.get('organPureBuyQuant', '0')).replace(',', ''))
                            if o > 0: organ_streak += 1
                            else: break

                    is_double_buy = (latest_foreign > 0 and latest_organ > 0)
                    target_price_str = consensus.get('priceTargetMean')

                    tags = []
                    if is_double_buy:
                        tags.append("🔥 외인·기관 쌍끌이")
                    elif foreign_streak >= 2:
                        tags.append(f"🌐 외인 {foreign_streak}일 연속 매수")
                    elif organ_streak >= 2:
                        tags.append(f"🏢 기관 {organ_streak}일 연속 매수")

                    if target_price_str:
                        tags.append(f"🎯 증권사 목표가 {target_price_str}원")

                    per_val = total_infos.get('per')
                    if per_val and per_val != 'N/A':
                        clean_per = per_val.replace('배', '').strip()
                        try:
                            if float(clean_per) < 15:
                                tags.append(f"📊 저PER ({clean_per}배)")
                        except: pass

                    # 국내 ETF 판별 및 고밀도 ETF 데이터(etf_info) 구성
                    etf_brands = ("KODEX", "TIGER", "ACE", "RISE", "SOL", "HANARO", "PLUS", "KIWOOM", "TIMEFOLIO", "WON", "KBSTAR", "ARIRANG", "KOSEF")
                    is_kr_etf = bool(etf_ind) or bool(rank_item) or any(stock_name.upper().startswith(b) for b in etf_brands)
                    etf_info_dict = None
                    if is_kr_etf:
                        nav_raw = etf_ind.get("nav") or rank_item.get("nav")
                        try:
                            nav_float = float(str(nav_raw).replace(",", ""))
                            nav_str = f"{int(round(nav_float)):,}원"
                        except Exception:
                            nav_str = f"{nav_raw}원" if nav_raw else "-"

                        dev_sign = etf_ind.get("deviationSign", "")
                        dev_rate = etf_ind.get("deviationRate")
                        if dev_rate is not None:
                            try:
                                gap_num = float(str(dev_rate).replace(",", ""))
                                if dev_sign == "-" and gap_num > 0:
                                    gap_num = -gap_num
                                nav_gap_str = f"{gap_num:+.2f}%"
                            except Exception:
                                nav_gap_str = rank_item.get("nav_gap") or "0.00%"
                                gap_num = float(rank_item.get("nav_gap_num") or 0.0)
                        else:
                            nav_gap_str = rank_item.get("nav_gap") or "0.00%"
                            gap_num = float(rank_item.get("nav_gap_num") or 0.0)

                        if gap_num <= -0.15:
                            nav_status = f"🟢 할인 괴리 ({nav_gap_str} · 본래가치 대비 저가)"
                        elif gap_num >= 0.50:
                            nav_status = f"🚨 할증 주의 ({nav_gap_str} · 본래가치 대비 고평가)"
                        else:
                            nav_status = f"⚖️ 정가 거래 ({nav_gap_str} · NAV 정상 밀착)"

                        def fmt_ret(key, fallback=None):
                            val = etf_ind.get(key)
                            if val is not None:
                                try:
                                    fv = float(str(val).replace(",", ""))
                                    return f"{fv:+.2f}%"
                                except Exception:
                                    pass
                            return fallback

                        total_fee = etf_ind.get("totalFee")
                        try:
                            ter_str = f"연 {float(total_fee):.2f}%" if total_fee is not None else "연 0.15%"
                        except Exception:
                            ter_str = "연 0.15%"

                        div_yield = etf_ind.get("dividendYieldTtm")
                        try:
                            div_str = f"연 {float(div_yield):.2f}%" if div_yield is not None else "분배금 지급"
                        except Exception:
                            div_str = "분배금 지급"

                        etf_info_dict = {
                            "amc": etf_ind.get("issuerName") or rank_item.get("brand") or "국내 자산운용사",
                            "brand": rank_item.get("brand") or (stock_name.split()[0] if stock_name else "ETF"),
                            "category": rank_item.get("category_name") or total_infos.get("etfBaseIdx") or "국내 상장 ETF",
                            "base_index": total_infos.get("etfBaseIdx") or rank_item.get("category_name") or "기초지수 추종",
                            "nav": nav_str,
                            "nav_gap": nav_gap_str,
                            "nav_gap_num": gap_num,
                            "nav_status": nav_status,
                            "aum": etf_ind.get("marketValue") or rank_item.get("market_sum") or total_infos.get("marketValue") or "-",
                            "trading_value": rank_item.get("amount") or total_infos.get("accumulatedTradingValue") or "-",
                            "turnover_rate": f"{rank_item.get('turnover_rate')}%" if rank_item.get("turnover_rate") else None,
                            "ter": ter_str,
                            "dividend_yield": div_str,
                            "return_1m": fmt_ret("returnRate1m"),
                            "return_3m": fmt_ret("returnRate3m", rank_item.get("three_month_return")),
                            "return_6m": fmt_ret("returnRate6m"),
                            "return_1y": fmt_ret("returnRate1y"),
                            "high_52w": total_infos.get("highPriceOf52Weeks"),
                            "low_52w": total_infos.get("lowPriceOf52Weeks"),
                        }

                    insight.update({
                        "is_etf": is_kr_etf,
                        "etf_info": etf_info_dict,
                        "target_price": target_price_str,
                        "foreign_streak": foreign_streak,
                        "organ_streak": organ_streak,
                        "latest_foreign": latest_foreign,
                        "latest_organ": latest_organ,
                        "is_double_buy": is_double_buy,
                        "per": total_infos.get('per'),
                        "pbr": total_infos.get('pbr'),
                        "high_52w": total_infos.get('highPriceOf52Weeks'),
                        "low_52w": total_infos.get('lowPriceOf52Weeks'),
                        "summary_tags": tags,
                    })
            else:
                # 해외/미국 주식 및 미국 ETF
                import yfinance as yf
                ticker = yf.Ticker(sym)
                info = ticker.fast_info
                yf_info = {}
                try:
                    yf_info = ticker.info or {}
                except: pass
                target_p = yf_info.get('targetMeanPrice')
                
                tags = []
                if target_p:
                    tags.append(f"🎯 월가 목표가 ${target_p:.2f}")

                is_us_etf = bool(rank_item) or (str(yf_info.get("quoteType", "")).upper() == "ETF")
                etf_info_dict = None
                if is_us_etf:
                    gap_num = float(rank_item.get("nav_gap_num") or 0.0)
                    nav_gap_str = rank_item.get("nav_gap") or f"{gap_num:+.2f}%"
                    if gap_num <= -0.10:
                        nav_status = f"🟢 할인 괴리 ({nav_gap_str} · NAV 대비 저가)"
                    elif gap_num >= 0.35:
                        nav_status = f"🚨 할증 주의 ({nav_gap_str} · NAV 대비 고평가)"
                    else:
                        nav_status = f"⚖️ 정가 거래 ({nav_gap_str} · NAV 정상 밀착)"

                    er = yf_info.get("annualReportExpenseRatio") or yf_info.get("netExpenseRatio")
                    ter_str = f"연 {float(er)*100:.2f}%" if er and float(er) < 0.1 else (f"연 {float(er):.2f}%" if er else "연 0.03~0.35%")
                    dy = yf_info.get("yield") or yf_info.get("trailingAnnualDividendYield")
                    div_str = f"연 {float(dy)*100:.2f}%" if dy and float(dy) < 1 else "분기/월 배당"

                    etf_info_dict = {
                        "amc": rank_item.get("brand") or yf_info.get("fundFamily") or "글로벌 자산운용사",
                        "brand": rank_item.get("brand") or "US ETF",
                        "category": rank_item.get("category_name") or "미국 상장 ETF",
                        "base_index": rank_item.get("category_name") or yf_info.get("category") or "글로벌 대표지수",
                        "nav": f"${rank_item.get('nav')}" if rank_item.get("nav") else (f"${yf_info.get('navPrice'):.2f}" if yf_info.get("navPrice") else "실시간 연동"),
                        "nav_gap": nav_gap_str,
                        "nav_gap_num": gap_num,
                        "nav_status": nav_status,
                        "aum": rank_item.get("market_sum") or "글로벌 대형",
                        "trading_value": rank_item.get("amount") or "-",
                        "turnover_rate": f"{rank_item.get('turnover_rate')}%" if rank_item.get("turnover_rate") else None,
                        "ter": ter_str,
                        "dividend_yield": div_str,
                        "return_1m": None,
                        "return_3m": rank_item.get("three_month_return") or "-",
                        "return_6m": None,
                        "return_1y": f"{float(yf_info.get('threeYearAverageReturn'))*100:+.1f}% (3Y연평균)" if yf_info.get("threeYearAverageReturn") else None,
                        "high_52w": f"${yf_info.get('fiftyTwoWeekHigh'):.2f}" if yf_info.get("fiftyTwoWeekHigh") else None,
                        "low_52w": f"${yf_info.get('fiftyTwoWeekLow'):.2f}" if yf_info.get("fiftyTwoWeekLow") else None,
                    }

                insight.update({
                    "is_etf": is_us_etf,
                    "etf_info": etf_info_dict,
                    "target_price": f"${target_p:.2f}" if target_p else None,
                    "per": f"{info.get('trailing_pe', 0):.1f}배" if hasattr(info, 'trailing_pe') and info.trailing_pe else None,
                    "summary_tags": tags,
                })
        except Exception as e:
            print(f"[ProInsights] Error for {sym}: {e}")

        PRO_INSIGHTS_CACHE[sym] = (now, insight)
        return sym, insight

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_insight, sym): sym for sym in symbol_list}
        for fut in concurrent.futures.as_completed(futures):
            s, res = fut.result()
            results[s] = res

    return {"status": "success", "data": results}



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

@router.get("/double-whale")
def read_double_whale():
    """외인·기관 쌍끌이 순매수 및 주도 수급 데이터 반환 (비용 0원)"""
    from korea_data import get_double_whale_ranking
    try:
        data = get_double_whale_ranking()
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
        # 프론트엔드 달력에서 과거 일정도 볼 수 있도록 필터링 해제
        filtered = [ev for ev in data if ev.get("date")]
        return {"status": "success", "data": filtered}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar/watchlist")
def get_watchlist_events(symbols: str = "", x_user_id: str = Header(None)):
    """
    [관심종목 전용 v3] DART 공시(한국) + 정기 실적/배당 캘린더 엔진 + yfinance(미국) 병합으로
    실적/배당/수주계약/IR/자사주 일정을 완벽 수집합니다.
    symbols: 쉼표로 구분된 종목코드 (예: 005930,000660,010140.KS,AAPL)
    """
    import datetime, os, requests, yfinance as yf
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from dart_api_client import dart_api_client

    try:
        from stock_names import STOCK_MAP
        code_to_name = {v: k for k, v in STOCK_MAP.items() if isinstance(v, str)}
    except:
        code_to_name = {}

    if not symbols:
        return {"status": "success", "data": []}

    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()][:30]
    events = []
    today = datetime.datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # --- 한국 종목 코드 / 해외 종목 코드 분리 ---
    kr_symbols = []
    us_symbols = []
    kr_base_map = {}
    
    for s in symbol_list:
        base_sym = s.split('.')[0]
        if base_sym.isdigit() and len(base_sym) == 6:
            kr_symbols.append(base_sym)
            kr_base_map[base_sym] = s
        else:
            us_symbols.append(s)

    dart_api_key = os.getenv("DART_API_KEY", "").strip()
    if not dart_api_key:
        try:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
            dart_api_key = os.getenv("DART_API_KEY", "").strip()
        except: pass
    
    # =============================================
    # [1] DART API — 한국 종목 개별 corp_code 기반 정밀 조회
    # =============================================
    if dart_api_key and kr_symbols:
        bgn_de = (today - datetime.timedelta(days=90)).strftime("%Y%m%d")
        end_de = today.strftime("%Y%m%d")  # DART는 미래 일자 입력 시 status 100 에러 반환하므로 today 고정

        def fetch_dart_for_symbol(stock_code):
            corp_code = dart_api_client._load_corp_code(stock_code)
            if not corp_code:
                return []
            try:
                url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={dart_api_key}&corp_code={corp_code}&bgn_de={bgn_de}&end_de={end_de}&page_count=50"
                resp = requests.get(url, timeout=7)
                res = resp.json()
                if res.get("status") != "000" or "list" not in res:
                    return []
                
                sym_events = []
                original_sym = kr_base_map.get(stock_code, stock_code)
                corp_name_fallback = code_to_name.get(stock_code, stock_code)

                contract_count = 0
                for item in res["list"]:
                    title = item.get("report_nm", "").strip()
                    corp_name = item.get("corp_name", "").strip() or corp_name_fallback
                    rcept_dt = item.get("rcept_dt", "")
                    date_str = f"{rcept_dt[:4]}-{rcept_dt[4:6]}-{rcept_dt[6:]}" if len(rcept_dt) == 8 else today_str
                    dart_link = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}"

                    # 1. 📈 실적 관련 정기/잠정 공시 (가장 중요)
                    if any(kw in title for kw in ["영업(잠정)실적", "잠정실적", "연결재무제표기준영업", "결산실적"]):
                        # 분기 잠정실적
                        display_title = title.replace("(공정공시)", "").replace("연결재무제표기준", "").strip()
                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "earnings",
                            "date": date_str,
                            "detail": f"📊 {display_title}",
                            "desc": "분기 잠정 매출 및 영업이익 공시",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "잠정실적"
                        })
                    elif any(kw in title for kw in ["분기보고서", "반기보고서", "사업보고서"]):
                        # 정기 확정 실적 보고서
                        period_str = ""
                        if "반기보고서" in title:
                            period_str = "상반기(2분기) 확정 재무보고서"
                        elif "사업보고서" in title:
                            period_str = "연간 확정 사업보고서"
                        elif "1분기" in title or "03" in title:
                            period_str = "1분기 확정 재무보고서"
                        elif "3분기" in title or "09" in title:
                            period_str = "3분기 확정 재무보고서"
                        else:
                            period_str = "정기 실적 재무보고서"

                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "earnings",
                            "date": date_str,
                            "detail": f"📑 {period_str} ({title.split('(')[-1].replace(')', '') if '(' in title else ''})",
                            "desc": "금융감독원 정기 결산 재무제표 확정 공시",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "확정실적"
                        })

                    # 2. 💰 배당 관련 공시
                    elif any(kw in title for kw in ["현금ㆍ현물배당", "배당결정", "배당금지급"]):
                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "dividend",
                            "date": date_str,
                            "detail": f"💰 주당 배당금 결정 공시",
                            "desc": "주주 배당금 지급 및 기준일 결정",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "배당결정"
                        })

                    # 3. 🤝 수주 / 대형 공급계약 체결 (종목당 최근 최대 3건으로 엄선하여 도배 방지)
                    elif any(kw in title for kw in ["단일판매", "공급계약"]) and contract_count < 3:
                        is_amend = "[기재정정]" in title
                        clean_title = "대규모 수주·공급계약 체결 (정정)" if is_amend else "대규모 수주 및 공급계약 체결"
                        contract_count += 1
                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "contract",
                            "date": date_str,
                            "detail": f"🤝 {clean_title}",
                            "desc": "매출액 대비 일정 비율 이상의 주요 단일 공급 계약",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "수주·계약"
                        })

                    # 4. 🔄 자사주 취득/처분 (주주환원 정책)
                    elif any(kw in title for kw in ["자기주식"]):
                        action_name = "자사주 매입/처분 결정"
                        if "취득" in title: action_name = "주주가치 제고를 위한 자사주 취득 결정"
                        elif "처분" in title: action_name = "자기주식 처분 공시"
                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "buyback",
                            "date": date_str,
                            "detail": f"🔄 {action_name}",
                            "desc": "주주가치 제고 및 유통주식수 조절 공시",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "자사주"
                        })

                    # 5. 🎤 주요 기업설명회 (IR)
                    elif any(kw in title for kw in ["기업설명회", "IR"]):
                        sym_events.append({
                            "symbol": original_sym,
                            "name": corp_name,
                            "type": "ir",
                            "date": date_str,
                            "detail": f"🎤 기업설명회(IR) 및 실적 컨퍼런스콜",
                            "desc": "기관 및 주주 대상 경영 현황 및 실적 브리핑",
                            "source": "DART",
                            "link": dart_link,
                            "badge": "IR설명회"
                        })
                    # ※ 단순 임원/주요주주 지분변동(소유상황보고서)은 알림센터의 영역이므로
                    # 실적·배당 캘린더에서는 완전히 제외하여 스팸 도배를 방지함.
                return sym_events
            except Exception as e:
                print(f"[DART Fetch Error {stock_code}]: {e}")
                return []

        with ThreadPoolExecutor(max_workers=5) as ex:
            futs = [ex.submit(fetch_dart_for_symbol, s) for s in kr_symbols]
            for f in as_completed(futs, timeout=12):
                try:
                    events.extend(f.result())
                except: pass

    # =============================================
    # [2] 한국 종목 차기 분기 실적 및 배당 예상 일정 생성 엔진
    # =============================================
    for s in kr_symbols:
        orig = kr_base_map.get(s, s)
        corp_name = code_to_name.get(s, s)
        m = today.month
        y = today.year
        
        # 다가오는 실적 시즌 자동 산출 (K-IFRS 분기보고서 법정 제출 기한 기준)
        if m in [1, 2, 3]:
            season = f"{y-1}년 4분기 및 연간 실적발표"
            est_earnings_date = f"{y}-03-15"
        elif m in [4, 5]:
            season = f"{y}년 1분기 실적발표"
            est_earnings_date = f"{y}-05-15"
        elif m in [6, 7, 8]:
            season = f"{y}년 2분기(반기) 실적발표"
            est_earnings_date = f"{y}-08-14"
        else:
            season = f"{y}년 3분기 실적발표"
            est_earnings_date = f"{y}-11-14"

        if est_earnings_date >= today_str:
            events.append({
                "symbol": orig,
                "name": corp_name,
                "type": "earnings",
                "date": est_earnings_date,
                "detail": f"📈 {season} 정기 공시 예정",
                "desc": "K-IFRS 분기 결산보고서 법정 제출 기한 기준",
                "source": "KRX",
                "badge": "실적예정",
                "is_upcoming": True
            })

        # 결산 배당기준일 예정 (12월 결산 법인)
        est_dividend_date = f"{y}-12-29"
        if est_dividend_date >= today_str:
            events.append({
                "symbol": orig,
                "name": corp_name,
                "type": "dividend",
                "date": est_dividend_date,
                "detail": f"💰 {y}년 연말 결산 배당기준일 예정",
                "desc": "12월 결산 상장사 정기 주주 배당 기준일",
                "source": "KRX",
                "badge": "배당예정",
                "is_upcoming": True
            })

    # =============================================
    # [3] yfinance — 미국 종목 실적/배당 & 글로벌 데이터
    # =============================================
    def fetch_yf(raw_sym: str):
        results = []
        is_kr = raw_sym.isdigit() and len(raw_sym) == 6
        yfSym = f"{raw_sym}.KS" if is_kr else raw_sym.upper()

        for attempt_sym in ([yfSym, yfSym.replace(".KS", ".KQ")] if ".KS" in yfSym else [yfSym]):
            try:
                ticker = yf.Ticker(attempt_sym)
                cal = getattr(ticker, "calendar", None) or {}
                name = raw_sym
                try:
                    name = ticker.info.get("shortName") or ticker.info.get("longName") or raw_sym
                except:
                    pass

                # 실적 발표일
                for ed in (cal.get("Earnings Date") or [])[:2]:
                    if hasattr(ed, "strftime"):
                        ed_str = ed.strftime("%Y-%m-%d")
                        results.append({
                            "symbol": raw_sym,
                            "name": name,
                            "type": "earnings",
                            "date": ed_str,
                            "detail": f"📈 실적 발표 예정 (컨센서스)",
                            "desc": "월가 애널리스트 추정 분기 실적 발표일",
                            "source": "yfinance",
                            "badge": "실적예정",
                            "is_upcoming": ed_str >= today_str
                        })

                # 배당락일
                div_date = cal.get("Ex-Dividend Date")
                if div_date and hasattr(div_date, "strftime"):
                    div_rate = cal.get("Dividend Rate")
                    div_yield = cal.get("Dividend Yield")
                    detail = "💰 배당락일 (Ex-Dividend Date)"
                    desc = ""
                    if div_rate:
                        desc += f"주당 ${div_rate:.2f} "
                    if div_yield:
                        desc += f"(배당수익률 {div_yield*100:.2f}%)"
                    div_str = div_date.strftime("%Y-%m-%d")
                    results.append({
                        "symbol": raw_sym,
                        "name": name,
                        "type": "dividend",
                        "date": div_str,
                        "detail": detail,
                        "desc": desc.strip() or "주주 배당 권리 발생 기준일",
                        "source": "yfinance",
                        "badge": "배당락일",
                        "is_upcoming": div_str >= today_str
                    })

                if results:
                    break
            except Exception as e:
                continue
        return results

    if us_symbols:
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(fetch_yf, sym): sym for sym in us_symbols}
            for future in as_completed(futures, timeout=12):
                try:
                    res = future.result()
                    events.extend(res)
                except: pass

    # =============================================
    # [4] 스마트 정렬: 미래 일정 우선(D-Day 순) -> 최근 공시(최신순)
    # =============================================
    past_cutoff = (today - datetime.timedelta(days=90)).strftime("%Y-%m-%d")
    visible = [ev for ev in events if ev.get("date", "") >= past_cutoff]

    # 각 항목에 is_upcoming 필드 보장
    for ev in visible:
        if "is_upcoming" not in ev:
            ev["is_upcoming"] = ev.get("date", "") >= today_str

    # 미래 일정과 과거 공시 분리하여 정렬
    future_events = [ev for ev in visible if ev.get("is_upcoming")]
    past_events = [ev for ev in visible if not ev.get("is_upcoming")]

    # 미래: 날짜 오름차순 (오늘과 가장 가까운 D-Day 순서)
    future_events.sort(key=lambda x: x.get("date", ""))
    # 과거: 날짜 내림차순 (가장 최근 확정 공시가 위로)
    past_events.sort(key=lambda x: x.get("date", ""), reverse=True)

    sorted_events = future_events + past_events

    # 중복 제거 (symbol + type + date + detail 앞 15글자)
    seen = set()
    final_events = []
    for ev in sorted_events:
        key = (ev["symbol"], ev["type"], ev["date"], ev.get("detail", "")[:15])
        if key not in seen:
            seen.add(key)
            final_events.append(ev)

    # [NEW] 사용자별 개별 알림 커스텀 설정 매핑
    user_alert_prefs = {}
    if x_user_id:
        try:
            from db_manager import get_user_calendar_alert_prefs
            user_alert_prefs = get_user_calendar_alert_prefs(x_user_id)
        except Exception as e:
            print(f"[Calendar] Failed to load user alert prefs: {e}")

    for ev in final_events:
        pref_key = f"{ev.get('symbol')}_{ev.get('type')}_{ev.get('date')}"
        # 사용자가 명시적으로 끈 적이 없으면 기본 True(알림 켜짐)
        ev["alert_enabled"] = user_alert_prefs.get(pref_key, True)

    return {
        "status": "success",
        "data": final_events,
        "upcoming_count": len(future_events),
        "recent_count": len(past_events),
        "fetched": len(symbol_list),
        "total_count": len(final_events)
    }


from pydantic import BaseModel

class CalendarAlertToggleRequest(BaseModel):
    symbol: str
    event_type: str
    event_date: str
    is_enabled: Optional[bool] = None

@router.post("/calendar/alert-toggle")
def toggle_watchlist_calendar_alert(req: CalendarAlertToggleRequest, x_user_id: str = Header(None)):
    """관심종목 캘린더 개별 카드 알림 켜기/끄기 토글"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
    try:
        from db_manager import toggle_calendar_alert_pref
        new_state = toggle_calendar_alert_pref(x_user_id, req.symbol, req.event_type, req.event_date, req.is_enabled)
        return {
            "status": "success",
            "symbol": req.symbol,
            "event_type": req.event_type,
            "event_date": req.event_date,
            "alert_enabled": new_state
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}



@router.get("/korea/ipo")
def get_korean_ipo():
    """신규 상장 및 공모주 일정 반환"""
    from korea_data import get_ipo_data
    try:
        data = get_ipo_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/us/ipo")
def get_us_ipo():
    """미국 신규 상장 및 공모주 일정 반환"""
    from us_ipo import get_us_ipo_data
    try:
        data = get_us_ipo_data()
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
            title = "📰 [뉴스 속보] 삼성전자"
            body = "삼성전자, 차세대 AI 반도체 양산 시작... 글로벌 시장 정조준\n\n출처: 매일경제"
            data = {"url": "/discovery?q=005930"}
        elif type == "news_google":
            title = "📰 [뉴스 속보] 애플(AAPL)"
            body = "Apple unveils groundbreaking AI features for the next iPhone\n\n출처: Bloomberg"
            data = {"url": "/discovery?q=AAPL"}
        elif type == "disclosure":
            title = "📢 [공시 속보] 카카오"
            body = "자기주식취득결정 (1,000억원 규모)\n\n출처: DART"
            data = {"url": "/discovery?q=035720"}
        elif type == "price_up":
            title = "🚀 급등 포착 (현대차)"
            body = "주식 가격이 5.2% 올랐어요! (253,000원)"
            data = {"url": "/discovery?q=005380"}
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

@router.get("/rankings/live")
def get_live_rankings(market: str = "KR", category: str = "amount"):
    """
    KRX 및 해외 실시간 Top 10 랭킹 (플립 애니메이션용)
    market: 'KR' (국내) 또는 'US' (해외)
    category: 'amount' (거래대금) 또는 'volume' (인기거래/거래량)
    """
    from rank_data import get_global_ranking
    try:
        # market 파라미터 매핑
        market_map = {"KR": "KOSPI", "US": "USA"}
        target_market = market_map.get(market.upper(), "KOSPI")
        
        # category 파라미터 매핑
        cat_map = {"amount": "trading_amount", "volume": "trading_volume"}
        target_category = cat_map.get(category.lower(), "trading_amount")
        
        data = get_global_ranking(target_market, target_category)
        
        # 데이터가 없을 경우 에러 처리를 위한 방어 코드
        if not data:
            # Fallback: 기존 KRX API 데이터 시도
            from krx_api import fetch_krx_live_ranking
            if market == "KR" and category == "amount":
                data = fetch_krx_live_ranking()
                
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/research")
@turbo_cache(ttl_seconds=180)
def get_stock_research_reports(
    category: str = Query("company", description="company | industry | market | invest"),
    q: str = Query("", description="종목명, 6자리 종목코드 또는 검색 키워드"),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=50)
):
    """
    국내 종목별·산업별·시황별 증권사 애널리스트 리서치 리포트 실시간 조회 API
    - 종목명(예: 삼성전자, SK하이닉스, 두산에너빌리티) 또는 6자리 종목코드 검색 지원
    - 목표주가 컨센서스(평균/최고/최저 목표주가) 및 초보자 눈높이 해설 자동 생성
    """
    import requests
    import re
    import html as html_lib
    from korea_data import search_stock_code, get_korean_name

    valid_cats = {
        "company": ("종목분석", "company"),
        "industry": ("산업분석", "industry"),
        "market": ("시황정보", "daily"),
        "invest": ("투자전략", "invest"),
        "economy": ("거시경제·환율", "economy"),
        "debenture": ("채권·금리", "debenture"),
    }
    cat_key = category if category in valid_cats else "company"
    cat_label, url_slug = valid_cats[cat_key]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://stock.naver.com/research/company"
    }

    def format_broker(name: str) -> str:
        if not name:
            return "주요 증권사"
        n = name.strip()
        if not n.endswith("증권") and not n.endswith("투자") and "금융" not in n and "경제" not in n:
            return f"{n}증권"
        if n.endswith("투자"):
            return f"{n}증권"
        return n

    def clean_html_to_points(raw_html: str):
        if not raw_html:
            return []
        text = re.sub(r'<br\s*/?>|</p>|</li>|</div>|</tr>', '\n', raw_html, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        text = html_lib.unescape(text)
        pts = []
        for raw_ln in text.splitlines():
            ln = re.sub(r'^[\s•\-\*·:]+', '', raw_ln).strip()
            if len(ln) >= 5:
                pts.append(ln[:200])
        return pts[:4]

    q_clean = (q or "").strip()
    resolved_code = None
    resolved_name = None

    if q_clean and cat_key == "company":
        if re.match(r'^\d{6}$', q_clean):
            resolved_code = q_clean
            resolved_name = get_korean_name(q_clean) or q_clean
        else:
            try:
                code_candidate = search_stock_code(q_clean)
                if code_candidate and re.match(r'^\d{6}$', str(code_candidate)):
                    resolved_code = str(code_candidate)
                    resolved_name = get_korean_name(resolved_code) or q_clean
            except Exception:
                pass

    base_url = f"https://stock.naver.com/api/stockSecurity/researches/v2/{cat_key}"
    raw_items = []
    total_count = 0

    try:
        # 1차: 종목코드(itemCodes)가 확인된 경우 해당 종목 전용 리포트 정확 조회
        if resolved_code and cat_key == "company":
            params = [("size", str(size)), ("index", str(page)), ("itemCodes", resolved_code)]
            r = requests.get(base_url, params=params, headers=headers, timeout=6)
            if r.status_code == 200:
                payload = r.json()
                raw_items = payload.get("items", [])
                total_count = payload.get("totalCount", len(raw_items))

        # 2차: 종목코드 조회 결과가 없거나 키워드 검색/타 카테고리인 경우 query 파라미터 사용
        if not raw_items:
            params = [("size", str(size)), ("index", str(page))]
            if q_clean:
                params.append(("query", q_clean))
            r = requests.get(base_url, params=params, headers=headers, timeout=6)
            if r.status_code == 200:
                payload = r.json()
                raw_items = payload.get("items", [])
                total_count = payload.get("totalCount", len(raw_items))
    except Exception as e:
        print(f"[ResearchAPI] Fetch error: {e}")

    formatted_items = []
    goal_prices = []
    buy_count = 0

    for item in raw_items:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        if cat_key == "industry" and ("디지털자산" in title or "비트코인" in title):
            continue

        nid = str(item.get("nid") or "")
        broker = format_broker(item.get("brokerName") or "")
        analyst = (item.get("analystName") or "").strip() or None
        write_date = item.get("writeDate") or ""
        read_count = int(item.get("readCount") or 0) if str(item.get("readCount") or "").isdigit() else 0

        item_name = item.get("itemName") or resolved_name or (item.get("industryKoreanName") if cat_key == "industry" else cat_label)
        item_code = item.get("itemCode") or resolved_code or None
        industry_name = item.get("industryKoreanName") or None

        gp_raw = item.get("goalPrice")
        goal_price = None
        goal_price_num = None
        if gp_raw and str(gp_raw).isdigit() and int(gp_raw) > 0:
            goal_price_num = int(gp_raw)
            goal_price = f"{goal_price_num:,}원"
            goal_prices.append(goal_price_num)

        op_raw = (item.get("opinionText") or "").strip()
        opinion = None
        if op_raw:
            if op_raw.lower() in ["buy", "매수", "strong buy", "outperform", "overweight"]:
                opinion = "Buy (매수)"
                buy_count += 1
            elif op_raw.lower() in ["hold", "중립", "marketperform", "neutral"]:
                opinion = "Hold (중립)"
            else:
                opinion = op_raw

        pts = clean_html_to_points(item.get("content") or "")
        if pts and pts[0] == title and len(pts) > 1:
            pts = pts[1:]

        if cat_key == "company":
            gp_phrase = f"목표주가를 {goal_price}으로 제시하며 " if goal_price else ""
            op_phrase = f"'{opinion}' 의견을 낸 " if opinion else ""
            easy_exp = (
                f"{broker}에서 '{item_name}'에 대해 {gp_phrase}{op_phrase}기업 분석 리포트입니다. "
                f"{pts[0] if pts else '핵심 사업의 분기 실적과 수주 모멘텀을 점검한 보고서입니다.'}"
            )
            check_tip = f"'{item_name}'의 분기 영업이익이 증권사 예상치(컨센서스)에 부합하는지와 기관·외국인 수급 유입 여부를 함께 확인하세요."
        elif cat_key == "industry":
            target_ind = industry_name or "주요 산업"
            easy_exp = f"{broker}의 '{target_ind}' 업종 분석 리포트입니다. 업황 지표와 밸류체인 내 주요 기업들의 실적 방향성을 짚어주고 있습니다."
            check_tip = f"'{target_ind}' 업종 내 대장주의 수급 흐름과 수출·수주 데이터를 함께 점검하세요."
        elif cat_key == "economy":
            easy_exp = f"{broker}의 글로벌 거시경제(매크로)·환율·물가 분석 리포트입니다. 미국 연준 통화정책과 환율 흐름이 국내외 자산시장에 미치는 영향을 설명합니다."
            check_tip = "미국 물가·고용 지표 발표에 따른 달러 인덱스와 원/달러 환율의 방향성을 함께 체크하세요."
        elif cat_key == "debenture":
            easy_exp = f"{broker}의 채권·금리 시장 분석 리포트입니다. 국고채 및 미국 국채 금리 움직임과 중앙은행 기준금리 전망을 다룹니다."
            check_tip = "국채 금리 하락(채권 가격 상승) 시 성장주와 장기채 ETF의 매력도가 높아진다는 점을 참고하세요."
        else:
            easy_exp = f"{broker}에서 발표한 최신 증시 시황 및 투자전략 브리핑입니다. 거시경제 지표와 수급 변화를 바탕으로 시장 대응 방향을 제시합니다."
            check_tip = "환율·금리 흐름과 외국인 현·선물 매매 동향을 함께 체크하며 포트폴리오 비중을 조절하세요."

        formatted_items.append({
            "id": f"{cat_key}_{nid}",
            "nid": nid,
            "category": cat_label,
            "broker": broker,
            "analyst": analyst,
            "date": write_date,
            "read_count": read_count,
            "title": title,
            "item_name": item_name,
            "item_code": item_code,
            "industry_name": industry_name,
            "goal_price": goal_price,
            "goal_price_num": goal_price_num,
            "opinion": opinion,
            "summary_points": pts,
            "easy_summary": easy_exp,
            "checkpoint": check_tip,
            "naver_url": f"https://stock.naver.com/research/{url_slug}/{nid}" if nid else "https://stock.naver.com/research/company"
        })

    consensus = None
    if goal_prices:
        avg_gp = int(round(sum(goal_prices) / len(goal_prices), -2))
        consensus = {
            "stock_name": resolved_name or (formatted_items[0]["item_name"] if formatted_items else q_clean),
            "stock_code": resolved_code or (formatted_items[0]["item_code"] if formatted_items else None),
            "avg_goal_price": f"{avg_gp:,}원",
            "max_goal_price": f"{max(goal_prices):,}원",
            "min_goal_price": f"{min(goal_prices):,}원",
            "buy_count": buy_count,
            "report_count": len(formatted_items),
            "goal_sample_count": len(goal_prices)
        }

    return {
        "status": "success",
        "category": cat_key,
        "query": q_clean,
        "resolved_code": resolved_code,
        "resolved_name": resolved_name,
        "total_count": total_count,
        "consensus": consensus,
        "items": formatted_items
    }


# ==============================================================================
# 글로벌 해외주식 · 국내외 ETF · 주요 선물(지수/원자재/금리/통화) 멀티에셋 리서치 엔진
# ==============================================================================

MULTI_ASSET_CATALOG = {
    "us_stock": [
        {"symbol": "NVDA", "name": "엔비디아 (NVIDIA)", "sector": "AI 반도체 · GPU", "desc": "글로벌 AI 데이터센터 가속기 시장 점유율 1위 기업으로, 차세대 블랙웰(Blackwell)·루빈 아키텍처 수요가 실적을 견인하고 있습니다."},
        {"symbol": "TSLA", "name": "테슬라 (Tesla)", "sector": "전기차 · 자율주행(FSD) · 로봇", "desc": "전기차뿐만 아니라 완전자율주행(FSD), 로보택시(Cybercab), 휴머노이드 로봇(옵티머스) 및 에너지저장장치(ESS)로 밸류에이션이 확장되는 핵심 빅테크입니다."},
        {"symbol": "AAPL", "name": "애플 (Apple)", "sector": "온디바이스 AI · IT 생태계", "desc": "전 세계 20억 대 이상의 활성 기기 생태계를 바탕으로 '애플 인텔리전스(온디바이스 AI)' 교체 수요와 고마진 서비스 매출 성장을 이어가고 있습니다."},
        {"symbol": "MSFT", "name": "마이크로소프트 (Microsoft)", "sector": "클라우드(Azure) · 기업용 AI", "desc": "애저(Azure) 클라우드 인프라와 오피스 코파일럿(Copilot)을 통해 AI 수익화를 가장 안정적으로 실현하는 글로벌 대표 소프트웨어 기업입니다."},
        {"symbol": "META", "name": "메타 (Meta Platforms)", "sector": "AI 타겟 광고 · 오픈소스 LLM", "desc": "인스타그램·페이스북에 AI 추천 및 광고 자동화 알고리즘을 적용하여 광고 단가와 영업이익률을 빠르게 끌어올리고 있습니다."},
        {"symbol": "GOOGL", "name": "알파벳 / 구글 (Alphabet)", "sector": "검색 · 구글 클라우드 · 제미나이", "desc": "구글 검색 및 유튜브 광고 캐시카우에 더해 제미나이(Gemini) AI가 탑재된 구글 클라우드 부문의 영업이익 기여도가 급증하고 있습니다."},
        {"symbol": "AMZN", "name": "아마존 (Amazon)", "sector": "AWS 클라우드 · 북미 이커머스", "desc": "글로벌 1위 클라우드 서비스인 AWS의 AI 서버 수요 호조와 물류 자동화를 통한 북미 유통 마진 개선이 동시에 나타나고 있습니다."},
        {"symbol": "AVGO", "name": "브로드컴 (Broadcom)", "sector": "맞춤형 AI 칩(ASIC) · 네트워킹", "desc": "빅테크 기업들의 자체 AI 칩(ASIC) 설계 수요와 AI 데이터센터 초고속 통신 칩 시장을 선도하는 핵심 반도체 배당성장주입니다."},
        {"symbol": "PLTR", "name": "팔란티어 (Palantir)", "sector": "AI 데이터 운영체제(AIP) · 국방", "desc": "미국 정부·국방부 및 글로벌 대기업들이 AI 플랫폼(AIP)을 실제 업무에 도입하면서 상업용 매출과 영업이익이 폭발적으로 성장 중입니다."},
        {"symbol": "TSM", "name": "TSMC", "sector": "글로벌 파운드리 독점 1위", "desc": "엔비디아·애플·AMD의 최첨단 AI 칩과 CoWoS 첨단 패키징을 독점 위탁생산하는 글로벌 반도체 공급망의 심장입니다."},
    ],
    "etf": [
        {"symbol": "QQQ", "name": "Invesco QQQ (미국 나스닥100 ETF)", "sector": "미국 빅테크 · 성장주 대표 지수", "desc": "애플, 엔비디아, 마이크로소프트 등 나스닥 상장 비금융 상위 100대 혁신 기술주에 분산 투자하는 전 세계 대표 성장형 ETF입니다."},
        {"symbol": "SPY", "name": "SPDR S&P 500 (미국 대형주 500 ETF)", "sector": "미국 시장 전체 대표 지수", "desc": "미국 경제를 대표하는 우량 대기업 500개에 시가총액 비중대로 투자하여 장기 우상향 복리 효과를 누리는 스탠다드 ETF입니다."},
        {"symbol": "SOXX", "name": "iShares Semiconductor (미국 반도체 ETF)", "sector": "글로벌 AI · 반도체 밸류체인", "desc": "엔비디아, 브로드컴, AMD, TSMC, 마이크론 등 미국 증시에 상장된 핵심 반도체 설계·장비·제조 기업 30곳에 집중 투자합니다."},
        {"symbol": "SCHD", "name": "Schwab US Dividend Equity (미국 배당성장 ETF)", "sector": "10년 연속 배당증가 우량 가치주", "desc": "10년 이상 꾸준히 배당금을 지급하고 현금흐름과 자기자본이익률(ROE)이 우수한 미국 알짜 배당성장주 100개에 투자합니다."},
        {"symbol": "TLT", "name": "iShares 20+ Year Treasury (미국 20년 장기국채 ETF)", "sector": "미국 장기 국채 · 금리인하 수혜", "desc": "만기 20년 이상의 미국 정부 장기 국채에 투자하여 매월 이자 분배금을 받으면서 기준금리 인하 시 채권 가격 상승(자본차익)을 노리는 ETF입니다."},
        {"symbol": "JEPI", "name": "JPMorgan Equity Premium Income (커버드콜 월배당)", "sector": "고배당 월분배 · 변동성 방어", "desc": "저변동성 S&P500 우량주 보유와 콜옵션 매도(커버드콜) 전략을 결합해 연 7~8% 수준의 높은 월배당 현금흐름을 추구합니다."},
        {"symbol": "069500.KS", "name": "KODEX 200 (한국 코스피200 대표 ETF)", "sector": "국내 대형주 200 지수", "desc": "삼성전자, SK하이닉스, 현대차, KB금융 등 대한민국 코스피 시장을 대표하는 상위 200개 핵심 우량주에 한 번에 투자합니다."},
        {"symbol": "133690.KS", "name": "TIGER 미국나스닥100 (국내상장 나스닥 ETF)", "sector": "연금저축·ISA 계좌 필수 미국지수", "desc": "국내 계좌(연금저축·IRP·ISA)에서 환전 없이 원화로 미국 나스닥100 빅테크 기업들에 장기 절세 투자할 수 있는 대표 ETF입니다."},
    ],
    "futures": [
        {"symbol": "NQ=F", "name": "나스닥 100 선물 (E-mini Nasdaq 100)", "sector": "미국 기술주 지수 선물", "desc": "미국 정규장 개장 전후 24시간 거래되며 엔비디아·애플 등 빅테크 실적과 미국 물가·금리 발표에 가장 민감하게 반응하는 글로벌 선행 지표입니다."},
        {"symbol": "ES=F", "name": "S&P 500 선물 (E-mini S&P 500)", "sector": "미국 대형주 표준 지수 선물", "desc": "전 세계 기관 투자자와 헤지펀드가 포트폴리오 헤지 및 거시경제 방향성 베팅에 가장 많이 활용하는 유동성 1위 주가지수 선물입니다."},
        {"symbol": "GC=F", "name": "국제 금 선물 (Gold Futures · COMEX)", "sector": "안전자산 · 인플레이션 헤지", "desc": "중앙은행들의 금 매입 확대, 지정학적 리스크, 실질금리 하락 및 달러 가치 변화에 따라 움직이는 대표 안전자산 선물입니다."},
        {"symbol": "CL=F", "name": "WTI 원유 선물 (Crude Oil Futures · NYMEX)", "sector": "에너지 · 인플레이션 핵심 변수", "desc": "글로벌 경기 수요와 중동 지정학 이슈, OPEC+ 감산 정책을 즉각 반영하며 전 세계 물가지수(CPI)와 항공·정유·화학주 실적을 좌우합니다."},
        {"symbol": "SI=F", "name": "국제 은 선물 (Silver Futures)", "sector": "귀금속 + 태양광·AI 전력 산업재", "desc": "금과 같은 귀금속 안전자산 성격과 AI 서버·태양광 패널·전기차 전도체 등 첨단 산업용 수요를 동시에 보유한 고변동성 원자재 선물입니다."},
        {"symbol": "HG=F", "name": "구리 선물 (Copper · '닥터 코퍼')", "sector": "전력망·변압기·글로벌 제조업 선행지표", "desc": "AI 데이터센터 전력 케이블, 초고압 변압기, 전기차 및 중국·미국 인프라 투자의 실물 경기 건강 상태를 가장 먼저 알려주는 핵심 산업 금속입니다."},
        {"symbol": "NG=F", "name": "천연가스 선물 (Natural Gas Futures)", "sector": "발전용 에너지 · 계절성 고변동 선물", "desc": "북미·유럽의 냉난방 기온 예보, LNG 수출 터미널 가동률, AI 데이터센터 가스발전 수요에 따라 큰 변동성을 보이는 에너지 선물입니다."},
        {"symbol": "^TNX", "name": "미국 10년물 국채금리 (US 10Y Treasury Yield)", "sector": "글로벌 자산 가격의 중력(기준점)", "desc": "전 세계 대출 금리와 주식 밸류에이션 할인율의 기준점입니다. 금리가 급등하면 기술주가 압박받고, 안정되면 증시 전반에 유동성 훈풍이 붑니다."},
        {"symbol": "DX-Y.NYB", "name": "달러 인덱스 선물 (US Dollar Index)", "sector": "글로벌 달러 강세·약세 척도", "desc": "주요 6개국 통화 대비 미국 달러의 가치를 나타냅니다. 달러 인덱스가 하락(약달러)할 때 한국 코스피로의 외국인 순매수 유입이 강해집니다."},
        {"symbol": "^VIX", "name": "VIX 변동성 지수 (CBOE Volatility Index)", "sector": "월가 공포지수 · 옵션 헤지 지표", "desc": "S&P500 옵션 가격에 반영된 향후 30일간의 시장 기대 변동성입니다. 보통 20 이하이면 안정, 30 이상 급등 시 패닉 셀링(과매도 반등 임박) 구간으로 해석합니다."},
    ]
}

KR_TO_GLOBAL_QUERY_MAP = {
    "엔비디아": "NVDA", "테슬라": "TSLA", "애플": "AAPL", "마이크로소프트": "MSFT",
    "메타": "META", "구글": "GOOGL", "알파벳": "GOOGL", "아마존": "AMZN",
    "브로드컴": "AVGO", "팔란티어": "PLTR", "아이온큐": "IONQ", "일라이릴리": "LLY",
    "넷플릭스": "NFLX", "코스트코": "COST", "버크셔": "BRK-B", "코인베이스": "COIN",
    "마이크론": "MU", "인텔": "INTC", "퀄컴": "QCOM", "로켓랩": "RKLB",
    "나스닥선물": "NQ=F", "나스닥 선물": "NQ=F", "나스닥": "QQQ",
    "s&p선물": "ES=F", "s&p500선물": "ES=F", "금선물": "GC=F", "금 선물": "GC=F", "금": "GC=F",
    "원유": "CL=F", "원유선물": "CL=F", "유가": "CL=F", "wti": "CL=F",
    "은선물": "SI=F", "은 선물": "SI=F", "구리": "HG=F", "구리선물": "HG=F",
    "천연가스": "NG=F", "국채": "^TNX", "미국채": "^TNX", "달러": "DX-Y.NYB", "빅스": "^VIX", "공포지수": "^VIX",
}


def _fetch_single_yfinance_research(meta: Dict[str, Any], asset_type: str) -> Dict[str, Any]:
    import yfinance as yf
    sym = meta["symbol"]
    name = meta.get("name", sym)
    sector = meta.get("sector", "글로벌 자산")
    desc = meta.get("desc", "")

    price = None
    change_pct = 0.0
    high_52w = None
    low_52w = None
    ma50 = None
    ma200 = None
    target_mean = None
    target_high = None
    target_low = None
    upside_pct = None
    rec_key = None
    analyst_count = 0
    forward_pe = None
    div_yield = None
    currency = "KRW" if sym.endswith(".KS") or sym.endswith(".KQ") else "USD"

    try:
        tk = yf.Ticker(sym)
        hist = tk.history(period="6mo")
        if hist is not None and not hist.empty:
            closes = hist["Close"].dropna()
            if len(closes) >= 1:
                price = float(closes.iloc[-1])
            if len(closes) >= 2 and closes.iloc[-2] > 0:
                change_pct = float(((closes.iloc[-1] - closes.iloc[-2]) / closes.iloc[-2]) * 100.0)
            if len(closes) >= 20:
                high_52w = float(hist["High"].max())
                low_52w = float(hist["Low"].min())
            if len(closes) >= 50:
                ma50 = float(closes.tail(50).mean())
            if len(closes) >= 120:
                ma200 = float(closes.mean())

        if asset_type in ["us_stock", "etf"]:
            info = {}
            try:
                info = tk.info or {}
            except Exception:
                info = {}
            if not price and info.get("regularMarketPrice"):
                price = float(info["regularMarketPrice"])
            if info.get("fiftyTwoWeekHigh"):
                high_52w = float(info["fiftyTwoWeekHigh"])
            if info.get("fiftyTwoWeekLow"):
                low_52w = float(info["fiftyTwoWeekLow"])
            if info.get("fiftyDayAverage"):
                ma50 = float(info["fiftyDayAverage"])
            if info.get("twoHundredDayAverage"):
                ma200 = float(info["twoHundredDayAverage"])

            if info.get("targetMeanPrice"):
                target_mean = float(info["targetMeanPrice"])
            if info.get("targetHighPrice"):
                target_high = float(info["targetHighPrice"])
            if info.get("targetLowPrice"):
                target_low = float(info["targetLowPrice"])
            if price and target_mean and price > 0:
                upside_pct = round(((target_mean - price) / price) * 100.0, 1)

            rec_raw = (info.get("recommendationKey") or "").lower()
            if rec_raw in ["strong_buy", "strongbuy"]:
                rec_key = "Strong Buy (강력매수)"
            elif rec_raw in ["buy", "outperform"]:
                rec_key = "Buy (매수)"
            elif rec_raw in ["hold", "neutral"]:
                rec_key = "Hold (중립)"
            elif rec_raw:
                rec_key = rec_raw.upper()

            analyst_count = int(info.get("numberOfAnalystOpinions") or 0)
            if info.get("forwardPE"):
                try:
                    forward_pe = round(float(info["forwardPE"]), 1)
                except Exception:
                    pass
            if info.get("trailingAnnualDividendYield") or info.get("yield"):
                try:
                    raw_y = float(info.get("yield") or info.get("trailingAnnualDividendYield") or 0)
                    div_yield = round(raw_y * 100 if raw_y < 1 else raw_y, 2)
                except Exception:
                    pass
    except Exception as e:
        print(f"[MultiAssetResearch] yfinance error for {sym}: {e}")

    def fmt_p(val):
        if val is None:
            return "-"
        if currency == "KRW":
            return f"{int(round(val)):,}원"
        if sym in ["^TNX", "^VIX"]:
            return f"{val:.2f}"
        return f"${val:,.2f}"

    trend_badge = "추세 중립 · 박스권 탐색"
    if price and ma50:
        if price >= ma50 * 1.01:
            trend_badge = "📈 50일 이평선 상회 · 상승 추세 우위"
        elif price <= ma50 * 0.99:
            trend_badge = "📉 단기 조정 구간 · 분할 지지선 점검"

    summary_points = []
    if desc:
        summary_points.append(desc)

    if asset_type == "us_stock":
        if target_mean and price:
            up_str = f"+{upside_pct}%" if upside_pct and upside_pct > 0 else f"{upside_pct}%"
            summary_points.append(
                f"월가 투자은행(IB) 애널리스트 {analyst_count or '다수'}명의 평균 목표주가는 {fmt_p(target_mean)}(최고 {fmt_p(target_high)} ~ 최저 {fmt_p(target_low)})로, 현재가({fmt_p(price)}) 대비 {up_str} 수준입니다."
            )
        if ma50:
            summary_points.append(
                f"기술적 지표상 50일 이동평균선({fmt_p(ma50)}) 대비 현재가는 {fmt_p(price)}에 위치하며, { f'선행 PER은 약 {forward_pe}배 수준입니다.' if forward_pe else '분기 실적 가이던스가 핵심 모멘텀입니다.' }"
            )
        easy_summary = (
            f"미국 증시에 상장된 '{name}'의 월가 IB 컨센서스 및 퀀트 분석 리포트입니다. "
            f"{desc} 현재 월가 투자의견은 '{rec_key or 'Buy (매수 우위)'}'이며, 분기 실적 발표와 가이던스 상향 여부가 주가 추세의 핵심입니다."
        )
        checkpoint = "미국 국채 금리 및 나스닥 선물 흐름과 함께 분기 주당순이익(EPS)이 월가 컨센서스를 상회하는지 확인하세요."
    elif asset_type == "etf":
        if price and high_52w and low_52w:
            summary_points.append(
                f"현재가 {fmt_p(price)} 기준 최근 구간 최고가({fmt_p(high_52w)})와 최저가({fmt_p(low_52w)}) 사이에서 거래 중이며, 50일 평균선은 {fmt_p(ma50)}입니다."
            )
        summary_points.append(
            "개별 종목의 급등락 위험(어닝 쇼크 등)을 줄이면서 해당 섹터·지수의 구조적 성장을 그대로 따라갈 수 있는 핵심 자산배분 수단입니다."
        )
        easy_summary = (
            f"'{name}' ETF 리서치 분석입니다. {desc} "
            f"개별 주식을 일일이 고르기 어려운 초보 투자자나 연금·적립식 투자자가 시장 주도 섹터에 안전하게 분산 투자하기에 적합합니다."
        )
        checkpoint = "ETF 매매 시에는 기초지수 추종 오차(괴리율), 총보수(운용수수료), 그리고 환헤지(H) 여부를 함께 확인하세요."
    else:
        # futures
        if price and ma50:
            summary_points.append(
                f"현재 선물 시세는 {fmt_p(price)} (일일 변동 {change_pct:+.2f}%)이며, 50일 기준선({fmt_p(ma50)}) 대비 '{trend_badge}' 흐름을 보이고 있습니다."
            )
        summary_points.append(
            "선물 시장은 현물 주식시장 개장 전 글로벌 기관과 헤지펀드들의 자금 방향성을 가장 먼저 보여주는 최전선 선행 지표입니다."
        )
        easy_summary = (
            f"'{name}' 실시간 선물 리서치 브리핑입니다. {desc} "
            f"직접 선물에 투자하지 않더라도 이 지표의 방향을 보면 오늘 밤 미국 증시와 내일 아침 한국 증시가 어떻게 움직일지 미리 읽을 수 있습니다."
        )
        checkpoint = "선물 투자는 레버리지(증거금) 효과가 크므로 만기 롤오버(월물 교체) 일정과 주요 경제지표(CPI·FOMC) 발표 시각의 급격한 변동성에 유의하세요."

    return {
        "id": f"{asset_type}_{sym}",
        "asset_type": asset_type,
        "symbol": sym,
        "name": name,
        "sector": sector,
        "price": fmt_p(price),
        "price_num": price,
        "change_pct": round(change_pct, 2),
        "high_52w": fmt_p(high_52w),
        "low_52w": fmt_p(low_52w),
        "ma50": fmt_p(ma50),
        "trend_badge": trend_badge,
        "target_mean": fmt_p(target_mean) if target_mean else None,
        "target_high": fmt_p(target_high) if target_high else None,
        "target_low": fmt_p(target_low) if target_low else None,
        "upside_pct": upside_pct,
        "opinion": rec_key or ("Buy (매수)" if asset_type == "us_stock" else None),
        "analyst_count": analyst_count,
        "forward_pe": forward_pe,
        "div_yield": div_yield,
        "summary_points": summary_points,
        "easy_summary": easy_summary,
        "checkpoint": checkpoint,
    }


@router.get("/multi-asset-research")
@turbo_cache(ttl_seconds=180)
def get_multi_asset_research(
    asset_type: str = Query("us_stock", description="us_stock | etf | futures"),
    q: str = Query("", description="티커 또는 종목명 검색 (예: NVDA, 엔비디아, QQQ, 나스닥 선물, 금 선물)")
):
    """
    해외주식(월가 IB 컨센서스), 국내외 ETF, 글로벌 선물(지수·원자재·금리·환율) 심층 리서치 + 국내 증권사 연관 리포트 통합 API
    """
    import concurrent.futures

    atype = asset_type if asset_type in MULTI_ASSET_CATALOG else "us_stock"
    catalog = list(MULTI_ASSET_CATALOG[atype])

    q_clean = (q or "").strip()
    if q_clean:
        mapped_sym = KR_TO_GLOBAL_QUERY_MAP.get(q_clean.lower()) or KR_TO_GLOBAL_QUERY_MAP.get(q_clean.replace(" ", "").lower())
        q_upper = (mapped_sym or q_clean).upper()

        matched = [
            c for c in catalog
            if q_upper in c["symbol"].upper() or q_clean.lower() in c["name"].lower() or q_clean.lower() in c["sector"].lower()
        ]
        if matched:
            catalog = matched
        else:
            # 카탈로그에 없는 해외 티커/ETF를 직접 검색한 경우 실시간 동적 분석
            custom_sym = mapped_sym or q_clean.upper()
            catalog = [{
                "symbol": custom_sym,
                "name": f"{q_clean.upper()} ({custom_sym})",
                "sector": "글로벌 상장 종목 · ETF · 선물",
                "desc": f"'{q_clean}' 종목에 대한 실시간 시세, 이동평균 추세 및 월가 애널리스트 컨센서스 데이터를 기반으로 생성된 리서치 분석입니다."
            }]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures_map = [executor.submit(_fetch_single_yfinance_research, item_meta, atype) for item_meta in catalog[:8]]
        for f in futures_map:
            try:
                results.append(f.result(timeout=8))
            except Exception as e:
                print(f"[MultiAssetResearch] Worker error: {e}")

    # 해당 자산군과 관련된 국내 증권사 최신 리포트도 함께 제공
    related_kr_reports = []
    try:
        if atype == "us_stock":
            r_data = get_stock_research_reports(category="invest", q="미국", page=0, size=6)
            related_kr_reports = r_data.get("items", [])[:4]
        elif atype == "etf":
            r_data = get_stock_research_reports(category="invest", q="ETF", page=0, size=6)
            related_kr_reports = r_data.get("items", [])[:4]
        else:
            r_econ = get_stock_research_reports(category="economy", q="", page=0, size=4).get("items", [])[:3]
            r_bond = get_stock_research_reports(category="debenture", q="", page=0, size=4).get("items", [])[:2]
            related_kr_reports = r_econ + r_bond
    except Exception as e:
        print(f"[MultiAssetResearch] Related KR reports error: {e}")

    return {
        "status": "success",
        "asset_type": atype,
        "query": q_clean,
        "items": results,
        "related_securities_reports": related_kr_reports
    }


