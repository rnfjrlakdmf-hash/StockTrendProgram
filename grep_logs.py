import paramiko
key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)
stdin, stdout, stderr = ssh.exec_command("sudo journalctl -u stocktrend-backend.service --since '2026-05-31 22:50:00' --until '2026-05-31 23:15:00' | grep -E 'MorningBriefing|Scheduler|Firebase'")
with open('grep_logs.txt', 'w', encoding='utf-8') as f:
    f.write(stdout.read().decode('utf-8', errors='ignore'))
