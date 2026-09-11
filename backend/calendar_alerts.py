import os
import json
import logging
from datetime import datetime, date, timedelta
import pytz

from db_manager import get_db_connection, get_user_fcm_tokens, get_user_calendar_alert_prefs
from firebase_config import send_multicast_notification

logger = logging.getLogger(__name__)

# State file to prevent duplicate alerts on the same day
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "calendar_alert_state.json")

def load_alert_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"[CalendarAlert] Failed to load state: {e}")
    return {"last_run_date": "", "sent_keys": []}

def save_alert_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[CalendarAlert] Failed to save state: {e}")

def get_watchlist_users_and_symbols():
    """모든 관심종목 사용자와 그들의 보유 심볼 목록을 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, symbol FROM watchlist WHERE user_id IS NOT NULL AND symbol IS NOT NULL")
    rows = cursor.fetchall()
    conn.close()

    user_symbols = {}
    for uid, sym in rows:
        if uid not in user_symbols:
            user_symbols[uid] = []
        if sym not in user_symbols[uid]:
            user_symbols[uid].append(sym)
    return user_symbols

def get_user_calendar_permission(user_id: str) -> bool:
    """사용자가 전체 캘린더 알림을 켜두었는지 확인 (기본 True)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pref_calendar_alert FROM fcm_tokens 
        WHERE user_id = ? 
        ORDER BY last_used DESC LIMIT 1
    """, (str(user_id),))
    row = cursor.fetchone()
    conn.close()
    if row and row[0] is not None:
        return bool(row[0])
    return True

def check_and_send_calendar_dday_alerts():
    """
    매일 아침 실행되어 관심종목의 실적발표, 배당기준일 등이
    D-7(일주일 전), D-1(하루 전), D-0(당일)으로 다가온 경우 FCM 알림을 자동 전송합니다.
    """
    kst = pytz.timezone("Asia/Seoul")
    now = datetime.now(kst)
    today_date = now.date()
    today_str = today_date.strftime("%Y-%m-%d")

    # 주말(토/일)은 증시 휴장이므로 스킵
    if now.weekday() >= 5:
        logger.info("[CalendarAlert] 주말에는 캘린더 D-Day 알림을 발송하지 않습니다.")
        return

    logger.info(f"[CalendarAlert] D-Day 캘린더 알림 스캔 시작 ({today_str})...")

    state = load_alert_state()
    # 날짜가 바뀌었으면 발송 기록 초기화
    if state.get("last_run_date") != today_str:
        state["last_run_date"] = today_str
        state["sent_keys"] = []

    sent_keys = set(state.get("sent_keys", []))

    user_symbols_map = get_watchlist_users_and_symbols()
    if not user_symbols_map:
        logger.info("[CalendarAlert] 관심종목 등록 사용자가 없습니다.")
        return

    from routes.market import get_watchlist_events

    total_sent = 0

    for user_id, symbols in user_symbols_map.items():
        try:
            # 1. 사용자의 전체 캘린더 알림 설정 확인
            if not get_user_calendar_permission(user_id):
                continue

            # 2. 사용자 기기의 FCM 토큰 조회
            tokens_data = get_user_fcm_tokens(user_id)
            tokens = [t["token"] for t in tokens_data if t.get("token")]
            if not tokens:
                continue

            # 3. 사용자 개별 카드별 알림 예외 설정 조회
            user_card_prefs = get_user_calendar_alert_prefs(user_id)

            # 4. 사용자의 관심종목에 대한 일정 조회
            syms_str = ",".join(symbols[:30])
            events_resp = get_watchlist_events(symbols=syms_str, x_user_id=user_id)
            all_events = events_resp.get("data", [])

            # 다가오는 미래 일정만 필터링
            upcoming_events = [ev for ev in all_events if ev.get("is_upcoming")]

            for ev in upcoming_events:
                ev_date_str = ev.get("date", "")
                if not ev_date_str:
                    continue

                try:
                    ev_date = datetime.strptime(ev_date_str, "%Y-%m-%d").date()
                except:
                    continue

                diff = (ev_date - today_date).days

                # D-7, D-1, D-0 (당일) 에만 발송
                if diff not in [7, 1, 0]:
                    continue

                sym = ev.get("symbol", "")
                ev_type = ev.get("type", "earnings")
                corp_name = ev.get("name") or sym
                detail = ev.get("detail", "주요 일정")

                # 개별 카드 알림이 꺼져있는지 확인
                pref_key = f"{sym}_{ev_type}_{ev_date_str}"
                if not user_card_prefs.get(pref_key, True):
                    continue

                # 중복 발송 방지 키: {today}_{user_id}_{sym}_{ev_type}_{diff}
                dedup_key = f"{today_str}_{user_id}_{sym}_{ev_type}_{diff}"
                if dedup_key in sent_keys:
                    continue

                # 알림 제목 및 문구 생성
                if diff == 7:
                    d_day_tag = "D-7"
                    if ev_type == "earnings":
                        title = f"📢 [실적발표 {d_day_tag}] {corp_name}"
                        body = f"{corp_name}의 실적 공시 예정일이 일주일 앞으로 다가왔습니다 ({ev_date_str}). 실적 추정치와 변동성에 유의하세요."
                    elif ev_type == "dividend":
                        title = f"💰 [배당일정 {d_day_tag}] {corp_name}"
                        body = f"{corp_name}의 배당기준일이 일주일 앞으로 다가왔습니다 ({ev_date_str})."
                    else:
                        title = f"📅 [일정안내 {d_day_tag}] {corp_name}"
                        body = f"{corp_name}의 '{detail}' 일정이 7일 남았습니다."
                elif diff == 1:
                    d_day_tag = "D-1"
                    if ev_type == "earnings":
                        title = f"⚠️ [실적발표 {d_day_tag}] {corp_name}"
                        body = f"내일({ev_date_str}) {corp_name}의 실적 공시가 예정되어 있습니다. 정규장 및 시간외 변동성을 체크하세요."
                    elif ev_type == "dividend":
                        title = f"💰 [배당기준일 {d_day_tag}] {corp_name}"
                        body = f"내일은 {corp_name}의 배당기준일(배당락)입니다. 배당을 수령하려면 오늘 정규장 마감 전까지 매수해야 합니다."
                    else:
                        title = f"📅 [일정안내 {d_day_tag}] {corp_name}"
                        body = f"내일({ev_date_str}) {corp_name}의 '{detail}' 일정이 예정되어 있습니다."
                else:  # diff == 0
                    d_day_tag = "D-Day"
                    if ev_type == "earnings":
                        title = f"⏰ [실적발표 {d_day_tag}] {corp_name}"
                        body = f"오늘 {corp_name}의 정기 실적 발표 공시가 예정되어 있습니다."
                    elif ev_type == "dividend":
                        title = f"💰 [배당기준일 {d_day_tag}] {corp_name}"
                        body = f"오늘 {corp_name}의 정기 주주 배당 기준일입니다."
                    else:
                        title = f"⏰ [일정 D-Day] {corp_name}"
                        body = f"오늘 {corp_name}의 '{detail}' 일정이 진행됩니다."

                # 푸시 전송
                clean_sym = sym.split(".")[0]
                target_url = f"/stock/{clean_sym}"

                send_multicast_notification(
                    tokens,
                    title,
                    body,
                    {"url": target_url, "type": "calendar_alert", "is_global": "false"},
                    target_users=[user_id]
                )

                sent_keys.add(dedup_key)
                total_sent += 1
                logger.info(f"[CalendarAlert] Sent to {user_id} ({corp_name} {d_day_tag})")

        except Exception as e:
            logger.error(f"[CalendarAlert Error for user {user_id}]: {e}")

    state["sent_keys"] = list(sent_keys)[-2000:]
    save_alert_state(state)
    logger.info(f"[CalendarAlert] D-Day 알림 전송 완료 (총 {total_sent}건 발송)")

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    print("--- Testing Calendar D-Day Alerts Module ---")
    check_and_send_calendar_dday_alerts()
    print("--- Finished Testing ---")
