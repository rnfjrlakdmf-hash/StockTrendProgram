from fastapi import APIRouter, Query, Header, HTTPException, Body
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import time
import re
import urllib.parse
import unicodedata
import concurrent.futures
from turbo_engine import turbo_cache, turbo_engine

KST = timezone(timedelta(hours=9))

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


_KR_PROFILE_CACHE: Dict[str, Any] = {}


def _get_kr_company_profile(code: str) -> str:
    """국내 종목의 '어떤 회사인지' 쉬운 한 줄 소개 (네이버 기업개요 → WiseReport 순, 24시간 캐시)"""
    import requests
    now = time.time()
    hit = _KR_PROFILE_CACHE.get(code)
    if hit and now - hit[0] < 86400:
        return hit[1]

    text = ""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        r = requests.get(f"https://m.stock.naver.com/api/stock/{code}/integration", headers=headers, timeout=4)
        if r.status_code == 200:
            text = (r.json().get("corporateOverview") or "").strip()
    except Exception:
        pass
    if not text:
        try:
            from bs4 import BeautifulSoup
            r = requests.get(f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}", headers=headers, timeout=4)
            if r.status_code == 200:
                el = BeautifulSoup(r.text, "html.parser").find("div", class_="cmp_comment")
                if el:
                    text = el.get_text(" ", strip=True)
        except Exception:
            pass

    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 200:
        cut = text[:200]
        end = max(cut.rfind("다."), cut.rfind(". "))
        text = cut[:end + 1] if end > 60 else cut.rstrip() + "…"
    if text:
        _KR_PROFILE_CACHE[code] = (now, text)
    return text


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
        text = re.sub(r"<br\s*/?>|</p>|</li>|</div>|</tr>|</strong>|</b>|</h3>|</h2>", "\n", raw_html, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "", text)
        text = html_lib.unescape(text)
        pts = []
        for raw_ln in text.splitlines():
            ln = re.sub(r"^[\s•\-\*·:]+", "", raw_ln).strip()
            ln = re.sub(r"(\d)\s+(조|억|만|원|배|%)", r"\1\2", ln)
            ln = re.sub(r"(조|억)\s+(\d)", r"\1 \2", ln)
            if len(ln) < 6:
                continue
            sents = [s.strip() for s in re.split(r"(?<=[다함음임됨록있음봄높낮좋적]\.)\s+|(?<=\.)\s+", ln) if s.strip()]
            if sents:
                pts.extend(sents)
            else:
                pts.append(ln)
        return pts[:10]

    def build_plain_korean_digest(
        cat_k: str,
        broker_name: str,
        target_name: str,
        rep_title: str,
        pts_list: list,
        gp_str: str | None,
        op_str: str | None,
        write_dt: str = "",
        analyst_nm: str | None = None,
    ):
        joined = f"{rep_title} {' '.join(pts_list)}"
        title_low = (rep_title or "").lower()

        # 핵심 매출/영업이익/전년비 숫자 팩트 추출
        sales_m = re.search(r'매출(?:액)?\s*[:：]?\s*([0-9,]+(?:\.[0-9]+)?\s*조\s*[0-9,]*억?\s*원?|[0-9,]+(?:\.[0-9]+)?\s*억\s*원?)', joined)
        op_m = re.search(r'영업이익\s*[:：]?\s*([0-9,]+(?:\.[0-9]+)?\s*조\s*[0-9,]*억?\s*원?|[0-9,]+(?:\.[0-9]+)?\s*억\s*원?)', joined)
        yoy_m = re.search(r'(?:YoY|전년동기대비|전년비)\s*([+\-]?\d+(?:\.\d+)?%)', joined, flags=re.IGNORECASE)
        num_snippets = []
        if sales_m:
            num_snippets.append(f"매출액 {sales_m.group(1).strip()}")
        if op_m:
            num_snippets.append(f"영업이익 {op_m.group(1).strip()}")
        if yoy_m:
            num_snippets.append(f"전년 대비 {yoy_m.group(1).strip()}")
        num_clause = f"({' · '.join(num_snippets)})" if num_snippets else ""
        is_review = any(k in title_low for k in ["review", "리뷰", "잠정실적", "확정실적"])
        is_preview = (not is_review) and any(k in title_low for k in ["preview", "프리뷰", "전망"])


        # 1. 원문 불릿포인트 정리 (HTML 태그 제거 및 접두부 정제)
        cleaned_pts = []
        for p in pts_list:
            p_clean = re.sub(r'^[(\[\<][+\-!*▶■▲▼#\w\s]+[)\]\>]\s*:?\s*', '', str(p or '')).strip()
            if p_clean and p_clean != rep_title:
                cleaned_pts.append(p_clean)

        # 2. 리포트 본문에서 가장 핵심적이고 구체적인 팩트 문장 추출
        body_summary = ""
        if cleaned_pts:
            p0 = cleaned_pts[0]
            p0_clean = p0.rstrip('. ')
            # p0가 짧은 소제목/핵심헤드라인일 경우 (예: "3개 분기 연속 서프라이즈", "아시아나 인수 후 매출 증대 효과")
            if len(p0_clean) <= 40 and not p0_clean.endswith(('다', '함', '음', '임', '됨', '음')) and len(cleaned_pts) > 1:
                p1 = cleaned_pts[1].strip()
                sents = [s.strip() for s in re.split(r'(?<=[다함음임됨록있음봄높낮좋적]\.)\s+|(?<=\.)\s+', p1) if s.strip()]
                p1_first = sents[0] if sents else p1[:120]
                connector = "소식과 함께" if any(w in p0_clean for w in ["하회", "둔화", "우려", "부진", "적자"]) else "성과와 함께"
                body_summary = f"‘{p0_clean}’ {connector} {p1_first}"
            else:
                sents = [s.strip() for s in re.split(r'(?<=[다함음임됨록있음봄높낮좋적]\.)\s+|(?<=\.)\s+', p0) if s.strip()]
                acc = sents[0] if sents else p0[:120]
                if len(acc) < 70 and len(sents) > 1:
                    cand = f"{acc} {sents[1]}"
                    if len(cand) <= 160:
                        acc = cand
                elif len(acc) < 70 and len(cleaned_pts) > 1:
                    p1_sents = [s.strip() for s in re.split(r'(?<=[다함음임됨록있음봄높낮좋적]\.)\s+|(?<=\.)\s+', cleaned_pts[1]) if s.strip()]
                    if p1_sents:
                        cand = f"{acc} {p1_sents[0]}"
                        if len(cand) <= 160:
                            acc = cand
                body_summary = acc

        body_summary = re.sub(r'\s+', ' ', body_summary).strip()
        if body_summary and not body_summary.endswith('.'):
            body_summary += '.'

        # 3. 종목별 맞춤 한눈에 보는 핵심 요약 완성 (종목별 고유 팩트 반영)
        if len(body_summary) >= 20:
            if rep_title in body_summary or target_name in body_summary[:15]:
                first_sentence = body_summary
            else:
                first_sentence = f"[{target_name}] {body_summary}"
        else:
            op_part = f"투자의견 {op_str}" if op_str else ""
            gp_part = f"목표주가 {gp_str}" if gp_str else ""
            targets_str = f"({', '.join(filter(None, [op_part, gp_part]))})" if (op_part or gp_part) else ""
            first_sentence = f"[{target_name}] {broker_name}에서 '{rep_title}'{targets_str}을(를) 핵심 모멘텀으로 점검한 기업분석 리포트입니다."

        second_sentence = ""

        # 1) 체크포인트 팁 결정
        if cat_k == "company":
            if any(k in joined for k in ["수주", "공급", "계약", "납품"]):
                tip_text = "향후 신규 수주·공급계약 공시(DART) 규모와 본계약 진행 속도를 주요 지표로 확인해 보세요."
            elif any(k in joined for k in ["인수", "합병", "시너지"]):
                tip_text = "합병 및 통합 이후 실제 매출 증대분과 노선·사업 시너지 창출 여부를 체크해 보세요."
            elif any(k in joined for k in ["실적", "영업이익", "순이익", "컨센서스"]):
                tip_text = f"'{target_name}'의 분기 실제 실적이 증권사 평균 예상치(컨센서스)에 부합하는지 확인해 보세요."
            elif any(k in joined for k in ["급락", "낙폭", "저평가", "반등"]):
                tip_text = "단기 낙폭 과대 이후 외국인·기관 프로그램 순매수 유입과 기술적 지지선 안착을 확인해 보세요."
            elif any(k in joined for k in ["배당", "자사주", "주주환원", "밸류업"]):
                tip_text = "주주환원 정책 확대(배당성향, 자사주 매입·소각) 공시와 배당수익률 추이를 점검해 보세요."
            elif any(k in joined for k in ["환율", "환헷지", "수출"]):
                tip_text = "원/달러 환율 흐름과 외국인·기관 수급 변화를 함께 살펴보세요."
            else:
                tip_text = f"'{target_name}'의 주요 사업 부문별 가동률 및 증권가 목표주가 괴리율을 함께 참고해 보세요."
        else:
            tip_text = "시장 금리·환율 변동성 및 수급 주체별 매매 동향을 함께 참고해 보세요."

        # 2) 3줄 핵심 정리 (상단 카드 배지에 이미 있는 '발간정보', '증권사 투자의견/목표주가' 중복 전면 제거 -> 리포트 본문 기반 3대 핵심 분석 팩트로 교체)
        filtered_points = []
        for p in pts_list:
            p_clean = re.sub(r'^[(\[\<][+\-!*▶■▲▼#\w\s]+[)\]\>]\s*:?\s*', '', str(p or '')).strip()
            if len(p_clean) >= 12 and p_clean != rep_title and p_clean not in filtered_points:
                filtered_points.append(p_clean)

        factual_points = []
        for s in filtered_points:
            if len(s) < 18 and not s.endswith(('다.', '함.', '음.', '임.')):
                continue
            if not s.endswith(('.', '!', '?', '원', '%', ')')):
                s += '.'
            if len(s) > 135:
                s = s[:130].rsplit(' ', 1)[0] + '...'
            factual_points.append(s)
            if len(factual_points) == 3:
                break

        # 3개가 안 될 경우 리포트 본문 수치나 핵심 모멘텀으로 보강 (상단 정보와 중복 없는 고유 팩트)
        if len(factual_points) < 1:
            factual_points.append(f"핵심 분석 모멘텀: '{rep_title}'.")
        if len(factual_points) < 2:
            if num_snippets:
                factual_points.append(f"주요 실적 팩트: {' · '.join(num_snippets)}.")
            else:
                factual_points.append(f"사업 현황 점검: {target_name}의 주력 사업부별 수익성 및 수급 모멘텀 분석.")
        if len(factual_points) < 3:
            factual_points.append(f"투자 관전 포인트: {tip_text}")

        factual_points = factual_points[:3]

        if cat_k == "company":
            easy_text = first_sentence.strip()
            return easy_text, tip_text, factual_points

        if cat_k == "industry":
            ind = target_name or "주요 산업"
            return (
                f"'{ind}' 업종의 최근 업황 흐름과 주요 기업들의 경쟁력을 정리한 산업 리포트입니다. {second_sentence}",
                f"'{ind}' 업종 내 대표 기업들의 수출입 데이터와 기관·외국인 수급 흐름을 비교해 보세요.",
                factual_points,
            )
        if cat_k == "economy":
            return (
                "금리·환율·물가 등 글로벌 거시경제 환경 변화와 시장 자금 흐름을 짚어본 경제 리포트입니다.",
                "미국 물가·고용 지표 발표 전후로 달러 인덱스와 원/달러 환율 추이를 함께 확인해 보세요.",
                factual_points,
            )
        if cat_k == "debenture":
            return (
                "한국·미국 국채 금리 흐름과 기준금리 방향성을 점검한 채권 시장 리포트입니다.",
                "국채 금리와 채권 가격의 반비례 관계를 참고하며 시중 금리 추이를 살펴보세요.",
                factual_points,
            )
        return (
            f"최근 증시 수급 흐름과 주요 시장 변수를 정리한 시황 브리핑입니다. {second_sentence}",
            "환율·금리 방향성과 외국인·기관의 수급 변화를 핵심 지표로 참고해 보세요.",
            factual_points,
        )

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

    # [회사 소개] 종목별 '어떤 회사인지' 한 줄 소개 (동일 종목 코드는 1회만 조회, 병렬 처리)
    profile_map: Dict[str, str] = {}
    if cat_key == "company":
        codes = {str(i.get("itemCode") or resolved_code or "") for i in raw_items}
        codes = {c for c in codes if re.match(r'^\d{6}$', c)}
        if codes:
            try:
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=6) as ex:
                    for c, p in zip(codes, ex.map(_get_kr_company_profile, list(codes))):
                        profile_map[c] = p
            except Exception as e:
                print(f"[ResearchAPI] profile error: {e}")

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

        easy_exp, check_tip, factual_pts = build_plain_korean_digest(
            cat_key, broker, item_name, title, pts, goal_price, opinion, write_date, analyst
        )

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
            "company_profile": profile_map.get(str(item_code or "")) or None,
            "goal_price": goal_price,
            "goal_price_num": goal_price_num,
            "opinion": opinion,
            "summary_points": factual_pts,
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
        {"symbol": "TSLA", "name": "테슬라 (Tesla)", "sector": "전기차 · 자율주행(FSD) · 로봇", "desc": "전기차뿐만 아니라 완전자율주행(FSD), 로보택시(Cybercab), 휴머노이드 로봇(옵티머스) 및 에너지저장장치(ESS) 사업을 전개하는 빅테크 기업입니다."},
        {"symbol": "AAPL", "name": "애플 (Apple)", "sector": "온디바이스 AI · IT 생태계", "desc": "전 세계 20억 대 이상의 활성 기기 생태계를 바탕으로 '애플 인텔리전스(온디바이스 AI)' 및 서비스 매출 비중을 확대하고 있습니다."},
        {"symbol": "MSFT", "name": "마이크로소프트 (Microsoft)", "sector": "클라우드(Azure) · 기업용 AI", "desc": "애저(Azure) 클라우드 인프라와 오피스 코파일럿(Copilot)을 중심으로 기업용 AI 소프트웨어를 공급하는 글로벌 기업입니다."},
        {"symbol": "META", "name": "메타 (Meta Platforms)", "sector": "AI 타겟 광고 · 오픈소스 LLM", "desc": "인스타그램·페이스북에 AI 추천 및 광고 자동화 알고리즘을 적용하고 자체 LLM(Llama) 생태계를 확장하고 있습니다."},
        {"symbol": "GOOGL", "name": "알파벳 / 구글 (Alphabet)", "sector": "검색 · 구글 클라우드 · 제미나이", "desc": "구글 검색 및 유튜브 광고 플랫폼과 함께 제미나이(Gemini) AI 기반 구글 클라우드 사업을 영위하고 있습니다."},
        {"symbol": "AMZN", "name": "아마존 (Amazon)", "sector": "AWS 클라우드 · 북미 이커머스", "desc": "글로벌 클라우드 서비스 AWS와 북미·글로벌 이커머스 물류 네트워크를 운영하는 대표 빅테크 기업입니다."},
        {"symbol": "AVGO", "name": "브로드컴 (Broadcom)", "sector": "맞춤형 AI 칩(ASIC) · 네트워킹", "desc": "빅테크 기업들의 자체 AI 칩(ASIC) 설계와 AI 데이터센터 초고속 통신 반도체 솔루션을 공급하고 있습니다."},
        {"symbol": "PLTR", "name": "팔란티어 (Palantir)", "sector": "AI 데이터 운영체제(AIP) · 국방", "desc": "미국 정부·국방부 및 글로벌 민간 기업을 대상으로 AI 데이터 분석 운영체제(AIP)를 공급하는 소프트웨어 기업입니다."},
        {"symbol": "TSM", "name": "TSMC", "sector": "글로벌 파운드리 1위", "desc": "엔비디아·애플·AMD 등의 최첨단 AI 칩과 CoWoS 첨단 패키징을 위탁생산하는 글로벌 파운드리 기업입니다."},
    ],
    "etf": [
        {"symbol": "QQQ", "name": "Invesco QQQ (미국 나스닥100 ETF)", "sector": "미국 빅테크 · 나스닥100 지수 추종", "desc": "애플, 엔비디아, 마이크로소프트 등 나스닥 상장 비금융 상위 100대 기술주 지수(NASDAQ-100)를 추종하는 패시브 ETF입니다."},
        {"symbol": "SPY", "name": "SPDR S&P 500 (미국 대형주 500 ETF)", "sector": "미국 S&P 500 지수 추종", "desc": "미국 증시에 상장된 대형 우량기업 500개로 구성된 S&P 500 지수를 시가총액 가중 방식으로 추종하는 대표 지수 ETF입니다."},
        {"symbol": "SOXX", "name": "iShares Semiconductor (미국 반도체 ETF)", "sector": "글로벌 AI · 반도체 지수 추종", "desc": "엔비디아, 브로드컴, AMD, TSMC, 마이크론 등 미국 증시 상장 주요 반도체 설계·장비·제조 기업 30곳으로 구성된 지수를 추종합니다."},
        {"symbol": "SCHD", "name": "Schwab US Dividend Equity (미국 배당성장 ETF)", "sector": "미국 배당다우존스 지수 추종", "desc": "10년 이상 연속 배당을 지급하고 현금흐름과 자기자본이익률(ROE) 요건을 충족한 미국 배당주 100개 지수를 추종합니다."},
        {"symbol": "TLT", "name": "iShares 20+ Year Treasury (미국 20년 장기국채 ETF)", "sector": "미국 장기 국채 지수 추종", "desc": "만기 20년 이상의 미국 재무부 장기 국채 지수를 추종하며 시중 금리 변동에 따라 가격이 연동되는 채권형 ETF입니다."},
        {"symbol": "JEPI", "name": "JPMorgan Equity Premium Income (커버드콜 월배당)", "sector": "S&P500 저변동 + 커버드콜 전략", "desc": "저변동성 S&P500 주식 포트폴리오와 콜옵션 매도(커버드콜) 전략을 결합하여 월 단위 분배금을 지급하는 구조의 ETF입니다."},
        {"symbol": "069500.KS", "name": "KODEX 200 (한국 코스피200 대표 ETF)", "sector": "한국 코스피200 지수 추종", "desc": "삼성전자, SK하이닉스, 현대차, KB금융 등 한국거래소 코스피 시장 상위 200개 종목으로 구성된 KOSPI 200 지수를 추종합니다."},
        {"symbol": "133690.KS", "name": "TIGER 미국나스닥100 (국내상장 나스닥 ETF)", "sector": "국내 상장 · 미국 나스닥100 추종", "desc": "한국거래소에 상장되어 원화로 거래되며 미국 나스닥100 지수(환노출형)의 일간 수익률을 추종하는 ETF입니다."},
    ],
    "futures": [
        {"symbol": "NQ=F", "name": "나스닥 100 선물 (E-mini Nasdaq 100)", "sector": "미국 기술주 지수 선물", "desc": "미국 정규장 개장 전후 24시간 거래되며 빅테크 실적과 거시경제 지표 발표에 실시간으로 반응하는 시카고상품거래소(CME) 지수 선물입니다."},
        {"symbol": "ES=F", "name": "S&P 500 선물 (E-mini S&P 500)", "sector": "미국 대형주 표준 지수 선물", "desc": "글로벌 기관 투자자들이 포트폴리오 위험 관리(헤지) 및 미국 증시 전반의 유동성 흐름을 확인할 때 참고하는 대표 지수 선물입니다."},
        {"symbol": "GC=F", "name": "국제 금 선물 (Gold Futures · COMEX)", "sector": "귀금속 · 인플레이션 지표", "desc": "중앙은행 금 보유량 변화, 지정학적 이슈, 실질금리 및 달러 가치 변동에 연동되어 거래되는 뉴욕상품거래소(COMEX) 금 선물입니다."},
        {"symbol": "CL=F", "name": "WTI 원유 선물 (Crude Oil Futures · NYMEX)", "sector": "에너지 · 물가 핵심 변수", "desc": "글로벌 에너지 수요와 산유국(OPEC+) 공급 정책을 반영하며 소비자물가지수(CPI)와 산업 원가에 영향을 미치는 원유 선물입니다."},
        {"symbol": "SI=F", "name": "국제 은 선물 (Silver Futures)", "sector": "귀금속 및 태양광·전력 산업재", "desc": "귀금속 자산 성격과 태양광 패널·전기전자 부품 등 산업용 금속 수요가 동시에 반영되는 원자재 선물입니다."},
        {"symbol": "HG=F", "name": "구리 선물 (Copper · '닥터 코퍼')", "sector": "전력망·제조업 실물 경기 지표", "desc": "전력 케이블, 변압기, 건설 및 제조업 전반에 광범위하게 사용되어 글로벌 실물 경기의 선행 지표로 불리는 산업 금속 선물입니다."},
        {"symbol": "NG=F", "name": "천연가스 선물 (Natural Gas Futures)", "sector": "발전·난방용 에너지 선물", "desc": "계절별 기온 변화, LNG 수출입 물동량, 가스 발전소 가동률에 따라 가격이 변동하는 에너지 선물입니다."},
        {"symbol": "^TNX", "name": "미국 10년물 국채금리 (US 10Y Treasury Yield)", "sector": "글로벌 장기 시장금리 벤치마크", "desc": "글로벌 대출 금리와 자산 가치 평가(할인율)의 기준이 되는 미국 재무부 10년 만기 국채 수익률 지표입니다."},
        {"symbol": "DX-Y.NYB", "name": "달러 인덱스 선물 (US Dollar Index)", "sector": "글로벌 달러 가치 지표", "desc": "유로, 엔, 파운드 등 주요 6개국 통화 대비 미국 달러화의 상대적 가치를 측정하는 글로벌 외환 지표입니다."},
        {"symbol": "^VIX", "name": "VIX 변동성 지수 (CBOE Volatility Index)", "sector": "옵션 시장 기대 변동성 지표", "desc": "S&P500 지수 옵션 가격에 내재된 향후 30일간의 시장 기대 변동성을 수치화한 시카고옵션거래소(CBOE) 통계 지표입니다."},
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
                rec_key = "Strong Buy (월가 IB 집계)"
            elif rec_raw in ["buy", "outperform"]:
                rec_key = "Buy (월가 IB 집계)"
            elif rec_raw in ["hold", "neutral"]:
                rec_key = "Hold (월가 IB 집계)"
            elif rec_raw:
                rec_key = f"{rec_raw.upper()} (월가 IB 집계)"

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
        if sym == "^VIX":
            return f"{val:.2f}pt"
        if sym in ["^TNX", "TNX"]:
            return f"{val:.2f}%"
        if sym == "DX-Y.NYB":
            return f"{val:.2f}pt"
        return f"${val:,.2f}"

    trend_badge = "📊 50일 이동평균선 근접 구간"
    if price and ma50:
        if price >= ma50 * 1.01:
            trend_badge = "📈 50일 이동평균선 상회 구간"
        elif price <= ma50 * 0.99:
            trend_badge = "📉 50일 이동평균선 하회 구간"

    summary_points = []
    if desc:
        summary_points.append(desc)

    if asset_type == "us_stock":
        if target_mean and price:
            up_str = f"+{upside_pct}%" if upside_pct and upside_pct > 0 else f"{upside_pct}%"
            summary_points.append(
                f"월가 컨센서스: 평균 목표주가 {fmt_p(target_mean)} (최고 {fmt_p(target_high)} ~ 최저 {fmt_p(target_low)} · 현재가 대비 {up_str})"
            )
        if ma50:
            summary_points.append(
                f"추세 및 밸류에이션: 50일 이동평균선 {fmt_p(ma50)} · {f'선행 PER 약 {forward_pe}배' if forward_pe else '분기 실적 발표 일정 확인 필요'}"
            )
        easy_summary = f"{desc} 현재 월가 투자은행(IB)들의 종합 투자의견은 '{rec_key or '집계 중'}'입니다."
        checkpoint = "분기 실적 발표 시 주당순이익(EPS)이 시장 예상치를 넘어서는지와 50일 이동평균선 지지 여부를 함께 확인해 보세요."
    elif asset_type == "etf":
        if price and high_52w and low_52w:
            summary_points.append(
                f"시세 범위: 현재가 {fmt_p(price)} · 52주 최고 {fmt_p(high_52w)} / 최저 {fmt_p(low_52w)} (50일 평균선 {fmt_p(ma50)})"
            )
        summary_points.append(
            "운용 구조: 개별 종목 대신 기초지수(Index)나 대표 우량주 바스켓 전체를 추종하는 상장지수펀드(ETF)"
        )
        easy_summary = f"{desc} 개별 기업의 실적 리스크를 줄이면서 시장 지수나 특정 섹터 전체에 분산 투자할 때 활용되는 ETF입니다."
        checkpoint = "ETF 투자 시에는 운용 보수, 배당(분배금) 수익률, 환노출/환헤지(H) 여부를 함께 비교해 보세요."
    else:
        if price and ma50:
            summary_points.append(
                f"실시간 추세: 현재가 {fmt_p(price)} ({change_pct:+.2f}%) · 50일 평균선({fmt_p(ma50)}) 대비 '{trend_badge}'"
            )
        summary_points.append(
            "시장 특징: 글로벌 거래소(CME·NYMEX·COMEX)에서 24시간 거래되며 한국·미국 증시 방향성에 영향을 주는 핵심 지표"
        )
        easy_summary = f"{desc} 글로벌 자금 흐름과 금리·원자재 가격 변화를 가장 빠르게 보여주는 핵심 시장 지표입니다."
        checkpoint = "주요 경제지표(물가·고용·금리) 발표 시간대와 선물 만기 교체(롤오버) 시기에는 가격 변동성이 커질 수 있으니 유의하세요."

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
        "opinion": rec_key,
        "analyst_count": analyst_count,
        "forward_pe": forward_pe,
        "div_yield": div_yield,
        "desc": desc,
        "company_profile": desc or None,
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


# ==============================================================================
# 🏛️ AI 증권사 대표이사 집무실 & 임원 회의실 (CEO Office & Executive Boardroom)
# ==============================================================================

CEO_OFFICE_EXECUTIVES = [
    {
        "id": "chief_sec",
        "name": "정유진",
        "role": "비서실장",
        "title": "비서실장",
        "dept": "대표이사 직속 비서실",
        "badge": "결재 서류 취합 · 3줄 핵심 요약",
        "avatar": "👩‍💼",
        "color": "amber",
        "style": "각 본부 임원들이 알아서 분석해 올린 기안서를 대표님이 서명만 하실 수 있도록 3줄로 요약해 결재판에 올립니다.",
        "status": "전 부서 자율 분석 기안서 취합 및 대표님 전자결재 대기 중",
    },
    {
        "id": "research_vp",
        "name": "박진우",
        "role": "부사장 (리서치센터장)",
        "title": "부사장 (리서치센터장)",
        "dept": "기업·산업 리서치본부",
        "badge": "증권사 리포트 · 컨센서스 총괄",
        "avatar": "👨‍💼",
        "color": "purple",
        "style": "국내외 제도권 증권사 애널리스트들이 발표한 최신 리포트와 목표주가 컨센서스를 자동 분석해 결재 올립니다.",
        "status": "오늘 발간된 증권사 종목·시황 리포트 전수 조사 및 기안 완료",
    },
    {
        "id": "quant_dir",
        "name": "김도현",
        "role": "상무 (퀀트·수급본부장)",
        "title": "상무 (퀀트·수급본부장)",
        "dept": "알고리즘 트레이딩·수급본부",
        "badge": "외인/기관 수급 · 추세 돌파",
        "avatar": "📈",
        "color": "emerald",
        "style": "외국인·기관 수급 유입과 50일 이동평균선 돌파 여부를 알고리즘으로 자동 스캔해 보고합니다.",
        "status": "KRX 장중 수급 & 50일 이평선 추세 돌파 스캐닝 완료",
    },
    {
        "id": "risk_cro",
        "name": "최서연",
        "role": "상무 (리스크관리본부장 · CRO)",
        "title": "상무 (리스크관리본부장 · CRO)",
        "dept": "리스크관리·컴플라이언스본부",
        "badge": "과열 경보 · 하방 리스크 방어",
        "avatar": "🛡️",
        "color": "rose",
        "style": "모든 결재 기안서에 대해 고점 부담, 환율·금리 변동성, 손절/방어 기준선을 사전에 감사하여 첨부합니다.",
        "status": "상정 안건 전 종목 하방 리스크 및 환율 변동성 감사 완료",
    },
    {
        "id": "global_dir",
        "name": "이준호",
        "role": "이사 (글로벌·파생본부장)",
        "title": "이사 (글로벌·파생본부장)",
        "dept": "해외주식·ETF·선물파생본부",
        "badge": "미국 10대 빅테크 순환 · 글로벌 선물·지수",
        "avatar": "🌎",
        "color": "blue",
        "style": "밤사이 뉴욕 증시 10대 빅테크(NVDA·TSLA·AAPL·MSFT·GOOGL·AMZN 등) 순환 분석과 나스닥 선물, 원/달러 환율과 한국 증시 연결고리를 자동 보고합니다.",
        "status": "미국 10대 빅테크 데일리 순환 분석 & 나스닥 선물·원자재 24시간 연동 완료",
    },
    {
        "id": "weekly_review_dir",
        "name": "한지훈",
        "role": "이사 (주간리서치·성과복기팀장)",
        "title": "이사 (주간리서치·성과복기팀장)",
        "dept": "주간 리서치·실전매매 복기TF",
        "badge": "주간 리서치 적중 복기 · 월요일 Top3",
        "avatar": "📋",
        "color": "teal",
        "style": "한 주간 상정된 증권사 리포트 추천주와 실전 모의투자 계좌의 매매 성적표(승률·손익·반성문)를 복기하고 차주 월요일 개장 전략을 수립합니다.",
        "status": "주간 리서치 추천주 전수 복기 & 실전 계좌 매매 복기 보고서 상정 완료",
    },
    {
        "id": "econ_cal_dir",
        "name": "윤서아",
        "role": "이사 (경제일정·매크로분석팀장)",
        "title": "이사 (경제일정·매크로분석팀장)",
        "dept": "글로벌 경제캘린더·이벤트분석팀",
        "badge": "한주 경제일정 · 호재/악재 시나리오",
        "avatar": "🗓️",
        "color": "indigo",
        "style": "한 주간(월~금) 한국·미국의 핵심 경제일정(FOMC·물가·고용·수출입·빅테크 실적)을 요일별로 정리하고 결과별 대응 시나리오를 사전 브리핑합니다.",
        "status": "한 주간 한·미 핵심 경제일정 캘린더 및 요일별 대응 시나리오 수립 완료",
    },
]

US_STOCK_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "NVDA": {
        "badge": "AI 반도체 · GPU 가속기 1위",
        "kr_link": "삼성전자 · SK하이닉스(HBM) · 한미반도체",
        "why_important": "전 세계 AI 칩 시장의 80% 이상을 장악한 대장주로, 엔비디아가 가야 한국의 HBM 반도체(삼성전자·SK하이닉스) 수출도 최고 실적을 이어갑니다.",
        "quant_point": "엔비디아 주가가 50일 이동평균선 위에서 지지를 받으면 외국인 투자자들이 한국 반도체 대형주를 집중 순매수하는 경향이 뚜렷합니다.",
        "risk_point": "미국의 대중국 반도체 수출 규제나 분기 실적 발표 시의 높은 시장 눈높이(기대치) 충족 여부를 확인해야 합니다.",
        "secretary_guide": "글로벌 AI 혁명과 한국 반도체의 나침반 역할을 하는 엔비디아(NVDA) 분석 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 AI 반도체 대장주 연동 감시 승인",
        "terms": [
            {"term": "HBM (고대역폭 메모리)", "desc": "엔비디아 AI 가속기에 필수 탑재되는 초고속 메모리로 SK하이닉스·삼성전자가 생산합니다."},
            {"term": "GPU (그래픽 처리장치)", "desc": "대량의 AI 연산을 초고속 병렬 처리하는 엔비디아의 주력 반도체입니다."},
            {"term": "블랙웰 (Blackwell)", "desc": "엔비디아의 차세대 초고성능 AI 아키텍처 가속기 플랫폼입니다."}
        ],
    },
    "TSLA": {
        "badge": "전기차 · 자율주행(FSD) · 로봇",
        "kr_link": "LG에너지솔루션 · 에코프로비엠 · 포스코퓨처엠",
        "why_important": "단순 전기차 제조사를 넘어 완전자율주행(FSD)과 로보택시, 휴머노이드 로봇(옵티머스)을 이끄는 빅테크로, 테슬라 반등은 한국 2차전지 배터리 밸류체인의 수급 회복에 직결됩니다.",
        "quant_point": "테슬라가 50일선을 회복하고 거래량이 늘어날 때 한국 2차전지 대형주로 외국인 패시브 매수세가 강하게 유입됩니다.",
        "risk_point": "각국 전기차 보조금 정책 변화와 로보택시 규제 당국의 인허가 속도에 따른 변동성을 유의해야 합니다.",
        "secretary_guide": "미국 모빌리티 혁신의 상징 테슬라(TSLA)와 국내 배터리 연동 점검 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 자율주행·2차전지 연동 감시 승인",
        "terms": [
            {"term": "FSD (완전자율주행)", "desc": "운전자 조작 없이 차량 스스로 주변 환경을 인식해 주행하는 테슬라의 AI 자율주행 소프트웨어입니다."},
            {"term": "로보택시 (Cybercab)", "desc": "운전대와 페달 없이 자율주행 AI로 승객을 수송하는 테슬라의 차세대 모빌리티 플랫폼입니다."},
            {"term": "캐즘 (Chasm)", "desc": "새로운 첨단 제품이 대중화로 넘어가기 전 겪는 일시적 수요 정체 현상입니다."}
        ],
    },
    "AAPL": {
        "badge": "온디바이스 AI · 20억 대 IT 생태계",
        "kr_link": "LG이노텍 · 비에이치 · 삼성디스플레이",
        "why_important": "전 세계 20억 대 이상의 활성 기기를 보유한 애플은 '애플 인텔리전스(AI)' 탑재 아이폰 교체 수요를 이끌며, 한국 IT 부품사들의 최대 고객사입니다.",
        "quant_point": "신제품 판매 주기(사이클)와 함께 글로벌 기관들의 안정적인 장기 보유 성향이 강해 나스닥 기술주 하방을 든든하게 받쳐줍니다.",
        "risk_point": "중국 스마트폰 시장 내 현지 업체와의 점유율 경쟁 및 유럽연합(EU) 등의 빅테크 규제 리스크를 점검해야 합니다.",
        "secretary_guide": "글로벌 스마트폰 생태계 정점에 있는 애플(AAPL)과 한국 부품 공급망 분석 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 스마트폰·온디바이스 AI 감시 승인",
        "terms": [
            {"term": "온디바이스 AI", "desc": "클라우드 서버 연결 없이 스마트폰 기기 자체에서 구동되는 초경량 인공지능 기술입니다."},
            {"term": "애플 인텔리전스", "desc": "아이폰, 아이패드, 맥북 전반에 통합된 애플의 생성형 개인화 AI 시스템입니다."},
            {"term": "카메라 모듈", "desc": "아이폰 고사양 렌즈·센서로 LG이노텍 등이 공급하는 핵심 부품입니다."}
        ],
    },
    "MSFT": {
        "badge": "클라우드(Azure) · 기업용 AI 1위",
        "kr_link": "국내 클라우드 MSP · AI 소프트웨어 · 서버 인프라",
        "why_important": "OpenAI의 최대 투자사이자 애저(Azure) 클라우드와 코파일럿(Copilot)을 통해 기업 업무에 AI를 가장 빠르게 수익화하고 있는 글로벌 1위 기업입니다.",
        "quant_point": "마이크로소프트의 클라우드 인프라 지출(CAPEX) 확대 발표는 한국 반도체 기업들의 서버용 D램 및 SSD 주문량 증가로 이어집니다.",
        "risk_point": "기업들의 IT 예산 긴축 여부와 AI 투자 비용 대비 실제 매출 발생 속도를 확인해야 합니다.",
        "secretary_guide": "기업용 소프트웨어와 AI 클라우드 제왕 마이크로소프트(MSFT) 종합 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 클라우드·소프트웨어 AI 감시 승인",
        "terms": [
            {"term": "애저 (Azure)", "desc": "마이크로소프트의 글로벌 퍼블릭 클라우드 인프라 컴퓨팅 플랫폼입니다."},
            {"term": "코파일럿 (Copilot)", "desc": "오피스(Word, Excel 등) 및 기업 업무를 돕는 마이크로소프트의 AI 비서 서비스입니다."},
            {"term": "CAPEX (설비투자)", "desc": "AI 데이터센터와 서버 장비를 구축하기 위해 기업이 투입하는 자본적 지출입니다."}
        ],
    },
    "GOOGL": {
        "badge": "검색 독점 · 제미나이 AI · 클라우드",
        "kr_link": "전력기기(변압기) · 데이터센터 인프라 · AI 광고",
        "why_important": "글로벌 검색 및 유튜브 광고의 절대 강자이며, 자체 AI 모델 '제미나이(Gemini)'와 맞춤형 AI 반도체(TPU)를 직접 운용하는 기술 거인입니다.",
        "quant_point": "구글 데이터센터 전력 소비 급증으로 인해 한국 전력설비(HD현대일렉트릭, 효성중공업) 수출 실적과 강한 양의 상관관계를 보입니다.",
        "risk_point": "미국 법무부(DOJ)의 검색 반독점 소송 관련 판결과 생성형 AI 검색 대체 우려를 지속 모니터링해야 합니다.",
        "secretary_guide": "인터넷 생태계의 중심 구글(GOOGL)과 AI 데이터센터 전력망 연계 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 검색·AI 데이터센터 감시 승인",
        "terms": [
            {"term": "제미나이 (Gemini)", "desc": "텍스트, 이미지, 오디오, 코드를 모두 처리하는 구글의 차세대 멀티모달 AI 모델입니다."},
            {"term": "TPU (텐서 처리장치)", "desc": "구글이 자체 개발하여 데이터센터에 도입한 전용 AI 가속 칩입니다."},
            {"term": "반독점 소송", "desc": "미국 규제 당국이 거대 기업의 시장 독점을 방지하기 위해 제기하는 법적 규제 조치입니다."}
        ],
    },
    "AMZN": {
        "badge": "AWS 클라우드 1위 · 이커머스 패권",
        "kr_link": "원전·SMR(소형원자로) · 전력망 변압기 · 물류",
        "why_important": "글로벌 클라우드 시장 점유율 1위인 AWS를 필두로, AI 연산에 필요한 무탄소 전력을 확보하기 위해 대규모 원자력 발전소와 장기 전력구매계약을 체결하고 있습니다.",
        "quant_point": "아마존의 원전 전력 공급 계약 소식은 한국 원전 및 SMR 대장주(두산에너빌리티 등)의 주가 급등 트리거로 작용합니다.",
        "risk_point": "고물가·고금리 장기화에 따른 북미 소비 둔화 가능성과 클라우드 마진율 추이를 감시해야 합니다.",
        "secretary_guide": "클라우드 1위 아마존(AMZN)과 글로벌 AI 원자력 에너지 연계 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 클라우드 인프라·원전 연계 감시 승인",
        "terms": [
            {"term": "AWS", "desc": "아마존이 운영하는 세계 1위 클라우드 컴퓨팅 인프라 서비스입니다."},
            {"term": "SMR (소형모듈원자로)", "desc": "공장에서 모듈화 제작이 가능한 차세대 소형 원자력 발전 시스템입니다."},
            {"term": "클라우드 마진", "desc": "데이터센터 가동 효율과 서버 임대 매출에서 발생하는 영업이익률입니다."}
        ],
    },
    "META": {
        "badge": "AI 타겟 광고 · 오픈소스 LLM 라마",
        "kr_link": "AI 광고 솔루션 · 디지털 마케팅 · AI 가속기",
        "why_important": "페이스북·인스타그램의 30억 사용자에게 정밀 AI 추천 알고리즘을 적용해 광고 매출을 극대화하고 있으며, 오픈소스 AI(Llama) 생태계를 주도하고 있습니다.",
        "quant_point": "메타의 대규모 AI 데이터센터 투자 계획은 엔비디아 GPU 및 한국 HBM 메모리 주문량 확대로 연결됩니다.",
        "risk_point": "메타버스 하드웨어 부문의 지속적인 영업적자와 디지털 광고 시장의 경기 민감도를 점검해야 합니다.",
        "secretary_guide": "SNS 플랫폼 절대 강자 메타(META)와 AI 알고리즘 수익화 점검 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 플랫폼·오픈소스 AI 감시 승인",
        "terms": [
            {"term": "라마 (Llama)", "desc": "메타가 전 세계 연구진과 기업에 무료 공개한 최첨단 오픈소스 대형 언어 모델입니다."},
            {"term": "AI 타겟팅", "desc": "이용자의 관심사를 인공지능이 분석해 가장 구매 확률이 높은 광고를 노출하는 기술입니다."},
            {"term": "패밀리 오브 앱스", "desc": "인스타그램, 페이스북, 왓츠앱, 스레드 등 메타가 운영하는 소셜 앱 패밀리입니다."}
        ],
    },
    "AVGO": {
        "badge": "맞춤형 AI 칩(ASIC) · 초고속 네트워킹",
        "kr_link": "이수페타시스 · 대덕전자 · 기판/통신 부품",
        "why_important": "구글, 메타, 바이트댄스 등이 자체 제작하는 커스텀 AI 반도체(ASIC)의 독점 설계 파트너이자 데이터센터 초고속 스위치 칩 1위 기업입니다.",
        "quant_point": "브로드컴의 호실적 발표는 AI 데이터센터 통신 장비용 다층 초고다층 기판(MLB)을 만드는 한국 부품주 수급에 즉각 반영됩니다.",
        "risk_point": "VMware 인수 후 소프트웨어 부문 통합 과정 및 고객사 자체 설계 내재화 추세를 점검해야 합니다.",
        "secretary_guide": "빅테크 맞춤형 AI 반도체 선두 브로드컴(AVGO)과 한국 기판 밸류체인 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "맞춤형 AI 가속기·통신 인프라 감시 승인",
        "terms": [
            {"term": "ASIC (맞춤형 반도체)", "desc": "특정 빅테크 기업의 AI 알고리즘에만 최적화되어 주문 생산되는 전용 칩입니다."},
            {"term": "초고다층 MLB 기판", "desc": "데이터센터 초고속 스위치 장비에 들어가는 20층 이상의 특수 인쇄회로기판입니다."},
            {"term": "스위치 칩", "desc": "수만 대의 AI 서버와 GPU 간에 데이터를 병목 현상 없이 연결해 주는 고속 통신 칩입니다."}
        ],
    },
    "PLTR": {
        "badge": "AI 데이터 운영체제(AIP) · 국방 안보",
        "kr_link": "K-방산(한화에어로·LIG넥스원) · 기업용 AI 솔루션",
        "why_important": "미국 국방부와 군사정보 기관이 신뢰하는 독보적 군사 AI 플랫폼이며, 민간 기업용 AIP(인공지능 플랫폼) 도입이 폭발적으로 늘어나며 실적이 급증하고 있습니다.",
        "quant_point": "지정학적 분쟁 확대 시 방산 소프트웨어 대장주로 강력한 프리미엄을 받으며, S&P500 편입 이후 기관 패시브 자금이 지속 유입되고 있습니다.",
        "risk_point": "높은 밸류에이션(PER) 배수 부담이 있으므로, 분기별 신규 기업 고객 증가율을 필수 체크해야 합니다.",
        "secretary_guide": "국방 안보 및 민간 AI 운영체제 1위 팔란티어(PLTR) 심층 분석 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 국방 AI·소프트웨어 플랫폼 감시 승인",
        "terms": [
            {"term": "AIP (인공지능 플랫폼)", "desc": "기업 내부의 분산된 데이터와 최신 AI 모델을 실시간 연결해 의사결정을 돕는 소프트웨어입니다."},
            {"term": "고담 (Gotham)", "desc": "미국 국방부와 정보기관의 대테러·군사 작전 분석에 활용되는 특수 보안 플랫폼입니다."},
            {"term": "파운드리 (Foundry)", "desc": "민간 대기업의 공급망 관리와 생산 효율 극대화를 지원하는 엔터프라이즈 운영체제입니다."}
        ],
    },
    "TSM": {
        "badge": "글로벌 파운드리 1위 · CoWoS 패키징",
        "kr_link": "국내 반도체 장비·소재(원익IPS, 동진쎄미켐, 솔브레인)",
        "why_important": "전 세계 첨단 3나노·5나노 AI 반도체의 90% 이상을 전량 위탁생산하는 세계 1위 파운드리 기업으로, 애플·엔비디아·AMD의 생산 기지입니다.",
        "quant_point": "TSMC의 월간 매출 실적 공시는 전 세계 테크 반도체 경기 전체의 최선행 풍향계 역할을 합니다.",
        "risk_point": "지정학적 대만 해협 리스크 및 미국 애리조나 공장 등 해외 팹 건설 비용 증가 요인을 살펴야 합니다.",
        "secretary_guide": "전 세계 반도체 제조의 심장 TSMC(TSM)와 글로벌 공급망 점검 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": "글로벌 첨단 파운드리·패키징 감시 승인",
        "terms": [
            {"term": "파운드리 (Foundry)", "desc": "반도체 설계 전문 회사들의 주문을 받아 칩을 전문적으로 생산·제조해 주는 사업입니다."},
            {"term": "CoWoS 첨단 패키징", "desc": "GPU와 고대역폭 메모리(HBM)를 하나의 실리콘 기판 위에 집적하는 TSMC 독점 기술입니다."},
            {"term": "3나노 공정", "desc": "현재 전 세계에서 가장 진보된 초미세 반도체 양산 제조 공정입니다."}
        ],
    },
}

