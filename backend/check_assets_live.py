import requests
import json

try:
    print("Sending request to http://127.0.0.1:8000/api/assets ...")
    response = requests.get("http://127.0.0.1:8000/api/assets", timeout=10)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success!")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("Failed:", response.text)

except Exception as e:
    print(f"Connection failed: {e}")
