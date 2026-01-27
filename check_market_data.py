import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from korea_data import get_naver_market_index_data

def check_data():
    print("Fetching Naver Market Data...")
    data = get_naver_market_index_data()
    
    # Check for Dollar Index
    print("\n[World Exchange]")
    found_dxy = False
    if "world_exchange" in data:
        for item in data["world_exchange"]:
            if "달러" in item["name"] or "Index" in item["name"]:
                print(f"Found: {item}")
                if "달러" in item["name"] and "인덱스" in item["name"]:
                    found_dxy = True
    
    if not found_dxy:
        print("Dollar Index NOT found in World Exchange.")

    # Check for Interest Rates
    print("\n[Interest]")
    if "interest" in data:
        for item in data["interest"]:
            print(f"Index: {item}")

if __name__ == "__main__":
    check_data()
