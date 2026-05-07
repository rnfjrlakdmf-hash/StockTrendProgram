
import sys
import os
import json

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.stock_data import get_stock_info
from backend.ai_analysis import analyze_stock

def test_full_flow(symbol):
    print(f"--- Fetching Data for {symbol} ---")
    data = get_stock_info(symbol)
    
    if not data:
        print("Failed to fetch stock info.")
        return

    print(f"Data Fetched: {data.get('name')} // Price: {data.get('price')}")
    
    print("\n--- Starting AI Analysis ---")
    try:
        # Simulate what main.py does
        result = analyze_stock(data)
        print("AI Analysis Success!")
        print("Score:", result.get('score'))
        print("Summary:", result.get('analysis_summary'))
        
        if "?ºÏãú?ÅÏù∏" in str(result.get('analysis_summary', '')):
             print("\n!!! ERROR DETECTED IN SUMMARY !!!")
             
    except Exception as e:
        print(f"\nAI Analysis Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_full_flow("005930")
