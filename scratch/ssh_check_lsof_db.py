import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_lsof():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. lsof 명령어로 sqlite DB를 열고 있는 프로세스와 그 경로 검색
        print("\n=== LSOF for sqlite db ===")
        stdin, stdout, stderr = ssh.exec_command("sudo lsof | grep -i stock_app.db")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. backend PM2 프로세스의 환경 변수 확인 (sudo 필요할 수 있음)
        print("\n=== PM2 Env and DB_PATH ===")
        stdin, stdout, stderr = ssh.exec_command("sudo strings /proc/$(pgrep -f 'main:app' | head -n 1)/environ | grep -E 'DB_PATH|PORT|VERCEL'")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_lsof()
