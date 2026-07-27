import asyncio
import json
import os
import sys

# 백엔드 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.firebase_config import send_multicast_notification, initialize_firebase
from backend.db_manager import get_all_fcm_tokens

def send_global_market_alert(title: str, body: str, symbol: str = None, url: str = None):
    """
    모든 유저(비회원 포함)에게 글로벌 정보성 마켓 알림을 발송합니다.
    """
    print(f"========== [Global Market Alert] ==========")
    print(f"Title: {title}".encode('utf-8', 'replace').decode('utf-8'))
    print(f"Body: {body}".encode('utf-8', 'replace').decode('utf-8'))
    
    initialize_firebase()
    
    # 알림 허용자 전원의 FCM 토큰 가져오기 (guest 포함)
    tokens_tuple = get_all_fcm_tokens() 
    # db_manager의 반환 형식에 따라 토큰 추출 (보통 (token,) 형태의 리스트)
    all_tokens = [t[0] if isinstance(t, tuple) else t for t in tokens_tuple]
    all_tokens = list(set(filter(None, all_tokens)))
    
    if not all_tokens:
        print("[Global Market Alert] 발송할 토큰이 없습니다.")
        return
        
    print(f"[Global Market Alert] 총 {len(all_tokens)}대의 기기에 발송 시작...")
    
    push_data = {
        "type": "price_alert",
        "is_global": "true"  # 프론트엔드 GlobalBroadcastListener가 수신하기 위한 플래그
    }
    
    if symbol:
        push_data["symbol"] = symbol
        push_data["url"] = f"/discovery?q={symbol}"
    
    if url:
        push_data["url"] = url
        
    result = send_multicast_notification(
        tokens=all_tokens,
        title=title,
        body=body,
        data=push_data,
        target_users=None # 빈 리스트나 None이면 전체 발송으로 간주 (Firestore에 is_global=True로 저장됨)
    )
    
    print(f"[Global Market Alert] 발송 완료: {result}")

if __name__ == "__main__":
    # 테스트용 글로벌 발송
    test_title = "🇺🇸 테슬라(TSLA)"
    test_body = "🔺 급상승 프리마켓 주식을 확인하세요!"
    
    send_global_market_alert(title=test_title, body=test_body, symbol="TSLA")
