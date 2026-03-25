import subprocess
import sys

# Test the get_yf_ticker logic directly from the file if possible, or just re-implement it
def get_yf_ticker_test(symbol):
    # Same logic as in chart_analysis.py
    code = symbol
    if not (symbol.isdigit() and len(symbol) == 6):
        # We simulate the search_stock_code return if it was a known Korean name
        if symbol == "삼성전자": return "005930.KS"
        
        # Try cleaning input (e.g. 005930.KS -> 005930)
        clean = symbol.split('.')[0]
        if clean.isdigit() and len(clean) == 6:
            code = clean
    
    if not (code.isdigit() and len(code) == 6):
        return symbol # Return as is for US stocks
        
    return f"{code}.KS" # Simplify for test

def test():
    symbols = ["005930", "삼성전자", "AAPL", "000660.KS", "TSLA"]
    for s in symbols:
        ticker = get_yf_ticker_test(s)
        print(f"Input: {s} -> Ticker: {ticker}")
        
    import yfinance as yf
    print("\nFetching Apple (AAPL) 1mo history...")
    df = yf.Ticker("AAPL").history(period="1mo")
    print(f"AAPL Data Found: {not df.empty}, Rows: {len(df)}")

if __name__ == "__main__":
    test()
