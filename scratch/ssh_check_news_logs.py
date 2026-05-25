import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_logs():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. 최근 500줄 로그에서 [NewsAlert] 패턴 필터링
        print("\n=== Recent NewsAlert Logs ===")
        stdin, stdout, stderr = ssh.exec_command("journalctl -u stocktrend-backend.service -n 1000 --no-pager | grep -i 'NewsAlert'")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. news_sent_log DB 내역 확인
        print("\n=== DB news_sent_log Recent Items ===")
        db_cmd = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT symbol, article_id, title, sent_at FROM news_sent_log ORDER BY sent_at DESC LIMIT 15;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 3. DB watchlist 조회 (FCM 토큰이 연동된 관심종목 대상이 무엇인지 확인)
        print("\n=== Active Watchlists (with FCM token) ===")
        wl_cmd = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT DISTINCT w.user_id, w.symbol FROM watchlist w JOIN fcm_tokens f ON w.user_id = f.user_id;\""
        stdin, stdout, stderr = ssh.exec_command(wl_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 4. fcm_tokens 갯수 확인
        print("\n=== FCM Tokens Count ===")
        fcm_cmd = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT user_id, COUNT(*) FROM fcm_tokens GROUP BY user_id;\""
        stdin, stdout, stderr = ssh.exec_command(fcm_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_logs()
