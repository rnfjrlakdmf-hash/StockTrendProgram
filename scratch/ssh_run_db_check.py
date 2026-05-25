import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_remote_check():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 가상환경 파이썬 또는 기본 파이썬으로 원격 검증용 파일 실행
        cmd = "/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/check_db_remote.py"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        print("\n=== Remote Output ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        print("\n=== Remote Error ===")
        print(stderr.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    run_remote_check()
