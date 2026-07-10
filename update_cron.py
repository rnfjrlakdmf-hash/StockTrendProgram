import paramiko

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

cmd = '''
(crontab -l 2>/dev/null; echo "0 23 * * * cd /home/ubuntu/StockTrendProgram/backend && /home/ubuntu/StockTrendProgram/backend/venv/bin/python daily_theory_bot.py >> /home/ubuntu/daily_theory.log 2>&1") | crontab -
'''

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))

ssh.close()
