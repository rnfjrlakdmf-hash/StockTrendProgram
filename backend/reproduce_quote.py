
import sys
import os

# Add the current directory to sys.path to ensure we can import backend modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from stock_data import get_simple_quote
import yfinance as yf

def test_quote(symbol):
    print(f"Testing {symbol}...")
    try:
        # 1. Direct yfinance check
        t = yf.Ticker(symbol)
        print(f"  [Direct] fast_info.last_price: {t.fast_info.last_price}")
        print(f"  [Direct] info.currentPrice: {t.info.get('currentPrice')}")
    except Exception as e:
        print(f"  [Direct] Error: {e}")

    # 2. Function check
    quote = get_simple_quote(symbol)
    print(f"  [Function] Result: {quote}")

if __name__ == "__main__":
    print("--- Checking KR Stock ---")
    test_quote("005930.KS") # Samsung Electronics
    
    print("\n--- Checking US Stock ---")
    test_quote("AAPL") # Apple
