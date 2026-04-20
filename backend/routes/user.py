from fastapi import APIRouter, Header, Query
from pydantic import BaseModel
from typing import Optional, List
import urllib.parse
from db_manager import (
    get_watchlist, add_watchlist, remove_watchlist, migrate_watchlist,
    get_user_portfolio, save_user_portfolio, delete_user_portfolio
)

router = APIRouter()

class WatchlistRequest(BaseModel):
    symbol: str

@router.get("/watchlist")
def read_watchlist(x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    symbols = get_watchlist(user_id)
    from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
    data = []
    for sym in symbols:
        name = get_korean_stock_name(sym) or GLOBAL_KOREAN_NAMES.get(sym, sym)
        data.append({"symbol": sym, "name": name})
    return {"status": "success", "data": data}

@router.post("/watchlist")
def create_watchlist(req: WatchlistRequest, x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    success = add_watchlist(user_id, req.symbol)
    if success:
        from utils.briefing_store import invalidate_today_briefing
        invalidate_today_briefing(user_id)
    return {"status": "success" if success else "error"}

@router.delete("/watchlist/{symbol}")
def delete_watchlist(symbol: str, x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    decoded_symbol = urllib.parse.unquote(symbol)
    remove_watchlist(user_id, decoded_symbol)
    from utils.briefing_store import invalidate_today_briefing
    invalidate_today_briefing(user_id)
    return {"status": "success"}

@router.get("/portfolio")
def read_user_portfolio(x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    return {"status": "success", "data": get_user_portfolio(user_id)}

class PortfolioEntry(BaseModel):
    symbol: str
    price: float
    quantity: float

@router.post("/portfolio")
def create_portfolio_entry(req: PortfolioEntry, x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    success = save_user_portfolio(user_id, req.symbol, req.price, req.quantity)
    return {"status": "success" if success else "error"}

@router.delete("/portfolio/{symbol}")
def remove_portfolio_entry(symbol: str, x_user_id: str = Header(None)):
    user_id = x_user_id or "guest"
    success = delete_user_portfolio(user_id, symbol)
    return {"status": "success" if success else "error"}
