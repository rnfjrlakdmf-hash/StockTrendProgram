import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_via_curl():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        commands = [
            "curl -I http://127.0.0.1:3000",
            "curl -I http://127.0.0.1:8000/api/system/status",
            "curl -I -k https://stock-trend-program.co.kr",
            "curl -I http://stock-trend-program.co.kr"
        ]
        
        for cmd in commands:
            print(f"\n=== Running: {cmd} ===")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            print("[STDOUT]")
            print(stdout.read().decode('utf-8', 'ignore'))
            print("[STDERR]")
            print(stderr.read().decode('utf-8', 'ignore'))
            
        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_via_curl()
