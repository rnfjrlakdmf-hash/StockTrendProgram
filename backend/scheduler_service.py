import time
import threading
from datetime import datetime
import pytz
import yfinance as yf
from firebase_admin import messaging
from db_manager import get_db_connection, get_watchlist, get_user_fcm_tokens, get_all_users
from stock_data import get_simple_quote, get_korean_stock_name
from firebase_config import send_multicast_notification, initialize_firebase
from fx_api import get_alpha_vantage_fx
from holiday_checker import is_holiday
from system_watchdog import update_heartbeat
from korea_data import get_top_trending_themes

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
    total_profit_amt = 0 # 누적 수익금 합계 (수량 반영)
    total_buy_value = 0 # 총 매수 금액
    total_current_value = 0 # 총 현재 가치
    count = 0
    
    for row in watchlist:
        sym = row[0]
        added_price = float(row[1] or 0)
        quantity = float(row[2] or 1) # 기본값 1주
        
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
                "added_price": added_price,
                "quantity": quantity
            }
            
            # 수량을 반영한 누적 수익 및 가치 계산
            if added_price and added_price > 0:
                diff_per_share = curr_p - added_price
                total_item_profit = diff_per_share * quantity
                perf_pct = (diff_per_share / added_price) * 100
                
                item["price_diff"] = total_item_profit # 수량 반영된 수익금
                item["added_perf"] = perf_pct
                
                total_profit_amt += total_item_profit
                total_buy_value += (added_price * quantity)
                total_current_value += (curr_p * quantity)
                
            items_perf.append(item)
            total_daily_change += change_p
            count += 1
        except: continue
        
    if count == 0: return None
    
    portfolio_return = None
    if total_buy_value > 0:
        portfolio_return = ((total_current_value - total_buy_value) / total_buy_value) * 100
        
    return {
        "avg_daily_change": total_daily_change / count,
        "total_profit_amt": total_profit_amt,
        "portfolio_return": portfolio_return,
        "items": items_perf,
        "count": count
    }

