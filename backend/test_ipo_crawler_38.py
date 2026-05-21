import requests
from bs4 import BeautifulSoup

def debug_38_crawling_v2():
    print("--- Start Debugging 38 Communication IPO Crawling V2 ---")
    
    url = "http://www.38.co.kr/html/fund/index.htm?o=k"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"
    }
    
    try:
        res = requests.get(url, headers=headers)
        # Use cp949 for Korean sites
        soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
        
        # Find the table by looking for "종목명" in any tr
        target_table = None
        rows = soup.select("tr")
        start_index = 0
        
        for i, row in enumerate(rows):
            text = row.text.strip()
            if "종목명" in text and "공모주일정" in text:
                print(f"Header found at row {i}")
                print(f"Header text: {row.text.split()}")
                start_index = i + 1
                target_table = row.find_parent("table")
                break
        
        if not target_table:
            print("Target table not found.")
            return

        # Iterate over rows after header
        # Re-select rows from the identified table only
        table_rows = target_table.select("tr")
        print(f"Table rows total: {len(table_rows)}")
        
        # Determine strict index relative to the table
        # We need to find the header row INSIDE this table
        header_in_table_idx = -1
        for j, tr in enumerate(table_rows):
            if "종목명" in tr.text and "공모주일정" in tr.text:
                header_in_table_idx = j
                break
        
        if header_in_table_idx == -1:
            print("Could not locate header within the table context.")
            return

        print(f"Header index in table: {header_in_table_idx}")
        
        data_rows = table_rows[header_in_table_idx+1:]
        print(f"Processing {len(data_rows)} data rows...")
        
        results = []
        for row in data_rows:
            cols = row.select("td")
            if len(cols) < 5: continue
            
            # 38.co.kr table structure is usually:
            # 0: 종목명, 1: 공모주일정, 2: 확정공모가, 3: 희망공모가, 4: 청약경쟁률, 5: 주간사...
            # Note: The text might be nested in links (a tags)
            
            name = cols[0].text.strip()
            schedule = cols[1].text.strip()
            price_band = cols[3].text.strip() # 희망공모가 is usually here
            
            # Filter out empty or noise rows
            if not name: continue
            
            print(f"Extracted: Name={name}, Schedule={schedule}, Price={price_band}")
            results.append({
                "name": name,
                "schedule": schedule,
                "price": price_band
            })
            
            if len(results) >= 5: break
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_38_crawling_v2()
