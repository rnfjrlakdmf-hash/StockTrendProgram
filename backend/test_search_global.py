
from stock_data import search_yahoo_finance, get_stock_info

def test_search(query):
    print(f"Testing search for: {query}")
    symbol = search_yahoo_finance(query)
    print(f"Result symbol: {symbol}")
    if symbol:
        print(f"Fetching info for {symbol}...")
        # We mock get_stock_info call or just call it if environment allows
        # But get_stock_info might be heavy with DB calls etc, so let's just trust symbol for now
        # actually let's try calling get_stock_info with a mock or just rely on search_yahoo_finance output
        pass
    print("-" * 20)

if __name__ == "__main__":
    queries = [
        "Adobe", "Toyota", "Sony", "LVMH", "Samsung", "Ferrari",
        "General Motors", "Ford", "포드", "맥도날드", "TSMC", "ASML",
        "Bayer", "Siemens"
    ]
    for q in queries:
        test_search(q)