def send_opening_notification(market: str):
    """시장 시작 시가 알림 발송"""
    initialize_firebase()
    print(f"[Scheduler] Sending {market} market opening prices...")
    
    fx_rate = 1350.0
    if market == "US":
        try:
            fx_quote = get_simple_quote("USDKRW=X")
            if fx_quote and fx_quote.get('price') and fx_quote['price'] != "확인불가":
                fx_rate = float(str(fx_quote['price']).replace(',', ''))
        except Exception as e:
            print(f"[Scheduler] Failed to fetch fx_rate: {e}")
    
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
                
                # Add currency formatting
                if market == "US":
                    try:
                        price_float = float(price)
                        price_str = f"${price_float:,.2f}"
                        krw_price = price_float * fx_rate
                        if krw_price >= 10000:
                            krw_str = f"약 {krw_price/10000:,.1f}만원"
                        else:
                            krw_str = f"약 {krw_price:,.0f}원"
                        price_str += f" ({krw_str})"
                    except ValueError:
                        price_str = f"${price}" if not str(price).startswith("$") else str(price)
                else:
                    try:
                        price_float = float(price)
                        price_str = f"{price_float:,.0f}원"
                    except ValueError:
                        price_str = f"{price}원" if not str(price).endswith("원") else str(price)
                    
                items_info.append(f"• {name}: {price_str}")
        
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
        
        market_name = "국내" if market == "KR" else "해외"
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
                send_multicast_notification(tokens, title, body, {"type": "price_alert", "url": "/watchlist"}, target_users=[user_id])
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO alert_history (user_id, symbol, type, message, current_price, buy_price, threshold)
                        VALUES (?, ?, 'market', ?, 0, 0, 0)
                    """, (user_id, market_name, f"{title}\n{body}"))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print(f"[Scheduler-Error] Failed to save open alert to DB: {e}")

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
            import time
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

    def _get_raw_val(quote, fallback, md_label):
        if md_label and md_label in md_dict:
            d = md_dict[md_label]
            if d.get("value") not in ["준비중", "확인불가", "0.00"]:
                return {"price": str(d["value"]), "change": str(d.get("change", "0.00%"))}
        if not quote or quote.get("price") == "확인불가":
            return {"price": fallback, "change": "0.00%"}
        return quote

    common = {
        "KOSPI": _format_index(kospi_info, "코스피"),
        "KOSDAQ": _format_index(kosdaq_info, "코스닥"),
        "DOW": _format_us_index(get_safe_quote("^DJI"), "다우존스"),
        "NASDAQ": _format_us_index(get_safe_quote("^IXIC"), "나스닥", "NASDAQ"),
        "SP500": _format_us_index(get_safe_quote("^GSPC"), "S&P500", "S&P 500"),
        "SOX": _format_us_index(get_safe_quote("^SOX"), "반도체지수", "SOX"),
        "TNX": get_safe_quote("^TNX", default_price="4.50"),
        "OIL": _get_raw_val(get_safe_quote("CL=F", default_price="0.00"), "0.00", "WTI"),
        "FX": get_alpha_vantage_fx(),
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
            portfolio_return = perf.get("portfolio_return")
            total_profit = perf.get("total_profit_amt", 0)
            
            if portfolio_return is not None:
                display_return = portfolio_return
                return_label = "총 누적 수익률"
            else:
                display_return = avg_change
                return_label = "평균 일간 등락률"
                
            unit = "원" if market == "KR" else "$"
            market_name = "국내" if market == "KR" else "해외"
            emoji = "📈" if display_return > 0 else "📉" if display_return < 0 else "➖"
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
                if market == "US":
                    krw_curr = item['current_price'] * fx_rate
                    krw_curr_str = f"{krw_curr/10000:,.1f}만원" if krw_curr >= 10000 else f"{krw_curr:,.0f}원"
                    curr_price_str = f"{item['current_price']:,.2f} (약 {krw_curr_str})"
                else:
                    curr_price_str = f"{item['current_price']:,.0f}"
                
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
                
                qty_str = f"({item['quantity']:g}주)" if item.get('quantity', 1) != 1 else ""
                line = f"• {item['name']}{qty_str}: {curr_price_str}{unit} ({change_emoji}{chg_val_str} / {change_emoji}{abs(item['daily_change']):.1f}%)"
                if item.get('price_diff') is not None and item.get('added_price', 0) > 0:
                    diff = item['price_diff']
                    added_perf = item.get('added_perf', 0)
                    if market == "US":
                        krw_diff = diff * fx_rate
                        sign = "+" if krw_diff > 0 else "-" if krw_diff < 0 else ""
                        krw_diff_str = f"{sign}{abs(krw_diff)/10000:,.1f}만원" if abs(krw_diff) >= 10000 else f"{sign}{abs(krw_diff):,.0f}원"
                        diff_str = f"{diff:+,.2f} (약 {krw_diff_str})"
                    else:
                        diff_str = f"{diff:+,.0f}"
                    line += f"\n  ↳ 💰총 수익: {diff_str}{unit} ({added_perf:+.1f}%)"
                price_list.append(line)
                
            body_market = market_summary.strip()
            title_market = f"🌕 {market_name} 장마감 시황"
            
            body_portfolio = f"{return_label}: {display_return:+.2f}%\n" + profit_str + "\n".join(price_list)
            title_portfolio = f"💰 내 {market_name} 관심종목 결산 {emoji}"
            
            tokens_data = get_user_fcm_tokens(user_id)
            if tokens_data:
                tokens = [t['token'] for t in tokens_data if t.get('pref_closing', True)]
                if tokens:
                    # 1. 시장 지수 요약 알림
                    send_multicast_notification(tokens, title_market, body_market, {"url": "/discovery", "type": "market_summary"}, target_users=[user_id])
                    
                    try:
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO alert_history (user_id, symbol, type, message, current_price, buy_price, threshold)
                            VALUES (?, ?, 'market', ?, 0, 0, 0)
                        """, (user_id, market_name, f"{title_market}\n{body_market}"))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"[Scheduler-Error] Failed to save closing market alert to DB: {e}")
                    
                    # 2초 대기 (모바일 환경에서 두 개의 푸시가 씹히지 않고 연속으로 뜨도록 순서 보장)
                    import time
                    time.sleep(2.0)
                    
                    # 2. 내 관심종목 수익 현황 알림
                    send_multicast_notification(tokens, title_portfolio, body_portfolio, {"url": "/watchlist", "type": "portfolio_summary"}, target_users=[user_id])
                    
                    try:
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO alert_history (user_id, symbol, type, message, current_price, buy_price, threshold)
                            VALUES (?, ?, 'portfolio', ?, 0, 0, 0)
                        """, (user_id, market_name, f"{title_portfolio}\n{body_portfolio}"))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"[Scheduler-Error] Failed to save closing portfolio alert to DB: {e}")
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
    
    # 🌟 구글 시트 동기화 (보고서 발송과 함께 항상 실행)
    try:
        from google_sheets_sync import sync_analytics_to_sheet
        sync_analytics_to_sheet()
    except Exception as e:
        print(f"[Scheduler] Google Sheets sync error: {e}")
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
        
    # 3-2. 오늘 Peak Hour 계산
    peak_hour_str = "데이터 없음"
    try:
        from db_manager import get_hourly_analytics
        hourly_stats = get_hourly_analytics(24) # 최근 24시간
        today_hourly = [h for h in hourly_stats if h["date_hour"].startswith(today_str)]
        if today_hourly:
            peak_stat = max(today_hourly, key=lambda x: x["unique_visitors"])
            peak_time = peak_stat["date_hour"].split("_")[1] # "2026-07-02_17" -> "17"
            peak_hour_str = f"{peak_time}시 ({peak_stat['unique_visitors']:,}명)"
    except Exception as e:
        print(f"[Scheduler] Failed to calculate peak hour: {e}")
        
    # 4. 푸시 알림 제목 및 본문 구성
    title = "📊 [STOCK AI] 일일 방문자 및 시스템 운영 보고서"
    body = f"📅 날짜: {today_str}\n\n" \
           f"👥 오늘 순 방문자수 (1일): {unique_visitors:,}명\n" \
           f"📑 오늘 총 페이지뷰 (1일): {pageviews:,}회\n" \
           f"📈 30일 누적 페이지뷰: {total_pv_30d:,}회\n" \
           f"👥 30일 누적 순방문자: {total_uv_30d:,}명\n" \
           f"🔥 현재 접속자 (5분): {active_users:,}명\n" \
           f"👑 누적 가입 회원수: {total_users:,}명\n" \
           f"⏰ 오늘 트래픽 피크타임: {peak_hour_str}\n\n" \
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
            WHERE LOWER(u.email) IN ('rnfjrlakdmf@gmail.com')
               OR f.user_id IN ('110418985320259217419', 'rnfjrlakdmf@gmail.com')
        """)
        tokens = [row[0] for row in cursor.fetchall() if row[0]]
        
        # 관리자 이메일 및 고정 UID를 기반으로 users 테이블에서 UID 가져오기
        cursor.execute("""
            SELECT u.id
            FROM users u
            WHERE LOWER(u.email) IN ('rnfjrlakdmf@gmail.com', 'rnfjr@gmail.com')
               OR u.id IN ('110418985320259217419')
        """)
        db_admin_uids = [row[0] for row in cursor.fetchall()]
        
        # db에 없는 고정 ID들도 명시적으로 target_users에 포함 (안전장치)
        admin_uids = list(set(db_admin_uids + ['110418985320259217419']))
        
    except Exception as e:
        print(f"[Scheduler-Error] Failed to fetch admin tokens: {e}")
    finally:
        conn.close()
        
    if tokens:
        print(f"[Scheduler] Sending daily report to {len(tokens)} admin device(s)...")
        # 데이터 페이로드에 타겟 유저(Admin UID)와 is_global='false'를 명시하여 일반 사용자에게 노출 방지 (FCM data는 모두 문자열이어야 함)
        send_multicast_notification(tokens, title, body, {"url": "/", "is_global": "false", "type": "admin_report"}, target_users=admin_uids)
        return len(tokens)
    else:
        print("[Scheduler] No admin FCM tokens found in the database. Cannot send daily report.")
        return 0

