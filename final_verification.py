# -*- coding: utf-8 -*-
import sys
import os
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.sector_analysis import get_sector_analysis_data
    from backend.pro_analysis import get_financial_health
    
    symbol = "005930"
    print(f"--- Final Testing for {symbol} ---")
    
    # 1. Test Sector Analysis
    print("\n[1/2] Testing Sector Analysis...")
    sec_res = get_sector_analysis_data(symbol)
    if sec_res.get("status") == "success":
        data = sec_res.get("data", {})
        print("SUCCESS: Sector Analysis is 'success'")
        print(f"DEBUG: Summary Table Rows: {[r['name'] for r in data.get('summary_table', [])]}")
        # Check if Industry and Market are included
        names = [r['name'] for r in data.get('summary_table', [])]
        if "업종 평균" in names and "시장 지수" in names:
            print("SUCCESS: Industry and Market included in table")
        else:
            print(f"WARNING: Table missing comparison rows: {names}")
    else:
        print(f"FAIL: Sector Analysis failed: {sec_res}")

    # 2. Test Financial Health (The one with UnboundLocalError)
    print("\n[2/2] Testing Financial Health...")
    health_res = get_financial_health(symbol)
    if health_res.get("health_score", 0) > 0:
        print(f"SUCCESS: Financial Health Score: {health_res['health_score']}")
        charts = health_res.get("charts", {})
        if charts.get("stability") and len(charts["stability"]) > 0:
            print(f"SUCCESS: Stability charts found ({len(charts['stability'])} points)")
        else:
            print("WARNING: Financial Health charts are empty.")
    else:
        print(f"FAIL: Financial Health failed: {health_res}")

except Exception as e:
    print(f"CRITICAL ERROR during testing: {e}")
    import traceback
    traceback.print_exc()
