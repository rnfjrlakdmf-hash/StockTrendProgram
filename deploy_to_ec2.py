import paramiko
import sys

key_path = "StockAI-Server.pem"
key = paramiko.RSAKey.from_private_key_file(key_path)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

print("=== EC2 서버에 최신 코드 배포 시작 ===")

cmds = [
    ("git pull 실행", "cd /home/ubuntu/StockTrendProgram && git pull origin main 2>&1"),
    ("서비스 재시작", "sudo systemctl restart stocktrend-backend 2>&1"),
    ("5초 대기", "sleep 5"),
    ("서비스 상태 확인", "sudo systemctl status stocktrend-backend --no-pager -l 2>&1 | head -30"),
    ("최근 로그 확인", "sudo journalctl -u stocktrend-backend -n 15 --no-pager 2>&1"),
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
