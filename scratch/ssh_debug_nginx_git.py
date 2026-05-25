import paramiko
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_commands():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=10)
        
        commands = {
            "Nginx Config (Home)": "cat ~/nginx_default.conf",
            "Nginx Config (Etc)": "cat /etc/nginx/sites-enabled/default",
            "Nginx Config (Etc 2)": "cat /etc/nginx/nginx.conf",
            "Git Status": "cd ~/StockTrendProgram && git status",
            "Git Diff (backend)": "cd ~/StockTrendProgram && git diff backend/",
            "Active Ports (No sudo)": "ss -tln || netstat -an | grep LISTEN",
            "PM2 env variables": "pm2 env 0"
        }
        
        for name, cmd in commands.items():
            print(f"\n==================== {name} ====================")
            print(f"Command: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8', 'ignore')
            err = stderr.read().decode('utf-8', 'ignore')
            if out:
                print("[STDOUT]")
                print(out)
            if err:
                print("[STDERR]")
                print(err)
                
        ssh.close()
    except Exception as e:
        print(f"SSH connection failed: {e}")

if __name__ == "__main__":
    run_commands()
