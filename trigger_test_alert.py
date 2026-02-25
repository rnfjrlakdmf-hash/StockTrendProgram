import urllib.request
import urllib.error
import json

try:
    url = "https://stocktrendprogram-production.up.railway.app/api/fcm/test"
    data = json.dumps({}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
