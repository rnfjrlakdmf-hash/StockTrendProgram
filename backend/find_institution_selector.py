import requests
from bs4 import BeautifulSoup

url = "https://finance.naver.com/sise/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
res = requests.get(url, headers=headers)
html = res.content.decode('cp949', 'ignore')
soup = BeautifulSoup(html, 'html.parser')

# Find elements containing text "기관"
elements = soup.find_all(string=lambda text: "기관" in text if text else False)
print(f"Found {len(elements)} elements with '기관'")

for el in elements:
    parent = el.parent
    # Check if this looks like a header for the table
    if parent.name in ['h3', 'h4', 'span', 'li', 'a']:
        print(f"Text: {el.strip()}")
        print(f"Tag: {parent.name}, Class: {parent.get('class')}, ID: {parent.get('id')}")
        # Try to find nearest table
        next_table = parent.find_next("table")
        if next_table:
            print(f"  -> Next Table ID: {next_table.get('id')}, Class: {next_table.get('class')}")
