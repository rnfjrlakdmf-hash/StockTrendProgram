import asyncio
import os
import sys
import paramiko
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def trigger_remote_test():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 원격 서버에 업로드한 test_split.py 실행
        test_cmd = "bash -l -c 'cd ~/StockTrendProgram/backend && venv/bin/python3 test_split.py'"
        print("Running remote test command...")
        stdin, stdout, stderr = ssh.exec_command(test_cmd)
        print("[STDOUT]\n" + stdout.read().decode('utf-8', 'ignore'))
        print("[STDERR]\n" + stderr.read().decode('utf-8', 'ignore'))
        
        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    trigger_remote_test()
