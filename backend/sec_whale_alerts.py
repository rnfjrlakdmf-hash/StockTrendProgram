"""
🐳 SEC EDGAR 기반 미국 고래 알림 모듈
────────────────────────────────────────
SEC EDGAR Full-Text Search API (무료, API 키 불필요)를 사용하여
Form 4 (임원 내부자 거래) 및 13F-HR (기관 대규모 포지션) 공시를 실시간으로 조회합니다.

EDGAR API: https://efts.sec.gov/LATEST/search-index
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import traceback

# 중복 발송 방지 상태 파일
STATE_FILE = os.path.join(os.path.dirname(__file__), "sec_whale_state.json")

EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_SUBMISSIONS_URL = "https://data.sec.gov/submissions"

HEADERS = {
    "User-Agent": "StockTrendProgram contact@stocktrend.co.kr",  # SEC 정책상 User-Agent 필수
    "Accept-Encoding": "gzip, deflate",
}


def _load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_state(state: dict):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[SEC Whale] Failed to save state: {e}")


def _edgar_search(form_type: str, date_from: str, date_to: str) -> List[Dict]:
    """
    SEC EDGAR Full-Text Search로 특정 폼 타입의 최신 제출물 조회
    - form_type: "4" or "13F-HR"
    - date_from/to: "YYYY-MM-DD"
    """
    try:
        params = {
            "q": f'"{form_type}"',
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": date_to,
            "forms": form_type,
            "_source": "file_date,period_of_report,entity_name,file_num,form_type,period_of_report",
        }
        res = requests.get(
            "https://efts.sec.gov/LATEST/search-index",
            params=params,
            headers=HEADERS,
            timeout=15,
        )
        if res.status_code == 200:
            data = res.json()
            hits = data.get("hits", {}).get("hits", [])
            results = []
            for hit in hits:
                src = hit.get("_source", {})
                results.append({
                    "accession_no": hit.get("_id", ""),
                    "entity_name": src.get("entity_name", "Unknown"),
                    "form_type": src.get("form_type", form_type),
                    "file_date": src.get("file_date", ""),
                    "period": src.get("period_of_report", ""),
                    "link": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type={form_type}&dateb=&owner=include&count=10",
                })
            return results
        else:
            print(f"[SEC Whale] EDGAR search HTTP error: {res.status_code}")
            return []
    except Exception as e:
        print(f"[SEC Whale] EDGAR search exception: {e}")
        return []


def _edgar_filings_search(form_type: str, days_back: int = 1) -> List[Dict]:
    """
    SEC EDGAR Recent Filings RSS를 사용하여 최신 공시 조회 (더 안정적)
    """
    try:
        today = datetime.utcnow()
        date_from = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        date_to = today.strftime("%Y-%m-%d")

        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": "",
            "forms": form_type,
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": date_to,
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            print(f"[SEC Whale] HTTP {res.status_code} for form {form_type}")
            return []

        data = res.json()
        hits = data.get("hits", {}).get("hits", [])
        results = []
        for hit in hits[:50]:  # 최대 50건만
            src = hit.get("_source", {})
            raw_id = hit.get("_id", "")
            
            # _id format example: "0001768476-26-000007:wkform4_1782852344.xml"
            acc_num = raw_id.split(":")[0] if raw_id else ""
            acc_no_dashes = acc_num.replace("-", "")
            
            try:
                cik_int = str(int(acc_num.split("-")[0]))
                sec_link = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_no_dashes}/{acc_num}-index.htm"
            except:
                sec_link = f"https://www.sec.gov/Archives/edgar/data/0/{acc_no_dashes}/"

            display_names = src.get("display_names", [])
            if "entity_name" in src:
                entity = src.get("entity_name")
            elif display_names:
                # EDGAR returns reporter and issuer in display_names. The issuer is usually the last one.
                entity = display_names[-1].split("(CIK")[0].strip()
            else:
                entity = "Unknown"
                
            ticker = src.get("tickers", "")
            results.append({
                "accession_no": acc_num,
                "entity_name": entity,
                "ticker": ticker if isinstance(ticker, str) else (ticker[0] if ticker else ""),
                "form_type": src.get("form_type", form_type),
                "file_date": src.get("file_date", ""),
                "period": src.get("period_of_report", ""),
                "link": sec_link,
            })
        return results
    except Exception as e:
        print(f"[SEC Whale] Filing search error: {e}")
        traceback.print_exc()
        return []


def check_sec_form4_alerts():
    """
    🐳 SEC Form 4 임원/내부자 거래 알림
    - 최근 1일 제출된 Form 4 중 새로운 것만 발송
    """
    try:
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens
    except ImportError as e:
        print(f"[SEC Whale Form4] Import error: {e}")
        return

    state = _load_state()
    sent_form4 = set(state.get("sent_form4", []))

    filings = _edgar_filings_search("4", days_back=1)
    if not filings:
        print("[SEC Whale Form4] No Form 4 filings found")
        return

    new_count = 0
    for filing in filings:
        accession = filing.get("accession_no", "")
        if not accession or accession in sent_form4:
            continue

        entity_name = filing.get("entity_name", "Unknown")
        ticker = filing.get("ticker", "")
        display_name = f"{ticker} ({entity_name})" if ticker else entity_name

        title = f"🐳 [내부자 거래 포착] {display_name}"
        body = f"회사 핵심 임원의 주식 매수/매도가 발생했습니다! (Form 4)"

        print(f"[SEC Whale Form4] New filing: {title}")

        try:
            initialize_firebase()
            tokens = get_all_fcm_tokens(require_insider_alert=True)
            if tokens:
                push_data = {
                    "type": "sec_insider_trading",
                    "symbol": ticker or entity_name,
                    "url": filing.get("link", "/discovery"),
                    "market": "US",
                }
                result = send_multicast_notification(tokens, title, body, push_data)
                print(f"[SEC Whale Form4] Sent to {len(tokens)} tokens. Result: {result}")
                new_count += 1
            else:
                print("[SEC Whale Form4] No tokens subscribed")
        except Exception as e:
            print(f"[SEC Whale Form4] Send error: {e}")

        sent_form4.add(accession)
        # 최대 500개만 보관 (무한 증가 방지)
        if len(sent_form4) > 500:
            sent_form4 = set(list(sent_form4)[-400:])

    state["sent_form4"] = list(sent_form4)
    _save_state(state)
    print(f"[SEC Whale Form4] Done. New alerts sent: {new_count}")


def check_sec_13f_alerts():
    """
    🐳 SEC 13F-HR 기관 대규모 포지션 공개 알림
    - 최근 2일 제출된 13F-HR 중 새로운 것만 발송
    - 13F는 분기별 제출이라 건수가 적음 (분기마다 몰아서 제출)
    """
    try:
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens
    except ImportError as e:
        print(f"[SEC Whale 13F] Import error: {e}")
        return

    state = _load_state()
    sent_13f = set(state.get("sent_13f", []))

    filings = _edgar_filings_search("13F-HR", days_back=2)
    if not filings:
        print("[SEC Whale 13F] No 13F-HR filings found")
        return

    new_count = 0
    for filing in filings[:10]:  # 13F는 한꺼번에 너무 많으면 스팸 — 최대 10건
        accession = filing.get("accession_no", "")
        if not accession or accession in sent_13f:
            continue

        entity_name = filing.get("entity_name", "Unknown")
        ticker = filing.get("ticker", "")
        display_name = f"{ticker} ({entity_name})" if ticker else entity_name

        title = f"🐳 [미국고래 포착] {display_name}"
        body = f"거대 기관의 보유 주식 현황(13F)이 공개되었습니다!"

        print(f"[SEC Whale 13F] New filing: {title}")

        try:
            initialize_firebase()
            tokens = get_all_fcm_tokens(require_whale_alert=True)
            if tokens:
                push_data = {
                    "type": "sec_13f",
                    "symbol": ticker or entity_name,
                    "url": filing.get("link", "/discovery"),
                    "market": "US",
                }
                result = send_multicast_notification(tokens, title, body, push_data)
                print(f"[SEC Whale 13F] Sent to {len(tokens)} tokens. Result: {result}")
                new_count += 1
            else:
                print("[SEC Whale 13F] No tokens subscribed")
        except Exception as e:
            print(f"[SEC Whale 13F] Send error: {e}")

        sent_13f.add(accession)
        if len(sent_13f) > 200:
            sent_13f = set(list(sent_13f)[-150:])

    state["sent_13f"] = list(sent_13f)
    _save_state(state)
    print(f"[SEC Whale 13F] Done. New alerts sent: {new_count}")


if __name__ == "__main__":
    print("=== Testing SEC Form 4 ===")
    check_sec_form4_alerts()
    print("\n=== Testing SEC 13F ===")
    check_sec_13f_alerts()
