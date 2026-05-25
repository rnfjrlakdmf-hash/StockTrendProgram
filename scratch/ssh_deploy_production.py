import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print(f"Loading private key from {key_path}...")
    try:
        key = paramiko.RSAKey.from_private_key_file(key_path)
    except Exception as e:
        print(f"Failed to load private key: {e}")
        return
        
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        commands = [
            "cd ~/StockTrendProgram && git pull",
            "sudo systemctl restart stocktrend-backend.service",
            "sudo systemctl status stocktrend-backend.service --no-pager",
            "journalctl -u stocktrend-backend.service -n 20 --no-pager"
        ]
        
        for cmd in commands:
            print(f"\n[RUNNING] {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            # Wait for the command to finish
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8', 'ignore')
            err = stderr.read().decode('utf-8', 'ignore')
            print(f"Exit status: {exit_status}")
            if out:
                print("[STDOUT]\n" + out)
            if err:
                print("[STDERR]\n" + err)
                
        ssh.close()
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
