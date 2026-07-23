import requests
import json
import os
import traceback
from datetime import datetime
import pytz

try:
    from firebase_config import initialize_firebase, send_multicast_notification
    import firebase_admin
    from firebase_admin import firestore
    from db_manager import get_all_fcm_tokens
except ImportError:
    pass

STATE_FILE = os.path.join(os.path.dirname(__file__), 'crypto_state.json')

# 코인별 한글명 및 연관 주식 매핑
CRYPTO_MAP = {
    "KRW-BTC": {"name": "비트코인", "threshold": 0.05, "stocks": "우리기술투자, 한화투자증권"},
    "KRW-ETH": {"name": "이더리움", "threshold": 0.05, "stocks": "우리기술투자"},
    "KRW-XRP": {"name": "리플", "threshold": 0.10, "stocks": "갤럭시아머니트리, 다날"},
    "KRW-DOGE": {"name": "도지코인", "threshold": 0.10, "stocks": "다날, 갤럭시아머니트리"},
    "KRW-SOL": {"name": "솔라나", "threshold": 0.10, "stocks": "갤럭시아머니트리"}
}

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_state(state: dict):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Crypto] Failed to save state: {e}")

def check_crypto_surge():
    """업비트 API를 호출하여 급등 코인을 체크하고 알림을 보냅니다."""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')
    
    state = load_state()
    # 날짜가 바뀌면 상태 초기화
    if state.get("date") != today_str:
        state = {"date": today_str, "alerted_coins": []}
        
    markets = ",".join(CRYPTO_MAP.keys())
    url = f"https://api.upbit.com/v1/ticker?markets={markets}"
    headers = {"accept": "application/json"}
    
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code != 200:
            print(f"[Crypto] Upbit API error: {res.status_code}")
            return
            
        data = res.json()
        for item in data:
            market = item.get("market")
            change_rate = item.get("signed_change_rate", 0) # 0.05 = 5%
            
            if market in CRYPTO_MAP:
                config = CRYPTO_MAP[market]
                threshold = config["threshold"]
                
                # 급등/급락 감지 및 당일 알림 발송 이력 확인
                if abs(change_rate) >= threshold and market not in state["alerted_coins"]:
                    # 발송 처리
                    coin_name = config["name"]
                    percent_str = f"{change_rate * 100:.1f}%"
                    stocks = config["stocks"]
                    
                    if change_rate > 0:
                        title = f"🚀 주말 코인 불장! {coin_name} {percent_str} 급등"
                        body = f"월요일 장 시작 점상 예상? 관련주: {stocks} (미리 확인하세요)"
                    else:
                        title = f"🚨 주말 코인 폭락! {coin_name} {percent_str} 급락"
                        body = f"월요일 장 하락 출발 주의! 관련주: {stocks} (미리 대비하세요)"
                    
                    print(f"[Crypto] 변동 포착: {title}")
                    
                    # Firebase 알림 전송
                    try:
                        initialize_firebase()
                        
                        # DB에서 'pref_whale_alert' 켜둔 사용자들의 토큰 모으기
                        tokens = get_all_fcm_tokens(require_whale_alert=True)
                        if tokens:
                            push_data = {
                                "type": "crypto_alert",
                                "symbol": coin_name,
                                "url": "/dashboard"
                            }
                            send_multicast_notification(tokens, title, body, push_data)
                            print(f"[Crypto] Sent multicast alert to {len(tokens)} tokens.")
                        else:
                            print("[Crypto] No tokens subscribed to whale alerts.")
                        
                        # Firestore에 저장하여 OBS 위젯 등에 노출
                        try:
                            db_client = firestore.client()
                            db_client.collection('alerts').add({
                                'type': 'crypto',
                                'title': title,
                                'body': body,
                                'link': "/dashboard",
                                'timestamp': firestore.SERVER_TIMESTAMP,
                                'read': False
                            })
                        except Exception as e:
                            print(f"[Crypto] Failed to save alert to Firestore: {e}")
                    except Exception as e:
                        print(f"[Crypto] Firebase push error: {e}")
                    
                    # 상태 업데이트 (중복 발송 방지)
                    state["alerted_coins"].append(market)
                    save_state(state)
                    
    except Exception as e:
        print(f"[Crypto] Exception checking surge: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    check_crypto_surge()
