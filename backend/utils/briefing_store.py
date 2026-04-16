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

def save_morning_briefing(user_id: str, briefing_data: Dict[str, Any]) -> bool:
    """생성된 브리핑을 DB에 저장하거나 기존 인스턴트 레코드를 업데이트함 (중복 방지)"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA busy_timeout = 5000")
        
        # 1. 최근 5분 이내에 생성된 인스턴트 브리핑이 있는지 확인 (업데이트 대상)
        cursor.execute(
            """
            SELECT id FROM morning_briefings 
            WHERE user_id = ? 
            AND created_at >= datetime('now', '-5 minutes')
            ORDER BY created_at DESC LIMIT 1
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        
        if row and briefing_data.get('is_instant') is not True:
            # AI 분석이 완료된 것이라면 기존 레코드를 업데이트 (덮어쓰기)
            cursor.execute(
                "UPDATE morning_briefings SET briefing_json = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
                (json.dumps(briefing_data, ensure_ascii=False), row[0])
            )
            print(f"[BriefingStore] Updated existing record for user: {user_id}")
        else:
            # 새로운 요청이거나 아직 업데이트할 레코드가 없으면 신규 삽입
            cursor.execute(
                "INSERT INTO morning_briefings (user_id, briefing_json) VALUES (?, ?)",
                (user_id, json.dumps(briefing_data, ensure_ascii=False))
            )
            print(f"[BriefingStore] Inserted new record for user: {user_id}")
            
        conn.commit()
        return True
    except Exception as e:
        print(f"[BriefingStore] Save error for {user_id}: {e}")
        return False
    finally:
        conn.close()

def get_latest_briefing(user_id: str) -> Dict[str, Any]:
    """해당 사용자의 가장 최근 브리핑 조회"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT briefing_json, datetime(created_at, '+9 hours') as created_at_kst FROM morning_briefings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
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
    """최근 7일간(KST) 생성된 모든 브리핑(개인 + SYSTEM)을 최신순으로 조회"""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        from datetime import timedelta
        # KST 기준 7일 전 날짜 계산
        seven_days_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        
        # [Fix] 데이터가 이미 KST로 저장되므로 +9 hours 보정 제거
        cursor.execute(
            """
            SELECT user_id, briefing_json, 
                   created_at as created_at_kst,
                   strftime('%Y-%m-%d', created_at) as kst_date
            FROM morning_briefings 
            WHERE (user_id = ? OR user_id = 'SYSTEM') 
            AND strftime('%Y-%m-%d', created_at) >= ? 
            ORDER BY created_at DESC
            """,
            (user_id, seven_days_ago)
        )
        rows = cursor.fetchall()
        results = []
        for row in rows:
            try:
                data = json.loads(row[1])
                data["user_id"] = row[0]
                # 날짜 포맷 정규화 (YYYY-MM-DD HH:MM:SS)
                data["created_at"] = row[2]
                data["kst_date"] = row[3]
                results.append(data)
            except: continue
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
def cleanup_old_briefings():
    """
    8일 이상 된 오래된 브리핑 데이터를 영구 삭제하여 DB 용량을 관리합니다.
    (최근 7일 데이터만 유지)
    """
    conn = get_db()
    cursor = conn.cursor()
    try:
        # KST 기준 8일 전 날짜 계산
        import datetime
        kst = pytz.timezone('Asia/Seoul')
        eight_days_ago = (datetime.datetime.now(kst) - datetime.timedelta(days=8)).strftime("%Y-%m-%d")
        
        # 8일 전(포함) 이전 데이터 삭제
        # 데이터베이스의 created_at은 UTC이므로, KST 보정 후 날짜 비교
        cursor.execute(
            "DELETE FROM morning_briefings WHERE strftime('%Y-%m-%d', datetime(created_at, '+9 hours')) <= ?",
            (eight_days_ago,)
        )
        deleted_count = cursor.rowcount
        conn.commit()
        return deleted_count
    except Exception as e:
        print(f"[Cleanup] 데이터 정리 중 오류 발생: {e}")
        return 0
    finally:
        conn.close()