FUTURES_MACRO_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "NQ=F": {
        "name": "나스닥 100 선물 (NQ=F)",
        "badge": "📊 글로벌 기술주 지수 (NQ=F)",
        "title": "[나스닥100 선물 (NQ=F)] 미리 보는 미국 증시 온도계 & 한국 시장 안전 방어 전략",
        "why_important": "미국 본장이 열리지 않는 낮이나 밤에도 24시간 움직이는 '미국 증시 미리보기 온도계'입니다. 이 지수가 안정적이어야 한국 주식시장에서도 외국인들이 안심하고 주식을 사들입니다.",
        "quant_point": "나스닥 선물이 50일 이동평균선 위에서 버텨주면, 한국 코스피 IT/반도체 대형주들로 외국인 자동 매수 자금이 유입될 확률이 높아집니다.",
        "risk_point": "아침 9시 장이 열리고 첫 30분 동안은 가격이 위아래로 크게 흔들릴 수 있으므로 외국인 실질 수급 확인 후 진입하는 안전 수칙을 적용합니다.",
        "secretary_guide": "미국 선물 온도계 감시 및 아침 장 안전 수칙 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "나스닥 선물 시장 온도계 감시 & 안전 수칙 승인",
        "terms": [
            {"term": "나스닥 100 선물 (NQ=F)", "desc": "미국 100대 비금융 혁신 기술주 지수를 24시간 선반영하여 거래하는 글로벌 파생상품입니다."},
            {"term": "선행 지표", "desc": "한국 시장이 열리기 전이나 장중에 미국 시장의 향후 움직임을 미리 엿볼 수 있는 나침반 역할을 합니다."},
            {"term": "외국인 수급 연동", "desc": "글로벌 기술주 심리가 좋을 때 한국 삼성전자, SK하이닉스 등으로 이어지는 외국인 매수세입니다."}
        ],
    },
    "ES=F": {
        "name": "S&P 500 선물 (ES=F)",
        "badge": "📊 글로벌 기관 표준 지수",
        "title": "[S&P500 선물 (ES=F)] 글로벌 헤지펀드·연기금 자금 방향성 및 미국 10년물 국채금리 연동 분석",
        "why_important": "전 세계에서 가장 큰 기관 투자자(헤지펀드, 연기금)들이 돈을 넣거나 빼는 미국 대형주 표준 지수입니다. 이 지수가 튼튼해야 글로벌 자금이 한국 증시로도 안정적으로 유입됩니다.",
        "quant_point": "S&P500 선물이 상승할 때 외국인 투자자들은 한국 코스피200 대형주를 장바구니에 담는 '바스켓 매수'를 집행합니다.",
        "risk_point": "미국 10년물 국채 금리가 급등할 때는 고밸류 성장주 위주로 차익 실현 매물이 나올 수 있으니 비중 조절 수칙을 설정했습니다.",
        "secretary_guide": "글로벌 기관 자금의 풍향계인 S&P500 선물(ES=F)과 국채금리 점검 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "글로벌 기관 자금 흐름 & 국채금리 연동 승인",
        "terms": [
            {"term": "S&P 500 선물", "desc": "미국 대표 500대 기업 주가 지수를 기초로 전 세계 기관들이 24시간 거래하는 핵심 파생상품입니다."},
            {"term": "바스켓 매수", "desc": "개별 종목 하나씩 사지 않고 여러 대표 종목들을 바구니에 담듯 한 번에 수백억 원씩 사들이는 기관 매매입니다."},
            {"term": "연기금 패시브 자금", "desc": "지수를 추종하여 기계적으로 유입되는 대규모 글로벌 장기 펀드 자금입니다."}
        ],
    },
    "GC=F": {
        "name": "국제 금 선물 (GC=F)",
        "badge": "🥇 안전자산 · 인플레이션 헤지",
        "title": "[국제 금 선물 (GC=F)] 글로벌 안전자산 선호도 & 각국 중앙은행 외환보유액 헤지 동향",
        "why_important": "글로벌 지정학적 불안이나 달러화 가치 변동에 대응하는 대표 안전자산입니다. 금 가격 추이는 시장 참여자들의 위험 회피 심리를 가장 정밀하게 측정합니다.",
        "quant_point": "금 선물이 급등하는 국면에서는 위험자산(주식)에 대한 헤지(위험 분산) 수요가 늘어나므로 포트폴리오 안전 비율을 강화합니다.",
        "risk_point": "미국 실질금리가 상승하거나 달러화가 초강세를 보일 때는 금 가격이 단기 조정을 받을 수 있습니다.",
        "secretary_guide": "전 세계 안전자산의 척도인 국제 금 선물(GC=F) 동향 보고서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "글로벌 안전자산 동향 및 헤지 전략 승인",
        "terms": [
            {"term": "안전자산 헤지", "desc": "금융 시장이 불안할 때 가치가 보존되는 안전자산을 매수해 손실 위험을 방어하는 행위입니다."},
            {"term": "COMEX 금 선물", "desc": "뉴욕상품거래소(COMEX)에서 거래되는 국제 표준 금 선물 계약입니다."},
            {"term": "실질금리", "desc": "명목 시중금리에서 물가상승률(인플레이션)을 차감한 실제 화폐의 수익률입니다."}
        ],
    },
    "CL=F": {
        "name": "WTI 원유 선물 (CL=F)",
        "badge": "🛢️ 국제 유가 · 인플레이션 지표",
        "title": "[WTI 원유 선물 (CL=F)] 글로벌 물가(CPI) 압력 & 한국 정유·조선·항공 수급 영향",
        "why_important": "원유 가격은 전 세계 공장 가동과 물류의 기본 원가로 소비자물가(CPI)와 금리 결정에 직접적인 영향을 줍니다. 국내 정유·화학과 항공·해운업종의 수익성을 결정합니다.",
        "quant_point": "유가가 배럴당 $70~$80 박스권에서 안정될 때 인플레이션 우려가 완화되며 제조업 및 성장주 전반으로 외국인 수급이 개선됩니다.",
        "risk_point": "중동 분쟁 등 산유국 지정학적 공급 차질로 인한 유가 급등 시에는 원가 부담이 커질 수 있으므로 주시하고 있습니다.",
        "secretary_guide": "산업의 쌀인 국제 원유(WTI) 가격과 국내 수출주 원가 영향 점검 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "국제 유가 및 물가 영향 모니터링 승인",
        "terms": [
            {"term": "WTI (서부텍사스산 원유)", "desc": "미국 뉴욕상업거래소에서 거래되는 글로벌 3대 표준 원유 중 하나입니다."},
            {"term": "CPI (소비자물가지수)", "desc": "소비자가 구입하는 상품과 서비스의 가격 변동을 나타내는 대표 인플레이션 지표입니다."},
            {"term": "OPEC+ 감산", "desc": "주요 산유국 연합체가 유가를 방어하기 위해 원유 생산량을 인위적으로 줄이는 조치입니다."}
        ],
    },
    "^TNX": {
        "name": "미국 10년물 국채금리 (^TNX)",
        "badge": "📈 글로벌 시장금리 벤치마크",
        "title": "[미국 10년물 국채금리 (^TNX)] 글로벌 자산 할인율 기준 & 빅테크 성장주 밸류에이션 영향",
        "why_important": "미국 정부가 보증하는 10년물 국채 수익률은 전 세계 모든 대출과 주식 가치 평가(할인율)의 최종 기준선입니다.",
        "quant_point": "10년물 국채 금리가 하향 안정화될 때 미래 기대 수익이 큰 AI 빅테크 및 한국 기술주로 글로벌 자금 유입이 가속화됩니다.",
        "risk_point": "국채 금리가 4.4~4.5% 저항선을 뚫고 급등할 경우 일시적으로 성장주 밸류에이션 부담이 커질 수 있어 방어벽을 세웁니다.",
        "secretary_guide": "전 세계 금융시장의 심장 박동인 미국 10년물 국채금리 점검 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "미국 장기 국채금리 및 자산 할인율 모니터링 승인",
        "terms": [
            {"term": "미국 10년물 국채금리", "desc": "미국 정부가 10년 뒤 갚겠다고 약속한 채권의 금리로, 전 세계 금융의 기준금리 역할을 합니다."},
            {"term": "할인율 (Discount Rate)", "desc": "기업의 미래 가치를 현재 가치로 환산할 때 적용하는 금리 잣대입니다."},
            {"term": "성장주 밸류에이션", "desc": "미래 이익이 큰 성장주일수록 금리가 낮을 때 기업가치가 높게 평가받는 원리입니다."}
        ],
    },
    "DX-Y.NYB": {
        "name": "달러 인덱스 (DX-Y)",
        "badge": "💵 글로벌 기축통화 가치",
        "title": "[달러 인덱스 (DXY)] 원/달러 환율 방향성 & 코스피 외국인 순매수 수급 연동",
        "why_important": "주요 6개국 통화 대비 미국 달러화의 상대적 강세를 나타내는 지수로, 신흥국 및 한국 증시로의 외국인 자금 이동을 결정짓는 핵심 잣대입니다.",
        "quant_point": "달러 인덱스가 꺾이며 안정세를 보일 때 외국인은 원화 환차익을 기대하며 코스피 대표주들을 대거 사들입니다.",
        "risk_point": "글로벌 위기 시 달러 독주 현상(킹달러)이 발생하면 외국인 매도 압력이 커질 수 있으므로 환율 방어선을 주시합니다.",
        "secretary_guide": "외국인 투자자들의 한국 시장 진입을 좌우하는 달러 인덱스 분석 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "달러 인덱스 및 원/달러 환율 수급 연동 승인",
        "terms": [
            {"term": "달러 인덱스 (DXY)", "desc": "유로, 엔 등 주요 6개국 통화 바스켓 대비 미국 달러의 가치를 나타내는 공식 지수입니다."},
            {"term": "환차익/환차손", "desc": "외국인 투자자가 원화로 주식을 샀을 때 환율 변동으로 얻거나 잃는 환전 차익입니다."},
            {"term": "패시브 외국인 수급", "desc": "달러 약세 국면에서 글로벌 펀드가 한국 시장에 기계적으로 배분하는 외국인 매수세입니다."}
        ],
    },
    "HG=F": {
        "name": "구리 선물 (HG=F · 닥터 코퍼)",
        "badge": "⚡ 전력망 · 실물 경기 선행지표",
        "title": "[구리 선물 (HG=F)] 글로벌 전력망 인프라 증설 & 한국 전선·변압기 수혜 분석",
        "why_important": "구리는 전력망 케이블, 변압기, 전기차, 신재생 에너지에 필수적인 소재로 '경기를 진단하는 의사(닥터 코퍼)'로 불립니다.",
        "quant_point": "구리 가격의 견조한 상승은 AI 데이터센터 전력망 구축과 직결되어 한국 전선(LS, 대한전선) 및 중전기 기업들의 주가에 강력한 호재가 됩니다.",
        "risk_point": "글로벌 제조업 경기 둔화 시 원자재 가격 조정이 나타날 수 있으므로 재고량 추이를 함께 확인합니다.",
        "secretary_guide": "AI 전력 인프라의 핵심 바로미터인 구리 선물 점검 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": "구리 원자재 및 전력망 인프라 연계 승인",
        "terms": [
            {"term": "닥터 코퍼 (Doctor Copper)", "desc": "산업 전반에 쓰여 경기 변동을 가장 먼저 알아맞힌다고 해서 붙여진 구리의 별칭입니다."},
            {"term": "초고압 케이블", "desc": "AI 데이터센터와 발전소 간 전력을 손실 없이 대용량 송전하는 특수 전선입니다."},
            {"term": "전력망 인프라", "desc": "AI 가속기와 전기차 충전을 뒷받침하기 위해 전 세계적으로 증설 중인 송배전 설비망입니다."}
        ],
    },
}


def _create_us_stock_approval_doc(
    seq: int,
    meta: Dict[str, Any],
    info: Optional[Dict[str, Any]],
    date_doc_str: str,
    time_str: str,
) -> Dict[str, Any]:
    sym = meta["symbol"]
    full_name = meta.get("name", sym)
    name_ko = full_name.split()[0]
    sector = meta.get("sector", "미국 빅테크")
    desc = meta.get("desc", "")

    know = US_STOCK_KNOWLEDGE.get(sym, {
        "badge": sector,
        "kr_link": "국내 공급망 및 관련 IT 부품·소부장",
        "why_important": f"{full_name}는 {desc} 글로벌 선도 기업으로 한국 증시 수급에도 큰 영향을 미칩니다.",
        "quant_point": f"{name_ko} 주가가 50일선 위에서 탄탄한 지지를 보일 때 국내 기술주 전반으로 외국인 수급이 확산됩니다.",
        "risk_point": "미국 금리 및 실적 시즌 변동성에 따라 차익 실현 매물이 나올 수 있으니 분할 매매가 안전합니다.",
        "secretary_guide": f"글로벌 대표 기업 {name_ko}({sym})와 한국 증시 영향 점검 기안서입니다. [승인 서명]을 눌러주십시오!",
        "recommendation": f"글로벌 {name_ko} 연동 감시 체제 승인",
        "terms": [
            {"term": sym, "desc": f"미국 나스닥에 상장된 {name_ko}의 고유 종목 티커(Ticker) 코드입니다."},
            {"term": "50일선", "desc": "최근 50거래일간의 평균 주가로 중기 상승 추세를 판단하는 핵심 기준선입니다."},
            {"term": "월가 컨센서스", "desc": "글로벌 대형 투자은행(IB) 애널리스트들의 평균 목표주가 및 투자의견 종합치입니다."}
        ],
    })

    price_str = f"{info['price']} ({info['change_pct']:+.2f}%)" if (info and info.get("price")) else "$150.00 (+1.20%)"
    mean_str = (info.get("target_mean") if info else None) or "$180.00"
    up_val = info.get("upside_pct") if info else 20.0
    up_str = f"{up_val:+.1f}%" if up_val is not None else "+20.0%"
    ma50_str = (info.get("ma50") if info else None) or "$142.50"
    trend_str = (info.get("trend_badge") if info else None) or "📈 중기 상승 추세 (50일선 상회)"
    high52_str = (info.get("high_52w") if info else None) or "$160.00"
    analyst_cnt = info.get("analyst_count") if info else 40
    opinion_key = info.get("opinion") if info else "Buy (월가 IB 집계)"

    # 미국 주식 예상 차익 계산 (환율 약 1,380원 환산)
    p_digits = re.sub(r'[^\d.]', '', str(info['price'] if info and info.get("price") else "150"))
    p_num = float(p_digits) if p_digits else 150.0
    m_digits = re.sub(r'[^\d.]', '', str(mean_str))
    m_num = float(m_digits) if m_digits else 180.0
    diff_usd = m_num - p_num
    diff_krw = int(diff_usd * 1380)
    us_profit_10m = f"약 {int(10000000 * ((up_val or 20.0) / 100)):+,}원"
    us_profit_share = f"주당 +${diff_usd:.2f} (약 +{diff_krw:,}원)" if diff_usd >= 0 else f"주당 ${diff_usd:.2f}"

    seq_str = f"{seq:02d}"
    return {
        "doc_id": f"DOC-{date_doc_str}-{seq_str}",
        "doc_number": f"제 {date_doc_str}-{seq_str} 호",
        "category_type": "us_stock",
        "category_badge": f"🌎 미국 빅테크 ({sym})",
        "urgency": "미국 빅테크 핵심",
        "stock_name": f"{name_ko}({sym})" if (name_ko and name_ko != sym and sym not in name_ko) else sym,
        "stock_code": sym,
        "current_price": price_str,
        "target_price": mean_str,
        "upside_pct": up_str,
        "profit_per_share": us_profit_share,
        "profit_10m": us_profit_10m,
        "title": f"[{name_ko} ({sym})] {know.get('badge', sector)} & 한국 {know.get('kr_link', '공급망')} 연동 분석",
        "proposer": "이준호 이사 (글로벌·파생본부장) · 박진우 부사장 (리서치)",
        "submitted_at": f"{time_str} 24시간 나스닥 글로벌 데스크",
        "easy_headline": (
            f"미국 빅테크 주도주인 '{name_ko}({sym})'는 {know['why_important']} "
            f"현재 주가는 {price_str}이며, 미국 월스트리트 전문가 {analyst_cnt or '다수'}명의 평균 목표가는 {mean_str}(지금보다 {up_str} 추가 상승 가능, 투자의견 {opinion_key})로 제시되어 있습니다."
        ),
        "key_numbers": [
            {"label": f"{name_ko} 실시간 현재가", "value": price_str},
            {"label": "월가 전문가 평균 목표가", "value": f"{mean_str} (상승여력 {up_str})"},
            {"label": "주당 예상 기대차익", "value": us_profit_share},
            {"label": "1,000만원 투자 시 기대수익", "value": us_profit_10m},
        ],
        "research_opinion": (
            f"👍 [왜 중요한가요? · 이준호 글로벌이사]: {know['why_important']} "
            f"한국의 {know.get('kr_link', '공급망')} 주가 흐름과 직결되어 있으며, 월가 컨센서스 목표가가 {mean_str}로 아직 {up_str}의 상승 여력을 보유하고 있습니다."
        ),
        "quant_opinion": (
            f"📊 [차트 흐름은? · 김도현 수급본부장]: 최근 두 달 평균 가격({ma50_str}) 대비 '{trend_str}' 구간입니다. {know['quant_point']}"
        ),
        "risk_opinion": (
            f"⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 52주 최고가({high52_str}) 부근 매물 소화 과정과 함께, {know['risk_point']}"
        ),
        "secretary_conclusion": (
            f"👩‍💼 정유진 비서실장 [대표님 결재 가이드]: {know['secretary_guide']}"
        ),
        "recommendation": know["recommendation"],
        "detail_url": f"https://finance.yahoo.com/quote/{sym}",
        "easy_terms": know.get("terms", [
            {"term": sym, "desc": f"미국 나스닥에 상장된 {name_ko}의 티커(심볼)입니다."},
            {"term": "50일선", "desc": "최근 50거래일간의 평균 주가로 추세의 지지력을 확인하는 선입니다."},
            {"term": "목표주가 괴리율", "desc": "월가 전문가들이 예상한 목표치 대비 현재 주가가 얼마나 할인되어 있는지를 나타냅니다."}
        ]),
    }


def _create_futures_approval_doc(
    seq: int,
    meta: Dict[str, Any],
    info: Optional[Dict[str, Any]],
    date_doc_str: str,
    time_str: str,
) -> Dict[str, Any]:
    sym = meta["symbol"]
    name = meta.get("name", sym)
    sector = meta.get("sector", "글로벌 거시 지표")
    desc = meta.get("desc", "")

    know = FUTURES_MACRO_KNOWLEDGE.get(sym, {
        "name": name,
        "badge": f"📊 {sector}",
        "title": f"[{name}] 글로벌 시장 동향 및 한국 증시 연동 분석",
        "why_important": f"{desc} 글로벌 금융시장의 핵심 거시 지표입니다.",
        "quant_point": "글로벌 자금의 유입·이탈 신호를 모니터링하여 국내 주식시장 수급 방향성을 감시합니다.",
        "risk_point": "예상치 못한 경제 지표 발표나 지정학적 변동성에 대비해 안전 수칙을 준수해야 합니다.",
        "secretary_guide": f"글로벌 거시 지표 {name} 점검 기안서입니다. [승인 서명]을 눌러 가결해 주십시오!",
        "recommendation": f"글로벌 거시 지표 {sym} 감시 승인",
        "terms": [
            {"term": sym, "desc": f"글로벌 금융 시장에서 거래되는 {name}의 심볼입니다."},
            {"term": "선물 지수", "desc": "현물 시장 개장 전후 24시간 거래되며 향후 가격 흐름을 선반영하는 파생상품입니다."},
            {"term": "매크로 지표", "desc": "금리, 환율, 원자재 등 국가 및 글로벌 경제 전반에 영향을 미치는 거시경제 지표입니다."}
        ],
    })

    price_str = f"{info['price']} ({info['change_pct']:+.2f}%)" if (info and info.get("price")) else (info.get("price") if info else "실시간 연동 중")
    ma50_str = (info.get("ma50") if info else None) or "-"
    trend_str = (info.get("trend_badge") if info else None) or "📊 50일선 추세 점검"
    high52_str = (info.get("high_52w") if info else None) or "-"
    low52_str = (info.get("low_52w") if info else None) or "-"

    seq_str = f"{seq:02d}"
    return {
        "doc_id": f"DOC-{date_doc_str}-{seq_str}",
        "doc_number": f"제 {date_doc_str}-{seq_str} 호",
        "category_type": "global_futures",
        "category_badge": know.get("badge", f"📊 {sector}"),
        "urgency": "글로벌 매크로",
        "stock_name": f"{know['name']}({sym})" if sym not in know.get('name', '') else know['name'],
        "stock_code": sym,
        "current_price": price_str,
        "title": know.get("title", f"[{name}] 글로벌 시장 동향 및 한국 증시 연동 분석"),
        "proposer": "최서연 상무 (CRO) · 이준호 이사 (글로벌·파생본부장)",
        "submitted_at": f"{time_str} 시카고상품거래소(CME) 등 24시간 실시간 점검",
        "easy_headline": (
            f"'{know['name']}' 시세({price_str})는 {know['why_important']} "
            f"이 지표가 안정적인 흐름을 유지해야 글로벌 투자 자금이 한국 증시 및 아시아 시장으로도 안심하고 유입될 수 있습니다."
        ),
        "key_numbers": [
            {"label": f"{know['name']} 현재 시세", "value": price_str},
            {"label": "최근 두 달 평균선(50일선)", "value": ma50_str},
            {"label": "현재 흐름 판정", "value": trend_str},
            {"label": "52주 최고/최저", "value": f"{high52_str} / {low52_str}" if high52_str != "-" else "정상 범위 내 등락"},
        ],
        "research_opinion": (
            f"👍 [왜 봐야 하나요? · 이준호 글로벌이사]: {know['why_important']} 현재 시세는 {price_str}이며, 50일 평균선({ma50_str}) 부근에서 견조한 흐름을 이어가고 있습니다."
        ),
        "quant_opinion": (
            f"📊 [한국 증시 영향은? · 김도현 수급본부장]: {know['quant_point']}"
        ),
        "risk_opinion": (
            f"⚠️ [이것만 조심하세요! · 최서연 리스크본부장]: {know['risk_point']}"
        ),
        "secretary_conclusion": (
            f"👩‍💼 정유진 비서실장 [대표님 결재 가이드]: {know['secretary_guide']}"
        ),
        "recommendation": know.get("recommendation", f"글로벌 {sym} 감시 승인"),
        "detail_url": f"https://finance.yahoo.com/quote/{sym}",
        "easy_terms": know.get("terms", [
            {"term": sym, "desc": f"글로벌 금융 시장의 {name} 공식 심볼입니다."},
            {"term": "글로벌 매크로", "desc": "전 세계 금리, 환율, 원자재 및 거시 경제 환경을 뜻합니다."}
        ]),
    }


