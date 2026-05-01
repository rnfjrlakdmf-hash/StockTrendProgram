from fastapi import APIRouter, Header, Query, Response
from pydantic import BaseModel
from typing import Optional, List
import urllib.parse

router = APIRouter()

class WatchlistRequest(BaseModel):
    symbol: str

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
    
    from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
    data = []
    for sym, added_p in items:
        name = get_korean_stock_name(sym) or GLOBAL_KOREAN_NAMES.get(sym, sym)
        data.append({
            "symbol": sym, 
            "name": name, 
            "added_price": added_p or 0
        })
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
        
        # 추가 시점의 가격 가져오기
        current_price = 0
        try:
            quote = get_simple_quote(req.symbol)
            if quote and quote.get('price'):
                p_str = str(quote['price']).replace(',', '')
                current_price = float(p_str)
        except: pass
        
        success = add_watchlist(user_id, req.symbol, current_price)
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
