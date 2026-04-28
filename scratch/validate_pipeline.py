import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from korea_data import gather_naver_stock_data
from risk_analyzer import calculate_analysis_score

def validate_samsung():
    symbol = "005930"
    print(f"--- Validating {symbol} ---")
    
    # 1. Test gather_naver_stock_data
    raw = gather_naver_stock_data(symbol)
    if not raw:
        print("FAIL: gather_naver_stock_data returned None")
        return
        
    df = raw.get("detailed_financials", {})
    print(f"gather_naver_stock_data SUCCESS: {df.get('success')}")
    print(f"Metrics count: {len(df.get('full_data', {}))}")
    
    # 2. Test calculate_analysis_score
    score_res = calculate_analysis_score(symbol)
    print(f"calculate_analysis_score SUCCESS: {score_res.get('success')}")
    if score_res.get('success'):
        print(f"Score: {score_res.get('score')}")
        print(f"Raw data present: {score_res.get('raw_data') is not None}")
    else:
        print(f"Error: {score_res.get('error')}")

if __name__ == "__main__":
    validate_samsung()