def send_weekend_theme_report():
    """주말 테마 리포트 알림 발송 (일요일 발송)"""
    try:
        themes = get_top_trending_themes(limit=3)
        if not themes or len(themes) == 0:
            return 0
            
        theme_names = []
        for t in themes:
            name = t.get('name', '') if isinstance(t, dict) else t
            if name:
                theme_names.append(name)
                
        if not theme_names:
            return 0
            
        title = "📈 이번 주말 가장 많이 검색된 주식 테마는?"
        body = f"1위 {theme_names[0]}, 2위 {theme_names[1] if len(theme_names) > 1 else '...'} 월요일 장 열리기 전 꼭 체크하세요!"
        
        # 모든 유저에게 알림 전송
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT fcm_token FROM fcm_tokens")
        tokens = [row[0] for row in cursor.fetchall() if row[0]]
        conn.close()
        
        if tokens:
            print(f"[Scheduler] Sending Weekend Theme Report to {len(tokens)} device(s)...")
            send_multicast_notification(tokens, title, body, {"url": "/theme"})
            return len(tokens)
            
    except Exception as e:
        print(f"[Scheduler-Error] Failed to send weekend theme report: {e}")
    return 0

def send_weekend_crypto_report():
    """주말 가상화폐(비트코인) 흐름 알림 발송 (토요일 발송)"""
    try:
        # 비트코인 최근 5일치 종가 가져오기
        ticker = yf.Ticker('BTC-USD')
        hist = ticker.history(period='5d')
        if len(hist) < 2:
            return 0
            
        prev_close = hist['Close'].iloc[-2]
        curr_close = hist['Close'].iloc[-1]
        
        change_pct = ((curr_close - prev_close) / prev_close) * 100
        
        if change_pct > 2.0:
            trend_text = "강세"
        elif change_pct < -2.0:
            trend_text = "변동성 확대"
        elif change_pct > 0:
            trend_text = "상승 흐름"
        else:
            trend_text = "숨고르기"
            
        title = f"🚨 비트코인 주말 {trend_text}!"
        body = "월요일 장 열리기 전 꼭 체크해야 할 가상화폐 관련주는?"
        
        # 모든 유저에게 알림 전송
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT fcm_token FROM fcm_tokens")
        tokens = [row[0] for row in cursor.fetchall() if row[0]]
        conn.close()
        
        if tokens:
            print(f"[Scheduler] Sending Weekend Crypto Report to {len(tokens)} device(s)...")
            # /theme 페이지에 검색어 파라미터를 붙여서 가상화폐 테마로 바로 이동
            send_multicast_notification(tokens, title, body, {"url": "/theme?q=가상화폐"})
            return len(tokens)
            
    except Exception as e:
        print(f"[Scheduler-Error] Failed to send weekend crypto report: {e}")
    return 0

