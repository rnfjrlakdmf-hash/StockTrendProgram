
import requests
import os
import sys
from bs4 import BeautifulSoup

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from korea_data import HEADER, decode_safe

url = "https://finance.naver.com/sise/theme.naver"
res = requests.get(url, headers=HEADER)
print("Response Encoding:", res.encoding)
print("Header Content-Type:", res.headers.get('Content-Type'))

# Method 1: Raw bytes decode
try:
    decoded = res.content.decode('cp949')
    print("CP949 Decode (First 100 chars):", decoded[:100])
except Exception as e:
    print("CP949 Decode Failed:", e)

# Method 2: decode_safe
html = decode_safe(res)
soup = BeautifulSoup(html, 'html.parser')
name_tag = soup.select_one("td.col_type1 a")
if name_tag:
    print("Found Name Tag Text:", name_tag.text)
    print("Name Tag Text (Repr):", repr(name_tag.text))
else:
    print("Name Tag NOT FOUND")
