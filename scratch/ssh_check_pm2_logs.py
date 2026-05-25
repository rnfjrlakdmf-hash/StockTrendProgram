import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_pm2_nginx_logs():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. PM2 Logs
        print("\n=== PM2 Logs (Last 100 lines) ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 logs stocktrend-frontend --lines 100 --no-daemon")
        # Wait a bit for logs since --no-daemon stops
        # Actually, pm2 log with --lines and without --no-daemon might exit or we can read from file.
        # Alternatively, direct file reading from ~/.pm2/logs/
        stdin, stdout, stderr = ssh.exec_command("tail -n 100 ~/.pm2/logs/stocktrend-frontend-error.log")
        print("[PM2 ERR LOG]")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        stdin, stdout, stderr = ssh.exec_command("tail -n 100 ~/.pm2/logs/stocktrend-frontend-out.log")
        print("[PM2 OUT LOG]")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. Nginx Error Logs
        print("\n=== Nginx Error Logs ===")
        stdin, stdout, stderr = ssh.exec_command("sudo tail -n 100 /var/log/nginx/error.log")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_pm2_nginx_logs()
