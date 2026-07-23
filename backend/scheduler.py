import asyncio
import logging
import json
import os
import urllib.parse
from datetime import datetime, timedelta
from holiday_checker import is_holiday
from system_watchdog import update_heartbeat

# Configure logging
logger = logging.getLogger(__name__)

# State File to track processed disclosures
# [Vercel-Fix] State file must be in /tmp
if os.environ.get("VERCEL"):
    STATE_FILE = "/tmp/disclosure_state.json"
else:
    STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disclosure_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
    return {"processed_ids": [], "sec_processed_ids": [], "last_briefing_hour": -1, "last_briefing_date": ""}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")

def mark_processed_and_save(state: dict, processed_ids: dict, doc_id: str):
    """
    [핵심 중복방지] 공시 ID를 처리 완료로 즉시 표시하고 파일에 저장.
    Gemini API 호출 전에 반드시 이 함수를 먼저 호출해야 함.
    서버가 API 호출 도중 죽어도 재시작 시 같은 공시를 다시 처리하지 않음.
    """
    processed_ids[doc_id] = None
    state["processed_ids"] = list(processed_ids.keys())[-2000:]
    save_state(state)
    logger.debug(f"[Anti-Duplicate] Marked {doc_id} as processed before API call")


async def check_and_notify_disclosures():
    """
    DART OpenAPI 기반 국내 공시 실시간 체크 (5분마다)
    - 키워드 필터 없음: 관심종목이면 모든 신규 공시 즉시 알림
    - 알림 제목: [공시 속보] 형식으로 통일
    """
    logger.info("[공시Monitor] DART 공시 체크 시작...")

    from dart_api_client import dart_api_client
    if not dart_api_client.is_available():
        logger.warning("[공시Monitor] DART_API_KEY 없음 -> 공시 체크 생략")
        return

    from db_manager import get_user_tokens_by_watchlist_symbol
    from firebase_config import send_multicast_notification

    try:
        state = load_state()
        # dict.fromkeys를 사용하여 삽입 순서를 유지 (Python 3.7+)
        # 기존에 set()을 사용하면 순서가 랜덤해져 [-2000:] 슬라이싱 시 최근 공시가 무작위로 삭제되는 치명적 버그 발생
        processed_ids = dict.fromkeys(state.get("processed_ids", []))

        # 오늘 올라온 공시 목록 조회 (최대 100건)
        results = dart_api_client.get_realtime_disclosures(days_ago=0)
        if not results:
            logger.info("[공시Monitor] 조회된 공시 없음")
            return

        new_count = 0
        sent_count = 0

        for item in results:
            doc_id = str(item.get('rcept_no', ''))
            if not doc_id or doc_id in processed_ids:
                continue

            try:
                new_count += 1
                # ✅ [핵심 수정] Gemini API 호출 전에 먼저 ID를 파일에 저장
                # 서버가 API 호출 도중 죽어도 재시작 시 중복 호출 완전 차단
                mark_processed_and_save(state, processed_ids, doc_id)

                raw_code = item.get('stock_code')
                corp = item.get('corp_name', '알 수 없음')
                report_title = item.get('report_nm', '공시')
                dart_link = item.get('link', '')
                rcept_dt = item.get('rcept_dt', '')
                flr_nm = item.get('flr_nm', '')

                # 비상장 법인(stock_code 없음)은 스킵
                if not raw_code:
                    continue
                    
                skip_whale_alert = True
                prefix_title = ""
                ok_users = []  # whale 알림을 실제로 받은 사용자 UID (중복 방지용)

                # [세력 포착 라이브 사이렌 브로드캐스트]
                # 원래는 알림 스팸 방지를 위해 '대량보유' 등을 제외했으나, 마케팅(슈퍼개미 추적) 목적으로 다시 추가함.
                whale_keywords = [
                    # 🟢 대표적 호재
                    "단일판매", "무상증자", "자기주식취득", "자기주식소각", "공개매수", "경영권변경",
                    # 🔴 대표적 악재
                    "유상증자", "감자결정", "상장폐지", "관리종목", "횡령", "배임", "영업정지", "부도발생", "파산신청"
                ]
                
                clean_title = report_title.replace(" ", "")
                is_super_ant = "대량보유" in clean_title
                is_insider = "임원" in clean_title or "주요주주" in clean_title
                is_whale = any(kw in clean_title for kw in whale_keywords) or is_super_ant or is_insider
                
                fact_str = ""
                if is_whale:
                    # [스마트 필터링] 단일판매ㆍ공급계약체결의 경우 매출액 대비 20% 이상인 초대형 계약만 발송
                    skip_whale_alert = False
                    
                    if is_super_ant:
                        prefix_title = "🚨 [슈퍼개미 포착]"
                        fact_str = "슈퍼개미(대량보유자)의 지분 보유상황 변동이 발생했습니다."
                        if flr_nm:
                            fact_str += f" (보고자: {flr_nm})"
                    elif is_insider:
                        prefix_title = "🚨 [내부자 거래 포착]"
                        fact_str = "회사 임원 및 주요주주의 주식 보유상황(매수/매도) 변동이 발생했습니다."
                        if flr_nm:
                            fact_str += f" (보고자: {flr_nm})"
                    else:
                        prefix_title = "🔔 [공시 팩트 알림]"
                        fact_str = "" # AI 비용 절감을 위해 일반 공시는 제목만 발송하도록 수정

                    
                    if not skip_whale_alert:
                        try:
                            from firebase_admin import firestore
                            db = firestore.client()
                            event_data = {
                                "type": "WHALE_ALERT",
                                "corp": corp,
                                "title": report_title,
                                "code": raw_code,
                                "url": dart_link,
                                "timestamp": firestore.SERVER_TIMESTAMP
                            }
                            db.collection("live_events").add(event_data)
                            logger.info(f"[WhaleSiren] Broadcasted event for {corp}")
                            
                            # [추가] FCM 웹 푸시 알림 발송 (전체 사용자 대상)
                            from db_manager import get_all_fcm_tokens_with_user, check_and_consume_alert_quota
                            from firebase_config import send_multicast_notification
                            
                            user_tokens_map = {}
                            for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=True):
                                if uid not in user_tokens_map:
                                    user_tokens_map[uid] = []
                                user_tokens_map[uid].append(tok)
                                
                            all_tokens = []
                            limit_reached_tokens = []
                            ok_users = []
                            limit_users = []
                            
                            for uid, toks in user_tokens_map.items():
                                status = check_and_consume_alert_quota(uid)
                                if status == "OK":
                                    ok_users.append(uid)
                                    all_tokens.extend(toks)
                                elif status == "LIMIT_REACHED":
                                    limit_users.append(uid)
                                    limit_reached_tokens.extend(toks)
                                    
                            push_title = f"{prefix_title} {corp}"
                            summary_body = fact_str if fact_str else f"[{corp}] {report_title} 공시가 방금 올라왔습니다. 지금 바로 원문을 확인하고 대응하세요!"
                            
                            push_data = {
                                "type": "disclosure_alert",
                                "url": f"/stock/{raw_code}",
                                "dart_url": dart_link,
                                "symbol": raw_code,
                                "is_global": "true"
                            }
                            
                            if all_tokens:
                                send_multicast_notification(all_tokens, push_title, summary_body, data=push_data, target_users=ok_users)
                                logger.info(f"[WhaleSiren] FCM Zero-Cost Push sent to {len(all_tokens)} devices for {corp}")
                                
                                try:
                                    from telegram_service import send_telegram_teaser
                                    if is_super_ant:
                                        teaser_msg = f"🚨 <b>[슈퍼개미 매집 포착]</b>\n누군가 수십억대 지분을 몰래 매집 중인 이 종목은?\n\n👉 <a href='https://stock-trend-program.co.kr/stock/{raw_code}'>앱에서 정답 확인하기</a>"
                                        send_telegram_teaser(teaser_msg)
                                    elif is_insider:
                                        teaser_msg = f"🚨 <b>[내부자 거래 포착]</b>\n회사 임원/주요주주가 몰래 매수/매도한 이 종목은?\n\n👉 <a href='https://stock-trend-program.co.kr/stock/{raw_code}'>앱에서 정답 확인하기</a>"
                                        send_telegram_teaser(teaser_msg)
                                    else:
                                        teaser_msg = f"🔔 <b>[세력포착라이브]</b>\n세력이 반응할 초특급 핵심 공시가 뜬 이 종목은?\n\n👉 <a href='https://stock-trend-program.co.kr/stock/{raw_code}'>앱에서 정답 확인하기</a>"
                                        send_telegram_teaser(teaser_msg)
                                except Exception as e:
                                    logger.error(f"[WhaleSiren] Telegram error: {e}")
                                
                            if limit_reached_tokens:
                                send_multicast_notification(
                                    limit_reached_tokens,
                                    title="⚠️ 오늘 무료 프리미엄 알림(3회) 소진",
                                    body="친구 1명만 초대하고 평생 무제한으로 1급 정보를 받아보세요!",
                                    data={"type": "referral_invite", "url": "/referral"},
                                    target_users=limit_users
                                )
                                logger.info(f"[WhaleSiren] FCM Limit-Reached Push sent to {len(limit_reached_tokens)} devices")

                        except Exception as e:
                            logger.error(f"[WhaleSiren] Firestore/FCM error: {e}")

                # ✅ [중복 알림 방지용] 이미 고래 알림(WhaleSiren)을 받은 사용자 UID 목록
                # 아래 관심종목 알림 발송 시 이 사람들은 제외해서 2번 받지 않게 함
                whale_alerted_uids = set(ok_users)
                # 관심종목 등록 여부 확인 (KS / KQ 접미사 모두 시도)
                symbol_candidates = [f"{raw_code}.KS", f"{raw_code}.KQ", raw_code]
                tokens = []
                target_uids = []
                matched_symbol = None

                from db_manager import get_user_ids_and_tokens_by_watchlist_symbol
                for sym in symbol_candidates:
                    user_tokens = get_user_ids_and_tokens_by_watchlist_symbol(sym)
                    if user_tokens:
                        # ✅ [중복 방지] 이미 whale 알림을 받은 사용자는 관심종목 알림에서 제외
                        filtered = [ut for ut in user_tokens if ut["user_id"] not in whale_alerted_uids]
                        if filtered:
                            tokens = [ut["token"] for ut in filtered]
                            target_uids = [ut["user_id"] for ut in filtered]
                            matched_symbol = sym
                            break

                if not tokens:
                    continue  # 관심종목 등록 사용자 없음 -> 스킵

                # 공시 유형별 이모지 결정
                emoji = "📢"
                if any(kw in report_title for kw in ["유상증자", "무상증자"]):
                    emoji = "💰"
                elif any(kw in report_title for kw in ["전환사채", "신주인수권"]):
                    emoji = "🔄"
                elif any(kw in report_title for kw in ["보호예수", "대량보유"]):
                    emoji = "🔒"
                elif any(kw in report_title for kw in ["실적", "영업이익", "분기보고서", "사업보고서"]):
                    emoji = "📊"
                elif any(kw in report_title for kw in ["배당", "주주총회"]):
                    emoji = "💸"
                noti_title = f"{emoji} {corp} 공시 속보"
                safe_report_title = report_title.replace("[", "").replace("]", "").replace("|", "")
                noti_body = f"📋 {safe_report_title}"
                if rcept_dt:
                    try:
                        dt_fmt = f"{rcept_dt[4:6]}월 {rcept_dt[6:8]}일"
                        noti_body += f" 📅 {dt_fmt}"
                    except Exception:
                        pass

                data_payload = {
                    "type": "disclosure_alert",
                    "symbol": matched_symbol or raw_code,
                    "url": f"/discovery?q={raw_code}",
                    "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}",
                }

                logger.info(f"[공시Monitor] {corp} ({matched_symbol}) -> {len(tokens)}명: {report_title}")
                send_multicast_notification(tokens, noti_title, noti_body, data_payload, target_users=target_uids)
                sent_count += 1
                await asyncio.sleep(0.5)

            except Exception as item_e:
                logger.error(f"[공시Monitor] Error processing item {doc_id}: {item_e}")
                # Continue with the next item so one failure doesn't break everything
                continue

        logger.info(f"[공시Monitor] 완료: 신규 {new_count}건, 알림 {sent_count}건 발송")
        # 참고: 각 공시 처리 전에 mark_processed_and_save()로 이미 저장됨
        # 여기서는 혹시 누락된 경우를 위해 최종 한 번 더 저장
        state["processed_ids"] = list(processed_ids.keys())[-2000:]
        save_state(state)

    except Exception as e:
        logger.error(f"[공시Monitor] DART 체크 오류: {e}")


