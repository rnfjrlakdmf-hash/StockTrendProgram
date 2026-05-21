import sys
import os

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from stock_data import get_stock_info, search_yahoo_finance, GLOBAL_KOREAN_NAMES

def test_global_search():
    print("=== Testing Global Search ===")
    keyword = "Apple"
    print(f"Searching for '{keyword}'...")
    
    # 1. Test direct search helper
    symbol = search_yahoo_finance(keyword)
    print(f"Yahoo Search Result: {symbol}")
    
    if symbol == "AAPL":
        print("PASS: Correctly found AAPL")
    else:
        print(f"FAIL: Expected AAPL, got {symbol}")

    # 2. Test get_stock_info integration
    print(f"\nFetching Info for '{keyword}' via get_stock_info...")
    info = get_stock_info(keyword)
    
    if info:
        print(f"Found: {info['name']} ({info['symbol']})")
        print(f"Price: {info['price']} {info['currency']}")
        print(f"Price KRW: {info.get('price_krw')}")
        
        expected_name = GLOBAL_KOREAN_NAMES.get("AAPL")
        if info['name'] == expected_name:
             print(f"PASS: Name mapped to Korean '{expected_name}'")
        else:
             print(f"WARN: Name '{info['name']}' != '{expected_name}'")
             
        if info['symbol'] == "AAPL":
             print("PASS: Symbol is AAPL")
        else:
             print("FAIL: Symbol mismatch")
    else:
        print("FAIL: No info returned")


def test_kosdaq_search():
    print("\n=== Testing KOSDAQ Search ===")
    # EcoPro Code: 086520 (KOSDAQ)
    keyword = "086520" 
    print(f"Fetching Info for '{keyword}'...")
    
    info = get_stock_info(keyword)
    
    if info:
        print(f"Found: {info['name']} ({info['symbol']})")
        print(f"Market Type Fix Check: {info['symbol']}")
        
        if info['symbol'].endswith('.KQ'):
            print("PASS: Symbol suffix corrected to .KQ")
        else:
            print(f"FAIL: Symbol suffix is {info['symbol']}, expected .KQ")
            
        print(f"Summary: {info.get('summary')[:30]}...")
    else:
        print("FAIL: No info returned for 086520")

if __name__ == "__main__":
    test_global_search()
    test_kosdaq_search()
