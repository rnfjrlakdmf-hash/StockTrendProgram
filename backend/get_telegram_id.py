import requests
import json

token = "8177986686:AAEk89GeI327ftFLgGN8IZHnUQJK9TiArV0"
url = f"https://api.telegram.org/bot{token}/getUpdates"

try:
    print(f"Requesting {url}...")
    res = requests.get(url)
    data = res.json()
    print("Response:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
