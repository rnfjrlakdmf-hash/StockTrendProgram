import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from rank_data import get_global_ranking

def test_live_data():
    markets = ['KOSPI', 'USA']
    categories = ['trading_volume', 'trading_amount', 'popular_search']
    
    print("=== LIVE RANKING DIAGNOSTICS ===")
    
    for m in markets:
        print(f"\n[Market: {m}]")
        for c in categories:
            print(f"  Category: {c}...")
            # We use a unique bypass or just call it (the cache is per minute, so we might hit it)
            # To bypass cache, we'd need to modify rank_data or just wait.
            # But let's see what it returns now.
            data = get_global_ranking(market=m, category=c)
            
            if not data:
                print(f"    ERROR: No data returned")
                continue
                
            print(f"    Count: {len(data)}")
            # Check first 3 items
            for i, item in enumerate(data[:3]):
                name = item.get('name', 'N/A')
                sym = item.get('symbol', 'N/A')
                price = item.get('price', 'N/A')
                change_val = item.get('change_val', 'N/A')
                change_pct = item.get('change_percent', 'N/A')
                
                print(f"    Rank {i+1}: {name} ({sym}) | Price: {price} | Val: {change_val} | Pct: {change_pct}")
                
                # Check for NaN or mismatches
                if price == 'NaN' or price == '-':
                    print(f"      !!! WARNING: BAD PRICE !!!")
                if 'NaN' in str(change_val) or 'NaN' in str(change_pct):
                    print(f"      !!! WARNING: BAD CHANGE !!!")
                
                # Manual validation check (e.g. Samsung Electronics 005930)
                if sym == '005930' and str(price).replace(',', '') not in ['75000', '74900', '75100', '206000']:
                    # If Samsung price is shown as 206,000 (SK Hynix), we have a shift bug.
                    if '206' in str(price):
                         print(f"      !!! CRITICAL: SHIFT BUG DETECTED (Samsung has Hynix price) !!!")

if __name__ == "__main__":
    test_live_data()
