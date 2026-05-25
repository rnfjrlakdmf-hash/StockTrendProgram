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
        
        # 1. Git status on server
        stdin, stdout, stderr = ssh.exec_command("cd ~/StockTrendProgram && git status")
        print("=== Git status on server ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Check head/tail of server's FlipIndexTicker.tsx
        stdin, stdout, stderr = ssh.exec_command("tail -n 40 ~/StockTrendProgram/frontend/src/components/FlipIndexTicker.tsx")
        print("=== FlipIndexTicker.tsx tail ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 3. Read active Nginx config
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/default")
        print("=== /etc/nginx/sites-available/default ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_logs()
