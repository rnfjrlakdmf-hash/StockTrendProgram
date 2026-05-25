import time
import threading
from datetime import datetime
import pytz
from db_manager import get_db_connection, get_watchlist, get_user_fcm_tokens
from stock_data import get_simple_quote, get_korean_stock_name
from firebase_config import send_multicast_notification, initialize_firebase

def is_korean_stock(symbol: str) -> bool:
    """숫자 6자리의 한국 주식 코드(접미사 .KS/.KQ 포함) 판별"""
    clean_sym = symbol.split('.')[0] if '.' in symbol else symbol
    return clean_sym.isdigit() and len(clean_sym) == 6

def is_market_holiday(market: str) -> bool:
    """국가별 주요 시장 휴장일 여부 확인 (2024-2025 주요 공휴일)"""
    if market == "KR":
        now = datetime.now(pytz.timezone('Asia/Seoul'))
        date_str = now.strftime('%m-%d')
        # 한국 주요 휴장일 (2024-2025 고정/추정)
        kr_holidays = [
            '01-01', '03-01', '04-10', '05-01', '05-05', '05-06', '06-06', 
            '08-15', '10-03', '10-09', '12-25'
        ]
        return date_str in kr_holidays
    else:
        # 미국 동부 시간 기준 날짜로 판별 (한국 토요일 새벽=미국 금요일 오후 대응)
        now = datetime.now(pytz.timezone('America/New_York'))
        date_str = now.strftime('%m-%d')
        # 미국 주요 휴장일
        us_holidays = [
            '01-01', '01-15', '02-19', '03-29', '05-27', '06-19', 
            '07-04', '09-02', '11-28', '12-25'
        ]
        return date_str in us_holidays
    return False

def calculate_watchlist_performance(user_id: str, market: str):
    """사용자의 관심종목 시장별 오늘의 수익 현황 및 누적 수익 합계 계산"""
    watchlist = get_watchlist(user_id)
    if not watchlist: return None
    
    items_perf = []
    total_daily_change = 0
    total_profit_amt = 0 # 누적 수익금 합계
    count = 0
    
    for row in watchlist:
        sym = row[0]
        added_price = float(row[1] or 0)
        
        # Throttling: 봇 차단 회피를 위한 0.2초 지연
        time.sleep(0.2)
        
        is_kr = is_korean_stock(sym)
        if (market == "KR" and not is_kr) or (market == "US" and is_kr):
            continue
            
        quote = get_simple_quote(sym)
        if not quote:
            # Fallback: API 차단 시 백엔드 내부의 주가 메모리 캐시(STOCK_DATA_CACHE) 활용
            from stock_data import STOCK_DATA_CACHE
            cached_data = None
            cache_keys = [sym, f"v3_{sym}"]
            for key in cache_keys:
                if key in STOCK_DATA_CACHE:
                    cached_data = STOCK_DATA_CACHE[key][0]
                    break
            
            if cached_data:
                print(f"[Scheduler-Fallback] yfinance/Naver failed for {sym}. Using memory cache.")
                quote = {
                    "price": cached_data.get("price", "확인불가"),
                    "change": cached_data.get("change", "0.00%"),
                    "change_percent": cached_data.get("change_percent", "0.00%"),
                    "name": cached_data.get("name", sym)
                }
            else:
                # 최후의 수단: 데이터베이스(added_price) 정보 대입
                print(f"[Scheduler-Fallback] No memory cache for {sym}. Using fallback values.")
                quote = {
                    "price": added_price if added_price > 0 else "확인불가",
                    "change": "0.00%",
                    "name": sym
                }
        
        try:
            curr_p = float(str(quote.get('price', 0)).replace(',', ''))
            change_p = float(str(quote.get('change', '0')).replace('%', '').replace('+', ''))
            
            item = {
                "symbol": sym,
                "name": get_korean_stock_name(sym) or quote.get('name', sym),
                "current_price": curr_p,
                "daily_change": change_p,
                "added_price": added_price
            }
            
            # 등록 시점 대비 수익 계산 (1주 기준)
            if added_price and added_price > 0:
                diff = curr_p - added_price
                perf_pct = (diff / added_price) * 100
                item["price_diff"] = diff
                item["added_perf"] = perf_pct
                total_profit_amt += diff # 누적 수익금 합산
                
            items_perf.append(item)
            total_daily_change += change_p
            count += 1
        except: continue
        
    if count == 0: return None
    
    return {
        "avg_daily_change": total_daily_change / count,
        "total_profit_amt": total_profit_amt,
        "items": items_perf,
        "count": count
    }

