import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_clean():
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
            # 1. git reset 및 git clean을 통한 강제 원격지 클렌징
            "cd ~/StockTrendProgram && git reset --hard HEAD",
            "cd ~/StockTrendProgram && git clean -fd",
            # 2. 최신 코드 pull
            "cd ~/StockTrendProgram && git pull",
            # 3. 백엔드 재시작
            "sudo systemctl restart stocktrend-backend.service",
            "sudo systemctl status stocktrend-backend.service --no-pager",
            # 4. 프론트엔드 빌드 및 배포
            "bash -l -c 'cd ~/StockTrendProgram/frontend && rm -rf .next && npm run build'",
            "bash -l -c 'pm2 restart 0'",
            "bash -l -c 'pm2 list'"
        ]
        
        for cmd in commands:
            print(f"\n[RUNNING] {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            
            # Real-time output streaming for long commands
            if "npm run build" in cmd:
                while True:
                    line = stdout.readline()
                    if not line:
                        break
                    print(line, end="")
            else:
                exit_status = stdout.channel.recv_exit_status()
                out = stdout.read().decode('utf-8', 'ignore')
                err = stderr.read().decode('utf-8', 'ignore')
                print(f"Exit status: {stdout.channel.recv_exit_status()}")
                if out:
                    print("[STDOUT]\n" + out)
                if err:
                    print("[STDERR]\n" + err)
                
        ssh.close()
        print("\nDeployment completed successfully!")
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy_clean();
