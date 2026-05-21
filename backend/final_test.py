import sys
import os
import urllib.parse
import requests

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

def test():
    try:
        from korea_data import search_stock_code
        from global_search import search_global_ticker
        
        test_cases = ["삼성전자", "삼성", "AAPL", "Apple", "005930"]
        
        for q in test_cases:
            print(f"Testing: {q}")
            kr = search_stock_code(q)
            if kr:
                print(f"  KR Result: {kr}")
            else:
                gb = search_global_ticker(q)
                print(f"  GB Result: {gb}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
