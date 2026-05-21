
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_data import get_stock_info
import json

def test_samsung():
    symbol = "005930"
    print(f"Fetching {symbol}...")
    data = get_stock_info(symbol, skip_ai=True)
    
    if data:
        print("Data fetched successfully.")
        print(f"Symbol: {data.get('symbol')}")
        print(f"Price: {data.get('price')} (Type: {type(data.get('price'))})")
        print(f"Change: {data.get('change')} (Type: {type(data.get('change'))})")
        
        # Check if price is string or int
        if isinstance(data.get('price'), str):
            print("Price is String. Standard frontend logic should work if it's '55,000'.")
        else:
            print("Price is NOT String! This would crash .replace().")
            
        print("-" * 20)
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("Failed to fetch data.")

if __name__ == "__main__":
    test_samsung()
