
import sys
import os
import time

# Add backend directory to path
sys.path.append(os.path.abspath("backend"))

from korea_data import search_korean_stock_symbol, DYNAMIC_STOCK_MAP

def test_dynamic_search():
    print("Waiting for background indexing (Max 60s)...")
    # Poll for indexing completion (expect > 3000 stocks)
    for i in range(30):
        if len(DYNAMIC_STOCK_MAP) > 3000:
            break
        print(f"Indexing... ({len(DYNAMIC_STOCK_MAP)} stocks)")
        time.sleep(2)
        
    time.sleep(2) # Extra buffer
    
    print(f"Dynamic Map Size: {len(DYNAMIC_STOCK_MAP)}")
    

    # Expanded Test Cases
    test_cases = [
        "한화오션",   # Manual Map
        "삼성전자",   # Dynamic Map (Top Cap)
        "비트컴퓨터", # Likely Fallback Crawl (Small Cap)
        "안랩",       # KOSDAQ
        "한화오션",     # Case 1: Manual Map (Should be instant)
        "삼성전자",     # Case 2: Dynamic Map Top Cap (Should be instant)
        "비트컴퓨터",   # Case 3: Small Cap (Likely Crawl or Dynamic lower end? Let's see)
        "사피엔반도체", # Case 4: Recent IPO or very small (Tests Crawl Fallback)
        "미국 USD",     # Case 5: FX / Keyword (Might fail or be handled elsewhere? Just checking)
    ]
    
    print(f"Dynamic Map Size (approx): {len(DYNAMIC_STOCK_MAP)}")
    
    for tc in test_cases:
        print(f"\n--- Testing: {tc} ---")
        symbol = search_korean_stock_symbol(tc)
        if symbol:
            print(f"✅ Result: {symbol}")
        else:
            print(f"❌ Result: Not Found")
            
    print("\nTest Complete.")


if __name__ == "__main__":
    test_dynamic_search()
