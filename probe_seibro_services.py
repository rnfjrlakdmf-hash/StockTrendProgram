import os
import requests
from dotenv import load_dotenv

# Load .env
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

def probe_seibro_services():
    api_key = os.getenv("SEIBRO_API_KEY")
    if not api_key:
        print("[X] No API Key")
        return

    # Base URL: http://api.seibro.or.kr/openapi/service/{ServiceName}/{OperationName}
    
    # 1. Target: Lock-up (Uimu-Boho-Yesu)
    # Potential Services: StockSvc, SecuritiesInfoSvc, KsdMndtryLockupService, MndtryLockupService
    # Potential Operations: getMandatoryLockUp, getMandatoryLockUpInfo, getMndtryLockupList, getLockUpList
    
    print("\n[ Probing Lock-up Service ]")
    lock_services = [
        "StockSvc", 
        "SecuritiesInfoSvc", 
        "KsdMndtryLockupService", 
        "MndtryLockupService",
        "CompanyInfoSvc"
    ]
    lock_ops = [
        "getMandatoryLockUp", 
        "getMandatoryLockUpInfo", 
        "getMndtryLockupList",
        "getLockUpList"
    ]
    
    for svc in lock_services:
        for op in lock_ops:
            url = f"http://api.seibro.or.kr/openapi/service/{svc}/{op}"
            params = {
                "ServiceKey": api_key,
                "numOfRows": "1",
                "pageNo": "1",
                "shotnIsin": "005930" # Samsung
            }
            try:
                res = requests.get(url, params=params, timeout=3)
                # 200 alone not enough (HTML returns 200). Need XML.
                if res.status_code == 200:
                    if b"<resultCode>" in res.content or b"<header>" in res.content:
                        print(f"[FOUND!] {svc}/{op} -> XML Response")
                        print(f"   Sample: {res.content[:100]}")
                        return # Found one!
                    elif b"NORMAL CODE" in res.content: # Sometimes it returns this text
                         print(f"[FOUND!] {svc}/{op} -> Normal Code Response")
                    # else: print(f"[Failed] {svc}/{op} -> HTML/Error")
            except: pass


    # 2. Target: CB/BW (Stock Related Bond)
    # Service: StockSvc? SeibroShim? 
    # Operation: getStkRltdBndInfo, getBondInfo?
    
    print("\n[ Probing CB/BW Service ]")
    cb_ops = ["getStkRltdBndInfo", "getBondIssuInfo", "getCbBwIssuInfo"]
    
    for svc in lock_services: 
        for op in cb_ops:
            url = f"http://api.seibro.or.kr/openapi/service/{svc}/{op}"
            params = {
                "ServiceKey": api_key,
                "numOfRows": "1",
                "pageNo": "1",
                "shotnIsin": "005930"
            }
            try:
                res = requests.get(url, params=params, timeout=3)
                if res.status_code == 200 and (b"<resultCode>" in res.content or b"<header>" in res.content):
                    print(f"[FOUND!] {svc}/{op} -> XML Response")
                    return
            except: pass

    print("\nProbe Finished.")

if __name__ == "__main__":
    probe_seibro_services()