def send_fomo_alert():
    # Implementation exists but hidden for brevity in patch
    pass



    try:
        from db_manager import get_all_fcm_tokens_with_user
        tokens_with_user = get_all_fcm_tokens_with_user()
        if not tokens_with_user:
            return 0
        
        unique_tokens = list(set([t[1] for t in tokens_with_user if t[1]]))
        
        title = "🤫 외국인이 오늘 쓸어담은 종목은?"
        body = "지금 바로 수급 현황을 확인해보세요!"
        # 평일에는 /discovery 로 보내고 주말에는 /weekend-whale 로 보내는 로직 추가
        from datetime import datetime
        import pytz
        kst = pytz.timezone('Asia/Seoul')
        now = datetime.now(kst)
        day = now.weekday()
        hour = now.hour
        is_weekend = (day == 4 and hour >= 18) or day == 5 or day == 6 or (day == 0 and hour < 8)
        
        url = "/weekend-whale" if is_weekend else "/premium"
        
        send_multicast_notification(unique_tokens, title, body, {"url": url})
        print(f"[Scheduler] FOMO Alert sent to {len(unique_tokens)} devices.")
        return len(unique_tokens)
    except Exception as e:
        print(f"[Scheduler-Error] Failed to send FOMO alert: {e}")
        return 0

