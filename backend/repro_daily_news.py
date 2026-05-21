
from korea_data import get_naver_daily_prices, get_naver_stock_info
import sys

# Windows console encoding fix
import io
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

def test_fetch():
    print("Testing Daily Prices for 005930...")
    prices = get_naver_daily_prices("005930")
    print(f"Daily Prices Count: {len(prices)}")
    if prices:
        print(f"Sample: {prices[0]}")
    else:
        print("Daily Prices Empty!")

    print("\nTesting Stock Info for 005930...")
    info = get_naver_stock_info("005930")
    print(f"Info: {info}")

if __name__ == "__main__":
    test_fetch()
