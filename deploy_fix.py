import paramiko
import sys

key_path = "StockAI-Server.pem"
key = paramiko.RSAKey.from_private_key_file(key_path)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

print("=== EC2 Force Deploy ===")

cmds = [
    ("Git 강제 리셋 및 클린", "cd /home/ubuntu/StockTrendProgram && git fetch origin && git reset --hard origin/main && git clean -fd 2>&1"),
    ("서비스 재시작", "sudo systemctl restart stocktrend-backend 2>&1"),
    ("5초 대기", "sleep 5"),
]

for label, cmd in cmds:
    print(f"\n--- {label} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    if out:
        print(out)
    if err:
        print("[STDERR]", err)

ssh.close()
print("\n=== 배포 완료 ===")
