
import requests
from bs4 import BeautifulSoup

def _get_soup(url):
    try:
        headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        res = requests.get(url, headers=headers)
        print(f"Fetching {url}... Status: {res.status_code}")
        html = res.content.decode('cp949', 'ignore')
        return BeautifulSoup(html, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def test_fetch():
    # 1. Interest
    print("\n--- Testing Interest Rates ---")
    soup_int = _get_soup("https://finance.naver.com/marketindex/?tabSel=interest")
    if soup_int:
        items = soup_int.select(".data_lst li")
        print(f"Found {len(items)} items in .data_lst li")
        for i, li in enumerate(items[:3]):
            name = li.select_one("h3.h_lst span.blind")
            val = li.select_one("span.value")
            if name and val:
                print(f"[{i}] {name.text.strip()} : {val.text.strip()}")
            else:
                print(f"[{i}] Missing name/val")
    
    # 2. Materials
    print("\n--- Testing Materials ---")
    soup_mat = _get_soup("https://finance.naver.com/marketindex/?tabSel=materials")
    if soup_mat:
        items = soup_mat.select(".data_lst li")
        print(f"Found {len(items)} items in .data_lst li")
        for i, li in enumerate(items[:3]):
            name = li.select_one("h3.h_lst span.blind")
            val = li.select_one("span.value")
            if name and val:
                print(f"[{i}] {name.text.strip()} : {val.text.strip()}")
            else:
                print(f"[{i}] Missing name/val")

if __name__ == "__main__":
    test_fetch()
