import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def trigger():
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
        
        # 스크립트 작성 및 실행
        cmd = '''
        cd /home/ubuntu/StockTrendProgram/backend && \
        source venv/bin/activate && \
        cat << 'EOF' > trigger.py
from scheduler_service import send_closing_notification
send_closing_notification("KR")
EOF
        python trigger.py
        '''
        print("=== Triggering Push Notification ===")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
        print("\n=== Trigger Completed! ===")
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    trigger()
