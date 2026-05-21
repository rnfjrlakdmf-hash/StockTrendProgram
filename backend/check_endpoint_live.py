import requests
import json

try:
    print("Sending request to http://127.0.0.1:8000/api/rank/top10/KR ...")
    response = requests.get("http://127.0.0.1:8000/api/rank/top10/KR", timeout=10)
    
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print("JSON Response keys:", data.keys())
        if 'data' in data:
            print(f"Data item count: {len(data['data'])}")
            if len(data['data']) > 0:
                print("First item:", data['data'][0])
        else:
            print("Full response:", data)
    except Exception as e:
        print("Failed to decode JSON:", e)
        print("Raw text:", response.text[:200])

except Exception as e:
    print(f"Connection failed: {e}")
    print("Is the backend server running?")
