import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v4.2.0 Ironclad-Final for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check PER Specifically
    per = data.get('charts', {}).get('per')
    if per:
        chart_data = per.get('chart_data', [])
        print("\nPER Data Sample (Checking for Labels):")
        if chart_data:
            sample_node = chart_data[0]
            print(f"Keys: {list(sample_node.keys())}")
            
            # Target Label: "\ub300\uc0c1 \uc885\ubaa9"
            target_name = "\ub300\uc0c1 \uc885\ubaa9" # 대상 종목
            if target_name in sample_node:
                print(f"VERIFIED: '{target_name}' (Target) FOUND.")
                print(f"Value: {sample_node[target_name]}")
            else:
                print(f"FAILURE: '{target_name}' NOT FOUND. Current Keys: {list(sample_node.keys())}")
        else:
            print("FAILURE: chart_data is empty!")
    else:
        print("\nPER Data MISSING in charts!")
        
    # Check Summary Table
    if data.get('summary_table'):
        entry = data['summary_table'][0]
        print(f"\nSummary Table Entry: {entry}")
        # Value check
        per_val = entry.get('per')
        if per_val is not None and per_val < 1000:
             print("VERIFIED: PER in summary table is a RATIO.")
        else:
             print(f"FAILURE/WARNING: PER in summary table is {per_val}")
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
