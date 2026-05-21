from stock_data import get_all_assets
import time

print("Testing get_all_assets...")
start = time.time()
assets = get_all_assets()
end = time.time()

print(f"Time taken: {end - start:.2f}s")
print(assets)
