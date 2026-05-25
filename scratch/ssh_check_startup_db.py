import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_startup_db_log():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. Database path가 포함된 기동 로그 검색
        print("\n=== Database path logs ===")
        cmd = "journalctl -u stocktrend-backend.service --no-pager | grep -i 'Database path'"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Database path 가 없다면, DB Init 혹은 db 관련 로그 전체 검색
        print("\n=== DB-related logs ===")
        cmd2 = "journalctl -u stocktrend-backend.service -n 500 --no-pager | grep -E -i 'Database|DB|sqlite'"
        stdin, stdout, stderr = ssh.exec_command(cmd2)
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_startup_db_log()
