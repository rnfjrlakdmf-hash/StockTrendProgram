import paramiko

def get_telegram_logs():
    k = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect('13.209.99.170', username='ubuntu', pkey=k)
    
    # Check if there are any Telegram errors or successful sends
    stdin, stdout, stderr = s.exec_command('journalctl -u stocktrend-backend.service --no-pager | grep -iE "telegram|whalesiren"')
    out = stdout.read().decode()
    with open('ec2_telegram_logs.txt', 'w', encoding='utf-8') as f:
        f.write(out)
        
    s.close()

if __name__ == '__main__':
    get_telegram_logs()
