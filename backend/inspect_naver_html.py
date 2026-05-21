
import requests
from bs4 import BeautifulSoup
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

def inspect():
    url = "https://finance.naver.com/"
    res = requests.get(url)
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    for p_type in ["kospi", "kosdaq", "kospi200"]:
        print(f"--- {p_type} ---")
        area = soup.select_one(f".{p_type}_area")
        if not area: continue
        
        # 1. Investor (Already have)
        # 2. Program Trading (Look for '프로그램')
        # 3. Stock Counts (Look for '상승', '하락')
        
        # Check all DLs
        dls = area.select("dl")
        for i, dl in enumerate(dls):
             print(f"DL #{i} Class: {dl.get('class')}")
             items = dl.select("dd")
             for dd in items:
                 print(f"  DD Text: {dd.text.strip()}")
                 
        # Program trading might be in a different spot.
        # It says "프로그램 매매동향" in the image.
        # Let's search for that text in the whole area.
        
        prog = area.find(string=lambda t: t and "프로그램" in t)
        if prog:
            print(f"Program Trading Text Found: {prog} in {prog.parent.name}")
            print(f"Program Parent Class: {prog.parent.get('class')}")
        else:
            print("Program Trading text NOT found in area")

if __name__ == "__main__":
    inspect()
