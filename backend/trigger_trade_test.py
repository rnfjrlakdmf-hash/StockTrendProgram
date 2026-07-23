from firebase_config import send_multicast_notification, initialize_firebase
from db_manager import get_all_fcm_tokens

def trigger_test():
    initialize_firebase()
    
    # 1. Get Tokens
    tokens = get_all_fcm_tokens()
    print(f"Found {len(tokens)} tokens.")
    
    if not tokens:
        print("No tokens found in DB. Please allow notification in the app first.")
        # Add a dummy token for testing logic if needed, but multicast requires valid tokens
        return

    # 2. Payload
    symbol = "005930" # Samsung Electronics
    price = "75000"
    
    title = f"🔔 [테스트] {symbol} 목표가 도달!"
    body = f"현재가 {price}원. 터치하여 반자동 매매(앱 실행) 테스트를 진행하세요."
    
    data_payload = {
        "type": "TRADING_ALERT",
        "symbol": symbol,
        "price": price,
        "url": f"/trade?symbol={symbol}&price={price}"
    }
    
    print(f"Sending to {len(tokens)} devices...")
    print(f"Payload: {data_payload}")
    
    # 3. Send
    result = send_multicast_notification(tokens, title, body, data_payload)
    print("Result:", result)

if __name__ == "__main__":
    trigger_test()
