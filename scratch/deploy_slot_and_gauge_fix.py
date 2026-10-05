import os
import paramiko

EC2_HOST = "13.209.99.170"
EC2_USER = "ubuntu"
KEY_FILE = "StockAI-Server.pem"

def main():
    print("Connecting to EC2...")
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(EC2_HOST, username=EC2_USER, pkey=key)

    sftp = ssh.open_sftp()

    # 1. Upload backend/auto_trader_service.py
    print("Uploading backend/auto_trader_service.py...")
    sftp.put("backend/auto_trader_service.py", "/home/ubuntu/StockTrendProgram/backend/auto_trader_service.py")

    # 2. Restart backend
    print("Restarting backend service...")
    stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart stocktrend-backend.service")
    stdout.channel.recv_exit_status()
    print("Backend restarted.")

    # 3. Check if next_dist.tar.gz exists and upload
    if os.path.exists("next_dist.tar.gz"):
        print("Uploading next_dist.tar.gz...")
        sftp.put("next_dist.tar.gz", "/home/ubuntu/next_dist.tar.gz")
        print("Extracting .next on EC2...")
        cmd = """
        rm -rf /home/ubuntu/StockTrendProgram/frontend/.next
        tar -xzf /home/ubuntu/next_dist.tar.gz -C /home/ubuntu/StockTrendProgram/frontend/
        rm -f /home/ubuntu/next_dist.tar.gz
        pm2 restart stocktrend-frontend
        """
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.channel.recv_exit_status()
        print("Frontend extracted and PM2 restarted.")

    sftp.close()

    # Trigger a cycle so paper positions rebalance immediately to 4 KR / 3 US
    print("Triggering run_cycle on EC2 to rebalance slots...")
    cmd = """
    curl -s -X POST http://localhost:8000/api/system/admin/auto-trader/run-cycle \
      -H "Content-Type: application/json" \
      -H "X-Admin-Key: StockTrendSecretAdmin2026!" \
      -d '{"force_buy": false}'
    """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()

    # Verify positions on EC2
    cmd = """python3 -c '
import json
with open("/home/ubuntu/StockTrendProgram/backend/auto_trader_state.json") as f:
    d = json.load(f)
pos = d.get("positions", [])
print(f"Total positions: {len(pos)}")
for p in pos:
    print(" -", p.get("symbol"), p.get("name"), "avg:", p.get("avg_price"), "target:", p.get("target_price"), "stop:", p.get("stop_price"))
'"""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("EC2 Post-Rebalance Verification:")
    print(stdout.read().decode('utf-8'))

    ssh.close()
    print("Deployment finished successfully!")

if __name__ == "__main__":
    main()
