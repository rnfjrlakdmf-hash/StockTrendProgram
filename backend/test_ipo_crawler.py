from korea_data import get_ipo_data
import requests
from bs4 import BeautifulSoup

def debug_ipo_crawling():
    print("--- Start Debugging IPO Crawling ---")
    
    # 1. Run the existing function
    data = get_ipo_data()
    print(f"Result from get_ipo_data(): {data}")
    
    if not data:
        print("\n[DEBUG] No data returned. Inspecting raw HTML...")
        url = "https://finance.naver.com/sise/sise_ipo.naver"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"
        }
        res = requests.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        
        soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
        
        # Check if table exists
        table = soup.select_one("table.type_5")
        if table:
            print("Table found. Printing first few rows:")
            rows = table.select("tr")
            for i, row in enumerate(rows[:5]):
                cols = row.select("td")
                print(f"Row {i}: {[col.text.strip() for col in cols]}")
        else:
            print("Table NOT found. Selector 'table.type_5' might be wrong.")
            # Print body structure snippet
            print(soup.body.prettify()[:1000])

if __name__ == "__main__":
    debug_ipo_crawling()
