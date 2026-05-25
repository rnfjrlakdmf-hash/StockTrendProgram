import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_price_logs():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. 최근 1500줄 로그에서 PriceAlert, AutoPriceAlert 관련 로그 필터링
        print("\n=== Recent Price/AutoPrice Alert Logs ===")
        stdin, stdout, stderr = ssh.exec_command(
            "journalctl -u stocktrend-backend.service -n 1500 --no-pager | grep -E -i 'PriceAlert|AutoPrice|AlertsLoop'"
        )
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 2. 혹시 발생한 yfinance 에러가 있는지 조회
        print("\n=== YFinance or DB Errors in Logs ===")
        stdin, stdout, stderr = ssh.exec_command(
            "journalctl -u stocktrend-backend.service -n 1500 --no-pager | grep -E -i 'yfinance|fetch error|DB-Error'"
        )
        print(stdout.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_price_logs()
