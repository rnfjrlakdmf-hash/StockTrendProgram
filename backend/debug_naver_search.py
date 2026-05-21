
import requests
from bs4 import BeautifulSoup

def check_search(query):
    url = f"https://search.naver.com/search.naver?query={query}"
    print(f"\nChecking Search: {query}")
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.content, 'html.parser')
        
        # Naver Search result for rates usually "spt_con" or "rate_info"
        # Example: <div class="spt_con"> <strong>3.45%</strong>
        
        # New Naver Search UI (2024/2025) might differ.
        # Look for "spt_tlt" or just the big number.
        
        # Try generic class "spt_con"
        spt = soup.select_one(".spt_con strong")
        if spt:
             print(f"Found (spt_con): {spt.text.strip()}")
             return

        # Try "rate_tlt" area
        # <strong class="price">
        price = soup.select_one("strong.price") # Very generic
        if price:
            print(f"Found (price): {price.text.strip()}")
            
        # Try finding the text "CD(91일)" and looking near it
        # This is robust.
        section = soup.find(string=lambda t: t and (query in t or "금리" in t))
        if section:
             print(f"Found text keyword. Parent: {section.parent}")

    except Exception as e:
        print(e)

if __name__ == "__main__":
    check_search("CD금리")
    check_search("국고채 3년")
    check_search("국제 구리 가격")
