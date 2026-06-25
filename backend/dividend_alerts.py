import os
import yfinance as yf
from datetime import datetime, timedelta, date
from db_manager import get_db_connection
from firebase_config import send_multicast_notification

def get_all_stocks_from_watchlist():
    """Retrieve all unique stock tickers from user watchlists."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT symbol FROM watchlist")
    rows = cursor.fetchall()
    conn.close()
    
    # Return all stocks
    return [row[0] for row in rows if row[0]]

def get_users_watching_stock(symbol: str):
    """Get FCM tokens of users watching a specific stock."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Join watchlist with fcm_tokens to get device tokens
    query = """
        SELECT w.user_id, f.token 
        FROM watchlist w
        JOIN fcm_tokens f ON w.user_id = f.user_id
        WHERE w.symbol = ? AND f.pref_dividend = 1
    """
    cursor.execute(query, (symbol,))
    rows = cursor.fetchall()
    conn.close()
    
    return rows

def check_and_send_dividend_alerts():
    stocks = get_all_stocks_from_watchlist()
    print(f"Checking dividend schedules for {len(stocks)} stocks in watchlists...")
    
    # Calculate "tomorrow" (mostly local to KR since this script runs in KST)
    tomorrow = date.today() + timedelta(days=1)
    
    for symbol in stocks:
        try:
            # Handle Korean ticker formatting for yfinance
            yf_symbol = symbol
            if symbol.isdigit():
                # Try KS first
                t = yf.Ticker(f"{symbol}.KS")
                cal = t.calendar
                if not cal:
                    # Fallback to KQ
                    yf_symbol = f"{symbol}.KQ"
                    t = yf.Ticker(yf_symbol)
                    cal = t.calendar
            else:
                t = yf.Ticker(symbol)
                cal = t.calendar
            
            if not cal:
                continue
                
            ex_div_date = cal.get('Ex-Dividend Date')
            
            # Check if ex-dividend date is strictly tomorrow
            if ex_div_date and ex_div_date == tomorrow:
                # Fetch stock info for notification
                info = t.info
                name = info.get('shortName') or symbol
                
                # Fetch name nicely if Korean
                if symbol.isdigit():
                    from stock_data import get_korean_stock_name
                    name = get_korean_stock_name(symbol) or name
                    
                yield_pct = info.get('dividendYield', 0) * 100
                
                user_tokens = get_users_watching_stock(symbol)
                
                if user_tokens:
                    title = f"💰 내일은 {name} 배당락일입니다"
                    yield_str = f" (작년 배당금 기준 예상 수익률: 약 {yield_pct:.2f}%)" if yield_pct > 0 else ""
                    body = f"내일은 {name}의 배당락일이 예정되어 있습니다.{yield_str}\n(본 정보는 투자 참고용이며 최종 책임은 본인에게 있습니다.)"
                    url = f"/stock/{symbol}"
                    
                    # 그룹화 (유저 -> 토큰)
                    from collections import defaultdict
                    uid_tokens = defaultdict(list)
                    for uid, token in user_tokens:
                        if token:
                            uid_tokens[uid].append(token)
                            
                    print(f"[{symbol}] Ex-dividend is tomorrow! Sending to {sum(len(t) for t in uid_tokens.values())} devices.")
                    
                    for uid, tokens in uid_tokens.items():
                        send_multicast_notification(
                            tokens, 
                            title, 
                            body, 
                            {"url": url, "type": "dividend_alert", "is_global": "false"}, 
                            target_users=[uid]
                        )
                        
        except Exception as e:
            print(f"Error checking dividend for {symbol}: {e}")

if __name__ == "__main__":
    print(f"--- Running Dividend Alerts Script at {datetime.now()} ---")
    check_and_send_dividend_alerts()
    print("--- Finished Dividend Alerts Script ---")