def send_dormant_user_alert():
    try:
        from db_manager import get_dormant_fcm_tokens_with_user
        from korea_data import get_top_trending_themes
        
        tokens_with_user = get_dormant_fcm_tokens_with_user(days=3)
        if not tokens_with_user:
            return 0
            
        unique_tokens = list(set([t[1] for t in tokens_with_user if t[1]]))
        
        top_themes = get_top_trending_themes(1)
        if top_themes and len(top_themes) > 0:
            theme_name = top_themes[0]['name']
        else:
            theme_name = "반도체" # fallback
            
        title = f"💰 어제 가장 뜨거운 테마는 '{theme_name}'!"
        body = "AI가 발굴한 내일의 유망 테마를 확인해보세요!"
        import urllib.parse
        url = f"/theme?q={urllib.parse.quote(theme_name)}"
        
        send_multicast_notification(unique_tokens, title, body, {"url": url})
        print(f"[Scheduler] Dormant User Alert sent to {len(unique_tokens)} devices.")
        return len(unique_tokens)
    except Exception as e:
        print(f"[Scheduler-Error] Failed to send Dormant User alert: {e}")
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
    last_run_open_kr = ""
    last_run_close_kr = ""
    last_run_open_us = ""
    last_run_close_us = ""
    last_run_weekend_report = ""
    last_run_weekend_crypto = ""
    last_run_analytics = ""
    last_run_fomo = ""
    last_run_dormant = ""
    last_run_daily_theory = ""
    last_spike_alert_time = None

    last_cleanup_date = ""
    last_run_health_check = None
    
    while True:
        try:
            update_heartbeat("Main_Alert_Scheduler")
            now = datetime.now(kst)
            day_of_week = now.weekday()
            current_date = now.strftime('%Y-%m-%d')
            
            # [매일 실행] 자정 ~ 새벽 1시 사이 시스템 헬스체크 (1회 발송)
            if now.hour == 0 and current_date != last_run_health_check:
                try:
                    from system_health_check import run_system_health_check
                    run_system_health_check()
                except Exception as e:
                    print(f"[Scheduler] System health check error: {e}")
                last_run_health_check = current_date
                
            # [실시간] 트래픽 급등 감지 (1분 주기)
            try:
                from db_manager import get_realtime_active_count
                active_count = get_realtime_active_count(minutes=5)
                if active_count >= 30:
                    if not last_spike_alert_time or (now - last_spike_alert_time).total_seconds() >= 1800:
                        # 30분(1800초) 쿨타임
                        from system_watchdog import send_admin_alert
                        send_admin_alert(
                            module_name="📈 트래픽 급등 경고!",
                            error_msg=f"현재 실시간 동시 접속자가 {active_count}명을 돌파했습니다! 사람들이 떼거지로 몰려오고 있습니다."
                        )
                        last_spike_alert_time = now
                        print(f"[Analytics] Spike alert sent: {active_count} users")
            except Exception as e:
                print(f"[Scheduler] Spike alert error: {e}")
            
            # [주말 실행] 크립토 실시간 불장 감지 (15분 간격)
            if now.minute % 15 == 0 and is_holiday("kor"):
                current_time = now.strftime('%H:%M')
                if last_run_crypto_surge != current_time:
                    try:
                        from crypto_alerts import check_crypto_surge
                        check_crypto_surge()
                    except Exception as e:
                        print(f"[Scheduler] Crypto surge error: {e}")
                    last_run_crypto_surge = current_time
                    
            # [실시간] 관심종목 뉴스 속보 감시 (5분 간격)
            if now.minute % 5 == 0:
                current_time = now.strftime('%H:%M')
                if getattr(run_market_scheduler, "last_run_watchlist_news", None) != current_time:
                    try:
                        from watchlist_monitor import run_watchlist_news_monitor
                        run_watchlist_news_monitor()
                    except Exception as e:
                        print(f"[Scheduler] Watchlist news error: {e}")
                    run_market_scheduler.last_run_watchlist_news = current_time

            # [장중+애프터마켓] 관심종목 가격 급등락 감시 (5분 간격, 20:00까지 연장)
            if not is_holiday("kor") and 9 <= now.hour <= 19 and now.minute % 5 == 0:
                current_time = now.strftime('%H:%M')
                if getattr(run_market_scheduler, "last_run_watchlist_price", None) != current_time:
                    try:
                        from watchlist_monitor import run_watchlist_price_monitor
                        run_watchlist_price_monitor()
                    except Exception as e:
                        print(f"[Scheduler] Watchlist price error: {e}")
                    run_market_scheduler.last_run_watchlist_price = current_time

            # [평일 장중 실행] 고래/세력 매집 실시간 알림 (30분 간격)
            if not is_holiday("kor") and 9 <= now.hour <= 15 and now.minute % 30 == 0:
                current_time = now.strftime('%H:%M')
                if getattr(run_market_scheduler, "last_run_whale_alert", None) != current_time:
                    try:
                        from whale_alerts import check_whale_alerts
                        check_whale_alerts()
                    except Exception as e:
                        print(f"[Scheduler] Whale alert error: {e}")
                    run_market_scheduler.last_run_whale_alert = current_time
            
            # [매일 실행] 오전 8:30 주식 기초 스터디 자동 포스팅
            if now.hour == 8 and now.minute == 30 and current_date != last_run_daily_theory:
                try:
                    from daily_theory_bot import post_daily_theory
                    post_daily_theory()
                except Exception as e:
                    print(f"[Scheduler] Daily Theory Bot error: {e}")
                last_run_daily_theory = current_date

            # [매일 실행] 오전 6:30 DART 재무 데이터 선제 캐싱
            if now.hour == 6 and 30 <= now.minute <= 35 and current_date != last_run_dart_cache:
                try:
                    run_dart_daily_cache_update()
                except Exception as e:
                    print(f"[Scheduler] DART 캐싱 오류: {e}")
                last_run_dart_cache = current_date
                
            # [금요일 실행] 오후 6:00 주말 한정판 세력/외인 매집 리포트 생성
            if now.weekday() == 4 and now.hour == 18 and 0 <= now.minute <= 5 and current_date != getattr(run_market_scheduler, "last_run_whale_report_gen", None):
                try:
                    from utils.whale_weekend_report import _generate_whale_report_sync
                    _generate_whale_report_sync()
                except Exception as e:
                    print(f"[Scheduler] Whale report gen error: {e}")
                run_market_scheduler.last_run_whale_report_gen = current_date
                
            # [일요일 실행] 오후 8:00 주말 한정판 리포트 오픈 푸시 알림
            if now.weekday() == 6 and now.hour == 20 and 0 <= now.minute <= 5 and current_date != getattr(run_market_scheduler, "last_run_whale_push", None):
                try:
                    title = "🐳 월요일 장 준비 끝!"
                    body = "주말 한정판 세력/외인 매집 TOP 3 리포트가 도착했습니다. 지금 확인하세요!"
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute("SELECT DISTINCT fcm_token FROM fcm_tokens")
                    tokens = [row[0] for row in cursor.fetchall() if row[0]]
                    conn.close()
                    if tokens:
                        send_multicast_notification(tokens, title, body, {"url": "/"})
                except Exception as e:
                    print(f"[Scheduler-Error] Failed to send whale report push: {e}")
                run_market_scheduler.last_run_whale_push = current_date
                
            # [토요일 실행] 오전 9:55 주말 한정 프리미엄 리포트 생성 (10시 오픈 대비)
            if now.weekday() == 5 and now.hour == 9 and 55 <= now.minute <= 59 and current_date != last_run_weekend_report_gen:
                try:
                    from utils.weekend_report import _generate_sync_impl
                    _generate_sync_impl()
                    
                    # 푸시 알림 발송
                    try:
                        title = "🔓 주말 프리미엄 인사이트 오픈!"
                        body = "지난주 시장 핵심 요약과 다음 주 필수 체크포인트를 지금 바로 확인하세요."
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("SELECT DISTINCT fcm_token FROM fcm_tokens")
                        tokens = [row[0] for row in cursor.fetchall() if row[0]]
                        conn.close()
                        if tokens:
                            send_multicast_notification(tokens, title, body, {"url": "/weekend-report"})
                    except Exception as e:
                        print(f"[Scheduler-Error] Failed to send weekend report push: {e}")
                        
                except Exception as e:
                    print(f"[Scheduler] Weekend report generation error: {e}")
                last_run_weekend_report_gen = current_date

            # [매일 발송] 밤 11시 59분 일일 방문자 및 시스템 보고서 발송 (Admins) 및 구글 시트 동기화
            if now.hour == 23 and 55 <= now.minute <= 59 and current_date != last_run_daily_report:
                send_daily_analytics_report()
                last_run_daily_report = current_date
            
            # [매일 실행] 새벽 3시 구글 색인(Indexing) 봇 자동 실행 (최신 종목/테마 페이지 강제 푸시)
            if now.hour == 3 and 0 <= now.minute <= 5 and current_date != getattr(run_market_scheduler, "last_run_google_indexer", None):
                try:
                    from google_indexer import get_urls_from_sitemap, publish_urls_to_google, SITEMAP_URL
                    print("[Scheduler] Running Google Auto-Indexer Bot...")
                    urls = get_urls_from_sitemap(SITEMAP_URL)
                    if urls:
                        publish_urls_to_google(urls)
                except Exception as e:
                    print(f"[Scheduler-Error] Failed to run Google Indexer: {e}")
                run_market_scheduler.last_run_google_indexer = current_date
            
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
            
            # [매일 발송] 오전 8:30 모닝 테마주 브리핑 전체 웹 푸시 (유사투자자문업 방어 목적: 객관적 사실 전달)
            if day_of_week <= 4:
                if now.hour == 8 and 30 <= now.minute <= 35 and current_date != getattr(run_market_scheduler, "last_run_morning_theme_push", None) and not is_market_holiday("KR"):
                    try:
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("SELECT DISTINCT fcm_token FROM fcm_tokens WHERE fcm_token IS NOT NULL")
                        tokens = [row[0] for row in cursor.fetchall() if row[0]]
                        conn.close()
                        
                        if tokens:
                            title = "🔔 장 시작 30분 전! (객관적 요약)"
                            body = "AI가 간추린 오늘의 핵심 테마 브리핑입니다. 특정 종목 추천이 아닌 단순 정보 제공 목적입니다."
                            send_multicast_notification(tokens, title, body, {"url": "/briefing"})
                            print(f"[Scheduler] Morning Theme Briefing push sent to {len(tokens)} devices.")
                    except Exception as e:
                        print(f"[Scheduler-Error] Failed to send Morning Theme Briefing push: {e}")
                    run_market_scheduler.last_run_morning_theme_push = current_date
            
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

            # 서머타임 시: KST 22:35 개장 알림 / KST 05:10 마감 알림
            # 표준시간 시: KST 23:35 개장 알림 / KST 06:10 마감 알림
            us_open_hour = 22 if is_dst else 23
            us_close_hour = 5 if is_dst else 6

            # 3. 미국 장시작 시가 알림
            # - 서머타임/표준시 무관하게 KST 22:35 / 23:35는 미국 09:35이므로 KST 월~금(0~4)에만 발송
            us_open_days = list(range(0, 5))
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
                    
            # 5. 주말 테마 리포트 (일요일 18:00)
            if day_of_week == 6: # 일요일 (0:월, ..., 6:일)
                if now.hour == 18 and 0 <= now.minute <= 5 and current_date != last_run_weekend_report:
                    send_weekend_theme_report()
                    last_run_weekend_report = current_date
                    
            # 6. 주말 코인 리포트 (토요일 18:00)
            if day_of_week == 5: # 토요일
                if now.hour == 18 and 0 <= now.minute <= 5 and current_date != last_run_weekend_crypto:
                    send_weekend_crypto_report()
                    last_run_weekend_crypto = current_date
            
            time.sleep(30)
            
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
            time.sleep(60)

