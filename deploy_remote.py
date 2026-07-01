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
        
        # 1. git pull (충돌 파일 정리 후 강제 pull)
        print("\n=== Running git pull on EC2 ===")
        git_cmd = (
            "cd /home/ubuntu/StockTrendProgram && "
            "git fetch origin && "
            "git checkout -- . && "
            "git clean -fd backend/sec_tickers_cache.json 2>/dev/null || true && "
            "git clean -fd backend/data/whale_weekend_report.json 2>/dev/null || true && "
            "rm backend/us_ipo_cache.json 2>/dev/null || true && "
            "git pull origin main"
        )
        stdin, stdout, stderr = ssh.exec_command(git_cmd)
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

        # 5. 한국 종목 검증 (005930 삼성전자)
        print("\n=== Verifying 005930 (Samsung) financials API on EC2 ===")
        stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:8000/api/analysis/stock/005930/financials'")
        res_kr = stdout.read().decode('utf-8', 'ignore')
        try:
            kr_json = json.loads(res_kr)
            data_kr = kr_json.get('data', {})
            detailed_kr = data_kr.get('detailed', {})
            source_kr = detailed_kr.get('source', 'unknown')
            print(f"Source: {source_kr}")  # dart_official_api 이어야 함
            print(f"PER: {data_kr.get('per')}")
            print(f"PBR: {data_kr.get('pbr')}")
            print(f"EPS (원): {data_kr.get('eps')}")
            print(f"BPS (원): {data_kr.get('bps')}")
            print(f"ROE: {data_kr.get('roe')}")
            print(f"배당수익률: {data_kr.get('dvr')}")
            if 'full_data' in detailed_kr:
                fd = detailed_kr['full_data']
                rev_kr = fd.get('revenue', {})
                eps_kr = fd.get('eps', {})
                bps_kr = fd.get('bps', {})
                per_kr = fd.get('per', {})
                pbr_kr = fd.get('pbr', {})
                debt_kr = fd.get('debt_ratio', {})
                print(f"Revenue dates: {rev_kr.get('dates')}")
                print(f"EPS values: {eps_kr.get('values')}")
                print(f"BPS values: {bps_kr.get('values')}")
                print(f"PER values: {per_kr.get('values')}")
                print(f"PBR values: {pbr_kr.get('values')}")
                print(f"debt_ratio values: {debt_kr.get('values')}")
            else:
                print("full_data MISSING - DART fallback to Naver")
        except Exception as e:
            print("KR parse error:", e)

        # 6. 종목발굴 화면 검증 - details 필드 확인 (상세 재무/투자 지표 카드)
        print("\n=== Verifying 005930 stock INFO API (details 카드) on EC2 ===")
        stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:8000/api/analysis/stock/005930' | python3 -c \"import sys,json; d=json.load(sys.stdin); det=d.get('data', {}).get('details',{}); print('PER:', det.get('pe_ratio')); print('EPS:', det.get('eps')); print('PBR:', det.get('pbr')); print('BPS:', det.get('bps')); print('DVR:', det.get('dividend_yield')); print('배당금:', det.get('dividend_rate')); print('forward_pe:', det.get('forward_pe')); print('forward_eps:', det.get('forward_eps'))\" 2>&1")
        info_out = stdout.read().decode('utf-8', 'ignore').strip()
        print(info_out if info_out else "  (응답 없음 또는 파싱 실패)")

        ssh.close()
        print("\n=== Deployment Completed! ===")
    except Exception as e:
        print("Failed to deploy:", e)

if __name__ == "__main__":
    deploy_remote()
