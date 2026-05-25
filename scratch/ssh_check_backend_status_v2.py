import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_backend_status_v2():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. systemd 서비스 상태
        print("\n=== Systemctl Service Status ===")
        stdin, stdout, stderr = ssh.exec_command("systemctl status stocktrend-backend.service")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Python 스크립트를 서버에서 가동하여 직접 SQLite3 DB 조회
        print("\n=== Database Status (Watchlist & FCM Tokens) ===")
        python_db_script = """
import sqlite3
import os

db_path = os.path.expanduser('~/StockTrendProgram/backend/stock_app.db')
if not os.path.exists(db_path):
    # Fallback to backend folder in current or root
    db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'

print(f"Checking DB: {db_path} (exists: {os.path.exists(db_path)})")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Watchlist
    cursor.execute("SELECT user_id, symbol, added_price FROM watchlist")
    rows = cursor.fetchall()
    print(f"Watchlist Rows (Count: {len(rows)}):")
    for r in rows[:15]:
        print("  Watchlist:", r)
    if len(rows) > 15:
        print("  ... and more")
        
    # 2. FCM Tokens
    cursor.execute("SELECT user_id, pref_morning, pref_closing, pref_price, pref_news, length(token) FROM fcm_tokens")
    rows_fcm = cursor.fetchall()
    print(f"FCM Token Rows (Count: {len(rows_fcm)}):")
    for r in rows_fcm:
        print("  FCM Token Prefs:", r)
        
    conn.close()
except Exception as e:
    print("DB error:", e)
"""
        # SSH를 통해 원격 서버로 파이썬 스크립트 전달하여 실행
        stdin, stdout, stderr = ssh.exec_command(f"python3 -c {repr(python_db_script)}")
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 3. KST 15:40 전후 로그 확인 (UTC 기준 06:40 전후)
        print("\n=== Logs Around KST 15:40 (UTC 06:40) ===")
        # 06:30:00 ~ 07:15:00 UTC
        stdin, stdout, stderr = ssh.exec_command("journalctl -u stocktrend-backend --since '2026-05-22 06:30:00' --until '2026-05-22 07:15:00' --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 4. 전체 최근 로그 200줄 (혹시 현재 스케줄러가 에러로 뻗었는지)
        print("\n=== Recent Service Logs (last 100 lines) ===")
        stdin, stdout, stderr = ssh.exec_command("journalctl -u stocktrend-backend -n 100 --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_backend_status_v2()
