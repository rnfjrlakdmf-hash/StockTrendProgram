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
                add_result(ticker, names[0], "Global")
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

    def fetch_insight(sym):
        cached = PRO_INSIGHTS_CACHE.get(sym)
        if cached and (now - cached[0] < PRO_INSIGHTS_TTL):
            return sym, cached[1]

        clean_code = re.sub(r'[^0-9A-Z]', '', sym.split('.')[0])
        insight = {
            "symbol": sym,
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
            if len(clean_code) == 6 and clean_code.isdigit():
                # 국내 주식 네이버 금융 공개 데이터
                url = f"https://m.stock.naver.com/api/stock/{clean_code}/integration"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                res = requests.get(url, headers=headers, timeout=4)
                if res.status_code == 200:
                    rjson = res.json()
                    deal_trends = rjson.get('dealTrendInfos', [])
                    consensus = rjson.get('consensusInfo') or {}
                    total_infos = {info['code']: info.get('value') for info in rjson.get('totalInfos', []) if 'code' in info}

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

                    insight.update({
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
                # 해외/미국 주식
                import yfinance as yf
                ticker = yf.Ticker(sym)
                info = ticker.fast_info
                target_p = None
                try:
                    target_p = ticker.info.get('targetMeanPrice')
                except: pass
                
                tags = []
                if target_p:
                    tags.append(f"🎯 월가 목표가 ${target_p:.2f}")

                insight.update({
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
def get_watchlist_events(symbols: str = ""):
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

    return {
        "status": "success",
        "data": final_events,
        "upcoming_count": len(future_events),
        "recent_count": len(past_events),
        "fetched": len(symbol_list),
        "total_count": len(final_events)
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
