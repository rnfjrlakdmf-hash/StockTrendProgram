
import requests
from bs4 import BeautifulSoup

url = "https://finance.naver.com/marketindex/?tabSel=interest"
headers = {"User-Agent": "Mozilla/5.0"}

try:
    res = requests.get(url, headers=headers)
    res.encoding = 'EUC-KR'
    soup = BeautifulSoup(res.text, 'html.parser')

    # Look for keywords
    target = soup.find(string=lambda t: t and "CD" in t and "91일" in t)
    if target:
        print("Found 'CD(91일)':")
        print(target.parent)
        print(target.parent.parent)
        print("Classes of parent:", target.parent.parent.get('class'))
        
        # Traverse up to find the container
        p = target.parent
        for i in range(5):
            if p:
                print(f"Parent {i}: <{p.name} class='{p.get('class')}'>")
                p = p.parent
    else:
        print("Could not find 'CD(91일)' in HTML.")

except Exception as e:
    print(e)
