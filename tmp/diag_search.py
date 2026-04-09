
import sys
import os
import unicodedata

# Add backend to path
backend_path = os.path.join(os.getcwd(), "backend")
sys.path.append(backend_path)

from korea_data import search_stock_code
from stock_data import GLOBAL_KOREAN_NAMES

def simulate_search_api(q):
    q_norm = unicodedata.normalize('NFC', q.strip())
    print(f"Testing search for: '{q}'")
    
    # Simulate main.py Priority Mapping
    for ticker, ko_name in GLOBAL_KOREAN_NAMES.items():
        if q_norm == ko_name or q_norm in ko_name:
            print(f"  -> SUCCESS: Map found {ticker} for {q_norm}")
            return ticker
            
    # Simulate KR Search
    kr = search_stock_code(q_norm)
    if kr:
        print(f"  -> SUCCESS: KR search found {kr}")
        return kr
    
    print("  -> FAILED: No results")
    return None

if __name__ == "__main__":
    # Test keywords
    simulate_search_api("삼성전자")
    simulate_search_api("현대차")
    simulate_search_api("애플")
    simulate_search_api("테슬라")
    simulate_search_api("엔비디아")
    simulate_search_api("AAPL")
