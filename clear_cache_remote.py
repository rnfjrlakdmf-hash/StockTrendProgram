import paramiko

key_path = "StockAI-Server.pem"
hostname = "13.209.99.170"
username = "ubuntu"

key = paramiko.RSAKey.from_private_key_file(key_path)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname, username=username, pkey=key)

cmd = 'python3 -c "import sqlite3; conn = sqlite3.connect(\'/home/ubuntu/StockTrendProgram/backend/stock_app.db\'); cursor = conn.cursor(); cursor.execute(\'DELETE FROM ai_analysis_cache\'); conn.commit(); conn.close()"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())

cmd = 'sudo systemctl restart stocktrend-backend'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Restarting backend...")
ssh.close()
