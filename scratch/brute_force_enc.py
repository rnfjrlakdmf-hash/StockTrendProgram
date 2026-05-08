
import requests
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from korea_data import HEADER

url = "https://finance.naver.com/sise/theme.naver"
res = requests.get(url, headers=HEADER)
content = res.content

# Search for the bytes of <title>
title_start = content.find(b'<title>')
if title_start != -1:
    title_end = content.find(b'</title>', title_start)
    title_bytes = content[title_start:title_end+8]
    print("Title Bytes:", title_bytes)
    
    # Try decoding title_bytes
    for enc in ['utf-8', 'cp949', 'euc-kr', 'iso-8859-1', 'utf-16']:
        try:
            print(f"{enc} Result:", title_bytes.decode(enc))
        except:
            pass
else:
    print("Title tag not found in first few bytes")
