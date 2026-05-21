
import time
import json
from korea_data import get_naver_market_dashboard
import sys
import io

# Fix encoding for windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("Starting dashboard data fetch...")
start_time = time.time()

try:
    data = get_naver_market_dashboard()
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"Fetch completed in {duration:.2f} seconds")
    
    # Check data content briefly
    print(f"Exchange count: {len(data.get('exchange', []))}")
    print(f"Sectors count: {len(data.get('top_sectors', []))}")
    if data.get('market_summary'):
        print(f"Market Summary keys: {data['market_summary'].keys()}")
        kospi = data['market_summary'].get('kospi')
        if kospi:
            print(f"KOSPI: {kospi['value']} ({kospi['change']})")
    
    # Check investor items
    inv = data.get('investor_items', {})
    print(f"Foreigner Buy count: {len(inv.get('foreigner_buy', []))}")
    
except Exception as e:
    print(f"Error fetching dashboard: {e}")
    import traceback
    traceback.print_exc()
