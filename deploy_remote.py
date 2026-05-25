import paramiko
import sys
import io
import json

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def deploy_remote():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("=== Connecting to remote EC2 server ===")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected successfully!")
        
        # 1. git pull
        print("\n=== Running git pull on EC2 ===")
        stdin, stdout, stderr = ssh.exec_command("cd /home/ubuntu/StockTrendProgram && git pull")
        print(stdout.read().decode('utf-8', 'ignore'))
        pull_err = stderr.read().decode('utf-8', 'ignore')
        if pull_err:
            print("Stderr:", pull_err)
            
        # 2. Restart backend service
        print("\n=== Restarting stocktrend-backend.service ===")
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
        # wait a bit for systemctl to apply restart
        import time
        time.sleep(3)
        
        # 3. Check service status
        print("\n=== Service Status ===")
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl status stocktrend-backend.service --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))
        
        # 4. Local API verification call
        print("\n=== Verifying AAPL financials API call locally on EC2 ===")
        stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:8000/api/analysis/stock/AAPL/financials'")
        res = stdout.read().decode('utf-8', 'ignore')
        try:
            res_json = json.loads(res)
            print("API SUCCESS! Output data keys:")
            print(f"Status: {res_json.get('status')}")
            data = res_json.get('data', {})
            print(f"symbol: {data.get('symbol') or 'N/A'}")
            print(f"market_cap: {data.get('market_cap')}")
            print(f"per: {data.get('per')}")
            print(f"pbr: {data.get('pbr')}")
            print(f"roe: {data.get('roe')}")
            detailed = data.get('detailed', {})
            print(f"detailed.success: {detailed.get('success')}")
            if 'full_data' in detailed:
                print(f"detailed.full_data keys: {list(detailed['full_data'].keys())}")
                rev = detailed['full_data'].get('revenue', {})
                print(f"Revenue dates: {rev.get('dates')}")
                print(f"Revenue values: {rev.get('values')}")
        except Exception as e:
            print("Failed to parse JSON response:", e)
            print("Raw response:", res)

        ssh.close()
        print("\n=== Deployment Completed! ===")
    except Exception as e:
        print("Failed to deploy:", e)

if __name__ == "__main__":
    deploy_remote()
