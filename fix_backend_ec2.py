import paramiko

key_path = "StockAI-Server.pem"
key = paramiko.RSAKey.from_private_key_file(key_path)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmds = [
    "sudo kill -9 3851984",
    "sudo systemctl restart stocktrend-backend",
    "sleep 2",
    "sudo systemctl status stocktrend-backend"
]

print("Fixing backend service on EC2...")
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:")
    print(stdout.read().decode('utf-8', errors='ignore'))
    print("STDERR:")
    print(stderr.read().decode('utf-8', errors='ignore'))

ssh.close()
