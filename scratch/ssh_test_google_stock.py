import paramiko
import sys
import io
import json

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def test_google_stock():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected to EC2 Server!")
        
        # 1. '구글'로 검색한 결과 테스트
        print("\n=== [TEST 1] Search for '구글' ===")
        # '구글'은 URL 인코딩 필요: %EA%B5%AC%EA%B8%80
        cmd_search = "curl -s \"http://127.0.0.1:8000/api/market/stock/search?q=%EA%B5%AC%EA%B8%80\""
        stdin, stdout, stderr = ssh.exec_command(cmd_search)
        res_search = stdout.read().decode('utf-8', 'ignore')
        try:
            print(json.dumps(json.loads(res_search), indent=2, ensure_ascii=False))
        except:
            print(res_search)
            
        # 2. GOOGL (Class A) 주가 정보 호출 테스트
        print("\n=== [TEST 2] Fetch info for GOOGL (Alphabet Class A) ===")
        cmd_googl = "curl -s \"http://127.0.0.1:8000/api/analysis/stock/GOOGL/fast\""
        stdin, stdout, stderr = ssh.exec_command(cmd_googl)
        res_googl = stdout.read().decode('utf-8', 'ignore')
        try:
            print(json.dumps(json.loads(res_googl), indent=2, ensure_ascii=False))
        except:
            print(res_googl)
            
        # 3. GOOG (Class C) 주가 정보 호출 테스트
        print("\n=== [TEST 3] Fetch info for GOOG (Alphabet Class C) ===")
        cmd_goog = "curl -s \"http://127.0.0.1:8000/api/analysis/stock/GOOG/fast\""
        stdin, stdout, stderr = ssh.exec_command(cmd_goog)
        res_goog = stdout.read().decode('utf-8', 'ignore')
        try:
            print(json.dumps(json.loads(res_goog), indent=2, ensure_ascii=False))
        except:
            print(res_goog)
            
        ssh.close()
    except Exception as e:
        print(f"Failed to connect or test: {e}")

if __name__ == "__main__":
    test_google_stock()
