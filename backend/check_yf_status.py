
import yfinance as yf
import time

tickers = ["^GSPC", "BTC-USD", "KRW=X", "GC=F"]

print("Testing yfinance fetching...")
for symbol in tickers:
    try:
        t = yf.Ticker(symbol)
        price = 0
        try:
            price = t.fast_info.last_price
            print(f"{symbol} fast_info price: {price}")
        except Exception as e:
            print(f"{symbol} fast_info error: {e}")
            try:
                price = t.info.get('regularMarketPrice')
                print(f"{symbol} info price: {price}")
            except Exception as e2:
                print(f"{symbol} info error: {e2}")
    except Exception as e:
        print(f"{symbol} Ticker init error: {e}")
