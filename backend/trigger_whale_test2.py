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
        
    rnd = str(int(time.time()))[-4:]
    title = f"🐳 고래 알림 (태그 무시 테스트) - {rnd}"
    body = "이 알림은 안드로이드가 중복으로 씹지 못하도록 태그를 매번 다르게 설정했습니다."
    
    # data에 random type을 넣어서 fcm_tag가 항상 무작위가 되도록 유도!
    data = {
        "type": f"random_alert_{rnd}",
        "url": "/",
        "symbol": f"RND{rnd}"
    }
    
    send_multicast_notification(tokens, title, body, data=data)
    print("Test push sent!")

if __name__ == "__main__":
    run_test()
