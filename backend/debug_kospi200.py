
import requests
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_kospi200():
    url = "https://finance.naver.com/"
    res = requests.get(url)
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    area = soup.select_one(".kospi200_area")
    if not area:
        print("KOSPI 200 Area NOT FOUND")
        return

    print("--- KOSPI 200 DLs ---")
    dls = area.select("dl")
    for i, dl in enumerate(dls):
        print(f"DL {i}:")
        dts = dl.select("dt")
        dds = dl.select("dd")
        
        for j, dt in enumerate(dts):
             print(f"  DT {j}: '{dt.text.strip()}'")
        for k, dd in enumerate(dds):
             print(f"  DD {k}: '{dd.text.strip()}'")

if __name__ == "__main__":
    check_kospi200()
