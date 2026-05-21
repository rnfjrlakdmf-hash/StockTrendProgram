
import requests
from bs4 import BeautifulSoup

def debug_market_index():
    url = "https://finance.naver.com/marketindex/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        res = requests.get(url, headers=headers)
        html = res.content.decode('cp949', 'ignore')
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find all uls with class data
        uls = soup.select("ul.data_lst")
        print(f"Found {len(uls)} data lists")
        
        for i, ul in enumerate(uls):
            id_attr = ul.get('id', 'No-ID')
            print(f"List {i}: ID={id_attr}")
            
            # Print first item to identify
            first_li = ul.select_one("li")
            if first_li:
                name = first_li.select_one("h3")
                if name:
                    print(f"  First Item: {name.get_text(strip=True)}")
                else: 
                     # Try finding span blind
                     blind = first_li.select_one("span.blind")
                     if blind:
                         print(f"  First Item (blind): {blind.get_text(strip=True)}")
                     else:
                        print(f"  First Item text: {first_li.get_text(strip=True)[:20]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_market_index()
