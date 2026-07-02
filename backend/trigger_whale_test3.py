import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_manager import get_all_fcm_tokens_with_user
from firebase_config import send_multicast_notification

def run_test():
    tokens = []
    for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=False):
        if tok:
            tokens.append(tok)
            
    print(f"Total tokens found: {len(tokens)}")
    if not tokens:
        return
        
    title = f"🚀 앱 알림 테스트 - {int(time.time())}"
    body = "이 알림이 보인다면 기기가 정상적으로 설정된 것입니다!"
    
    # data가 None이면 추가적인 복잡한 태그 라우팅 로직을 최소화함
    res = send_multicast_notification(tokens, title, body, data=None)
    print(f"Result: {res}")

if __name__ == "__main__":
    run_test()
