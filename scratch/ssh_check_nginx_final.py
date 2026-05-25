import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_nginx_content():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. Nginx sites-enabled default file content
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-enabled/default")
        print("=== Nginx Current default Config ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Curl local header check
        stdin, stdout, stderr = ssh.exec_command("curl -sI https://stock-trend-program.co.kr/settings")
        print("=== Curl Header Check ===")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_nginx_content()
