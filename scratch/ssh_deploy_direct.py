import paramiko
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_direct():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    files_to_upload = [
        ("backend/scheduler_service.py", "/home/ubuntu/StockTrendProgram/backend/scheduler_service.py"),
        ("backend/news_alerts.py", "/home/ubuntu/StockTrendProgram/backend/news_alerts.py"),
        ("backend/morning_briefing.py", "/home/ubuntu/StockTrendProgram/backend/morning_briefing.py"),
        ("backend/test_split.py", "/home/ubuntu/StockTrendProgram/backend/test_split.py"),
        ("backend/diag_tokens.py", "/home/ubuntu/StockTrendProgram/backend/diag_tokens.py"),
        ("backend/stock_data.py", "/home/ubuntu/StockTrendProgram/backend/stock_data.py"),
        ("backend/routes/market.py", "/home/ubuntu/StockTrendProgram/backend/routes/market.py")
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
        for local_f, remote_f in files_to_upload:
            print(f"Uploading {local_f} to {remote_f}...")
            sftp.put(local_f, remote_f)
        sftp.close()
        print("Upload completed successfully!")
        
        # 2. 백엔드 서비스 재시작
        commands = [
            "sudo systemctl restart stocktrend-backend.service",
            "sudo systemctl status stocktrend-backend.service --no-pager",
            "journalctl -u stocktrend-backend.service -n 20 --no-pager"
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
        print("\nDirect deployment completed successfully!")
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy_direct()
