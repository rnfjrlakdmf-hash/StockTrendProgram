import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)
stdin, stdout, stderr = ssh.exec_command('cat /tmp/test_out.txt')
with open('local_out.txt', 'wb') as f:
    f.write(stdout.read())
