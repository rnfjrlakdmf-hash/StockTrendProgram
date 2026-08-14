import paramiko

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmd = """
cd /home/ubuntu/StockTrendProgram && git pull && sudo systemctl restart stocktrend-backend
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
