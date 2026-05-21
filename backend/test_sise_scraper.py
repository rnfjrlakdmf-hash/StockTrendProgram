
import requests
from bs4 import BeautifulSoup
import re

def _get_soup(url, headers):
    try:
        res = requests.get(url, headers=headers, timeout=5)
        html = res.content.decode('cp949', 'ignore')
        return BeautifulSoup(html, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def get_naver_sise_data():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    partial_data = {
        "top_sectors": [], "top_themes": [],
        "investor_items": {
            "foreigner_buy": [], "foreigner_sell": [], "institution_buy": [], "institution_sell": []
        }
    }
   
    soup_sise = _get_soup("https://finance.naver.com/sise/", headers)
    if soup_sise:
        # Investor Items
        def parse_sise_investor(tab_id):
            items = []
            container = soup_sise.select_one(tab_id)
            if not container: 
                print(f"Container not found for {tab_id}")
                return []
            else:
                print(f"Found container for {tab_id}")
            
            rows = container.select("tr")
            print(f"Found {len(rows)} rows for {tab_id}")
            for row in rows:
                cols = row.select("td")
                if len(cols) < 4: continue
                name_tag = cols[1].select_one("a")
                if not name_tag: continue
                name = name_tag.text.strip()
                amount = cols[2].text.strip()
                raw_change = cols[3].text.strip()
                change = " ".join(raw_change.split())
                is_up = False
                if "rate_up" in str(cols[3]) or "up" in str(cols[3]) or "red" in str(cols[3]): is_up = True
                if "상승" in change: is_up = True
                change_val = re.sub(r'(상승|하락|보합)\s*', '', change).strip()
                items.append({"name": name, "amount": amount, "change": change_val, "is_up": is_up})
                if len(items) >= 5: break
            return items

        try:
            partial_data["investor_items"]["foreigner_buy"] = parse_sise_investor("#frgn_deal_tab_0")
            partial_data["investor_items"]["foreigner_sell"] = parse_sise_investor("#frgn_deal_tab_1")
            partial_data["investor_items"]["institution_buy"] = parse_sise_investor("#org_deal_tab_0")
            partial_data["investor_items"]["institution_sell"] = parse_sise_investor("#org_deal_tab_1")
            
            print("Foreigner Buy:", partial_data["investor_items"]["foreigner_buy"])
            print("Institution Buy:", partial_data["investor_items"]["institution_buy"])
        except Exception as e:
            print(e)
            
    return partial_data

if __name__ == "__main__":
    get_naver_sise_data()