def send_opening_notification(market: str):
    """시장 시작 시가 알림 발송"""
    initialize_firebase()
    print(f"[Scheduler] Sending {market} market opening prices...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT user_id FROM watchlist")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        watchlist = get_watchlist(user_id)
        if not watchlist: continue
        
        items_info = []
        target_symbols = []
        for row in watchlist:
            symbol = row[0]
            if is_korean_stock(symbol) and market == "US": continue
            if not is_korean_stock(symbol) and market == "KR": continue
            
            target_symbols.append(symbol)
            quote = get_simple_quote(symbol)
            if quote:
                price = quote.get('price', 0)
                name = get_korean_stock_name(symbol) or symbol
                items_info.append(f"• {name}: {price}")
        
        if not items_info: continue
        
        # [실적/배당 일정 탐지 통합]
        event_lines = []
        if target_symbols:
            try:
                from routes.market import get_watchlist_events
                symbols_str = ",".join(target_symbols)
                res = get_watchlist_events(symbols_str)
                if res.get("status") == "success":
                    all_events = res.get("data", [])
                    import datetime
                    import pytz
                    kst = pytz.timezone('Asia/Seoul')
                    today_str = datetime.datetime.now(kst).strftime("%Y-%m-%d")
                    
                    for ev in all_events:
                        if ev.get("date") == today_str:
                            event_emoji = "📈" if ev.get("type") == "earnings" else "💰" if ev.get("type") == "dividend" else "🔔"
                            detail = ev.get("detail", "")
                            # Clean up detail string slightly for compact notification display
                            detail = detail.replace(" (DART 확정✅)", "").replace(" (DART)", "").replace(" (yfinance)", "")
                            event_lines.append(f"💡 {event_emoji} {ev.get('name')}: {detail}")
            except Exception as e:
                print(f"[Scheduler-Error] Failed to fetch events for opening notification: {e}")
        
        market_name = "국내" if market == "KR" else "미국"
        title = f"☀️ {market_name} 장시작! 시가 알림"
        body = f"오늘 {market_name} 관심종목 시가입니다.\n\n" + "\n".join(items_info[:10])
        if len(items_info) > 10:
            body += f"\n외 {len(items_info)-10}개 더 있음"
            
        if event_lines:
            body += "\n\n📅 오늘의 주요 일정:\n" + "\n".join(event_lines[:5])
            if len(event_lines) > 5:
                body += f"\n외 {len(event_lines)-5}개 일정 더 있음"
            
        tokens_data = get_user_fcm_tokens(user_id)
        if tokens_data:
            tokens = [t['token'] for t in tokens_data if t.get('pref_closing', True)]
            if tokens:
                send_multicast_notification(tokens, title, body, {"url": "/watchlist"})

