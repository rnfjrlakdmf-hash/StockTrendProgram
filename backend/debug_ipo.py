import requests
from bs4 import BeautifulSoup

def test_ipo_crawl():
    url = "http://www.38.co.kr/html/fund/index.htm?o=k"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"
    }
    
    try:
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
        
        target_table = None
        rows = soup.select("tr")
        for row in rows:
            text = row.text.strip()
            if "종목명" in text and "공모주일정" in text:
                target_table = row.find_parent("table")
                break
        
        if not target_table:
            print("Table not found")
            return

        table_rows = target_table.select("tr")
        search_idx = -1
        for i, tr in enumerate(table_rows):
            if "종목명" in tr.text and "공모주일정" in tr.text:
                search_idx = i
                break
        
        data_rows = table_rows[search_idx+1:]
        print(f"Found {len(data_rows)} rows after header")
        
        for i, row in enumerate(data_rows):
            cols = row.select("td")
            if len(cols) < 5:
                print(f"Row {i} skipped (cols < 5): {[c.text.strip() for c in cols]}")
                continue
            
            name = cols[0].text.strip().replace('\xa0', '')
            schedule = cols[1].text.strip().replace('\xa0', '')
            fixed = cols[2].text.strip().replace('\xa0', '')
            band = cols[3].text.strip().replace('\xa0', '')

            # Test Filtering Logic
            if name.startswith("[") or "뉴스" in name:
                print(f"Filtered (News/Trash): {name[:20]}...")
                continue
            if not schedule or (len(schedule) < 5):
                print(f"Filtered (No Schedule): {name[:20]}...")
                continue

            # Clean name
            if "(" in name: # Optional: remove (코) etc? Maybe not.
                 pass 

            print(f"VALID: Name='{name}', Sch='{schedule}', Fixed='{fixed}', Band='{band}'")
            if i > 50: break

    except Exception as e:
        print(e)

if __name__ == "__main__":
    test_ipo_crawl()
