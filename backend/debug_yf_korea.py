import yfinance as yf
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')

def test_korean_stock():
    symbol = "003490.KS"
    print(f"Testing {symbol}...")
    try:
        ticker = yf.Ticker(symbol)
        print("Ticker object created.")
        
        # Test 1: Info
        try:
            info = ticker.info
            print(f"Info fetched. Symbol: {info.get('symbol')}, Name: {info.get('shortName')}")
        except Exception as e:
            print(f"Info fetch failed: {e}")

        # Test 2: Fast Info
        try:
            price = ticker.fast_info.last_price
            print(f"Fast Info Price: {price}")
        except Exception as e:
            print(f"Fast Info failed: {e}")

    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    test_korean_stock()
