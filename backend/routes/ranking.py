from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from db_manager import get_db_connection

router = APIRouter()

@router.get("/")
def get_leaderboard(x_user_id: str = Header(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Top 100
    cursor.execute("SELECT user_id, nickname, score, rank FROM user_rankings ORDER BY rank ASC LIMIT 100")
    top_100 = [{"user_id": r[0], "nickname": r[1], "score": round(r[2], 2), "rank": r[3]} for r in cursor.fetchall()]
    
    # My Rank
    my_rank = None
    if x_user_id and x_user_id != 'guest':
        cursor.execute("SELECT user_id, nickname, score, rank FROM user_rankings WHERE user_id = ?", (x_user_id,))
        row = cursor.fetchone()
        if row:
            my_rank = {"user_id": row[0], "nickname": row[1], "score": round(row[2], 2), "rank": row[3]}
            
    cursor.execute("SELECT COUNT(*) FROM user_rankings")
    total_users = cursor.fetchone()[0]
    conn.close()
    
    return {
        "top_100": top_100,
        "my_rank": my_rank,
        "total_ranked_users": total_users
    }
