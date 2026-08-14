import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)
stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/StockTrendProgram/backend/scheduler.py')
with open('local_scheduler.py', 'wb') as f:
    f.write(stdout.read())
