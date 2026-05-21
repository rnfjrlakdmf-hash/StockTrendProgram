
import requests

def debug_ords(symbol):
    code = symbol.split('.')[0]
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    
    res = requests.get(url, headers=headers)
    content = res.content
    
    # Try UTF-8
    try:
        decoded_utf8 = content.decode('utf-8')
        print("Decoded as UTF-8.")
        
        # Extract title manually to avoid soup issues
        start = decoded_utf8.find("<title>")
        if start != -1:
            end = decoded_utf8.find("</title>")
            title_text = decoded_utf8[start+7:end]
            print(f"Title text len: {len(title_text)}")
            print("Hex code points:", [hex(ord(c)) for c in title_text])
            
            # Check if it matches '삼성전자 : Npay 증권'
            # 삼성전자 = \uc0bc\uc131\uc804\uc790
            expected = [0xc0bc, 0xc131, 0xc804, 0xc790]
            actual = [ord(c) for c in title_text[:4]]
            
            if actual == expected:
                print("MATCH! The string in memory is correct.")
            else:
                print("MISMATCH! The string in memory is garbage.")
                
    except Exception as e:
        print(f"UTF-8 decode failed: {e}")

if __name__ == "__main__":
    debug_ords("005930")
