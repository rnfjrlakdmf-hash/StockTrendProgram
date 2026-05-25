import paramiko
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_frontend_direct():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    files_to_upload = [
        ("frontend/src/components/FlipIndexTicker.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/components/FlipIndexTicker.tsx"),
        ("frontend/src/app/globals.css", "/home/ubuntu/StockTrendProgram/frontend/src/app/globals.css"),
        ("frontend/src/app/settings/page.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/app/settings/page.tsx"),
        ("frontend/src/app/layout.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/app/layout.tsx"),
        ("frontend/src/components/FCMTokenManager.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/components/FCMTokenManager.tsx"),
        ("frontend/public/sitemap.xml", "/home/ubuntu/StockTrendProgram/frontend/public/sitemap.xml"),
        ("frontend/public/googlef1b9176b69076ce5.html", "/home/ubuntu/StockTrendProgram/frontend/public/googlef1b9176b69076ce5.html"),
        ("frontend/public/naverd1a5029178414151d0fd99a83053ce16.html", "/home/ubuntu/StockTrendProgram/frontend/public/naverd1a5029178414151d0fd99a83053ce16.html"),
        ("frontend/src/lib/stockMapping.ts", "/home/ubuntu/StockTrendProgram/frontend/src/lib/stockMapping.ts")
    ]
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. SFTP 파일 전송
        sftp = ssh.open_sftp()
        for local_file, remote_file in files_to_upload:
            print(f"Uploading {local_file} to {remote_file}...")
            sftp.put(local_file, remote_file)
        sftp.close()
        print("All files uploaded successfully!")
        
        # 2. Next.js 빌드 수행
        print("\n=== Building Next.js Frontend on Remote Server ===")
        build_cmd = "bash -l -c 'cd ~/StockTrendProgram/frontend && rm -rf .next && npm run build'"
        stdin, stdout, stderr = ssh.exec_command(build_cmd)
        
        # 실시간 빌드 로그 출력
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line, end="")
            
        err = stderr.read().decode('utf-8', 'ignore')
        if err:
            print("\n[STDERR]\n", err)
            
        # 3. PM2 Next.js 앱 재시작
        print("\n=== Restarting PM2 Next.js Process ===")
        stdin, stdout, stderr = ssh.exec_command("bash -l -c 'pm2 restart 0'")
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 4. PM2 상태 최종 확인
        print("\n=== Active PM2 Processes ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
        print("\nDirect frontend deployment completed successfully!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    deploy_frontend_direct()
