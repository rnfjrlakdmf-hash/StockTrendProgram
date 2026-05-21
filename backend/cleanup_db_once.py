import sqlite3
import os

# DB 경로 설정
DB_PATH = r"c:\Users\rnfjr\StockTrendProgram\backend\stock_app.db"

def cleanup():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 오늘(2026-04-17) 생성된 모든 SYSTEM 브리핑 삭제
        # (새로운 엔진이 정시 정각 기준으로 다시 생성할 예정)
        query = """
        DELETE FROM morning_briefings 
        WHERE user_id = 'SYSTEM' 
        AND strftime('%Y-%m-%d', datetime(created_at, '+9 hours')) = '2026-04-17';
        """
        cursor.execute(query)
        deleted_count = cursor.rowcount
        conn.commit()
        print(f"Successfully deleted {deleted_count} redundant briefing entries for today.")
    except Exception as e:
        print(f"Cleanup error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup()
