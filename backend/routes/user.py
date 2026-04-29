from fastapi import APIRouter, Header, Query
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
def read_watchlist(x_user_id: str = Header(None)):
    from db_manager import get_watchlist
    user_id = x_user_id or "guest"
    # Returns List of (symbol, added_price)
    items = get_watchlist(user_id)
    from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
    data = []
    for sym, added_p in items:
        name = get_korean_stock_name(sym) or GLOBAL_KOREAN_NAMES.get(sym, sym)
        data.append({
            "symbol": sym, 
            "name": name, 
            "added_price": added_p or 0
        })
    return {"status": "success", "data": data}

@router.get("/watchlist/closing-summary")
def get_watchlist_closing_summary(x_user_id: str = Header(None)):
    """[NEW] 장마감 요약 전용 API - ClosingBanner.tsx 대응 (Parallel Optimized)"""
    from db_manager import get_watchlist
    from stock_data import get_simple_quote, get_korean_stock_name
    from concurrent.futures import ThreadPoolExecutor
    
    user_id = x_user_id or "guest"
    symbols = get_watchlist(user_id)
    
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
def create_watchlist(req: WatchlistRequest, x_user_id: str = Header(None)):
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
