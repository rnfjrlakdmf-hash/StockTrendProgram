import sys
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from korea_data import decode_safe

def diag_market_intelligence():
    print("--- Diagnostic: Market Intelligence APIs ---")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    # 1. Test /api/investors/top replacement (read_investor_top)
    print("\n[Testing read_investor_top targets]")
    urls = [
        "https://finance.naver.com/sise/sise_quant.naver?sosok=0",
        "https://finance.naver.com/sise/sise_quant.naver?sosok=1",
        "https://finance.naver.com/sise/sise_rise.naver?sosok=0"
    ]
    for url in urls:
        try:
            res = requests.get(url, headers=headers, timeout=10)
            print(f"URL: {url}")
            print(f"  Status: {res.status_code}")
            print(f"  Header Encoding: {res.encoding}")
            print(f"  Apparent Encoding: {res.apparent_encoding}")
            
            # This is what decode_safe does
            html = decode_safe(res)
            soup = BeautifulSoup(html, "html.parser")
            table = soup.select_one("table.type_2")
            if table:
                rows = table.select("tr")
                print(f"  Rows Found: {len(rows)}")
                # Sample parse
                items = []
                for row in rows:
                    cols = row.select("td")
                    if len(cols) > 5:
                        name_tag = cols[1].select_one("a")
                        if name_tag:
                            items.append(name_tag.text.strip())
                            if len(items) >= 3: break
                print(f"  Sample Items: {items}")
            else:
                print("  Table table.type_2 NOT FOUND")
        except Exception as e:
            print(f"  Error: {e}")

    # 2. Test /api/market-insights (get_market_insights)
    print("\n[Testing get_market_insights targets]")
    insights_urls = [
        "https://finance.naver.com/sise/lastsearch2.naver",
        "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
    ]
    for url in insights_urls:
        try:
            res = requests.get(url, headers=headers, timeout=10)
            print(f"URL: {url}")
            print(f"  Header Encoding: {res.encoding}")
            
            # Check the second definition's choice:
            res.encoding = 'euc-kr' 
            soup = BeautifulSoup(res.text, "html.parser")
            
            is_search = "lastsearch2" in url
            table = soup.select_one("table.type_5" if is_search else "table.type_2")
            if table:
                print(f"  Table FOUND ({'type_5' if is_search else 'type_2'})")
                rows = table.select("tr")
                print(f"  Rows Found: {len(rows)}")
                # Sample
                items = []
                for row in rows:
                    cols = row.select("td")
                    if len(cols) > 5:
                        idx = 1 if is_search else 2
                        name_tag = cols[idx].select_one("a")
                        if name_tag:
                            items.append(name_tag.text.strip())
                            if len(items) >= 3: break
                print(f"  Sample Items: {items}")
            else:
                print(f"  Table {'type_5' if is_search else 'type_2'} NOT FOUND")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    diag_market_intelligence()
