
import yfinance as yf
import pandas as pd

NAME_TO_TICKER = {
    "삼성전자": "005930.KS",
    "삼성중공업": "010140.KS",
    "네이버": "035420.KS",
    "카카오": "035720.KS"
}

print("Testing yfinance fetch...")
for name, ticker in NAME_TO_TICKER.items():
    print(f"Fetching {name} ({ticker})...")
    try:
        data = yf.Ticker(ticker).history(period="1mo")
        if data.empty:
            print(f"FAILED: No data for {name}")
        else:
            print(f"SUCCESS: Fetched {len(data)} rows for {name}")
            print(data.tail(1))
    except Exception as e:
        print(f"ERROR: {e}")
