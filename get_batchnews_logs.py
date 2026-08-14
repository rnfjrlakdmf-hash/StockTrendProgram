import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

stdin, stdout, stderr = ssh.exec_command('journalctl -u stocktrend-backend --since "12 hours ago" | grep BatchNews')
print(stdout.read().decode('utf-8', errors='replace'))
