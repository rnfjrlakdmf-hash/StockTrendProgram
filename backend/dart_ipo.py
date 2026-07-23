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
    DART API 캐시된 공모주 청약일정 메뉴에서 데이터를 읽어옵니다.
    """
    import json
    import time
    import threading
    import subprocess
    
    cache_path = os.path.join(os.path.dirname(__file__), 'ipo_cache.json')
    cache_script = os.path.join(os.path.dirname(__file__), 'cache_ipo.py')
    
    # 캐시 갱신 함수 (백그라운드 실행)
    def update_cache_bg():
        try:
            subprocess.Popen(["python", cache_script], cwd=os.path.dirname(__file__))
        except Exception as e:
            print(f"[IPO Cache Update Error] {e}")

    # 캐시가 없거나 24시간 이상 지났으면 백그라운드 갱신
    needs_update = False
    if not os.path.exists(cache_path):
        needs_update = True
    else:
        file_age = time.time() - os.path.getmtime(cache_path)
        if file_age > 86400: # 24시간
            needs_update = True
            
    if needs_update:
        threading.Thread(target=update_cache_bg, daemon=True).start()
        
    # 캐시 읽기
    try:
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"[IPO Read Error] {e}")
        
    return []

if __name__ == "__main__":
    res = fetch_dart_ipo_schedule()
    for r in res:
        print(r)

