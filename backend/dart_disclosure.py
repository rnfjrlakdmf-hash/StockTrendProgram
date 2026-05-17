"""
Disclosure Data (공시 정보)
Fetch disclosure information from Naver Finance
"""

import requests
from bs4 import BeautifulSoup
import re
import sys
import os
from datetime import datetime, timedelta

# Import from korea_data
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from korea_data import HEADER, decode_safe

def get_dart_disclosures(symbol: str, period: str = "1m"):
    """
    Get DART disclosures for Korean stocks from Naver Finance or official FSS Open DART API
    
    Args:
        symbol: Stock code
        period: '1d' (today), '1w', '1m', '3m', '6m', '1y'
    
    Returns:
        List of disclosures within the period
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    
    disclosures = []
    
    # Calculate cutoff date
    now = datetime.now()
    if period == "1d":
        cutoff_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "1w":
        cutoff_date = now - timedelta(weeks=1)
    elif period == "1m":
        cutoff_date = now - timedelta(days=30)
    elif period == "3m":
        cutoff_date = now - timedelta(days=90)
    elif period == "6m":
        cutoff_date = now - timedelta(days=180)
    elif period == "1y":
        cutoff_date = now - timedelta(days=365)
    else:
        cutoff_date = now - timedelta(days=30) # Default 1 month

    # 1. Try Official FSS Open DART API FIRST (Instant, Real-time, 0 delay)
    dart_api_key = os.getenv("DART_API_KEY", "f4ec215eba3e7ef30b5102e2bc3f30616ab9a858")
    if dart_api_key:
        try:
            # Calculate search start date based on period (DART API requires YYYYMMDD)
            # Open DART has a 3-month limit without corp_code, but with stock_code it works up to 3 months safely.
            days_diff = 30
            if period == "1d": days_diff = 1
            elif period == "1w": days_diff = 7
            elif period == "1m": days_diff = 30
            elif period == "3m": days_diff = 90
            elif period == "6m": days_diff = 180
            elif period == "1y": days_diff = 365
            
            # Keep within reasonable search window for new stock codes to avoid API errors
            bgn_de = (now - timedelta(days=min(days_diff, 90))).strftime("%Y%m%d")
            end_de = now.strftime("%Y%m%d")
            
            url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={dart_api_key}&stock_code={code}&bgn_de={bgn_de}&end_de={end_de}&page_count=100"
            res = requests.get(url, timeout=7)
            if res.ok:
                data = res.json()
                if data.get("status") == "000" and "list" in data:
                    for item in data["list"]:
                        title = item.get("report_nm", "")
                        rcept_no = item.get("rcept_no", "")
                        rcept_dt = item.get("rcept_dt", "")
                        flr_nm = item.get("flr_nm", "")
                        
                        # Parse date for comparison
                        dt = datetime.strptime(rcept_dt, "%Y%m%d")
                        if dt < cutoff_date:
                            continue
                            
                        formatted_date = f"{rcept_dt[:4]}.{rcept_dt[4:6]}.{rcept_dt[6:8]}"
                        link = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"
                        
                        # Determine type
                        disclosure_type = "일반공시"
                        if "정정" in title: disclosure_type = "정정공시"
                        elif "감사" in title: disclosure_type = "감사보고서"
                        elif "사업보고서" in title: disclosure_type = "상장공시"
                        elif "분기보고서" in title: disclosure_type = "상장공시"
                        elif "반기보고서" in title: disclosure_type = "상장공시"
                        elif "전환사채" in title or "CB" in title: disclosure_type = "채권공시"
                        
                        disclosures.append({
                            "title": title,
                            "link": link,
                            "submitter": flr_nm,
                            "date": formatted_date,
                            "type": disclosure_type
                        })
                    
                    if disclosures:
                        print(f"[DART API] Successfully retrieved {len(disclosures)} disclosures for {symbol}")
                        return disclosures
        except Exception as e:
            print(f"[DART API] Error fetching from Open DART: {e}. Falling back to scraping.")

    # 2. Fallback to Naver Scraping (if API fails or returns no data)
    try:
        # Loop through pages until we hit the cutoff date
        # Limit to 30 pages to prevent infinite loops/too much load
        for page in range(1, 31):
            url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page={page}"
            res = requests.get(url, headers=HEADER, timeout=5)
            html = decode_safe(res)
            soup = BeautifulSoup(html, 'html.parser')
            
            table = soup.select_one("table.type6")
            if not table:
                break
            
            rows = table.select("tr")
            found_older = False
            
            for row in rows:
                cols = row.select("td")
                if len(cols) < 3:
                    continue
                
                try:
                    # Column 2: Date (YYYY.MM.DD HH:MM)
                    date_text = cols[2].text.strip()
                    if not date_text:
                        continue
                    
                    # Parse date for comparison (Flexible format)
                    dt = None
                    try:
                        # Try with time FIRST
                        dt = datetime.strptime(date_text, '%Y.%m.%d %H:%M')
                    except:
                        try:
                            # Try with only date
                            dt = datetime.strptime(date_text, '%Y.%m.%d')
                            # For comparison with cutoff (which has time), set to end of day
                            dt = dt.replace(hour=23, minute=59)
                        except:
                            pass

                    if dt and dt < cutoff_date:
                        found_older = True
                        break
                    
                    if not dt:
                        # Skip if we couldn't parse the date at all
                        continue

                    # Column 0: Title
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
                    
                    # Determine type
                    disclosure_type = "일반공시"
                    if "정정" in title: disclosure_type = "정정공시"
                    elif "감사" in title: disclosure_type = "감사보고서"
                    elif "사업보고서" in title: disclosure_type = "상장공시"
                    elif "분기보고서" in title: disclosure_type = "상장공시"
                    elif "반기보고서" in title: disclosure_type = "상장공시"
                    elif "전환사채" in title or "CB" in title: disclosure_type = "채권공시"
                    
                    # Deduplicate with API disclosures
                    if not any(x['title'] == title and x['date'].split()[0] == date_text.split()[0] for x in disclosures):
                        disclosures.append({
                            "title": title,
                            "link": link,
                            "submitter": submitter,
                            "date": date_text,
                            "type": disclosure_type
                        })
                        
                except Exception as e:
                    continue
            
            if found_older or not rows:
                break
                
    except Exception as e:
        print(f"DART disclosure fetch error: {e}")
    
    return disclosures


def get_dart_overhang_and_investments(symbol: str):
    """
    네이버 금융 증권 공시 전체 탭 및 공식 FSS Open DART API에서 정보를 조회하여
    '오버행(CB, BW, 증자)' 및 '타법인출자' 관련 주요 공시만 추출
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    
    overhang = []
    investments = []
    
    # 1. Fetch from official FSS Open DART API (Instant & Zero Delay)
    dart_api_key = os.getenv("DART_API_KEY", "f4ec215eba3e7ef30b5102e2bc3f30616ab9a858")
    if dart_api_key:
        try:
            today = datetime.now()
            # Retrieve last 90 days of disclosures
            bgn_de = (today - timedelta(days=90)).strftime("%Y%m%d")
            end_de = today.strftime("%Y%m%d")
            
            url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={dart_api_key}&stock_code={code}&bgn_de={bgn_de}&end_de={end_de}&page_count=100"
            res = requests.get(url, timeout=7)
            if res.ok:
                data = res.json()
                if data.get("status") == "000" and "list" in data:
                    overhang_keywords = [
                        '전환사채', '신주인수권부사채', '유상증자', '무상증자', '전환청구권행사', 
                        'BW', 'CB', '교환사채', '주식매수선택권', '신주발행', '이익배당', 
                        '감자', '합병', '분할', '소각', '신주인수권'
                    ]
                    
                    invest_keywords = [
                        '타법인주식', '출자', '유형자산양수', '유형자산취득', '영업양수', 
                        '영업양도', '자산총액', '타법인', '지분취득'
                    ]
                    
                    for item in data["list"]:
                        title = item.get("report_nm", "")
                        rcept_no = item.get("rcept_no", "")
                        rcept_dt = item.get("rcept_dt", "")
                        
                        formatted_date = f"{rcept_dt[:4]}.{rcept_dt[4:6]}.{rcept_dt[6:8]}"
                        link = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"
                        
                        matched = False
                        for kw in overhang_keywords:
                            if kw in title:
                                if not any(x['title'] == title and x['date'] == formatted_date for x in overhang):
                                    overhang.append({
                                        "title": title, "link": link, "date": formatted_date, "type": "오버행(잠재물량)"
                                    })
                                matched = True
                                break
                                
                        if not matched:
                            for kw in invest_keywords:
                                if kw in title:
                                    if not any(x['title'] == title and x['date'] == formatted_date for x in investments):
                                        investments.append({
                                            "title": title, "link": link, "date": formatted_date, "type": "타법인출자/투자"
                                        })
                                    break
        except Exception as e:
            print(f"[DART API] Overhang/Investments error: {e}")

    # 2. Scrape Naver as fallback or complementary source
    try:
        # 최근 10페이지 정보 스캔 (더 많은 과거 정보 추적)
        for page in range(1, 11):
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
                if any(x['title'] == title and x['date'].split()[0] == date_text.split()[0] for x in overhang + investments):
                    continue

                # 오버행 분류 (CB, BW, 증자, 주식전환 등)
                overhang_keywords = [
                    '전환사채', '신주인수권부사채', '유상증자', '무상증자', '전환청구권행사', 
                    'BW', 'CB', '교환사채', '주식매수선택권', '신주발행', '이익배당', 
                    '감자', '합병', '분할', '소각', '신주인수권'
                ]
                
                # 출자정보 분류
                invest_keywords = [
                    '타법인주식', '출자', '유형자산양수', '유형자산취득', '영업양수', 
                    '영업양도', '자산총액', '타법인', '지분취득'
                ]
                
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
                            
            # 결과가 충분히 모였으면서 페이지가 꽤 진행되었으면 종료 고려 (성능 조절)
            if len(overhang) > 20 and len(investments) > 15 and page > 5:
                break 
                
    except Exception as e:
        print(f"Overhang/Investments fetch error: {e}")
        
    return {
        "overhang": sorted(overhang, key=lambda x: x['date'], reverse=True),
        "investments": sorted(investments, key=lambda x: x['date'], reverse=True)
    }

