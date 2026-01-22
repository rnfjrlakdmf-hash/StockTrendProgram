
import requests
from bs4 import BeautifulSoup
import time

def check_last_page(sosok):
    # sosok 0: KOSPI, 1: KOSDAQ
    market = "KOSPI" if sosok == 0 else "KOSDAQ"
    print(f"Checking {market}...")
    
    # Try a large page number to see if it redirects or shows empty
    # Naver Sise Market Sum usually has a 'pgRR' class for 'Last Page' link?
    # Or we can just binary search or step jump.
    
    url = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}&page=1"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    
    try:
        html = res.content.decode('euc-kr') 
    except: 
        html = res.text
        
    soup = BeautifulSoup(html, 'html.parser')
    
    # Find last page link
    # The pagination usually looks like [1] [2] ... [Next] [Last]
    # td.pgRR > a['href'] -> ...&page=34
    
    pgRR = soup.select_one("td.pgRR a")
    if pgRR:
        href = pgRR['href']
        # Extract page=...
        import re
        match = re.search(r'page=(\d+)', href)
        if match:
            last_page = int(match.group(1))
            print(f"{market} Last Page seems to be: {last_page}")
            return last_page
            
    print(f"Could not find last page for {market}, might need to crawl.")
    return 50 # Default safe bet

kospi_pages = check_last_page(0)
kosdaq_pages = check_last_page(1)

print("\n--- Summary ---")
print(f"KOSPI Pages: {kospi_pages}")
print(f"KOSDAQ Pages: {kosdaq_pages}")
print(f"Total Pages: {kospi_pages + kosdaq_pages}")
print(f"Estimated Stocks: {(kospi_pages + kosdaq_pages) * 50}")