def send_closing_notification(market: str):
    """시장 마감 리포트 발송 로직 (기본 지수 + 맞춤형 지수 하이브리드)"""
    initialize_firebase()
    print(f"[Scheduler] Generating hybrid {market} market closing report...")
    
    # 공통 기본 지표 캐싱
    kr_indices = {}
    try:
        from korea_data import get_korean_market_indices
        kr_indices = get_korean_market_indices() or {}
    except Exception as e:
        print(f"[Scheduler-Error] Failed to get KR market indices: {e}")
    
    # 안전 지표 조회 헬퍼 (차단 대비)
    def get_safe_quote(sym: str, default_price="확인불가", default_change="0.00%"):
        try:
            # 봇 필터 회피 지연
            time.sleep(0.1)
            quote = get_simple_quote(sym)
            if quote and quote.get("price") and quote["price"] != "확인불가":
                return quote
        except Exception as e:
            print(f"[Scheduler-SafeQuote] Error fetching {sym}: {e}")
        
        # Fallback: 백엔드 캐시 조회 시도
        try:
            from stock_data import STOCK_DATA_CACHE
            cached_key = f"v3_{sym}" if not sym.startswith("^") else sym
            if cached_key in STOCK_DATA_CACHE:
                cached_data = STOCK_DATA_CACHE[cached_key][0]
                return {
                    "price": cached_data.get("price", default_price),
                    "change": cached_data.get("change", default_change),
                    "change_percent": cached_data.get("change_percent", default_change)
                }
        except:
            pass
            
        return {"price": default_price, "change": default_change, "percent": default_change}

    common = {
        "KOSPI": {"change": kr_indices.get("kospi", {}).get("percent", "0.00%") if isinstance(kr_indices, dict) else "0.00%"},
        "KOSDAQ": {"change": kr_indices.get("kosdaq", {}).get("percent", "0.00%") if isinstance(kr_indices, dict) else "0.00%"},
        "DOW": get_safe_quote("^DJI"),
        "NASDAQ": get_safe_quote("^IXIC"),
        "SP500": get_safe_quote("^GSPC"),
        "SOX": get_safe_quote("^SOX"),
        "TNX": get_safe_quote("^TNX", default_price="4.50"),
        "OIL": get_safe_quote("CL=F"),
        "FX": get_safe_quote("USDKRW=X", default_price="1,350"),
        "TSLA": get_safe_quote("TSLA")
    }

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT user_id FROM watchlist")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        try:
            perf = calculate_watchlist_performance(user_id, market)
            if not perf: continue
            
            symbols = [item['symbol'] for item in perf["items"]]
            
            # 1. 기본 지수 구성 (KR: 코스피/코스닥/환율, US: 다우/나스닥/S&P)
            if market == "KR":
                base_str = f"📊 코스피: {common['KOSPI'].get('change')} | 코스닥: {common['KOSDAQ'].get('change')}\n" \
                           f"💵 환율: {common['FX'].get('price')}원"
            else:
                base_str = f"🇺🇸 나스닥: {common['NASDAQ'].get('change')} | S&P500: {common['SP500'].get('change')}"

            # 2. 맞춤형 및 필수 원자재 추가 (유가는 기본 포함)
            extra_list = [f"🛢️ 유가: {common['OIL'].get('change')}"]
            
            if any(s in ['005930', '000660', 'NVDA', 'AMD', 'TSM'] for s in symbols):
                extra_list.append(f"💻 반도체: {common['SOX'].get('change')}")
            if any(s in ['247540', '086520', '373220', 'TSLA'] for s in symbols):
                extra_list.append(f"🔋 테슬라: {common['TSLA'].get('change')}")
            if any(s in ['AAPL', 'MSFT', 'AMZN', 'GOOGL'] for s in symbols) or market == "US":
                extra_list.append(f"📈 금리: {common['TNX'].get('price')}")

            market_summary = base_str + "\n" + " | ".join(extra_list[:2]) + "\n\n"
            
            avg_change = perf["avg_daily_change"]
            total_profit = perf.get("total_profit_amt", 0)
            unit = "원" if market == "KR" else "$"
            market_name = "국내" if market == "KR" else "미국"
            emoji = "📈" if avg_change > 0 else "📉" if avg_change < 0 else "➖"
            title = f"🌕 {market_name} 장마감 리포트 {emoji}"
            
            # 수익금 문자열 생성 (미국장은 원화 환산 추가)
            if total_profit != 0:
                if market == "US":
                    try:
                        fx_rate = float(str(common['FX'].get('price', '1350')).replace(',', ''))
                    except ValueError:
                        fx_rate = 1350.0
                    profit_krw = total_profit * fx_rate
                    # 원화는 만원 단위로 가독성 있게 표시 (10,000원 이상일 때)
                    if abs(profit_krw) >= 10000:
                        profit_str = f"💰 총 누적 수익: {total_profit:+,.2f}{unit} (약 {profit_krw/10000:+,.1f}만원)\n"
                    else:
                        profit_str = f"💰 총 누적 수익: {total_profit:+,.2f}{unit} ({profit_krw:+,.0f}원)\n"
                else:
                    profit_str = f"💰 총 누적 수익: {total_profit:+,.0f}{unit}\n"
            else:
                profit_str = ""

            # 상세 리스트
            price_list = []
            for item in perf["items"][:8]:
                change_emoji = "▲" if item['daily_change'] > 0 else "▼" if item['daily_change'] < 0 else "-"
                line = f"• {item['name']}: {item['current_price']} ({change_emoji}{abs(item['daily_change']):.1f}%)"
                if item.get('price_diff') is not None:
                    diff = item['price_diff']
                    line += f" [{diff:+,.0f}]"
                price_list.append(line)
                
            body = market_summary + f"평균 수익률: {avg_change:+.2f}%\n" + profit_str + "\n".join(price_list)
            
            tokens_data = get_user_fcm_tokens(user_id)
            if tokens_data:
                tokens = [t['token'] for t in tokens_data if t.get('pref_closing', True)]
                if tokens:
                    send_multicast_notification(tokens, title, body, {"url": "/watchlist"})
        except Exception as user_err:
            print(f"[Scheduler-Error] Failed to send closing notification for user {user_id}: {user_err}")
            continue

