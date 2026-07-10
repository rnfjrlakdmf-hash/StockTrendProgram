import paramiko

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmds = [
    "echo '' >> /home/ubuntu/StockTrendProgram/backend/.env",
    "echo 'TELEGRAM_BOT_TOKEN=8784904341:AAEDCGI3f62AJzRREvWt_IMgfXN2HwKXtE4' >> /home/ubuntu/StockTrendProgram/backend/.env",
    "echo 'TELEGRAM_CHAT_ID=@stocktrend_live' >> /home/ubuntu/StockTrendProgram/backend/.env",
    "sudo systemctl restart stocktrend-backend.service"
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

print("EC2 .env updated and service restarted")
