
import requests
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from korea_data import HEADER

url = "https://finance.naver.com/sise/theme.naver"
res = requests.get(url, headers=HEADER)
print("Raw Bytes (First 50):", res.content[:50])

# Try decoding with different encodings
for enc in ['utf-8', 'cp949', 'euc-kr', 'latin-1']:
    try:
        text = res.content[:100].decode(enc)
        print(f"{enc} Result:", text[:20])
    except:
        print(f"{enc} Failed")
