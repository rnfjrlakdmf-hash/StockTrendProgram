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


def is_already_alerted_today(stock_name: str, today_str: str) -> bool:
    """DB에 오늘 이미 발송된 종목인지 영구 확인 (서버 재시작/깃 리셋과 무관하게 보존)"""
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sent_whale_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stock_name TEXT NOT NULL,
                alert_date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(stock_name, alert_date)
            )
        """)
        cur.execute("SELECT id FROM sent_whale_alerts WHERE stock_name = ? AND alert_date = ?", (stock_name, today_str))
        row = cur.fetchone()
        conn.close()
        return row is not None
    except Exception as e:
        print(f"[Whale DB] Duplicate check error: {e}")
        return False


def mark_alerted_today(stock_name: str, today_str: str):
    """DB에 오늘 발송 완료 기록 저장"""
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sent_whale_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stock_name TEXT NOT NULL,
                alert_date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(stock_name, alert_date)
            )
        """)
        cur.execute("INSERT OR IGNORE INTO sent_whale_alerts (stock_name, alert_date) VALUES (?, ?)", (stock_name, today_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Whale DB] Mark alerted error: {e}")


# ──────────────────────────────────────────────────────────────────
# 1. 외국인 순매수 1위 (DB 영구 중복 방지 강화)
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

        top_stock_code = None
        top_stock_name = None
        for row in rows:
            name_cell = row.find('a', class_='company')
            if name_cell:
                top_stock_name = name_cell.text.strip()
                href = name_cell.get('href', '')
                if 'code=' in href:
                    top_stock_code = href.split('code=')[-1].split('&')[0]
                break

        if not top_stock_name or not top_stock_code:
            print("[Whale] No stock name or code found in table")
            return

        # 🛡️ [2중 중복 방지] DB 및 메모리 상태 양쪽 모두 검증
        if is_already_alerted_today(top_stock_name, today_str) or top_stock_name in state.get("alerted_stocks", []):
            print(f"[Whale] {top_stock_name} already alerted today ({today_str}), skipping duplicate.")
            return

        # 발송 즉시 DB에 기록하여 중복 호출 원천 차단
        mark_alerted_today(top_stock_name, today_str)

        title = f"[세력 포착] 외국인 폭풍 매수 1위: {top_stock_name}"
        body = "지금 장중에 외국인이 가장 많이 담고 있는 종목입니다.\n💡 [시장해석] 오늘 장중 외국인 스마트머니 집중 유입"
        print(f"[Whale] Alert Triggered: {title}")

        try:
            initialize_firebase()
            tokens = get_all_fcm_tokens(require_whale_alert=True)
            try:
                from telegram_service import send_telegram_teaser
                teaser_msg = f"🚨 <b>[외국인 폭풍 매수 포착!]</b>\n\n지금 외국인이 쓸어담고 있는 1위 종목은? 👉 <b>{top_stock_name}</b>\n\n👇 <b>실시간 수급 및 차트 확인하기</b>\n<a href='https://stock-trend-program.co.kr/stock/{top_stock_code}'>앱에서 즉시 확인하기</a>"
                send_telegram_teaser(teaser_msg, alert_type="whale_alert", skip_db_save=True)
            except Exception as e:
                print(f"[Whale] Telegram teaser error: {e}")

            if tokens:
                push_data = {
                    "type": "whale_accumulation",
                    "symbol": top_stock_name,
                    "url": f"/stock/{top_stock_code}",
                    "market": "KR",
                }
                send_multicast_notification(tokens, title, body, push_data)
                print(f"[Whale] Sent multicast alert to {len(tokens)} tokens.")
            else:
                print("[Whale] No tokens subscribed to whale alerts.")
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
    current_time_num = now.hour * 100 + now.minute
    if now.weekday() >= 5 or not (730 <= current_time_num < 1900):
        print(f"[Whale Large] 야간/비영업 시간({now.strftime('%H:%M')}) - 대량보유 알림 발송 생략")
        return

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

            corp_name = filing.get("corp_name", "알 수 없음")
            flr_nm = filing.get("flr_nm", "")
            corp_code = filing.get("corp_code", "")
            
            filer_key = f"{corp_name}_{flr_nm}"
            if flr_nm and filer_key in sent_filers:
                sent_nos.add(rcept_no)
                continue
            
            # ✅ [업그레이드] majorstock 상세 파싱
            ant_details = None
            if corp_code and rcept_no:
                try:
                    ant_details = dart_api_client.get_super_ant_details(corp_code, rcept_no)
                except Exception as ant_e:
                    print(f"[Whale Large] 상세 파싱 실패: {ant_e}")

            if ant_details:
                reporter = ant_details.get("reporter", flr_nm or "대량보유자")
                direction = ant_details.get("direction", "변동")
                irds_qty = ant_details.get("irds_qty", 0)
                final_qty = ant_details.get("final_qty", 0)
                final_rate = ant_details.get("final_rate", 0.0)
                rate_irds = ant_details.get("rate_irds", 0.0)
                reason = ant_details.get("reason", "")

                title = f"🐜 [슈퍼개미 {direction}] {corp_name}"
                body_text = f"{reporter} | 지분 {direction}"
                if irds_qty > 0:
                    body_text += f" {irds_qty:,}주"
                if rate_irds != 0:
                    body_text += f" ({rate_irds:+.2f}%p)"
                if final_qty > 0:
                    body_text += f"\n보유: {final_qty:,}주"
                    if final_rate > 0:
                        body_text += f" ({final_rate:.2f}%)"
                if reason:
                    body_text += f" · {reason}"
                
                if "취득" in direction or "매수" in direction:
                    body_text += "\n💡 [시장해석] 큰손 5%+ 집중 매집 · 수급 유입 기대"
                elif "처분" in direction or "매도" in direction:
                    body_text += "\n💡 [시장해석] 대량보유자 지분 축소 · 차익실현 물량 주의"
                else:
                    body_text += "\n💡 [시장해석] 지분 구조 및 담보 계약 변동"
            else:
                title = f"🚨 [슈퍼개미 포착] {corp_name}"
                body_text = f"{flr_nm} | 대량보유 지분 변동 발생\n💡 [시장해석] 큰손의 지분 구조 변화 · 세부 내역 확인 필요" if flr_nm else "대량보유자의 지분 보유상황 변동이 발생했습니다.\n💡 [시장해석] 큰손의 지분 구조 변화 · 세부 내역 확인 필요"
            
            body = body_text
            link = filing.get("link", f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}")

            print(f"[Whale Large] New: {title}")

            try:
                initialize_firebase()
                tokens = get_all_fcm_tokens(require_whale_alert=True)
                try:
                    from telegram_service import send_telegram_teaser
                    import urllib.parse
                    teaser_msg = f"🚨 <b>[{title}]</b>\n\n{body}\n\n👇 <b>공시 원문 및 차트 확인하기</b>\n<a href='https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(link)}'>앱에서 즉시 확인하기</a>"
                    send_telegram_teaser(teaser_msg, alert_type="whale_alert", skip_db_save=True)
                except Exception as e:
                    print(f"[Whale Large] Telegram teaser error: {e}")
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
    current_time_num = now.hour * 100 + now.minute
    if now.weekday() >= 5 or not (730 <= current_time_num < 1900):
        print(f"[Whale Insider] 야간/비영업 시간({now.strftime('%H:%M')}) - 내부자 알림 발송 생략")
        return

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
            corp_code = filing.get("corp_code", "")
            
            filer_key = f"{corp_name}_{flr_nm}"
            if flr_nm and filer_key in sent_filers:
                sent_nos.add(rcept_no)
                continue
            
            # ✅ [업그레이드] elestock 상세 파싱
            insider_details = None
            if corp_code and rcept_no:
                try:
                    insider_details = dart_api_client.get_insider_trading_details(corp_code, rcept_no)
                except Exception as ins_e:
                    print(f"[Whale Insider] 상세 파싱 실패: {ins_e}")

            if insider_details and insider_details.get("qty", 0) > 0:
                t_type = insider_details.get("trans_type", "변동")
                reporter = insider_details.get("reporter", flr_nm or "임원")
                title_ofcps = insider_details.get("title", "")
                qty = insider_details.get("qty", 0)
                remain = insider_details.get("remain_qty", 0)
                rate = insider_details.get("hold_rate", "")

                title = f"🚨 [내부자 {t_type}] {corp_name}"
                body_text = f"{reporter}"
                if title_ofcps and title_ofcps != "-":
                    body_text += f" ({title_ofcps})"
                body_text += f" | {t_type} {qty:,}주"
                if remain > 0:
                    body_text += f"\n변동 후 보유: {remain:,}주"
                    if rate:
                        body_text += f" ({rate}%)"

                if t_type == "매수":
                    body_text += "\n💡 [시장해석] 대표/경영진의 자사주 매수 · 실적 자신감 신호"
                else:
                    body_text += "\n💡 [시장해석] 임원 지분 매도 · 차익실현 또는 유동성 확보"
            else:
                title = f"🚨 [내부자 거래 포착] {corp_name}"
                body_text = f"회사 임원 및 주요주주의 주식 보유상황(매수/매도) 변동 발생\n💡 [시장해석] 경영진 지분 매매 · 방향성 확인 필요"
                if flr_nm:
                    body_text = f"{flr_nm} (임원/주요주주) | 자사주 보유 변동\n💡 [시장해석] 경영진 지분 매매 · 방향성 확인 필요"

            body = body_text
            link = filing.get("link", f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}")

            print(f"[Whale Insider] New: {title}")

            try:
                initialize_firebase()
                tokens = get_all_fcm_tokens(require_insider_alert=True)
                try:
                    from telegram_service import send_telegram_teaser
                    import urllib.parse
                    teaser_msg = f"🚨 <b>[{title}]</b>\n\n{body}\n\n👇 <b>공시 원문 및 수급 확인하기</b>\n<a href='https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(link)}'>앱에서 즉시 확인하기</a>"
                    send_telegram_teaser(teaser_msg, alert_type="whale_alert", skip_db_save=True)
                except Exception as e:
                    print(f"[Whale Insider] Telegram teaser error: {e}")
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
