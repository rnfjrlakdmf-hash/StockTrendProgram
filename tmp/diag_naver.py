import requests
from bs4 import BeautifulSoup

def decode_safe(res):
    try:
        return res.content.decode('euc-kr')
    except:
        try:
            return res.content.decode('cp949')
        except:
            return res.text

def scrape_table(url: str, limit: int = 10, is_search: bool = False):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        print(f"Fetching {url}...")
        res = requests.get(url, headers=headers, timeout=8)
        content = decode_safe(res)
        soup = BeautifulSoup(content, "html.parser")
        results = []
        
        # Naver labels Value Leaders table as type_2 usually
        table = soup.select_one("table.type_5" if is_search else "table.type_2")
        if not table:
            print(f"Warning: Table not found for {url}")
            # Try generic table search if specific class fails
            tables = soup.select("table")
            print(f"Found {len(tables)} tables total.")
            for i, tbl in enumerate(tables):
                if "종목명" in tbl.text:
                    print(f"Table {i} contains '종목명'. Classes: {tbl.get('class')}")
            return results

        rows = table.select("tr")
        print(f"Found {len(rows)} rows in table.")
        for row in rows:
            if len(results) >= limit:
                break
            cols = row.select("td")
            if len(cols) < 5:
                continue
            
            try:
                name_tag = cols[1].select_one("a")
                if not name_tag:
                    continue
                name = name_tag.text.strip()
                symbol = name_tag.get("href", "").split("code=")[-1] if name_tag.get("href") else ""
                
                # Trading value is often in a specific column for sise_quant_high
                # Indexing might be off if layout changed
                price = cols[2 if not is_search else 3].text.strip()
                change = cols[4 if not is_search else 5].text.strip()
                
                if is_search:
                    amount_val = cols[2].text.strip()
                else:
                    # In sise_quant_high.naver, let's see which column has volume/value
                    # usually it's around index 6
                    amount_val = cols[6].text.strip() if len(cols) > 6 else "N/A"

                results.append({
                    "name": name,
                    "symbol": symbol,
                    "price": price,
                    "change": change,
                    "amount": amount_val
                })
            except Exception as e:
                print(f"Row error: {e}")
                continue
        return results
    except Exception as e:
        print(f"Scrape error: {e}")
        return []

print("--- Testing Real-time Search Top ---")
search_top = scrape_table("https://finance.naver.com/sise/lastsearch2.naver", limit=5, is_search=True)
print(f"Search Top Result Count: {len(search_top)}")
for item in search_top:
    print(item)

print("\n--- Testing Value Top (KOSPI) ---")
val_kospi = scrape_table("https://finance.naver.com/sise/sise_quant_high.naver?sosok=0", limit=5)
print(f"Value Top Result Count: {len(val_kospi)}")
for item in val_kospi:
    print(item)
