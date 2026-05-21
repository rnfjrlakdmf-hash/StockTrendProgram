
import requests
# import chardet

def debug_naver_fetch(symbol):
    code = symbol
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    
    print(f"Fetching {url}...")
    try:
        res = requests.get(url, headers=headers, timeout=5)
        print(f"Status Code: {res.status_code}")
        print(f"Headers Content-Type: {res.headers.get('Content-Type')}")
        print(f"Requests Apparent Encoding: {res.apparent_encoding}")
        print(f"Requests Encoding: {res.encoding}")
        
        content = res.content
        print(f"Content Start (First 100 bytes): {content[:100]}")
        
        # detected = chardet.detect(content)
        # print(f"Chardet Detected: {detected}")
        pass
        
        # Try CP949
        try:
            decoded_cp949 = content.decode('cp949')
            print("Decoded CP949 Success (First 50 chars):", decoded_cp949[:50])
            if "삼성전자" in decoded_cp949:
                print("Confirmed '삼성전자' found in CP949")
            else:
                print("'삼성전자' NOT found in CP949")
        except Exception as e:
            print(f"Decoded CP949 Failed: {e}")
            
        # Try EUC-KR
        try:
            decoded_euckr = content.decode('euc-kr')
            print("Decoded EUC-KR Success")
        except Exception as e:
            print(f"Decoded EUC-KR Failed: {e}")
            
        # Try UTF-8
        try:
            decoded_utf8 = content.decode('utf-8')
            print("Decoded UTF-8 Success")
            
            from bs4 import BeautifulSoup
            import re
            soup = BeautifulSoup(decoded_utf8, 'html.parser')
            
            h2 = soup.select_one(".wrap_company h2 a")
            if h2:
                print(f"Parsed Name: {h2.text.strip()}")
            else:
                print("Parsed Name: None")

            no_today = soup.select_one(".no_today .blind")
            if no_today:
                print(f"Parsed Price Raw: {no_today.text}")
                price = int(re.sub(r'[^0-9]', '', no_today.text))
                print(f"Parsed Price: {price}")
            else:
                print("Parsed Price: None")
                
        except Exception as e:
            print(f"Decoded UTF-8 Failed: {e}")

    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    debug_naver_fetch("005930")
