import requests
from bs4 import BeautifulSoup

def debug_rank_page():
    url = "https://finance.naver.com/sise/sise_rise.naver?sosok=0"
    headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    
    print(f"Fetching {url}...")
    res = requests.get(url, headers=headers)
    
    print(f"Status: {res.status_code}")
    print(f"Encoding: {res.encoding}")
    print(f"Apparent Encoding: {res.apparent_encoding}")
    
    # Try decoding
    text = res.content.decode('cp949', 'ignore') 
    # Usually Naver is cp949/euc-kr
    
    soup = BeautifulSoup(text, 'html.parser')
    
    # Check selector
    rows = soup.select("table.type_2 tbody tr") # Explicit tbody might fail if parser doesn't add it or HTML is messy
    print(f"Rows found with 'table.type_2 tbody tr': {len(rows)}")
    
    rows2 = soup.select("table.type_2 tr")
    print(f"Rows found with 'table.type_2 tr': {len(rows2)}")
    
    if len(rows2) > 0:
        print("First row HTML:")
        print(rows2[2]) # Skip header
        
if __name__ == "__main__":
    debug_rank_page()
