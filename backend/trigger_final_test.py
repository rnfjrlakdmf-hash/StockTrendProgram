import sys
import os
import time

# 환경변수를 production처럼 설정
os.environ["PRODUCTION"] = "true"
os.environ["DB_PATH"] = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_manager import get_user_fcm_tokens
from firebase_config import send_push_notification

# 대표님의 실제 user_id
TARGET_USER_ID = "110418985320259217419"

tokens_data = get_user_fcm_tokens(TARGET_USER_ID)
tokens = [t['token'] for t in tokens_data]

print(f"Target user: {TARGET_USER_ID}")
print(f"Tokens found: {len(tokens)}")

for tok in tokens:
    print(f"\nSending to: {tok[:25]}...")
    try:
        result = send_push_notification(
            token=tok,
            title="[Test] Connection Verified",
            body=f"System is working perfectly for user {TARGET_USER_ID}!"
        )
        print(f"  Result: {result}")
    except Exception as e:
        print(f"  ERROR: {e}")
