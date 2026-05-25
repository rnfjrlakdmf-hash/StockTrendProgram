import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def find_db():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. systemd 서비스 내용 확인
        print("\n=== Systemd Service File ===")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/systemd/system/stocktrend-backend.service")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. 실행 중인 uvicorn 프로세스의 환경 변수 중 DB_PATH 확인
        print("\n=== Environ of backend process ===")
        stdin, stdout, stderr = ssh.exec_command("strings /proc/$(pgrep -f uvicorn)/environ | grep -E 'DB_PATH|PORT|VERCEL'")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 3. 홈 디렉토리 및 시스템 전체에서 stock_app.db 검색
        print("\n=== Finding stock_app.db files ===")
        stdin, stdout, stderr = ssh.exec_command("find / -name 'stock_app.db' 2>/dev/null")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    find_db()
