
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_data import get_stock_info
import json

def test_stock_fetch(symbol):
    print(f"Fetching data for {symbol}...")
    try:
        data = get_stock_info(symbol)
        if data:
            print("Successfully fetched data:")
            # Print a summary of the data
            print(f"Name: {data.get('name')}")
            print(f"Price: {data.get('price')}")
            print(f"Summary: {data.get('summary')}")
            
            if "일시적인 오류" in str(data):
                print("!!! PREDICTED ERROR STRING FOUND IN DATA !!!")
        else:
            print("Failed to fetch data (Returned None)")
    except Exception as e:
        print(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()

def test_chart_data(symbol):
    print(f"Fetching chart data for {symbol}...")
    try:
        from stock_data import get_stock_chart_data
        data = get_stock_chart_data(symbol)
        print(f"Chart data points: {len(data)}")
        if len(data) > 0:
            print(f"Sample: {data[0]}")
    except Exception as e:
        print(f"Chart Exception: {e}")

if __name__ == "__main__":
    test_stock_fetch("005930")
    
    print("\n--- Direct Naver Stock Info Test ---")
    from korea_data import get_naver_stock_info
    try:
        n_info = get_naver_stock_info("005930.KS")
        print(f"Naver Info Direct Result: {n_info}")
    except Exception as e:
        print(f"Naver Info Direct Error: {e}")
