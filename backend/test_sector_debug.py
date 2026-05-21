from stock_data import get_stock_info
import sys

# Force UTF-8 output for Windows console
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

def test_sector_search():
    term = "항공화물운송과물류"
    print(f"Testing get_stock_info with '{term}'...")
    
    try:
        result = get_stock_info(term)
        if result:
            print("Success!")
            print(f"Symbol: {result.get('symbol')}")
            print(f"Name: {result.get('name')}")
            print(f"Summary: {result.get('summary')}")
        else:
            print("Result is None.")
    except Exception as e:
        print(f"Exception happened: {e}")

if __name__ == "__main__":
    test_sector_search()
