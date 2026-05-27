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


def download_and_extract_xml(rcept_no):
    """
    접수번호로 원본 XML을 다운로드하여 텍스트로 반환합니다.
    """
    api_key = os.getenv('DART_API_KEY')
    url = f"https://opendart.fss.or.kr/api/document.xml?crtfc_key={api_key}&rcept_no={rcept_no}"
    try:
        res = requests.get(url, timeout=15)
        if res.status_code == 200:
            with zipfile.ZipFile(io.BytesIO(res.content)) as z:
                for filename in z.namelist():
                    if filename.endswith(".xml"):
                        xml_bytes = z.read(filename)
                        try:
                            # 최신 DART XML은 대부분 UTF-8입니다.
                            xml_content = xml_bytes.decode('utf-8', errors='strict')
                        except UnicodeDecodeError:
                            xml_content = xml_bytes.decode('cp949', errors='ignore')
                        
                        # 50MB가 넘는 방대한 XML을 BeautifulSoup로 파싱하면 서버가 멈춥니다.
                        # 정규식을 이용해 초고속으로 HTML/XML 태그만 제거합니다.
                        text = re.sub(r'<[^>]+>', ' ', xml_content)
                        # 중복 공백 제거
                        text = re.sub(r'\s+', ' ', text)
                        return text
    except Exception as e:
        print(f"[DART IPO] XML download error for {rcept_no}: {e}")
        return f"DEBUG_EXCEPTION:{e}"
    return f"DEBUG_HTTP_FAIL:{res.status_code if 'res' in locals() else 'NoRes'}"


def parse_ipo_details(text):
    """
    정규식을 통해 공모가 밴드와 청약일을 추출합니다.
    """
    if text.startswith("DEBUG_"):
        return {"price_band": text, "schedule": "DEBUG", "competition": "DEBUG"}
        
    details = {
        "price_band": "",
        "schedule": "",
        "competition": "예정" # 주관사 등
    }
    
    # 1. 청약기일 추출
    # 형태1: 2024년 05월 11일 ~ 2024년 05월 12일
    # 형태2: 2024.05.11 ~ 05.12
    date_pattern_1 = r"(20\d{2}년\s*\d{1,2}월\s*\d{1,2}일\s*~?\s*(?:20\d{2}년)?\s*\d{1,2}월\s*\d{1,2}일)"
    date_pattern_2 = r"(20\d{2}\.\s*\d{1,2}\.\s*\d{1,2}\.?\s*~?\s*(?:20\d{2}\.)?\s*\d{1,2}\.\s*\d{1,2}\.?)"
    
    # 청약기일 근처에서 탐색
    idx_sub = text.find("청약기일")
    if idx_sub != -1:
        snippet = text[idx_sub:idx_sub+300]
        match1 = re.search(date_pattern_1, snippet)
        match2 = re.search(date_pattern_2, snippet)
        if match1:
            raw_dates = match1.group(1).replace("년", ".").replace("월", ".").replace("일", "").replace(" ", "")
            details["schedule"] = raw_dates
        elif match2:
            raw_dates = match2.group(1).replace(" ", "")
            details["schedule"] = raw_dates
            
    # 2. 희망공모가액 추출
    # 형태: 12,500원 ~ 15,000원, 혹은 12,500 ~ 15,000
    price_pattern = r"([\d,]+)원?\s*~\s*([\d,]+)원?"
    idx_price = text.find("공모희망가액")
    if idx_price == -1:
        idx_price = text.find("희망공모가액")
    if idx_price != -1:
        snippet = text[idx_price:idx_price+300]
        match = re.search(price_pattern, snippet)
        if match:
            # 밴드 형태로 저장
            p1, p2 = match.group(1).replace(",", ""), match.group(2).replace(",", "")
            try:
                details["price_band"] = f"{int(p1):,}~{int(p2):,}"
            except:
                details["price_band"] = f"{match.group(1)}~{match.group(2)}"
            
    # 주관사 힌트 (대표주관회사)
    idx_under = text.find("대표주관회사")
    if idx_under != -1:
        snippet = text[idx_under:idx_under+150]
        # 주변의 증권사 이름 추출
        sec_match = re.search(r"([가-힣a-zA-Z]+증권|[가-힣a-zA-Z]+투자증권)", snippet)
        if sec_match:
            details["competition"] = sec_match.group(1)
            
    return details


@turbo_cache(ttl_seconds=3600)
def fetch_dart_ipo_schedule():
    """
    메인 공모주 수집 함수 (korea_data.py에서 호출됨)
    """
    api_key = os.getenv('DART_API_KEY')
    filings = fetch_recent_ipo_filings(days=60)
    if not filings:
        return [{"name": "DEBUG_NO_FILINGS", "date": f"KEY={'Set' if api_key else 'None'}", "band": "1~2", "price": "DEBUG", "detail": "DEBUG"}]
        
    data = []
    
    for f in filings:
        text = download_and_extract_xml(f['rcept_no'])
        details = parse_ipo_details(text)
        
        # 청약일이나 밴드가 아예 없으면 유효한 일반 공모주가 아닐 확률이 높으므로 스킵
        if not details["price_band"] and not details["schedule"]:
            continue
            
        # 밴드 정보가 없으면 일반 공모주가 아니거나 파싱 실패로 간주하고 제외 (정확도 향상)
        if not details["price_band"]:
            continue
            
        price_val = details["price_band"]
        schedule_val = details["schedule"]
        
        # 날짜 포맷 정리 (YYYY.MM.DD~YYYY.MM.DD) -> 프론트엔드 포맷에 맞게
        if "~" in schedule_val:
            parts = schedule_val.split("~")
            if len(parts) == 2:
                # "2024.05.15" -> "05.15" ~ "05.16" 형태로 짧게 표시할 수도 있지만
                # 38커뮤니케이션 호환성을 위해 원본에 가깝게
                pass
                
        data.append({
            "name": f['name'],
            "date": schedule_val,
            "price": "확정대기", # 확정 공모가는 별도 공시이므로 밴드만 표시
            "band": price_val,
            "detail": details["competition"]
        })
        
    return data

if __name__ == "__main__":
    # Test execution
    res = fetch_dart_ipo_schedule()
    for r in res:
        print(r)
