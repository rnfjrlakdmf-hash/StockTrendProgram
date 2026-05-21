import requests
from bs4 import BeautifulSoup

url = "https://finance.naver.com/"
res = requests.get(url)
soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')

kospi_area = soup.select_one(".kospi_area")
if kospi_area:
    print(kospi_area.prettify()[:1000]) # First 1000 chars
    # Check for "개인", "외국인", "기관" text
    print("Contains '개인':", "개인" in kospi_area.text)
    
    # Try finding the dl/dd structure
    dls = kospi_area.select("dl")
    for dl in dls:
        print("DL Class:", dl.get("class"))
        print(dl.prettify())
