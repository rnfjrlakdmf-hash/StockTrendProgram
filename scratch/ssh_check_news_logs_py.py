import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_logs_python():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected to remote server!")
        
        # 1. systemd logs
        print("\n=== Recent NewsAlert systemd Logs ===")
        stdin, stdout, stderr = ssh.exec_command("journalctl -u stocktrend-backend.service -n 100 --no-pager | grep -i 'NewsAlert'")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Remote Python query
        py_code = """
import sqlite3
import os

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cursor.fetchall()]
    
    print("\\n=== DB news_sent_log Recent Items ===")
    if 'news_sent_log' in tables:
        cursor.execute("SELECT symbol, article_id, title, sent_at FROM news_sent_log ORDER BY sent_at DESC LIMIT 15;")
        rows = cursor.fetchall()
        for r in rows:
            print(f"Symbol: {r[0]}, ID: {r[1]}, Title: {r[2][:50]}, SentAt: {r[3]}")
    else:
        print("news_sent_log table does not exist.")
        
    print("\\n=== Active Watchlists (with FCM token) ===")
    if 'watchlist' in tables and 'fcm_tokens' in tables:
        cursor.execute("SELECT DISTINCT w.user_id, w.symbol FROM watchlist w JOIN fcm_tokens f ON w.user_id = f.user_id;")
        rows = cursor.fetchall()
        for r in rows:
            print(f"User: {r[0]}, Symbol: {r[1]}")
    else:
        print("watchlist or fcm_tokens table missing.")
        
    print("\\n=== FCM Tokens Count ===")
    if 'fcm_tokens' in tables:
        cursor.execute("SELECT user_id, COUNT(*) FROM fcm_tokens GROUP BY user_id;")
        rows = cursor.fetchall()
        for r in rows:
            print(f"User: {r[0]}, Token Count: {r[1]}")
            
    conn.close()
else:
    print("Database file not found at", db_path)
"""
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/check_logs_temp.py", "w") as f:
            f.write(py_code)
        sftp.close()
        
        stdin, stdout, stderr = ssh.exec_command("python3 /home/ubuntu/check_logs_temp.py")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # Clean up
        ssh.exec_command("rm /home/ubuntu/check_logs_temp.py")
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_logs_python()
