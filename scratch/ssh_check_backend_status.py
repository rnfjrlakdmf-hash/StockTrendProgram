import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_backend_status():
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
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 2. 오늘 로그 확인 (특히 장마감 시간인 15:40 및 스케줄러 로그)
        print("\n=== Recent Journalctl Logs (last 300 lines) ===")
        stdin, stdout, stderr = ssh.exec_command("journalctl -u stocktrend-backend -n 300 --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 3. DB 조회 (FCM 토큰 및 알림 환경설정 확인)
        print("\n=== Database Query: fcm_tokens ===")
        db_cmd = "sqlite3 ~/StockTrendProgram/backend/stock_app.db \"SELECT user_id, pref_morning, pref_closing, pref_price, pref_news, length(token) FROM fcm_tokens;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))

        # 4. DB 조회 (관심종목 목록 확인)
        print("\n=== Database Query: watchlist ===")
        db_cmd2 = "sqlite3 ~/StockTrendProgram/backend/stock_app.db \"SELECT * FROM watchlist;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd2)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_backend_status()
