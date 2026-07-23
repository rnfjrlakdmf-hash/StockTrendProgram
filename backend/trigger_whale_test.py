import sys
import os

# Firebase 앱 초기화 및 모듈 로딩을 위해 경로 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_manager import get_all_fcm_tokens_with_user
from firebase_config import send_multicast_notification

def run_test():
    tokens = []
    # 중복 제거를 위해 set 사용 (같은 유저가 여러 토큰을 가질 수 있으나 일단 모두 발송)
    for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=True):
        if tok:
            tokens.append(tok)
            
    print(f"Total tokens found: {len(tokens)}")
    
    if not tokens:
        print("No tokens found to send test notification.")
        return
        
    push_data = {
        "type": "disclosure_alert",
        "url": "/stock/005930",
        "symbol": "005930",
        "is_global": "true"
    }
    
    title = "🚨 [슈퍼개미 포착] 삼성전자"
    body = "누군가 방금 지분 5% 이상을 긁어모았습니다! (테스트 발송입니다)"
    
    send_multicast_notification(tokens, title, body, push_data)
    print("Test push notification sent successfully!")

if __name__ == "__main__":
    run_test()
