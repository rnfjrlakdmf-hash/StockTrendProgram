import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

remote_script = '''
import sqlite3
import sys

conn = sqlite3.connect('/home/ubuntu/StockTrendProgram/backend/stock_app.db')
cursor = conn.cursor()
cursor.execute('SELECT device_type, device_name, pref_whale_alert, updated_at FROM fcm_tokens WHERE pref_whale_alert=1')
rows = cursor.fetchall()
for r in rows:
    try:
        print(r)
    except:
        print("Encoding error on row")
'''

sftp = ssh.open_sftp()
with sftp.file('/home/ubuntu/StockTrendProgram/check_all_tokens.py', 'w') as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/check_all_tokens.py')
print(stdout.read().decode('utf-8', errors='ignore'))
