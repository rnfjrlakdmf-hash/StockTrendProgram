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


def get_dart_overhang_and_investments(symbol: str):
    """
    네이버 금융 증권 공시 전체 탭에서 과거 이력(1~10페이지)을 스캔하여
    '오버행(CB, BW, 증자)' 및 '타법인출자' 관련 주요 공시만 추출
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    
    overhang = []
    investments = []
    
    try:
        # 최근 5페이지 정보 스캔 (더 많은 과거 정보 추적)
        for page in range(1, 6):
            url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page={page}"
            res = requests.get(url, headers=HEADER, timeout=5)
            html = decode_safe(res)
            soup = BeautifulSoup(html, 'html.parser')
            
            table = soup.select_one("table.type6")
            if not table:
                break
            
            rows = table.select("tr")
            for row in rows:
                cols = row.select("td")
                if len(cols) < 3:
                    continue
                
                title_td = cols[0]
                title_link = title_td.select_one("a")
                if not title_link:
                    continue
                
                title = title_link.text.strip()
                link_href = title_link.get('href', '')
                
                if link_href.startswith('http') or 'dart.fss.or.kr' in link_href:
                    link = link_href
                else:
                    link = f"https://finance.naver.com{link_href}"
                    
                submitter = cols[1].text.strip() if len(cols) > 1 else ""
                date_text = cols[2].text.strip() if len(cols) > 2 else ""
                
                # 중복 체크
                if any(x['title'] == title and x['date'] == date_text for x in overhang + investments):
                    continue

                # 오버행 분류 (CB, BW, 증자, 주식전환 등)
                overhang_keywords = ['전환사채', '신주인수권부사채', '유상증자', '무상증자', '전환청구권행사', 'BW', 'CB', '교환사채', '주식매수선택권', '신주발행']
                
                # 출자정보 분류
                invest_keywords = ['타법인주식', '출자', '유형자산양수', '유형자산취득', '영업양수']
                
                matched = False
                for kw in overhang_keywords:
                    if kw in title:
                        overhang.append({
                            "title": title, "link": link, "date": date_text, "type": "오버행(잠재물량)"
                        })
                        matched = True
                        break
                        
                if not matched:
                    for kw in invest_keywords:
                        if kw in title:
                            investments.append({
                                "title": title, "link": link, "date": date_text, "type": "타법인출자/투자"
                            })
                            break
                            
            if len(overhang) > 15 and len(investments) > 10:
                break # 충분히 모였으면 중단
                
    except Exception as e:
        print(f"Overhang/Investments fetch error: {e}")
        
    return {
        "overhang": sorted(overhang, key=lambda x: x['date'], reverse=True),
        "investments": sorted(investments, key=lambda x: x['date'], reverse=True)
    }

