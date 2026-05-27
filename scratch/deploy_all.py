import paramiko
import sys
import io
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_all():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("=== Connecting to remote EC2 server ===")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. git pull
        print("\n=== [1/4] Running git pull on EC2 ===")
        git_cmd = (
            "cd /home/ubuntu/StockTrendProgram && "
            "git fetch origin && "
            "git checkout -- . && "
            "git pull origin main"
        )
        stdin, stdout, stderr = ssh.exec_command(git_cmd)
        print(stdout.read().decode('utf-8', 'ignore'))
        pull_err = stderr.read().decode('utf-8', 'ignore')
        if pull_err:
            print("Stderr:", pull_err)
            
        # 2. Restart backend service
        print("\n=== [2/4] Restarting stocktrend-backend.service ===")
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
        time.sleep(3)
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl status stocktrend-backend.service --no-pager")
        print(stdout.read().decode('utf-8', 'ignore')[:300])
        
        # 3. Build Next.js frontend
        print("\n=== [3/4] Building Next.js Frontend on EC2 ===")
        # 메모리 보존을 위해 .next 디렉토리를 깨끗하게 정리한 후 빌드합니다.
        build_cmd = (
            "cd /home/ubuntu/StockTrendProgram/frontend && "
            "rm -rf .next && "
            "npm run build"
        )
        stdin, stdout, stderr = ssh.exec_command(build_cmd)
        
        # 실시간 빌드 로그 출력
        for line in iter(stdout.readline, ""):
            print(line, end="")
            
        err = stderr.read().decode('utf-8', 'ignore')
        if err:
            print("\nBuild Stderr/Warnings:")
            print(err)
            
        # 4. PM2 Frontend Restart
        print("\n=== [4/4] Restarting PM2 frontend service ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart stocktrend-frontend")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
        print("\n=== Integration Deployment Completed Successfully! ===")
    except Exception as e:
        print("Deployment failed:", e)

if __name__ == "__main__":
    deploy_all()
