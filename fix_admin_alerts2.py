import paramiko

key_path = "StockAI-Server.pem"
key = paramiko.RSAKey.from_private_key_file(key_path)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

python_script = """
import sqlite3
import sys

db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_unlimited_alerts = 1, daily_alert_count = 0 WHERE email IN ('rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com')")
    conn.commit()
    
    cursor.execute("SELECT id, email, is_pro, is_unlimited_alerts, daily_alert_count, last_alert_date FROM users WHERE email IN ('rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com')")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
"""

cmd = f"python3 -c \"{python_script}\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:", stderr.read().decode('utf-8', errors='ignore'))

ssh.close()
