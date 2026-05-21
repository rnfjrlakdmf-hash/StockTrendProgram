
import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect_detail():
    # KOSPI Detail Page
    url = "https://finance.naver.com/sise/sise_index.naver?code=KOSPI"
    print(f"Checking {url}...")
    res = requests.get(url)
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    # Check for Program Trading here
    # Usually a table or dl
    
    # Search for "프로그램" content
    prog = soup.find(string=lambda t: t and "프로그램" in t)
    if prog:
        print("FOUND Program Trading Text")
        # Print context
        parent = prog.parent
        while parent and parent.name != 'div' and parent.name != 'table':
            parent = parent.parent
        print(f"Container: {parent.name} Class: {parent.get('class')}")
        print(parent.text.strip().replace('\n', ' ')[:200])
        
    # Check for Stock Counts (Up/Down)
    # Search for "등락종목" or similar
    counts = soup.find(string=lambda t: t and "등락종목" in t)
    if counts:
        print("FOUND Stock Counts Text")
        parent = counts.parent
        while parent and parent.name != 'div' and parent.name != 'table':
             parent = parent.parent
        print(f"Container: {parent.name} Class: {parent.get('class')}")
        print(parent.text.strip().replace('\n', ' ')[:200])

if __name__ == "__main__":
    inspect_detail()
