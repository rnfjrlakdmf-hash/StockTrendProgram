import os
import requests
import json
from dotenv import load_dotenv

# .env 로드 (backend 디렉토리 내에 있음)
load_dotenv("backend/.env")
DART_API_KEY = os.environ.get("DART_API_KEY")

def test_dart():
    url = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": "00126380", # 삼성전자
        "bsns_year": "2024",
        "reprt_code": "11011"
    }
    
    res = requests.get(url, params=params)
    print(f"Status: {res.status_code}")
    data = res.json()
    if data.get("status") == "000":
        for item in data.get("list", []):
            acc = item.get("account_nm")
            th = item.get("thstrm_amount")
            fr = item.get("frmtrm_amount")
            bf = item.get("bfefrm_amount")
            if "부채총계" in acc or "자본총계" in acc:
                print(f"Account: {acc}, th: {th}, fr: {fr}, bf: {bf}")
    else:
        print(f"Error: {data.get('message')}")

if __name__ == "__main__":
    test_dart()
