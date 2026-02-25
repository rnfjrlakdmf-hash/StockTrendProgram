import requests
import time

# Railway Production URL
API_URL = "https://stocktrendprogram-production.up.railway.app"

def trigger_test_alert():
    print(f"[INFO] Connecting to {API_URL}...")
    
    # 1. Register a test alert for 'guest' (which the user likely is)
    # Target: AAPL price >= 1.0 (Always true, triggers immediately)
    payload = {
        "symbol": "AAPL",
        "type": "target_price",
        "target_price": 1.0,
        "quantity": 1
    }
    
    headers = {
        "X-User-Id": "guest",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{API_URL}/api/alerts/price", json=payload, headers=headers)
        
        if response.status_code == 200:
            print("[SUCCESS] Test Alert Registered!")
            print(f"Response: {response.json()}")
            print("⏳ Check your notification in 10-30 seconds...")
        else:
            print(f"[ERROR] Failed to register alert. Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")

if __name__ == "__main__":
    trigger_test_alert()
