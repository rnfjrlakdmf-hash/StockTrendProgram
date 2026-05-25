import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_watchlist():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. watchlist 테이블 조회
        print("\n=== Watchlist Items ===")
        db_cmd = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT id, user_id, symbol FROM watchlist;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. price_alerts 테이블 조회
        print("\n=== Active Price Alerts ===")
        db_cmd2 = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT id, user_id, symbol, type, buy_price, threshold, target_price, active FROM price_alerts;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd2)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 3. fcm_tokens 테이블 및 알림 환경설정 조회
        print("\n=== FCM Tokens Settings ===")
        db_cmd3 = "sqlite3 /home/ubuntu/StockTrendProgram/backend/stock_app.db \"SELECT user_id, token, pref_news, pref_price FROM fcm_tokens;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd3)
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_watchlist()