def send_daily_analytics_report():
    """매일 밤 11시 59분 59초에 관리자(rnfjr@gmail.com, rnfjrlakdmf@gmail.com)들에게 일일 방문자 및 시스템 보고서 푸시 알림 발송"""
    initialize_firebase()
    print("[Scheduler] Generating daily analytics report for Admins...")
    
    from db_manager import get_site_analytics, get_realtime_active_count, get_db_connection
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime("%Y-%m-%d")
    
    # 1. 일일 및 30일 누적 통계 조회
    stats_list = get_site_analytics(30)
    unique_visitors = 0
    pageviews = 0
    if stats_list:
        latest = stats_list[0]
        if latest["date"] == today_str:
            unique_visitors = latest["unique_visitors"]
            pageviews = latest["pageviews"]
            
    # 30일 누적 통계 구하기
    total_pv_30d = sum(item["pageviews"] for item in stats_list) if stats_list else 0
    total_uv_30d = sum(item["unique_visitors"] for item in stats_list) if stats_list else 0
            
    # 2. 실시간 동시 접속자 수 (최근 5분)
    active_users = get_realtime_active_count(minutes=5)
    
    # 3. 누적 가입 회원수 조회
    conn = get_db_connection()
    cursor = conn.cursor()
    total_users = 0
    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
    except Exception as e:
        print(f"[Scheduler-Error] Failed to fetch user count: {e}")
    finally:
        conn.close()
        
    # 4. 푸시 알림 제목 및 본문 구성
    title = "📊 [STOCK AI] 일일 방문자 및 시스템 운영 보고서"
    body = f"📅 날짜: {today_str}\n\n" \
           f"👥 오늘 순 방문자수 (1일): {unique_visitors:,}명\n" \
           f"📑 오늘 총 페이지뷰 (1일): {pageviews:,}회\n" \
           f"📈 30일 누적 페이지뷰: {total_pv_30d:,}회\n" \
           f"👥 30일 누적 순방문자: {total_uv_30d:,}명\n" \
           f"🔥 현재 접속자 (5분): {active_users:,}명\n" \
           f"👑 누적 가입 회원수: {total_users:,}명\n\n" \
           f"오늘 하루도 시스템이 성공적으로 정상 운영되었습니다. 내일도 안정적인 서비스를 제공하겠습니다! 🏆"
           
    # 5. 관리자 계정들의 FCM 토큰 조회
    conn = get_db_connection()
    cursor = conn.cursor()
    tokens = []
    try:
        cursor.execute("""
            SELECT f.token 
            FROM fcm_tokens f
            LEFT JOIN users u ON f.user_id = u.id
            WHERE LOWER(u.email) IN ('rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com')
               OR f.user_id IN ('110418985320259217419', 'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com')
        """)
        tokens = [row[0] for row in cursor.fetchall()]
    except Exception as e:
        print(f"[Scheduler-Error] Failed to fetch admin tokens: {e}")
    finally:
        conn.close()
        
    if tokens:
        print(f"[Scheduler] Sending daily report to {len(tokens)} admin device(s)...")
        send_multicast_notification(tokens, title, body, {"url": "/"})
        return len(tokens)
    else:
        print("[Scheduler] No admin FCM tokens found in the database. Cannot send daily report.")
        return 0

