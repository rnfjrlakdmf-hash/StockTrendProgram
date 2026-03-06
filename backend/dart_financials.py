import os
import requests
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
import json
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
DART_API_KEY = os.environ.get("DART_API_KEY")

# 캐시 파일 위치 
CACHE_FILE = os.path.join(os.path.dirname(__file__), "dart_corp_codes.json")

def _download_and_parse_corp_codes() -> dict:
    """
    DART에서 최신 고유번호.xml zip을 다운로드받아 파싱 후 
    { '종목코드': '고유번호' } 형태의 dict로 반환합니다.
    """
    if not DART_API_KEY:
        print("[DART] API Key is missing. Cannot fetch corp codes.")
        return {}

    url = "https://opendart.fss.or.kr/api/corpCode.xml"
    params = {"crtfc_key": DART_API_KEY}
    
    mapping = {}
    
    try:
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            # DART는 바이너리 ZIP 파일을 줌
            with zipfile.ZipFile(BytesIO(res.content)) as z:
                # ZIP 안에 CORPCODE.xml 이 들어있음
                for filename in z.namelist():
                    if filename.endswith(".xml"):
                        xml_content = z.read(filename)
                        root = ET.fromstring(xml_content)
                        
                        # 파싱 
                        for list_node in root.findall('list'):
                            corp_code = list_node.find('corp_code').text
                            stock_code = list_node.find('stock_code').text
                            
                            # 상장사(stock_code가 있음)만 취급
                            if stock_code and stock_code.strip():
                                mapping[stock_code.strip()] = corp_code.strip()
            
            # 파싱 성공 후 로컬에 JSON 저장 (다음 구동 시 속도 향상)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(mapping, f)
            print(f"[DART] Successfully mapped {len(mapping)} listed corporations.")
            return mapping
        else:
            print(f"[DART] Error downloding corp codes: {res.status_code}")
            return {}
            
    except Exception as e:
        print(f"[DART] Exception in _download_and_parse_corp_codes: {e}")
        return {}

def get_corp_code_mapping() -> dict:
    """
    고유번호 매핑표를 가져옵니다. 
    1) 캐시된 json이 있다면 우선 로드 (재시작 시 속도이점)
    2) 없다면 새로 다운로드
    """
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                mapping = json.load(f)
                if mapping:
                    return mapping
        except:
            pass
            
    # 캐시가 없거나 로드 실패시 새로 다운로드
    return _download_and_parse_corp_codes()

def get_corp_code(symbol: str, mapping: dict = None) -> str:
    """
    주식 코드(ex: '005930.KS' 또는 '005930') 에서 DART 고유번호 추출 
    """
    import re
    # 숫자 6자리만 추출
    clean_code = re.sub(r'[^0-9]', '', symbol.split('.')[0])
    
    if not mapping:
        mapping = get_corp_code_mapping()
        
    return mapping.get(clean_code, "")

# 최초 1회 로드하여 메모리에 들고 있기 위함 (Global Cache)
_CORP_MAPPING_CACHE = None

def get_dart_financials(symbol: str) -> dict:
    """
    DART 단일회사 주요계정 API를 호출하여 최근년도 핵심 재무 데이터를 가져옴.
    """
    global _CORP_MAPPING_CACHE
    if not _CORP_MAPPING_CACHE:
        _CORP_MAPPING_CACHE = get_corp_code_mapping()
        
    corp_code = get_corp_code(symbol, _CORP_MAPPING_CACHE)
    if not corp_code:
        return {"success": False, "error": "Not a listed company or no DART code found"}
        
    if not DART_API_KEY:
        return {"success": False, "error": "No DART_API_KEY"}

    url = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
    
    import datetime
    # 현재 연도에서 작년/재작년 사업보고서를 시도
    current_year = datetime.datetime.now().year
    
    # 최근 2년치 조회 시도 (가장 최근에 공시된 것 우선)
    target_years = [str(current_year - 1), str(current_year - 2)]
    # 보고서 코드 (11011: 사업보고서)
    reprt_code = "11011" 
    
    for bsns_year in target_years:
        params = {
            "crtfc_key": DART_API_KEY,
            "corp_code": corp_code,
            "bsns_year": bsns_year,
            "reprt_code": reprt_code
        }
        
        try:
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "000" and "list" in data:
                    # 데이터 파싱 로직
                    financials = {}
                    for item in data.get("list", []):
                        account_nm = item.get("account_nm", "")
                        amount_str = item.get("thstrm_amount", "0")
                        
                        # '-' 등 비정상 값 필터
                        if not amount_str or amount_str == "-":
                            continue
                            
                        # 문자열 금액을 숫자로
                        try:
                            val = int(amount_str.replace(",", ""))
                        except:
                            continue
                            
                        if "유동자산" in account_nm and "비유동자산" not in account_nm:
                            financials['current_assets'] = val
                        elif "유동부채" in account_nm and "비유동부채" not in account_nm:
                            financials['current_liabilities'] = val
                        elif "부채총계" in account_nm:
                            financials['total_liabilities'] = val
                        elif "자본총계" in account_nm:
                            financials['total_equity'] = val
                        elif "매출액" in account_nm:
                            financials['revenue'] = val
                        elif "영업이익" in account_nm:
                            financials['operating_income'] = val
                        elif "당기순이익" in account_nm:
                            financials['net_income'] = val

                    # 필요한 핵심 데이터가 어느정도 모였으면 반환
                    if 'total_liabilities' in financials and 'total_equity' in financials:
                        financials['success'] = True
                        financials['year'] = bsns_year
                        return financials
        except Exception as e:
            print(f"[DART] API fetch error for {corp_code} {bsns_year}: {e}")
            
    return {"success": False, "error": "Could not retrieve complete financial data"}
