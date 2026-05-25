import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_backend_logs():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. systemd logs
        print("\n=== FastAPI Backend journalctl logs (Last 100 lines) ===")
        stdin, stdout, stderr = ssh.exec_command("sudo journalctl -u stocktrend-backend.service -n 100 --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. CPU / Memory process sorting to see if something is hanging
        print("\n=== Top CPU/MEM consuming processes ===")
        stdin, stdout, stderr = ssh.exec_command("ps aux --sort=-%cpu | head -n 10")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_backend_logs()
