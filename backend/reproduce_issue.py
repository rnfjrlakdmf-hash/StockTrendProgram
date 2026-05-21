
from korea_data import search_korean_stock_symbol

def test_search():
    keyword = "한화오션"
    print(f"Searching for {keyword}...")
    symbol = search_korean_stock_symbol(keyword)
    print(f"Result: {symbol}")

    if symbol:
        print("Scraping SUCCESS")
    else:
        print("Scraping FAILED")

if __name__ == "__main__":
    test_search()
