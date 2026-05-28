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
    한국거래소(KIND) 공모주 청약일정 메뉴에서 데이터를 크롤링합니다.
    (기존 38.co.kr의 상업적 이용 이슈 회피)
    """
    url = "https://kind.krx.co.kr/listinvstg/pubofrprogcom.do"
    
    # 앞뒤 한달 기간으로 설정
    now = datetime.datetime.now()
    start_date = (now - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    end_date = (now + datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    
    data = {
        "method": "searchPubofrProgComMain",
        "fromDate": start_date,
        "toDate": end_date,
        "currentPageSize": "100",
        "pageIndex": "1"
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    ipo_list = []
    
    try:
        res = requests.post(url, data=data, headers=headers, timeout=10)
        # KIND는 meta tag에 utf-8로 되어있으나 실제 euc-kr, cp949 혼재 가능성 존재
        # requests.content로 원시 바이트를 얻은 뒤 utf-8/euc-kr 폴백 디코딩
        try:
            html = res.content.decode('utf-8', 'ignore')
        except:
            html = res.content.decode('euc-kr', 'ignore')
            
        soup = BeautifulSoup(html, 'html.parser')
        
        target_table = None
        for tbl in soup.find_all('table'):
            if '회사명' in tbl.text or '시장구분' in tbl.text:
                target_table = tbl
                break
                
        if not target_table:
            # 타겟 테이블을 찾지 못했다면 크롤링 실패 (UI 변경 등)
            raise ValueError("KIND Table target not found. UI might have changed.")
            
        rows = target_table.find_all('tr')
        if not rows: return []
        
        # 헤더 인덱스 동적 탐색 (UI 변경에 약간의 내성 확보)
        headers_text = [th.text.strip().replace('\r', '').replace('\n', '') for th in rows[0].find_all(['th', 'td'])]
        
        # 기본 인덱스 설정 (실패 대비)
        idx_name = 1  # 회사명
        idx_underwriter = 2 # 주관사
        idx_band = 3 # 공모희망가액
        idx_schedule = 4 # 청약일정
        
        for i, header in enumerate(headers_text):
            if '회사명' in header: idx_name = i
            elif '주관사' in header: idx_underwriter = i
            elif '희망가액' in header: idx_band = i
            elif '청약일정' in header: idx_schedule = i

        for row in rows[1:]:
            cols = row.find_all(['td', 'th'])
            if len(cols) <= max(idx_name, idx_underwriter, idx_band, idx_schedule): 
                continue
                
            name = cols[idx_name].text.strip()
            schedule = cols[idx_schedule].text.strip()
            band = cols[idx_band].text.strip()
            underwriter = cols[idx_underwriter].text.strip()
            
            # 클리닝
            schedule = schedule.replace("-", ".")
            band = band.replace(" ", "")
            
            if not name or "상세정보" in name:
                continue
                
            ipo_list.append({
                "name": name,
                "date": schedule,
                "price": "확정대기",
                "band": band,
                "detail": underwriter
            })
            
    except Exception as e:
        print(f"[IPO KIND] Crawl Error: {e}")
        # 오류 발생 시 빈 리스트 반환
        return []
        
    return ipo_list

if __name__ == "__main__":
    res = fetch_dart_ipo_schedule()
    for r in res:
        print(r)