def run_market_scheduler():
    """시장별 이벤트 감시 메인 루프"""
    import asyncio
    from morning_briefing import morning_briefing_service
    
    kst = pytz.timezone('Asia/Seoul')
    initialize_firebase()
    
    while True:
        try:
            now = datetime.now(kst)
            day_of_week = now.weekday()
            
            # [매일 발송] 밤 11시 59분 일일 방문자 및 시스템 보고서 발송 (Admins)
            if now.hour == 23 and now.minute == 59:
                send_daily_analytics_report()
                time.sleep(60)
            
            # [매일 발송] AI 모닝 브리핑 (주말/공휴일 포함 뉴스 요약)
            if now.hour == 8 and now.minute == 0:
                asyncio.run(morning_briefing_service.run_daily_briefing("KR"))
                time.sleep(60)
            
            if now.hour == 21 and now.minute == 30:
                asyncio.run(morning_briefing_service.run_daily_briefing("US"))
                time.sleep(60)

            # 1. 국내 장시작 시가 알림 (평일 월~금, 한국시간 오전 09:05)
            if day_of_week <= 4:
                if now.hour == 9 and now.minute == 5 and not is_market_holiday("KR"):
                    send_opening_notification("KR")
                    time.sleep(60)

            # 2. 국내 장마감 종가 리포트 (평일 월~금, 한국시간 오후 15:40)
            if day_of_week <= 4:
                if now.hour == 15 and now.minute == 40 and not is_market_holiday("KR"):
                    send_closing_notification("KR")
                    time.sleep(60)
            
            # 미국 서머타임(DST) 적용 여부 확인 (미국 동부 시간 기준)
            ny_tz = pytz.timezone('America/New_York')
            ny_time = datetime.now(ny_tz)
            is_dst = ny_time.dst().total_seconds() != 0
            
            # 서머타임 시: KST 22:35 개장 알림 / KST 04:10 마감 알림
            # 표준시간 시: KST 23:35 개장 알림 / KST 05:10 마감 알림
            us_open_hour = 22 if is_dst else 23
            us_close_hour = 4 if is_dst else 5
            
            # 3. 미국 장시작 시가 알림 (평일 월~금, 개장 5분 후)
            if day_of_week <= 4:
                if now.hour == us_open_hour and now.minute == 35 and not is_market_holiday("US"):
                    send_opening_notification("US")
                    time.sleep(60)

            # 4. 미국 장마감 종가 리포트 (한국시간 화~토요일 새벽 마감 10분 후)
            # 미국 금요일 장마감은 한국 시간 토요일 새벽(day_of_week == 5)에 오므로 1 <= day_of_week <= 5 조건으로 처리
            if 1 <= day_of_week <= 5:
                if now.hour == us_close_hour and now.minute == 10 and not is_market_holiday("US"):
                    send_closing_notification("US")
                    time.sleep(60)
            
            time.sleep(30)
            
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
            time.sleep(60)

def start_scheduler():
    """백그라운드 스레드에서 스케줄러 시작"""
    thread = threading.Thread(target=run_market_scheduler, daemon=True)
    thread.start()
    print("[Scheduler] All Intelligence Services Started")
