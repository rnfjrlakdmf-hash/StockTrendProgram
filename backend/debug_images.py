
import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

def find_chart_images():
    url = "https://finance.naver.com/"
    res = requests.get(url)
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    for p_type in ["kospi", "kosdaq", "kospi200"]:
        area = soup.select_one(f".{p_type}_area")
        if not area: continue
        
        print(f"--- {p_type} Images ---")
        imgs = area.select("img")
        for img in imgs:
            print(f"Src: {img.get('src')}")
            print(f"Alt: {img.get('alt')}")
            print(f"Parent Class: {img.parent.get('class')}")
            print("-" * 20)

if __name__ == "__main__":
    find_chart_images()
