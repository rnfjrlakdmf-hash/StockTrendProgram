import paramiko
import sys
import io
import json

def run_remote():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected to EC2!")
        
        print("\n=== Pulling git and building Next.js ===")
        # 혹시 깃에 안 올라간 파일이 있으면 갱신하기 위해 git pull도 수행
        cmd_build = (
            "cd /home/ubuntu/StockTrendProgram/frontend && "
            "git pull origin main && "
            "rm -rf .next && "
            "npm install && "
            "npm run build"
        )
        stdin, stdout, stderr = ssh.exec_command(cmd_build)
        print("=== BUILD OUTPUT ===")
        print(stdout.read().decode('utf-8', 'ignore').encode('ascii', 'replace').decode('ascii'))
        print("=== BUILD ERRORS ===")
        print(stderr.read().decode('utf-8', 'ignore').encode('ascii', 'replace').decode('ascii'))

        
        print("\n=== Restarting PM2 frontend ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart stocktrend-frontend || pm2 start npm --name 'stocktrend-frontend' -- run start")
        print(stdout.read().decode('utf-8', 'ignore').encode('ascii', 'replace').decode('ascii'))




    except Exception as e:
        print("SSH Connection Error:", e)
    finally:
        ssh.close()

if __name__ == "__main__":
    run_remote()
