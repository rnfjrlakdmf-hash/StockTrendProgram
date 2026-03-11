import os
import requests
import json
from dotenv import load_dotenv

load_dotenv("backend/.env")
DART_API_KEY = os.environ.get("DART_API_KEY")

def test_reprt_codes():
    """삼성전자 2025년 다양한 보고서 코드 시도"""
    url = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
    corp_code = "00126380"  # 삼성전자
    
    # 보고서 코드
    # 11011: 사업보고서(연간), 11012: 반기보고서(H1), 11013: 분기보고서(Q3), 11014: 분기보고서(Q1)
    reprt_codes = {
        "11011": "사업보고서(연간)",
        "11012": "반기보고서(H1)",
        "11013": "분기보고서(Q3)",
        "11014": "분기보고서(Q1)"
    }
    
    for code, name in reprt_codes.items():
        params = {
            "crtfc_key": DART_API_KEY,
            "corp_code": corp_code,
            "bsns_year": "2025",
            "reprt_code": code
        }
        res = requests.get(url, params=params, timeout=7)
        data = res.json()
        status = data.get("status")
        msg = data.get("message", "")
        count = len(data.get("list", []))
        print(f"  [{code}] {name}: status={status}, items={count}, msg={msg[:30]}")

if __name__ == "__main__":
    print("=== 2025년 보고서 코드별 가용성 테스트 ===")
    test_reprt_codes()
