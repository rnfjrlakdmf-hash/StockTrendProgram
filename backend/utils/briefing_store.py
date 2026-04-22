import os
import json
import sqlite3
from datetime import datetime, timedelta
import pytz
from typing import Dict, Any

# DB 경로 설정 (db_manager.py와 동기화)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "stock_app.db"))

def get_db():
    return sqlite3.connect(DB_FILE, timeout=30)

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

def save_morning_briefing(user_id: str, briefing_data: Dict[str, Any], created_at: str = None) -> bool:
    """생성된 브리핑을 DB에 저장하거나 기존 인스턴트 레코드를 업데이트함 (중복 방지)"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA busy_timeout = 5000")
        
        # 1. 소급 생성(Backfill)인 경우: 명시된 시간을 사용하여 저장
        if created_at:
            # [Cleanup] SYSTEM 사용자의 경우 동일 시간대 중복 저장 방지
            if user_id == "SYSTEM":
                try:
                    # [Ultra-Ready] 다양한 날짜 형식(T 포함 여부 등)에 유연하게 대응
                    clean_at = created_at.replace('T', ' ')
                    if '.' in clean_at: clean_at = clean_at.split('.')[0] # 소수점 절삭
                    
                    try:
                        dt = datetime.strptime(clean_at, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        # ISO 포맷 등 다른 형식 시도
                        dt = datetime.fromisoformat(created_at.replace('Z', ''))
                        
                    kst_dt = dt + timedelta(hours=9)
                    date_str = kst_dt.strftime("%Y-%m-%d")
                    hour_val = kst_dt.hour
                    if has_system_briefing_for_hour(date_str, hour_val):
                        print(f"[BriefingStore] Blocked duplicate for {user_id} at {created_at}")
                        return True
                except Exception as e:
                    print(f"[BriefingStore] Date parse warning during dedupe: {e}")
                    pass

            cursor.execute(
                "INSERT INTO morning_briefings (user_id, briefing_json, created_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(briefing_data, ensure_ascii=False), created_at)
            )
            print(f"[BriefingStore] Saved historical backfill for {user_id} at {created_at}")
            conn.commit()
            return True

        # 2. 실시간 생성인 경우: 최근 5분 이내에 생성된 인스턴트 브리핑이 있는지 확인 (업데이트 대상)
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
    """최근 7일간(KST) 생성된 SYSTEM 브리핑과 사용자 개인 브리핑을 최신순으로 조회"""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        from datetime import timedelta
        seven_days_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Optimization: Calculate UTC threshold to use index on created_at
        utc_threshold = (now - timedelta(days=8)).astimezone(pytz.UTC).strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"[BriefingStore] Fetching timeline for uid='{user_id}' since {utc_threshold} UTC")

        cursor.execute(
            """
            SELECT user_id, briefing_json, 
                   strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at_utc,
                   strftime('%Y-%m-%d', datetime(created_at, '+9 hours')) as kst_date
            FROM morning_briefings 
            WHERE user_id IN ('SYSTEM', ?)
            AND created_at >= ?
            ORDER BY created_at DESC
            """,
            (user_id, utc_threshold)
        )
        rows = cursor.fetchall()
        results = []
        for row in rows:
            try:
                data = json.loads(row[1])
                data["user_id"] = row[0]
                data["created_at"] = row[2] 
                data["kst_date"] = row[3]
                results.append(data)
            except: continue
        print(f"[BriefingStore] Found {len(results)} timeline items")
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

def has_system_briefing_for_hour(date_str: str, hour: int) -> bool:
    """특정 날짜와 시간에 SYSTEM 브리핑이 이미 존재하는지 확인"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # created_at (UTC)을 KST(+9)로 보정한 뒤 날짜와 시간이 일치하는지 확인
        # hour가 한 자리 수일 경우를 대비하여 %H 포맷 유지
        cursor.execute(
            """
            SELECT id FROM morning_briefings 
            WHERE user_id = 'SYSTEM' 
            AND strftime('%Y-%m-%d', datetime(created_at, '+9 hours')) = ?
            AND CAST(strftime('%H', datetime(created_at, '+9 hours')) AS INTEGER) = ?
            LIMIT 1
            """,
            (date_str, hour)
        )
        return cursor.fetchone() is not None
    except Exception as e:
        print(f"[BriefingStore] Check error for {date_str} {hour}:00: {e}")
        return False
    finally:
        conn.close()
