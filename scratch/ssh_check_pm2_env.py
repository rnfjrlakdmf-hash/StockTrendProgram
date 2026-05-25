import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_pm2_env():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # pm2 describe 0
        stdin, stdout, stderr = ssh.exec_command("pm2 describe 0")
        print("=== PM2 Describe 0 ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # pm2 logs 0 --lines 20
        stdin, stdout, stderr = ssh.exec_command("pm2 logs 0 --lines 20 --nostream")
        print("=== PM2 Logs 0 ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_pm2_env()
