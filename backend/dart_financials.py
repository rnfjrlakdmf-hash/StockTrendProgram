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
            with zipfile.ZipFile(BytesIO(res.content)) as z:
                for filename in z.namelist():
                    if filename.endswith(".xml"):
                        xml_content = z.read(filename)
                        root = ET.fromstring(xml_content)
                        for list_node in root.findall('list'):
                            corp_code = list_node.find('corp_code').text
                            stock_code = list_node.find('stock_code').text
                            if stock_code and stock_code.strip():
                                mapping[stock_code.strip()] = corp_code.strip()
            
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(mapping, f)
            print(f"[DART] Successfully mapped {len(mapping)} listed corporations.")
            return mapping
        else:
            print(f"[DART] Error downloading corp codes: {res.status_code}")
            return {}
    except Exception as e:
        print(f"[DART] Exception in _download_and_parse_corp_codes: {e}")
        return {}


def get_corp_code_mapping() -> dict:
    """고유번호 매핑표를 가져옵니다. 캐시 우선, 없으면 다운로드."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                mapping = json.load(f)
                if mapping:
                    return mapping
        except:
            pass
    return _download_and_parse_corp_codes()


def get_corp_code(symbol: str, mapping: dict = None) -> str:
    """주식 코드(ex: '005930.KS' 또는 '005930') 에서 DART 고유번호 추출"""
    import re
    clean_code = re.sub(r'[^0-9]', '', symbol.split('.')[0])
    if not mapping:
        mapping = get_corp_code_mapping()
    return mapping.get(clean_code, "")


# 메모리 캐시
_CORP_MAPPING_CACHE = None


def _parse_amt(s: str):
    """숫자 문자열을 int로 변환. 실패 시 None 반환"""
    try:
        if not s or s.strip() == "-" or s.strip() == "":
            return None
        return int(s.replace(",", "").strip())
    except:
        return None


def _fetch_year_financials(corp_code: str, bsns_year: str) -> dict:
    """
    특정 사업연도의 연결재무(CFS) 핵심 지표를 DART API로 조회.
    반환: { current_assets, current_liabilities, total_liabilities, total_equity, net_income } 또는 {}
    """
    url = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bsns_year": bsns_year,
        "reprt_code": "11011"  # 사업보고서
    }
    
    try:
        res = requests.get(url, params=params, timeout=7)
        if res.status_code != 200:
            return {}
        data = res.json()
        if data.get("status") != "000" or "list" not in data:
            return {}
        
        # 연결재무(CFS) 항목 우선, 없으면 전체 사용
        cfs_items = [item for item in data["list"] if item.get("fs_div") == "CFS"]
        items = cfs_items if cfs_items else data["list"]
        
        result = {}
        for item in items:
            acc = item.get("account_nm", "").strip()
            val = _parse_amt(item.get("thstrm_amount"))
            if val is None:
                continue
            
            if "유동자산" in acc and "비유동자산" not in acc and "current_assets" not in result:
                result["current_assets"] = val
            elif "유동부채" in acc and "비유동부채" not in acc and "current_liabilities" not in result:
                result["current_liabilities"] = val
            elif acc == "부채총계" or acc.endswith("부채총계"):
                result["total_liabilities"] = val
            elif acc == "자본총계" or acc.endswith("자본총계"):
                result["total_equity"] = val
            elif "당기순이익" in acc and "net_income" not in result:
                result["net_income"] = val
        
        return result
    except Exception as e:
        print(f"[DART] API fetch error for {corp_code} {bsns_year}: {e}")
        return {}


def get_dart_financials(symbol: str) -> dict:
    """
    DART 단일회사 주요계정 API를 호출하여 최근 3개년 핵심 재무 데이터를 가져옴.
    각 사업연도별로 API를 개별 호출하여 안정적으로 다년도 데이터를 수집한다.
    """
    global _CORP_MAPPING_CACHE
    if not _CORP_MAPPING_CACHE:
        _CORP_MAPPING_CACHE = get_corp_code_mapping()
        
    corp_code = get_corp_code(symbol, _CORP_MAPPING_CACHE)
    if not corp_code:
        return {"success": False, "error": "Not a listed company or no DART code found"}
        
    if not DART_API_KEY:
        return {"success": False, "error": "No DART_API_KEY"}

    import datetime
    current_year = datetime.datetime.now().year
    
    # 최근 4개 사업연도에 대해 각각 API 호출 (3개년 이상 확보 목표)
    target_years = [str(current_year - i) for i in range(1, 5)]
    
    final_list = []
    for bsns_year in target_years:
        fin = _fetch_year_financials(corp_code, bsns_year)
        
        # 최소한 자본총계와 부채총계가 있어야 유효
        if "total_liabilities" in fin and "total_equity" in fin:
            fin["year"] = bsns_year
            final_list.append(fin)
        
        # 3개년 이상 확보 시 조기 종료
        if len(final_list) >= 3:
            break
    
    if final_list:
        # 연도 오름차순 정렬 (차트용: 과거→최신)
        final_list.sort(key=lambda x: x["year"])
        return {"success": True, "data": final_list}
    
    return {"success": False, "error": "Could not retrieve complete financial data"}
