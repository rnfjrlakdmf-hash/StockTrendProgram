import requests
from bs4 import BeautifulSoup
import re

def main():
    url = "https://finance.naver.com/sise/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        res = requests.get(url, headers=headers)
        html = res.content.decode('cp949', 'ignore')
        
        # Save for manual inspection if needed
        with open("sise_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # In /sise/, the top indices are usually in a specific layout
        # Let's try to identify where KOSPI, KOSDAQ, KOSPI200 are.
        # Usually they are in div.sise_top or just top summary
        
        # Structure often used:
        # <div class="lft"> (KOSPI)
        # <div class="rgt"> (KOSDAQ)
        # KOSPI200 might be separate
        
        print("Sise Page Title:", soup.title.text)

        # Attempt 1: Check known IDs or Classes for Main Indices on Sise page
        # Based on typical Naver Sise page structure
        
        # KOSPI
        kospi_val = soup.select_one("#KOSPI_now")
        kospi_change = soup.select_one("#KOSPI_change") 
        print(f"KOSPI ID Check: {kospi_val.text if kospi_val else 'Not Found'}")

        # KOSDAQ
        kosdaq_val = soup.select_one("#KOSDAQ_now")
        print(f"KOSDAQ ID Check: {kosdaq_val.text if kosdaq_val else 'Not Found'}")

        # KPI200
        kpi200_val = soup.select_one("#KPI200_now")
        print(f"KPI200 ID Check: {kpi200_val.text if kpi200_val else 'Not Found'}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
