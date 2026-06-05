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
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        
        cmd = """
        cd /home/ubuntu/StockTrendProgram/backend && \
        source venv/bin/activate && \
        python -c "
from db_manager import get_db_connection
conn = get_db_connection()
c = conn.cursor()
c.execute('SELECT user_id, device_type, user_agent, updated_at FROM fcm_tokens ORDER BY updated_at DESC LIMIT 10')
print('=== RECENT 10 TOKENS ===')
for t in c.fetchall():
    print(t)
"
        """
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    trigger()
