import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

key_path = "StockAI-Server.pem"
hostname = "13.209.99.170"
username = "ubuntu"

key = paramiko.RSAKey.from_private_key_file(key_path)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname, username=username, pkey=key, timeout=15)

print("Connected. Running report generator on EC2...")
stdin, stdout, stderr = ssh.exec_command("cd StockTrendProgram/backend && /home/ubuntu/StockTrendProgram/backend/venv/bin/python3 -m utils.whale_weekend_report")
print(stdout.read().decode('utf-8', 'ignore'))
print(stderr.read().decode('utf-8', 'ignore'))
