import os
import yfinance as yf
from datetime import datetime, timedelta, date
from db_manager import get_db_connection
from firebase_config import send_push_notification

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
                
                tokens = get_users_watching_stock(symbol)
                
                if tokens:
                    title = f"💰 내일은 {name} 배당락일입니다!"
                    yield_str = f" (예상 수익률 {yield_pct:.2f}%)" if yield_pct > 0 else ""
                    body = f"오늘까지 {symbol if not symbol.isdigit() else name} 주식을 매수하셔야 이번 배당금{yield_str}을 받을 수 있습니다. 잊지 말고 체크하세요!"
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
