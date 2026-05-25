import paramiko
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_backend_status_v3():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    out_file_path = os.path.join("scratch", "ssh_diagnostic_result.txt")
    
    with open(out_file_path, "w", encoding="utf-8") as f:
        def log(msg):
            print(msg)
            f.write(msg + "\n")
            
        try:
            log(f"Connecting to {username}@{hostname}...")
            ssh.connect(hostname, username=username, pkey=key, timeout=15)
            log("Connected!")
            
            # 1. systemd 서비스 상태
            log("\n=== Systemctl Service Status ===")
            stdin, stdout, stderr = ssh.exec_command("systemctl status stocktrend-backend.service")
            status_out = stdout.read().decode('utf-8', 'ignore')
            log(status_out[:1000]) # 1000자만 출력
            
            # 2. Python 스크립트를 서버에서 가동하여 직접 SQLite3 DB 조회
            log("\n=== Database Status (Watchlist & FCM Tokens) ===")
            python_db_script = """
import sqlite3
import os

db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'

print(f"Checking DB: {db_path} (exists: {os.path.exists(db_path)})")
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Watchlist
    cursor.execute("SELECT user_id, symbol, added_price FROM watchlist")
    rows = cursor.fetchall()
    print(f"Watchlist Rows (Count: {len(rows)}):")
    unique_users = set([r[0] for r in rows])
    print(f"Unique Users in Watchlist: {unique_users}")
    for r in rows[:15]:
        print("  Watchlist:", r)
        
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
            import base64
            b64_script = base64.b64encode(python_db_script.encode('utf-8')).decode('utf-8')
            remote_cmd = f"python3 -c \\\"import base64; exec(base64.b64decode('{b64_script}').decode('utf-8'))\\\""
            
            stdin, stdout, stderr = ssh.exec_command(remote_cmd)
            db_res = stdout.read().decode('utf-8', 'ignore')
            db_err = stderr.read().decode('utf-8', 'ignore')
            log(db_res)
            if db_err:
                log("DB check error stderr:")
                log(db_err)
            
            # 3. KST 15:40 전후 로그 필터링 (UTC 06:35 ~ 06:45)
            log("\n=== Logs Around KST 15:40 (Filtered, No 429) ===")
            cmd_logs = "journalctl -u stocktrend-backend --since '2026-05-22 06:35:00' --until '2026-05-22 06:45:00' --no-pager | grep -i -E 'scheduler|closing|error|warn|notification|fcm|fail|exception' | grep -v -i -E '429|too many requests'"
            stdin, stdout, stderr = ssh.exec_command(cmd_logs)
            logs_out = stdout.read().decode('utf-8', 'ignore')
            lines = logs_out.splitlines()
            log(f"Total lines matching filter: {len(lines)}")
            for l in lines[:150]:
                log(l)
                
            # 4. 오늘 로그 중 429가 아닌 중요 로그
            log("\n=== Today's Important Logs (No 429) ===")
            cmd_logs_today = "journalctl -u stocktrend-backend --since '2026-05-22 00:00:00' --no-pager | grep -i -E 'scheduler|closing|error|warn|notification|fcm|fail|exception' | grep -v -i -E '429|too many requests'"
            stdin, stdout, stderr = ssh.exec_command(cmd_logs_today)
            logs_today_out = stdout.read().decode('utf-8', 'ignore')
            lines_today = logs_today_out.splitlines()
            log(f"Total lines matching today's filter: {len(lines_today)}")
            for l in lines_today[:150]:
                log(l)
                
            ssh.close()
        except Exception as e:
            log(f"Failed: {e}")

if __name__ == "__main__":
    check_backend_status_v3()
