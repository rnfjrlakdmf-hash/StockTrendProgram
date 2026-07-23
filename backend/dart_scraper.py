import requests
from bs4 import BeautifulSoup
import re
import traceback

def scrape_dart_text(dart_link: str) -> str:
    """
    DART 공시 링크(rcpNo)를 받아 원문 텍스트를 스크래핑합니다.
    예: https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240618800166
    """
    try:
        # 링크에서 rcpNo 추출
        match = re.search(r'rcpNo=(\d+)', dart_link)
        if not match:
            return ""
            
        rcp_no = match.group(1)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
        
        # 1. 메인 페이지 요청
        main_url = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcp_no}"
        res = requests.get(main_url, headers=headers, timeout=5)
        res.raise_for_status()
        
        # 2. dcmNo 추출 (정규식)
        # JavaScript 예: viewDoc('20240502000123', '9045618', '0', '0', '0', 'dart3.xsd')
        dcm_match = re.search(r"viewDoc\('{}',\s*'(\d+)'".format(rcp_no), res.text)
        
        if dcm_match:
            dcm_no = dcm_match.group(1)
            # 뷰어 페이지 요청
            viewer_url = f"https://dart.fss.or.kr/report/viewer.do?rcpNo={rcp_no}&dcmNo={dcm_no}&eleId=0&offset=0&length=0&dtd=dart3.xsd"
            res2 = requests.get(viewer_url, headers=headers, timeout=5)
            res2.raise_for_status()
            
            # 본문을 CP949일 경우 디코딩
            try:
                html_text = res2.content.decode('euc-kr', errors='ignore')
            except:
                html_text = res2.text
                
            soup = BeautifulSoup(html_text, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            
            # 너무 길면 자름 (Gemini Flash 컨텍스트 제한 고려 및 시간 단축)
            return text[:4000]
        else:
            # 뷰어 형식이 아니면(KIND 등) 일반 텍스트 추출 시도
            try:
                html_text = res.content.decode('euc-kr', errors='ignore')
            except:
                html_text = res.text
                
            soup = BeautifulSoup(html_text, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            return text[:4000]
            
    except Exception as e:
        print(f"[DART Scraper Error] {e}")
        return ""

if __name__ == "__main__":
    # 삼성전자 임의의 공시 테스트 (20240131800045)
    test_url = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240131800045"
    print("Scraping:", test_url)
    text = scrape_dart_text(test_url)
    print("Length:", len(text))
    print("Preview:", text[:500])
