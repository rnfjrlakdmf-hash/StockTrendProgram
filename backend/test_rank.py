from rank_data import get_realtime_top10
import time

print("Testing KR Market...")
start = time.time()
kr_data = get_realtime_top10("KR")
print(f"KR Data (Time: {time.time() - start:.2f}s):")
print(kr_data)

print("\nTesting US Market...")
start = time.time()
us_data = get_realtime_top10("US")
print(f"US Data (Time: {time.time() - start:.2f}s):")
print(us_data)
