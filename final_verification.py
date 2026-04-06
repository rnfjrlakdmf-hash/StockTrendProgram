# -*- coding: utf-8 -*-
import sys
import os
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.sector_analysis import get_sector_analysis_data
    
    symbol = "005930"
    print(f"--- Verification for {symbol} (Merge Test) ---")
    
    res = get_sector_analysis_data(symbol)
    if res.get("status") == "success":
        data = res.get("data", {})
        charts = data.get("charts", {})
        
        # Check PER chart
        per_chart = charts.get("per", {})
        if per_chart:
            chart_data = per_chart.get("chart_data", [])
            if chart_data:
                first_entry = chart_data[0]
                possible_keys = [k for k in first_entry.keys() if k != "period"]
                print(f"DEBUG: Found keys in PER chart: {possible_keys}")
                
                if "대상 종목" in possible_keys and "업종 평균" in possible_keys:
                    print("SUCCESS: Both Target and Industry found in PER chart!")
                else:
                    print(f"FAIL: Missing keys in PER chart. Found: {possible_keys}")
            else:
                print("FAIL: PER chart_data is empty.")
        else:
            print("FAIL: PER chart not found.")
            
        # Check Summary Table
        summary = data.get("summary_table", [])
        names = [r["name"] for r in summary]
        print(f"DEBUG: Summary Table Names: {names}")
        if "대상 종목" in names and "업종 평균" in names:
            print("SUCCESS: Summary Table complete.")
        else:
            print("FAIL: Summary Table incomplete.")
            
    else:
        print(f"FAIL: API error: {res}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
