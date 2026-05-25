import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_db_via_python():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # Herdoc(여러 줄)을 이용한 파이썬 스크립트 실행
        cmd = (
            "/home/ubuntu/StockTrendProgram/backend/venv/bin/python << 'EOF'\n"
            "import sqlite3\n"
            "conn = sqlite3.connect('/home/ubuntu/StockTrendProgram/backend/stock_app.db')\n"
            "c = conn.cursor()\n"
            "c.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")\n"
            "print('Tables:', c.fetchall())\n"
            
            "try:\n"
            "    c.execute(\"SELECT id, user_id, symbol FROM watchlist\")\n"
            "    print('Watchlist:', c.fetchall())\n"
            "except Exception as e:\n"
            "    print('Watchlist query error:', e)\n"
            
            "try:\n"
            "    c.execute(\"SELECT id, user_id, symbol, type, active FROM price_alerts\")\n"
            "    print('Price Alerts:', c.fetchall())\n"
            "except Exception as e:\n"
            "    print('Price Alerts query error:', e)\n"
            
            "try:\n"
            "    c.execute(\"SELECT user_id, token, pref_news, pref_price FROM fcm_tokens\")\n"
            "    print('FCM Tokens:', c.fetchall())\n"
            "except Exception as e:\n"
            "    print('FCM query error:', e)\n"
            
            "conn.close()\n"
            "EOF\n"
        )
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        print("\n=== Python Execution Output ===")
        print(stdout.read().decode('utf-8', 'ignore'))
        print("\n=== Python Execution Error ===")
        print(stderr.read().decode('utf-8', 'ignore'))

        ssh.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_db_via_python()
