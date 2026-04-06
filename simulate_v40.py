import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v4.0.0 Ironclad-Sync for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check PER specifically
    per = data.get('charts', {}).get('per')
    if per:
        chart_data = per.get('chart_data', [])
        print("\nPER Data Sample (Checking for Unicode Label and Ratios):")
        print(json.dumps(chart_data[:4], indent=2, ensure_ascii=False))
        
        # Verify Key
        sample_node = chart_data[0]
        # Target Label is "대상 종목"
        if "\ub300\uc0c1 \uc885\ubaa9" in sample_node or "대상 종목" in sample_node:
            print("\nVERIFIED: Target Label is CORRECT (No Mojibake).")
            # Verify Value
            val = sample_node.get("대상 종목")
            if val is not None and val < 1000:
                print(f"VERIFIED: PER value ({val}) is a RATIO (Excellent).")
            else:
                print(f"FAILURE: PER value ({val}) is NOT a ratio!")
        else:
            print(f"\nFAILURE: Target Label NOT found! Current Keys: {list(sample_node.keys())}")
    else:
        print("\nPER Data MISSING in charts!")
        
    # Check Summary Table
    if data.get('summary_table'):
        entry = data['summary_table'][0]
        print(f"\nSummary Table Entry: {entry}")
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
