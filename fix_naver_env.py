import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmd = """
sed -i 's/NAVER_CLIENT_ID=.*/NAVER_CLIENT_ID=X1lSLnU6VrVTHrZJ5iTE/g' /home/ubuntu/StockTrendProgram/backend/.env
sed -i 's/NAVER_CLIENT_SECRET=.*/NAVER_CLIENT_SECRET=DsyNTK2e8d/g' /home/ubuntu/StockTrendProgram/backend/.env
sudo systemctl restart stocktrend-backend.service
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
