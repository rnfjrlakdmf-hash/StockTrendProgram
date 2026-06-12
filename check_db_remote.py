import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', key_filename='StockAI-Server.pem')

python_code = """
import sqlite3
import json

db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'
try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM site_analytics ORDER BY date DESC LIMIT 5;')
    rows = [dict(row) for row in c.fetchall()]
    print(json.dumps(rows, indent=2))
except Exception as e:
    print(e)
"""

stdin, stdout, stderr = ssh.exec_command(f"python3 -c \"{python_code}\"")
print("Output:", stdout.read().decode())
print("Error:", stderr.read().decode())
