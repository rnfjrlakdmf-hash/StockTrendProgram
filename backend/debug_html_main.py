
import requests
from bs4 import BeautifulSoup

url = "https://finance.naver.com/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
res = requests.get(url, headers=headers)
soup = BeautifulSoup(res.text, 'html.parser')

for p_type in ["kospi", "kosdaq", "kospi200"]:
    print(f"--- {p_type} ---")
    area = soup.select_one(f".{p_type}_area")
    if not area:
        print("Area not found")
        continue

    # Num Quot
    num_quot = area.select_one(".num_quot")
    if num_quot:
        print("Num Quot Text:", num_quot.text.strip().replace('\n', ' '))
        blind = num_quot.select_one(".blind")
        if blind:
            print("Blind Text:", blind.text.strip())
        else:
            print("Blind tag not found")
    else:
        print("Num Quot not found")
    
    # Investors
    inv_list = area.select(".stock_investor dd")
    print(f"Investor DD count: {len(inv_list)}")
    for dd in inv_list:
        print("DD Text:", dd.text.strip())
