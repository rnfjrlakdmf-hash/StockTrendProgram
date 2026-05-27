import paramiko
import io
import sys

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def read_remote_env():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected to EC2.")
        
        # Read .env file on EC2
        stdin, stdout, stderr = ssh.exec_command("cat /home/ubuntu/StockTrendProgram/backend/.env")
        env_content = stdout.read().decode('utf-8', 'ignore')
        print("--- Remote backend/.env content ---")
        print(env_content)
        
        # Check systemd env if any
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl show stocktrend-backend.service --property=Environment")
        env_show = stdout.read().decode('utf-8', 'ignore')
        print("--- Remote Systemd Env ---")
        print(env_show)
        
        ssh.close()
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    read_remote_env()
