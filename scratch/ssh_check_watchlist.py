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
        
        # /tmp/stock_app.db 확인
        print("\n=== Watchlist DB check on /tmp/stock_app.db ===")
        db_cmd = "sqlite3 /tmp/stock_app.db \"SELECT id, user_id, symbol FROM watchlist LIMIT 20;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # ~/StockTrendProgram/backend/stock_app.db 도 확인
        print("\n=== Watchlist DB check on backend/stock_app.db ===")
        db_cmd2 = "sqlite3 ~/StockTrendProgram/backend/stock_app.db \"SELECT id, user_id, symbol FROM watchlist LIMIT 20;\""
        stdin, stdout, stderr = ssh.exec_command(db_cmd2)
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_watchlist()