main_scheduler_thread = None

def start_scheduler():
    """백그라운드 스레드에서 스케줄러 시작"""
    global main_scheduler_thread
    if main_scheduler_thread is not None and main_scheduler_thread.is_alive():
        print("[Scheduler] Main_Alert_Scheduler is already running. Skipping duplicate spawn.")
        return
        
    main_scheduler_thread = threading.Thread(target=run_market_scheduler, daemon=True)
    main_scheduler_thread.start()
    print("[Scheduler] All Intelligence Services Started")

def delete_old_alerts():
    """3일 지난 알림(Firestore 및 DB) 삭제 (관리자 보고서 포함)"""
    try:
        from firebase_config import initialize_firebase, db
        from db_manager import get_db_connection
        from datetime import datetime, timedelta
        import pytz
        
        initialize_firebase()
        
        kst = pytz.timezone('Asia/Seoul')
        three_days_ago = datetime.now(kst) - timedelta(days=3)
        
        # 1. Delete from Firestore
        if db:
            alerts_ref = db.collection('alerts')
            query = alerts_ref.where('timestamp', '<', three_days_ago).limit(100)
            
            deleted_count = 0
            while True:
                docs = query.get()
                if not docs:
                    break
                for doc in docs:
                    doc.reference.delete()
                    deleted_count += 1
            if deleted_count > 0:
                print(f"[Cleanup] Deleted {deleted_count} old alerts from Firestore.")
            
        # 2. Delete from SQLite DB
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM alert_history WHERE created_at < ?", (three_days_ago.strftime('%Y-%m-%d %H:%M:%S'),))
        db_deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        if db_deleted > 0:
            print(f"[Cleanup] Deleted {db_deleted} old alerts from SQLite DB.")
            
    except Exception as e:
        print(f"[Cleanup] Failed to delete old alerts: {e}")
