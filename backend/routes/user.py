from fastapi import APIRouter, Header, Query, Response
from pydantic import BaseModel
from typing import Optional, List
import urllib.parse

router = APIRouter()

class WatchlistRequest(BaseModel):
    symbol: str
    price: Optional[float] = None
    quantity: Optional[float] = None

class MigrateRequest(BaseModel):
    guest_id: str
    target_id: str

@router.post("/watchlist/migrate")
def migrate_watchlist_api(req: MigrateRequest):
    from db_manager import migrate_watchlist
    success = migrate_watchlist(req.guest_id, req.target_id)
    return {"status": "success" if success else "error"}

@router.get("/watchlist")
def read_watchlist(response: Response, x_user_id: str = Header(None)):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    from db_manager import get_watchlist
    user_id = x_user_id or "guest"
    print(f"[Watchlist] Reading for user: {user_id}")
    items = get_watchlist(user_id)
    print(f"[Watchlist] Found {len(items)} items for {user_id}")
    
    from stock_data import GLOBAL_KOREAN_NAMES, NAME_CACHE, get_korean_stock_name
    import concurrent.futures

    try:
        from stock_names import STOCK_MAP
        local_code_to_name = {v: k for k, v in STOCK_MAP.items() if isinstance(v, str)}
    except Exception:
        local_code_to_name = {}

    data = []
    
    # 1단계: 로컬 맵핑 및 캐시를 통해 최대한 빨리 이름 찾기
    missing_symbols = []
    for row in items:
        sym = row[0]
        base_sym = sym.split(".")[0]
        name = sym
        
        if sym in GLOBAL_KOREAN_NAMES:
            names = GLOBAL_KOREAN_NAMES[sym]
            name = names[0] if isinstance(names, list) else names
        elif sym in local_code_to_name:
            name = local_code_to_name[sym]
        elif base_sym in local_code_to_name:
            name = local_code_to_name[base_sym]
        elif sym in NAME_CACHE:
            name = NAME_CACHE[sym]
        else:
            # 매핑도 없고 캐시도 없는 경우 외부 조회가 필요함
            missing_symbols.append(sym)
            name = sym # 일단 기본값

        data.append({
            "symbol": sym, 
            "name": name, 
            "added_price": row[1] if len(row) > 1 else 0,
            "quantity": row[2] if len(row) > 2 else 0,
            "purchases": row[3] if len(row) > 3 else []
        })

    # 2단계: 누락된 종목 이름 병렬 조회 (최초 1회만 느리고 이후엔 빠름)
    if missing_symbols:
        print(f"[Watchlist] Fetching names for missing symbols: {missing_symbols}")
        def fetch_name(s):
            try:
                res = get_korean_stock_name(s)
                if res: return s, res
            except: pass
            return s, s
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(missing_symbols), 10)) as executor:
            future_to_sym = {executor.submit(fetch_name, s): s for s in missing_symbols}
            for future in concurrent.futures.as_completed(future_to_sym):
                s, fetched_name = future.result()
                NAME_CACHE[s] = fetched_name
                # data 배열 업데이트
                for d in data:
                    if d["symbol"] == s:
                        d["name"] = fetched_name

    return {"status": "success", "data": data, "user_id_echo": user_id}

@router.get("/watchlist/closing-summary")
def get_watchlist_closing_summary(x_user_id: str = Header(None)):
    """[NEW] 장마감 요약 전용 API - ClosingBanner.tsx 대응 (Parallel Optimized)"""
    from db_manager import get_watchlist
    from stock_data import get_simple_quote, get_korean_stock_name
    from concurrent.futures import ThreadPoolExecutor
    
    user_id = x_user_id or "guest"
    items = get_watchlist(user_id)
    symbols = [i[0] for i in items]
    
    if not symbols:
        return {"status": "success", "data": []}

    def fetch_quote_enriched(sym):
        try:
            quote = get_simple_quote(sym)
            if quote:
                return {
                    "symbol": sym,
                    "name": get_korean_stock_name(sym) or sym,
                    "price": quote.get("price", "0"),
                    "change": quote.get("change", "0.00%"),
                    "currency": "KRW" if sym.isdigit() else "USD"
                }
        except: pass
        return None

    with ThreadPoolExecutor(max_workers=max(len(symbols), 1)) as executor:
        results = list(executor.map(fetch_quote_enriched, symbols))
    
    final_data = [r for r in results if r]
    return {"status": "success", "data": final_data}

