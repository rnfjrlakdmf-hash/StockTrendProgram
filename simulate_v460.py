# -*- coding: utf-8 -*-
import logging
import json
from backend.sector_analysis import get_sector_analysis_data

logging.basicConfig(level=logging.INFO)

symbol = "005930"
print(f"--- Simulating v4.6.0 Victory-Gold for {symbol} ---")
data = get_sector_analysis_data(symbol)

if data:
    print("\nSUCCESS: Data retrieved!")
    
    # Check Headers
    headers = data.get('raw_headers', [])
    print(f"Headers Used: {headers}")
    
    # Check labels specifically
    target_label = "대상 종목"
    
    # Check PER Chart Data Sample
    per = data.get('charts', {}).get('per')
    if per:
        chart_data = per.get('chart_data', [])
        if chart_data:
            sample_node = chart_data[0]
            print(f"Keys in Chart Data: {list(sample_node.keys())}")
            if target_label in sample_node:
                print(f"VERIFIED: '{target_label}' FOUND in chart keys. Value: {sample_node[target_label]}")
            else:
                print(f"FAILURE: '{target_label}' NOT FOUND in chart keys!")
        else:
            print("FAILURE: chart_data is empty!")
    else:
        print("PER Data MISSING in charts!")
        
    # Check Summary Table
    if data.get('summary_table'):
        print("\nSummary Table Check:")
        for entry in data['summary_table']:
            name = entry.get('name')
            per_val = entry.get('per')
            roe_val = entry.get('roe')
            print(f"Entry Name: '{name}', PER: {per_val}, ROE: {roe_val}")
            
            if name == target_label:
                if per_val is not None:
                     print(f"VERIFIED: '{target_label}' PER linked in summary table.")
                else:
                     print(f"FAILURE: '{target_label}' PER is None!")
    else:
        print("FAILURE: summary_table is empty!")
else:
    print("FAILURE: get_sector_analysis_data returned None!")
