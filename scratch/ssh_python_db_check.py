import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_python_db_check():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 원격에서 실행할 python 코드
        py_code = """
import sqlite3
import os

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
print("File exists:", os.path.exists(db_path))
if os.path.exists(db_path):
    print("File size:", os.path.getsize(db_path))
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 테이블 목록 조회
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cursor.fetchall()]
    print("Tables in DB:", tables)
    
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            cnt = cursor.fetchone()[0]
            print(f"Table {table}: {cnt} rows")
        except Exception as e:
            print(f"Table {table} error: {e}")
            
    # fcm_tokens 데이터 샘플
    if 'fcm_tokens' in tables:
        cursor.execute("SELECT user_id, device_type, pref_news FROM fcm_tokens LIMIT 5;")
        print("FCM Tokens Samples:", cursor.fetchall())
        
    # watchlist 데이터 샘플
    if 'watchlist' in tables:
        cursor.execute("SELECT user_id, symbol FROM watchlist LIMIT 5;")
        print("Watchlist Samples:", cursor.fetchall())
        
    conn.close()
"""
        # 이 파이썬 코드를 원격 임시 파일로 저장한 뒤 python3로 실행
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/check_db_temp.py", "w") as f:
            f.write(py_code)
        sftp.close()
        
        stdin, stdout, stderr = ssh.exec_command("python3 /home/ubuntu/check_db_temp.py")
        print("=== STDOUT ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        print("=== STDERR ===")
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 임시 파일 삭제
        ssh.exec_command("rm /home/ubuntu/check_db_temp.py")
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    run_python_db_check()
