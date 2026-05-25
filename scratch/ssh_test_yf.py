import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def test_yfinance():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # yfinance 모듈을 사용하여 000660.KS 및 GOOGL.O 데이터 직접 요청
        py_code = (
            "import yfinance as yf\n"
            "for sym in ['000660.KS', 'GOOGL.O']:\n"
            "    print(f'Testing {sym}...')\n"
            "    try:\n"
            "        ticker = yf.Ticker(sym)\n"
            "        data = ticker.history(period=\"1d\", interval=\"1m\")\n"
            "        print(f'{sym} Data empty:', data.empty)\n"
            "        if not data.empty:\n"
            "            print(data.tail(2))\n"
            "    except Exception as e:\n"
            "        print(f'{sym} Error:', e)\n"
        )
        
        cmd = f"/home/ubuntu/StockTrendProgram/backend/venv/bin/python << 'EOF'\n{py_code}\nEOF\n"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        print("\n=== Test Output ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        print("\n=== Test Error ===")
        print(stderr.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_yfinance()
