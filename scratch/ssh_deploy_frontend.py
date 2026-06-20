import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_frontend():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. PM2 리스트 확인
        print("\n=== Active PM2 Processes ===")
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. 프론트엔드 폴더로 이동하여 빌드 수행
        print("\n=== Building Next.js Frontend ===")
        # build command: npm install && npm run build
        # 쉘 환경 변수 로드를 위해 bash -l -c 를 사용합니다. (node, npm path 관련)
        build_cmd = "bash -l -c 'cd ~/StockTrendProgram && git pull && cd frontend && rm -rf .next && npm install && npm run build'"
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
        # pm2 list 결과에서 보통 0번 또는 이름으로 restart
        stdin, stdout, stderr = ssh.exec_command("bash -l -c 'pm2 restart 0'")
        print(stdout.read().decode('utf-8', 'ignore'))
        print(stderr.read().decode('utf-8', 'ignore'))
        
        # 4. PM2 상태 최종 확인
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    deploy_frontend()
