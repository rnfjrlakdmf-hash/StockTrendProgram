import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v4.4.0 Absolute-Successor for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check Headers
    headers = data.get('raw_headers', [])
    print(f"Headers Used: {headers}")
    
    # Check PER Specifically
    per = data.get('charts', {}).get('per')
    if per:
        chart_data = per.get('chart_data', [])
        print("\nPER Chart Data Sample:")
        if chart_data:
            sample_node = chart_data[0]
            print(f"Keys: {list(sample_node.keys())}")
            
            target_name = "\ub300\uc0c1 \uc885\ubaa9" # 대상 종목
            if target_name in sample_node:
                print(f"VERIFIED: '{target_name}' (Target) FOUND in charts.")
                print(f"Value: {sample_node[target_name]}")
            else:
                print(f"FAILURE: '{target_name}' NOT FOUND. Current Keys: {list(sample_node.keys())}")
        else:
            print("FAILURE: chart_data is empty!")
    else:
        print("\nPER Data MISSING in charts!")
        
    # Check Summary Table
    if data.get('summary_table'):
        print("\nSummary Table Check:")
        for entry in data['summary_table']:
            name = entry.get('name')
            print(f"Entry Name: {name}")
            per_val = entry.get('per')
            roe_val = entry.get('roe')
            print(f"PER: {per_val}, ROE: {roe_val}")
            
            # Use part match for check
            if "대상" in name and "종목" in name:
                if per_val is not None:
                     print("VERIFIED: Target PER is successfully linked in summary table.")
                else:
                     print("FAILURE: Target PER is None in summary table.")
    else:
        print("\nFAILURE: summary_table is empty!")
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
