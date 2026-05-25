import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_db_tables():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 원격 서버에서 실행할 파이썬 소스
        py_code = """
import sqlite3
import os

db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'
if not os.path.exists(db_path):
    print("DB file not found:", db_path)
    exit(1)
    
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. watchlist 조회
cursor.execute("SELECT user_id, symbol, added_price FROM watchlist")
wl = cursor.fetchall()
print("=== Watchlist Rows ===")
print("Count:", len(wl))
for row in wl[:20]:
    print(" -", row)

# 2. fcm_tokens 조회
cursor.execute("SELECT user_id, pref_morning, pref_closing, pref_price, pref_news, length(token) FROM fcm_tokens")
tokens = cursor.fetchall()
print("\\n=== FCM Tokens Rows ===")
print("Count:", len(tokens))
for row in tokens[:20]:
    print(" -", row)

conn.close()
"""
        # 임시 스크립트 작성 및 원격 실행
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/StockTrendProgram/backend/tmp_db_check.py", "w") as f:
            f.write(py_code)
        sftp.close()
        
        stdin, stdout, stderr = ssh.exec_command("python3 /home/ubuntu/StockTrendProgram/backend/tmp_db_check.py")
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 임시 파일 삭제
        ssh.exec_command("rm /home/ubuntu/StockTrendProgram/backend/tmp_db_check.py")
        ssh.close()
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    check_db_tables()
