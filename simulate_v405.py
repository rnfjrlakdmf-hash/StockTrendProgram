import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v4.0.5 Precision-Key for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check PER specifically
    per = data.get('charts', {}).get('per')
    if per:
        chart_data = per.get('chart_data', [])
        print("\nPER Data Sample (Checking for Absolute Label Equality):")
        
        sample_node = chart_data[0]
        keys = list(sample_node.keys())
        print(f"Detected Keys: {keys}")
        
        # Absolute Equality Checks
        target_name = "\ub300\uc0c1 \uc885\ubaa9" # 대상 종목
        industry_name = "\uc5c5\uc885 \ud3c9\uade0" # 업종 평균
        
        if target_name in sample_node:
            print(f"VERIFIED: '{target_name}' (대상 종목) FOUND.")
        else:
            print(f"FAILURE: '{target_name}' NOT FOUND.")
            
        if industry_name in sample_node:
            print(f"VERIFIED: '{industry_name}' (업종 평균) FOUND.")
        else:
            print(f"FAILURE: '{industry_name}' NOT FOUND.")
            # Let's see what we actually have
            for k in keys:
                if "평균" in k:
                    print(f"Found something similar: '{k}' vs expected '{industry_name}'")

    else:
        print("\nPER Data MISSING in charts!")
        
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
