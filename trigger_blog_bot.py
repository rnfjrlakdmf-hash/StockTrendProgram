import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', key_filename='StockAI-Server.pem')

stdin, stdout, stderr = ssh.exec_command('cd /home/ubuntu/StockTrendProgram/backend && /home/ubuntu/StockTrendProgram/backend/venv/bin/python auto_blog_bot.py kor')
print("Stdout:", stdout.read().decode('utf-8'))
print("Stderr:", stderr.read().decode('utf-8'))
