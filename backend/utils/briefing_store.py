import os
import json
import sqlite3
from datetime import datetime
import pytz
from typing import Dict, Any

# DB 경로 설정 (db_manager.py와 동기화)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "stock_app.db"))

def get_db():
    return sqlite3.connect(DB_FILE)

def init_briefing_table():
    """모닝 브리핑 캐시 테이블 초기화"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS morning_briefings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            briefing_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 인덱스 추가 (조회 성능)
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_briefing_user ON morning_briefings(user_id, created_at DESC)')
    conn.commit()
    conn.close()

def save_morning_briefing(user_id: str, briefing_data: Dict[str, Any]):
    """생성된 브리핑을 DB에 저장 (최신 1건 유지 또는 히스토리)"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # 기존 오늘 데이터가 있다면 삭제 (하루에 하나만 기록하는 정책일 경우)
        # 여기서는 단순 추가 후 최신순 조회를 사용
        cursor.execute(
            "INSERT INTO morning_briefings (user_id, briefing_json) VALUES (?, ?)",
            (user_id, json.dumps(briefing_data, ensure_ascii=False))
        )
        conn.commit()
    except Exception as e:
        print(f"[BriefingStore] Save error: {e}")
    finally:
        conn.close()

def get_latest_briefing(user_id: str) -> Dict[str, Any]:
    """해당 사용자의 가장 최근 브리핑 조회"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT briefing_json, created_at FROM morning_briefings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            data = json.loads(row[0])
            data["created_at"] = row[1]
            return data
        return None
    finally:
        conn.close()

def should_generate_new_briefing(user_id: str) -> bool:
    """오늘 이미 브리핑이 생성되었는지 확인 (08:30 이후 1회 생성 원칙)"""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    # 오전 8:30 이전이면 굳이 새로 생성하지 않음 (어제꺼 보여줌)
    # 하지만 로직상 8:30 스케줄러가 돌 것이므로, API 요청 시에는 '오늘 날짜' 데이터가 있는지 확인
    conn = get_db()
    cursor = conn.cursor()
    try:
        today_str = now.strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT id FROM morning_briefings WHERE user_id = ? AND DATE(created_at) = ?",
            (user_id, today_str)
        )
        return cursor.fetchone() is None
    finally:
        conn.close()

def get_today_briefing_timeline(user_id: str) -> list:
    """오늘(KST) 생성된 모든 브리핑(개인 + SYSTEM)을 최신순으로 조회"""
    kst = pytz.timezone('Asia/Seoul')
    today_str = datetime.now(kst).strftime("%Y-%m-%d")
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        # 본인 데이터와 SYSTEM 데이터를 합쳐서 가져옴
        cursor.execute(
            """
            SELECT user_id, briefing_json, created_at 
            FROM morning_briefings 
            WHERE (user_id = ? OR user_id = 'SYSTEM') 
            AND DATE(created_at) = ? 
            ORDER BY created_at DESC
            """,
            (user_id, today_str)
        )
        rows = cursor.fetchall()
        results = []
        for row in rows:
            data = json.loads(row[1])
            data["user_id"] = row[0]
            data["created_at"] = row[2]
            results.append(data)
        return results
    finally:
        conn.close()

def invalidate_today_briefing(user_id: str):
    """오늘 생성된 브리핑 캐시를 삭제하여 다음 요청 시 재생성되도록 함"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        kst = pytz.timezone('Asia/Seoul')
        today_str = datetime.now(kst).strftime("%Y-%m-%d")
        cursor.execute(
            "DELETE FROM morning_briefings WHERE user_id = ? AND DATE(created_at) = ?",
            (user_id, today_str)
        )
        conn.commit()
    except Exception as e:
        print(f"[BriefingStore] Invalidate error: {e}")
    finally:
        conn.close()

def rollback_morning_briefing(user_id: str) -> bool:
    """해당 사용자의 가장 최근 브리핑 1건을 삭제 (한 단계 되돌리기)"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # 가장 최근의 브리핑 ID 찾기
        cursor.execute(
            "SELECT id FROM morning_briefings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            latest_id = row[0]
            cursor.execute("DELETE FROM morning_briefings WHERE id = ?", (latest_id,))
            conn.commit()
            return True
        return False
    except Exception as e:
        print(f"[BriefingStore] Rollback error: {e}")
        return False
    finally:
        conn.close()
