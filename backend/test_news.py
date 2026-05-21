import yfinance as yf
import json

def fetch_yfinance_news(symbol):
    print(f"Fetching news for {symbol} via yfinance...")
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news
        print(f"Found {len(news)} news items.")
        return news
    except Exception as e:
        print(f"Error: {e}")
        return []

print("--- Testing US Stock (AAPL) ---")
us_news = fetch_yfinance_news("AAPL")
if us_news:
    print(json.dumps(us_news[0], indent=2))

print("\n--- Testing KR Stock (005930.KS) ---")
kr_news = fetch_yfinance_news("005930.KS")
if kr_news:
    print(json.dumps(kr_news[0], indent=2))