@router.post("/watchlist")
def create_watchlist(req: WatchlistRequest, response: Response, x_user_id: str = Header(None)):
    response.headers["Cache-Control"] = "no-store"
    try:
        from db_manager import add_watchlist
        from stock_data import get_simple_quote
        
        user_id = x_user_id or "guest"
        
        # 추가 시점의 가격 가져오기 (보다 견고한 파싱)
        current_price = 0
        if req.price is not None:
            current_price = float(req.price)
        else:
            try:
                quote = get_simple_quote(req.symbol)
                if quote and quote.get('price'):
                    # 숫자가 아닌 문자(통화기호 등) 제거 후 파싱
                    import re
                    p_raw = str(quote['price']).replace(',', '')
                    p_clean = re.sub(r'[^0-9.]', '', p_raw)
                    if p_clean:
                        current_price = float(p_clean)
            except Exception as e:
                print(f"[Watchlist-Price-Fetch-Error] {e}")

        current_quantity = 0
        if hasattr(req, 'quantity') and req.quantity is not None:
            current_quantity = float(req.quantity)

        success = add_watchlist(user_id, req.symbol, current_price, current_quantity)
        if success:
            from utils.briefing_store import invalidate_today_briefing
            invalidate_today_briefing(user_id)
        return {"status": "success" if success else "error"}
    except Exception as e:
        print(f"[Watchlist-Error] {e}")
        return {"status": "error", "message": str(e)}

@router.delete("/watchlist/{symbol}")
def delete_watchlist(symbol: str, x_user_id: str = Header(None)):
    from db_manager import remove_watchlist
    user_id = x_user_id or "guest"
    decoded_symbol = urllib.parse.unquote(symbol)
    remove_watchlist(user_id, decoded_symbol)
    from utils.briefing_store import invalidate_today_briefing
    invalidate_today_briefing(user_id)
    return {"status": "success"}

@router.get("/watchlist/purchases")
def get_watchlist_purchases_api(symbol: str, x_user_id: str = Header(None)):
    from db_manager import get_watchlist_purchases
    user_id = x_user_id or "guest"
    decoded_symbol = urllib.parse.unquote(symbol)
    data = get_watchlist_purchases(user_id, decoded_symbol)
    return {"status": "success", "data": data}

class WatchlistPurchaseRequest(BaseModel):
    symbol: str
    buy_price: float
    quantity: float

@router.post("/watchlist/purchases")
def add_watchlist_purchase_api(req: WatchlistPurchaseRequest, x_user_id: str = Header(None)):
    from db_manager import add_watchlist_purchase_record
    user_id = x_user_id or "guest"
    success = add_watchlist_purchase_record(user_id, req.symbol, req.buy_price, req.quantity)
    if success:
        from utils.briefing_store import invalidate_today_briefing
        invalidate_today_briefing(user_id)
    return {"status": "success" if success else "error"}

@router.delete("/watchlist/purchases/{purchase_id}")
def delete_watchlist_purchase_api(purchase_id: int, symbol: str, x_user_id: str = Header(None)):
    from db_manager import delete_watchlist_purchase_record
    user_id = x_user_id or "guest"
    decoded_symbol = urllib.parse.unquote(symbol)
    success = delete_watchlist_purchase_record(user_id, decoded_symbol, purchase_id)
    if success:
        from utils.briefing_store import invalidate_today_briefing
        invalidate_today_briefing(user_id)
    return {"status": "success" if success else "error"}

@router.get("/portfolio")
def read_user_portfolio(x_user_id: str = Header(None)):
    from db_manager import get_user_portfolio
    user_id = x_user_id or "guest"
    return {"status": "success", "data": get_user_portfolio(user_id)}

class PortfolioEntry(BaseModel):
    symbol: str
    price: str | float
    quantity: str | float

@router.post("/portfolio")
def create_portfolio_entry(req: PortfolioEntry, x_user_id: str = Header(None)):
    from db_manager import save_user_portfolio
    user_id = x_user_id or "guest"
    
    # Clean strings (remove commas)
    try:
        clean_price = float(str(req.price).replace(',', ''))
        clean_qty = float(str(req.quantity).replace(',', ''))
        success = save_user_portfolio(user_id, req.symbol, clean_price, clean_qty)
        return {"status": "success" if success else "error"}
    except Exception as e:
        return {"status": "error", "message": f"Invalid number format: {e}"}

