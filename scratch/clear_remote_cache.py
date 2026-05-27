import paramiko

def clear_cache():
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print("Connecting to remote EC2 server...")
    key = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, pkey=key, timeout=15)
        print("Connected!")
        
        # 1. Clear database cache table
        cmd_db = (
            "python3 -c \"import sqlite3; "
            "conn = sqlite3.connect('/home/ubuntu/StockTrendProgram/backend/stock_app.db'); "
            "conn.execute('DELETE FROM ai_analysis_cache;'); "
            "conn.commit(); "
            "conn.close(); "
            "print('Remote DB cache cleared!')\""
        )
        print("Clearing remote DB cache...")
        stdin, stdout, stderr = ssh.exec_command(cmd_db)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("Stdout:", out)
        if err: print("Stderr:", err)
        
        # 2. Restart backend to clear memory cache (TurboCache) and restart PM2 frontend
        print("Restarting backend service...")
        ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
        print("Restarting PM2 frontend service...")
        ssh.exec_command("pm2 restart stocktrend-frontend")
        print("Restart commands sent!")
        
        ssh.close()
        print("Disconnected.")
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    clear_cache()
