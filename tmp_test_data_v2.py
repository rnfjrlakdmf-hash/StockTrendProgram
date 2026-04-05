import os
import sys
import json

# Correctly setup sys.path to include the backend directory
backend_dir = os.path.join(os.getcwd(), "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

try:
    from stock_data import gather_naver_stock_data
    from sector_analysis import get_sector_analysis_data

    def test_005930():
        print("--- Testing gather_naver_stock_data('005930') ---")
        try:
            data = gather_naver_stock_data("005930")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Error fetching stock data: {e}")
        
        print("\n--- Testing get_sector_analysis_data('005930') ---")
        try:
            sector_data = get_sector_analysis_data("005930")
            print(json.dumps(sector_data, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Error fetching sector analysis: {e}")

except ImportError as e:
    print(f"Import failed: {e}")
    # Let's list files to verify
    print(f"Directory listing for {backend_dir}:")
    print(os.listdir(backend_dir))

if __name__ == "__main__":
    test_005930()
