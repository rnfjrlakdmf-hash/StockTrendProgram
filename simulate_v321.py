import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v3.2.1 SSR-Mashup for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    print(f"Charts keys: {list(data.get('charts', {}).keys())}")
    
    # Check PER specifically
    per = data.get('charts', {}).get('per')
    if per:
        print("\nPER Data Sample:")
        print(json.dumps(per.get('chart_data', [])[:2], indent=2, ensure_ascii=False))
    else:
        print("\nPER Data MISSING in charts!")
        
    # Check Summary Table
    print(f"\nSummary Table Length: {len(data.get('summary_table', []))}")
    if data.get('summary_table'):
        print(f"Sample Entry: {data['summary_table'][0]}")
else:
    print("\nFAILURE: get_sector_analysis_data returned None!")
