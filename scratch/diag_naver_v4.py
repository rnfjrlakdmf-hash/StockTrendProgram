import requests
import re
import json

def diag_naver_v4(symbol="005930"):
    print(f"--- Diagnostic v4.0.0 (Encparam & Detailed) for {symbol} ---")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://finance.naver.com/"
    }
    
    session = requests.Session()
    session.headers.update(headers)
    
    # Step 1: Visit main item page
    main_url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    r_main = session.get(main_url)
    print(f"Item Main Page: {r_main.status_code}")
    
    # Step 2: Extract encparam from c1010001.aspx or similar
    # In Naver Finance, financials are often in an iframe from navercomp.wisereport.co.kr
    frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
    r_frame = session.get(frame_url)
    print(f"WiseReport Frame Status: {r_frame.status_code}")
    
    html = r_frame.text
    # Search for encparam
    match = re.search(r"encparam\s*:\s*'([^']+)'", html)
    if not match:
        match = re.search(r"encparam\s*=\s*'([^']+)'", html)
        
    if match:
        encparam = match.group(1)
        print(f"SUCCESS: Found encparam: {encparam[:10]}...")
        
        # Step 3: Fetch cF1001 (Summary) using encparam
        # Usually Summary doesn't need encparam, but let's try the one that DOES need it (cF4002)
        rpt_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y&encparam={encparam}"
        ajax_headers = {
            "Referer": frame_url,
            "X-Requested-With": "XMLHttpRequest"
        }
        r_ajax = session.get(rpt_url, headers=ajax_headers)
        print(f"Ajax Response (cF1001) Status: {r_ajax.status_code}")
        print(f"Ajax Response Length: {len(r_ajax.content)}")
        
        if len(r_ajax.content) > 0:
            print("SUCCESS: Data retrieved!")
            # print(r_ajax.text[:500]) # Preview
        else:
            print("FAILURE: Ajax response is still empty.")
            
    else:
        print("FAILURE: Could not find encparam in the frame.")
        # print("HTML Preview:", html[:500])

if __name__ == "__main__":
    diag_naver_v4()
