import requests
import json

BASE_URL = "http://localhost:8000" # Local test
# Alternatively, I can test the functions directly if I want to avoid running a server.
# Let's test the functions directly.

import sys
import os
sys.path.append(os.path.join(os.getcwd(), "backend"))

from stock_data import gather_naver_stock_data
from sector_analysis import get_sector_analysis_data

def test_005930():
    print("--- Testing gather_naver_stock_data('005930') ---")
    data = gather_naver_stock_data("005930")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    print("\n--- Testing get_sector_analysis_data('005930') ---")
    sector_data = get_sector_analysis_data("005930")
    print(json.dumps(sector_data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_005930()
