import requests
import time

# Railway Production URL
API_URL = "https://stocktrendprogram-production.up.railway.app"

def trigger_direct_test():
    print(f"[INFO] Connecting to {API_URL}...")
    
    headers = {
        "X-User-Id": "guest",
        "Content-Type": "application/json"
    }
    
    # Send to all devices for this user
    payload = {} 
    
    try:
        print("[INFO] Sending request to /api/fcm/test...")
        response = requests.post(f"{API_URL}/api/fcm/test", json=payload, headers=headers)
        
        if response.status_code == 200:
            print("[SUCCESS] Test Notification Request Sent!")
            print(f"Response: {response.json()}")
            print("⏳ Check your notification NOW (it should be instant)...")
        else:
            print(f"[ERROR] Failed to send notification. Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")

if __name__ == "__main__":
    trigger_direct_test()
