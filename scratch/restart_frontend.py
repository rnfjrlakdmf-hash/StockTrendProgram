import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def restart_frontend():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("=== Connecting to remote EC2 server ===")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. restart PM2 frontend
        print("\n=== Restarting PM2 stocktrend-frontend ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart stocktrend-frontend")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. wait a bit and check PM2 list
        import time
        time.sleep(2)
        print("\n=== PM2 List Status ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
        print("\n=== Frontend Restart Completed! ===")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    restart_frontend()
