import paramiko
import json
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def check_remote_api():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=10)
        
        # 원격 서버 로컬의 백엔드 포트 8000번으로 직접 curl 요청
        cmd = "curl -s http://localhost:8000/api/market/korea/heatmap"
        print(f"Running command: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', 'ignore')
        
        try:
            res_json = json.loads(out)
            data = res_json.get("data", [])
            print(f"Status: {res_json.get('status')}")
            print(f"Total themes returned: {len(data)}")
            for i, theme in enumerate(data[:15]):
                theme_name = theme.get("theme") or theme.get("name")
                percent = theme.get("percent")
                stocks = theme.get("stocks", [])
                print(f"[{i+1}] {theme_name} ({percent}) -> Stocks Count: {len(stocks)}")
                if stocks:
                    print(f"    Stocks Sample: {stocks}")
        except Exception as je:
            print("Failed to parse JSON response:")
            print(out[:1000])
            
        ssh.close()
    except Exception as e:
        print(f"SSH connection failed: {e}")

if __name__ == "__main__":
    check_remote_api()
