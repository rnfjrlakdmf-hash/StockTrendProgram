import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import time
from backend.korea_data import search_korean_stock_symbol, refresh_stock_codes, DYNAMIC_STOCK_MAP

def test_search(keyword):
    print(f"Testing search for: '{keyword}'")
    start = time.time()
    result = search_korean_stock_symbol(keyword)
    end = time.time()
    print(f"Result: {result} (Time: {end - start:.2f}s)")
    return result

if __name__ == "__main__":
    print("Wait for background indexing (3 seconds)...")
    # Manually trigger refresh if needed, but it starts on import. 
    # Let's wait a bit to see if it populates.
    time.sleep(3) 
    print(f"DYNAMIC_STOCK_MAP size: {len(DYNAMIC_STOCK_MAP)}")
    
    # Test cases
    targets = [
        "삼성전자", # Should be in static or dynamic
        "한화오션", # User complained about this before
        "LG에너지솔루션",
        "금양", # Popular erratic stock
        "없는종목123", # Should fail
        "TIGER 미국나스닥100", # ETF
        "Kodex 레버리지" # ETF
    ]
    
    for t in targets:
        test_search(t)
        print("-" * 20)