async def check_and_notify_sec_disclosures():
    """
    SEC EDGAR RSS 기반 해외 공시 실시간 체크 (5분마다)
    - 관심 해외종목 -> CIK 변환 -> 신규 SEC Filing 알림
    - SEC 공식 RSS 사용 (무료, 인증 불필요)
    """
    logger.info("[SEC Monitor] SEC 공시 체크 시작...")

    from db_manager import get_all_users, get_watchlist, get_user_fcm_tokens
    from firebase_config import send_multicast_notification
    from sec_api_client import get_cik_by_ticker
    import requests
    import xml.etree.ElementTree as ET
    
    def translate_sec_title(title: str) -> str:
        t = title.lower()
        if "4 - " in t and "beneficial ownership" in t:
            return "내부자 주식 매수/매도 (지분 변동) 📉📈"
        elif "13g" in t:
            return "대주주 지분 신고 (단순 투자) 🐳"
        elif "13d" in t:
            return "대주주 지분 신고 (경영 참여) 🐳"
        elif "10-q" in t and "quarterly" in t:
            return "분기 실적 보고서 📊"
        elif "10-k" in t and "annual" in t:
            return "연간 실적 보고서 📊"
        elif "8-k" in t and "current report" in t:
            return "주요 경영사항 발생 (수시공시) 📢"
        elif "14a" in t:
            return "주주총회 소집 공고 🏢"
        elif "s-8" in t:
            return "임직원 스톡옵션 (주식 보상) 🎁"
        elif "3 - " in t and "initial statement" in t:
            return "신규 내부자 지분 신고 👤"
            
        try:
            from deep_translator import GoogleTranslator
            return GoogleTranslator(source='en', target='ko').translate(title)
        except Exception:
            return title

    try:
        state = load_state()
        sec_processed = set(state.get("sec_processed_ids", []))

        # 모든 사용자의 해외 관심종목 수집 (중복 제거)
        users = get_all_users()
        foreign_watchlist = {}  # { symbol: [user_id, ...] }

        for user in users:
            uid = user.get('user_id') or user.get('id')
            if not uid:
                continue
            wl = get_watchlist(uid)
            for wl_item in wl:
                sym = wl_item[0] if isinstance(wl_item, tuple) else wl_item.get('symbol', '')
                # 해외 종목: 6자리 숫자가 아닌 영문 티커
                clean = sym.split('.')[0]
                if clean and not clean.isdigit():
                    if sym not in foreign_watchlist:
                        foreign_watchlist[sym] = []
                    foreign_watchlist[sym].append(uid)

        if not foreign_watchlist:
            logger.info("[SEC Monitor] 관심 해외종목 없음")
            return

        sent_count = 0
        headers = {"User-Agent": "StockTrendProgram/1.0 (rnfjr@dummy.com)"}

        for symbol, user_ids in foreign_watchlist.items():
            ticker = symbol.split('.')[0].upper()
            cik = get_cik_by_ticker(ticker)
            if not cik:
                continue

            # SEC EDGAR Atom RSS: 해당 CIK 최신 Filing 5건
            rss_url = (
                f"https://www.sec.gov/cgi-bin/browse-edgar"
                f"?action=getcompany&CIK={cik}&type=&dateb=&owner=include"
                f"&count=5&search_text=&output=atom"
            )
            try:
                res = requests.get(rss_url, headers=headers, timeout=8)
                if res.status_code != 200:
                    continue

                root = ET.fromstring(res.content)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                entries = root.findall("atom:entry", ns)

                for entry in entries:
                    try:
                        entry_id = entry.findtext("atom:id", default="", namespaces=ns)
                        if not entry_id or entry_id in sec_processed:
                            continue

                        sec_processed.add(entry_id)
                        # ✅ [핵심 수정] SEC 공시도 즉시 상태 파일에 저장
                        state["sec_processed_ids"] = list(sec_processed)[-2000:]
                        save_state(state)
                        
                        title_el = entry.findtext("atom:title", default="New Filing", namespaces=ns)
                        link_el = entry.find("atom:link", ns)
                        filing_url = link_el.get("href", "") if link_el is not None else ""
                        updated = entry.findtext("atom:updated", default="", namespaces=ns)

                        is_sec_whale = False
                        is_13f = "13F" in title_el
                        is_form4 = "4 - Statement of changes in beneficial ownership of securities" in title_el or "Form 4" in title_el
                        if is_13f or is_form4:
                            is_sec_whale = True

                        # 사용자 FCM 토큰 수집
                        from db_manager import get_user_fcm_tokens, get_all_fcm_tokens_with_user
                        all_tokens = []
                        target_uids = set(user_ids)
                        
                        if is_sec_whale:
                            # 🚨 [글로벌 브로드캐스트] 미국 주식 고래/내부자 발견 시 전체 사용자 발송
                            target_uids = set()
                            for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=True):
                                target_uids.add(uid)
                                all_tokens.append(tok)
                        else:
                            for uid in target_uids:
                                for t in get_user_fcm_tokens(uid):
                                    if t.get("pref_news", True) and t.get("token"):
                                        all_tokens.append(t["token"])

                        if not all_tokens:
                            continue

                        safe_title_el = title_el.replace("[", "").replace("]", "").replace("|", "")
                        kor_title = translate_sec_title(safe_title_el)
                        
                        if is_sec_whale:
                            if is_13f:
                                noti_title = f"🐳 [미국고래 포착] {ticker} 기관 지분보고"
                                noti_body = f"거대 기관의 13F 보유현황이 방금 공개되었습니다!"
                            else:
                                noti_title = f"🐳 [내부자 거래 포착] {ticker}"
                                noti_body = f"회사 핵심 임원의 주식 매수/매도(Form 4) 내역입니다!"
                            logger.info(f"[SEC WhaleSiren] Broadcasted event for {ticker}")
                        else:
                            noti_title = f"📢 {ticker} SEC 공시"
                            noti_body = f"📋 {kor_title}"
                            
                        if updated:
                            try:
                                dt = datetime.fromisoformat(updated[:10])
                                # 7일 이상 지난 과거 공시라면 알림 생략 (처음 관심종목 추가 시 과거 데이터가 한꺼번에 울리는 것 방지)
                                if (datetime.now() - dt).days > 7:
                                    continue
                                noti_body += f" 📅 {dt.strftime('%m월 %d일')}"
                            except Exception:
                                pass

                        data_payload = {
                            "type": "disclosure_alert",
                            "symbol": ticker,
                            "url": f"/discovery?q={ticker}",
                            "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(filing_url)}",
                        }

                        logger.info(f"[SEC Monitor] {ticker} -> {len(all_tokens)}명: {title_el}")
                        send_multicast_notification(all_tokens, noti_title, noti_body, data_payload, target_users=list(target_uids))
                        sent_count += 1
                        await asyncio.sleep(0.5)
                    except Exception as entry_e:
                        logger.error(f"[SEC Monitor] Error processing entry {entry_id} for {ticker}: {entry_e}")
                        continue

                await asyncio.sleep(1)  # SEC rate limit 준수 (초당 10회)

            except Exception as e:
                logger.warning(f"[SEC Monitor] {ticker} RSS 오류: {e}")

        logger.info(f"[SEC Monitor] 완료: {sent_count}건 SEC 공시 알림 발송")

        state["sec_processed_ids"] = list(sec_processed)[-2000:]
        save_state(state)

    except Exception as e:
        logger.error(f"[SEC Monitor] SEC 체크 오류: {e}")


