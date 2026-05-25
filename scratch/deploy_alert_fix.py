import paramiko
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_alert_fix():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    files_to_deploy = [
        ("backend/turbo_engine.py", "/home/ubuntu/StockTrendProgram/backend/turbo_engine.py"),
        ("backend/scheduler_service.py", "/home/ubuntu/StockTrendProgram/backend/scheduler_service.py")
    ]
    
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
        
        # 1. SFTP로 파일 전송
        sftp = ssh.open_sftp()
        for local_file, remote_file in files_to_deploy:
            print(f"Uploading {local_file} to {remote_file}...")
            sftp.put(local_file, remote_file)
            print(f"Upload completed for {local_file}!")
        sftp.close()
        
        # 2. 백엔드 서비스 재시작 및 모니터링
        commands = [
            "sudo systemctl restart stocktrend-backend.service",
            "sudo systemctl status stocktrend-backend.service --no-pager",
            "journalctl -u stocktrend-backend.service -n 50 --no-pager"
        ]
        
        for cmd in commands:
            print(f"\n[RUNNING] {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8', 'ignore')
            err = stderr.read().decode('utf-8', 'ignore')
            print(f"Exit status: {exit_status}")
            if out:
                print("[STDOUT]\n" + out)
            if err:
                print("[STDERR]\n" + err)
                
        ssh.close()
        print("\nDeployment of alert fixes completed successfully!")
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy_alert_fix()
