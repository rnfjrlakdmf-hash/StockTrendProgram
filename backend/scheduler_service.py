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
                    yesterday_str = (datetime.datetime.now(kst) - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
                    
                    for ev in all_events:
                        # 오늘 일정(yfinance 등 미래 일정)이거나, 어제 오후에 뜬 공시(DART)인 경우 알림
                        if ev.get("date") == today_str or (ev.get("source") == "DART" and ev.get("date") == yesterday_str):
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
            # 장시작 알림은 pref_price(가격알림) 권한으로 필터 (pref_closing 아님!)
            tokens = [t['token'] for t in tokens_data if t.get('pref_price', True)]
            if tokens:
                send_multicast_notification(tokens, title, body, {"type": "price_alert", "url": "/watchlist"})

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
    def get_safe_quote(sym: str, default_price="확인불가", default_change="0.00%", default_change_val="0.00"):
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
                    "change_percent": cached_data.get("change_percent", default_change),
                    "regular_change": cached_data.get("regular_change", default_change_val)
                }
        except:
            pass
            
        return {"price": default_price, "change": default_change, "percent": default_change, "regular_change": default_change_val}

    # Extract KOSPI and KOSDAQ info safely
    kospi_info = kr_indices.get("kospi", {}) if isinstance(kr_indices, dict) else {}
    kosdaq_info = kr_indices.get("kosdaq", {}) if isinstance(kr_indices, dict) else {}
    
    def _format_index(idx_info, default_name):
        if not idx_info: return f"{default_name}: 확인불가"
        val = idx_info.get("value", "0.00")
        chg = idx_info.get("change", "0.00")
        pct = idx_info.get("percent", "0.00%")
        sign = "+" if idx_info.get("direction") == "Up" else "-" if idx_info.get("direction") == "Down" else ""
        return f"{default_name}: {val} ({sign}{chg} / {pct})"
        
    # 글로벌 마켓 데이터 캐시 활용 (나스닥, S&P500 등)
    try:
        from stock_data import get_market_data
        md = get_market_data()
        md_dict = {item['label']: item for item in md}
    except:
        md_dict = {}

    def _format_us_index(quote, default_name, md_label=None):
        # 1. 우선적으로 안정적인 get_market_data() 결과 사용
        if md_label and md_label in md_dict:
            data = md_dict[md_label]
            if data.get("value") not in ["준비중", "확인불가", "0.00"]:
                return f"{default_name}: {data['value']} ({data['change']})"
        
        # 2. 실패 시 개별 yfinance 호출 (get_safe_quote)
        if not quote or quote.get("price") == "확인불가": return f"{default_name}: 확인불가"
        val = quote.get("price", "0.00")
        pct = quote.get("change_percent", quote.get("change", "0.00%"))
        chg_val = quote.get("regular_change", 0)
        try:
             chg_val_f = float(chg_val)
             sign = "+" if chg_val_f >= 0 else ""
             chg_str = f"{sign}{chg_val_f:.2f}"
        except:
             chg_str = "0.00"
        return f"{default_name}: {val} ({chg_str} / {pct})"

    common = {
        "KOSPI": _format_index(kospi_info, "코스피"),
        "KOSDAQ": _format_index(kosdaq_info, "코스닥"),
        "DOW": _format_us_index(get_safe_quote("^DJI"), "다우존스"),
        "NASDAQ": _format_us_index(get_safe_quote("^IXIC"), "나스닥", "NASDAQ"),
        "SP500": _format_us_index(get_safe_quote("^GSPC"), "S&P500", "S&P 500"),
        "SOX": _format_us_index(get_safe_quote("^SOX"), "반도체지수", "SOX"),
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
                base_str = f"📊 {common['KOSPI']}\n📊 {common['KOSDAQ']}\n" \
                           f"💵 환율: {common['FX'].get('price')}원"
            else:
                base_str = f"🇺🇸 {common['NASDAQ']}\n🇺🇸 {common['SP500']}"

            # 2. 맞춤형 및 필수 원자재 추가 (유가는 기본 포함)
            extra_list = [f"🛢️ 유가: {common['OIL'].get('change')}"]
            
            if any(s in ['005930', '000660', 'NVDA', 'AMD', 'TSM'] for s in symbols):
                extra_list.append(f"💻 반도체: {common['SOX']}")
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
                
                # Format current_price nicely
                curr_price_str = f"{item['current_price']:,.0f}" if market == "KR" else f"{item['current_price']:,.2f}"
                
                # Format absolute daily change (e.g., 900원)
                chg_val = item.get('daily_change_val', 0)
                if chg_val:
                    try:
                         chg_val_f = float(chg_val)
                         chg_val_str = f"{abs(chg_val_f):,.0f}원" if market == "KR" else f"${abs(chg_val_f):,.2f}"
                    except:
                         chg_val_str = ""
                else:
                    # Approximation if missing
                    approx = abs(item['current_price'] * item['daily_change'] / (100.0 + item['daily_change'])) if (100.0 + item['daily_change']) != 0 else 0
                    chg_val_str = f"{approx:,.0f}원" if market == "KR" else f"${approx:,.2f}"
                
                line = f"• {item['name']}: {curr_price_str}{unit} ({change_emoji}{chg_val_str} / {change_emoji}{abs(item['daily_change']):.1f}%)"
                if item.get('price_diff') is not None and item.get('added_price', 0) > 0:
                    diff = item['price_diff']
                    diff_str = f"{diff:+,.0f}" if market == "KR" else f"{diff:+,.2f}"
                    line += f"\n  ↳ 💰수익: {diff_str}{unit}"
                price_list.append(line)
                
            body_market = market_summary.strip()
            title_market = f"🌕 {market_name} 장마감 시황"
            
            body_portfolio = f"평균 수익률: {avg_change:+.2f}%\n" + profit_str + "\n".join(price_list)
            title_portfolio = f"💰 내 {market_name} 관심종목 결산 {emoji}"
            
            tokens_data = get_user_fcm_tokens(user_id)
            if tokens_data:
                tokens = [t['token'] for t in tokens_data if t.get('pref_closing', True)]
                if tokens:
                    # 1. 시장 지수 요약 알림
                    send_multicast_notification(tokens, title_market, body_market, {"url": "/discovery", "type": "market_summary"})
                    
                    # 0.5초 대기 (푸시 알림 순서 보장을 위해)
                    import time
                    time.sleep(0.5)
                    
                    # 2. 내 관심종목 수익 현황 알림
                    send_multicast_notification(tokens, title_portfolio, body_portfolio, {"url": "/watchlist", "type": "portfolio_summary"})
        except Exception as user_err:
            print(f"[Scheduler-Error] Failed to send closing notification for user {user_id}: {user_err}")
            continue

def run_dart_daily_cache_update():
    """매일 오전 6:30 DART 재무 데이터 선제 캐싱 (하루에 한 번 자동 실행)
    관심종목 + 최근 7일 검색 종목을 대상으로 DART API를 호출해 캐시를 미리 갱신한다.
    사용자가 종목 검색 시 캐시 HIT로 즉시 응답 가능.
    """
    print("[DART-Cache] 매일 DART 재무 데이터 캐싱 시작...")
    try:
        from korea_data import get_stock_financials
        from db_manager import get_db_connection

        # 1. 관심종목 코드 수집
        target_codes = set()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT symbol FROM watchlist")
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                sym = row[0].split('.')[0]
                if sym.isdigit() and len(sym) == 6:
                    target_codes.add(sym)
        except Exception as e:
            print(f"[DART-Cache] 관심종목 로드 실패: {e}")

        # 2. 주요 대형주 추가 (항상 포함)
        major_stocks = [
            '005930',  # 삼성전자
            '000660',  # SK하이닉스
            '035420',  # NAVER
            '035720',  # 카카오
            '005380',  # 현대차
            '000270',  # 기아
            '051910',  # LG화학
            '068270',  # 셀트리온
            '207940',  # 삼성바이오로직스
            '006400',  # 삼성SDI
            '003550',  # LG
            '017670',  # SK텔레콤
            '030200',  # KT
            '086790',  # 하나금융지주
            '105560',  # KB금융
            '055550',  # 신한지주
            '018260',  # 삼성에스디에스
            '096775',  # SK이노베이션
            '066570',  # LG전자
            '012330',  # 현대모비스
        ]
        for code in major_stocks:
            target_codes.add(code)

        print(f"[DART-Cache] 총 {len(target_codes)}개 종목 DART 캐싱 시작")
        success_count = 0
        fail_count = 0

        for code in target_codes:
            try:
                result = get_stock_financials(code)
                if result and result.get('status') != 'error':
                    success_count += 1
                    print(f"[DART-Cache] [OK] {code} → PER={result.get('per')}, EPS={result.get('eps')}")
                else:
                    fail_count += 1
                # DART API 과부하 방지 (0.5초 지연)
                time.sleep(0.5)
            except Exception as e:
                fail_count += 1
                print(f"[DART-Cache] ❌ {code} 실패: {e}")
                time.sleep(0.3)

        print(f"[DART-Cache] 완료! 성공={success_count}개, 실패={fail_count}개")
    except Exception as e:
        print(f"[DART-Cache] 전체 실패: {e}")


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
    
    last_run_dart_cache = None
    last_run_daily_report = None
    last_run_morning_kr = None
    last_run_morning_us = None
    last_run_ipo = None
    last_run_open_kr = None
    last_run_close_kr = None
    last_run_open_us = None
    last_run_close_us = None
    
    while True:
        try:
            now = datetime.now(kst)
            day_of_week = now.weekday()
            current_date = now.strftime('%Y-%m-%d')
            
            # [매일 실행] 오전 6:30 DART 재무 데이터 선제 캐싱
            if now.hour == 6 and 30 <= now.minute <= 35 and current_date != last_run_dart_cache:
                try:
                    run_dart_daily_cache_update()
                except Exception as e:
                    print(f"[Scheduler] DART 캐싱 오류: {e}")
                last_run_dart_cache = current_date

            # [매일 발송] 밤 11시 59분 일일 방문자 및 시스템 보고서 발송 (Admins)
            if now.hour == 23 and 55 <= now.minute <= 59 and current_date != last_run_daily_report:
                send_daily_analytics_report()
                last_run_daily_report = current_date
            
            # [매일 발송] AI 모닝 브리핑 (KR)
            if now.hour == 8 and 0 <= now.minute <= 5 and current_date != last_run_morning_kr:
                asyncio.run(morning_briefing_service.run_daily_briefing("KR"))
                last_run_morning_kr = current_date

            # [매일 발송] 공모주 청약 일정 알림
            if day_of_week <= 4:
                if now.hour == 8 and 15 <= now.minute <= 20 and current_date != last_run_ipo and not is_market_holiday("KR"):
                    try:
                        from batch_ipo_alerts import send_ipo_alerts
                        send_ipo_alerts()
                    except Exception as e:
                        print(f"[Scheduler] IPO 알림 오류: {e}")
                    last_run_ipo = current_date
            
            # [매일 발송] AI 모닝 브리핑 (US)
            if now.hour == 21 and 30 <= now.minute <= 35 and current_date != last_run_morning_us:
                asyncio.run(morning_briefing_service.run_daily_briefing("US"))
                last_run_morning_us = current_date

            # 1. 국내 장시작 시가 알림
            if day_of_week <= 4:
                if now.hour == 9 and 5 <= now.minute <= 10 and current_date != last_run_open_kr and not is_market_holiday("KR"):
                    send_opening_notification("KR")
                    last_run_open_kr = current_date

            # 2. 국내 장마감 종가 리포트
            if day_of_week <= 4:
                if now.hour == 15 and 40 <= now.minute <= 45 and current_date != last_run_close_kr and not is_market_holiday("KR"):
                    send_closing_notification("KR")
                    last_run_close_kr = current_date
            
            # 미국 서머타임(DST) 적용 여부 확인 (미국 동부 시간 기준)
            ny_tz = pytz.timezone('America/New_York')
            ny_time = datetime.now(ny_tz)
            is_dst = ny_time.dst().total_seconds() != 0
            ny_date = ny_time.strftime('%Y-%m-%d')  # 미국 날짜 (장마감 다음날다룼 계산용)

            # 서머타임 시: KST 22:35 개장 알림 / KST 04:10 마감 알림
            # 표준시간 시: KST 23:35 개장 알림 / KST 05:10 마감 알림
            us_open_hour = 22 if is_dst else 23
            us_close_hour = 4 if is_dst else 5

            # 3. 미국 장시작 시가 알림
            # - 서머타임: KST 22:35 = 미국 09:35 → KST 월~토(0~5) 모두 필요
            # - 표준시: KST 23:35 = 미국 09:35 → KST 월~금(0~4)
            us_open_days = list(range(0, 6)) if is_dst else list(range(0, 5))
            if day_of_week in us_open_days:
                if now.hour == us_open_hour and 35 <= now.minute <= 40 and current_date != last_run_open_us and not is_market_holiday("US"):
                    send_opening_notification("US")
                    last_run_open_us = current_date

            # 4. 미국 장마감 종가 리포트
            # - KST 새벽 4~5시는 미국 전날입니다
            # - ny_date(미국 날짜)를 기준으로 중복 발송 방지
            us_close_days = list(range(1, 6)) if is_dst else list(range(1, 6))
            if day_of_week in us_close_days:
                if now.hour == us_close_hour and 10 <= now.minute <= 15 and ny_date != last_run_close_us and not is_market_holiday("US"):
                    send_closing_notification("US")
                    last_run_close_us = ny_date
            
            time.sleep(30)
            
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
            time.sleep(60)

def start_scheduler():
    """백그라운드 스레드에서 스케줄러 시작"""
    thread = threading.Thread(target=run_market_scheduler, daemon=True)
    thread.start()
    print("[Scheduler] All Intelligence Services Started")
