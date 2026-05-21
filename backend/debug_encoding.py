
import requests
from bs4 import BeautifulSoup
import sys

# Windows console encoding fix
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_url(url, name):
    print(f"--- Testing {name}: {url} ---")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    res = requests.get(url, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Encoding (Request): {res.encoding}")
    print(f"Apparent Encoding: {res.apparent_encoding}")
    
    # Try decoding
    try:
        text = res.content.decode('cp949')
        print("Decoded with cp949 successfully.")
    except:
        print("Failed to decode with cp949")
        text = res.text
        
    soup = BeautifulSoup(text, 'html.parser')
    title = soup.title.string if soup.title else "No Title"
    print(f"Page Title: {title}")
    
    if name == "Main":
        area = soup.select_one(".kospi_area")
        if area:
             print("KOSPI Area:")
             print(area.prettify()[:600])
        else:
             print("KOSPI Area NOT FOUND")

    if name == "Sise":
        # Check Tables
        tab = soup.select_one("#frgn_deal_tab_0")
        if tab:
             print("Foreigner Tab 0 HTML:")
             print(tab.prettify()[:600])
        else:
             print("Foreigner Tab 0 NOT FOUND")

test_url("https://finance.naver.com/", "Main")
test_url("https://finance.naver.com/sise/", "Sise")
