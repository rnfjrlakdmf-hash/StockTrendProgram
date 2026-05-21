
from stock_data import get_stock_info
import json

def test_daily():
    symbol = "005930" # Samsung Electronics
    data = get_stock_info(symbol)
    
    if data:
        print(f"Stats for {data['name']} ({data['symbol']})")
        daily = data.get("daily_prices", [])
        print(f"Daily Prices Count: {len(daily)}")
        if len(daily) > 0:
            print("First 3 items:")
            print(json.dumps(daily[:3], indent=2, ensure_ascii=False))
    else:
        print("Failed to fetch data")

if __name__ == "__main__":
    test_daily()
