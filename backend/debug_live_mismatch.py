
import requests
from bs4 import BeautifulSoup
import re
import sys

# Encoding fix for Windows console
sys.stdout.reconfigure(encoding='utf-8')

def _get_soup(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        res = requests.get(url, headers=headers, timeout=5)
        # Try cp949 as primary for Naver Finance
        html = res.content.decode('cp949', 'ignore')
        return BeautifulSoup(html, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def check_live_data():
    print("Fetching Naver Finance Main Page...")
    soup = _get_soup("https://finance.naver.com/")
    
    if not soup:
        print("Failed to get soup.")
        return

    for p_type in ["kospi", "kosdaq", "kospi200"]:
        area = soup.select_one(f".{p_type}_area")
        if not area:
            print(f"Area {p_type} NOT FOUND")
            continue
            
        print(f"\n--- {p_type.upper()} ---")
        
        # Index Value
        num = area.select_one(".num_quot .num")
        val = num.text.strip() if num else "N/A"
        print(f"Value: {val}")
        
        # Investors
        print("Investors:")
        inv_list = area.select(".stock_investor dd")
        for dd in inv_list:
            print(f"  {dd.text.strip()}")
            
        # Program Trading?
        # Only KOSPI 200 usually
        if p_type == "kospi200":
             print("Program Trading Check:")
             dls = area.select("dl")
             for dl in dls:
                if not dl.get('class'):
                    print(f"  Found potential Program DL: {dl.text.strip().replace('\n', ' ')}")

if __name__ == "__main__":
    check_live_data()
