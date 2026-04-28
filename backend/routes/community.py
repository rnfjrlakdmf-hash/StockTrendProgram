from fastapi import APIRouter, Query, Header, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import time
import os
import uuid
from turbo_engine import turbo_cache

router = APIRouter()

# 임시 메모리 저장소 (main.py에서 이관)
COMMUNITY_CHATS = [
    {"id": 1, "user_name": "AI 수사관", "symbol": "global", "text": "환영합니다!", "replies": [], "timestamp": (datetime.now() - timedelta(hours=1)).isoformat()},
] 

@router.get("/community/lounge")
def get_lounge_chats(symbol: str = "global"):
    relevant = [c for c in COMMUNITY_CHATS if c.get('symbol') == symbol or c.get('symbol') == "global"]
    return {"status": "success", "data": relevant[-50:]}

@router.post("/community/lounge")
def post_lounge_chat(data: dict):
    text = data.get("text", "").strip()
    if not text: return {"status": "error", "message": "내용 없음"}
    new_chat = {
        "id": len(COMMUNITY_CHATS) + 1, 
        "user_name": data.get("user_name", "익명"), 
        "text": text, 
        "symbol": data.get("symbol", "global"), 
        "profit": data.get("profit"),
        "image_url": data.get("image_url"),
        "replies": [],
        "timestamp": datetime.now().isoformat()
    }
    COMMUNITY_CHATS.append(new_chat)
    return {"status": "success", "data": new_chat}

@router.post("/community/lounge/{message_id}/reply")
def post_lounge_reply(message_id: int, data: dict):
    text = data.get("text", "").strip()
    if not text: return {"status": "error", "message": "내용 없음"}
    
    # Find the parent message
    parent_chat = next((c for c in COMMUNITY_CHATS if c["id"] == message_id), None)
    if not parent_chat: return {"status": "error", "message": "메시지를 찾을 수 없습니다"}
    
    if "replies" not in parent_chat:
        parent_chat["replies"] = []
        
    reply = {
        "id": int(time.time() * 1000), 
        "user_name": data.get("user_name", "익명"), 
        "text": text, 
        "timestamp": datetime.now().isoformat()
    }
    parent_chat["replies"].append(reply)
    
    return {"status": "success", "data": reply}

@router.post("/community/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            return {"status": "error", "message": "이미지 파일만 업로드 가능합니다"}
        
        ext = file.filename.split('.')[-1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", filename)
        
        with open(filepath, "wb") as f:
            f.write(await file.read())
            
        return {"status": "success", "url": f"{filename}"} # Frontend will use API_BASE_URL + /uploads/ + url
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/community/hot-stocks")
def get_hot_stocks():
    from collections import Counter
    symbols = [c['symbol'] for c in COMMUNITY_CHATS if c.get('symbol') and c['symbol'] != 'global']
    counter = Counter(symbols)
    hot = [{"symbol": sym, "count": cnt} for sym, cnt in counter.most_common(10)]
    return {"status": "success", "data": hot}


