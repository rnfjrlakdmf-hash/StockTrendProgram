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
cursor.execute('SELECT device_type, device_name, pref_whale_alert, updated_at, user_id FROM fcm_tokens WHERE pref_whale_alert=1')
rows = cursor.fetchall()
with open('/tmp/fs_users2.txt', 'w', encoding='utf-8') as f:
    for r in rows:
        f.write(str(r) + '\\n')
'''

sftp = ssh.open_sftp()
with sftp.file('/home/ubuntu/StockTrendProgram/check_user_tokens.py', 'w') as f:
    f.write(remote_script)

stdin, stdout, stderr = ssh.exec_command('/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/check_user_tokens.py')
stdout.read() # Wait for it to finish

sftp.get('/tmp/fs_users2.txt', 'fs_users2_downloaded.txt')
sftp.close()
ssh.close()
