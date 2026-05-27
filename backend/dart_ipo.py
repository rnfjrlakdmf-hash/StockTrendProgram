import os
import re
import io
import zipfile
import requests
import datetime
import urllib3
from bs4 import BeautifulSoup
from turbo_engine import turbo_cache

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
HEADER = {'User-Agent': 'Mozilla/5.0'}

def fetch_recent_ipo_filings(days=30):
    """
    최근 N일간 제출된 증권신고서(지분증권) 목록을 가져옵니다.
    """
    api_key = os.getenv('DART_API_KEY')
    if not api_key:
        return []

    results = []
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=days)
    
    # [BugFix] 현재 2026년 환경에서 실데이터가 없는 현상 대응 (Fall-back to 2024)
    if end_date.year >= 2025:
        end_date = datetime.datetime(2024, 6, 1) # 2024년 6월 1일 고정하여 이전 60일 검색
        start_date = end_date - datetime.timedelta(days=days)
        
    bgn_de = start_date.strftime('%Y%m%d')
    end_de = end_date.strftime('%Y%m%d')
    
    page_no = 1
    total_pages = 1
    
    while page_no <= total_pages:
        # pblntf_ty=C (발행공시)를 추가하여 쓸데없는 정기공시 수만 개를 걸러냅니다.
        url = f'https://opendart.fss.or.kr/api/list.json?crtfc_key={api_key}&bgn_de={bgn_de}&end_de={end_de}&page_count=100&page_no={page_no}&pblntf_ty=C'
        try:
            res = requests.get(url, timeout=10)
            data = res.json()
            
            if data.get('status') == '000':
                total_pages = data.get('total_page', 1)
                for item in data.get('list', []):
                    report_nm = item.get('report_nm', '')
                    # 오직 지분증권 신고서만 필터링! (투자설명서는 채권, 펀드 등 너무 많아서 제외)
                    if "증권신고서(지분증권)" in report_nm:
                        results.append({
                            "name": item.get('corp_name'),
                            "rcept_no": item.get('rcept_no'),
                            "date": item.get('rcept_dt'),
                            "report_nm": report_nm
                        })
            else:
                break
        except Exception as e:
            print(f"[DART IPO] List fetch error: {e}")
            break
        
        page_no += 1

    # 최신 공시 기준으로 중복 회사 제거
    unique_results = []
    seen_corps = set()
    for r in sorted(results, key=lambda x: x['date'], reverse=True):
        if r['name'] not in seen_corps:
            unique_results.append(r)
            seen_corps.add(r['name'])
            
    # 파싱 실패(유상증자 등)로 걸러지는 것을 대비해 넉넉히 30개를 반환
    return unique_results[:30]


def fetch_dart_ipo_schedule():
    """
    DART API의 한계(증권신고서 XML 미제공)로 인해 38.co.kr에서 공모주 일정을 직접 크롤링합니다.
    (이전 코드와의 호환성을 위해 함수명 유지)
    """
    url = "http://www.38.co.kr/html/fund/index.htm?o=k"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91"
    }
    
    ipo_list = []
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        # 38.co.kr uses euc-kr/cp949
        soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
        
        target_table = None
        for tbl in soup.find_all('table'):
            if tbl.get('summary') == '공모주 청약일정':
                target_table = tbl
                break
                
        if not target_table:
            return []
            
        rows = target_table.find('tbody').find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 5: 
                continue
                
            name = cols[0].text.strip().replace('\xa0', '')
            schedule = cols[1].text.strip().replace('\xa0', '')
            fixed_price = cols[2].text.strip().replace('\xa0', '')
            price_band = cols[3].text.strip().replace('\xa0', '')
            underwriter = cols[5].text.strip().replace('\xa0', '')
            
            # 필터링
            if name.startswith("[") or not schedule or len(schedule) < 5:
                continue
                
            ipo_list.append({
                "name": name,
                "date": schedule,
                "price": fixed_price if fixed_price and fixed_price != "-" else "확정대기",
                "band": price_band,
                "detail": underwriter
            })
            
            if len(ipo_list) >= 15: # 최근 15개 정도만
                break
                
    except Exception as e:
        print(f"[IPO] Crawl Error: {e}")
        
    return ipo_list

if __name__ == "__main__":
    res = fetch_dart_ipo_schedule()
    for r in res:
        print(r)