async def hourly_briefing_scheduler_loop():
    """
    매 정각 정기 브리핑 생성 (초경량 실시간 전용 모드)
    """
    global ANALYSIS_LOCK
    ANALYSIS_LOCK = asyncio.Lock()

    logger.info("[Resource-Clean] Hourly Scheduler Active.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_cleanup_date = ""

    # ✅ [재시작 중복방지] 마지막 실행 시각을 파일(state)에서 복원하여
    # 서버 재시작 후에도 같은 시간에 브리핑이 중복 생성되지 않도록 함
    _state = load_state()
    last_run_hour = _state.get("last_briefing_hour", -1)
    last_run_date = _state.get("last_briefing_date", "")

    while True:
        try:
            update_heartbeat("Hourly_Briefing")
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

            is_weekend = is_holiday("kor")

            # 비용 절감을 위해 매시간이 아닌 핵심 시간대(장 시작, 점심, 장 마감)에만 실행
            target_hours = [9, 12, 16]
            is_target_hour = current_hour in target_hours
            already_ran = (last_run_hour == current_hour and last_run_date == current_date)

            if not is_weekend and is_target_hour and not already_ran:
                logger.info(f"[Scheduler] Starting market briefing for: {current_hour}:00")
                from utils.global_briefing import generate_market_wide_briefing

                async with ANALYSIS_LOCK:
                    await asyncio.wait_for(
                        generate_market_wide_briefing(),
                        timeout=180.0
                    )
                last_run_hour = current_hour
                last_run_date = current_date
                # ✅ 실행 직후 상태 파일에 저장 (재시작 시 중복 방지)
                _state = load_state()
                _state["last_briefing_hour"] = last_run_hour
                _state["last_briefing_date"] = last_run_date
                save_state(_state)
                logger.info(f"[Scheduler] Task completed for {current_hour}:00")

            if current_hour == 2 and current_date != last_cleanup_date:
                from utils.briefing_store import cleanup_old_briefings
                cleanup_old_briefings()
                last_cleanup_date = current_date

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[Scheduler] Loop error: {e}")
            await asyncio.sleep(60)


async def check_and_notify_ipos():
    """Periodic task to check for new IPOs and notify ALL users."""
    logger.info("Running IPO Check...")

    from dart_ipo import fetch_dart_ipo_schedule
    from db_manager import get_fcm_tokens_for_ipo
    from firebase_config import send_multicast_notification

    IPO_STATE_FILE = "/tmp/ipo_state.json" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "ipo_state.json")

    processed_ipos = []
    ipo_states = {}
    if os.path.exists(IPO_STATE_FILE):
        try:
            with open(IPO_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                processed_ipos = data.get("processed_ipos", [])
                ipo_states = data.get("ipo_states", {})
                
                # Migration: if ipo_states is empty, populate from processed_ipos
                if not ipo_states and processed_ipos:
                    for name in processed_ipos:
                        ipo_states[name] = {"status": "INITIAL", "band": "미정", "date": "미정"}
        except Exception:
            pass

    try:
        ipos = await asyncio.to_thread(fetch_dart_ipo_schedule)

        new_ipos = []
        confirmed_ipos = []
        
        for ipo in ipos:
            ipo_name = ipo.get('name')
            band = ipo.get('band', '')
            schedule = ipo.get('date', '')
            
            if not ipo_name: continue
            
            is_confirmed = "미정" not in band and "미정" not in schedule and band != "" and schedule != ""
            
            if ipo_name not in ipo_states:
                # Completely new IPO
                new_ipos.append(ipo)
                ipo_states[ipo_name] = {
                    "status": "CONFIRMED" if is_confirmed else "INITIAL",
                    "band": band,
                    "date": schedule
                }
            else:
                # Already known IPO. Check if it transitioned from INITIAL to CONFIRMED
                state = ipo_states[ipo_name]
                if state.get("status") == "INITIAL" and is_confirmed:
                    # It got confirmed!
                    confirmed_ipos.append(ipo)
                    ipo_states[ipo_name] = {
                        "status": "CONFIRMED",
                        "band": band,
                        "date": schedule
                    }

        if new_ipos or confirmed_ipos:
            logger.info(f"Found {len(new_ipos)} new IPO(s) and {len(confirmed_ipos)} confirmed IPO(s). Sending notifications.")
            tokens = get_fcm_tokens_for_ipo()
            if tokens:
                # 1. Send New IPO alerts
                for ipo in new_ipos:
                    name = ipo.get('name')
                    band = ipo.get('band', '')
                    schedule = ipo.get('date', '')
                    underwriter = ipo.get('detail', '')

                    noti_title = f"🚀 {name} 신규 공모주 청약"
                    noti_body = f"💰 희망가 {band}원 📅 청약일 {schedule} 🏢 주관사 {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/signals?tab=ipo"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    
                    try:
                        from telegram_service import send_telegram_teaser
                        teaser_msg = f"🚀 <b>OOO 신규 공모주 청약 포착!</b>\n과연 대박이 날까? 희망가 및 주관사 정보 확인하기\n\n👉 <a href='https://stock-trend-program.co.kr/signals?tab=ipo'>앱에서 정답 확인하기</a>"
                        send_telegram_teaser(teaser_msg)
                    except Exception as e:
                        logger.error(f"Telegram IPO alert error: {e}")

                    await asyncio.sleep(0.5)
                    
                # 2. Send Confirmed IPO alerts
                for ipo in confirmed_ipos:
                    name = ipo.get('name')
                    band = ipo.get('band', '')
                    schedule = ipo.get('date', '')
                    underwriter = ipo.get('detail', '')

                    noti_title = f"✅ {name} 공모 일정 확정!"
                    noti_body = f"💰 확정/희망가: {band}원 📅 청약일: {schedule} 🏢 주관사 {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/signals?tab=ipo"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    
                    try:
                        from telegram_service import send_telegram_teaser
                        teaser_msg = f"✅ <b>OOO 공모주 청약 일정 최종 확정!</b>\n상장일과 확정 공모가는 얼마일까?\n\n👉 <a href='https://stock-trend-program.co.kr/signals?tab=ipo'>앱에서 정답 확인하기</a>"
                        send_telegram_teaser(teaser_msg)
                    except Exception as e:
                        logger.error(f"Telegram IPO confirm alert error: {e}")
                    await asyncio.sleep(0.5)

            # Limit state size to 1000 items (keep most recent)
            if len(ipo_states) > 1000:
                keys_to_keep = list(ipo_states.keys())[-1000:]
                ipo_states = {k: ipo_states[k] for k in keys_to_keep}
                
            with open(IPO_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"ipo_states": ipo_states}, f, ensure_ascii=False)
        else:
            logger.info("No new or confirmed IPOs found.")

    except Exception as e:
        logger.error(f"Scheduler Error in IPO Check: {e}")


