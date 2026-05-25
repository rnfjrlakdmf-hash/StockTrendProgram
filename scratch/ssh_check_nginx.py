import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_nginx_and_curl():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # Get the settings HTML and print specific sections
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:3000/settings > /tmp/settings.html && grep -o 'Sector Trend v[0-9.]*' /tmp/settings.html || echo 'Not Found'")
        print("=== Version in HTML ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        stdin, stdout, stderr = ssh.exec_command("grep -o 'com.kb.securities.mobile.mable' /tmp/settings.html || echo 'KB package not found'")
        print("=== KB Securities Package Status ===")
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_nginx_and_curl()
