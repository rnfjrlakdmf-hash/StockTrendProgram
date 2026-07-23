import os
import time
import json
import requests
import re
from typing import Dict, Optional, Any, List
from datetime import datetime

# CIK 캐시 파일 경로
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sec_tickers_cache.json")
CACHE_TTL_SECONDS = 7 * 24 * 3600  # 7일

# SEC API 가이드라인을 준수하는 User-Agent 필수 설정
HEADERS = {
    "User-Agent": "StockTrendProgram/1.0.0 (rnfjr@dummy.com) Python-requests",
    "Accept-Encoding": "gzip, deflate"
}

def _load_cik_mapping() -> Dict[str, int]:
    """
    미국 SEC에서 티커 대 CIK 매핑 데이터를 가져와 캐싱 및 로드합니다.
    """
    # 1. 캐시가 존재하고 유효한지 확인
    if os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        if time.time() - mtime < CACHE_TTL_SECONDS:
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[SEC-Client] Error reading CIK cache file: {e}")

    # 2. 실시간 SEC 공식 다운로드
    try:
        print("[SEC-Client] Downloading SEC company_tickers mapping...")
        url = "https://www.sec.gov/files/company_tickers.json"
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            raw_data = res.json()
            # 파싱하여 {TICKER: CIK_INT} 딕셔너리로 구축
            mapping = {}
            for item in raw_data.values():
                ticker = str(item.get("ticker", "")).upper().strip()
                cik = item.get("cik_str")
                if ticker and cik is not None:
                    mapping[ticker] = cik
            
            # 파일 캐시 저장
            try:
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(mapping, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"[SEC-Client] Error writing CIK cache: {e}")
                
            return mapping
        else:
            print(f"[SEC-Client] Failed to download SEC tickers. Status: {res.status_code}")
    except Exception as e:
        print(f"[SEC-Client] Network error fetching SEC tickers: {e}")

    # 3. 만약 실시간 다운로드에 실패했을 경우 기존 캐시 파일 강제 로드
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass

    return {}


def get_cik_by_ticker(ticker: str) -> Optional[str]:
    """
    주식 티커(예: AAPL)를 10자리 문자열 CIK(예: 0000320193)로 변환합니다.
    """
    ticker_clean = ticker.upper().strip()
    # 거래소 접미사 제거 (예: NVDA.O -> NVDA, AAPL.O -> AAPL)
    ticker_clean = ticker_clean.split('.')[0]
    
    mapping = _load_cik_mapping()
    cik = mapping.get(ticker_clean)
    if cik is not None:
        return str(cik).zfill(10)
    return None


def fetch_company_facts(cik_10_digits: str) -> Optional[Dict[str, Any]]:
    """
    SEC EDGAR Facts API를 호출하여 회사 재무 통계 팩트를 가져옵니다.
    """
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_10_digits}.json"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            return res.json()
        else:
            print(f"[SEC-Client] SEC Facts API response error. Status: {res.status_code} for CIK: {cik_10_digits}")
    except Exception as e:
        print(f"[SEC-Client] Network error requesting SEC Facts CIK {cik_10_digits}: {e}")
    return None


def fetch_recent_filings(cik_10_digits: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    SEC EDGAR Submissions API를 호출하여 최근 공시(Filing) 목록을 DART 형식과 유사하게 반환합니다.
    """
    url = f"https://data.sec.gov/submissions/CIK{cik_10_digits}.json"
    disclosures = []
    
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            data = res.json()
            company_name = data.get("name", "Unknown SEC Company")
            recent = data.get("filings", {}).get("recent", {})
            
            acc_nums = recent.get("accessionNumber", [])
            dates = recent.get("filingDate", [])
            forms = recent.get("form", [])
            
            count = min(limit, len(acc_nums))
            for i in range(count):
                acc_num = acc_nums[i]
                acc_no_dashes = acc_num.replace("-", "")
                cik_int = str(int(cik_10_digits)) # 선행 0 제거
                
                # SEC 원문 링크 (인덱스 페이지가 가장 안정적임)
                link = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_no_dashes}/{acc_num}-index.htm"
                
                form_type = forms[i]
                
                # 날짜 포맷 (YYYY-MM-DD -> YYYY.MM.DD)
                raw_date = dates[i]
                formatted_date = raw_date.replace("-", ".") if raw_date else ""
                
                disclosures.append({
                    "id": acc_num,
                    "title": f"[{form_type}] SEC Filing",
                    "link": link,
                    "submitter": company_name,
                    "date": formatted_date,
                    "type": "SEC"
                })
        else:
            print(f"[SEC-Client] SEC Submissions API response error. Status: {res.status_code} for CIK: {cik_10_digits}")
    except Exception as e:
        print(f"[SEC-Client] Network error requesting SEC Submissions CIK {cik_10_digits}: {e}")
        
    return disclosures
