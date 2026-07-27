import paramiko
k = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
s = paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('13.209.99.170', username='ubuntu', pkey=k)
stdin, stdout, stderr = s.exec_command('sudo journalctl -u stocktrend-backend --since "20 minutes ago" --no-pager')
out = stdout.read().decode('utf-8', errors='ignore')
lines = [l for l in out.splitlines() if 'lobal' in l or 'Firebase' in l or 'fcm' in l.lower() or 'multicast' in l]
with open('filtered_logs.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
s.close()
