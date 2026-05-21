import requests
from bs4 import BeautifulSoup

url = "https://finance.naver.com/sise/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
res = requests.get(url, headers=headers)
html = res.content.decode('cp949', 'ignore')
soup = BeautifulSoup(html, 'html.parser')

print(f"frgn_deal_tab_0 exists: {bool(soup.select_one('#frgn_deal_tab_0'))}")
print(f"org_deal_tab_0 exists: {bool(soup.select_one('#org_deal_tab_0'))}")

# Dump a small part of HTML around where it should be if missing
if not soup.select_one('#org_deal_tab_0'):
    print("Dumping body text execution...")
    # print(soup.body.text[:1000]) 