async def disclosure_scheduler_loop():
    """
    공시 실시간 감시 루프
    - DART 국내 공시: 5분마다 체크
    - SEC 해외 공시: 5분마다 체크 (DART와 동시)
    - IPO 공모주: 30분마다 체크
    """
    logger.info("[공시Monitor] 공시 실시간 감시 루프 시작 (5분 주기)")

    # ✅ [크래시 루프 방지] 서버 시작 직후 5분간 공시 체크를 하지 않음
    # systemd가 5~10초 단위로 재시작할 때 Gemini API를 호출하지 않도록 방어
    logger.info("[공시Monitor] 서버 안정화를 위해 5분 대기 후 첫 공시 체크 시작...")
    await asyncio.sleep(300)

    ipo_check_counter = 0  # 5분 * 6 = 30분마다 IPO 체크

    while True:
        try:
            update_heartbeat("Disclosure_Monitor")
            await asyncio.sleep(300)  # 5분 간격

            # 국내 DART 공시 체크
            await check_and_notify_disclosures()

            # 해외 SEC 공시 체크
            await check_and_notify_sec_disclosures()

            # IPO는 30분마다 (5분 * 6 = 30분)
            ipo_check_counter += 1
            if ipo_check_counter >= 6:
                await check_and_notify_ipos()
                ipo_check_counter = 0

        except asyncio.CancelledError:
            logger.info("[공시Monitor] 공시 감시 루프 종료")
            break
        except Exception as e:
            logger.error(f"[공시Monitor] 루프 오류: {e}")
            await asyncio.sleep(60)


