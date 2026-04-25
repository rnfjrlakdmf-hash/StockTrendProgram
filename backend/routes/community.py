from fastapi import APIRouter, Query, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import time
from turbo_engine import turbo_cache

router = APIRouter()

# 임시 메모리 저장소 (main.py에서 이관)
COMMUNITY_CHATS = [
    {"id": 1, "user_name": "AI 수사관", "symbol": "global", "text": "환영합니다!", "timestamp": (datetime.now() - timedelta(hours=1)).isoformat()},
] 

@router.get("/community/lounge")
def get_lounge_chats(symbol: str = "global"):
    relevant = [c for c in COMMUNITY_CHATS if c.get('symbol') == symbol or c.get('symbol') == "global"]
    return {"status": "success", "data": relevant[-50:]}

@router.post("/community/lounge")
def post_lounge_chat(data: dict):
    text = data.get("text", "").strip()
    if not text: return {"status": "error", "message": "내용 없음"}
    new_chat = {"id": len(COMMUNITY_CHATS) + 1, "user_name": data.get("user_name", "익명"), "text": text, "symbol": data.get("symbol", "global"), "timestamp": datetime.now().isoformat()}
    COMMUNITY_CHATS.append(new_chat)
    return {"status": "success", "data": new_chat}

@router.get("/community/hot-stocks")
def get_hot_stocks():
    from collections import Counter
    symbols = [c['symbol'] for c in COMMUNITY_CHATS if c.get('symbol') and c['symbol'] != 'global']
    counter = Counter(symbols)
    hot = [{"symbol": sym, "count": cnt} for sym, cnt in counter.most_common(10)]
    return {"status": "success", "data": hot}


