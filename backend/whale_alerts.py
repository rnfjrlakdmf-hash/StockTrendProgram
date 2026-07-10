"""
🐳 국내 고래 포착 알림 모듈 (DART + 네이버 기반)
────────────────────────────────────────────────
1. 외국인 순매수 1위 (네이버 금융 스크래핑) - 30분마다
2. 지분 5%+ 대량보유상황보고서 (DART Open API) - 5분마다
3. 임원/주요주주 내부자 거래 (DART Open API) - 5분마다
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import traceback
from datetime import datetime
import pytz

try:
    from firebase_config import initialize_firebase, send_multicast_notification, db
    from db_manager import get_all_fcm_tokens
except ImportError:
    pass

STATE_FILE = os.path.join(os.path.dirname(__file__), 'whale_state.json')


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_state(state: dict):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Whale] Failed to save state: {e}")


# ──────────────────────────────────────────────────────────────────
# 1. 외국인 순매수 1위 (기존 로직 유지)
# ──────────────────────────────────────────────────────────────────
def check_whale_alerts():
    """네이버 금융 외국인/기관 순매수 상위 페이지를 스크래핑하여 1위 종목 알림을 보냅니다."""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')

    state = load_state()
    if state.get("date") != today_str:
        state = {"date": today_str, "alerted_stocks": [], "sent_rcept_nos": []}

    url = "https://finance.naver.com/sise/sise_deal_rank.naver"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"[Whale] Failed to fetch Naver rank: {res.status_code}")
            return

        res.encoding = 'euc-kr'
        soup = BeautifulSoup(res.text, 'html.parser')

        tables = soup.find_all('table', class_='type_r1')
        if not tables:
            print("[Whale] Could not find rank tables")
            return

        first_table = tables[0]
        rows = first_table.find_all('tr')

        top_stock_name = None
        for row in rows:
            name_cell = row.find('a', class_='company')
            if name_cell:
                top_stock_name = name_cell.text.strip()
                break

        if not top_stock_name:
            print("[Whale] No stock name found in table")
            return

        if top_stock_name not in state.get("alerted_stocks", []):
            title = f"[세력 포착] 외국인 폭풍 매수 1위: {top_stock_name}"
            body = "지금 장중에 외국인이 가장 많이 담고 있는 종목입니다. 실시간 수급을 확인하세요!"
            print(f"[Whale] Alert Triggered: {title}")

            try:
                initialize_firebase()
                tokens = get_all_fcm_tokens(require_whale_alert=True)
                if tokens:
                    push_data = {
                        "type": "whale_accumulation",
                        "symbol": top_stock_name,
                        "url": f"/stock/{top_stock_name}",
                        "market": "KR",
                    }
                    send_multicast_notification(tokens, title, body, push_data)
                    print(f"[Whale] Sent multicast alert to {len(tokens)} tokens.")
                    
                    try:
                        from telegram_service import send_telegram_teaser
                        teaser_msg = f"🚨 <b>[세력 포착] 지금 장중 외국인 폭풍 매수 1위 종목은?</b>\n외국인이 미친듯이 담고 있는 이 종목! 지금 바로 실시간 수급을 확인하세요!\n\n👉 <a href='https://stock-trend-program.co.kr/discovery'>앱에서 정답 확인하기</a>"
                        send_telegram_teaser(teaser_msg)
                    except Exception as e:
                        print(f"[Whale] Telegram error: {e}")
                else:
                    print("[Whale] No tokens subscribed to whale alerts.")

                if db:
                    doc_ref = db.collection('alerts').document()
                    doc_ref.set({
                        'title': title,
                        'body': body,
                        'link': f"/stock/{top_stock_name}",
                        'timestamp': datetime.now(kst),
                        'read': False,
                        'type': 'whale_accumulation',
                        'is_global': True
                    })
            except Exception as e:
                print(f"[Whale] Firebase push error: {e}")

            if "alerted_stocks" not in state:
                state["alerted_stocks"] = []
            state["alerted_stocks"].append(top_stock_name)
            save_state(state)

    except Exception as e:
        print(f"[Whale] Exception: {e}")
        traceback.print_exc()


# ──────────────────────────────────────────────────────────────────
# 2. 지분 5%+ 대량보유상황보고서 (DART)
# ──────────────────────────────────────────────────────────────────
def check_large_holding_alerts():
    """
    🐳 DART 대량보유상황보고서 실시간 모니터링
    - 지분 5%+ 대량 매집 공시 발생 시 즉시 알림
    """
    try:
        from dart_api_client import dart_api_client
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens
    except ImportError as e:
        print(f"[Whale Large] Import error: {e}")
        return

    if not dart_api_client.is_available():
        print("[Whale Large] DART_API_KEY 없음 - 생략")
        return

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')

    state = load_state()
    if state.get("date") != today_str:
        state = {"date": today_str, "alerted_stocks": [], "sent_rcept_nos": [], "sent_whale_filers": [], "sent_insider_filers": []}
    sent_nos = set(state.get("sent_rcept_nos", []))
    sent_filers = set(state.get("sent_whale_filers", []))

    try:
        filings = dart_api_client.get_large_holding_disclosures(days_ago=0)
        print(f"[Whale Large] Found {len(filings)} large holding disclosures today")

        new_count = 0
        for filing in filings:
            rcept_no = filing.get("rcept_no", "")
            if not rcept_no or rcept_no in sent_nos:
                continue

            corp_name = filing.get("corp_name", "Unknown")
            flr_nm = filing.get("flr_nm", "")
            
            filer_key = f"{corp_name}_{flr_nm}"
            if flr_nm and filer_key in sent_filers:
                sent_nos.add(rcept_no)
                continue
                
            title = f"🚨 [슈퍼개미 포착] {corp_name}"
            
            body_text = "지분 5% 이상 대량 매집이 포착되었습니다! (대량보유상황보고서)"
            if flr_nm:
                body_text += f" (보고자: {flr_nm})"
            
            body = body_text
            link = filing.get("link", f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}")

            print(f"[Whale Large] New: {title}")

            try:
                initialize_firebase()
                tokens = get_all_fcm_tokens(require_whale_alert=True)
                if tokens:
                    push_data = {
                        "type": "large_holding",
                        "symbol": corp_name,
                        "url": link,
                        "market": "KR",
                    }
                    result = send_multicast_notification(tokens, title, body, push_data)
                    print(f"[Whale Large] Sent to {len(tokens)} tokens. Result: {result}")
                    new_count += 1

                from firebase_admin import firestore
                db_client = firestore.client()
                db_client.collection('alerts').document().set({
                    'title': title,
                    'body': body,
                    'link': link,
                    'timestamp': now,
                    'read': False,
                    'type': 'large_holding',
                    'is_global': True
                })
            except Exception as e:
                print(f"[Whale Large] Send error: {e}")

            sent_nos.add(rcept_no)
            if flr_nm:
                sent_filers.add(filer_key)

        # 최대 1000개 보관
        if len(sent_nos) > 1000:
            sent_nos = set(list(sent_nos)[-800:])
        state["sent_rcept_nos"] = list(sent_nos)
        state["sent_whale_filers"] = list(sent_filers)
        
        save_state(state)
        print(f"[Whale Large] Done. New alerts: {new_count}")

    except Exception as e:
        print(f"[Whale Large] Exception: {e}")
        traceback.print_exc()


# ──────────────────────────────────────────────────────────────────
# 3. 임원/주요주주 내부자 거래 (DART)
# ──────────────────────────────────────────────────────────────────
def check_insider_trading_alerts():
    """
    🚨 DART 임원소유상황보고서 실시간 모니터링
    - 임원/주요주주 지분 변동 공시 발생 시 즉시 알림
    """
    try:
        from dart_api_client import dart_api_client
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens
    except ImportError as e:
        print(f"[Whale Insider] Import error: {e}")
        return

    if not dart_api_client.is_available():
        print("[Whale Insider] DART_API_KEY 없음 - 생략")
        return

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')

    state = load_state()
    if state.get("date") != today_str:
        state = {"date": today_str, "alerted_stocks": [], "sent_rcept_nos": [], "sent_whale_filers": [], "sent_insider_filers": []}
    sent_nos = set(state.get("sent_insider_nos", []))
    sent_filers = set(state.get("sent_insider_filers", []))

    try:
        filings = dart_api_client.get_insider_trading_disclosures(days_ago=0)
        print(f"[Whale Insider] Found {len(filings)} insider trading disclosures today")

        new_count = 0
        for filing in filings:
            rcept_no = filing.get("rcept_no", "")
            if not rcept_no or rcept_no in sent_nos:
                continue

            corp_name = filing.get("corp_name", "Unknown")
            flr_nm = filing.get("flr_nm", "")
            
            filer_key = f"{corp_name}_{flr_nm}"
            if flr_nm and filer_key in sent_filers:
                sent_nos.add(rcept_no)
                continue
            
            title = f"🚨 [내부자 거래 포착] {corp_name}"
            body_text = f"회사 임원 또는 주요주주의 지분 변동이 발생했습니다."
            if flr_nm:
                body_text += f" (보고자: {flr_nm})"
            body = body_text
            link = filing.get("link", f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}")

            print(f"[Whale Insider] New: {title}")

            try:
                initialize_firebase()
                tokens = get_all_fcm_tokens(require_insider_alert=True)
                if tokens:
                    push_data = {
                        "type": "insider_trading",
                        "symbol": corp_name,
                        "url": link,
                        "market": "KR",
                    }
                    result = send_multicast_notification(tokens, title, body, push_data)
                    print(f"[Whale Insider] Sent to {len(tokens)} tokens. Result: {result}")
                    new_count += 1

                from firebase_admin import firestore
                db_client = firestore.client()
                db_client.collection('alerts').document().set({
                    'title': title,
                    'body': body,
                    'link': link,
                    'timestamp': now,
                    'read': False,
                    'type': 'insider_trading',
                    'is_global': True
                })
            except Exception as e:
                print(f"[Whale Insider] Send error: {e}")

            sent_nos.add(rcept_no)
            if flr_nm:
                sent_filers.add(filer_key)

        if len(sent_nos) > 1000:
            sent_nos = set(list(sent_nos)[-800:])
        state["sent_insider_nos"] = list(sent_nos)
        state["sent_insider_filers"] = list(sent_filers)
        save_state(state)
        print(f"[Whale Insider] Done. New alerts: {new_count}")

    except Exception as e:
        print(f"[Whale Insider] Exception: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    check_whale_alerts()
