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
        
        cmd = '''
        cd /home/ubuntu/StockTrendProgram/backend && \
        source venv/bin/activate && \
        cat << 'EOF' > query_db.py
import sqlite3
import json
conn = sqlite3.connect('stock_app.db')
cursor = conn.cursor()
cursor.execute("SELECT user_id, device_type, last_used FROM fcm_tokens ORDER BY last_used DESC LIMIT 10;")
rows = cursor.fetchall()
print(json.dumps(rows, indent=2))
EOF
        python query_db.py
        '''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("FCM Tokens:")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    trigger()
