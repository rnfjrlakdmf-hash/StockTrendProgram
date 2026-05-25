import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_db_path():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. systemd service 내용 확인
        print("\n=== Systemd Service File ===")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/systemd/system/stocktrend-backend.service")
        service_content = stdout.read().decode('utf-8', 'ignore')
        print(service_content)
        
        # Env 환경 변수 분석
        import re
        db_path_match = re.search(r"Environment=.*DB_PATH=([^\s]+)", service_content)
        db_path = "~/StockTrendProgram/backend/stock_app.db" # Default
        if db_path_match:
            db_path = db_path_match.group(1)
            print(f"Found DB_PATH in systemd config: {db_path}")
        else:
            # Let's search for .db files in user home
            print("\n=== Finding all .db files ===")
            stdin, stdout, stderr = ssh.exec_command("find ~ -name '*.db'")
            print(stdout.read().decode('utf-8', 'ignore'))
            
            # Let's check environment variable in running process
            print("\n=== Environ of backend process ===")
            stdin, stdout, stderr = ssh.exec_command("strings /proc/$(pgrep -f uvicorn)/environ | grep -E 'DB_PATH|PORT|VERCEL'")
            print(stdout.read().decode('utf-8', 'ignore'))
            
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_db_path()
