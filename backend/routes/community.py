from fastapi import APIRouter, Query, Header, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import time
import os
import uuid
import sqlite3
from db_manager import get_db_connection
import hashlib
import random

ADJECTIVES = ["배고픈", "물린", "익절한", "손절한", "행복한", "우울한", "존버하는", "떡상한", "풀매수한", "기도하는", "관망하는", "불타는"]
NOUNS = ["워렌버핏", "개미", "주린이", "머스크", "침팬지", "기관", "외인", "세력", "돈사본", "주주", "고수", "흑우"]

def generate_anon_name(user_id: str) -> str:
    if not user_id or user_id == "unknown":
        return f"{random.choice(ADJECTIVES)} {random.choice(NOUNS)}#{random.randint(1000, 9999)}"
    
    hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    adj = ADJECTIVES[hash_val % len(ADJECTIVES)]
    noun = NOUNS[(hash_val // len(ADJECTIVES)) % len(NOUNS)]
    code = str(hash_val % 10000).zfill(4)
    return f"{adj} {noun}#{code}"

router = APIRouter()

@router.get("/community/lounge")
def get_lounge_chats(symbol: str = "global"):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get chats (last 50 for the symbol)
        cursor.execute('''
            SELECT c.id, c.user_name, c.text, c.symbol, c.profit_verified, c.image_url, c.likes, c.created_at, c.user_id, COALESCE(u.points, 0)
            FROM community_chats c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE (c.symbol = ? OR c.symbol = 'global') AND c.parent_id IS NULL
            ORDER BY c.created_at DESC
            LIMIT 50
        ''', (symbol,))
        
        rows = cursor.fetchall()
        chats = []
        for row in reversed(rows):
            chat_id = row[0]
            # Fetch replies for this chat
            cursor.execute('''
                SELECT c.id, c.user_name, c.text, c.created_at, c.user_id, COALESCE(u.points, 0)
                FROM community_chats c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.parent_id = ?
                ORDER BY c.created_at ASC
            ''', (chat_id,))
            reply_rows = cursor.fetchall()
            replies = [{"id": r[0], "user_name": r[1], "text": r[2], "timestamp": r[3], "user_id": r[4], "points": r[5]} for r in reply_rows]
            
            chat = {
                "id": chat_id,
                "user_name": row[1],
                "text": row[2],
                "symbol": row[3],
                "profit_verified": row[4],
                "image_url": row[5],
                "likes": row[6],
                "timestamp": row[7],
                "user_id": row[8],
                "points": row[9],
                "replies": replies
            }
            chats.append(chat)
            
        return {"status": "success", "data": chats}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/lounge")
def post_lounge_chat(data: dict, request: Request):
    text = data.get("text", "").strip()
    if not text: return {"status": "error", "message": "내용 없음"}
    
    user_id = data.get("user_id", "unknown")
    user_name = generate_anon_name(user_id)
    symbol = data.get("symbol", "global")
    profit_verified = data.get("profit")
    image_url = data.get("image_url")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO community_chats (symbol, user_id, user_name, text, image_url, profit_verified, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, NULL)
        ''', (symbol, user_id, user_name, text, image_url, profit_verified))
        conn.commit()
        new_id = cursor.lastrowid
        
        # Broadcast the message to WebSocket clients
        try:
            from sockets import manager
            import asyncio
            asyncio.create_task(manager.broadcast_chat_message({
                "type": "chat_message",
                "chat": {
                    "id": new_id,
                    "user_name": user_name,
                    "text": text,
                    "symbol": symbol,
                    "profit_verified": profit_verified,
                    "image_url": image_url,
                    "likes": 0,
                    "timestamp": datetime.now().isoformat(),
                    "user_id": user_id,
                    "points": 0, # Frontend can optimistic update
                    "replies": []
                }
            }))
        except Exception as e:
            print(f"[WS-Chat] Broadcast failed: {e}")
            
        return {"status": "success", "data": {"id": new_id}}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/lounge/{message_id}/reply")
def post_lounge_reply(message_id: int, data: dict):
    text = data.get("text", "").strip()
    if not text: return {"status": "error", "message": "내용 없음"}
    
    user_id = data.get("user_id", "unknown")
    user_name = generate_anon_name(user_id)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check parent exists
        cursor.execute("SELECT symbol FROM community_chats WHERE id = ?", (message_id,))
        parent = cursor.fetchone()
        if not parent: return {"status": "error", "message": "메시지를 찾을 수 없습니다"}
        
        symbol = parent[0]
        cursor.execute('''
            INSERT INTO community_chats (symbol, user_id, user_name, text, parent_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (symbol, user_id, user_name, text, message_id))
        conn.commit()
        new_id = cursor.lastrowid
        
        return {"status": "success", "data": {"id": new_id}}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/lounge/{message_id}/like")
def post_lounge_like(message_id: int, data: dict):
    user_id = data.get("user_id")
    if not user_id: return {"status": "error", "message": "유저 ID가 필요합니다"}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Try to insert like
        cursor.execute("INSERT INTO community_likes (chat_id, user_id) VALUES (?, ?)", (message_id, user_id))
        # If success, update count
        cursor.execute("UPDATE community_chats SET likes = likes + 1 WHERE id = ?", (message_id,))
        conn.commit()
        return {"status": "success", "message": "좋아요를 눌렀습니다"}
    except sqlite3.IntegrityError:
        return {"status": "error", "message": "이미 좋아요를 눌렀습니다"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            return {"status": "error", "message": "이미지 파일만 업로드 가능합니다"}
        
        ext = file.filename.split('.')[-1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", filename)
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(await file.read())
            
        return {"status": "success", "url": f"{filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/community/hot-stocks")
def get_hot_stocks():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT symbol, COUNT(*) as cnt 
            FROM community_chats 
            WHERE symbol != 'global' AND created_at >= datetime('now', '-3 days')
            GROUP BY symbol 
            ORDER BY cnt DESC 
            LIMIT 10
        ''')
        rows = cursor.fetchall()
        hot = [{"symbol": r[0], "count": r[1]} for r in rows]
        return {"status": "success", "data": hot}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.get("/community/hall-of-fame")
def get_hall_of_fame():
    """수익 인증/명예의 전당 (수익률 높은 순)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT c.id, c.symbol, c.user_name, c.text, c.image_url, c.profit_verified, c.likes, c.created_at, COALESCE(u.points, 0)
            FROM community_chats c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.profit_verified IS NOT NULL
            ORDER BY c.profit_verified DESC, c.created_at DESC
            LIMIT 50
        ''')
        rows = cursor.fetchall()
        data = []
        for r in rows:
            data.append({
                "id": r[0],
                "symbol": r[1],
                "user_name": r[2],
                "text": r[3],
                "image_url": r[4],
                "profit": r[5],
                "likes": r[6],
                "timestamp": r[7],
                "points": r[8]
            })
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

# ---------------------------------------------------------
# Community Posts (Blog / Insight Column) APIs
# ---------------------------------------------------------

@router.get("/community/posts")
def get_posts(sort: str = "newest"):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if sort == "popular":
            order_by = "likes DESC, views DESC, created_at DESC"
        else:
            order_by = "created_at DESC"
            
        cursor.execute(f'''
            SELECT p.id, p.user_id, p.user_name, p.title, p.image_url, p.views, p.likes, p.created_at, COALESCE(u.points, 0)
            FROM community_posts p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY {order_by}
            LIMIT 100
        ''')
        rows = cursor.fetchall()
        posts = []
        for row in rows:
            posts.append({
                "id": row[0],
                "user_id": row[1],
                "user_name": row[2],
                "title": row[3],
                "image_url": row[4],
                "views": row[5],
                "likes": row[6],
                "created_at": row[7],
                "points": row[8]
            })
        return {"status": "success", "data": posts}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/posts")
def create_post(data: dict):
    user_id = data.get("user_id")
    user_name = generate_anon_name(user_id) if user_id else "익명"
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    image_url = data.get("image_url")
    
    if not user_id or not title or not content:
        return {"status": "error", "message": "필수 입력값이 누락되었습니다"}
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO community_posts (user_id, user_name, title, content, image_url)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, user_name, title, content, image_url))
        conn.commit()
        return {"status": "success", "post_id": cursor.lastrowid}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.get("/community/posts/{post_id}")
def get_post_detail(post_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE community_posts SET views = views + 1 WHERE id = ?", (post_id,))
        conn.commit()
        
        cursor.execute('''
            SELECT p.id, p.user_id, p.user_name, p.title, p.content, p.image_url, p.views, p.likes, p.created_at, COALESCE(u.points, 0)
            FROM community_posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        ''', (post_id,))
        row = cursor.fetchone()
        if not row:
            return {"status": "error", "message": "게시글을 찾을 수 없습니다"}
            
        post = {
            "id": row[0],
            "user_id": row[1],
            "user_name": row[2],
            "title": row[3],
            "content": row[4],
            "image_url": row[5],
            "views": row[6],
            "likes": row[7],
            "created_at": row[8],
            "points": row[9]
        }
        
        cursor.execute('''
            SELECT c.id, c.user_id, c.user_name, c.content, c.created_at, COALESCE(u.points, 0)
            FROM community_post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        ''', (post_id,))
        comment_rows = cursor.fetchall()
        comments = [{"id": r[0], "user_id": r[1], "user_name": r[2], "content": r[3], "created_at": r[4], "points": r[5]} for r in comment_rows]
        post["comments"] = comments
        
        return {"status": "success", "data": post}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/posts/{post_id}/comments")
def add_post_comment(post_id: int, data: dict):
    user_id = data.get("user_id")
    user_name = generate_anon_name(user_id) if user_id else "익명"
    content = data.get("content", "").strip()
    
    if not user_id or not content:
        return {"status": "error", "message": "필수 입력값이 누락되었습니다"}
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO community_post_comments (post_id, user_id, user_name, content)
            VALUES (?, ?, ?, ?)
        ''', (post_id, user_id, user_name, content))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

@router.post("/community/posts/{post_id}/like")
def like_post(post_id: int, data: dict):
    user_id = data.get("user_id")
    if not user_id:
        return {"status": "error", "message": "인증 필요"}
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)", (post_id, user_id))
        
        cursor.execute("UPDATE community_posts SET likes = likes + 1 WHERE id = ?", (post_id,))
        
        cursor.execute("SELECT user_id FROM community_posts WHERE id = ?", (post_id,))
        author = cursor.fetchone()
        if author:
            author_id = author[0]
            if author_id != user_id:
                cursor.execute("UPDATE users SET points = points + 10 WHERE id = ?", (author_id,))
                
        conn.commit()
        return {"status": "success"}
    except sqlite3.IntegrityError:
        return {"status": "error", "message": "이미 공감했습니다"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()
