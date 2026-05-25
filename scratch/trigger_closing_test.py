import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def trigger_closing_test():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. 강제 트리거 파이썬 스크립트 작성 및 업로드
        py_code = """
import sys
import os
sys.path.append('/home/ubuntu/StockTrendProgram/backend')

# 1) DB 연결 및 FCM 전송 환경 초기화
from scheduler_service import send_closing_notification
from stock_data import STOCK_DATA_CACHE

print("STOCK_DATA_CACHE Warmup check (Count):", len(STOCK_DATA_CACHE))

# 2) 강제 장마감 알림 호출 (국내)
try:
    print("[TEST] Triggering send_closing_notification('KR') now...")
    send_closing_notification("KR")
    print("[TEST] Completed without exception! (FCM multicast sent)")
except Exception as e:
    print("[TEST-Error] Failed to trigger closing report:", e)
"""
        sftp = ssh.open_sftp()
        with sftp.open("/home/ubuntu/StockTrendProgram/backend/trigger_closing_test.py", "w") as f:
            f.write(py_code)
        sftp.close()
        
        # 2. 실행 및 결과 수집 (FastAPI 가상환경 내 python3 활용)
        cmd_run = "cd /home/ubuntu/StockTrendProgram/backend && ./venv/bin/python trigger_closing_test.py"
        stdin, stdout, stderr = ssh.exec_command(cmd_run)
        print("[STDOUT]\n", stdout.read().decode('utf-8', 'ignore'))
        print("[STDERR]\n", stderr.read().decode('utf-8', 'ignore'))
        
        # 3. 임시 파일 삭제
        ssh.exec_command("rm /home/ubuntu/StockTrendProgram/backend/trigger_closing_test.py")
        ssh.close()
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    trigger_closing_test()
