
import requests
import re
import json

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def get_raw_json(code):
    session = requests.Session()
    frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}"
    res_frame = session.get(frame_url, headers=HEADER)
    encparam_match = re.search(r"encparam:\s*'([^']*)'", res_frame.text)
    if not encparam_match: return "No encparam"
    encparam = encparam_match.group(1)
    
    # freq=0 (Annual), rpt=3 (Indicators)
    data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq=0&rpt=3&finGubun=MAIN&encparam={encparam}"
    ajax_headers = { "Referer": frame_url, "X-Requested-With": "XMLHttpRequest" }
    res_data = session.get(data_url, headers=ajax_headers)
    
    # Try decoding
    try:
        return res_data.content.decode('cp949')
    except:
        return res_data.content.decode('utf-8', 'ignore')

if __name__ == "__main__":
    print(get_raw_json("005930")[:2000])