async def auto_blog_scheduler_loop():
    """
    매일 지정된 시간에 블로그 포스팅 봇을 자동 호출
    - KOR (국내장): 16:00
    - US (미국장): 07:00
    """
    logger.info("[AutoBlog] Auto Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    import json
    state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auto_blog_state.json")
    
    def load_state():
        if os.path.exists(state_file):
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                pass
        return {"last_run_date_kor": "", "last_run_date_us": ""}
        
    def save_state(state):
        try:
            with open(state_file, "w", encoding="utf-8") as f:
                json.dump(state, f)
        except:
            pass

    state = load_state()
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auto_blog_bot.py")

    while True:
        try:
            update_heartbeat("Auto_Blog_Bot")
            now = datetime.now(kst)
            current_date = now.strftime("%Y-%m-%d")
            
            # 오후 16시 정각 (한국장 마감 포스팅 & 장마감 텔레그램 브리핑)
            if now.hour == 16 and state.get("last_run_date_kor") != current_date:
                if not is_holiday("kor"):
                    logger.info("[AutoBlog] Triggering KOR market blog post & Telegram Closing Summary...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "kor"])
                    try:
                        from social_bot import generate_closing_summary, send_telegram_message
                        send_telegram_message(generate_closing_summary())
                    except Exception as e:
                        logger.error(f"[Telegram] Failed to send closing summary: {e}")
                state["last_run_date_kor"] = current_date
                save_state(state)
            
            # 오전 08시 정각 (미국장 마감/한국장 시작전 포스팅 & 아침 텔레그램 브리핑)
            if now.hour == 8 and state.get("last_run_date_us") != current_date:
                if not is_holiday("us"):
                    logger.info("[AutoBlog] Triggering US market blog post & Telegram Morning Briefing...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "us"])
                    try:
                        from social_bot import generate_morning_briefing, send_telegram_message
                        send_telegram_message(generate_morning_briefing())
                    except Exception as e:
                        logger.error(f"[Telegram] Failed to send morning briefing: {e}")
                state["last_run_date_us"] = current_date
                save_state(state)

            await asyncio.sleep(60) # 1분 대기
        except Exception as e:
            logger.error(f"[AutoBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def seo_blog_scheduler_loop():
    """
    SEO 최적화 자동 포스팅 봇 스케줄러 (하루 N회 실행)
    - 매일 오전 10시, 오후 2시 등에 트래픽 확보를 위해 실행
    """
    logger.info("[SEOBlog] SEO Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo_blog_bot.py")

    while True:
        try:
            update_heartbeat("SEO_Blog_Bot")
            now = datetime.now(kst)
            
            # 비용 절감을 위해 하루 3번(아침, 점심, 저녁) 실행하도록 변경
            target_hours = [9, 13, 18]
            if now.hour in target_hours and last_run_hour != now.hour:
                logger.info(f"[SEOBlog] Triggering SEO blog post for hour {now.hour}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_hour = now.hour

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[SEOBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def watchdog_scheduler_loop():
    """10분 주기로 시스템 워치독 실행"""
    logger.info("[Watchdog] System Watchdog Active. Checking every 10 mins.")
    import system_watchdog
    while True:
        try:
            await asyncio.to_thread(system_watchdog.run_health_checks)
            await asyncio.sleep(600) # 10분 대기
        except Exception as e:
            logger.error(f"[Watchdog] Loop error: {e}")
            await asyncio.sleep(60)

async def cleanup_alerts_scheduler_loop():
    """3일 지난 알림 데이터를 주기적으로 삭제 (6시간 주기)"""
    logger.info("[CleanupAlerts] Cleanup Alerts Loop Active. Checking every 6 hours.")
    from scheduler_service import delete_old_alerts
    while True:
        try:
            await asyncio.to_thread(delete_old_alerts)
            await asyncio.sleep(21600) # 6시간 대기
        except Exception as e:
            logger.error(f"[CleanupAlerts] Loop error: {e}")
            await asyncio.sleep(60)

async def cleanup_system_logs_scheduler_loop():
    """3일 지난 시스템 로그(알림 모니터링)를 주기적으로 삭제 (6시간 주기)"""
    logger.info("[CleanupSystemLogs] System Logs Cleanup Loop Active. Checking every 6 hours.")
    while True:
        try:
            from db_manager import cleanup_old_system_logs
            deleted = await asyncio.to_thread(cleanup_old_system_logs, 3)
            if deleted > 0:
                logger.info(f"[CleanupSystemLogs] Deleted {deleted} old system log records.")
            await asyncio.sleep(21600) # 6시간 대기
        except Exception as e:
            logger.error(f"[CleanupSystemLogs] Loop error: {e}")
            await asyncio.sleep(60)

async def google_indexer_scheduler_loop():
    """매일 새벽 2시에 구글 인덱서 실행"""
    logger.info("[GoogleIndexer] Google Indexer Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "google_indexer.py")
    last_run_day = -1
    
    while True:
        try:
            now = datetime.now()
            # 매일 새벽 2시에 한 번 실행
            if now.hour == 2 and last_run_day != now.day:
                logger.info(f"[GoogleIndexer] Triggering Google Indexing for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크 (자주 돌 필요 없음)
        except Exception as e:
            logger.error(f"[GoogleIndexer] Loop error: {e}")
            await asyncio.sleep(60)

async def dividend_alerts_scheduler_loop():
    """매일 저녁 18:00 KST에 배당락일 D-1 푸시 알림 실행"""
    logger.info("[DividendAlerts] Dividend Alerts Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dividend_alerts.py")
    last_run_day = -1
    
    # 시간대 처리
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 매일 오후 18시에 1번 실행 (18:00 ~ 18:59 사이 최초 도달 시)
            if now.hour == 18 and last_run_day != now.day:
                logger.info(f"[DividendAlerts] Triggering Dividend Alerts for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[DividendAlerts] Loop error: {e}")
            await asyncio.sleep(60)

async def weekly_blog_bot_scheduler_loop():
    """매주 토요일 오전 9시 KST에 주간 증시 결산 블로그 포스팅 실행"""
    logger.info("[WeeklyBlog] Weekly Blog Bot Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weekly_blog_bot.py")
    last_run_week = -1
    
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 5: 토요일 (weekday()는 월요일이 0, 토요일이 5)
            # 오전 9시에 1번 실행 (09:00 ~ 09:59 사이)
            current_week = now.isocalendar()[1]
            if now.weekday() == 5 and now.hour == 9 and last_run_week != current_week:
                logger.info(f"[WeeklyBlog] Triggering Weekly Blog Posting for week {current_week}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_week = current_week
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[WeeklyBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def weekend_report_scheduler_loop():
    """매주 토요일 오전 9시 30분 주말 리포트 생성, 10시에 푸시 알림"""
    logger.info("[WeekendReport] Weekend Report Scheduler Active.")
    last_run_week_gen = -1
    last_run_week_push = -1
    
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            current_week = now.isocalendar()[1]
            
            # 1. 리포트 생성 (토요일 오전 9시 30분 ~ 9시 59분 사이 1회)
            if now.weekday() == 5 and now.hour == 9 and now.minute >= 30 and last_run_week_gen != current_week:
                logger.info(f"[WeekendReport] Generating report for week {current_week}...")
                from utils.weekend_report import generate_weekend_report
                await generate_weekend_report()
                last_run_week_gen = current_week
                
            # 2. 푸시 발송 (토요일 오전 10시 00분 ~ 10시 29분 사이 1회)
            if now.weekday() == 5 and now.hour == 10 and now.minute < 30 and last_run_week_push != current_week:
                logger.info(f"[WeekendReport] Sending push notifications for week {current_week}...")
                from firebase_config import send_multicast_notification
                from db_manager import get_all_fcm_tokens_with_user
                
                all_tokens = [t[1] for t in get_all_fcm_tokens_with_user()]
                if all_tokens:
                    push_title = "🚨 [주말 한정] 마켓 인사이트 발행 완료"
                    push_body = "지난주 시장 자금 흐름과 다음 주 핵심 일정을 지금 바로 확인하세요! (일요일 자정 삭제)"
                    push_data = {
                        "type": "weekend_report",
                        "url": "/weekend-report"
                    }
                    send_multicast_notification(all_tokens, push_title, push_body, data=push_data)
                    logger.info(f"[WeekendReport] Push sent to {len(all_tokens)} devices.")
                
                last_run_week_push = current_week
                
            await asyncio.sleep(60 * 15) # 15분 주기로 체크
        except Exception as e:
            logger.error(f"[WeekendReport] Loop error: {e}")
            await asyncio.sleep(60)

async def fomo_alert_scheduler_loop():
    """매일 저녁 8시(20시) FOMO 알림 발송"""
    logger.info("[FOMO] FOMO Alert Scheduler Active.")
    last_run_date = ""
    
    import pytz
    from datetime import datetime
    import asyncio
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            date_str = now.strftime("%Y-%m-%d")
            
            if now.hour == 20 and now.minute >= 0 and last_run_date != date_str:
                logger.info(f"[FOMO] Sending FOMO alert for {date_str}...")
                from scheduler_service import send_fomo_alert
                send_fomo_alert()
                last_run_date = date_str
                
            await asyncio.sleep(60 * 15) # 15분 마다 체크
        except Exception as e:
            logger.error(f"[FOMO] Loop error: {e}")
            await asyncio.sleep(60)

async def dormant_user_scheduler_loop():
    """매일 저녁 6시(18시) 휴면 유저 깨우기 알림 발송"""
    logger.info("[Dormant] Dormant User Alert Scheduler Active.")
    last_run_date = ""
    
    import pytz
    from datetime import datetime
    import asyncio
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            date_str = now.strftime("%Y-%m-%d")
            
            if now.hour == 18 and now.minute >= 0 and last_run_date != date_str:
                logger.info(f"[Dormant] Sending Dormant User alert for {date_str}...")
                from scheduler_service import send_dormant_user_alert
                send_dormant_user_alert()
                last_run_date = date_str
                
            await asyncio.sleep(60 * 15) # 15분 마다 체크
        except Exception as e:
            logger.error(f"[Dormant] Loop error: {e}")
            await asyncio.sleep(60)


async def whale_alert_scheduler_loop():
    """
    🇰🇷 국내 고래 알림 #1 - 외국인 순매수 1위
    장중(09:00~15:30 KST 평일) 30분마다 실행
    """
    logger.info("[Whale KR] Foreign Net Buying Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            hour = now.hour
            minute = now.minute

            is_market_hours = (weekday < 5) and (
                (hour == 9 and minute >= 0) or
                (10 <= hour <= 14) or
                (hour == 15 and minute <= 30)
            )

            if is_market_hours:
                logger.info("[Whale KR] Checking foreign net buying rank & upper limits...")
                try:
                    from whale_alerts import check_whale_alerts
                    check_whale_alerts()
                except Exception as e:
                    logger.error(f"[Whale KR] check_alerts error: {e}")
            else:
                logger.debug(f"[Whale KR] Outside market hours ({hour}:{minute:02d} KST), skipping.")

            await asyncio.sleep(60 * 30)  # 30분마다 체크
        except Exception as e:
            logger.error(f"[Whale KR] Loop error: {e}")
            await asyncio.sleep(60)


async def dart_whale_scheduler_loop():
    """
    🇰🇷 국내 고래 알림 #2 - DART 대량보유/임원내부자 거래
    평일 08:00~18:00 KST (공시 접수 시간) 5분마다 실행
    """
    logger.info("[Whale DART] DART Large Holding & Insider Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            hour = now.hour

            # 평일 08:00~18:00 (DART 공시 접수 시간)
            is_disclosure_hours = (weekday < 5) and (8 <= hour < 18)

            if is_disclosure_hours:
                logger.info("[Whale DART] Checking DART large holding & insider trading...")
                try:
                    from whale_alerts import check_large_holding_alerts, check_insider_trading_alerts
                    check_large_holding_alerts()
                    check_insider_trading_alerts()
                except Exception as e:
                    logger.error(f"[Whale DART] error: {e}")
            else:
                logger.debug(f"[Whale DART] Outside disclosure hours ({hour}:xx KST), skipping.")

            await asyncio.sleep(60 * 5)  # 5분마다 체크
        except Exception as e:
            logger.error(f"[Whale DART] Loop error: {e}")
            await asyncio.sleep(60)


async def sec_whale_scheduler_loop():
    """
    🇺🇸 미국 고래 알림 - SEC Form 4 (임원 내부자) + 13F (기관)
    KST 22:30~06:00 (미국 장시간) 5분마다 실행
    """
    logger.info("[Whale SEC] SEC Form4 & 13F Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            hour = now.hour

            # KST 22:30~익일 06:00 = 미국 장중 (EST 08:30~16:00)
            is_us_hours = (hour >= 22) or (hour < 6)

            if is_us_hours:
                logger.info("[Whale SEC] Checking SEC Form4 & 13F filings...")
                try:
                    from sec_whale_alerts import check_sec_form4_alerts, check_sec_13f_alerts
                    check_sec_form4_alerts()
                    check_sec_13f_alerts()
                except Exception as e:
                    logger.error(f"[Whale SEC] error: {e}")
            else:
                logger.debug(f"[Whale SEC] Outside US market hours ({hour}:xx KST), skipping.")

            await asyncio.sleep(60 * 5)  # 5분마다 체크
        except Exception as e:
            logger.error(f"[Whale SEC] Loop error: {e}")
            await asyncio.sleep(60)


async def premium_report_scheduler_loop():
    """
    VIP 프리미엄 리포트(수급 통계) 자동 생성 스케줄러
    평일 15:45 KST (장 마감 직후) 1회 실행
    """
    import pytz
    import json
    import os
    from datetime import datetime
    
    kst = pytz.timezone('Asia/Seoul')
    logger.info("[Premium Report] Scheduler Active. Runs after 15:45 KST.")
    
    state_file = os.path.join(os.path.dirname(__file__), "premium_report_state.json")
    
    def load_state():
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {}
        
    def save_state(state):
        try:
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f)
        except:
            pass

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            current_date = now.strftime("%Y-%m-%d")
            
            # 평일 15:45 이후 실행
            if weekday < 5 and (now.hour > 15 or (now.hour == 15 and now.minute >= 45)):
                state = load_state()
                last_run = state.get("last_run_date", "")
                
                if last_run != current_date:
                    logger.info("[Premium Report] Generating today's objective report...")
                    try:
                        from daily_premium_generator import generate_objective_report
                        generate_objective_report()
                        
                        state["last_run_date"] = current_date
                        save_state(state)
                    except Exception as e:
                        logger.error(f"[Premium Report] Generation error: {e}")
            
            # 1분 단위 체크
            await asyncio.sleep(60)
                
        except Exception as e:
            logger.error(f"[Premium Report] Loop error: {e}")
            await asyncio.sleep(60)