@router.delete("/portfolio/{symbol}")
def remove_portfolio_entry(symbol: str, x_user_id: str = Header(None)):
    from db_manager import delete_user_portfolio
    user_id = x_user_id or "guest"
    success = delete_user_portfolio(user_id, symbol)
    return {"status": "success" if success else "error"}

@router.get("/watchlist/debug/dump")
def dump_watchlist():
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, symbol, added_price FROM watchlist ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        conn.close()
        # Anonymize user_id (first 4 chars + ***)
        data = []
        for r in rows:
            uid = str(r[0])
            data.append({
                "user_id": uid[:4] + "***" if len(uid) > 4 else uid,
                "symbol": r[1],
                "price": r[2]
            })
        return {"status": "success", "rows": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@router.get("/watchlist/cb-alerts")
def get_watchlist_cb_alerts(x_user_id: str = Header(None)):
    """[NEW] 관심종목 중 최근 전환사채(CB) 공시가 있는지 확인하여 반환"""
    from db_manager import get_watchlist
    from dart_disclosure import get_dart_disclosures
    from stock_data import get_korean_stock_name
    from concurrent.futures import ThreadPoolExecutor
    
    user_id = x_user_id or "guest"
    items = get_watchlist(user_id)
    # 한국 주식(숫자 6자리)만 대상으로 함
    symbols = [i[0] for i in items if i[0].isdigit()]
    
    if not symbols:
        return {"status": "success", "data": []}
        
    all_cb = []
    def fetch_cb_for_symbol(sym):
        try:
            # 최근 1주일간의 공시 조회
            disclosures = get_dart_disclosures(sym, period="1w")
            # '전환사채' 또는 'CB' 키워드가 포함된 공시만 필터링
            cb_list = [d for d in disclosures if "전환사채" in d['title'] or "CB" in d['title']]
            for cb in cb_list:
                cb['symbol'] = sym
                cb['name'] = get_korean_stock_name(sym) or sym
            return cb_list
        except:
            return []

    # 병렬 처리를 통해 속도 향상
    with ThreadPoolExecutor(max_workers=min(len(symbols), 10)) as executor:
        results = list(executor.map(fetch_cb_for_symbol, symbols))
        
    for res in results:
        all_cb.extend(res)
            
    # 날짜 역순 정렬
    all_cb.sort(key=lambda x: x.get('date', ''), reverse=True)
            
    return {"status": "success", "data": all_cb}

@router.get("/watchlist/health-check")
def get_watchlist_health_check(x_user_id: str = Header(None)):
    """[NEW] 관심종목 5대 악재(CB/BW, 유상증자, 감자, 관리종목/상폐, 불성실공시) 팩트체크 및 최근 공시 타임라인 종합 진단"""
    from db_manager import get_watchlist
    from dart_disclosure import get_dart_disclosures
    from stock_data import get_korean_stock_name
    from concurrent.futures import ThreadPoolExecutor
    
    user_id = x_user_id or "guest"
    items = get_watchlist(user_id)
    
    symbols = []
    for it in items:
        sym = it[0] if isinstance(it, (list, tuple)) else (it.get('symbol', '') if isinstance(it, dict) else str(it))
        code = sym.split('.')[0]
        if code.isdigit() and len(code) == 6 and code not in symbols:
            symbols.append(code)
            
    if not symbols:
        return {
            "status": "success",
            "summary": {
                "total_count": 0,
                "safe_count": 0,
                "warning_count": 0,
                "all_safe": True,
                "headline": "등록된 관심종목이 없습니다.",
                "description": "관심종목을 추가하시면 24시간 악재 감시 및 건전성 진단이 시작됩니다."
            },
            "stocks": [],
            "recent_disclosures": []
        }
        
    stocks_result = []
    all_disclosures = []
    
    def analyze_symbol(sym):
        try:
            name = get_korean_stock_name(sym) or sym
            # 최근 90일(3개월) 공시 조회
            disclosures = get_dart_disclosures(sym, period="3m")
            
            cb_bw = []
            capital_change = []
            listing_risk = []
            insider_dump = []
            unfaithful = []
            positive_list = []
            
            clean_disclosures = []
            for d in disclosures:
                title = d.get('title', '')
                date_str = d.get('date', '')
                link = d.get('link', '')
                flr = d.get('flr_nm', name)
                
                # [엄격한 필터링] 행정 서식 공시(지급수단별, 대규모기업집단 등) 및 캘린더 공시(실적, 수주) 완전 제외
                is_admin_noise = any(k in title for k in [
                    "지급수단", "기업집단", "공정거래", "하도급", "분쟁조정", "동일인", "채무보증", 
                    "특수관계인", "기타경영사항", "단일판매", "공급계약", "분기보고서", "반기보고서", 
                    "사업보고서", "영업(잠정)실적", "잠정실적", "기업설명회", "IR"
                ])

                is_cb = any(k in title for k in ["전환사채", "신주인수권부사채", "교환사채", "CB", "BW"])
                is_cap = any(k in title for k in ["유상증자", "감자결정", "무상감자"])
                is_risk = any(k in title for k in ["관리종목", "투자주의환기종목", "상장폐지", "감사의견", "횡령", "배임", "회생절차", "영업정지"])
                is_insider = any(k in title for k in ["임원ㆍ주요주주", "주식등의대량보유", "최대주주등소유주식변동", "최대주주변경"])
                is_unf = "불성실공시" in title
                is_buyback = "자기주식" in title
                
                if is_cb: cb_bw.append(d)
                if is_cap: capital_change.append(d)
                if is_risk: listing_risk.append(d)
                if is_insider and any(w in title for w in ["처분", "매도", "감소"]): insider_dump.append(d)
                if is_unf: unfaithful.append(d)
                
                # 주가 및 거버넌스 핵심 6대 공시에 해당하지 않거나, 행정 잡무 공시면 알림 피드에서 제외
                if is_admin_noise or not (is_cb or is_cap or is_risk or is_insider or is_unf or is_buyback):
                    continue

                badge = "특이공시"
                badge_type = "neutral"
                display_title = title
                
                if is_risk or is_cap or is_cb or is_unf:
                    badge_type = "warning"
                    if is_cb: badge = "전환사채(CB)"
                    elif is_cap: badge = "유상증자/감자"
                    elif is_risk: badge = "상장위험"
                    elif is_unf: badge = "공시위반"
                elif is_insider:
                    if "최대주주" in title:
                        badge = "최대주주 지분"
                        badge_type = "info"
                        display_title = f"👑 최대주주 소유주식 변동 신고 ({flr})"
                    elif "대량보유" in title:
                        badge = "슈퍼개미 (5%↑)"
                        badge_type = "info"
                        display_title = f"🚨 5% 이상 대량보유 지분 변동: {flr}"
                    else:
                        badge = "임원 지분보고"
                        badge_type = "info"
                        display_title = f"💼 임원/주요주주 특정증권 소유상황 보고 ({flr})"
                elif is_buyback:
                    badge = "자사주 (주주환원)"
                    badge_type = "positive"
                    display_title = f"🔄 주주가치 제고를 위한 자기주식 취득/처분 결정"
                    
                clean_disclosures.append({
                    "symbol": sym,
                    "name": name,
                    "title": title,
                    "display_title": display_title,
                    "date": date_str,
                    "badge": badge,
                    "badge_type": badge_type,
                    "link": link,
                    "flr_nm": flr
                })
                
            has_critical_issue = bool(listing_risk or capital_change or unfaithful)
            has_warning_issue = bool(cb_bw or insider_dump)
            
            status = "DANGER" if has_critical_issue else ("WARNING" if has_warning_issue else "SAFE")
            risk_score = 60 if has_critical_issue else (80 if has_warning_issue else 100)
            
            checklist = [
                {
                    "name": "전환사채(CB) / BW",
                    "safe": len(cb_bw) == 0,
                    "badge": "정상 (클린)" if len(cb_bw) == 0 else f"발행 {len(cb_bw)}건",
                    "detail": "최근 90일간 주가 희석 사채 발행 이력 없음 (오버행 0)" if len(cb_bw) == 0 else f"최근 {len(cb_bw)}건의 전환사채 관련 공시 감지"
                },
                {
                    "name": "유상증자 / 감자",
                    "safe": len(capital_change) == 0,
                    "badge": "정상 (클린)" if len(capital_change) == 0 else "주의",
                    "detail": "주주가치 훼손 공시 없음 (자본 안정)" if len(capital_change) == 0 else "유상증자 또는 감자 공시 확인 필요"
                },
                {
                    "name": "관리종목 / 상폐 리스크",
                    "safe": len(listing_risk) == 0,
                    "badge": "정상 (클린)" if len(listing_risk) == 0 else "위험",
                    "detail": "감사의견 적정 및 건전성 유지 (상폐 우려 0%)" if len(listing_risk) == 0 else "관리종목/환기종목 지정 유의"
                },
                {
                    "name": "대량 지분매도 (오버행)",
                    "safe": len(insider_dump) == 0,
                    "badge": "정상 (클린)" if len(insider_dump) == 0 else "주의",
                    "detail": "최대주주 및 임원 대량 투매 없음" if len(insider_dump) == 0 else "임원/주요주주 지분 매도 내역 감지"
                },
                {
                    "name": "불성실공시 / 제재",
                    "safe": len(unfaithful) == 0,
                    "badge": "정상 (클린)" if len(unfaithful) == 0 else "경고",
                    "detail": "공시 규정 위반 및 벌점 부과 이력 없음" if len(unfaithful) == 0 else "불성실공시법인 지정 유의"
                }
            ]
            
            summary_desc = "최근 90일간 주가 희석(CB)이나 상장 리스크 공시가 없는 안전하고 건전한 상태입니다." if status == "SAFE" else "일부 주가 변동성 또는 주의 공시가 포함되어 있으니 확인이 권장됩니다."
            
            return {
                "stock": {
                    "symbol": sym,
                    "name": name,
                    "status": status,
                    "risk_score": risk_score,
                    "checklist": checklist,
                    "disclosures_count": len(disclosures),
                    "positive_count": len(positive_list),
                    "summary": summary_desc
                },
                "disclosures": clean_disclosures
            }
        except Exception as e:
            name = get_korean_stock_name(sym) or sym
            return {
                "stock": {
                    "symbol": sym,
                    "name": name,
                    "status": "SAFE",
                    "risk_score": 100,
                    "checklist": [],
                    "disclosures_count": 0,
                    "positive_count": 0,
                    "summary": "안전 점검 완료 (특이사항 없음)"
                },
                "disclosures": []
            }
            
    with ThreadPoolExecutor(max_workers=min(len(symbols), 8)) as ex:
        results = list(ex.map(analyze_symbol, symbols))
        
    for res in results:
        if res.get("stock"):
            stocks_result.append(res["stock"])
        if res.get("disclosures"):
            all_disclosures.extend(res["disclosures"])
            
    # 전체 공시 날짜 역순 정렬 (최신순 30건)
    all_disclosures.sort(key=lambda x: x.get("date", ""), reverse=True)
    recent_30 = all_disclosures[:30]
    
    safe_cnt = sum(1 for s in stocks_result if s["status"] == "SAFE")
    warning_cnt = len(stocks_result) - safe_cnt
    all_safe = (warning_cnt == 0)
    
    headline = f"관심종목 {len(stocks_result)}개 모두 5대 핵심 악재가 없는 클린 상태입니다." if all_safe else f"관심종목 {len(stocks_result)}개 중 {warning_cnt}개 종목에 주의 공시가 감지되었습니다."
    desc = "최근 90일간 전환사채(CB), 유상증자, 감사의견 거절 등 주가 폭락을 유발하는 악재 공시가 발견되지 않았습니다." if all_safe else "상세 체크리스트에서 주의 항목과 공시 원문을 확인해 보세요."
    
    return {
        "status": "success",
        "summary": {
            "total_count": len(stocks_result),
            "safe_count": safe_cnt,
            "warning_count": warning_cnt,
            "all_safe": all_safe,
            "headline": headline,
            "description": desc
        },
        "stocks": stocks_result,
        "recent_disclosures": recent_30
    }

# ─────────────────────────────────────────────
# IPO Watchlist Endpoints
# ─────────────────────────────────────────────
class IPOWatchlistRequest(BaseModel):
    ipo_name: str

@router.get("/ipo_watchlist")
def read_ipo_watchlist(x_user_id: str = Header(None)):
    from db_manager import get_user_ipo_watchlist
    user_id = x_user_id or "guest"
    items = get_user_ipo_watchlist(user_id)
    return {"status": "success", "data": items}

@router.post("/ipo_watchlist")
def create_ipo_watchlist(req: IPOWatchlistRequest, x_user_id: str = Header(None)):
    from db_manager import add_ipo_watchlist
    user_id = x_user_id or "guest"
    success = add_ipo_watchlist(user_id, req.ipo_name)
    return {"status": "success" if success else "error"}

@router.delete("/ipo_watchlist/{ipo_name}")
def delete_ipo_watchlist(ipo_name: str, x_user_id: str = Header(None)):
    from db_manager import remove_ipo_watchlist
    import urllib.parse
    user_id = x_user_id or "guest"
    decoded_name = urllib.parse.unquote(ipo_name)
    success = remove_ipo_watchlist(user_id, decoded_name)
    return {"status": "success" if success else "error"}
