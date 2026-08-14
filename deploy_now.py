import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmds = [
    'cd /home/ubuntu/StockTrendProgram && git pull origin main',
    'sudo systemctl restart stocktrend-backend.service',
    'sudo systemctl restart stocktrend-fcm.service'
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print('STDOUT:', stdout.read().decode('utf-8'))
    print('STDERR:', stderr.read().decode('utf-8'))

print('Deployed to EC2!')

