
import yfinance as yf
import json

def test_yahoo():
    codes = ["005930.KS", "010140.KS"]
    for code in codes:
        print(f"Testing Yahoo Finance for: {code}")
        try:
            ticker = yf.Ticker(code)
            # Use fast_info to avoid heavy info fetch
            price = ticker.fast_info.last_price
            prev_close = ticker.fast_info.previous_close
            print(f"Price: {price}")
            print(f"Prev Close: {prev_close}")
            if price and prev_close:
                change = (price - prev_close) / prev_close * 100
                print(f"Change: {change:+.2f}%")
        except Exception as e:
            print(f"Failed for {code}: {e}")
        print("-" * 30)

if __name__ == "__main__":
    test_yahoo()
