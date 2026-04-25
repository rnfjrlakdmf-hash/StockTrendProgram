import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from risk_analyzer import calculate_analysis_score
import json

def diagnostic(symbol):
    print(f"--- Diagnosing {symbol} ---")
    result = calculate_analysis_score(symbol)
    print(f"Success: {result.get('success')}")
    if not result.get('success'):
        print(f"Error: {result.get('error')}")
    else:
        print(f"Score: {result.get('score')}")
        print(f"Raw Data Keys: {list(result.get('raw_data', {}).keys())}")
        # print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    diagnostic("005930") # Samsung
    diagnostic("000660") # SK Hynix
