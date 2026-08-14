import paramiko
import os

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

remote_script = """
import sys
import urllib.parse
sys.path.append('/home/ubuntu/StockTrendProgram/backend')

from firebase_config import initialize_firebase, send_multicast_notification
from db_manager import get_all_fcm_tokens_with_user

initialize_firebase()
whale_users = get_all_fcm_tokens_with_user(require_whale_alert=True)

if not whale_users:
    with open("/tmp/test_out.txt", "w") as f:
        f.write("No users")
    sys.exit(0)

w_tokens = [u[1] for u in whale_users]
w_uids = [u[0] for u in whale_users]

prefix_title = '🔔 [공시 팩트 알림]'
corp = '스톡트렌드(시스템점검2)'
report_title = '단일판매ㆍ공급계약체결 (정상작동 테스트)'
raw_code = '000000'
dart_link = 'https://dart.fss.or.kr/'

w_title = f"{prefix_title} {corp}"
w_body = f"{report_title}\\n\\n[앱에서 즉시 확인하기]"

w_data = {
    'type': 'whale_alert',
    'url': f'/stock/{raw_code}',
    'dart_url': f'https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}',
    'symbol': raw_code
}

result = send_multicast_notification(w_tokens, w_title, w_body, w_data, target_users=w_uids)
with open("/tmp/test_out.txt", "w") as f:
    f.write(str(result))
"""

sftp = ssh.open_sftp()
with sftp.file('/home/ubuntu/StockTrendProgram/remote_test2.py', 'w') as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/remote_test2.py && cat /tmp/test_out.txt')
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='ignore'))