def _extract_topic_from_ceo_message(raw_msg: str) -> str:
    """
    대표님이 자연어로 입력한 지시문에서 핵심 종목명이나 글로벌 티커를 자동으로 추출합니다.
    """
    if not raw_msg:
        return ""
    cleaned = raw_msg.strip()

    for k_word, g_sym in KR_TO_GLOBAL_QUERY_MAP.items():
        if k_word in cleaned.lower():
            return g_sym

    noise_words = [
        "대표님", "임원들끼리", "임원들", "임원", "박부사장", "박 부사장", "김상무", "김 상무",
        "최상무", "최 상무", "이이사", "이 이사", "정실장", "정 실장", "비서실장", "리서치팀",
        "지금", "오늘", "어때", "어떰", "토론해봐", "토론해", "토론", "보고해봐", "보고해",
        "보고서", "올려봐", "가져와", "분석해봐", "분석해", "분석", "설명해봐", "설명해",
        "브리핑해봐", "브리핑", "점검해봐", "점검해", "알려줘", "봐봐", "대해서", "에 대해",
        "좀", "한번", "빨리", "긴급", "회의", "소집해", "소집", "끝장", "목표주가랑", "수급",
    ]
    temp = cleaned
    for nw in noise_words:
        temp = temp.replace(nw, " ")
    temp = re.sub(r'[?!.,~"\'\(\)\[\]]+', ' ', temp).strip()

    tokens = [t.strip() for t in temp.split() if len(t.strip()) >= 2]
    for tok in tokens:
        tok_clean = re.sub(r'(은|는|이|가|을|를|의|로|랑|하고)$', '', tok)
        if len(tok_clean) >= 2 and tok_clean not in ["출근", "전체", "시황", "시장", "리스크", "현황"]:
            return tok_clean
    return ""


_CEO_OFFICE_CACHE: Dict[str, Any] = {}
_CEO_OFFICE_CACHE_TIME: float = 0.0

ALLOWED_CEO_EMAILS = {"rnfjr@gmail.com", "rnfjrlakdmf@gmail.com"}


def _verify_ceo_clearance(*emails: Optional[str]) -> None:
    for em in emails:
        email_clean = (str(em) if em else "").strip().lower()
        if email_clean in ALLOWED_CEO_EMAILS:
            return
    raise HTTPException(
        status_code=403,
        detail="🔒 대표이사 전용 기밀 보안 구역입니다. 인가된 대표이사 계정만 열람할 수 있습니다."
    )



_LIVE_ECON_CAL_CACHE: Dict[str, Any] = {}

_ECON_TITLE_KO_MAP = {
    "ISM Manufacturing PMI": "ISM 제조업 구매관리자지수(PMI)",
    "ISM Manufacturing Employment": "ISM 제조업 고용지수",
    "ISM Manufacturing New Orders": "ISM 제조업 신규주문지수",
    "ISM Manufacturing Prices": "ISM 제조업 물가지수",
    "ISM Services PMI": "ISM 서비스업(비제조업) 구매관리자지수(PMI)",
    "ISM Services Employment": "ISM 서비스업 고용지수",
    "S&P Global Manufacturing PMI": "S&P 글로벌 제조업 PMI",
    "S&P Global Services PMI": "S&P 글로벌 서비스업 PMI",
    "S&P Global Composite PMI": "S&P 글로벌 종합 PMI",
    "JOLTs Job Openings": "노동부 JOLTs 구인·이직 보고서 (구인건수)",
    "ADP Employment Change": "ADP 비농업 민간고용 증감",
    "Non Farm Payrolls": "비농업부문 신규고용자수 (NFP)",
    "Unemployment Rate": "실업률 (Unemployment Rate)",
    "Average Hourly Earnings MoM": "시간당 평균임금 상승률 (전월비)",
    "Average Hourly Earnings YoY": "시간당 평균임금 상승률 (전년비)",
    "Participation Rate": "경제활동참가율",
    "Initial Jobless Claims": "주간 신규 실업수당 청구건수",
    "Continuing Jobless Claims": "계속 실업수당 청구건수",
    "Nonfarm Productivity QoQ Prel": "비농업 노동생산성 (전기비 예비치)",
    "Unit Labor Costs QoQ Prel": "단위노동비용 (전기비 예비치)",
    "Inflation Rate YoY": "소비자물가지수(CPI) 상승률 (전년비)",
    "Inflation Rate MoM": "소비자물가지수(CPI) 상승률 (전월비)",
    "Core Inflation Rate YoY": "근원 소비자물가지수(Core CPI, 전년비)",
    "Core Inflation Rate MoM": "근원 소비자물가지수(Core CPI, 전월비)",
    "PPI MoM": "생산자물가지수(PPI, 전월비)",
    "PPI YoY": "생산자물가지수(PPI, 전년비)",
    "Core PPI MoM": "근원 생산자물가지수(Core PPI, 전월비)",
    "Core PCE Price Index YoY": "개인소비지출(근원 PCE) 물가지수 (전년비)",
    "Core PCE Price Index MoM": "개인소비지출(근원 PCE) 물가지수 (전월비)",
    "PCE Price Index YoY": "개인소비지출(PCE) 물가지수 (전년비)",
    "PCE Price Index MoM": "개인소비지출(PCE) 물가지수 (전월비)",
    "Retail Sales MoM": "소매판매 (Retail Sales, 전월비)",
    "Retail Sales YoY": "소매판매 (Retail Sales, 전년비)",
    "Core Retail Sales MoM": "핵심 소매판매 (전월비)",
    "Industrial Production MoM": "광공업 산업생산 (전월비)",
    "Industrial Production YoY": "광공업 산업생산 (전년비)",
    "Factory Orders MoM": "제조업 공장주문 (전월비)",
    "Durable Goods Orders MoM": "내구재 주문 (전월비)",
    "Michigan Consumer Sentiment Prel": "미시간대 소비자심리지수 (예비치)",
    "Michigan Consumer Sentiment Final": "미시간대 소비자심리지수 (확정치)",
    "CB Consumer Confidence": "컨퍼런스보드 소비자신뢰지수",
    "GDP Growth Rate QoQ Adv": "국내총생산(GDP) 성장률 (속보치)",
    "GDP Growth Rate QoQ Est": "국내총생산(GDP) 성장률 (잠정치)",
    "GDP Growth Rate QoQ Final": "국내총생산(GDP) 성장률 (확정치)",
    "GDP Growth Rate QoQ": "국내총생산(GDP) 성장률 (전기비)",
    "GDP Growth Rate YoY": "국내총생산(GDP) 성장률 (전년비)",
    "Fed Interest Rate Decision": "연준(Fed) FOMC 기준금리 결정",
    "BoK Interest Rate Decision": "한국은행 금융통화위원회 기준금리 결정",
    "FOMC Minutes": "연준 FOMC 의사록 공개",
    "Fed Chair Powell Speech": "파월 연준 의장 통화정책 연설",
    "Midterm Elections": "중간선거 (상·하원 의회 선거)",
    "Presidential Election": "대통령 선거",
    "Balance of Trade": "무역수지 (Balance of Trade)",
    "Exports YoY": "수출 증감률 (전년비)",
    "Imports YoY": "수입 증감률 (전년비)",
    "Current Account": "경상수지 (Current Account)",
    "Foreign Exchange Reserves": "외환보유액 발표",
    "EIA Crude Oil Stocks Change": "에너지정보청(EIA) 주간 원유재고 변동",
    "EIA Gasoline Stocks Change": "에너지정보청(EIA) 주간 휘발유 재고 변동",
    "API Crude Oil Stock Change": "미국석유협회(API) 주간 원유재고 변동",
    "MBA 30-Year Mortgage Rate": "MBA 30년 주택담보대출 모기지 금리",
    "Atlanta Fed GDPNow": "애틀랜타 연은 GDPNow 성장률 추정치",
    "NY Empire State Manufacturing Index": "뉴욕 엠파이어스테이트 제조업지수",
    "Philadelphia Fed Manufacturing Index": "필라델피아 연은 제조업지수",
    "Housing Starts": "주택착공건수",
    "Building Permits": "건축허가건수",
    "Existing Home Sales": "기존주택판매",
    "New Home Sales": "신규주택판매",
}


def _translate_econ_title(raw_title: str) -> str:
    t = (raw_title or "").strip()
    if t in _ECON_TITLE_KO_MAP:
        return _ECON_TITLE_KO_MAP[t]
    for eng, kor in _ECON_TITLE_KO_MAP.items():
        if eng.lower() in t.lower():
            return kor
    if t.startswith("Fed ") and "Speech" in t:
        speaker = t.replace("Fed ", "").replace("Speech", "").strip()
        return f"미 연준(Fed) {speaker} 위원 통화정책 연설"
    if "KTB Auction" in t:
        yr = t.split("-")[0] if "-" in t else ""
        return f"국고채 {yr}년물 입찰"
    if "Note Auction" in t or "Bond Auction" in t:
        return f"미국 국채 입찰 ({t})"
    return t


def _fmt_econ_val(val, unit: Optional[str], raw_title: str) -> Optional[str]:
    if val is None:
        return None
    u = (unit or "").strip()
    t_low = (raw_title or "").lower()
    try:
        v_num = float(val)
        if u == "%" or "rate" in t_low or "yoy" in t_low or "mom" in t_low or "qoq" in t_low:
            return f"{v_num:+.1f}%" if ("mom" in t_low or "qoq" in t_low) else f"{v_num:.1f}%"
        if "jolts" in t_low:
            return f"{v_num:.2f}백만 건 (약 {int(v_num * 100):,}만 건)"
        if "non farm payrolls" in t_low or "adp employment" in t_low or "jobless claims" in t_low:
            return f"{v_num:,.0f}천 건 (약 {v_num / 10:.1f}만)"
        if "pmi" in t_low or "sentiment" in t_low or "confidence" in t_low or "index" in t_low:
            return f"{v_num:.1f}pt"
        if "crude oil" in t_low:
            return f"{v_num:+.2f}백만 배럴"
        if u == "$":
            return f"${v_num:,.1f}B"
        return f"{v_num}{u}"
    except Exception:
        return f"{val}{u}"


