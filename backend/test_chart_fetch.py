
import sys
import os
import time

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from stock_data import get_stock_chart_data

def test_chart(symbol):
    print(f"Testing chart fetch for {symbol}...")
    try:
        data = get_stock_chart_data(symbol, period="1d", interval="5m")
        print(f"Result count: {len(data)}")
        if len(data) > 0:
            print(f"First point: {data[0]}")
            print(f"Last point: {data[-1]}")
        else:
            print("No data returned.")
    except Exception as e:
        print(f"Chart Valid Error: {e}")

if __name__ == "__main__":
    test_chart("005930.KS") # Samsung
    test_chart("AAPL")      # Apple
