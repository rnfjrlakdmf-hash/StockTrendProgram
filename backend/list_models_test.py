import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
req = urllib.request.Request(url)
res = urllib.request.urlopen(req)
data = json.loads(res.read())
for m in data['models']:
    print(m['name'])
