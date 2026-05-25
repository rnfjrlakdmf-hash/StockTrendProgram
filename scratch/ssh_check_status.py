import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_status():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # CPU/Memory Status
        stdin, stdout, stderr = ssh.exec_command("free -h && df -h && ps aux | grep node")
        print("=== Resource & Node Processes ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # PM2 list
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print("=== PM2 List ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # Nginx status or version log checking
        stdin, stdout, stderr = ssh.exec_command("tail -n 20 ~/StockTrendProgram/frontend/package.json")
        print("=== package.json ===")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_status()
