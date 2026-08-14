import paramiko
import os

key_path = "StockAI-Server.pem"
key = paramiko.RSAKey.from_private_key_file(key_path)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

# Upload scheduler.py
sftp = ssh.open_sftp()
local_path = "backend/scheduler.py"
remote_path = "/home/ubuntu/StockTrendProgram/backend/scheduler.py"

print(f"Uploading {local_path} to {remote_path}...")
sftp.put(local_path, remote_path)
sftp.close()
print("Upload complete. Restarting service...")

# Restart service
stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart stocktrend-backend")
stdout.channel.recv_exit_status() # wait for completion

print("Service restarted.")
ssh.close()
