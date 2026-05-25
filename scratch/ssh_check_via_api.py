import paramiko
import sys
import io
import json

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_via_api():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected to EC2!")
        
        # 1. API - system status 호출
        print("\n=== API: /api/system/status ===")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:8000/api/system/status")
        res = stdout.read().decode('utf-8', 'ignore')
        try:
            print(json.dumps(json.loads(res), indent=2, ensure_ascii=False))
        except:
            print(res)
            
        # 2. API - 최근 alerts 호출 (최대 10개)
        print("\n=== API: /api/alerts (Recent Alerts) ===")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:8000/api/alerts")
        res_alerts = stdout.read().decode('utf-8', 'ignore')
        try:
            alerts_data = json.loads(res_alerts)
            if isinstance(alerts_data, list):
                print(f"Total Alerts Count: {len(alerts_data)}")
                for alert in alerts_data[:10]:
                    print(f"- [{alert.get('symbol')}] {alert.get('title')} ({alert.get('created_at')})")
            else:
                print(json.dumps(alerts_data, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Error parsing alerts: {e}\nRaw response: {res_alerts}")

        # 2.5. systemd 서비스 최근 로그 50줄 출력
        print("\n=== systemd Service Logs (Last 50 lines) ===")
        stdin, stdout, stderr = ssh.exec_command("sudo journalctl -u stocktrend-backend.service -n 50 --no-pager")
        print(stdout.read().decode('utf-8', 'ignore'))

        # 3. systemd 격리 폴더 또는 기본 경로에서 실제 DB 경로 조회 및 직접 쿼리
        print("\n=== Checking SQLite DB ===")
        # 1) find_cmd 실행
        find_cmd = "sudo find /tmp/systemd-private-* -name 'stock_app.db' -printf '%T@ %p\\n' 2>/dev/null | sort -n | tail -1 | cut -f2- -d' '"
        stdin, stdout, stderr = ssh.exec_command(find_cmd)
        actual_db_path = stdout.read().decode('utf-8', 'ignore').strip()
        find_err = stderr.read().decode('utf-8', 'ignore').strip()
        
        if find_err:
            print(f"find_cmd stderr: {find_err}")
        
        if not actual_db_path:
            # fallback: 기본 백엔드 경로 확인
            stdin, stdout, stderr = ssh.exec_command("[ -f /home/ubuntu/StockTrendProgram/backend/stock_app.db ] && echo 'found'")
            has_default_db = stdout.read().decode('utf-8', 'ignore').strip() == 'found'
            if has_default_db:
                actual_db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
        
        if actual_db_path:
            print(f"Using DB path: {actual_db_path}")
            
            # Python script to run on EC2 to query the SQLite DB
            py_code = """import sqlite3
conn = sqlite3.connect('PATH_PLACEHOLDER')
cursor = conn.cursor()

# 1. news_sent_log 최신 10건
try:
    cursor.execute("SELECT symbol, article_id, title, sent_at FROM news_sent_log ORDER BY sent_at DESC LIMIT 10")
    print("=== news_sent_log (Recent 10 items) ===")
    rows = cursor.fetchall()
    if not rows:
        print("  (Empty)")
    for row in rows:
        print(f"  - [{row[0]}] {row[2]} ({row[3]})")
except Exception as e:
    print("Error querying news_sent_log:", e)

# 2. watchlist
try:
    cursor.execute("SELECT DISTINCT w.user_id, w.symbol FROM watchlist w JOIN fcm_tokens f ON w.user_id = f.user_id")
    print("\\n=== Watchlist items matched with FCM tokens ===")
    rows = cursor.fetchall()
    if not rows:
        print("  (Empty)")
    for row in rows:
        print(f"  - User: {row[0]}, Symbol: {row[1]}")
except Exception as e:
    print("Error querying watchlist:", e)

# 3. fcm_tokens per user
try:
    cursor.execute("SELECT user_id, COUNT(*) FROM fcm_tokens GROUP BY user_id")
    print("\\n=== FCM tokens per user ===")
    rows = cursor.fetchall()
    if not rows:
        print("  (Empty)")
    for row in rows:
        print(f"  - User: {row[0]}, Tokens Count: {row[1]}")
except Exception as e:
    print("Error querying fcm_tokens:", e)

conn.close()
""".replace('PATH_PLACEHOLDER', actual_db_path)
            
            # python3 -c 로 실행하기 위해 코드를 안전하게 전달 (base64 인코딩하여 실행)
            import base64
            encoded_code = base64.b64encode(py_code.encode('utf-8')).decode('utf-8')
            db_cmd = f"sudo python3 -c \"import base64; exec(base64.b64decode('{encoded_code}').decode('utf-8'))\""
            
            stdin, stdout, stderr = ssh.exec_command(db_cmd)
            print(stdout.read().decode('utf-8', 'ignore'))
            db_err = stderr.read().decode('utf-8', 'ignore').strip()
            if db_err:
                print(f"db_cmd stderr: {db_err}")
        else:
            print("Could not find stock_app.db anywhere")

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_via_api()
