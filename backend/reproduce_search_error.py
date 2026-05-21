
import sys
import os

# Add the backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_data import get_stock_info
import time

def test_search(symbol):
    print(f"Testing search for: {symbol}")
    try:
        start_time = time.time()
        result = get_stock_info(symbol)
        end_time = time.time()
        
        if result:
            print(f"Success! Found {result['name']} ({result['symbol']})")
            print(f"Price: {result['price']}")
            print(f"Time taken: {end_time - start_time:.2f}s")
            # print(result)
        else:
            print("Failed: Stock not found or returned None")
            
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test with Samsung Electronics (Common Korean Stock)
    test_search("005930")
    
    # Test with a made up invalid code
    # test_search("999999")
