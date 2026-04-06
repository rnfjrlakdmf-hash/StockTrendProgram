import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v3.3.0 Precision-Sync for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check PER specifically
    per = data.get('charts', {}).get('per')
    if per:
        print("\nPER Data Sample (Checking for '대상 종목' label and numeric values):")
        print(json.dumps(per.get('chart_data', [])[:4], indent=2, ensure_ascii=False))
        # Verify the key is "대상 종목"
        sample_node = per.get('chart_data', [])[0]
        if "대상 종목" in sample_node:
            print("\nVERIFIED: '대상 종목' key is correct (No Mojibake).")
            print(f"Value for 2021/12: {sample_node['대상 종목']}")
        else:
            print("\nFAILURE: '대상 종목' key NOT found! (Mojibake likely).")
            print(f"Current Keys: {list(sample_node.keys())}")
    else:
        print("\nPER Data MISSING in charts!")
        
    # Check Summary Table
    if data.get('summary_table'):
        entry = data['summary_table'][0]
        print(f"\nSummary Table Entry: {entry}")
        if entry.get('per') and entry['per'] < 1000: # Sanity check for ratio vs revenue
            print("VERIFIED: PER value is a ratio (Excellent).")
        else:
            print(f"WARNING: PER value {entry.get('per')} looks like raw revenue!")
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
