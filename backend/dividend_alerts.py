import os
import yfinance as yf
from datetime import datetime, timedelta, date
from db_manager import get_db_connection
from firebase_config import send_push_notification

def get_us_stocks_from_watchlist():
    """Retrieve all unique US stock tickers from user watchlists."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT symbol FROM watchlist")
    rows = cursor.fetchall()
    conn.close()
    
    # Filter for US stocks (alphabetic tickers like AAPL, TSLA)
    us_stocks = [row[0] for row in rows if row[0] and not row[0].isdigit()]
    return us_stocks

def get_users_watching_stock(symbol: str):
    """Get FCM tokens of users watching a specific stock."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Join watchlist with fcm_tokens to get device tokens
    query = """
        SELECT f.token 
        FROM watchlist w
        JOIN fcm_tokens f ON w.user_id = f.user_id
        WHERE w.symbol = ?
    """
    cursor.execute(query, (symbol,))
    tokens = [row[0] for row in cursor.fetchall() if row[0]]
    conn.close()
    
    # Return unique tokens
    return list(set(tokens))

def check_and_send_dividend_alerts():
    us_stocks = get_us_stocks_from_watchlist()
    print(f"Checking dividend schedules for {len(us_stocks)} US stocks in watchlists...")
    
    # Calculate "tomorrow" in US date (roughly KST tomorrow as well for simplicity)
    tomorrow = date.today() + timedelta(days=1)
    
    for symbol in us_stocks:
        try:
            t = yf.Ticker(symbol)
            cal = t.calendar
            
            if not cal:
                continue
                
            ex_div_date = cal.get('Ex-Dividend Date')
            
            # Check if ex-dividend date is strictly tomorrow
            if ex_div_date and ex_div_date == tomorrow:
                # We have a match! Fetch stock info for the notification
                info = t.info
                name = info.get('shortName') or symbol
                yield_pct = info.get('dividendYield', 0) * 100
                
                # Find all users who favorited this stock
                tokens = get_users_watching_stock(symbol)
                
                if tokens:
                    title = f"💰 내일은 {name} 배당락일입니다!"
                    yield_str = f" (예상 수익률 {yield_pct:.2f}%)" if yield_pct > 0 else ""
                    body = f"오늘까지 {symbol} 주식을 매수하셔야 이번 배당금{yield_str}을 받을 수 있습니다. 잊지 말고 체크하세요!"
                    url = f"https://stock-trend-program.co.kr/stock/{symbol}"
                    
                    print(f"[{symbol}] Ex-dividend is tomorrow! Sending to {len(tokens)} devices.")
                    
                    for token in tokens:
                        send_push_notification(token, title, body, url)
                        
        except Exception as e:
            print(f"Error checking dividend for {symbol}: {e}")

if __name__ == "__main__":
    print(f"--- Running Dividend Alerts Script at {datetime.now()} ---")
    check_and_send_dividend_alerts()
    print("--- Finished Dividend Alerts Script ---")
