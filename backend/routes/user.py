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
