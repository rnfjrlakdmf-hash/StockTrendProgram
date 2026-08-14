import paramiko

key = paramiko.RSAKey.from_private_key_file('StockAI-Server.pem')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.209.99.170', username='ubuntu', pkey=key)

remote_python_script = """
import sys
import urllib.parse
sys.path.append('/home/ubuntu/StockTrendProgram/backend')

from firebase_config import initialize_firebase, send_multicast_notification
from db_manager import get_all_fcm_tokens_with_user

print('[TEST] 초기화 중...')
initialize_firebase()

print('[TEST] 세력알림 수신 동의 유저(pref_whale_alert=1) 조회 중...')
whale_users = get_all_fcm_tokens_with_user(require_whale_alert=True)

if not whale_users:
    print('[TEST] 알림을 수신할 유저가 없습니다.')
    sys.exit(0)
    
print(f'[TEST] 총 {len(whale_users)}개의 디바이스 토큰 발견!')

w_tokens = [u[1] for u in whale_users]
w_uids = [u[0] for u in whale_users]

prefix_title = '🔔 [공시 팩트 알림]'
corp = '스톡트렌드(시스템점검)'
report_title = '단일판매ㆍ공급계약체결 (정상작동 테스트)'
raw_code = '000000'
dart_link = 'https://dart.fss.or.kr/'

w_title = f"{prefix_title} {corp}"
fact_str = "" 
w_body = f"{fact_str}\\n\\n[앱에서 즉시 확인하기]" if fact_str else f"{report_title}\\n\\n[앱에서 즉시 확인하기]"

w_data = {
    "type": "whale_alert",
    "url": f"/stock/{raw_code}",
    "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}",
    "symbol": raw_code
}

result = send_multicast_notification(w_tokens, w_title, w_body, w_data, target_users=w_uids)
print(f'[TEST] 발송 결과: {result}')
"""

# Create the file on the remote server
sftp = ssh.open_sftp()
with sftp.file('/home/ubuntu/StockTrendProgram/remote_test_script.py', 'w') as f:
    f.write(remote_python_script)
sftp.close()

# Execute the script
stdin, stdout, stderr = ssh.exec_command('/home/ubuntu/StockTrendProgram/backend/venv/bin/python /home/ubuntu/StockTrendProgram/remote_test_script.py')
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