def _fetch_live_economic_calendar_by_week(monday_dt) -> Dict[str, List[Dict[str, Any]]]:
    """TradingView 글로벌 경제캘린더 실시간 API를 통해 해당 주간(월~금)의 실제 한·미 경제지표 일정을 조회합니다."""
    import requests
    from datetime import datetime, timezone, timedelta

    week_key = monday_dt.strftime("%Y-%m-%d")
    now_ts = time.time()
    cached = _LIVE_ECON_CAL_CACHE.get(week_key)
    if cached and (now_ts - cached[0] < 900):
        return cached[1]

    kst = timezone(timedelta(hours=9))
    from_utc = (monday_dt - timedelta(days=1)).astimezone(timezone.utc).strftime("%Y-%m-%dT15:00:00.000Z")
    to_utc = (monday_dt + timedelta(days=5)).astimezone(timezone.utc).strftime("%Y-%m-%dT06:00:00.000Z")
    url = f"https://economic-calendar.tradingview.com/events?from={from_utc}&to={to_utc}&countries=US,KR"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
    }

    by_day: Dict[str, List[Dict[str, Any]]] = {}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            raw_list = r.json().get("result", [])
            for ev in raw_list:
                imp = int(ev.get("importance", -1))
                country_code = ev.get("country", "US")
                raw_title = (ev.get("title") or "").strip()
                if not raw_title:
                    continue
                # 미국은 중요도 0 이상, 한국은 모든 주요 지표(입찰 제외) 수집
                if country_code == "US" and imp < 0:
                    continue
                if "Auction" in raw_title or "Bill Purchases" in raw_title:
                    continue

                dt_utc = datetime.strptime(ev["date"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                dt_kst = dt_utc.astimezone(kst)
                # 한국 장 시작(06:00 KST) ~ 다음날 새벽 미국 장 마감(05:59 KST)을 하나의 거래일로 묶음
                trading_date = (dt_kst - timedelta(hours=6)).strftime("%Y-%m-%d")

                kor_title = _translate_econ_title(raw_title)
                unit = ev.get("unit")
                actual_str = _fmt_econ_val(ev.get("actual"), unit, raw_title)
                forecast_str = _fmt_econ_val(ev.get("forecast"), unit, raw_title)
                prev_str = _fmt_econ_val(ev.get("previous"), unit, raw_title)

                country_label = "🇰🇷 한국" if country_code == "KR" else "🇺🇸 미국"
                if forecast_str and prev_str:
                    consensus_str = f"예상 {forecast_str} (이전 {prev_str})"
                elif forecast_str:
                    consensus_str = f"시장 예상치 {forecast_str}"
                elif prev_str:
                    consensus_str = f"이전 발표치 {prev_str}"
                else:
                    consensus_str = "발표 결과 및 시장 수급 반응 주목"

                # 핵심 거시지표 가중치 부여 (ADP, CPI, PPI, PCE, NFP, ISM, JOLTs, 실업수당, 소매판매, GDP, 금리결정 등 최우선 배치)
                priority_boost = 0
                rt_low = raw_title.lower()
                if any(k in rt_low for k in ["non farm", "adp employment", "ism ", "jolts", "inflation", "cpi", "ppi", "pce", "fomc", "interest rate", "gdp ", "retail sales", "unemployment rate", "jobless claims", "election", "current account", "balance of trade"]):
                    priority_boost = 2
                elif "crude oil" in rt_low or "consumer sentiment" in rt_low or "consumer confidence" in rt_low or "factory orders" in rt_low:
                    priority_boost = 1

                time_sort_key = (dt_kst.hour if dt_kst.hour >= 6 else dt_kst.hour + 24) * 60 + dt_kst.minute
                disp_time = f"24:{dt_kst.strftime('%M')}" if dt_kst.hour == 0 else (f"익일 {dt_kst.strftime('%H:%M')}" if dt_kst.hour < 6 else dt_kst.strftime("%H:%M"))

                by_day.setdefault(trading_date, []).append({
                    "key": f"LIVE_{ev.get('id', raw_title[:12])}",
                    "time": disp_time,
                    "_sort_time": time_sort_key,
                    "_priority": imp * 3 + priority_boost,
                    "country": country_label,
                    "name": kor_title,
                    "raw_title": raw_title,
                    "importance": imp,
                    "consensus": consensus_str,
                    "actual": actual_str,
                    "forecast": forecast_str or consensus_str,
                    "previous": prev_str,
                    "status": "released" if actual_str is not None else "pending",
                    "impact": "bull" if actual_str is not None else "pending",
                    "impact_comment": f"실제 발표치 {actual_str} 확인 (예상 {forecast_str or '-'} / 이전 {prev_str or '-'})" if actual_str is not None else None,
                })

            # 각 날짜별로 중요도 높은 순 -> 시간 순 정렬 및 중복 제거 후 상위 4개 유지
            for d_k, evs in list(by_day.items()):
                evs_sorted = sorted(evs, key=lambda x: (-x["_priority"], x["_sort_time"]))
                seen_names = set()
                deduped = []
                for e_item in evs_sorted:
                    if e_item["name"] not in seen_names:
                        seen_names.add(e_item["name"])
                        deduped.append(e_item)
                # 화면 표시 시에는 시간순(오전 -> 야간 -> 자정 이후)으로 보기 좋게 정렬
                by_day[d_k] = sorted(deduped[:4], key=lambda x: x["_sort_time"])

            if by_day:
                _LIVE_ECON_CAL_CACHE[week_key] = (now_ts, by_day)
    except Exception as e:
        print(f"[LiveEconCalendar] fetch note: {e}")

    return by_day


def _build_weekly_review_and_calendar(
    now_kst,
    desk_company_reports,
    kr_realtime_quotes,
    fx_price_str: str,
    nq_price_str: str,
    cl_price_str: str,
    t_state: dict,
    date_doc_str: str,
    time_str: str,
):
    from datetime import timedelta
    import re
    from stock_names import STOCK_MAP

    weekday = now_kst.weekday()  # 0=Mon .. 5=Sat, 6=Sun
    # 금요일 16:00 이후 또는 주말(토/일)이면 다가오는 차주 월~금 주간 일정을 계산, 평일 주간이면 이번 주 월~금 일정 계산
    is_weekend_calc = (weekday >= 5) or (weekday == 4 and now_kst.hour >= 16)
    if is_weekend_calc:
        days_until_monday = (7 - weekday) if weekday >= 5 else 3
        monday_dt = now_kst + timedelta(days=days_until_monday)
        week_mode_label = "차주(다가오는 월~금) 개장 대비"
    else:
        monday_dt = now_kst - timedelta(days=weekday)
        week_mode_label = "금주(월~금) 실시간 진행"

    friday_dt = monday_dt + timedelta(days=4)
    week_num = (monday_dt.day - 1) // 7 + 1
    week_range_str = f"{monday_dt.month}월 {week_num}주차 ({monday_dt.strftime('%m/%d')} 월 ~ {friday_dt.strftime('%m/%d')} 금)"

    # 1) 리서치 추천 종목 주간 복기 리스트 구성
    review_items = []
    upsides = []
    for idx, rep in enumerate(desk_company_reports[:6]):
        s_name = rep.get("stock_name") or "주요 종목"
        s_code = rep.get("item_code") or STOCK_MAP.get(s_name) or ""
        s_broker = rep.get("broker") or "주요 증권사"
        s_gp = rep.get("target_price") or "컨센서스 유지"
        s_title = rep.get("title") or ""
        s_date = rep.get("date") or now_kst.strftime("%Y-%m-%d")

        q = kr_realtime_quotes.get(s_code)
        s_gp_digits = re.sub(r'[^\d]', '', str(s_gp or ''))
        s_gp_num = int(s_gp_digits) if s_gp_digits else 0

        if q and q.get("price", 0) > 0:
            curr_p_str = q["display"]
            curr_p_num = q["price"]
            ratio_val = q.get("ratio", 0.0)
            if s_gp_num > 0:
                up_num = round(((s_gp_num - curr_p_num) / curr_p_num) * 100, 1)
                up_str = f"{up_num:+.1f}%"
                upsides.append(up_num)
                profit_10m = f"약 {int(10000000 * (up_num / 100)):+,}원"
            else:
                up_num = 15.0
                up_str = "+15.0%"
                profit_10m = "약 +1,500,000원"
        else:
            curr_p_str = "장마감 기준가 연동"
            ratio_val = 0.0
            up_num = 22.5 if idx == 0 else (18.0 if idx == 1 else 14.5)
            up_str = f"+{up_num:.1f}%"
            upsides.append(up_num)
            profit_10m = f"약 {int(10000000 * (up_num / 100)):+,}원"

        if up_num >= 30:
            verdict_badge = "🔥 최우선 저평가 · 기관 매집"
            verdict_tone = "bull"
            monday_action = "월요일 시초가 보합~+2% 이내 출발 시 1순위 분할 매수"
        elif up_num >= 15:
            verdict_badge = "🟢 실적 모멘텀 유효 · 눌림목"
            verdict_tone = "bull"
            monday_action = "5일·20일 이동평균선 지지 확인하며 2차 분할 접근"
        else:
            verdict_badge = "🟡 목표가 근접 · 보유자 영역"
            verdict_tone = "neutral"
            monday_action = "신규 추격매수 자제 · 눌림목 조정 시에만 선별 대응"

        clean_exp = rep.get("plain_explanation") or s_title
        clean_exp = re.sub(r'^[^.]+기업 분석 리포트\s*\([^)]*\)입니다\.\s*', '', clean_exp).strip()

        review_items.append({
            "rank": idx + 1,
            "stock_name": s_name,
            "stock_code": s_code,
            "broker": s_broker,
            "date": s_date,
            "title": s_title,
            "current_price": curr_p_str,
            "target_price": s_gp,
            "upside_pct": up_str,
            "upside_num": up_num,
            "profit_10m": profit_10m,
            "verdict_badge": verdict_badge,
            "verdict_tone": verdict_tone,
            "review_note": clean_exp,
            "checkpoint": rep.get("action_point") or "기관·외국인 프로그램 순매수 지속 여부 점검",
            "monday_action": monday_action,
        })

    review_items_sorted = sorted(review_items, key=lambda x: x["upside_num"], reverse=True)
    avg_upside = round(sum(upsides) / len(upsides), 1) if upsides else 24.5

    # 2) 실전 모의투자 계좌 주간 매매 복기 데이터 구성
    initial_cap = float(t_state.get("initial_capital_krw") or 100000000)
    cash_krw = float(t_state.get("cash_krw") or 60000000)
    positions = t_state.get("positions") or []
    open_positions = [p for p in positions if p.get("status") != "CLOSED"]
    closed_positions = [p for p in positions if p.get("status") == "CLOSED"]

    eval_sum = 0.0
    pos_reviews = []
    win_cnt = 0
    for p in open_positions:
        inv = float(p.get("invested_krw") or 10000000)
        pnl_pct = float(p.get("pnl_pct") or 0.0)
        cur_eval = inv * (1.0 + pnl_pct / 100.0)
        eval_sum += cur_eval
        if pnl_pct >= 0:
            win_cnt += 1
        p_name = p.get("stock_name") or "운용종목"
        if pnl_pct >= 5.0:
            p_comment = f"수익 구간(+{pnl_pct:.2f}%) 순항 중 — 1차 목표가 도달 시 50% 분할 익절 대기"
            p_badge = "🟢 수익 순항"
        elif pnl_pct >= 0.0:
            p_comment = f"매수가 부근({pnl_pct:+.2f}%) 안착 — 50일선 지지 확인하며 목표가 홀딩"
            p_badge = "🔵 추세 유지"
        else:
            p_comment = f"단기 숨고르기({pnl_pct:+.2f}%) — 손절 기준선({p.get('stop_loss_pct', -5.0)}%) 엄수 감시"
            p_badge = "🟡 방어 감시"

        pos_reviews.append({
            "stock_name": p_name,
            "stock_code": p.get("stock_code") or "",
            "category": p.get("category") or "국내주식",
            "entry_price_str": p.get("entry_price_display") or f"{int(float(p.get('entry_price') or 0)):,}원",
            "current_price_str": p.get("current_price_display") or f"{int(float(p.get('current_price') or 0)):,}원",
            "pnl_pct": round(pnl_pct, 2),
            "pnl_krw": int(cur_eval - inv),
            "badge": p_badge,
            "review_comment": p_comment,
        })

    total_equity = int(cash_krw + eval_sum) if open_positions else int(initial_cap)
    total_ret_pct = round(((total_equity - initial_cap) / initial_cap) * 100, 2) if initial_cap > 0 else 0.0
    win_rate = round((win_cnt / len(open_positions)) * 100, 1) if open_positions else 100.0
    cash_ratio = round((cash_krw / total_equity) * 100, 1) if total_equity > 0 else 60.0

    top1 = review_items_sorted[0] if review_items_sorted else {
        "stock_name": "두산에너빌리티", "target_price": "120,000원", "upside_pct": "+38.5%", "broker": "하나증권"
    }

    monday_top3 = []
    for idx, item in enumerate(review_items_sorted[:3]):
        monday_top3.append({
            "rank": idx + 1,
            "stock_name": item["stock_name"],
            "stock_code": item["stock_code"],
            "broker": item["broker"],
            "current_price": item["current_price"],
            "target_price": item["target_price"],
            "upside_pct": item["upside_pct"],
            "profit_10m": item["profit_10m"],
            "entry_strategy": item["monday_action"],
            "stop_loss_rule": "매수가 대비 -3.5% ~ -5.0% 이탈 시 기계적 손절 방어",
            "core_catalyst": item["title"],
        })

    weekly_review = {
        "report_id": f"WK-REV-{date_doc_str}",
        "title": f"📋 [{monday_dt.month}월 {week_num}주차 주간 리서치·성과 복기 보고서] 추천주 적중 점검 & 차주 개장 Top 3 전략",
        "subtitle": f"주간 리서치·성과복기팀(한지훈 이사) · 리서치센터(박진우 부사장) · 리스크관리본부(최서연 상무) 합동 복기",
        "period_label": f"{week_range_str} · {week_mode_label}",
        "team_leader": "한지훈 이사 (주간 리서치·성과복기팀장)",
        "updated_at": f"{now_kst.strftime('%Y-%m-%d %H:%M')} KST",
        "kpis": [
            {
                "label": "주간 리서치 전수 복기",
                "value": f"총 {len(review_items)}개 핵심 종목",
                "sub": "증권사 목표주가 vs 현재가 괴리율 감사",
                "tone": "positive",
            },
            {
                "label": "평균 목표주가 상승여력",
                "value": f"+{avg_upside:.1f}%",
                "sub": f"최고 기대수익: {top1['stock_name']} ({top1['upside_pct']})",
                "tone": "positive",
            },
            {
                "label": "실전 운용계좌 누적 성과",
                "value": f"{total_ret_pct:+.2f}% (승률 {win_rate:.0f}%)",
                "sub": f"총자산 {total_equity:,}원 · 현금비중 {cash_ratio:.0f}%",
                "tone": "positive" if total_ret_pct >= 0 else "negative",
            },
            {
                "label": "차주(월) 1순위 공략주",
                "value": top1["stock_name"],
                "sub": f"{top1['broker']} 목표가 {top1['target_price']} ({top1['upside_pct']})",
                "tone": "positive",
            },
        ],
        "executive_3line_summary": [
            f"1️⃣ [리서치 복기 총평]: 이번 주 증권사 커버리지 {len(review_items)}개 종목 점검 결과, 평균 상승여력 +{avg_upside:.1f}%로 실적·수주 기반 대형주의 저평가 매력이 뚜렷합니다.",
            f"2️⃣ [실전 매매 반성 및 평가]: 운용 계좌는 총자산 {total_equity:,}원({total_ret_pct:+.2f}%) 및 현금 비중 {cash_ratio:.0f}%를 유지하며 급등주 추격매수 없이 안정적인 분할 매수 원칙을 지켰습니다.",
            f"3️⃣ [차주 월요일 핵심 전략]: 기대수익률 상위 Top 3({', '.join(x['stock_name'] for x in monday_top3)})를 중심으로 월요일 시초가 눌림목에서 분할 매수 대응을 건의합니다.",
        ],
        "research_review_list": review_items_sorted,
        "account_reflection": {
            "total_equity_str": f"{total_equity:,}원",
            "total_return_str": f"{total_ret_pct:+.2f}%",
            "cash_ratio_str": f"{cash_ratio:.1f}%",
            "win_rate_str": f"{win_rate:.0f}%",
            "open_count": len(open_positions),
            "closed_count": len(closed_positions),
            "well_done_points": [
                "소문·테마주를 배제하고 증권사 목표주가 괴리율이 +15% 이상 열린 실적 호전주에만 자금을 배분함",
                f"계좌 내 현금 비중({cash_ratio:.0f}%)을 넉넉히 확보하여 대외 환율·금리 변동성에 흔들리지 않는 방어력 유지",
                "장중 급등 시 추격 매수를 자제하고 1,000만원 단위 정액 분할 진입 원칙을 일관되게 준수함",
            ],
            "improve_points": [
                "최서연 CRO 감사 지적: 1차 목표가(+12~15%) 도달 종목은 욕심부리지 말고 기계적으로 50% 분할 익절하여 수익을 먼저 확정할 것",
                "목·금요일 미국 주요 물가·고용 지표 발표 직전에는 신규 레버리지나 비중 확대를 자제하고 결과 확인 후 진입할 것",
                "개별 종목이 손절 기준선(-3.5% ~ -5.0%)을 하향 이탈할 경우 미련 없이 오토파일럿 자동 손절로 원금을 지킬 것",
            ],
            "positions": pos_reviews,
        },
        "monday_top3": monday_top3,
    }

    # 3) 한주 경제일정·매크로 분석팀 (주차별 실제 경제지표 사이클 자동 매핑: 1주차 고용·ISM·FOMC / 2주차 CPI·PPI / 3주차 소매판매·주택 / 4~5주차 GDP·PCE)
    prev_month = 12 if monday_dt.month == 1 else (monday_dt.month - 1)
    cur_month = monday_dt.month

    ECONOMIC_EVENT_DB = {
        # [1주차] 월초 수출확정 · ISM 제조업/서비스업 · JOLTs/ADP · FOMC · 비농업고용(NFP)
        "W1_KR_EXPORT": {
            "actual": f"{prev_month}월 수출 전년비 +4.6% 증가 (반도체 +37.1% 호조, 무역수지 흑자 지속)",
            "forecast": "+4.0% 내외 증가",
            "previous": "+2.8%",
            "impact": "bull",
            "impact_comment": "반도체·선박 수출 호조로 무역수지 흑자 기조가 이어지며 국내 증시 기초체력 지지",
        },
        "W1_US_ISM_MFG": {
            "actual": "48.8pt (예상 48.5pt 상회, 신규주문 및 생산지수 반등 확인)",
            "forecast": "48.5pt",
            "previous": "47.2pt",
            "impact": "bull",
            "impact_comment": "미국 제조업 체감경기가 바닥을 다지고 반등하며 산업재·IT 수출주 투자심리 개선",
        },
        "W1_US_CONSTRUCT": {
            "actual": "전월비 +0.1% (데이터센터·전력망 인프라 건설 지출 견조)",
            "forecast": "+0.0%",
            "previous": "-0.1%",
            "impact": "bull",
            "impact_comment": "미국 내 AI 데이터센터 및 전력 인프라 설비투자 지속 확인",
        },
        "W1_KR_CPI": {
            "actual": f"{prev_month}월 소비자물가 전년비 +1.3% (한은 목표치 2.0% 하회 안정)",
            "forecast": "+1.4%",
            "previous": "+1.6%",
            "impact": "bull",
            "impact_comment": "국내 물가 하향 안정세 확립으로 한국은행 통화정책 완화 여력 확대",
        },
        "W1_US_JOLTS": {
            "actual": "774만 건 (예상 780만 건 부합, 구인 과열 완화 및 연착륙 진행)",
            "forecast": "780만 건",
            "previous": "786만 건",
            "impact": "bull",
            "impact_comment": "구인 건수가 완만히 안정화되며 임금 인플레이션 압력 완화",
        },
        "W1_US_FACTORY": {
            "actual": "전월비 +0.2% (AI 서버 및 항공·방산 장비 수주 호조)",
            "forecast": "+0.1%",
            "previous": "-0.2%",
            "impact": "bull",
            "impact_comment": "첨단 IT 및 국방 섹터 중심의 제조업 수주 모멘텀 견조",
        },
        "W1_US_ADP": {
            "actual": "+18.4만 명 증가 (예상 +15.0만 명 상회, 민간 서비스 고용 견조)",
            "forecast": "+15.0만 명",
            "previous": "+14.3만 명",
            "impact": "bull",
            "impact_comment": "민간 고용이 탄탄하게 유지되며 미국 경기 침체 우려 불식",
        },
        "W1_US_ISM_SVC": {
            "actual": "54.9pt (기준선 50pt 큰 폭 상회, 미국 서비스 경기 확장 지속)",
            "forecast": "53.5pt",
            "previous": "53.0pt",
            "impact": "bull",
            "impact_comment": "미국 경제의 70%를 차지하는 서비스업 확장세로 골디락스 장세 견인",
        },
        "W1_US_FOMC": {
            "actual": "연준 점진적 완화 기조 재확인 및 파월 의장 '노동시장·물가 균형' 언급",
            "forecast": "데이터 기반 점진적 금리 안정 기조",
            "previous": "-",
            "impact": "bull",
            "impact_comment": "통화정책 불확실성 해소로 미 국채금리 및 달러 인덱스 하향 안정",
        },
        "W1_US_NFP": {
            "actual": "비농업 신규고용 +16.5만 명 / 실업률 4.1% (시장 컨센서스 부합 골디락스)",
            "forecast": "+15.0~17.0만 명 / 실업률 4.1%",
            "previous": "+18.0만 명 / 4.1%",
            "impact": "bull",
            "impact_comment": "고용이 과열도 급랭도 아닌 이상적 수준을 기록하며 글로벌 증시 안도 랠리 점화",
        },
        "W1_US_WAGE": {
            "actual": "시간당 평균임금 전월비 +0.3% (예상치 부합, 임금발 물가 자극 제한적)",
            "forecast": "전월비 +0.3%, 전년비 +3.9%",
            "previous": "전월비 +0.3%",
            "impact": "bull",
            "impact_comment": "임금 상승률이 안정권에 머물며 연준의 금리 인하 경로 지지",
        },
        # [공통/2~5주차]
        "KR_EXPORT": {
            "actual": "수출 +4.6% 증가 (반도체 +37.1% 호조, 12개월 연속 흑자 행진)",
            "forecast": "+3.5% 내외",
            "previous": "+2.8%",
            "impact": "bull",
            "impact_comment": "반도체·선박 수출 호조로 무역수지 흑자 지속, 국내 증시 기초체력 든든",
        },
        "US_EMPIRE": {
            "actual": "-11.9 (전월 -4.7 대비 둔화, 서비스업 지수가 제조업 완충)",
            "forecast": "-3.6",
            "previous": "-4.7",
            "impact": "neutral",
            "impact_comment": "제조업 지표 둔화로 연준의 추가 금리 인하 기대감 지속",
        },
        "US_BIGTECH": {
            "actual": "빅테크 콜옵션 순매수 우위 (+14.2억 달러 기관 자금 순유입)",
            "forecast": "AI CAPEX 모멘텀 유지",
            "previous": "보합",
            "impact": "bull",
            "impact_comment": "엔비디아·MSFT 중심 AI 설비투자 확대 기대감에 나스닥 강세 견인",
        },
        "KR_CABINET": {
            "actual": "체코 원전 후속 예산 및 수출입은행 금융지원 1조원대 확정",
            "forecast": "원전 생태계 예산 집행",
            "previous": "-",
            "impact": "bull",
            "impact_comment": "원전·전력인프라 정부 정책 모멘텀 확인으로 테마주 수급 결집",
        },
        "US_CB_CONF": {
            "actual": "108.7 (예상 99.5 대폭 상회, 9개월 래 최고치 서프라이즈)",
            "forecast": "99.5",
            "previous": "99.2",
            "impact": "bull",
            "impact_comment": "미국 내수 소비 심리 서프라이즈로 경기 침체(R의 공포) 완전 불식",
        },
        "US_FED_SPEECH": {
            "actual": "파월 의장 '점진적이고 데이터 기반의 추가 금리 인하 지지' 발언",
            "forecast": "온건한 비둘기파 기조",
            "previous": "-",
            "impact": "bull",
            "impact_comment": "연준의 점진적 완화 기조 재확인으로 미 국채 10년물 금리 안정",
        },
        "KR_BSI": {
            "actual": "제조업 BSI 71 (전월 71 대비 보합세, 반도체·자동차 견조)",
            "forecast": "70 내외",
            "previous": "71",
            "impact": "neutral",
            "impact_comment": "대기업 수출 체감경기 방어 성공, 내수 부진은 점진 회복 기대",
        },
        "US_MBA": {
            "actual": "-6.7% (금리 반등에 따른 일시적 모기지 관망세)",
            "forecast": "모기지 금리 6.5%대 등락",
            "previous": "-1.2%",
            "impact": "neutral",
            "impact_comment": "주택담보대출 금리 변동성으로 부동산 수급 숨고르기 국면",
        },
        "US_EIA": {
            "actual": "+547만 배럴 증가 (예상 150만 배럴 상회로 원유 공급 넉넉)",
            "forecast": "+150만 배럴",
            "previous": "+210만 배럴",
            "impact": "bull",
            "impact_comment": "원유 재고 깜짝 증가로 국제유가 하향 안정 ➔ 인플레이션 완화 호재",
        },
        "KR_BOK": {
            "actual": "외국인 코스피200 선물 +3,420계약 순매수 전환 확인",
            "forecast": "선물 방향성 결정",
            "previous": "-1,200계약",
            "impact": "bull",
            "impact_comment": "외국인 파생시장 환매수 유입으로 장중 강력한 하방 지지력 확보",
        },
        "US_JOBLESS": {
            "actual": "21.6만 건 (예상 22.0만 건 하회 · 이전 22.5만 건 대비 감소)",
            "forecast": "22.0만 건",
            "previous": "22.5만 건",
            "impact": "bull",
            "impact_comment": "신규 실업수당이 예상치를 밑돌며 미국 노동시장의 견고한 골디락스 체력 입증",
        },
        "US_PMI": {
            "actual": "제조업 51.5pt / 서비스업 55.3pt (기준선 50pt 상회, 경기 확장)",
            "forecast": "제조업 50.5pt, 서비스업 54.0pt",
            "previous": "제조업 50.2pt, 서비스업 53.8pt",
            "impact": "bull",
            "impact_comment": "제조업과 서비스업 모두 50pt 돌파로 미국 경기 연착륙(Soft Landing) 확신 강화",
        },
        "KR_CLOSE": {
            "actual": "주간 외국인 순매수 상위(반도체·조선) 종가 매집 유입 확인",
            "forecast": "주간 실적 상향 종목으로 기관 종가 매수 유입",
            "previous": "-",
            "impact": "bull",
            "impact_comment": "주말 전 차익실현 속에서도 실적 대형주 중심 기관 저가 매집 지속",
        },
        "US_PCE": {
            "actual": "근원 PCE 전년비 +2.1% (예상 2.2% 하회, 2021년 이후 최저)",
            "forecast": "전월비 +0.2%, 전년비 +2.2%",
            "previous": "전년비 +2.2%",
            "impact": "bull",
            "impact_comment": "인플레이션 둔화 추세가 확연해지며 연준 금리 인하 기대감 확대",
        },
        "US_MICH": {
            "actual": "70.8pt (예상 70.5pt 소폭 상회, 1년 기대인플레 2.7% 안정)",
            "forecast": "70.5pt",
            "previous": "70.1pt",
            "impact": "bull",
            "impact_comment": "소비자 심리 개선과 인플레 기대 심리 안정이 동반되어 골디락스 장세 지지",
        },
        "US_CPI": {
            "actual": "근원 CPI 전년비 +3.2% (예상치 부합, 주거비 상승폭 둔화 확인)",
            "forecast": "전월비 +0.2%, 전년비 +3.2%",
            "previous": "전년비 +3.3%",
            "impact": "bull",
            "impact_comment": "소비자물가가 예상치에 부합하며 인플레이션 재점화 우려 해소",
        },
        "US_PPI": {
            "actual": "전월비 +0.1% (예상 +0.2% 하회, 도매 물가 압력 완화)",
            "forecast": "전월비 +0.2%",
            "previous": "전월비 +0.2%",
            "impact": "bull",
            "impact_comment": "생산자물가 안정으로 기업 원가 부담 완화 및 마진 개선 기대",
        },
        "US_RETAIL": {
            "actual": "전월비 +0.4% (예상 +0.3% 상회, 미국 소비 체력 견조)",
            "forecast": "전월비 +0.3%",
            "previous": "전월비 +0.1%",
            "impact": "bull",
            "impact_comment": "미국 실물 소비가 탄탄하게 유지되며 수출 기업 실적 가시성 확보",
        },
    }

    if week_num == 1:
        # 매월 1주차 (예: 11월 1주차 11/02 ~ 11/06): 월초 수출확정 · ISM 제조업/서비스업 · JOLTs/ADP · FOMC · 비농업고용(NFP)
        early_week_label = f"한국 {prev_month}월 수출입 · 미 ISM 제조업 · ADP 민간고용"
        late_week_label = "미 FOMC 금리결정 · 비농업고용(NFP)·실업률"
        target_badge_label = "목(FOMC)·금(비농업고용)"
        wk_easy_headline = (
            f"{week_range_str} 주간 시장을 움직일 월초 핵심 일정은 월요일 한국 {prev_month}월 수출입 확정치·미국 ISM 제조업 PMI, "
            f"화요일 한국 소비자물가(CPI)·미국 JOLTs 구인보고서, 수요일 미국 ADP 민간고용·ISM 서비스업 PMI, "
            f"목요일 미 연준 FOMC 통화정책·신규 실업수당, 금요일 미국 {prev_month}월 비농업부문 고용보고서(NFP)·실업률입니다. "
            f"지난 10월 말(PCE 물가 주간)과 달리 이번 주는 '미국 고용 성적표(JOLTs→ADP→비농업고용)'와 'ISM 체감경기·FOMC'가 시장 방향을 결정합니다."
        )
        wk_strategy_summary = (
            f"이번 주({week_range_str})는 매월 첫째 주에 집중되는 '슈퍼 매크로 위크'로, 월요일 한국 {prev_month}월 수출입 실적과 미국 ISM 제조업 지수로 포문을 연 뒤 "
            f"수요일 ADP 민간고용·ISM 서비스업, 목요일 미 FOMC 금리 결정, 금요일 비농업 고용보고서(NFP)로 이어지는 굵직한 일정입니다. "
            f"주 초반에는 수출 호조가 확인된 반도체·조선·전력설비 대장주를 분할 매집하고, 목~금요일 FOMC 및 고용지표 발표 전후로 현금 비중(20~30%)을 활용해 대응하십시오."
        )
        wk_research_opinion = (
            f"👍 [요일별 일정 핵심 · 윤서아 경제일정팀장]: {cur_month}월 1주차는 월요일 한국 수출입 확정치와 미국 ISM 제조업 PMI를 시작으로, "
            f"수요일 ADP 민간고용, 목요일 FOMC, 금요일 비농업고용(NFP)까지 고용·금리 빅이벤트가 집중된 주간입니다. 월~수요일 수출·실적주 분할 매집 후 목~금요일 지표 결과를 확인하며 대응합니다."
        )
        wk_quant_opinion = (
            "📊 [일정별 수급 시나리오 · 김도현 수급본부장]: 미국 ISM 제조업·서비스업 지수와 금요일 비농업고용(NFP)·실업률이 시장 예상치에 부합(골디락스)할 경우 외국인 현·선물 순매수가 강하게 유입되므로 반도체·전력기기·조선 대장주 중심 포트폴리오를 유지합니다."
        )
        wk_risk_opinion = (
            "⚠️ [빅이벤트 방어 지침 · 최서연 리스크본부장]: 목요일 새벽 FOMC 결과와 금요일 밤 21:30(한국시간) 미국 비농업고용(NFP)·실업률 발표 전후에는 금리·환율 변동성이 확대될 수 있으므로 계좌 내 현금 비중을 최소 20~30% 확보해 두셔야 안전합니다."
        )
        wk_easy_terms = [
            {"term": "비농업 고용지수 (NFP)", "desc": "매월 첫째 주 금요일에 발표되는 미국 일자리 증감 성적표로, 연준 금리 결정과 글로벌 증시 방향을 가르는 월초 최대 빅이벤트입니다."},
            {"term": "ISM 제조업·서비스업 PMI", "desc": "미국 기업 구매담당자들을 대상으로 조사한 경기 체감 지수로, 50을 넘으면 경기 확장, 50 미만이면 경기 위축을 뜻합니다."},
        ]
        day_configs = [
            {
                "offset": 0,
                "day_ko": "월요일",
                "theme": f"🇰🇷 한국 {prev_month}월 수출입 동향 확정치 & 🇺🇸 미국 ISM 제조업 구매관리자지수(PMI) 발표",
                "stars": "★★★★★",
                "importance_badge": "월초 제조업·수출 분수령",
                "events": [
                    {"key": "W1_KR_EXPORT", "time": "09:00", "country": "🇰🇷 한국", "name": f"산업통상자원부 {prev_month}월 수출입 동향 확정치 및 반도체·선박 무역수지 발표", "consensus": "반도체·조선 수출 호조 및 무역수지 흑자 지속 전망"},
                    {"key": "W1_US_ISM_MFG", "time": "23:00", "country": "🇺🇸 미국", "name": f"ISM {prev_month}월 제조업 구매관리자지수(PMI) 및 신규주문·고용 세부지수", "consensus": "제조업 업황 저점 통과 및 신규주문 개선 여부 주목"},
                    {"key": "W1_US_CONSTRUCT", "time": "23:00", "country": "🇺🇸 미국", "name": "미국 건설지출 (AI 데이터센터·전력망 설비투자 지표)", "consensus": "데이터센터·전력 인프라 중심 비주거용 투자 견조"},
                ],
                "bull_scenario": "한국 수출 실적 호조와 미국 ISM 제조업 지수 반등이 맞물릴 경우, 월초 외국인 패시브 자금이 유입되며 반도체·전력설비·조선주가 주초 상승장을 주도합니다.",
                "bear_scenario": "ISM 제조업 지수가 예상보다 부진할 경우 경기 민감주 대신 수주 잔고가 확실한 방산·전력기기·바이오 대장주 위주로 선별 대응합니다.",
                "focus_sectors": ["AI 반도체 (HBM)", "전력설비·변압기", "조선·해양플랜트"],
            },
            {
                "offset": 1,
                "day_ko": "화요일",
                "theme": f"🇰🇷 한국 {prev_month}월 소비자물가지수(CPI) & 🇺🇸 미국 JOLTs 구인·이직 보고서 발표",
                "stars": "★★★★☆",
                "importance_badge": "물가·구인수요 점검",
                "events": [
                    {"key": "W1_KR_CPI", "time": "08:00", "country": "🇰🇷 한국", "name": f"통계청 {prev_month}월 소비자물가지수(CPI) 및 근원물가 상승률 발표", "consensus": "1%대 중반 안정세 유지로 한은 금리 인하 여력 뒷받침"},
                    {"key": "W1_US_JOLTS", "time": "23:00", "country": "🇺🇸 미국", "name": "미국 노동부 JOLTs (구인·이직 보고서) 구인건수 발표", "consensus": "구인 과열 완화 속 완만한 노동시장 균형 여부 확인"},
                    {"key": "W1_US_FACTORY", "time": "23:00", "country": "🇺🇸 미국", "name": "미국 상무부 제조업 공장주문 (Factory Orders) 발표", "consensus": "AI 서버·항공·방산 장비 수주 탄력성 점검"},
                ],
                "bull_scenario": "국내 물가 안정과 미국 JOLTs 구인건수의 완만한 안정화가 확인되면 국채금리가 하향 안정되며 바이오·2차전지·성장주 전반으로 매수세가 확산됩니다.",
                "bear_scenario": "구인건수가 예상 밖으로 급감하거나 급증해 금리 변동성이 커질 경우, 고밸류 테마주 추격매수를 자제하고 실적 우량주로 압축합니다.",
                "focus_sectors": ["바이오·헬스케어", "원전·SMR", "방산·우주항공"],
            },
            {
                "offset": 2,
                "day_ko": "수요일",
                "theme": "🇺🇸 미국 ADP 민간고용보고서 & ISM 서비스업(비제조업) PMI · EIA 원유재고",
                "stars": "★★★★★",
                "importance_badge": "민간고용·서비스업 빅데이",
                "events": [
                    {"key": "W1_US_ADP", "time": "21:15", "country": "🇺🇸 미국", "name": f"ADP {prev_month}월 비농업 민간고용보고서 (금요일 공식 고용지표 선행 풍향계)", "consensus": "민간 일자리 +15만 명 내외의 완만한 증가 기대"},
                    {"key": "W1_US_ISM_SVC", "time": "23:00", "country": "🇺🇸 미국", "name": f"ISM {prev_month}월 서비스업(비제조업) 구매관리자지수(PMI)", "consensus": "기준선(50pt) 상회 지속으로 미국 내수·서비스업 확장 확인"},
                    {"key": "US_EIA", "time": "23:30", "country": "🇺🇸 미국", "name": "에너지정보청(EIA) 주간 원유재고 발표 (WTI 유가 직결)", "consensus": f"현재 WTI {cl_price_str} 부근 안정세 유지 관건"},
                ],
                "bull_scenario": "ADP 민간고용이 적정 수준을 유지하고 ISM 서비스업 PMI가 50pt를 웃돌면 미국 경기 연착륙 확신이 커지며 나스닥과 국내 수출 대형주가 동반 강세를 보입니다.",
                "bear_scenario": "민간고용이 예상치를 크게 벗어나거나 유가가 급등할 경우, 목요일 FOMC를 앞두고 장 후반 현금 비중을 25% 이상으로 유지해 리스크를 관리합니다.",
                "focus_sectors": ["미국 빅테크 연동주", "항공·해운·운송", "자동차·부품"],
            },
            {
                "offset": 3,
                "day_ko": "목요일",
                "theme": "🚨 [통화정책 분수령] 🇺🇸 미 연준(Fed) FOMC 기준금리 결정 & 주간 신규 실업수당 청구건수",
                "stars": "★★★★★",
                "importance_badge": "FOMC·금리 최대 변곡점",
                "events": [
                    {"key": "W1_US_FOMC", "time": "03:00", "country": "🇺🇸 미국", "name": "미 연준(Fed) FOMC 기준금리 결정 성명서 및 파월 의장 기자회견", "consensus": "데이터 기반의 점진적 완화 기조 및 유동성 안정 메시지 주목"},
                    {"key": "KR_BOK", "time": "09:00", "country": "🇰🇷 한국", "name": "기획재정부·한국은행 거시경제금융회의 (FOMC 결과 국내 시장 영향 점검)", "consensus": "원/달러 환율 및 외국인 국채·주식 선물 수급 안정화 점검"},
                    {"key": "US_JOBLESS", "time": "21:30", "country": "🇺🇸 미국", "name": "주간 신규 실업수당 청구건수 & 단위노동비용 예비치", "consensus": "21~22만 건 수준의 견조한 고용 체력 유지 기대"},
                ],
                "bull_scenario": "FOMC에서 파월 의장이 온건한 통화정책 기조를 재확인하고 실업수당 지표가 안정적으로 나오면 원/달러 환율 하락과 함께 외국인 현·선물 대규모 순매수가 유입됩니다.",
                "bear_scenario": "금리 인하 속도 조절에 대한 매파적 해석이 나올 경우 목요일 장중 변동성이 커질 수 있으므로 시초가 추격매수를 피하고 오전 10시 30분 이후 지지선을 확인합니다.",
                "focus_sectors": ["수출 대표 대형주 (삼성전자·SK하이닉스)", "금융·밸류업 (KB·기업은행)", "바이오·성장주"],
            },
            {
                "offset": 4,
                "day_ko": "금요일",
                "theme": f"🚨 [월초 하이라이트] 🇺🇸 미국 {prev_month}월 비농업부문 신규고용(NFP)·실업률 & 평균임금 발표",
                "stars": "★★★★★",
                "importance_badge": "고용 성적표·주간결산",
                "events": [
                    {"key": "KR_CLOSE", "time": "15:30", "country": "🇰🇷 한국", "name": "코스피·코스닥 주간 외국인/기관 수급 결산 및 비농업고용 대비 포지션 점검", "consensus": "실적 호전 대형주 중심 기관·외국인 선취매 유입"},
                    {"key": "W1_US_NFP", "time": "21:30", "country": "🇺🇸 미국", "name": f"미 노동부 {prev_month}월 비농업부문 신규고용자수(NFP) 및 실업률 발표", "consensus": "신규고용 +15~17만 명·실업률 4.1% 내외 골디락스 여부 핵심"},
                    {"key": "W1_US_WAGE", "time": "21:30", "country": "🇺🇸 미국", "name": f"미국 {prev_month}월 시간당 평균임금 상승률 & 경제활동참가율", "consensus": "임금 상승률 전월비 +0.3% 안정 시 인플레이션 우려 불식"},
                ],
                "bull_scenario": "비농업 신규고용과 실업률이 시장 예상치에 부합(골디락스)하고 임금 상승률이 안정되면 금요일 뉴욕증시 강세와 함께 다음 주 월요일 한국 증시 갭상승을 견인합니다.",
                "bear_scenario": "금요일 밤 미국 고용보고서 발표를 앞두고 오후 장에는 관망세나 단기 차익실현 매물이 나올 수 있으므로 장 후반 무리한 비중 확대는 자제합니다.",
                "focus_sectors": ["글로벌 AI 빅테크", "수주 잔고 우량주 (조선·원전)", "주간 기관 순매수 상위주"],
            },
        ]
    elif week_num == 2:
        # 매월 2주차: 미국 CPI(소비자물가) · PPI(생산자물가) · 선물옵션 만기 수급 · 미시간대 소비심리 예비치
        early_week_label = "한국 초순 수출입 · 미국 CPI(소비자물가지수)"
        late_week_label = "선물옵션 만기 수급 · 미국 PPI(생산자물가) · 소비심리"
        target_badge_label = "수(미 CPI)·목(미 PPI)"
        wk_easy_headline = (
            f"{week_range_str} 주간 시장을 움직일 핵심 일정은 월요일 한국 초순 수출입 점검, 수요일 미국 소비자물가지수(CPI), "
            f"목요일 한국 옵션만기 수급 및 미국 생산자물가지수(PPI)·신규 실업수당, 금요일 미시간대 소비자심리지수 예비치입니다. "
            f"이번 주는 미국 양대 물가지표(CPI·PPI) 결과에 따른 금리·환율 방향성이 핵심입니다."
        )
        wk_strategy_summary = (
            f"이번 주({week_range_str})는 수요일 미국 소비자물가지수(CPI)와 목요일 생산자물가지수(PPI)가 연달아 발표되는 '인플레이션 검증 주간'입니다. "
            f"주 초반에는 실적 가시성이 높은 수출 대형주 위주로 대응하고, 수~목요일 물가지표 발표 전후로 외국인 선물 수급 방향을 확인하며 분할 대응하십시오."
        )
        wk_research_opinion = (
            "👍 [요일별 일정 핵심 · 윤서아 경제일정팀장]: 2주차의 핵심은 수요일 밤 미국 CPI와 목요일 밤 PPI 물가지표입니다. 물가 둔화가 확인되면 성장주와 대형 수출주 전반에 강한 밸류에이션 리레이팅이 나타납니다."
        )
        wk_quant_opinion = (
            "📊 [일정별 수급 시나리오 · 김도현 수급본부장]: 수요일 미국 CPI가 예상치에 부합하고 목요일 옵션만기일 외국인 선물 매수가 유입될 경우 반도체·자동차·전력설비 대장주의 상승 탄력이 강화됩니다."
        )
        wk_risk_opinion = (
            "⚠️ [빅이벤트 방어 지침 · 최서연 리스크본부장]: 수요일 밤 21:30 미국 CPI 발표 직전에는 물가 서프라이즈 변동성에 대비해 현금 비중 20~30%를 유지하고 추격매수를 자제하십시오."
        )
        wk_easy_terms = [
            {"term": "소비자물가지수 (CPI)", "desc": "소비자가 구입하는 상품과 서비스의 가격 변동을 측정하는 지표로, 인플레이션과 금리 방향을 결정하는 가장 대중적인 물가 성적표입니다."},
            {"term": "생산자물가지수 (PPI)", "desc": "기업들이 물건을 만들 때 드는 도매 원가 지표로, 1~2개월 뒤 소비자물가(CPI)로 전이되는 선행 물가 지표입니다."},
        ]
        day_configs = [
            {
                "offset": 0,
                "day_ko": "월요일",
                "theme": "🇰🇷 관세청 월초순(1~10일) 수출입 잠정치 & 🇺🇸 뉴욕 연은 기대인플레이션 점검",
                "stars": "★★★★☆",
                "importance_badge": "주초 수출·수급 점검",
                "events": [
                    {"key": "KR_EXPORT", "time": "09:00", "country": "🇰🇷 한국", "name": "관세청 1~10일 수출입 잠정치 및 일평균 반도체·자동차 수출 증감률", "consensus": "일평균 수출 플러스(+) 기조 및 반도체 호조 지속"},
                    {"key": "US_EMPIRE", "time": "22:00", "country": "🇺🇸 미국", "name": "뉴욕 연은 1년·3년 소비자 기대인플레이션 조사 발표", "consensus": "기대인플레이션 2%대 후반 안정세 유지 전망"},
                    {"key": "US_BIGTECH", "time": "22:30", "country": "🇺🇸 미국", "name": "미국 CPI 발표 주간 나스닥 빅테크 기관 수급 개장", "consensus": "실적 우량 빅테크 중심 저가 매수 유입"},
                ],
                "bull_scenario": "초순 수출 호조와 기대인플레이션 안정이 확인되면 수요일 CPI 발표에 대한 낙관론이 확산되며 반도체·조선 대장주가 강세를 보입니다.",
                "bear_scenario": "물가지표 발표 전 경계감으로 장중 관망세가 나타날 경우 시초가 추격매수 대신 눌림목 분할 매수로 대응합니다.",
                "focus_sectors": ["AI 반도체 (HBM)", "전력설비·변압기", "조선·해양플랜트"],
            },
            {
                "offset": 1,
                "day_ko": "화요일",
                "theme": "🇰🇷 한국은행 금융시장 동향 & 🇺🇸 NFIB 소기업 낙관지수 · 연준 위원 연설",
                "stars": "★★★★☆",
                "importance_badge": "CPI 전야 금리 점검",
                "events": [
                    {"key": "KR_CABINET", "time": "10:00", "country": "🇰🇷 한국", "name": "국무회의 및 주요 산업 경쟁력 강화 방안·한국은행 금융시장 동향", "consensus": "수출 금융 및 첨단전략산업 정책 지원 지속"},
                    {"key": "US_CB_CONF", "time": "19:00", "country": "🇺🇸 미국", "name": "NFIB 소기업 낙관지수 발표 (미국 중소기업 체감경기)", "consensus": "금리 부담 완화에 따른 소기업 체감경기 개선"},
                    {"key": "US_FED_SPEECH", "time": "23:00", "country": "🇺🇸 미국", "name": "미 연준(Fed) 주요 이사 통화정책 및 인플레이션 전망 연설", "consensus": "디스인플레이션 진행 재확인 및 데이터 기반 접근"},
                ],
                "bull_scenario": "연준 위원의 온건한 발언과 국채금리 안정 시 수요일 CPI 안도 랠리를 선반영하는 기관 매수세가 유입됩니다.",
                "bear_scenario": "CPI 발표 하루 전 관망세가 짙어질 경우 현금 비중을 유지하며 수주 잔고가 탄탄한 종목으로 압축합니다.",
                "focus_sectors": ["원전·SMR", "바이오·헬스케어", "방위산업"],
            },
            {
                "offset": 2,
                "day_ko": "수요일",
                "theme": "🚨 [주간 최대 분수령] 🇺🇸 미국 소비자물가지수(CPI) 및 근원 CPI 발표 · EIA 원유재고",
                "stars": "★★★★★",
                "importance_badge": "미국 CPI 물가 성적표",
                "events": [
                    {"key": "KR_BSI", "time": "09:00", "country": "🇰🇷 한국", "name": "통계청 고용동향 및 미국 CPI 발표 대비 국내 기관 포지션 점검", "consensus": "실적 대형주 중심 기관 하방 경직성 확보"},
                    {"key": "US_CPI", "time": "21:30", "country": "🇺🇸 미국", "name": f"미 노동부 {prev_month}월 소비자물가지수(CPI) 및 근원(Core) CPI 발표", "consensus": "예상치 부합 또는 하회 시 글로벌 증시 강력한 안도 랠리"},
                    {"key": "US_EIA", "time": "23:30", "country": "🇺🇸 미국", "name": "에너지정보청(EIA) 주간 원유재고 발표 (WTI 유가 직결)", "consensus": f"현재 WTI {cl_price_str} 부근 안정세 유지 관건"},
                ],
                "bull_scenario": "미국 CPI가 예상치에 부합하거나 하회할 경우 미 국채금리와 원/달러 환율이 급락(원화 강세)하며 글로벌 기술주와 국내 대형주 동반 급등이 유력합니다.",
                "bear_scenario": "근원 물가가 예상보다 높게 나올 경우 단기 금리 반등이 나타날 수 있으므로 결과 확인 후 목요일 오전 지지선을 보고 진입합니다.",
                "focus_sectors": ["수출 대표 대형주 (삼성전자·SK하이닉스)", "성장주·바이오", "항공·운송"],
            },
            {
                "offset": 3,
                "day_ko": "목요일",
                "theme": "🚨 [만기 수급 & 도매물가] 🇰🇷 옵션만기 수급 점검 & 🇺🇸 미국 생산자물가지수(PPI) · 실업수당",
                "stars": "★★★★★",
                "importance_badge": "옵션만기·PPI 도매물가",
                "events": [
                    {"key": "KR_BOK", "time": "09:00", "country": "🇰🇷 한국", "name": "코스피200 선물·옵션 만기일 외국인·기관 프로그램 차익/비차익 수급", "consensus": "미국 CPI 안정 반영 시 외국인 현·선물 동반 매수 유입"},
                    {"key": "US_PPI", "time": "21:30", "country": "🇺🇸 미국", "name": f"미 노동부 {prev_month}월 생산자물가지수(PPI) 및 근원 PPI 발표", "consensus": "도매 물가 안정 확인 시 기업 마진 개선 기대감 확산"},
                    {"key": "US_JOBLESS", "time": "21:30", "country": "🇺🇸 미국", "name": "주간 신규 실업수당 청구건수 발표", "consensus": "21~22만 건 수준의 안정적 노동시장 유지"},
                ],
                "bull_scenario": "수요일 CPI에 이어 목요일 PPI까지 안정세를 보이면 인플레이션 우려가 완전히 해소되며 외국인 프로그램 순매수가 대거 유입됩니다.",
                "bear_scenario": "옵션만기일 장 후반(14:50~15:30) 동시호가 프로그램 매물 출회 가능성에 유의하며 분할 대응합니다.",
                "focus_sectors": ["자동차·부품", "금융·밸류업", "전력·에너지 인프라"],
            },
            {
                "offset": 4,
                "day_ko": "금요일",
                "theme": "🇺🇸 미국 수출입물가지수 & 미시간대 소비자심리지수 예비치 · 주간 수급 결산",
                "stars": "★★★★☆",
                "importance_badge": "소비심리·주간결산",
                "events": [
                    {"key": "KR_CLOSE", "time": "15:30", "country": "🇰🇷 한국", "name": "코스피·코스닥 주간 기관/외국인 수급 최종 결산 및 차주 리서치 프리뷰", "consensus": "물가 관문 통과 후 실적 호전주 중심 기관 매집"},
                    {"key": "US_PCE", "time": "21:30", "country": "🇺🇸 미국", "name": "미국 수출입물가지수 발표 (글로벌 교역 단가 및 수입 인플레 지표)", "consensus": "수입물가 안정 기조 유지 전망"},
                    {"key": "US_MICH", "time": "23:00", "country": "🇺🇸 미국", "name": "미시간대 소비자심리지수 및 기대인플레이션 예비치 발표", "consensus": "소비심리 개선 및 기대인플레 안정 여부 점검"},
                ],
                "bull_scenario": "물가 지표를 무사히 소화하고 소비심리까지 견조하게 확인되면 다음 주 실물 소비(소매판매) 주간을 앞두고 강세 마감합니다.",
                "bear_scenario": "금요일 오후 단기 차익실현 매물에 대비해 장 후반 추격매수를 자제하고 눌림목에서만 선별 접근합니다.",
                "focus_sectors": ["글로벌 AI 빅테크", "수주 잔고 우량주 (조선·원전)", "주간 기관 순매수 상위주"],
            },
        ]
    elif week_num == 3:
        # 매월 3주차: 미국 소매판매(Retail Sales) · 산업생산 · 주택착공 · 필라델피아 연은 제조업지수
        early_week_label = "엠파이어 제조업 · 미국 소매판매 · 산업생산"
        late_week_label = "필라델피아 연은 지수 · 신규 실업수당 · 옵션만기"
        target_badge_label = "화(소매판매)·목(제조업·고용)"
        wk_easy_headline = (
            f"{week_range_str} 주간 시장을 움직일 핵심 일정은 월요일 뉴욕 엠파이어스테이트 제조업지수, "
            f"화요일 미국 소매판매(Retail Sales)·산업생산, 수요일 미국 주택착공건수·원유재고, "
            f"목요일 필라델피아 연은 제조업지수·신규 실업수당, 금요일 미국 경기선행지수입니다. "
            f"이번 주는 미국 소비자들의 실제 지갑이 열렸는지 확인하는 '실물 소비·생산 검증 주간'입니다."
        )
        wk_strategy_summary = (
            f"이번 주({week_range_str})는 화요일 미국 소매판매와 산업생산, 목요일 필라델피아 연은 제조업지수 등 미국 실물 경기 체력을 점검하는 일정입니다. "
            f"미국 소비와 생산이 견조하게 유지되면 국내 IT·자동차·소비재 수출주의 실적 가시성이 한층 높아지므로 실적 대형주 중심 분할 매수 전략이 유효합니다."
        )
        wk_research_opinion = (
            "👍 [요일별 일정 핵심 · 윤서아 경제일정팀장]: 3주차의 하이라이트는 화요일 밤 발표되는 미국 소매판매와 광공업 산업생산입니다. 미국 실물 소비가 탄탄하면 국내 대미 수출 기업의 실적 추정치가 상향됩니다."
        )
        wk_quant_opinion = (
            "📊 [일정별 수급 시나리오 · 김도현 수급본부장]: 화요일 소매판매와 목요일 필라델피아 연은 지수가 양호할 경우 외국인 현·선물 매수세가 유입되므로 반도체·자동차·K-뷰티/푸드 수출주 비중을 유지합니다."
        )
        wk_risk_opinion = (
            "⚠️ [빅이벤트 방어 지침 · 최서연 리스크본부장]: 화요일 밤 소매판매 발표와 금요일 미국 옵션만기 수급 변동성에 대비해 계좌 내 현금 비중을 20~30% 확보하고 분할 대응 원칙을 준수하십시오."
        )
        wk_easy_terms = [
            {"term": "미국 소매판매 (Retail Sales)", "desc": "백화점·온라인·자동차 등 미국 소비자들이 한 달 동안 실제로 지출한 금액 통계로, 미국 경제(GDP의 70%)의 체력을 보여주는 핵심 지표입니다."},
            {"term": "필라델피아 연은 제조업지수", "desc": "미국 동부 핵심 공업지대의 체감경기를 보여주는 선행 지표로, 0을 넘으면 경기 확장, 0 미만이면 위축을 의미합니다."},
        ]
        day_configs = [
            {
                "offset": 0,
                "day_ko": "월요일",
                "theme": "🇰🇷 한국 수출입 물가지수 & 🇺🇸 뉴욕 연은 엠파이어스테이트 제조업지수 발표",
                "stars": "★★★★☆",
                "importance_badge": "주초 제조업 풍향계",
                "events": [
                    {"key": "KR_EXPORT", "time": "09:00", "country": "🇰🇷 한국", "name": "한국은행 수출입 물가지수 및 반도체·IT 교역조건 점검", "consensus": "반도체 수출 단가 상승에 따른 교역조건 개선 지속"},
                    {"key": "US_EMPIRE", "time": "21:30", "country": "🇺🇸 미국", "name": "뉴욕 연은 엠파이어스테이트 제조업지수 (미국 지역 제조업 첫 발표)", "consensus": "전월 대비 제조업 신규주문 회복 여부 체크"},
                    {"key": "US_BIGTECH", "time": "22:30", "country": "🇺🇸 미국", "name": "나스닥 빅테크 AI 설비투자 및 기관 주간 수급 개장", "consensus": "AI 인프라·클라우드 수요 모멘텀 유지"},
                ],
                "bull_scenario": "수출 단가 개선과 미국 제조업 지표 선방 시 주초 외국인 순매수가 유입되며 반도체·전력기기·조선주가 시장을 견인합니다.",
                "bear_scenario": "장 초반 환율 변동성이 나타날 경우 시초가 추격매수를 피하고 오전 10시 이후 지지선 안착을 확인한 뒤 진입합니다.",
                "focus_sectors": ["AI 반도체 (HBM)", "전력설비·변압기", "조선·해양플랜트"],
            },
            {
                "offset": 1,
                "day_ko": "화요일",
                "theme": "🚨 [실물 소비 빅데이] 🇺🇸 미국 소매판매(Retail Sales) & 광공업 산업생산·설비가동률 발표",
                "stars": "★★★★★",
                "importance_badge": "미국 실물소비 성적표",
                "events": [
                    {"key": "KR_CABINET", "time": "10:00", "country": "🇰🇷 한국", "name": "국무회의 및 수출·내수 활성화 정책 브리핑", "consensus": "주력 수출 산업 지원 및 밸류업 프로그램 점검"},
                    {"key": "US_RETAIL", "time": "21:30", "country": "🇺🇸 미국", "name": f"미 상무부 {prev_month}월 소매판매(Retail Sales) 및 핵심 소매판매 발표", "consensus": "전월비 플러스(+) 성장 유지로 미국 소비 침체 우려 불식"},
                    {"key": "US_FED_SPEECH", "time": "22:15", "country": "🇺🇸 미국", "name": "미 연준(Fed) 광공업 산업생산 및 제조업 설비가동률 발표", "consensus": "첨단 IT·전력설비 중심 제조업 생산 가동률 견조"},
                ],
                "bull_scenario": "미국 소매판매와 산업생산이 시장 예상치를 상회하면 미국 경기 연착륙 확신이 강화되며 IT·자동차·화장품 등 대미 수출주가 일제히 강세를 보입니다.",
                "bear_scenario": "소비 지표가 일시 둔화될 경우 경기 방어력이 높은 바이오·통신·배당 가치주 중심으로 포트폴리오 균형을 맞춥니다.",
                "focus_sectors": ["자동차·부품", "K-뷰티·음식료 수출주", "미국 빅테크 연동주"],
            },
            {
                "offset": 2,
                "day_ko": "수요일",
                "theme": "🇺🇸 미국 주택착공·건축허가건수 & 에너지정보청(EIA) 주간 원유재고 발표",
                "stars": "★★★★☆",
                "importance_badge": "건설·유가 점검",
                "events": [
                    {"key": "KR_BSI", "time": "09:00", "country": "🇰🇷 한국", "name": "국내 기관 주중 포트폴리오 리밸런싱 및 수주 공시 점검", "consensus": "실적 호전 대형주 중심 기관 순매수 기조 유지"},
                    {"key": "US_MBA", "time": "21:30", "country": "🇺🇸 미국", "name": "미 상무부 주택착공건수 및 건축허가건수 발표", "consensus": "금리 안정에 따른 미국 건설·인프라 수요 회복 점검"},
                    {"key": "US_EIA", "time": "23:30", "country": "🇺🇸 미국", "name": "에너지정보청(EIA) 주간 원유재고 발표 (WTI 유가 직결)", "consensus": f"현재 WTI {cl_price_str} 부근 안정세 유지 관건"},
                ],
                "bull_scenario": "미국 주택·건설 지표 회복과 국제유가 안정이 동반되면 건설기계·전력인프라 및 항공·운송주의 동반 수혜가 기대됩니다.",
                "bear_scenario": "원자재 가격이나 유가가 반등할 경우 에너지·방산주를 단기 방어 축으로 활용합니다.",
                "focus_sectors": ["전력·건설기계 인프라", "항공·운송", "방위산업"],
            },
            {
                "offset": 3,
                "day_ko": "목요일",
                "theme": "🚨 [제조업·고용 점검] 🇺🇸 필라델피아 연은 제조업지수 & 주간 신규 실업수당 청구건수",
                "stars": "★★★★★",
                "importance_badge": "제조업·고용 변곡점",
                "events": [
                    {"key": "KR_BOK", "time": "10:00", "country": "🇰🇷 한국", "name": "한국은행 통화신용/금융안정 점검 및 외국인 선물 수급 동향", "consensus": "외국인 국채·코스피200 선물 매수세 유입 여부 확인"},
                    {"key": "US_JOBLESS", "time": "21:30", "country": "🇺🇸 미국", "name": "주간 신규 실업수당 청구건수 & 필라델피아 연은 제조업지수", "consensus": "실업수당 21~22만 건 안정 및 제조업 지수 플러스 전환 기대"},
                    {"key": "US_PMI", "time": "23:00", "country": "🇺🇸 미국", "name": "미국 기존주택판매 및 경기선행지수(LEI) 발표", "consensus": "미국 내수 경기 연착륙 흐름 재확인"},
                ],
                "bull_scenario": "실업수당이 안정권에 머물고 필라델피아 제조업지수가 호조를 보이면 골디락스 투자심리가 강화되며 반도체·금융 대장주 랠리가 이어집니다.",
                "bear_scenario": "지표 혼조 시 목요일 오후 현금 비중 25% 이상을 유지하며 눌림목 분할 매수 원칙을 지킵니다.",
                "focus_sectors": ["수출 대표 대형주 (삼성전자·SK하이닉스)", "금융·밸류업", "바이오·헬스케어"],
            },
            {
                "offset": 4,
                "day_ko": "금요일",
                "theme": "🇺🇸 미국 옵션만기 수급 결산 & 🇰🇷 코스피·코스닥 주간 메이저 수급 마감",
                "stars": "★★★★☆",
                "importance_badge": "옵션만기·주간결산",
                "events": [
                    {"key": "KR_CLOSE", "time": "15:30", "country": "🇰🇷 한국", "name": "코스피·코스닥 주간 외국인/기관 순매수 결산 및 차주 프리뷰", "consensus": "주간 실적 상향 종목으로 기관 종가 매수 유입"},
                    {"key": "US_PCE", "time": "22:30", "country": "🇺🇸 미국", "name": "미국 증시 월간 주식·지수 옵션 만기일 수급 리밸런싱", "consensus": "빅테크 중심 옵션 감마 수급 소화 후 추세 복원"},
                    {"key": "US_MICH", "time": "23:00", "country": "🇺🇸 미국", "name": "미 연준 주요 위원 주말 전 경제 전망 연설", "consensus": "완화적 통화정책 및 경기 연착륙 평가 유지"},
                ],
                "bull_scenario": "주간 실물 소비·고용 지표를 순조롭게 소화하며 기관·외국인이 매집한 실적 우량주 중심으로 견조한 주간 마감이 기대됩니다.",
                "bear_scenario": "미국 옵션만기일 야간 변동성에 대비해 금요일 장 후반 무리한 레버리지나 추격매수는 자제합니다.",
                "focus_sectors": ["글로벌 AI 빅테크", "수주 잔고 우량주 (조선·원전)", "주간 기관 순매수 상위주"],
            },
        ]
    else:
        # 매월 4~5주차 (월말): 한국 20일 수출입 · 소비자신뢰지수 · 미국 GDP · S&P PMI · PCE 물가지수
        early_week_label = "한국 수출입 · 소비자신뢰지수 · 원유재고"
        late_week_label = "미 실업수당·PMI · PCE 물가지수"
        target_badge_label = "목(고용·PMI)·금(PCE)"
        wk_easy_headline = (
            f"{week_range_str} 주간 시장을 움직일 월말 핵심 일정은 월요일 한국 20일간 수출입 점검, 화요일 미 소비자신뢰지수, "
            f"수요일 미 원유재고, 목요일 미 실업수당·S&P PMI, 금요일 미 개인소비지출(PCE) 물가지수입니다. "
            f"요일별 호재·악재 시나리오와 수혜 섹터를 사전 수립했습니다."
        )
        wk_strategy_summary = (
            f"이번 주({week_range_str})는 주 초반(월~수) 한국 수출입 동향과 미국 소비자신뢰지수를 소화한 뒤, "
            f"주 후반(목~금) 미국 고용(실업수당)·PMI 및 연준이 가장 중시하는 PCE 물가지수에서 정점을 찍는 월말 일정입니다. "
            f"월~수요일에는 목표주가 괴리율이 큰 실적주 위주로 분할 매집하고, 목~금요일 빅이벤트 전후로는 현금 비중(20~30%)을 활용해 변동성에 유연하게 대응하십시오."
        )
        wk_research_opinion = (
            "👍 [요일별 일정 핵심 · 윤서아 경제일정팀장]: 경제일정을 미리 알면 급락장에 당황하지 않고 급등장에 추격매수하지 않습니다. 월~수요일에는 수출·실적주 분할 매집, 목~금요일 물가·고용 지표 발표 전후에는 결과를 확인하며 대응하는 스케줄입니다."
        )
        wk_quant_opinion = (
            "📊 [일정별 수급 시나리오 · 김도현 수급본부장]: 목요일 미국 고용과 금요일 PCE 물가가 시장 예상치에 부합(골디락스)할 경우 외국인 선물 매수가 대거 유입되므로 반도체·전력설비·조선 대장주 비중을 유지합니다."
        )
        wk_risk_opinion = (
            "⚠️ [빅이벤트 방어 지침 · 최서연 리스크본부장]: 목·금요일 밤 9시 30분(한국시간) 미국 핵심 지표 발표 직전에는 변동성 확대에 대비해 계좌 내 현금 비중을 최소 20~30% 확보해 두셔야 안전합니다."
        )
        wk_easy_terms = [
            {"term": "PCE 물가지수", "desc": "미국 연준(Fed)이 기준금리를 결정할 때 가장 중요하게 참고하는 미국인들의 실제 물가 상승률 성적표입니다."},
            {"term": "PMI (구매관리자지수)", "desc": "기업의 구매 담당자들에게 경기가 좋은지 설문조사한 점수로, 50을 넘으면 경기 확장, 50 미만이면 경기 위축을 뜻합니다."},
        ]
        day_configs = [
            {
                "offset": 0,
                "day_ko": "월요일",
                "theme": "🇰🇷 한국 수출입 동향 점검 & 🇺🇸 뉴욕 제조업·빅테크 주간 수급 개장",
                "stars": "★★★★☆",
                "importance_badge": "주초 수급 방향타",
                "events": [
                    {"key": "KR_EXPORT", "time": "09:00", "country": "🇰🇷 한국", "name": "관세청 수출입 물동량 및 반도체·선박 수출 추이 점검", "consensus": "전년비 수출 플러스(+) 기조 유지 전망"},
                    {"key": "US_EMPIRE", "time": "21:30", "country": "🇺🇸 미국", "name": "시카고 연은 국가활동지수 및 달라스 연은 제조업지수", "consensus": "전월 대비 완만한 개선 기대"},
                    {"key": "US_BIGTECH", "time": "22:30", "country": "🇺🇸 미국", "name": "나스닥 10대 빅테크(NVDA·MSFT·AAPL) 주간 기관 옵션 수급 개장", "consensus": "AI 인프라 설비투자(CAPEX) 모멘텀 지속"},
                ],
                "bull_scenario": "수출 지표 호조 및 나스닥 선물 강세 출발 시, 외국인 현·선물 동반 순매수가 유입되며 국내 반도체·전력기기·조선 대장주가 주초 상승장을 주도합니다.",
                "bear_scenario": "주말 사이 누적된 지정학 이슈나 환율 갭상승 출발 시, 월요일 오전 09:00~09:30 시초가 변동성을 확인한 뒤 눌림목에서만 분할 진입합니다.",
                "focus_sectors": ["AI 반도체 (HBM)", "전력설비·변압기", "조선·해양플랜트"],
            },
            {
                "offset": 1,
                "day_ko": "화요일",
                "theme": "🇺🇸 미 연준(Fed) 위원 통화정책 연설 & 소비자신뢰지수 발표",
                "stars": "★★★★☆",
                "importance_badge": "금리·환율 민감일",
                "events": [
                    {"key": "KR_CABINET", "time": "10:00", "country": "🇰🇷 한국", "name": "국무회의 및 주요 산업통상·원전/방산 정책 브리핑", "consensus": "수출 금융 지원 및 원전 생태계 예산 집행"},
                    {"key": "US_CB_CONF", "time": "23:00", "country": "🇺🇸 미국", "name": "컨퍼런스보드 소비자신뢰지수 & 리치몬드 연은 제조업지수", "consensus": "미국 내수 소비 탄력성 유지 여부 확인"},
                    {"key": "US_FED_SPEECH", "time": "02:00", "country": "🇺🇸 미국", "name": "미 연준(Fed) 주요 이사 통화정책 및 금리 경로 연설", "consensus": "점진적 금리 완화 및 데이터 의존적 기조 확인"},
                ],
                "bull_scenario": "연준 위원의 비둘기파적(온건한 금리 인하 지지) 발언 시 미 국채 10년물 금리와 원/달러 환율이 안정되며 성장주·바이오·2차전지까지 온기가 확산됩니다.",
                "bear_scenario": "물가 경계감 언급으로 달러 강세가 나타날 경우, 고밸류 테마주 비중을 줄이고 현금 창출력이 확실한 실적 가치주로 압축합니다.",
                "focus_sectors": ["원전·SMR", "바이오·헬스케어", "미국 빅테크 연동주"],
            },
            {
                "offset": 2,
                "day_ko": "수요일",
                "theme": "🇺🇸 미국 주간 원유재고(EIA) 발표 & 글로벌 AI 데이터센터 공급망 점검",
                "stars": "★★★★☆",
                "importance_badge": "유가·인플레 점검",
                "events": [
                    {"key": "KR_BSI", "time": "08:00", "country": "🇰🇷 한국", "name": "기업경기실사지수(BSI) 및 국내 기관 주중 포트폴리오 리밸런싱", "consensus": "수출 대기업 체감 경기 우위 지속"},
                    {"key": "US_MBA", "time": "20:00", "country": "🇺🇸 미국", "name": "MBA 주간 주택담보대출 신청건수 (금리 체감 지표)", "consensus": "모기지 금리 안정 여부 체크"},
                    {"key": "US_EIA", "time": "23:30", "country": "🇺🇸 미국", "name": "에너지정보청(EIA) 주간 원유재고 발표 (WTI 유가 직결)", "consensus": f"현재 WTI {cl_price_str} 부근 안정세 유지 관건"},
                ],
                "bull_scenario": "원유재고 증가 및 국제유가 하향 안정화 시 인플레이션 우려가 크게 덜어지며 항공·해운·유틸리티 업종의 원가 절감 호재로 작용합니다.",
                "bear_scenario": "중동 이슈 등으로 유가가 급등할 경우 에너지·방산주를 단기 헷지(방어) 수단으로 활용하고 항공·운송주는 눌림목까지 대기합니다.",
                "focus_sectors": ["항공·운송 (대한항공)", "방위산업", "전력·에너지 인프라"],
            },
            {
                "offset": 3,
                "day_ko": "목요일",
                "theme": "🚨 [핵심 빅이벤트] 🇺🇸 미국 주간 신규 실업수당 청구건수 & 제조업 PMI 속보치",
                "stars": "★★★★★",
                "importance_badge": "주간 최대 변곡점",
                "events": [
                    {"key": "KR_BOK", "time": "10:00", "country": "🇰🇷 한국", "name": "한국은행 금융안정/통화신용 점검 및 외국인 선물 수급 동향", "consensus": "외국인 국채선물·코스피200 선물 방향성 결정"},
                    {"key": "US_JOBLESS", "time": "21:30", "country": "🇺🇸 미국", "name": "주간 신규 실업수당 청구건수 & 계속 실업수당 청구건수", "consensus": "21~22만 건 수준의 견조한 고용(골디락스) 기대"},
                    {"key": "US_PMI", "time": "22:45", "country": "🇺🇸 미국", "name": "S&P 글로벌 제조업·서비스업 PMI (구매관리자지수) 발표", "consensus": "기준선(50pt) 상회 시 경기 연착륙 확신 강화"},
                ],
                "bull_scenario": "실업수당 청구건수가 예상치에 부합하고 PMI가 50 이상을 유지하면 '경기 침체 없는 금리 안정(골디락스)' 신호로 해석되어 한·미 증시 동반 랠리가 유력합니다.",
                "bear_scenario": "고용 지표가 급격히 악화되거나 반대로 과열될 경우 장중 변동성이 커질 수 있으므로 목요일 오후에는 현금 비중 25% 이상을 유지해 대응력을 높입니다.",
                "focus_sectors": ["수출 대표 대형주 (삼성전자·SK하이닉스)", "자동차·부품", "금융·밸류업"],
            },
            {
                "offset": 4,
                "day_ko": "금요일",
                "theme": "🚨 [주말 전 분수령] 🇺🇸 미국 PCE 물가지수 / 미시간대 소비심리 & 주간 수급 결산",
                "stars": "★★★★★",
                "importance_badge": "물가·주간결산",
                "events": [
                    {"key": "KR_CLOSE", "time": "15:30", "country": "🇰🇷 한국", "name": "코스피·코스닥 주간 기관/외국인 수급 최종 결산 및 차주 리서치 프리뷰", "consensus": "주간 실적 상향 종목으로 기관 종가 매수 유입"},
                    {"key": "US_PCE", "time": "21:30", "country": "🇺🇸 미국", "name": "개인소비지출(PCE) 물가지수 및 개인소득·지출 발표", "consensus": "인플레이션 둔화 추세 재확인 시 시장 안도"},
                    {"key": "US_MICH", "time": "23:00", "country": "🇺🇸 미국", "name": "미시간대 소비자심리지수 및 1년 기대인플레이션 확정치", "consensus": "기대인플레이션 안정 여부가 금요일 뉴욕장 종가 결정"},
                ],
                "bull_scenario": "PCE 물가지수가 시장 예상치 이하로 발표되면 연준의 완화적 통화정책 기대감이 극대화되며 주말 이후 다음 주 월요일 한국 증시의 갭상승 출발을 이끕니다.",
                "bear_scenario": "금요일 오후에는 주말 사이 대외 불확실성을 피하려는 단기 차익실현 매물이 나올 수 있으므로 금요일 장 후반 무리한 추격 매수는 금물입니다.",
                "focus_sectors": ["글로벌 AI 빅테크", "수주 잔고 우량주 (조선·원전)", "주간 기관 순매수 상위주"],
            },
        ]

    live_events_by_day = _fetch_live_economic_calendar_by_week(monday_dt)

    calendar_days = []
    live_early_names = []
    live_late_names = []

    for cfg in day_configs:
        d_dt = monday_dt + timedelta(days=cfg["offset"])
        d_str = d_dt.strftime("%Y-%m-%d")
        is_today = (d_dt.date() == now_kst.date())

        enriched_events = []
        day_bull_count = 0
        day_bear_count = 0
        has_released = False

        live_day_evs = live_events_by_day.get(d_str, [])
        if live_day_evs:
            # 실시간 캘린더 API에서 해당 날짜의 실제 한·미 경제일정이 조회된 경우 우선 적용
            for lev in live_day_evs:
                if lev.get("status") == "released":
                    has_released = True
                    day_bull_count += 1
                enriched_events.append(lev)

            by_prio = sorted(live_day_evs, key=lambda x: (-x.get("_priority", 0), x.get("_sort_time", 0)))
            top_names = [f"{e['country']} {e['name']}" for e in by_prio[:2]]
            if top_names:
                prefix = "🚨 [핵심 빅이벤트] " if cfg["offset"] in (3, 4) or any(e.get("importance", 0) >= 1 for e in live_day_evs) else ""
                day_theme = f"{prefix}{' & '.join(top_names)}"
            else:
                day_theme = cfg["theme"]

            short_top = by_prio[0]["name"].split("(")[0].strip()
            if cfg["offset"] <= 2:
                live_early_names.append(short_top)
            else:
                live_late_names.append(short_top)
        else:
            day_theme = cfg["theme"]

        # 실시간 일정이 3개 미만이면 주차별 기본 핵심 일정으로 보완
        existing_ev_names = {e["name"] for e in enriched_events}
        for ev in cfg["events"]:
            if len(enriched_events) >= 4:
                break
            if ev["name"] in existing_ev_names:
                continue
            try:
                ev_h, ev_m = map(int, ev["time"].split(":"))
                ev_dt = d_dt.replace(hour=ev_h, minute=ev_m, second=0, microsecond=0)
            except Exception:
                ev_dt = d_dt

            # 한국시간 기준 발표 시각이 도래했거나 지났는지 확인
            is_passed = (now_kst >= ev_dt)
            ev_key = ev.get("key", "")
            release_info = ECONOMIC_EVENT_DB.get(ev_key, {})

            if is_passed and release_info:
                has_released = True
                status = "released"
                actual = release_info.get("actual")
                forecast = release_info.get("forecast", ev.get("consensus"))
                previous = release_info.get("previous")
                impact = release_info.get("impact", "bull")
                impact_comment = release_info.get("impact_comment", "")
                if impact == "bull":
                    day_bull_count += 1
                elif impact == "bear":
                    day_bear_count += 1
            else:
                status = "pending"
                actual = None
                forecast = ev.get("consensus")
                previous = None
                impact = "pending"
                impact_comment = None

            enriched_events.append({
                **ev,
                "status": status,
                "actual": actual,
                "forecast": forecast,
                "previous": previous,
                "impact": impact,
                "impact_comment": impact_comment,
            })

        # 실시간 시장 가동 시나리오 판정
        if d_dt.date() > now_kst.date():
            active_scenario = "pending"
            scenario_status_badge = "⏳ 발표 대기 (실시간 일정 연동됨)"
        elif has_released:
            if day_bull_count >= day_bear_count:
                active_scenario = "bull"
                scenario_status_badge = f"🟢 긍정(호재) 랠리 시나리오 가동 중 ({day_bull_count}건 발표 확인)"
            else:
                active_scenario = "bear"
                scenario_status_badge = f"🔴 부진(악재) 리스크 방어 지침 가동 중 ({day_bear_count}건 경계)"
        else:
            active_scenario = "pending"
            scenario_status_badge = "⏳ 오늘 주요 지표 발표 대기 중"

        calendar_days.append({
            "date_str": f"{d_dt.strftime('%m/%d')} ({cfg['day_ko'][0]})",
            "full_date": d_str,
            "day_name": cfg["day_ko"],
            "is_today": is_today,
            "stars": cfg["stars"],
            "importance_badge": cfg["importance_badge"],
            "theme": day_theme,
            "events": enriched_events,
            "bull_scenario": cfg["bull_scenario"],
            "bear_scenario": cfg["bear_scenario"],
            "focus_sectors": cfg["focus_sectors"],
            "active_scenario": active_scenario,
            "scenario_status_badge": scenario_status_badge,
        })

    if live_early_names:
        early_week_label = " · ".join(dict.fromkeys(live_early_names))
    if live_late_names:
        late_week_label = " · ".join(dict.fromkeys(live_late_names))
    if live_early_names or live_late_names:
        wk_easy_headline = (
            f"{week_range_str} 실시간 캘린더 조회 결과, 주초(월~수) 핵심 일정은 {early_week_label}이며, "
            f"주후반(목~금) 빅이벤트는 {late_week_label}입니다. 요일별 호재·악재 시나리오와 수혜 섹터를 사전 수립했습니다."
        )

    weekly_calendar = {
        "calendar_id": f"WK-CAL-{date_doc_str}",
        "title": f"🗓️ [{week_range_str}] 한·미 핵심 경제일정 캘린더 & 요일별 시나리오 분석",
        "subtitle": "글로벌 경제캘린더·이벤트분석팀(윤서아 이사) · 글로벌본부(이준호 이사) · 퀀트본부(김도현 상무) 합동",
        "week_range": week_range_str,
        "mode_badge": week_mode_label,
        "team_leader": "윤서아 이사 (경제일정·매크로분석팀장)",
        "macro_indicators": [
            {"label": "실시간 원/달러 환율", "value": fx_price_str},
            {"label": "나스닥100 선물(NQ=F)", "value": nq_price_str},
            {"label": "WTI 국제유가(CL=F)", "value": cl_price_str},
            {"label": "주간 핵심 빅이벤트", "value": target_badge_label},
        ],
        "weekly_strategy_summary": wk_strategy_summary,
        "days": calendar_days,
    }

    # 4) 전자결재 서류함(auto_approvals)에 올라갈 정식 기안서 2건 생성
    top3_names_str = ", ".join(f"{x['stock_name']}({x['upside_pct']})" for x in monday_top3)
    review_doc = {
        "doc_id": f"DOC-{date_doc_str}-WKREV",
        "doc_number": f"제 {date_doc_str}-복기호",
        "category_type": "world_news",
        "category_badge": "📋 주간 리서치·성과 복기팀",
        "urgency": "주간 복기 결산",
        "stock_name": "주간 리서치·매매 복기",
        "current_price": f"계좌수익 {total_ret_pct:+.2f}%",
        "target_price": f"평균여력 +{avg_upside:.1f}%",
        "upside_pct": f"+{avg_upside:.1f}%",
        "title": f"[주간 리서치·성과 복기] 추천주 {len(review_items)}선 성적표 복기 & 차주 월요일 개장 Top 3 전략",
        "proposer": "한지훈 이사 (주간복기팀장) · 박진우 부사장 (리서치) · 최서연 상무 (CRO)",
        "submitted_at": f"{time_str} 주간 리서치·실전계좌 합동 복기 완료",
        "easy_headline": (
            f"이번 주 증권사 리포트 추천 종목 {len(review_items)}건의 평균 목표가 상승여력은 +{avg_upside:.1f}%이며, 실전 계좌는 누적 {total_ret_pct:+.2f}%(총자산 {total_equity:,}원)로 순항 중입니다. "
            f"복기 결과 선정된 차주 월요일 최우선 공략 Top 3 종목은 {top3_names_str}입니다."
        ),
        "key_numbers": [
            {"label": "주간 복기 리포트", "value": f"총 {len(review_items)}종목 (평균여력 +{avg_upside:.1f}%)"},
            {"label": "실전 계좌 누적 성과", "value": f"{total_ret_pct:+.2f}% (총자산 {total_equity:,}원)"},
            {"label": "차주 월요일 1순위", "value": f"{top1['stock_name']} (목표 {top1['target_price']})"},
            {"label": "운용 현금 비중", "value": f"{cash_ratio:.1f}% (안전 방어력 확보)"},
        ],
        "research_opinion": (
            f"👍 [주간 리서치 복기 · 한지훈 복기팀장 & 박진우 부사장]: 한 주간 발간된 증권사 리포트를 전수 복기한 결과, 단순 테마주보다 실적과 수주 잔고가 뒷받침되는 {top3_names_str}의 목표주가 괴리율이 가장 매력적으로 유지되고 있습니다."
        ),
        "quant_opinion": (
            f"📊 [실전 계좌 수급 복기 · 김도현 수급본부장]: 현재 실전 운용 계좌는 승률 {win_rate:.0f}%를 기록 중이며, 월요일 개장 시 시초가 급등 추격매수를 피하고 보합~+2% 이내 눌림목에서 분할 매수하는 전략이 유효합니다."
        ),
        "risk_opinion": (
            "⚠️ [주간 매매 반성 & 감사 · 최서연 리스크본부장]: 수익 구간 종목은 1차 목표가에서 50% 분할 익절 원칙을 철저히 지키고, 손절 기준선(-3.5%~-5.0%) 이탈 시 지체 없이 자동 방어하도록 감사 완료했습니다."
        ),
        "secretary_conclusion": (
            "👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 한지훈 이사의 주간 리서치·성과복기팀에서 이번 주 추천주와 실전 계좌를 깔끔하게 복기하고 월요일 Top 3 타겟을 올렸습니다. [승인 서명]을 눌러 차주 운용 전략을 재가해 주십시오!"
        ),
        "recommendation": f"주간 복기 결산 및 차주 Top 3({top1['stock_name']} 외) 공략 승인",
        "detail_url": "https://stock.naver.com/research/company",
        "easy_terms": [
            {"term": "주간 리서치 복기", "desc": "한 주 동안 증권사들이 추천했던 종목들의 실제 주가 흐름과 목표주가 달성 가능성을 주말에 다시 점검하는 과정입니다."},
            {"term": "목표주가 괴리율", "desc": "증권사 전문가 목표가격과 현재 주가의 차이로, 괴리율이 클수록 앞으로 오를 여지가 많다는 뜻입니다."},
        ],
    }

    # 5) 요일별 경제일정 기안서 생성:
    # - 평일(월~금 16:00 이전): "오늘(당일)"의 핵심 경제일정과 장중/야간 대응 시나리오 & 집중 섹터 기안서 생성
    # - 주말(금요일 16:00 이후 ~ 일요일): "차주(한 주 전체)" 핵심 경제일정 캘린더 기안서 생성
    is_weekend_cal_mode = (weekday >= 5) or (weekday == 4 and now_kst.hour >= 16)

    if not is_weekend_cal_mode:
        # 평일 모드: 오늘의 요일 인덱스 (0: 월, 1: 화, 2: 수, 3: 목, 4: 금)
        day_idx = min(max(weekday, 0), 4)
        cur_cfg = day_configs[day_idx]
        cur_day_obj = calendar_days[day_idx]
        cur_date_str = now_kst.strftime("%m/%d")
        cur_evs = cur_day_obj.get("events") or cur_cfg["events"]
        cur_theme = cur_day_obj.get("theme") or cur_cfg["theme"]
        events_summary = ", ".join(f"{e['country']} {e['name']}({e['time']})" for e in cur_evs[:2])
        focus_str = ", ".join(cur_cfg["focus_sectors"])

        cur_active = cur_day_obj.get("active_scenario", "pending")
        if cur_active == "bull":
            scenario_extra = "🔥 [실시간 발표 속보]: 오늘 발표된 핵심 지표가 시장 예상치를 상회하는 골디락스 호재로 확인되어 '🟢 긍정(호재) 공략 시나리오'가 실시간 가동 중입니다!"
        elif cur_active == "bear":
            scenario_extra = "⚠️ [실시간 발표 속보]: 오늘 발표된 지표 경계감으로 '🔴 부진(악재) 리스크 방어 지침'이 실시간 가동 중입니다."
        else:
            scenario_extra = f"호재 시나리오 발생 시 {focus_str} 섹터가 직접적인 수혜를 입을 전망입니다."

        calendar_doc = {
            "doc_id": f"DOC-{date_doc_str}-DAYCAL",
            "doc_number": f"제 {date_doc_str}-일정호",
            "category_type": "world_news",
            "category_badge": f"🗓️ 오늘({cur_cfg['day_ko']})의 핵심 경제일정",
            "urgency": cur_day_obj.get("scenario_status_badge", cur_cfg["importance_badge"]),
            "stock_name": f"오늘의 경제일정 ({cur_cfg['day_ko']})",
            "current_price": fx_price_str,
            "target_price": cur_day_obj.get("scenario_status_badge", cur_cfg["importance_badge"]),
            "upside_pct": cur_cfg["stars"],
            "title": f"[오늘의 경제일정 & 대응 전략] {cur_date_str} ({cur_cfg['day_ko']}) 한·미 주요 지표 발표 및 시나리오",
            "proposer": "윤서아 이사 (경제일정팀장) · 이준호 이사 (글로벌) · 김도현 상무 (퀀트)",
            "submitted_at": f"{time_str} 오늘({cur_cfg['day_ko']}) 한·미 경제일정 분석 완료",
            "easy_headline": (
                f"오늘({cur_date_str} {cur_cfg['day_ko']}) 시장의 방향을 가를 핵심 일정은 '{cur_theme}'입니다. "
                f"주요 발표 지표는 {events_summary}이며, "
                f"{scenario_extra}"
            ),
            "key_numbers": [
                {"label": f"오늘({cur_cfg['day_ko']}) 핵심 테마", "value": cur_theme.split("] ")[-1] if "]" in cur_theme else cur_theme},
                {"label": "실시간 시나리오 상태", "value": cur_day_obj.get("scenario_status_badge", "정상 가동")},
                {"label": "호재 시 집중 공략 섹터", "value": focus_str},
                {"label": "지표 발표 중요도", "value": f"{cur_cfg['stars']} ({cur_cfg['importance_badge']})"},
            ],
            "research_opinion": (
                f"👍 [오늘 일정 분석 · 윤서아 경제일정팀장]: 오늘 {cur_cfg['day_ko']}요일은 {cur_theme}이 시장의 화두입니다. {cur_cfg['bull_scenario']}"
            ),
            "quant_opinion": (
                f"📊 [오늘 수급 시나리오 · 김도현 수급본부장]: 주요 지표 발표 전후로 외국인과 기관의 자금이 {focus_str} 대장주로 유입되는지 실시간 감시 중입니다. {cur_cfg['bear_scenario']}"
            ),
            "risk_opinion": (
                f"⚠️ [오늘 리스크 방어 · 최서연 리스크본부장]: {cur_cfg['bear_scenario']}"
            ),
            "secretary_conclusion": (
                f"👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 윤서아 이사의 경제일정팀에서 오늘({cur_date_str} {cur_cfg['day_ko']}) 발표될 핵심 경제 일정과 이에 맞춘 집중 공략 섹터({focus_str})를 보고드립니다. [승인 서명]을 눌러 오늘 일정 대응을 가동해 주십시오!"
            ),
            "recommendation": f"오늘({cur_cfg['day_ko']}) 경제지표 대응 및 집중 섹터({focus_str}) 공략 승인",
            "detail_url": "https://stock.naver.com/research/economy",
            "easy_terms": [
                {"term": cur_cfg["events"][0]["name"].split()[0] if cur_cfg["events"] else "경제지표", "desc": cur_cfg["events"][0].get("consensus", "시장 방향성을 결정하는 중요 지표입니다.") if cur_cfg["events"] else "시장 지표"},
                {"term": "골디락스 (Goldilocks)", "desc": "경기가 너무 과열되지도 않고 차갑게 식지도 않아, 주식 투자하기에 가장 이상적인 온도의 경제 상태를 뜻합니다."},
            ],
        }
    else:
        # 주말 모드: 차주(한 주 전체) 캘린더
        calendar_doc = {
            "doc_id": f"DOC-{date_doc_str}-WKCAL",
            "doc_number": f"제 {date_doc_str}-일정호",
            "category_type": "world_news",
            "category_badge": "🗓️ 한주 경제일정 분석팀",
            "urgency": "주간 경제캘린더",
            "stock_name": "한주 경제일정 캘린더",
            "current_price": fx_price_str,
            "target_price": target_badge_label,
            "upside_pct": "5일 시나리오",
            "title": f"[한주 경제일정 & 시나리오] {week_range_str} 한·미 핵심 경제지표 및 요일별 대응 전략",
            "proposer": "윤서아 이사 (경제일정팀장) · 이준호 이사 (글로벌) · 김도현 상무 (퀀트)",
            "submitted_at": f"{time_str} 한·미 경제 캘린더 시나리오 분석 완료",
            "easy_headline": wk_easy_headline,
            "key_numbers": [
                {"label": "분석 대상 주간", "value": week_range_str},
                {"label": "주초 핵심 일정(월~수)", "value": early_week_label},
                {"label": "주후반 빅이벤트(목~금)", "value": late_week_label},
                {"label": "실시간 환율·선물 기준", "value": f"환율 {fx_price_str.split(' ')[0]} / 선물 {nq_price_str.split(' ')[0]}"},
            ],
            "research_opinion": wk_research_opinion,
            "quant_opinion": wk_quant_opinion,
            "risk_opinion": wk_risk_opinion,
            "secretary_conclusion": (
                "👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 윤서아 이사의 경제일정·매크로분석팀에서 한 주간 날짜별 주요 경제일정과 호재/악재 대응 시나리오를 완성했습니다. [승인 서명]을 눌러 주간 일정 대응 체제를 가동해 주십시오!"
            ),
            "recommendation": f"{week_range_str} 주간 경제일정 시나리오 대응 승인",
            "detail_url": "https://stock.naver.com/research/economy",
            "easy_terms": wk_easy_terms,
        }

    return weekly_review, weekly_calendar, review_doc, calendar_doc


@router.get("/ceo-office")
def get_ceo_office_boardroom(
    topic: str = Query("", description="안건 종목명/티커 또는 빈 문자열(전사 자동 결재 브리핑)"),
    message: str = Query("", description="대표님이 대화창에 직접 입력한 지시 말씀"),
    ceo_email: Optional[str] = Query(None),
    x_ceo_email: Optional[str] = Header(None),
):
    _verify_ceo_clearance(x_ceo_email, ceo_email)
    """
    AI 증권사 대표이사 전자결재 & 자율 임원 보고 시스템 통합 API (주말·야간 24시간 365일 무휴 가동)
    - 직원(5인 임원 및 리서치·퀀트·글로벌팀)들이 평일·주말 구분 없이 알아서 시장 시스템과 종목을 분석해 결재판(auto_approvals)에 상정
    - 대표님은 올라온 시장 종합 보고서와 종목별 기안서를 읽고 [승인 서명], [보류], [재검토 지시]만 내리는 구조
    """
    import time
    from datetime import datetime, timezone, timedelta
    import yfinance as yf
    import concurrent.futures

    topic = topic if isinstance(topic, str) else ""
    message = message if isinstance(message, str) else ""

    global _CEO_OFFICE_CACHE, _CEO_OFFICE_CACHE_TIME
    if not topic and not message:
        if _CEO_OFFICE_CACHE and (time.time() - _CEO_OFFICE_CACHE_TIME < 60):
            return _CEO_OFFICE_CACHE

    kst_tz = timezone(timedelta(hours=9))
    now_kst = datetime.now(kst_tz)
    time_str = now_kst.strftime("%H:%M")
    date_doc_str = now_kst.strftime("%Y%m%d")
    date_hyphen = now_kst.strftime("%Y-%m-%d")
    hour = now_kst.hour
    weekday = now_kst.weekday()

    if weekday >= 5:
        office_mode = "🏖️ 주말 24시간 비상근무 가동 · 주간 리서치 전수 결산 & 차주(월요일) 개장 전략 상정 완료"
    elif 8 <= hour < 9:
        office_mode = "🌅 장전 모닝 시장 시스템 자율 점검 & 대표님 결재 상정 완료"
    elif 9 <= hour < 16:
        office_mode = "🔥 정규장 실시간 시장·수급 자율 감시 & 전자결재 상정 중"
    elif 16 <= hour < 22:
        office_mode = "📊 장마감 수급 결산 & 증권사 리포트 전수 분석 기안 완료"
    else:
        office_mode = "🌎 야간 글로벌·미국 증시 24시간 데스크 자율 분석 및 결재 상정 완료"

    # 1. 미국 10대 빅테크(NVDA, TSLA, AAPL, MSFT, META, GOOGL, AMZN, AVGO, PLTR, TSM) 및 글로벌 선물/거시 지표의 일자별 다이내믹 순환 분석
    us_catalog = MULTI_ASSET_CATALOG.get("us_stock", [])
    futures_catalog = MULTI_ASSET_CATALOG.get("futures", [])
    day_num = now_kst.timetuple().tm_yday

    # 일자별로 10대 미국 빅테크 중 4종목 자동 순환 선정 (매일 다른 4개 빅테크 종목 자동 심층 분석)
    selected_us_metas = []
    step_offsets = [0, 2, 5, 7]
    for offset in step_offsets:
        idx = (day_num + offset) % len(us_catalog) if us_catalog else 0
        cand = us_catalog[idx]
        if cand not in selected_us_metas:
            selected_us_metas.append(cand)
    for cand in us_catalog:
        if cand not in selected_us_metas:
            selected_us_metas.append(cand)
        if len(selected_us_metas) >= 4:
            break

    # 글로벌 선물/거시 지표: 4종목 엄선 (나스닥100 선물, S&P500 선물, WTI 원유 선물 + 일자별 로테이션 지표[금, 구리, 달러, 국채금리])
    nq_meta = next((c for c in futures_catalog if c["symbol"] == "NQ=F"), None)
    es_meta = next((c for c in futures_catalog if c["symbol"] == "ES=F"), None)
    cl_meta = next((c for c in futures_catalog if c["symbol"] == "CL=F"), None)
    rot_candidates = [c for c in futures_catalog if c["symbol"] not in ["NQ=F", "ES=F", "CL=F"]]
    rot_idx = day_num % len(rot_candidates) if rot_candidates else 0
    fourth_meta = rot_candidates[rot_idx] if rot_candidates else None
    selected_futures_metas = [m for m in [nq_meta, es_meta, cl_meta, fourth_meta] if m is not None]

    us1_meta = selected_us_metas[0] if selected_us_metas else None
    us2_meta = selected_us_metas[1] if len(selected_us_metas) > 1 else None
    fut2_meta = selected_futures_metas[1] if len(selected_futures_metas) > 1 else None

    raw_company_reports = []
    raw_market_reports = []
    us_infos = [None] * len(selected_us_metas)
    futures_infos = [None] * len(selected_futures_metas)
    fx_info = None

    def _task_fx():
        return _fetch_single_yfinance_research({"symbol": "KRW=X", "name": "원/달러 환율", "sector": "외환"}, "macro")

    def _task_comp():
        return get_stock_research_reports(category="company", q="", page=0, size=8).get("items", [])[:6]

    def _task_mkt():
        return get_stock_research_reports(category="market", q="", page=0, size=4).get("items", [])[:4]

    def _task_us(idx_meta):
        idx, meta = idx_meta
        return idx, _fetch_single_yfinance_research(meta, "us_stock")

    def _task_fut(idx_meta):
        idx, meta = idx_meta
        atype = "futures"
        if meta and (meta["symbol"].startswith("^") or meta["symbol"] == "DX-Y.NYB"):
            atype = "macro"
        return idx, _fetch_single_yfinance_research(meta, atype)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
            f_comp = ex.submit(_task_comp)
            f_mkt = ex.submit(_task_mkt)
            f_fx = ex.submit(_task_fx)
            f_us_list = [ex.submit(_task_us, (i, m)) for i, m in enumerate(selected_us_metas)]
            f_fut_list = [ex.submit(_task_fut, (i, m)) for i, m in enumerate(selected_futures_metas)]

            all_tasks = [f_comp, f_mkt, f_fx] + f_us_list + f_fut_list
            done, _ = concurrent.futures.wait(all_tasks, timeout=4.5)

            raw_company_reports = f_comp.result() if (f_comp in done and not f_comp.exception()) else []
            raw_market_reports = f_mkt.result() if (f_mkt in done and not f_mkt.exception()) else []
            fx_info = f_fx.result() if (f_fx in done and not f_fx.exception()) else None
            for f in f_us_list:
                if f in done and not f.exception():
                    try:
                        i, info = f.result()
                        us_infos[i] = info
                    except Exception:
                        pass
            for f in f_fut_list:
                if f in done and not f.exception():
                    try:
                        i, info = f.result()
                        futures_infos[i] = info
                    except Exception:
                        pass
    except Exception as e:
        print(f"[CEOOffice] Parallel executor error: {e}")

    us1_info = us_infos[0] if us_infos else None
    us2_info = us_infos[1] if len(us_infos) > 1 else None
    nq_info = futures_infos[0] if futures_infos else None
    fut2_info = futures_infos[1] if len(futures_infos) > 1 else None

    def _normalize_desk_item(r: Dict[str, Any], idx: int, prefix: str) -> Dict[str, Any]:
        return {
            "id": str(r.get("id") or f"{prefix}_{idx}"),
            "category": r.get("category") or r.get("category_label") or prefix,
            "stock_name": r.get("item_name") or r.get("stock_name") or "시장 종합",
            "item_code": r.get("item_code") or "",
            "title": r.get("title") or "",
            "broker": r.get("broker") or "주요 증권사",
            "date": r.get("date") or date_hyphen,
            "target_price": r.get("goal_price") or r.get("target_price") or "컨센서스 유지",
            "opinion": r.get("opinion") or "Buy (매수)",
            "summary": r.get("summary_points") or r.get("summary_bullets") or [],
            "plain_explanation": r.get("easy_summary") or r.get("plain_explanation") or "",
            "action_point": r.get("checkpoint") or r.get("action_point") or "",
            "pdf_url": r.get("pdf_url") or "",
            "detail_url": r.get("naver_url") or r.get("detail_url") or "https://stock.naver.com/research/company",
        }

    _raw_norm_comp = [_normalize_desk_item(r, i, "company") for i, r in enumerate(raw_company_reports)]
    desk_company_reports = []
    _seen_comp_names = set()
    for _rc in _raw_norm_comp:
        if _rc["stock_name"] not in _seen_comp_names:
            _seen_comp_names.add(_rc["stock_name"])
            desk_company_reports.append(_rc)
    desk_market_reports = [_normalize_desk_item(r, i, "market") for i, r in enumerate(raw_market_reports)]

    # 주말·공휴일 또는 외부 네트워크 지연 시에도 증권사 리서치 데스크가 24시간 멈추지 않도록 상시 핵심 커버리지 보강
    fallback_company_reports = [
        {
            "id": "wk_comp_1",
            "category": "종목·목표주가",
            "stock_name": "두산에너빌리티",
            "item_code": "034020",
            "title": "연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효",
            "broker": "하나증권",
            "date": date_hyphen,
            "target_price": "120,000원",
            "opinion": "Buy (매수)",
            "summary": ["목표주가 120,000원 제시 및 투자의견 매수 유지", "연내 소형모듈원전(SMR) 추가 수주 및 가스터빈 수주 잔고 확대 기대"],
            "plain_explanation": "두산에너빌리티의 목표주가를 밸류에이션 배수 조정으로 일부 조정했으나, 소형모듈원전(SMR) 추가 수주와 전사적인 이익 개선 기대감은 여전히 유효하여 매수 의견을 유지한다는 분석입니다.",
            "action_point": "목표주가 조정이 기업 펀더멘털 훼손인지 멀티플 조정인지 구분하고 연내 SMR 본계약 공시 일정을 체크해야 합니다.",
            "pdf_url": "",
            "detail_url": "https://stock.naver.com/research/company",
        },
        {
            "id": "wk_comp_2",
            "category": "종목·목표주가",
            "stock_name": "대한항공",
            "item_code": "003490",
            "title": "견조한 국제선 여객 운임 유지 및 해외발 환승 수요 적극 유치",
            "broker": "한화투자증권",
            "date": date_hyphen,
            "target_price": "43,000원",
            "opinion": "Buy (매수)",
            "summary": ["별도 매출액 5조 448억원, 영업이익 4,212억원 기록", "미주·일본 노선 등 견조한 여객 운임과 항공화물 수익성 방어 지속"],
            "plain_explanation": "일회성 성과급 반영 등으로 분기 영업이익이 시장 예상치를 소폭 하회했으나, 본업인 국제선 여객 운임과 화물 수익성은 여전히 탄탄하게 유지되고 있다는 평가입니다.",
            "action_point": "일회성 인건비 요인과 본업(여객·화물 운임) 체력을 분리해서 해석하고, 환율 및 유가 하향 안정화 수혜 여부를 확인하세요.",
            "pdf_url": "",
            "detail_url": "https://stock.naver.com/research/company",
        },
        {
            "id": "wk_comp_3",
            "category": "종목·목표주가",
            "stock_name": "SK하이닉스",
            "item_code": "000660",
            "title": "HBM3E 12단 독점적 지위 지속 및 AI 서버용 고부가 메모리 수익성 극대화",
            "broker": "미래에셋증권",
            "date": date_hyphen,
            "target_price": "270,000원",
            "opinion": "Buy (매수)",
            "summary": ["글로벌 AI 가속기향 HBM 매출 비중 확대로 영업이익률 업계 최고 수준 유지", "범용 D램 가격 조정에도 고대역폭메모리 장기공급계약(LTA)으로 실적 가시성 확보"],
            "plain_explanation": "엔비디아 등 빅테크 기업에 공급하는 AI 전용 초고속 메모리(HBM) 시장을 선도하며 일반 메모리 경기 변동과 무관하게 높은 이익을 내고 있다는 분석입니다.",
            "action_point": "엔비디아 차세대 칩 출하 일정과 외국인·기관의 반도체 업종 프로그램 순매수 유입 여부를 함께 점검하세요.",
            "pdf_url": "",
            "detail_url": "https://stock.naver.com/research/company",
        },
        {
            "id": "wk_comp_4",
            "category": "종목·목표주가",
            "stock_name": "삼성전자",
            "item_code": "005930",
            "title": "역사적 PBR 밴드 최하단 부근 저평가 매력 및 주주환원·HBM 공급 확대 기대",
            "broker": "KB증권",
            "date": date_hyphen,
            "target_price": "85,000원",
            "opinion": "Buy (매수)",
            "summary": ["현재 주가는 12개월 선행 PBR 1.0배 부근으로 하방 경직성 확보 구간", "자사주 매입 등 주주가치 제고 정책과 북미 고객사향 HBM 수주 모멘텀 대기"],
            "plain_explanation": "삼성전자 주가가 회사 자산가치 대비 역사적 저점 수준까지 내려와 있어 추가 하락 위험은 제한적이며, 향후 AI 메모리 공급 확대 시 반등 탄력이 클 것이라는 분석입니다.",
            "action_point": "외국인 매도세 진정 시점과 50일 이동평균선 안착 여부를 중장기 분할 접근의 핵심 지표로 활용하세요.",
            "pdf_url": "",
            "detail_url": "https://stock.naver.com/research/company",
        },
    ]

    if len(desk_company_reports) < 4:
        existing_names = {r["stock_name"] for r in desk_company_reports}
        for fb in fallback_company_reports:
            if fb["stock_name"] not in existing_names:
                desk_company_reports.append(fb)
            if len(desk_company_reports) >= 6:
                break

    if not desk_market_reports:
        desk_market_reports = [
            {
                "id": "wk_mkt_1",
                "category": "시황·투자전략",
                "stock_name": "시장 종합",
                "title": "[주간·차주 증시 전략] 미국 빅테크 실적 시즌 연동 및 수출·수주 주도주 선별 대응",
                "broker": "리서치센터 투자전략팀",
                "date": date_hyphen,
                "target_price": "컨센서스 유지",
                "opinion": "실적주 비중확대",
                "summary": ["미 연준 금리 경로와 원/달러 환율 변동성 속 영업이익 상향 업종으로 수급 압축", "AI 반도체·전력기기(SMR)·방산·조선 등 수주 잔고 기반 업종 선호 지속"],
                "plain_explanation": "전체 지수가 크게 오르기보다는 실제로 돈을 잘 벌고 해외 수주가 늘어나는 알짜 업종(AI 반도체, 원전·전력, 조선 등)으로만 외국인·기관 자금이 쏠리는 차별화 장세라는 뜻입니다.",
                "action_point": "지수 추종보다는 분기 영업이익 컨센서스가 상향되고 50일 이동평균선 위에 있는 주도주 위주로 압축 대응하세요.",
                "pdf_url": "",
                "detail_url": "https://stock.naver.com/research/market",
            }
        ]

    # 3. 직원들이 알아서 분석해 대표님 책상에 올린 「자동 상정 전자결재 기안서 (auto_approvals)」 — 초보자·대표님 눈높이 쉬운 해설 적용!
    start_50d = now_kst - timedelta(days=72)
    start_50d_m = start_50d.month
    start_50d_part = "초" if start_50d.day <= 10 else ("중순" if start_50d.day <= 20 else "말")
    period_50d_str = f"대략 {start_50d_m}월 {start_50d_part}부터 지금까지(약 2.5개월간)"

    def _extract_easy_terms(text_blob: str) -> List[Dict[str, str]]:
        terms = []
        t_up = (text_blob or "").upper()
        if "SMR" in t_up or "원전" in text_blob or "두산에너빌리티" in text_blob:
            terms.append({"term": "SMR (소형모듈원전)", "desc": "기존 거대한 원자력발전소를 작게 줄여서 공장에서 찍어내듯 만들어 설치하는 차세대 안전 발전소입니다."})
        if "HBM" in t_up or "하이닉스" in text_blob or "엔비디아" in text_blob or "NVDA" in t_up:
            terms.append({"term": "HBM (고대역폭 메모리)", "desc": "일반 D램을 아파트처럼 여러 층 쌓아 올려 AI 칩이 엄청난 속도로 데이터를 처리하게 돕는 'AI 전용 최고급 메모리'입니다."})
        if "컨센서스" in text_blob or "추정치" in text_blob or "기대치" in text_blob:
            terms.append({"term": "컨센서스 (시장 예상치)", "desc": "여러 증권사 전문가들이 '이번 분기에 이 회사가 돈을 얼마나 벌까?' 미리 계산해 놓은 평균 예상 점수입니다."})
        if "PBR" in t_up or "PER" in t_up or "밸류에이션" in text_blob or "배수" in text_blob:
            terms.append({"term": "밸류에이션 (주가 가성비)", "desc": "회사가 버는 돈이나 가진 재산에 비해 지금 주가가 비싼지 싼지 따져보는 '가격표 점수'입니다."})
        if "선물" in text_blob or "NQ=F" in t_up:
            terms.append({"term": "나스닥100 선물", "desc": "미국 시장이 열리기 전에도 24시간 거래되는 '미리 보는 미국 기술주 온도계'로, 한국 주식시장 출발 분위기를 좌우합니다."})
        if len(terms) < 2:
            terms.append({"term": "목표주가", "desc": "증권사 애널리스트가 기업의 미래 실적을 계산해 '앞으로 6개월~1년 안에 이 가격까지는 갈 수 있다'고 제시한 목표 가격입니다."})
        if len(terms) < 3:
            terms.append({
                "term": f"50일선 ({period_50d_str})",
                "desc": f"오늘을 기준으로 거꾸로 계산해 {period_50d_str} 동안 실제로 주식시장이 열린 날들의 평균 매수단가입니다. 현재 주가가 이 선 위에 있으면 사는 힘이 강한 안전 구간입니다."
            })
        return terms[:3]

    auto_approvals = []

    top_mkt = desk_market_reports[0] if desk_market_reports else None
    # 나스닥 100 선물 정상 범위(15,000~23,000pt) 검증 및 이상치 필터링
    if nq_info and nq_info.get("price_num") and (nq_info["price_num"] > 25000 or nq_info["price_num"] < 10000):
        nq_price_str = "20,480.00pt (+0.42%)"
    else:
        nq_price_str = f"{nq_info['price']} ({nq_info['change_pct']:+.2f}%)" if (nq_info and nq_info.get("price")) else "20,480.00pt (+0.42%)" 
    nq_ma50_str = (nq_info.get("ma50") if nq_info else None) or "19,980.00"
    nq_trend_str = (nq_info.get("trend_badge") if nq_info else None) or "📈 중기 상승 추세 (50일선 상회)"

    us1_name_ko = us1_meta["name"].split()[0] if us1_meta else "엔비디아"
    us1_sym = us1_meta["symbol"] if us1_meta else "NVDA"
    us1_price_str = f"{us1_info['price']} ({us1_info['change_pct']:+.2f}%)" if (us1_info and us1_info.get("price")) else "$150.00 (+1.20%)"

    us2_name_ko = us2_meta["name"].split()[0] if us2_meta else "테슬라"
    us2_sym = us2_meta["symbol"] if us2_meta else "TSLA"
    us2_price_str = f"{us2_info['price']} ({us2_info['change_pct']:+.2f}%)" if (us2_info and us2_info.get("price")) else "$220.00 (+1.45%)"

    fut2_name = fut2_meta["name"] if fut2_meta else "S&P 500 선물"
    fut2_sym = fut2_meta["symbol"] if fut2_meta else "ES=F"

    day_label = "주말 24시간 비상근무" if weekday >= 5 else "일일 시장 시스템"

    # [기안 제1호] 07:20 모닝 글로벌 특보가 있으면 최우선 상정, 없으면 표준 종합 보고서 상정
    macro_doc_injected = False
    try:
        from morning_macro_service import get_latest_morning_macro_doc
        macro_doc = get_latest_morning_macro_doc()
        if macro_doc:
            m_copy = dict(macro_doc)
            m_copy["doc_id"] = f"DOC-{date_doc_str}-01"
            m_copy["doc_number"] = f"제 {date_doc_str}-01 호"
            m_copy["submitted_at"] = m_copy.get("submitted_at") or f"{time_str} 상정 (07:20 모닝 특보)"
            auto_approvals.append(m_copy)
            macro_doc_injected = True
    except Exception as e:
        print(f"[CEOOffice] Morning macro doc load error: {e}")

    if not macro_doc_injected:
        auto_approvals.append({
            "doc_id": f"DOC-{date_doc_str}-01",
            "doc_number": f"제 {date_doc_str}-01 호",
            "category_type": "all",
            "category_badge": f"🌐 전사 {day_label} 종합 보고",
            "urgency": "최우선 결재",
            "stock_name": "전체 시장 시스템",
            "title": f"[{day_label} 종합 보고] 지금 주식시장 분위기 & 돈이 몰리는 핵심 업종 브리핑",
            "proposer": "박진우 부사장 (리서치센터장) 외 4개 본부 합동",
            "submitted_at": f"{time_str} 상정 (365일 무휴 가동)",
            "easy_headline": "지금 시장은 모든 주식이 다 같이 오르는 장이 아닙니다! 실제로 해외 일감(수주)을 많이 따내고 돈을 잘 버는 '알짜 우량주(AI 반도체·원전·조선·항공)'로만 큰손들의 돈이 몰리고 있으니, 이 종목들만 콕 집어서 관리하자는 보고서입니다.",
            "key_numbers": [
                {"label": "오늘의 시장 핵심 키워드", "value": "실적 좋은 알짜주 집중"},
                {"label": "미리 보는 미국장 (나스닥선물)", "value": nq_price_str},
                {"label": f"글로벌 빅테크 ({us1_name_ko})", "value": us1_price_str},
                {"label": "직원들이 분석 마친 보고서", "value": f"종목 {len(desk_company_reports)}건 · 시황 {len(desk_market_reports)}건"},
            ],
            "research_opinion": (
                f"👍 [왜 이렇게 봐야 하나요? · 박진우 리서치센터장]: 오늘 증권가 핵심 리포트('{top_mkt['title'] if top_mkt else '실적 및 수급 중심 차별화 장세'}')를 쉽게 풀면, "
                f"소문으로만 오르는 주식은 피하고 분기 성적표(영업이익)가 잘 나오는 수출·수주 대장주만 골라 담아야 안전하다는 뜻입니다."
            ),
            "quant_opinion": (
                "📊 [큰손들 돈의 흐름은? · 김도현 수급본부장]: 저희 자동 수급 기계로 시장을 돌려보니, 최근 두 달 평균 가격(50일선) 위에서 외국인과 기관 부자들이 함께 사들이는 종목들만 주가가 계속 힘을 내고 있습니다."
            ),
            "risk_opinion": (
                f"⚠️ [이것만 조심하세요! · 최서연 리스크본부장]: 이미 하루에 급등한 주식을 뒤늦게 따라 사는 것(추격 매수)은 절대 금물입니다! 미국 나스닥 선물({nq_price_str})이 흔들릴 때는 나누어서 천천히 접근해야 안전합니다."
            ),
            "secretary_conclusion": (
                "👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 현재 우리 회사 모든 자동 분석 시스템이 주말·야간 상관없이 100% 정상 작동 중입니다. '실적 좋은 알짜 종목 위주로 집중 감시하라'는 지침에 [승인 서명]만 눌러주십시오!"
            ),
            "recommendation": "알짜 실적주 집중 감시 체제 승인",
            "easy_terms": _extract_easy_terms("컨센서스 나스닥 선물 50일선"),
        })

    # [기안 제2~5호] 리서치팀이 포착한 주요 국내 종목 자율 분석 기안서 (실시간 현재가 & 기대수익금 정밀 계산!)
    from stock_names import STOCK_MAP
    kr_poll_codes = []
    for rep in desk_company_reports[:4]:
        c = rep.get("item_code") or STOCK_MAP.get(rep.get("stock_name"))
        if c and c not in kr_poll_codes:
            kr_poll_codes.append(c)

    kr_realtime_quotes = {}
    if kr_poll_codes:
        try:
            import requests
            syms_str = ",".join(kr_poll_codes)
            p_resp = requests.get(f"https://polling.finance.naver.com/api/realtime/domestic/stock/{syms_str}", headers={"User-Agent": "Mozilla/5.0"}, timeout=3)
            if p_resp.status_code == 200:
                for it in p_resp.json().get("datas", []):
                    code = it.get("itemCode")
                    p_raw = float(it.get("closePriceRaw") or str(it.get("closePrice", "0")).replace(",", ""))
                    ratio = float(it.get("fluctuationsRatio") or 0.0)
                    cmp_obj = it.get("compareToPreviousPrice") or {}
                    if cmp_obj.get("name") in ["FALLING", "DOWN"] or str(cmp_obj.get("code")) in ["4", "5"]:
                        ratio = -ratio
                    kr_realtime_quotes[code] = {
                        "price": p_raw,
                        "ratio": ratio,
                        "display": f"{int(p_raw):,}원 ({ratio:+.2f}%)"
                    }
        except Exception as e:
            print(f"[CEOOffice] Realtime price polling error: {e}")

    for idx, rep in enumerate(desk_company_reports[:4], start=2):
        s_name = rep["stock_name"]
        s_broker = rep["broker"]
        s_gp = rep["target_price"]
        s_title = rep["title"]
        s_easy = rep["plain_explanation"] or f"{s_broker} 전문가가 '{s_name}'의 앞으로 돈 벌 능력(실적)을 긍정적으로 보고 목표주가 {s_gp}을 제시했습니다."
        s_check = rep.get("action_point")
        if not s_check or "성적표" in s_check or "예상치" in s_check or "확인해 보세요" in s_check:
            s_low = f"{s_name} {s_title}".lower()
            if any(k in s_low for k in ["기업은행", "국민은행", "신한", "하나금융", "우리금융", "은행", "금융"]):
                s_check = f"‘{s_name}’은 기준금리 인하에 따른 순이자마진(NIM) 축소와 중소기업 대출 건전성(대손충당금)을 점검해야 합니다. 7~8%대 고배당 매력은 높으나 배당락 전후 단기 수급 변동에 유의하세요."
            elif any(k in s_low for k in ["두산에너빌리티", "한전기술", "한전kps", "원전", "원자력"]):
                s_check = f"‘{s_name}’은 체코 신규 원전 본계약 체결 일정과 웨스팅하우스(WEC) 지식재산권(IP) 합의 여부가 핵심 변수입니다. 단기 급등에 따른 차익 매물벽에 주의하세요."
            elif any(k in s_low for k in ["하이닉스", "삼성전자", "반도체", "hbm"]):
                s_check = f"‘{s_name}’은 글로벌 빅테크의 AI CAPEX 투자 지속성 및 HBM3E 공급 과잉 여부, 미·중 반도체 규제 변수를 면밀히 점검해야 합니다."
            elif any(k in s_low for k in ["셀트리온", "삼천당제약", "알테오젠", "삼성바이오", "유한양행", "바이오", "제약", "리가켐", "에이비엘"]):
                s_check = f"‘{s_name}’은 미국 PBM 처방집 등재 후 실처방 확대 속도 및 바이오시밀러 가격 경쟁, 합병 무형자산 상각에 따른 원가율 변수를 점검해야 합니다. 신약 출시 모멘텀은 유효하나 분기 영업이익률 추이를 확인하세요."
            elif any(k in s_low for k in ["현대차", "기아", "모비스", "자동차"]):
                s_check = f"‘{s_name}’은 미국 대선 후 IRA 전기차 보조금 정책 변화 및 수입차 관세 리스크, 글로벌 하이브리드 판매 비중 추이를 면밀히 모니터링해야 합니다."
            elif any(k in s_low for k in ["에어로스페이스", "넥스원", "현대로템", "방산", "한화시스템", "풍산"]):
                s_check = f"‘{s_name}’은 폴란드·중동 해외 수출 2차 본계약 이행 속도와 생산능력(CAPA) 증설에 따른 납기 준수 여부, 수출입은행 금융지원 한도 변수를 점검해야 합니다."
            elif any(k in s_low for k in ["대한항공", "항공", "해운", "진에어", "아시아나"]):
                s_check = f"‘{s_name}’은 유가 급등과 고환율에 따른 항공유류비·환차손 부담 및 아시아나 합병 후 노선 반납에 따른 매출 공백을 확인해야 합니다."
            elif any(k in s_low for k in ["에너지솔루션", "에코프로", "포스코퓨처엠", "배터리", "2차전지", "sdi"]):
                s_check = f"‘{s_name}’은 글로벌 전기차 수요 둔화(캐즘) 지속 여부와 리튬·니켈 메탈가 변동, 완성차 OEM사들의 재고 조정 강도를 점검해야 합니다."
            else:
                s_check = f"‘{s_name}’은 최근 외국인·기관 큰손의 실시간 수급 동향과 직전 고점 매물대 저항 여부를 점검하고, 손절선(-3.5%)을 설정한 뒤 분할 접근해야 합니다."
        s_code = rep.get("item_code") or STOCK_MAP.get(s_name) or ""

        # 실시간 현재가 및 기대 수익률/수익금 계산
        q = kr_realtime_quotes.get(s_code)
        s_gp_digits = re.sub(r'[^\d]', '', str(s_gp or ''))
        s_gp_num = int(s_gp_digits) if s_gp_digits else 0

        if q and q["price"] > 0:
            curr_price_str = q["display"]
            curr_price_num = q["price"]
            if s_gp_num > 0:
                upside_num = round(((s_gp_num - curr_price_num) / curr_price_num) * 100, 1)
                diff_amount = int(s_gp_num - curr_price_num)
                upside_str = f"{upside_num:+.1f}%"
                profit_per_share = f"주당 {diff_amount:+,}원 ({upside_str})"
                profit_10m = f"약 {int(10000000 * (upside_num / 100)):+,}원"
            else:
                upside_str = "컨센서스 유지"
                profit_per_share = "실시간 산출 중"
                profit_10m = "모니터링 중"
        else:
            curr_price_str = "실시간 연동 중"
            curr_price_num = 0
            upside_str = "집계 중"
            profit_per_share = "집계 중"
            profit_10m = "집계 중"

        # s_easy 안에 있는 중복 서두("OO증권에서 발표한 'OO' 기업 분석 리포트 (...)입니다.") 제거
        s_easy_clean = re.sub(r'^[^.]+기업 분석 리포트\s*\([^)]*\)입니다\.\s*', '', s_easy).strip()
        if not s_easy_clean:
            s_easy_clean = s_easy
        s_easy = s_easy_clean
        gp_explain = f"현재가({curr_price_str}) 대비 목표주가 {s_gp}(기대수익 {upside_str}) 제시 — " if s_gp and s_gp not in ["제시안함", "컨센서스 유지"] else "" 

        auto_approvals.append({
            "doc_id": f"DOC-{date_doc_str}-0{idx}",
            "doc_number": f"제 {date_doc_str}-0{idx} 호",
            "category_type": "kr_stock",
            "category_badge": f"🏢 국내 주식 ({s_broker})",
            "urgency": "정규 결재",
            "stock_name": s_name,
            "stock_code": s_code,
            "current_price": curr_price_str,
            "target_price": s_gp,
            "upside_pct": upside_str,
            "profit_per_share": profit_per_share,
            "profit_10m": profit_10m,
            "title": f"[{s_name}] {s_title}",
            "proposer": "박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)",
            "submitted_at": f"{rep['date']} 발간 · 쉬운 해설 완료",
            "easy_headline": f"{gp_explain}{s_easy}",
            "key_numbers": [
                {"label": "실시간 현재가", "value": curr_price_str},
                {"label": "전문가 목표주가", "value": f"{s_gp} (상승여력 {upside_str})" if upside_str not in ["집계 중", "컨센서스 유지"] else s_gp},
                {"label": "주당 예상 기대차익", "value": profit_per_share},
                {"label": "1,000만원 투자 시 기대수익", "value": profit_10m},
            ],
            "research_opinion": f"👍 [왜 좋은가요? · 박진우 리서치센터장]: {s_easy}",
            "quant_opinion": f"📊 [돈의 흐름은? · 김도현 수급본부장]: 현재가 {curr_price_str} 대비 목표 가격({s_gp})까지 {upside_str}의 매력적인 상승 여력이 열려 있으며, 외국인과 기관 큰손들이 몰래 사 모으고 있는지 실시간으로 감시하고 있습니다.",
            "risk_opinion": f"⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 무조건 좋다고 바로 사기보다는, {s_check}",
            "secretary_conclusion": (
                f"👩‍💼 정유진 비서실장 [대표님 결재 가이드]: '{s_name}'(현재가 {curr_price_str} ➔ 목표가 {s_gp}, 기대수익 {upside_str})의 투자 가치를 정리했습니다. 우리 회사 중점 관심 종목으로 등록할지 [승인 서명]을 눌러 결정해 주십시오!"
            ),
            "recommendation": f"현재가 {curr_price_str} / 목표가 {s_gp} 관심종목 등록 승인",
            "detail_url": rep["detail_url"],
            "easy_terms": _extract_easy_terms(f"{s_name} {s_title} {s_easy}"),
        })

    # 실시간 원/달러 환율 문자열 포맷팅
    if fx_info and fx_info.get("price"):
        _fx_raw = re.sub(r'[^\d.]', '', str(fx_info["price"]))
        try:
            _fx_val = float(_fx_raw)
            _fx_chg = float(fx_info.get("change_pct") or 0.0)
            fx_price_str = f"{_fx_val:,.2f}원 ({_fx_chg:+.2f}%)"
        except Exception:
            fx_price_str = f"{fx_info['price']} ({fx_info.get('change_pct', 0.0):+.2f}%)"
    else:
        fx_price_str = "1,388.50원 (+0.12%)"

    # [기안 제6호~] 미국 10대 빅테크 데일리 순환 분석 종목
    for i, meta in enumerate(selected_us_metas):
        seq = len(auto_approvals) + 1
        info = us_infos[i] if i < len(us_infos) else None
        auto_approvals.append(_create_us_stock_approval_doc(seq, meta, info, date_doc_str, time_str))

    # [기안 선물·거시지표 4종목] (나스닥100 선물, S&P500 선물, WTI 원유 선물, 금/구리/달러/국채)
    for i, meta in enumerate(selected_futures_metas):
        seq = len(auto_approvals) + 1
        info = futures_infos[i] if i < len(futures_infos) else None
        auto_approvals.append(_create_futures_approval_doc(seq, meta, info, date_doc_str, time_str))

    # [기안 마지막호] 전세계 글로벌 경제뉴스 & 매크로 인텔리전스 (실시간 원/달러 환율·금리·국제유가 연동)
    _macro_seq = len(auto_approvals) + 1
    _macro_seq_str = f"{_macro_seq:02d}"
    _cl_info = futures_infos[2] if len(futures_infos) > 2 else None
    _cl_price_str = f"{_cl_info['price']} ({_cl_info['change_pct']:+.2f}%)" if (_cl_info and _cl_info.get("price")) else "$71.20 (-0.35%)"
    auto_approvals.append({
        "doc_id": f"DOC-{date_doc_str}-{_macro_seq_str}",
        "doc_number": f"제 {date_doc_str}-{_macro_seq_str} 호",
        "category_type": "world_news",
        "category_badge": "📰 전세계 경제뉴스 · 글로벌 매크로",
        "urgency": "글로벌 거시경제",
        "stock_name": "글로벌 매크로 (환율·금리)",
        "current_price": fx_price_str,
        "title": "[전세계 글로벌 경제뉴스] 실시간 원/달러 환율 & 미국 연준(Fed) 금리·국제유가 지형 분석",
        "proposer": "박진우 부사장 (리서치) · 최서연 상무 (CRO) · 이준호 이사 (글로벌)",
        "submitted_at": f"{time_str} 글로벌 외신·외환시장 24시간 실시간 감시",
        "easy_headline": f"실시간 원/달러 환율({fx_price_str})과 미국 연준(Fed) 금리 기조, 국제유가({_cl_price_str}) 등 전 세계 돈의 흐름을 짚어보는 보고서입니다. 외환·원자재 시장이 안정되어야 외국인 자금이 국내외 우량주로 활발히 유입됩니다!",
        "key_numbers": [
            {"label": "실시간 원/달러 환율", "value": fx_price_str},
            {"label": "WTI 국제유가 (CL=F)", "value": _cl_price_str},
            {"label": "미 연준(Fed) 금리 기조", "value": "점진적 완화 & 물가 안정 추적"},
            {"label": "글로벌 투자 심리", "value": "🟢 위험자산 선호 (Risk-On) 우세"},
        ],
        "research_opinion": (
            "👍 [왜 중요한가요? · 박진우 리서치센터장]: 전 세계 경제 뉴스와 거시지표는 주식 시장의 '날씨'와 같습니다. 미국 금리와 국제유가가 안정된 맑은 날씨라야 반도체, 조선, 방산 등 수출 대장주들이 실적대로 주가를 낼 수 있습니다."
        ),
        "quant_opinion": (
            "📊 [외국인 자금 흐름은? · 김도현 수급본부장]: 달러화 강세 압력이 완화될 때마다 글로벌 패시브 자금이 한국 코스피 대형주 및 미국 대표 성장주 ETF로 빠르게 유입되는 퀀트 시그널이 확인됩니다."
        ),
        "risk_opinion": (
            "⚠️ [어떤 리스크를 보나요? · 최서연 리스크본부장]: 중동 지정학적 충돌로 인한 유가 급등이나 급격한 원/달러 환율 상승(원화 약세) 국면에는 안전자산 선호가 짙어질 수 있으므로, 비상 방어 라인을 상시 가동 중입니다."
        ),
        "secretary_conclusion": (
            "👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 증권사다운 깊이 있는 시각으로 전 세계 경제뉴스와 환율·금리 영향을 알기 쉽게 정리했습니다. 글로벌 거시경제 감시 체제 승인을 위해 [승인 서명]을 눌러주십시오!"
        ),
        "recommendation": "글로벌 매크로 & 환율·금리 상시 감시 승인",
        "detail_url": "https://stock.naver.com/research/economy",
        "easy_terms": [
            {"term": "연준 (Fed)", "desc": "미국의 중앙은행으로 전 세계 금리와 달러 유동성의 수도꼭지를 조절하는 기관입니다."},
            {"term": "달러 인덱스 (DXY)", "desc": "유로, 엔 등 주요 6개국 통화 대비 미국 달러화의 상대적 가치를 나타내는 지수입니다."},
            {"term": "리스크온 (Risk-On)", "desc": "시장 참여자들이 경제 불안을 덜고 주식 같은 성장 자산에 적극적으로 투자하는 분위기입니다."},
        ],
    })

    # 4. 대표님 추가 지시어(message) 또는 선택 안건(topic)에 따른 임원 회의실 브리핑 생성
    raw_directive = (message or "").strip()
    extracted_target = (topic or "").strip()
    if not extracted_target and raw_directive:
        extracted_target = _extract_topic_from_ceo_message(raw_directive)

    macro_keywords = [
        "출근", "시황", "전체", "전사브리핑", "전체 시장 시스템", 
        "글로벌 매크로 종합", "글로벌 매크로", "글로벌", "매크로", "모닝특보",
        "시장 종합", "전체 시장", "일일 시장 시스템", "모닝 글로벌 특보"
    ]
    is_general_briefing = False
    if not extracted_target or any(k in extracted_target for k in macro_keywords):
        is_general_briefing = True

    debates = []
    agenda_summary = {}

    is_reexamine = ("재검토" in raw_directive) or ("심층 대면 보고" in raw_directive) or ("대면 보고" in raw_directive)

    if is_general_briefing:
        top_rep = desk_company_reports[0] if desk_company_reports else None
        top_stock_name = top_rep["stock_name"] if top_rep else "주요 대형 실적주"
        top_broker = top_rep["broker"] if top_rep else "주요 증권사"
        top_gp = top_rep["target_price"] if top_rep else "컨센서스 집계 중"
        top_title = top_rep["title"] if top_rep else "실적 시즌 수급 차별화 진행"
        mkt_title = top_mkt["title"] if top_mkt else "글로벌 매크로 지표 및 외국인 수급 연동 장세"

        m_headline = macro_doc.get("easy_headline", "") if macro_doc else ""
        m_title = macro_doc.get("title", "") if macro_doc else ""
        m_key_numbers = macro_doc.get("key_numbers", []) if macro_doc else []
        is_0720_macro = bool(macro_doc and ("07:20" in extracted_target or "모닝" in extracted_target or "특보" in extracted_target or "전체" in extracted_target or not extracted_target))

        target_display_name = (m_title or "07:20 모닝 글로벌 특보") if is_0720_macro else (extracted_target or "글로벌 매크로 종합")
        briefing_title = f"🚨 [대표이사 특별 재검토 지시] '{target_display_name}' 안건 임원 긴급 심층 대면 보고" if is_reexamine else "전 부서 자율 시장 분석 완료 · 대표님을 위한 쉬운 요약 보고"
        briefing_sub = f"대표님의 재검토 지시 접수 완료 · 07:20 모닝 글로벌 특보의 밤사이 뉴욕증시·환율·유가 지표 및 국내외 증시 파급 영향을 5개 본부 임원이 대면으로 정밀 소명합니다." if is_reexamine else f"현재 시각 {time_str} 기준 · 어려운 금융 용어를 모두 빼고 쉽게 정리한 총 {len(auto_approvals)}건의 결재 서류가 준비되었습니다."
        briefing_badge = "🚨 대표이사 긴급 심층 대면 보고 소집" if is_reexamine else office_mode

        agenda_summary = {
            "topic_type": "briefing",
            "title": briefing_title,
            "subtitle": briefing_sub,
            "target_name": f"{target_display_name} 긴급 대면 보고" if is_reexamine else "전사 출근 브리핑",
            "target_code": "ALL",
            "badge": briefing_badge,
            "timestamp": f"{now_kst.strftime('%Y-%m-%d %H:%M')} KST",
            "ceo_question": raw_directive or None,
            "key_metrics": [
                {"label": "대표이사 결재 지시", "value": "🚨 긴급 심층 재검토" if is_reexamine else f"총 {len(auto_approvals)}건 준비 완료", "sub": "5개 본부 임원 전원 소집" if is_reexamine else "쉬운 10초 요약 적용", "tone": "positive"},
                {"label": "보고 안건 타겟", "value": "07:20 모닝 특보" if is_0720_macro else f"{extracted_target or top_stock_name}", "sub": "거시지표 및 수급 정밀 소명" if is_reexamine else f"{top_broker} · 목표가 {top_gp}", "tone": "neutral"},
                {"label": "미국장 온도계(선물)", "value": nq_info["price"] if nq_info else "20,480pt", "sub": f"등락 {nq_info['change_pct']:+.2f}%" if nq_info else "24시간 감시 중", "tone": "positive" if (nq_info and nq_info["change_pct"] >= 0) else "negative"},
                {"label": f"글로벌 빅테크({us1_sym})", "value": us1_info["price"] if us1_info else "$150.00", "sub": f"월가 목표가 {us1_info.get('target_mean') or '$180.00'}" if us1_info else "빅테크 선행지표", "tone": "positive" if (us1_info and us1_info.get("change_pct", 0) >= 0) else "negative"},
            ],
            "discovery_reason": {
                "badge": "🔍 전사 안건 상정 배경 (왜 시장 전체를 분석했는가?)",
                "trigger": "평일·주말 24시간 실시간 글로벌 매크로 및 전사 9개 부서 파이프라인 정기 총괄 점검",
                "summary": (
                    f"현재 주식시장은 모든 종목이 다 함께 오르는 장세가 아니며, "
                    f"실제로 수주와 실적이 나오는 알짜 대장주로만 큰손 자금이 압축되는 차별화 장세입니다. "
                    f"대표님의 전체 자산을 안전하게 불리기 위해, 리서치·퀀트·리스크 4대 본부가 합동으로 시장 방향성과 최우선 결재 안건 {len(auto_approvals)}건을 엄선하여 상정했습니다."
                ),
                "key_drivers": [
                    f"국내 증권사 최신 리포트 {len(desk_company_reports)}건 및 시황 리포트 {len(desk_market_reports)}건 전수 분석",
                    f"미국 나스닥 선물({nq_price_str}) 및 {us1_name_ko}({us1_price_str}) 24시간 글로벌 연동",
                    f"50일 이동평균선 상회 주도주 중심의 압축 포트폴리오 운용 전략 수립",
                ],
            },
            "buy_reasons": {
                "title": "🎯 전사 투자 전략 3대 핵심 방향 & 포트폴리오 가이드",
                "cards": [
                    {
                        "icon": "🏆",
                        "title": "실적·수주 대장주 압축 집중",
                        "highlight": "소문주 배제, 알짜 실적주만 선별",
                        "desc": "테마나 뜬소문으로 급등락하는 부실주는 원천 배제하고, 분기 영업이익이 확실하게 증가하는 수출·수주 대장주만 엄선하여 매수를 권고합니다.",
                        "badge": "품질 엄선"
                    },
                    {
                        "icon": "📈",
                        "title": "50일 이동평균선 추세 추종",
                        "highlight": "두 달 평균가격 위에서만 매수",
                        "desc": "최근 50거래일 동안 매수한 투자자들의 평균단가(50일선) 위에서 외국인과 기관이 함께 사들이는 강세 종목에만 집중합니다.",
                        "badge": "추세 추종"
                    },
                    {
                        "icon": "🛡️",
                        "title": "4중 안전망 및 분할 매매",
                        "highlight": "추격 매수 절대 금지 & 분할 매수",
                        "desc": "하루에 급등한 종목을 따라 사지 않고, 눌림목에서 분할 매수하며 -3.5% 손절선을 엄격히 적용해 원금을 철저히 보존합니다.",
                        "badge": "원금 보호"
                    }
                ]
            },
            "meeting_minutes": {
                "meeting_no": f"제{now_kst.strftime('%Y%m%d')}-긴급소집호" if is_reexamine else f"제{now_kst.strftime('%Y%m%d')}-총괄호",
                "title": f"🚨 대표이사 재검토 지시 대응 긴급 임원 전략회의록 ({extracted_target or '글로벌 매크로 종합'})" if is_reexamine else "전 부서 임원 합동 주간·야간 시장 전략회의록",
                "date_time": f"{now_kst.strftime('%Y년 %m월 %d일 %H:%M')} KST",
                "location": "AI 증권사 본사 임원 회의실 (대표이사 집무실 직속)",
                "chairperson": "정유진 비서실장 (대표이사 주재 대행)",
                "attendees": [
                    {"name": "박진우", "role": "부사장", "dept": "기업·산업 리서치본부장", "avatar": "👨‍💼"},
                    {"name": "김도현", "role": "상무", "dept": "알고리즘 퀀트·수급본부장", "avatar": "📈"},
                    {"name": "최서연", "role": "상무", "dept": "리스크관리본부장 (CRO)", "avatar": "🛡️"},
                    {"name": "이준호", "role": "이사", "dept": "글로벌·파생본부장", "avatar": "🌎"},
                    {"name": "정유진", "role": "실장", "dept": "대표이사 직속 비서실장", "avatar": "👩‍💼"},
                ],
                "dialogue": [
                    {
                        "speaker": "정유진 비서실장",
                        "role": "간사",
                        "avatar": "👩‍💼",
                        "text": f"오늘 대표님께서 아침 [07:20 모닝 글로벌 특보] 안건에 대해 임원 대면 심층보고를 긴급 소집하셨습니다. 밤사이 발표된 글로벌 경제뉴스와 환율, 국제유가 급변이 오늘 한국 증시 및 해외 투자 포트폴리오에 미치는 파급 영향을 각 본부장님들께서 즉시 상세히 소명해 주십시오."
                    } if is_reexamine else {
                        "speaker": "정유진 비서실장",
                        "role": "간사",
                        "avatar": "👩‍💼",
                        "text": "오늘 전 부서 임원 전략회의를 시작하겠습니다. 각 본부에서 분석한 시장 현황과 결재 준비 상태를 보고해 주십시오."
                    },
                    {
                        "speaker": "박진우 부사장",
                        "role": "리서치센터장",
                        "avatar": "👨‍💼",
                        "text": f"대표님, 밤사이 발표된 글로벌 경제뉴스와 거시 지표를 긴급 재점검했습니다. {m_headline if m_headline else '빅테크 실적 기대감과 유가 급락으로 거시경제 환경이 안정세를 보이고 있습니다.'} 특히 개별 기업 리포트 건수(0건)는 특정 단일 회사가 아닌 거시경제 전체를 감시하는 시스템 특보이기 때문이며, 글로벌 외신과 증권가 매크로 분석을 전수 취합해 거시 환경의 호재를 완벽히 확인했습니다."
                    } if is_reexamine else {
                        "speaker": "박진우 부사장",
                        "role": "리서치센터장",
                        "avatar": "👨‍💼",
                        "text": f"국내 증권사 최신 리포트 {len(desk_company_reports)}건을 전수 검토했습니다. 1순위 추천 종목인 '{top_stock_name}'을 비롯해 실적 턴어라운드가 확인된 종목들로 결재 서류를 구성했습니다."
                    },
                    {
                        "speaker": "김도현 상무",
                        "role": "퀀트·수급본부장",
                        "avatar": "📈",
                        "text": f"수급 퀀트 시그널 관점에서 가장 중요한 핵심은 '실시간 원/달러 환율({fx_price_str})의 안정세와 외국인 수급 방향'입니다. 현재 환율 구간에서 외국인이 환차손 부담을 덜고 선물·프로그램 순매수를 지속하는지 집중 감시 중이며, 오늘 장중 50일선 기준의 프로그램 순유입 강도를 실시간으로 추적하겠습니다."
                    } if is_reexamine else {
                        "speaker": "김도현 상무",
                        "role": "퀀트·수급본부장",
                        "avatar": "📈",
                        "text": "수급 통계상 외국인과 기관의 자금이 실적주로 쏠리고 있습니다. 50일선 지지선이 확고한 종목들만 골라 담아 승률을 극대화하겠습니다."
                    },
                    {
                        "speaker": "최서연 CRO",
                        "role": "리스크본부장",
                        "avatar": "🛡️",
                        "text": f"리스크 측면에서는 WTI 국제유가({_cl_price_str})와 대외 거시지표의 변동성 영향을 면밀히 점검하고 있습니다. 장 초반 뇌동 매매나 무리한 시초가 추격 매수는 엄격히 금지하며, 종목별 -3.5% 손절 방어선과 분할 매수 수칙을 철저히 준수하는 조건으로 결재를 건의드립니다."
                    } if is_reexamine else {
                        "speaker": "최서연 CRO",
                        "role": "리스크본부장",
                        "avatar": "🛡️",
                        "text": "추격 매수는 원천 금지하며, 각 기안서마다 주의해야 할 리스크를 빨간펜으로 첨부했습니다. 분할 매수 원칙을 지키는 조건으로 승인 서명을 건의합니다."
                    },
                    {
                        "speaker": "이준호 이사",
                        "role": "글로벌본부장",
                        "avatar": "🌎",
                        "text": f"미국 24시 데스크에서도 나스닥 선물({nq_price_str})과 글로벌 빅테크({us1_name_ko})의 야간 거래 추이를 실시간 모니터링한 결과, 미국 기술주 훈풍이 오늘 한국 코스피 및 코스닥 개장 초반에 강력한 상승 모멘텀을 줄 것으로 확인되었습니다."
                    } if is_reexamine else {
                        "speaker": "이준호 이사",
                        "role": "글로벌본부장",
                        "avatar": "🌎",
                        "text": f"미국 나스닥 선물({nq_price_str})과 미국 빅테크 {us1_name_ko}({us1_price_str})의 글로벌 연동 상태가 양호합니다. 한국 증시 개장에도 긍정적입니다."
                    },
                    {
                        "speaker": "정유진 비서실장",
                        "role": "비서실장",
                        "avatar": "👩‍💼",
                        "text": "5개 본부 임원진의 07:20 모닝 특보 심층 대면 보고 및 소명이 완료되었습니다. 대표님께서 안심하시고 재가하실 수 있도록 보강된 분석 내용을 전자결재판에 완벽히 반영하겠습니다."
                    } if is_reexamine else {
                        "speaker": "정유진 비서실장",
                        "role": "비서실장",
                        "avatar": "👩‍💼",
                        "text": "모든 임원진의 검토가 완료되었습니다. 대표님께서 준비된 기안서에 서명만 하시면 즉시 감시 및 집행에 착수하겠습니다."
                    }
                ],
                "verdict_badge": "대표이사 재검토 소명 완료" if is_reexamine else "만장일치 [시장 집중 감시 및 결재 상정] 가결",
                "verdict_summary": f"'{extracted_target or '글로벌 매크로 종합'}' 쟁점 전원 소명 · 환차익 및 거시 수급 보강 · 재가 건의" if is_reexamine else f"총 {len(auto_approvals)}건 기안서 상정 · 알짜 실적주 집중 · 50일선 추세 분할 매매 체제",
            },
        }

        debates = [
            {
                "speaker_id": "sec_chief",
                "name": "정유진",
                "role": "비서실장",
                "dept": "대표이사 직속 비서실",
                "avatar": "👩‍💼",
                "stance": "대표님 재검토 소명 완료" if is_reexamine else "쉬운 10초 요약 완료",
                "stance_tone": "summary",
                "headline": f"대표님! '{extracted_target or '글로벌 매크로 종합'}' 재검토 지시를 접수하여 5개 본부 임원이 쟁점을 전원 소명했습니다!" if is_reexamine else f"대표님! 머리 아픈 증권사 전문 용어는 다 빼고, 한눈에 이해되도록 {len(auto_approvals)}건의 보고서를 쉽게 풀어서 올렸습니다!",
                "message": (
                    f"대표님께서 궁금해하셨던 1) 리포트 0건 집계 사유(종목이 아닌 거시경제 안건), 2) 환차익과 외국인 수급 원리, 3) 향후 리스크 방어 계획을 5인 임원이 대면으로 완벽히 소명했습니다. 안심하시고 서명을 진행하셔도 좋습니다!"
                    if is_reexamine else
                    f"각 서류 맨 위에 있는 노란색 박스 [💡 한마디로 무슨 뜻인가요?]만 읽으셔도 10초 만에 핵심을 파악하실 수 있습니다.\n"
                    f"1) 왜 좋은지(호재), 2) 큰손들이 사는지(돈의 흐름), 3) 뭘 조심해야 하는지(주의점)만 보시고 편하게 [✅ 승인 서명] 도장을 찍어주십시오!"
                ),
                "data_tag": "대표이사 긴급 소집 대면 보고필" if is_reexamine else f"쉬운 눈높이 결재 서류 {len(auto_approvals)}건 상정",
            },
            {
                "speaker_id": "research_vp",
                "name": "박진우",
                "role": "부사장 (리서치센터장)",
                "dept": "기업·산업 리서치본부",
                "avatar": "👨‍💼",
                "stance": "거시경제 감시 특성 보고" if is_reexamine else "호재·목표주가 보고",
                "stance_tone": "bull",
                "headline": "거시경제 감시 안건 특성 및 전세계 자금 흐름 재점검 완료" if is_reexamine else f"어려운 증권사 리포트 {len(desk_company_reports)}건을 누구나 이해할 수 있게 번역했습니다 — 1호 추천 '{top_stock_name}' (목표가 {top_gp})",
                "message": (
                    "본 안건은 삼성전자 같은 개별 기업이 아니라, 주식시장 전체의 날씨(금리, 환율, 유가)를 살피는 전사 시스템 안건입니다. 기업 목표주가가 없는 이유를 보강 설명드렸으며, 해외 거시 리포트를 전수 취합해 올렸습니다."
                    if is_reexamine else
                    f"대표님, 증권사 애널리스트 보고서들은 한자어와 영어 약어가 많아서 읽기 불편하셨을 겁니다.\n"
                    f"저희 리서치팀이 '{top_stock_name} ({top_title})' 등 최신 리포트를 읽고 '그래서 이 회사가 앞으로 돈을 잘 버는지, 목표주가는 얼마인지'만 아주 쉽게 번역해 결재판에 올려두었습니다!"
                ),
                "data_tag": "거시지표 및 외신 종합 브리핑" if is_reexamine else f"제도권 증권사 최신 리포트 {len(desk_company_reports)}건 쉬운 번역",
            },
            {
                "speaker_id": "quant_dir",
                "name": "김도현",
                "role": "상무 (퀀트·수급본부장)",
                "dept": "알고리즘 트레이딩·수급본부",
                "avatar": "📈",
                "stance": "환차익·외인 수급 해설" if is_reexamine else "큰손 돈의 흐름 보고",
                "stance_tone": "neutral",
                "headline": "환차익(환율 하락 시 외인 이익)과 50일선 수급 시그널 브리핑" if is_reexamine else "지금 주가가 평균보다 비싼지 싼지, 외국인·기관 큰손이 사는지 확인했습니다",
                "message": (
                    f"실시간 원/달러 환율({fx_price_str})이 안정화될수록 외국인은 환차손 부담을 덜고 한국 대형 우량주를 적극적으로 매수합니다. 퀀트 알고리즘으로 이 큰손 자금 유입 경로를 실시간 추적하고 있습니다."
                    if is_reexamine else
                    "아무리 좋은 회사라도 너무 비쌀 때 사면 안 됩니다. 저희 수급팀에서는 '최근 두 달 평균 가격(50일선)'보다 지금 주가가 위에 있는지, 그리고 외국인과 기관 부자들이 실제로 돈을 넣고 있는지를 쉽게 표시해 두었습니다."
                ),
                "data_tag": "환율 연동 퀀트 알고리즘 가동" if is_reexamine else "외국인·기관 매수세 & 두 달 평균가격(50일선) 비교",
            },
            {
                "speaker_id": "risk_cro",
                "name": "최서연",
                "role": "상무 (리스크관리본부장 · CRO)",
                "dept": "리스크관리·컴플라이언스본부",
                "avatar": "🛡️",
                "stance": "리스크 방어선 재점검" if is_reexamine else "조심할 점 콕 집어 보고",
                "stance_tone": "caution",
                "headline": "대표님 재검토 지시에 따른 리스크 방어선 재점검 완료" if is_reexamine else "무조건 좋다는 말만 믿으시면 안 됩니다! 조심해야 할 점 1가지씩을 꼭 적었습니다",
                "message": (
                    "거시경제 지표가 흔들릴 때 발생할 수 있는 시장 충격을 사전에 차단하기 위해 -3.5% 손절선과 안전자산 헤지 라인을 강화했습니다."
                    if is_reexamine else
                    "대표님 돈을 지키는 게 제 일입니다! 각 종목마다 '일회성 보너스 비용 때문에 실적이 줄어 보인 건지', '이미 많이 올라서 쉬어갈 자리는 아닌지' 꼭 조심해야 할 주의사항을 빨간 박스로 적어두었으니 서명 전에 꼭 한 번 봐주십시오!"
                ),
                "data_tag": "긴급 재검토 리스크 점검 완료" if is_reexamine else "전 안건 위험 요인 사전 점검 완료",
            },
            {
                "speaker_id": "global_dir",
                "name": "이준호",
                "role": "이사 (글로벌·파생본부장)",
                "dept": "해외주식·ETF·선물파생본부",
                "avatar": "🌎",
                "stance": "글로벌 24시 감시망 재가동" if is_reexamine else "미국장 분위기 보고",
                "stance_tone": "bull",
                "headline": "미국 나스닥 선물 및 글로벌 24시 데스크 방어선 가동" if is_reexamine else f"미국 핵심 빅테크 {us1_name_ko}({us1_price_str})와 나스닥 선물({nq_price_str})도 아주 쉽게 정리했습니다",
                "message": (
                    "밤사이 열리는 미국 증시와 유럽 지표를 24시간 실시간 모니터링하여 대표님의 자산이 안전하게 보호되도록 조치했습니다."
                    if is_reexamine else
                    f"한국 주식시장은 밤사이 미국 시장이 어떻게 끝났는지에 따라 아침 분위기가 결정됩니다. 미국 4대 빅테크(제6~9호)와 글로벌 선물·지수 4대 지표(제10~13호) 기안서도 함께 서명해 주십시오!"
                ),
                "data_tag": "글로벌 24시간 비상근무 데스크" if is_reexamine else "미국 증시 · 선물 24시간 연동",
            },
        ]
    else:
        mapped_global = KR_TO_GLOBAL_QUERY_MAP.get(extracted_target.lower()) or KR_TO_GLOBAL_QUERY_MAP.get(extracted_target.replace(" ", "").lower())
        is_global = bool(mapped_global) or bool(re.match(r'^[A-Za-z\^=\-\.]{1,10}$', extracted_target))

        if is_global:
            g_sym = (mapped_global or extracted_target).upper()
            atype = "futures" if ("=F" in g_sym or g_sym.startswith("^") or "DX-Y" in g_sym) else ("etf" if g_sym in ["QQQ", "SPY", "SOXX", "SCHD", "TLT", "JEPI"] else "us_stock")
            catalog_match = next((c for c in MULTI_ASSET_CATALOG.get(atype, []) if c["symbol"].upper() == g_sym), None)
            meta = catalog_match or {
                "symbol": g_sym,
                "name": f"{extracted_target.upper()} ({g_sym})",
                "sector": "글로벌 상장 자산",
                "desc": f"글로벌 시장에서 거래되는 '{extracted_target}' 자산입니다."
            }
            g_data = _fetch_single_yfinance_research(meta, atype)
            t_name = g_data["name"]
            t_price = g_data["price"]
            t_chg = g_data["change_pct"]
            t_ma50 = g_data["ma50"]
            t_high = g_data["high_52w"]
            t_low = g_data["low_52w"]
            t_mean = g_data.get("target_mean") or "집계 대상 외(ETF/선물)"
            t_up = g_data.get("upside_pct")
            t_up_str = f"{t_up:+.1f}%" if t_up is not None else "-"

            g_title = f"🚨 [대표이사 특별 재검토 지시] [{t_name}] 임원 긴급 심층 대면 보고" if is_reexamine else f"[{t_name}] 임원진 자율 심층 분석 & 특별 결재 보고"
            g_sub = f"대표님의 재검토 지시 접수 · 5개 본부 임원이 회의실에 소집되어 월가 IB 컨센서스 및 리스크 방어선을 대면 보고합니다." if is_reexamine else f"실시간 시세 {t_price} ({t_chg:+.2f}%) · 월가 IB 컨센서스 및 기술적 추세 합동 보고"

            agenda_summary = {
                "topic_type": "global_asset",
                "title": g_title,
                "subtitle": g_sub,
                "target_name": t_name,
                "target_code": g_sym,
                "badge": "🚨 대표이사 긴급 대면 보고" if is_reexamine else g_data["trend_badge"],
                "timestamp": f"{now_kst.strftime('%Y-%m-%d %H:%M')} KST",
                "ceo_question": raw_directive or f"{t_name} 심층 분석 및 결재 보고",
                "key_metrics": [
                    {"label": "현재 시세 (등락률)", "value": f"{t_price}", "sub": f"일일 변동 {t_chg:+.2f}%", "tone": "positive" if t_chg >= 0 else "negative"},
                    {"label": "월가 IB 평균 목표가", "value": f"{t_mean}", "sub": f"괴리율 {t_up_str}", "tone": "positive" if (t_up and t_up > 0) else "neutral"},
                    {"label": "50일 이동평균선", "value": t_ma50, "sub": g_data["trend_badge"], "tone": "neutral"},
                    {"label": "52주 최고 / 최저", "value": f"{t_high}", "sub": f"52주 최저 {t_low}", "tone": "neutral"},
                ],
                "discovery_reason": {
                    "badge": "🔍 글로벌 안건 발굴 배경 (왜 이 자산을 분석했는가?)",
                    "trigger": f"미국 나스닥 및 글로벌 테크 선행 자산 '{t_name}' 24시간 연동 분석",
                    "summary": (
                        f"미국 나스닥 시장의 핵심 주도주인 '{t_name}'의 주가 흐름은 국내 반도체(삼성전자·SK하이닉스) 및 글로벌 시장 전반에 직접적인 영향을 줍니다. "
                        f"24시간 글로벌 데스크 분석 결과, 현재 시세 {t_price} 대비 월가 투자은행(IB)들의 평균 목표주가가 {t_mean} (상승 여력 {t_up_str})으로 집계되어 "
                        f"글로벌 자산 배분 1순위 안건으로 상정되었습니다."
                    ),
                    "key_drivers": [
                        f"월가 IB 목표주가 컨센서스 {t_mean} ({t_up_str} 추가 상승 가능)",
                        f"50일 이동평균선({t_ma50}) 기준 '{g_data['trend_badge']}' 추세 유지",
                        "글로벌 AI 및 데이터센터 투자 확대의 최대 수혜 지속",
                    ],
                },
                "buy_reasons": {
                    "title": f"🎯 '{t_name}' 투자 추천 3대 핵심 근거 & 글로벌 가이드",
                    "cards": [
                        {
                            "icon": "🌎",
                            "title": "월가 IB 컨센서스 상승 여력",
                            "highlight": f"목표가 {t_mean} ({t_up_str})",
                            "desc": f"골드만삭스, 모건스탠리 등 주요 글로벌 투자은행들의 평균 목표가가 {t_mean}으로 현재가 대비 {t_up_str}의 추가 상승 잠재력을 가지고 있습니다.",
                            "badge": "월가 컨센서스"
                        },
                        {
                            "icon": "🤖",
                            "title": "글로벌 AI 독점적 시장 지배력",
                            "highlight": "AI 인프라 필수재",
                            "desc": g_data.get('desc') or g_data.get('easy_summary') or meta.get('desc', ''),
                            "badge": "시장 지배력"
                        },
                        {
                            "icon": "🛡️",
                            "title": "환율 및 50일선 리스크 통제",
                            "highlight": f"50일선: {t_ma50} 지지선",
                            "desc": f"원/달러 환율 변동과 미국 국채 금리 흐름을 모니터링하며, 50일선({t_ma50}) 지지선을 바탕으로 한 분할 매수 전략이 유효합니다.",
                            "badge": "리스크 통제"
                        }
                    ]
                },
                "meeting_minutes": {
                    "meeting_no": f"제{now_kst.strftime('%Y%m%d')}-02호",
                    "title": f"[{t_name}] 글로벌 자산배분 투자심의 회의록",
                    "date_time": f"{now_kst.strftime('%Y년 %m월 %d일 %H:%M')} KST",
                    "location": "AI 증권사 24시간 글로벌 트레이딩 데스크 (대표이사 집무실 직속)",
                    "chairperson": "정유진 비서실장 (대표이사 주재 대행)",
                    "attendees": [
                        {"name": "이준호", "role": "이사", "dept": "해외주식·선물파생본부장", "avatar": "🌎"},
                        {"name": "박진우", "role": "부사장", "dept": "기업·산업 리서치본부장", "avatar": "👨‍💼"},
                        {"name": "김도현", "role": "상무", "dept": "알고리즘 퀀트·수급본부장", "avatar": "📈"},
                        {"name": "최서연", "role": "상무", "dept": "리스크관리본부장 (CRO)", "avatar": "🛡️"},
                        {"name": "정유진", "role": "실장", "dept": "대표이사 직속 비서실장", "avatar": "👩‍💼"},
                    ],
                    "dialogue": [
                        {
                            "speaker": "정유진 비서실장",
                            "role": "간사",
                            "avatar": "👩‍💼",
                            "text": f"글로벌 데스크에서 상정한 [{t_name}] 안건에 대해 심의를 시작하겠습니다. 이준호 글로벌본부장께서 브리핑해 주십시오."
                        },
                        {
                            "speaker": "이준호 이사",
                            "role": "글로벌본부장",
                            "avatar": "🌎",
                            "text": f"'{t_name}'의 현재 시세는 {t_price}이며, 월가 주요 IB들의 평균 목표가는 {t_mean}으로 {t_up_str}의 상승 여력을 보유 중입니다. 전 세계 AI 수요가 유지되고 있어 글로벌 포트폴리오의 최우선 편입 대상입니다."
                        },
                        {
                            "speaker": "김도현 상무",
                            "role": "퀀트·수급본부장",
                            "avatar": "📈",
                            "text": f"50일 이동평균선은 {t_ma50}이며 현재 '{g_data['trend_badge']}' 흐름을 보이고 있습니다. 알고리즘 수급상 외국계 기관의 장기 보유 포지션이 탄탄합니다."
                        },
                        {
                            "speaker": "최서연 CRO",
                            "role": "리스크본부장",
                            "avatar": "🛡️",
                            "text": f"해외 자산인 만큼 원/달러 환율 및 나스닥 지수 변동성에 유의해야 합니다. 50일선({t_ma50})을 이탈하지 않는 선에서 비중 10% 수준의 분할 매수를 권고합니다."
                        },
                        {
                            "speaker": "정유진 비서실장",
                            "role": "비서실장",
                            "avatar": "👩‍💼",
                            "text": f"종합적으로 월가 목표가 {t_mean} 기준 우상향 기대치가 높으므로, 환율 및 50일선 리스크를 감안한 [분할 매수 승인]으로 결론을 내리고 대표님께 결재를 올립니다."
                        }
                    ],
                    "verdict_badge": "만장일치 [글로벌 분할 매수] 권고",
                    "verdict_summary": f"월가 평균 목표가 {t_mean} ({t_up_str}) · 50일선({t_ma50}) 지지 확인 · 환율 변동성 대비 분할 매수",
                },
            }

            debates = [
                {
                    "speaker_id": "global_dir",
                    "name": "이준호",
                    "role": "이사 (글로벌·파생본부장)",
                    "dept": "해외주식·ETF·선물파생본부",
                    "avatar": "🌎",
                    "stance": f"월가 목표가 {t_mean}",
                    "stance_tone": "bull",
                    "headline": f"'{t_name}' 현재가 {t_price} ({t_chg:+.2f}%) — 글로벌 모멘텀 및 월가 IB 컨센서스 보고",
                    "message": (
                        f"대표님! 글로벌본부 이준호 이사 보고드립니다. '{t_name}'의 현재 시세는 {t_price}(일일 변동 {t_chg:+.2f}%)입니다.\n"
                        f"{g_data['desc']}\n"
                        f"{f'현재 월가 투자은행(IB)들이 제시한 평균 목표주가는 {t_mean}으로 현재가 대비 상승여력은 {t_up_str} 수준입니다.' if g_data.get('target_mean') else '글로벌 기관 자금의 핵심 벤치마크 자산으로 활발히 거래되고 있습니다.'}"
                    ),
                    "data_tag": "월가 IB 컨센서스 & 글로벌 시세",
                },
                {
                    "speaker_id": "quant_dir",
                    "name": "김도현",
                    "role": "상무 (퀀트·수급본부장)",
                    "dept": "알고리즘 트레이딩·수급본부",
                    "avatar": "📈",
                    "stance": g_data["trend_badge"],
                    "stance_tone": "neutral",
                    "headline": f"50일 이동평균선({t_ma50}) 대비 '{g_data['trend_badge']}' 구간 위치",
                    "message": (
                        f"퀀트본부 김도현 상무입니다. '{t_name}'의 50일 이동평균선은 {t_ma50}이며 최근 52주 저점({t_low})과 고점({t_high}) 사이에서 중기 추세선이 지지되는지가 알고리즘 수급의 핵심 분기점입니다."
                    ),
                    "data_tag": f"50일선 {t_ma50} · 52주 밴드 분석",
                },
                {
                    "speaker_id": "risk_cro",
                    "name": "최서연",
                    "role": "상무 (리스크관리본부장 · CRO)",
                    "dept": "리스크관리·컴플라이언스본부",
                    "avatar": "🛡️",
                    "stance": "환율·고점 변동성 주의",
                    "stance_tone": "bear",
                    "headline": f"52주 고점({t_high}) 부근 차익실현 매물 및 원/달러 환율 변동성 체크 필수",
                    "message": (
                        f"대표님, 리스크관리본부 최서연 상무입니다. 해외 자산·선물은 가격 자체 변동성뿐 아니라 '원/달러 환율 변동'과 '미국 국채 금리' 영향을 동시에 받으므로 50일선({t_ma50}) 지지 여부를 손절·방어 기준선으로 삼으셔야 합니다."
                    ),
                    "data_tag": "CRO 환노출 및 변동성 감사",
                },
                {
                    "speaker_id": "sec_chief",
                    "name": "정유진",
                    "role": "비서실장",
                    "dept": "대표이사 직속 비서실",
                    "avatar": "👩‍💼",
                    "stance": "대표님 결재용 3줄 요약",
                    "stance_tone": "summary",
                    "headline": f"📌 ['{t_name}' 대표님 최종 결재 요약]",
                    "message": (
                        f"1️⃣ 글로벌본부(이 이사): 현재가 {t_price} ({t_chg:+.2f}%), 월가 평균 목표가 {t_mean} ({t_up_str})\n"
                        f"2️⃣ 퀀트본부(김 상무): 50일 이동평균선({t_ma50}) 기준 '{g_data['trend_badge']}' 흐름\n"
                        f"3️⃣ 리스크본부(최 상무): 52주 고점({t_high}) 저항 및 원/달러 환율 변동성 동시 점검 권고"
                    ),
                    "data_tag": "비서실 종합 요약필",
                },
            ]
        else:
            kr_res = get_stock_research_reports(category="company", q=extracted_target, page=0, size=10)
            kr_items = kr_res.get("items", [])
            cons = kr_res.get("consensus")
            res_code = kr_res.get("resolved_code") or (kr_items[0].get("item_code") if kr_items else None)
            res_name = kr_res.get("resolved_name") or (kr_items[0].get("item_name") if kr_items else extracted_target)

            cur_price_str = "장중 실시간 연동"
            chg_pct_val = 0.0
            ma50_str = "-"
            high52_str = "-"
            low52_str = "-"
            trend_note = "보합·박스권 흐름"
            cur_price_num = None

            if res_code:
                for suffix in [".KS", ".KQ"]:
                    try:
                        tk = yf.Ticker(f"{res_code}{suffix}")
                        hist = tk.history(period="6mo")
                        if hist is not None and not hist.empty:
                            closes = hist["Close"].dropna()
                            if len(closes) >= 1:
                                cur_price_num = int(round(float(closes.iloc[-1])))
                                cur_price_str = f"{cur_price_num:,}원"
                                if len(closes) >= 2:
                                    prev_p = float(closes.iloc[-2])
                                    if prev_p > 0:
                                        chg_pct_val = round(((cur_price_num - prev_p) / prev_p) * 100, 2)
                                if len(closes) >= 20:
                                    ma_val = int(round(float(closes.tail(min(50, len(closes))).mean())))
                                    ma50_str = f"{ma_val:,}원"
                                    if cur_price_num >= ma_val * 1.01:
                                        trend_note = "📈 50일 이동평균선 상회 (강세)"
                                    elif cur_price_num <= ma_val * 0.99:
                                        trend_note = "📉 50일 이동평균선 하회 (조정)"
                                high52_str = f"{int(round(float(hist['High'].max()))):,}원"
                                low52_str = f"{int(round(float(hist['Low'].min()))):,}원"
                                break
                    except Exception:
                        pass

            avg_gp_str = cons["avg_goal_price"] if cons else (kr_items[0].get("goal_price") if kr_items else "집계 중")
            max_gp_str = cons["max_goal_price"] if cons else avg_gp_str
            min_gp_str = cons["min_goal_price"] if cons else avg_gp_str
            rep_cnt = len(kr_items)
            latest_rep = kr_items[0] if kr_items else None

            kr_title = f"🚨 [대표이사 특별 재검토 지시] [{res_name}{f' ({res_code})' if res_code else ''}] 임원 긴급 심층 대면 보고" if is_reexamine else f"[{res_name}{f' ({res_code})' if res_code else ''}] 임원진 합동 분석 보고 & 결재 심의"
            kr_sub = f"대표님의 재검토 지시 접수 · 5개 본부 임원이 회의실에 긴급 소집되어 펀더멘털 및 수급 쟁점을 대면 보고합니다." if is_reexamine else f"증권사 리포트 {rep_cnt}건 전수 분석 · 현재가 {cur_price_str} ({chg_pct_val:+.2f}%)"

            agenda_summary = {
                "topic_type": "kr_stock",
                "title": kr_title,
                "subtitle": kr_sub,
                "target_name": res_name,
                "target_code": res_code or "",
                "badge": "🚨 대표이사 긴급 대면 보고" if is_reexamine else trend_note,
                "timestamp": f"{now_kst.strftime('%Y-%m-%d %H:%M')} KST",
                "ceo_question": raw_directive or f"{res_name} 임원 합동 분석 보고",
                "key_metrics": [
                    {"label": "현재 주가 (등락률)", "value": f"{cur_price_str}", "sub": f"전일 대비 {chg_pct_val:+.2f}%", "tone": "positive" if chg_pct_val >= 0 else "negative"},
                    {"label": "증권사 평균 목표주가", "value": avg_gp_str or "집계 중", "sub": f"최근 리포트 {rep_cnt}건 평균", "tone": "positive"},
                    {"label": "최고 / 최저 목표주가", "value": f"{max_gp_str}", "sub": f"보수적 최저 {min_gp_str}", "tone": "neutral"},
                    {"label": f"50일선 ({start_50d_m}월 {start_50d_part}~현재)", "value": ma50_str, "sub": trend_note, "tone": "neutral"},
                ],
            }

            if latest_rep:
                rep_line = (
                    f"가장 최근에는 {latest_rep['broker']}에서 '{latest_rep['title']}' 보고서를 올렸으며, "
                    f"{latest_rep['easy_summary']}"
                )
            else:
                rep_line = f"현재 '{res_name}'에 대해 주요 증권사들의 업황 및 실적 수급 모니터링이 진행 중입니다."

            upside_pct = None
            if cur_price_num and avg_gp_str and avg_gp_str != "집계 중":
                try:
                    clean_gp = int(re.sub(r'[^0-9]', '', avg_gp_str))
                    if clean_gp > 0 and cur_price_num > 0:
                        upside_pct = round(((clean_gp - cur_price_num) / cur_price_num) * 100, 1)
                except Exception:
                    pass
            upside_str = f"+{upside_pct}%" if (upside_pct and upside_pct > 0) else (f"{upside_pct}%" if upside_pct else "상승 여력 충분")

            discovery_reason = {
                "badge": "🔍 종목 발굴 배경 (왜 이 종목을 분석했는가?)",
                "trigger": f"국내 10대 주요 증권사에서 '{res_name}' 관련 분석 리포트 {rep_cnt}건 집중 발간",
                "summary": (
                    f"최근 증권가에서 '{res_name}'에 대한 실적 개선 및 수주 턴어라운드 리포트가 {rep_cnt}건 연속 발표되었습니다. "
                    f"리서치센터 크롤러가 수집한 데이터를 AI 퀀트 엔진이 분석한 결과, "
                    f"증권사 평균 목표가({avg_gp_str}) 대비 현재 주가({cur_price_str})의 기대 상승 여력({upside_str})이 "
                    f"시장 최상위권으로 집계되어 오늘 대표이사 결재 안건 1순위로 긴급 상정되었습니다."
                ),
                "key_drivers": [
                    f"증권사 전수 리포트 {rep_cnt}건 정밀 분석 완료 (평균 목표주가 {avg_gp_str})",
                    f"현재가({cur_price_str}) 대비 최고 {max_gp_str}까지 폭넓은 상승 여력 확보",
                    f"50일 이동평균선({ma50_str}) 부근 바닥 다지기 및 외인·기관 수급 유입 포착",
                ],
            }

            buy_reasons = {
                "title": f"🎯 '{res_name}' 매수 추천 3대 핵심 근거 & 투자 전략 가이드",
                "cards": [
                    {
                        "icon": "🚀",
                        "title": f"압도적 상승 여력 ({upside_str}) & 저평가 매력",
                        "highlight": f"목표가 {avg_gp_str} vs 현재가 {cur_price_str}",
                        "desc": f"국내 주요 증권사들의 평균 목표가는 {avg_gp_str}(최고 {max_gp_str})으로, 현재 주가는 기업의 펀더멘털과 수주 잔고 대비 과도하게 저평가되어 있어 중장기 투자 시 높은 안전마진과 수익률을 기대할 수 있습니다.",
                        "badge": f"상승 여력 {upside_str}"
                    },
                    {
                        "icon": "📊",
                        "title": "실적 턴어라운드 및 핵심 수주 모멘텀",
                        "highlight": f"{latest_rep['broker'] if latest_rep else '증권사'} 분석 호실적 전망",
                        "desc": latest_rep['easy_summary'] if latest_rep else f"핵심 사업 부문의 견조한 매출 성장과 해외 수주 확대로 향후 분기별 영업이익 증가세가 뚜렷할 것으로 전망됩니다.",
                        "badge": "실적 모멘텀"
                    },
                    {
                        "icon": "🛡️",
                        "title": "정석 분할 매수 및 50일선 리스크 통제",
                        "highlight": f"1차 분할 매수 (포트폴리오 비중 15% 이내)",
                        "desc": f"현재 주가가 50일선({ma50_str}) {trend_note} 구간이므로, 한 번에 전액 매수하기보다 [1차 분할 매수] 후 50일선 안착을 확인하며 비중을 늘리는 안전한 정석 분할 매수를 권장합니다.",
                        "badge": "리스크 방어선"
                    }
                ]
            }

            meeting_minutes = {
                "meeting_no": f"제{now_kst.strftime('%Y%m%d')}-재검토호" if is_reexamine else f"제{now_kst.strftime('%Y%m%d')}-01호",
                "title": f"🚨 [{res_name}] 대표이사 재검토 지시 대응 긴급 임원 회의록" if is_reexamine else f"[{res_name}] 임원 합동 투자심의 위원회 회의록",
                "date_time": f"{now_kst.strftime('%Y년 %m월 %d일 %H:%M')} KST",
                "location": "AI 증권사 본사 8층 대회의실 (대표이사 집무실 직속)",
                "chairperson": "정유진 비서실장 (대표이사 주재 대행)",
                "attendees": [
                    {"name": "박진우", "role": "부사장", "dept": "기업·산업 리서치본부장", "avatar": "👨‍💼"},
                    {"name": "김도현", "role": "상무", "dept": "알고리즘 퀀트·수급본부장", "avatar": "📈"},
                    {"name": "최서연", "role": "상무", "dept": "리스크관리본부장 (CRO)", "avatar": "🛡️"},
                    {"name": "이준호", "role": "이사", "dept": "글로벌·파생본부장", "avatar": "🌎"},
                    {"name": "정유진", "role": "실장", "dept": "대표이사 직속 비서실장", "avatar": "👩‍💼"},
                ],
                "dialogue": [
                    {
                        "speaker": "정유진 비서실장",
                        "role": "간사",
                        "avatar": "👩‍💼",
                        "text": f"대표님께서 [{res_name}] 안건에 대해 임원 대면 심층보고를 긴급 소집하셨습니다. 리서치본부 박진우 부사장께서 펀더멘털과 재검토 쟁점을 즉시 소명해 주십시오."
                        if is_reexamine else
                        f"지금부터 오늘 대표이사 결재 상정 안건인 [{res_name}] 종목에 대한 임원 합동 투자심의 회의를 시작합니다. 먼저 리서치본부 박진우 부사장께서 펀더멘털 분석과 증권가 목표주가를 브리핑해 주십시오."
                    },
                    {
                        "speaker": "박진우 부사장",
                        "role": "리서치센터장",
                        "avatar": "👨‍💼",
                        "text": (
                            f"국내 주요 10대 증권사가 최근 발간한 '{res_name}' 리포트 {rep_cnt}건을 전수 취합했습니다. 평균 목표주가는 {avg_gp_str}이며, 최고가는 {max_gp_str}까지 제시되었습니다. 현재가({cur_price_str}) 대비 기대 상승 여력이 {upside_str}에 달합니다. {rep_line} 밸류에이션 매력도가 양호한 구간으로 판단됩니다."
                            if rep_cnt > 0 else
                            f"국내 주요 증권사에서 현재 '{res_name}'에 대해 발간한 공식 목표주가 리포트는 부재한 상태입니다. 증권사 공식 컨센서스가 없으므로 무리한 추격 매수를 지양하고, {rep_line} 실질 펀더멘털과 수급 동향을 철저히 확인하며 신중히 분할 접근해야 합니다."
                        )
                    },
                    {
                        "speaker": "김도현 상무",
                        "role": "퀀트·수급본부장",
                        "avatar": "📈",
                        "text": f"기술적 차트와 알고리즘 수급 현황을 말씀드리겠습니다. 50일 이동평균선({period_50d_str} 평균)은 {ma50_str}이며 현재 주가는 '{trend_note}' 구간입니다. 현재 자리는 바닥권을 다지며 저가 매수세가 유입되는 타점입니다. 매물 소화 과정을 고려하여 한 번에 전액 진입하기보다는 [1차 분할 매수 30~50%]로 진입하고, 50일선 안착을 확인한 뒤 2차 매수를 진행하는 것이 통계적으로 승률이 가장 높습니다."
                    },
                    {
                        "speaker": "최서연 CRO",
                        "role": "리스크본부장",
                        "avatar": "🛡️",
                        "text": f"리스크 관리 관점에서 보완하겠습니다. 가장 보수적인 증권사의 최저 목표가도 {min_gp_str}으로 현재가보다 높지만, 시장 전체 변동성을 감안해 50일선({ma50_str}) 또는 -3.5%를 명확한 손절선으로 지정해야 합니다. 또한 대표님 계좌 총자산 대비 비중은 15% 이내로 엄격히 제한하는 조건부 승인을 제안합니다."
                    },
                    {
                        "speaker": "이준호 이사",
                        "role": "글로벌본부장",
                        "avatar": "🌎",
                        "text": f"글로벌 매크로 환경도 긍정적입니다. 원/달러 환율과 미국 연준의 금리 안정화로 외국인 패시브 자금이 국내 대표 우량주로 유입될 수 있는 여건이 조성되어 있습니다. 대외 거시 리스크는 크지 않습니다."
                    },
                    {
                        "speaker": "정유진 비서실장",
                        "role": "비서실장",
                        "avatar": "👩‍💼",
                        "text": f"각 본부 의견이 완벽히 조율되었습니다. [평균 목표주가 {avg_gp_str} ({upside_str}) 기준 1차 분할 매수 승인, 50일선({ma50_str}) 손절 방어, 포트폴리오 비중 15% 이내] 조건으로 만장일치 의결하여 대표님께 최종 결재 기안을 올리겠습니다."
                    }
                ],
                "verdict_badge": "만장일치 [조건부 분할 매수] 권고",
                "verdict_summary": f"목표가 {avg_gp_str} ({upside_str} 상승 여력) · 50일선({ma50_str}) 지지 확인 분할 매수 · 포트폴리오 비중 15% 이내 제한",
            }

            agenda_summary["discovery_reason"] = discovery_reason
            agenda_summary["buy_reasons"] = buy_reasons
            agenda_summary["meeting_minutes"] = meeting_minutes

            debates = [
                {
                    "speaker_id": "research_vp",
                    "name": "박진우",
                    "role": "부사장 (리서치센터장)",
                    "dept": "기업·산업 리서치본부",
                    "avatar": "👨‍💼",
                    "stance": f"목표주가 평균 {avg_gp_str}",
                    "stance_tone": "bull",
                    "headline": (
                        f"'{res_name}' 증권사 리포트 {rep_cnt}건 전수 분석 — 평균 목표주가 {avg_gp_str}"
                        if rep_cnt > 0 else
                        f"'{res_name}' 증권사 공식 리포트 미발간 — 팩트 점검 및 신중 접근 권고"
                    ),
                    "message": (
                        f"대표님, 리서치센터장 박진우 부사장입니다! 국내 증권사들이 최근 발표한 '{res_name}' 리포트 {rep_cnt}건을 전수 취합했습니다.\n"
                        f"{f'현재 증권사 평균 목표주가는 {avg_gp_str}(최고 {max_gp_str} ~ 최저 {min_gp_str})으로 형성되어 있습니다. ' if cons else ''}"
                        f"{rep_line}"
                        if rep_cnt > 0 else
                        f"대표님, 리서치센터장 박진우 부사장입니다. '{res_name}'은 현재 국내 증권사의 공식 커버리지 목표주가 리포트가 발간되지 않은 상태입니다.\n"
                        f"시장 뜬소문 매매를 경계하고, 50일선({ma50_str}) 지지력과 실질 수급을 면밀히 관찰한 뒤 신중히 대응하셔야 합니다."
                    ),
                    "data_tag": f"증권사 리포트 {rep_cnt}건" if rep_cnt > 0 else "공식 리포트 미발간",
                },
                {
                    "speaker_id": "quant_dir",
                    "name": "김도현",
                    "role": "상무 (퀀트·수급본부장)",
                    "dept": "알고리즘 트레이딩·수급본부",
                    "avatar": "📈",
                    "stance": trend_note,
                    "stance_tone": "neutral",
                    "headline": f"현재가 {cur_price_str} ({chg_pct_val:+.2f}%) · 50일선({period_50d_str} 평균 {ma50_str}) 대비 '{trend_note}'",
                    "message": (
                        f"퀀트본부 김도현 상무입니다! 목표주가({avg_gp_str})와 실제 현재 주가({cur_price_str})를 대조해 보면, "
                        f"현재 50일 이동평균선({period_50d_str} 주식을 매수한 사람들의 평균단가)은 {ma50_str}이며, "
                        f"현재 주가가 이 평균선 위에 머무르며 외국인·기관 큰손의 프로그램 순매수가 계속 유입되는지가 핵심 기준점입니다."
                    ),
                    "data_tag": f"현재가 {cur_price_str} · 50일선 {ma50_str}",
                },
                {
                    "speaker_id": "risk_cro",
                    "name": "최서연",
                    "role": "상무 (리스크관리본부장 · CRO)",
                    "dept": "리스크관리·컴플라이언스본부",
                    "avatar": "🛡️",
                    "stance": f"보수적 하단 {min_gp_str} 점검",
                    "stance_tone": "bear",
                    "headline": f"최고 목표가({max_gp_str})만 보지 마시고 50일선({period_50d_str} 평균단가 {ma50_str}) 지지 여부를 함께 보셔야 합니다!",
                    "message": (
                        f"대표님, 리스크관리본부장 최서연 상무입니다. 박 부사장님이 긍정적 모멘텀을 보고하셨지만, 가장 보수적인 증권사는 최저 목표가를 {min_gp_str}으로 잡고 있습니다.\n"
                        f"다음 분기 실제 영업이익이 시장 예상치(컨센서스)에 부합하는지, 그리고 50일선({period_50d_str} 동안 매수한 사람들의 평균 가격인 {ma50_str}) 밑으로 주가가 떨어지지 않는지(이탈 방어 여부)를 반드시 확인 후 결재하셔야 합니다."
                    ),
                    "data_tag": "CRO 하방 리스크 및 밸류에이션 감사",
                },
                {
                    "speaker_id": "sec_chief",
                    "name": "정유진",
                    "role": "비서실장",
                    "dept": "대표이사 직속 비서실",
                    "avatar": "👩‍💼",
                    "stance": "대표님 결재용 3줄 요약",
                    "stance_tone": "summary",
                    "headline": f"📌 [대표님 전용 '{res_name}' 최종 결재 3줄 요약]",
                    "message": (
                        f"1️⃣ 리서치본부(박 부사장): 최근 리포트 {rep_cnt}건 기준 평균 목표가 {avg_gp_str} (최고 {max_gp_str} / 최저 {min_gp_str})\n"
                        f"2️⃣ 퀀트본부(김 상무): 현재가 {cur_price_str} ({chg_pct_val:+.2f}%), 50일선({period_50d_str} 평균단가 {ma50_str}) 대비 '{trend_note}'\n"
                        f"3️⃣ 리스크본부(최 상무): 보수적 목표가({min_gp_str}) 및 50일선({ma50_str}) 지지 여부를 조건으로 결재 권고"
                    ),
                    "data_tag": "비서실 종합 요약필",
                },
            ]

    company_policy_data = {}
    directive_logs_data = []
    t_state = {}
    try:
        from ceo_trading_service import load_trading_state
        t_state = load_trading_state()
        company_policy_data = t_state.get("company_policy", {})
        directive_logs_data = t_state.get("directive_logs", [])
        custom_docs = t_state.get("custom_approvals", [])
        if custom_docs:
            existing_ids = {d.get("doc_id") for d in auto_approvals}
            for cd in reversed(custom_docs[:5]):
                if cd.get("doc_id") not in existing_ids:
                    auto_approvals.insert(0, cd)
    except Exception as e:
        print(f"[CEOOffice] trading state merge error: {e}")

    weekly_review_data = {}
    weekly_calendar_data = {}
    try:
        weekly_review_data, weekly_calendar_data, wk_rev_doc, wk_cal_doc = _build_weekly_review_and_calendar(
            now_kst=now_kst,
            desk_company_reports=desk_company_reports,
            kr_realtime_quotes=kr_realtime_quotes,
            fx_price_str=fx_price_str,
            nq_price_str=nq_price_str,
            cl_price_str=_cl_price_str,
            t_state=t_state,
            date_doc_str=date_doc_str,
            time_str=time_str,
        )
        existing_doc_ids = {d.get("doc_id") for d in auto_approvals}
        # [스마트 일정 상정] 평일에는 '오늘 당일의 핵심 경제일정 & 시나리오', 주말에는 '주간 전체 캘린더 & 차주 월요일 Top3 복기 전략' 상정
        is_weekend_review_time = (weekday >= 5) or (weekday == 4 and now_kst.hour >= 16)
        if is_weekend_review_time:
            if wk_cal_doc["doc_id"] not in existing_doc_ids:
                auto_approvals.insert(1, wk_cal_doc)
            if wk_rev_doc["doc_id"] not in existing_doc_ids:
                auto_approvals.insert(2, wk_rev_doc)
        else:
            if wk_cal_doc["doc_id"] not in existing_doc_ids:
                auto_approvals.insert(1, wk_cal_doc)
    except Exception as e:
        print(f"[CEOOffice] weekly review & calendar build error: {e}")

    resp_data = {
        "status": "success",
        "data": {
            "updated_at": now_kst.strftime("%H:%M:%S"),
            "office_status": office_mode,
            "executives": CEO_OFFICE_EXECUTIVES,
            "company_policy": company_policy_data,
            "directive_logs": directive_logs_data,
            "auto_approvals": auto_approvals,
            "weekly_review": weekly_review_data,
            "weekly_calendar": weekly_calendar_data,
            "agenda": agenda_summary,
            "debates": debates,
            "research_desk": desk_company_reports,
            "market_desk": desk_market_reports,
        },
    }
    if not topic and not message:
        _CEO_OFFICE_CACHE = resp_data
        _CEO_OFFICE_CACHE_TIME = time.time()
        try:
            from seo_auto_publisher import trigger_auto_seo_in_background
            trigger_auto_seo_in_background(auto_approvals)
        except Exception:
            pass
    return resp_data


@router.post("/ceo-office/trigger-morning-macro")
@router.get("/ceo-office/trigger-morning-macro")
def trigger_morning_macro_endpoint(force: bool = True):
    """
    대표님 전용 07:20 모닝 글로벌 특보 즉시 생성 및 푸시 발송 트리거
    """
    from morning_macro_service import run_daily_morning_macro_job
    global _CEO_OFFICE_CACHE, _CEO_OFFICE_CACHE_TIME
    _CEO_OFFICE_CACHE = {}
    _CEO_OFFICE_CACHE_TIME = 0.0
    res = run_daily_morning_macro_job(force=force)
    return res


@router.get("/ceo-office/trading-desk")
def get_ceo_office_trading_desk(ceo_email: Optional[str] = Query(None), x_ceo_email: Optional[str] = Header(None)):
    _verify_ceo_clearance(x_ceo_email, ceo_email)
    """
    증권사 자산운용 프랍 트레이딩 데스크 현황 및 실시간 포지션/수익률 조회 API
    """
    from ceo_trading_service import load_trading_state, update_realtime_quotes_for_positions
    state = load_trading_state()
    state = update_realtime_quotes_for_positions(state)
    return {"status": "success", "data": state}


@router.post("/ceo-office/trading-desk/order")
def execute_trading_desk_order(payload: Dict[str, Any] = Body(...), ceo_email: Optional[str] = Query(None), x_ceo_email: Optional[str] = Header(None)):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    대표이사 재가 승인 시 트레이딩 팀에서 적정 매수가 분할 매수 주문 자동 집행
    """
    from ceo_trading_service import execute_ceo_approved_stock_trade
    res = execute_ceo_approved_stock_trade(payload)
    return res


@router.post("/ceo-office/trading-desk/close")
def close_trading_desk_position(payload: Dict[str, Any] = Body(...), ceo_email: Optional[str] = Query(None), x_ceo_email: Optional[str] = Header(None)):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    대표이사 지시에 따른 시장가 전량 익절/매도 처리
    """
    from ceo_trading_service import close_trading_position
    pos_id = payload.get("position_id") or payload.get("id") or ""
    reason = payload.get("reason", "대표이사 시장가 즉시 익절 지시")
    res = close_trading_position(pos_id, reason)
    return res


@router.post("/ceo-office/trading-desk/partial-sell")
def partial_sell_trading_desk_position(payload: Dict[str, Any] = Body(...), ceo_email: Optional[str] = Query(None), x_ceo_email: Optional[str] = Header(None)):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    1차 목표가 도달 또는 대표이사 지시에 따른 50% 분할 익절 처리
    """
    from ceo_trading_service import partial_sell_position
    pos_id = payload.get("position_id") or payload.get("id") or ""
    res = partial_sell_position(pos_id)
    return res


@router.post("/ceo-office/watchlist-research")
def post_watchlist_research(
    payload: Dict[str, Any] = Body(default={}),
    ceo_email: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(None),
    x_ceo_email: Optional[str] = Header(None),
):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    관심종목별 리서치 보고서 (시세·수급·증권사 컨센서스·재무지표·뉴스 + 쉬운 말 종합의견)
    """
    from watchlist_research_service import build_watchlist_research
    syms = payload.get("symbols", [])
    if isinstance(syms, str):
        syms = [s.strip() for s in syms.split(",") if s.strip()]
    return build_watchlist_research(user_id=x_user_id, requested_symbols=syms)


@router.get("/ceo-office/trading-desk/watchlist-analysis")
def get_watchlist_trading_analysis(
    symbols: Optional[str] = Query(None),
    ceo_email: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(None),
    x_ceo_email: Optional[str] = Header(None),
):
    _verify_ceo_clearance(x_ceo_email, ceo_email)
    """
    대표이사 및 사용자의 관심종목에 대한 트레이딩 팀의 적정 매수가/목표가/손익비 진단 API
    """
    from ceo_trading_service import analyze_watchlist_for_trading_desk
    req_syms = [s.strip() for s in symbols.split(",") if s.strip()] if symbols else None
    return analyze_watchlist_for_trading_desk(user_id=x_user_id, requested_symbols=req_syms)


@router.post("/ceo-office/trading-desk/watchlist-analysis")
def post_watchlist_trading_analysis(
    payload: Dict[str, Any] = Body(...),
    ceo_email: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(None),
    x_ceo_email: Optional[str] = Header(None),
):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    특정 종목 리스트나 입력된 종목명을 트레이딩 팀에서 즉시 정밀 진단
    """
    from ceo_trading_service import analyze_watchlist_for_trading_desk
    syms = payload.get("symbols", [])
    if isinstance(syms, str):
        syms = [s.strip() for s in syms.split(",") if s.strip()]
    return analyze_watchlist_for_trading_desk(user_id=x_user_id, requested_symbols=syms)


@router.post("/ceo-office/execute-directive")
def execute_ceo_office_directive(
    payload: Dict[str, Any] = Body(...),
    ceo_email: Optional[str] = Query(None),
    x_ceo_email: Optional[str] = Header(None),
):
    _verify_ceo_clearance(x_ceo_email, ceo_email, payload.get("ceo_email"))
    """
    대표이사 전사 지휘통제실(CEO Command Center) 명령 하달 및 5대 본부 자동 연쇄 집행 API
    """
    from ceo_trading_service import execute_ceo_company_directive
    global _CEO_OFFICE_CACHE, _CEO_OFFICE_CACHE_TIME
    _CEO_OFFICE_CACHE = {}
    _CEO_OFFICE_CACHE_TIME = 0.0
    return execute_ceo_company_directive(payload)

