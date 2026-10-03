import os
import tarfile
import paramiko
import sys
import io
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def pack_next():
    tar_path = "frontend/next_dist.tar.gz"
    print("Compressing frontend/.next (excluding cache)...")
    if os.path.exists(tar_path):
        os.remove(tar_path)
    
    with tarfile.open(tar_path, "w:gz") as tar:
        for root, dirs, files in os.walk("frontend/.next"):
            if "cache" in dirs:
                dirs.remove("cache")
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, "frontend")
                tar.add(full_path, arcname=arcname)
    
    size_mb = os.path.getsize(tar_path) / (1024 * 1024)
    print(f"Compressed package created: {tar_path} ({size_mb:.2f} MB)")
    return tar_path

def deploy_to_ec2(tar_path):
    key_path = "StockAI-Server.pem"
    hostname = "13.209.99.170"
    username = "ubuntu"
    
    print(f"\nConnecting to {username}@{hostname}...")
    k = paramiko.RSAKey.from_private_key_file(key_path)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, pkey=k, timeout=20)
    print("Connected successfully!")
    
    print("\nUploading source and pre-built package via SFTP...")
    sftp = ssh.open_sftp()
    
    files_to_upload = [
        ("backend/market_tag_helper.py", "/home/ubuntu/StockTrendProgram/backend/market_tag_helper.py"),
        ("backend/auto_trader_service.py", "/home/ubuntu/StockTrendProgram/backend/auto_trader_service.py"),
        ("frontend/src/lib/marketTag.ts", "/home/ubuntu/StockTrendProgram/frontend/src/lib/marketTag.ts"),
        ("frontend/src/app/alerts/page.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/app/alerts/page.tsx"),
        ("frontend/src/app/admin/auto-trade/page.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/app/admin/auto-trade/page.tsx"),
        ("frontend/src/app/error.tsx", "/home/ubuntu/StockTrendProgram/frontend/src/app/error.tsx"),
    ]

    for local_file, remote_file in files_to_upload:
        if os.path.exists(local_file):
            print(f"Uploading {local_file} -> {remote_file}")
            sftp.put(local_file, remote_file)
        else:
            print(f"Warning: Local file not found: {local_file}")
    
    # Upload tar.gz
    remote_tar = "/home/ubuntu/StockTrendProgram/frontend/next_dist.tar.gz"
    def progress(transferred, total):
        pct = (transferred / total) * 100
        print(f"\rUpload progress: {pct:.1f}% ({transferred}/{total} bytes)", end="", flush=True)
    
    sftp.put(tar_path, remote_tar, callback=progress)
    sftp.close()
    print("\nUpload finished successfully!")
    
    print("\nExtracting .next on EC2 and restarting PM2 backend & frontend...")
    extract_cmd = (
        "cd /home/ubuntu/StockTrendProgram/frontend && "
        "rm -rf .next && "
        "tar -xzf next_dist.tar.gz && "
        "rm next_dist.tar.gz && "
        "sudo systemctl restart stocktrend-backend.service && "
        "pm2 reload stocktrend-frontend"
    )
    stdin, stdout, stderr = ssh.exec_command(extract_cmd)
    print(stdout.read().decode('utf-8', 'ignore'))
    err = stderr.read().decode('utf-8', 'ignore')
    if err:
        print("Stderr:", err)
        
    print("\nVerifying server status...")
    time.sleep(3)
    _, out_code_admin, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/admin/auto-trade")
    code_admin = out_code_admin.read().decode('utf-8', 'ignore').strip()
    print(f"Auto-trade HTTP Code: {code_admin}")

    _, out_code_alerts, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/alerts?tab=auto_trade")
    code_alerts = out_code_alerts.read().decode('utf-8', 'ignore').strip()
    print(f"Alerts HTTP Code: {code_alerts}")

    _, out_backend, _ = ssh.exec_command("curl -s http://127.0.0.1:8000/api/system/admin/auto-trader/dashboard")
    backend_res = out_backend.read().decode('utf-8', 'ignore')
    print(f"Backend dashboard length: {len(backend_res)} bytes")
    
    ssh.close()
    print("\nDeployment completed successfully!")

if __name__ == '__main__':
    tar_path = pack_next()
    deploy_to_ec2(tar_path)
