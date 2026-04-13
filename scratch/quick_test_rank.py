import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from rank_data import get_global_ranking

def quick_test():
    print("=== QUICK US RANKING TEST ===")
    data = get_global_ranking(market='USA', category='popular_search')
    
    if not data:
        print("ERROR: No data returned")
        return

    for item in data[:10]:
        rank = item.get('rank')
        name = item.get('name')
        symbol = item.get('symbol')
        price = item.get('price')
        change_pct = item.get('change_percent')
        change_val = item.get('change_val')
        price_krw = item.get('price_krw')
        
        print(f"{rank}. {name} ({symbol})")
        print(f"   Price: {price} ({change_pct}) | Val: {change_val} | KRW: {price_krw}")
        
        if "(Reuters)" in name or ".O" in name or ".N" in name:
            print("   !!! WARNING: Garbled Name or Reuters Code remains !!!")
            
if __name__ == "__main__":
    quick_test()
