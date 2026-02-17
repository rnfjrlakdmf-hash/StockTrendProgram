"""
Disclosure Data (공시 정보)
Fetch disclosure information from Naver Finance
"""

import requests
from bs4 import BeautifulSoup
import re

# Import from korea_data
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from korea_data import HEADER, decode_safe

def get_dart_disclosures(symbol: str):
    """
    Get recent DART disclosures for Korean stocks from Naver Finance
    
    Args:
        symbol: Stock code (without .KS or .KQ suffix)
    
    Returns:
        List of disclosures with title, date, link, submitter, and type
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    
    disclosures = []
    
    try:
        # Naver Finance disclosure page
        url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"
        res = requests.get(url, headers=HEADER, timeout=5)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find disclosure table (type6, NOT type5)
        table = soup.select_one("table.type6")
        if not table:
            return []
        
        rows = table.select("tr")
        for row in rows:
            cols = row.select("td")
            if len(cols) < 3:
                continue
            
            try:
                # Column 0: 제목 (Title)
                title_td = cols[0]
                title_link = title_td.select_one("a")
                if not title_link:
                    continue
                
                title = title_link.text.strip()
                link_href = title_link.get('href', '')
                
                # Build full link
                if link_href.startswith('http'):
                    link = link_href
                elif 'dart.fss.or.kr' in link_href:
                    link = link_href
                else:
                    link = f"https://finance.naver.com{link_href}"
                
                # Column 1: 정보제공 (Submitter)
                submitter = cols[1].text.strip() if len(cols) > 1 else ""
                
                # Column 2: 날짜 (Date)
                date_text = cols[2].text.strip() if len(cols) > 2 else ""
                
                # Determine disclosure type based on title keywords
                disclosure_type = "일반공시"
                if "정정" in title:
                    disclosure_type = "정정공시"
                elif "감사" in title:
                    disclosure_type = "감사보고서"
                elif "사업보고서" in title:
                    disclosure_type = "사업보고서"
                elif "분기보고서" in title:
                    disclosure_type = "분기보고서"
                elif "반기보고서" in title:
                    disclosure_type = "반기보고서"
                
                disclosures.append({
                    "title": title,
                    "link": link,
                    "submitter": submitter,
                    "date": date_text,
                    "type": disclosure_type
                })
                
                # Limit to 20 most recent disclosures
                if len(disclosures) >= 20:
                    break
                    
            except Exception as e:
                print(f"Disclosure row parse error: {e}")
                continue
        
    except Exception as e:
        print(f"DART disclosure fetch error: {e}")
    
    return disclosures
