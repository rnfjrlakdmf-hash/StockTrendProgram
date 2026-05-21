
from stock_data import search_yahoo_finance

def test_search(query):
    print(f"Testing search for: {query}")
    symbol = search_yahoo_finance(query)
    print(f"Result symbol: {symbol}")
    print("-" * 20)

if __name__ == "__main__":
    queries = ["어도비", "토요타", "소니", "스타벅스", "Starbucks"]
    for q in queries:
        test_search(q)
