import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)
stdin, stdout, stderr = ssh.exec_command("sudo journalctl -u stocktrend-backend.service --since '07:50:00' --until '08:15:00' -n 100 --no-pager")
print(stdout.read().decode('utf-8'))
