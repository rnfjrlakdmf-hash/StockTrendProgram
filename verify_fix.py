import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from stock_data import get_simple_quote

def test_korean_stock():
    symbol = "005930.KS" # Samsung Electronics
    print(f"Testing {symbol}...")
    try:
        quote = get_simple_quote(symbol)
        print("Result:", quote)
        
        if quote and quote.get('price') and quote.get('price') != '0' and quote.get('price') != '-':
            print("SUCCESS: Got valid price from Naver (or fallback)")
        else:
            print("FAILURE: returned invalid data")
            
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    test_korean_stock()
