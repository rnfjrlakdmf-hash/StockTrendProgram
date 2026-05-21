
import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_dl_structure():
    url = "https://finance.naver.com/"
    res = requests.get(url)
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    for p_type in ["kospi", "kosdaq"]:
        area = soup.select_one(f".{p_type}_area")
        if not area: continue
        print(f"--- {p_type} ---")
        dls = area.select("dl")
        for dl in dls:
            print("DL:")
            dts = dl.select("dt")
            dds = dl.select("dd")
            for dt, dd in zip(dts, dds):
                print(f"  DT: {dt.text.strip()} | DD: {dd.text.strip()}")

if __name__ == "__main__":
    check_dl_structure()
