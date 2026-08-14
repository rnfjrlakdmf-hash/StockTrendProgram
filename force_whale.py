import paramiko

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

remote_script = """
import sys
import os
sys.path.append('/home/ubuntu/StockTrendProgram/backend')
from firebase_config import initialize_firebase, send_multicast_notification
from db_manager import get_all_fcm_tokens_with_user

initialize_firebase()
user_tokens = get_all_fcm_tokens_with_user(require_insider_alert=True)
if user_tokens:
    target_uids = [u[0] for u in user_tokens]
    tokens = [u[1] for u in user_tokens]
    push_data = {
        "type": "sec_insider_trading",
        "symbol": "TSLA (Tesla Inc)",
        "url": "/discovery",
        "market": "US",
    }
    title = "🐳 [내부자 거래 포착] 강제 테스트!"
    body = "이 알림이 보인다면 백그라운드 수신이 정상입니다. (Form 4)"
    print(f"Sending to {len(tokens)} tokens...")
    result = send_multicast_notification(tokens, title, body, push_data, target_users=target_uids)
    print("Result:", result)
else:
    print("No tokens found.")
"""

sftp = ssh.open_sftp()
with sftp.file('/home/ubuntu/StockTrendProgram/test_whale_force.py', 'w') as f:
    f.write(remote_script)

stdin, stdout, stderr = ssh.exec_command('PYTHONIOENCODING=utf-8 /home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/test_whale_force.py')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
