import yfinance as yf
import requests

def search_global_ticker(query: str):
    """
    Search for global tickers using Yahoo Finance lookup API.
    Example: 'AAPL' -> 'AAPL', 'Tesla' -> 'TSLA', '삼성전자' -> '005930.KS' (handled by Naver first)
    """
    try:
        # 1. Clean query
        q = query.strip().upper()
        if not q: return None
        
        # 2. Try Yahoo Finance Ticker Lookup API (Fast & Direct)
        # Yahoo Finance uses this for their own autocomplete
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=5&newsCount=1"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            quotes = data.get("quotes", [])
            if quotes:
                # Filter for stocks/equities
                for quote in quotes:
                    quote_type = quote.get("quoteType", "")
                    symbol = quote.get("symbol")
                    if quote_type in ["EQUITY", "ETF"] and symbol:
                        # Success!
                        return symbol
        
        # 3. Fallback: Direct yf.Ticker validation (if query looks like a ticker)
        if q.isalpha() and 2 <= len(q) <= 5:
            try:
                t = yf.Ticker(q)
                if t.info.get("regularMarketPrice"):
                    return q
            except: pass
            
        return None
        
    except Exception as e:
        print(f"[GlobalSearch] Error for {query}: {e}")
        return None

if __name__ == "__main__":
    # Test
    print(f"Apple -> {search_global_ticker('Apple')}")
    print(f"TSLA -> {search_global_ticker('TSLA')}")
    print(f"Nvidia -> {search_global_ticker('Nvidia')}")
