
from stock_data import get_stock_info
import sys
import io

# Windows console encoding fix
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

def test_integration():
    symbol = "005930"
    print(f"Fetching info for {symbol}...")
    data = get_stock_info(symbol)
    
    if not data:
        print("Data is None!")
        return

    print(f"Name: {data.get('name')}")
    
    prices = data.get('daily_prices', [])
    print(f"Daily Prices Count: {len(prices)}")
    if not prices:
        print("Daily Prices Missing in Integration Test!")
        
    news = data.get('news', [])
    print(f"News Count: {len(news)}")
    if not news:
        print("News Missing in Integration Test (Expected per code analysis)")

if __name__ == "__main__":
    test_integration()
