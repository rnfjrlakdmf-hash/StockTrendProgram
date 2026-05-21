from stock_data import get_stock_info
import sys

# Test with Daeduck Electronics code (without .KS to test auto-append)
symbol = "353200" 
print(f"Testing symbol: {symbol}")

data = get_stock_info(symbol)

if data:
    print("Success!")
    print(f"Name: {data['name']}")
    print(f"Symbol: {data['symbol']}")
    print(f"Price: {data['price']}")
    print(f"Currency: {data['currency']}")
else:
    print("Failed to get stock info.")

print("-" * 20)

# Test with .KS explicitly
symbol_ks = "005930.KS"
print(f"Testing symbol: {symbol_ks}")
data_ks = get_stock_info(symbol_ks)
if data_ks:
    print(f"Currency: {data_ks['currency']}")
else:
    print("Failed.")
