
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from stock_data import get_stock_info
    import traceback
    import json

    print("--- [DEBUG] Testing '?ºÏÑ±?ÑÏûê' (Auto-resolve) ---")
    try:
        # Simulate exactly what the API does
        result = get_stock_info("?ºÏÑ±?ÑÏûê", skip_ai=True)
        
        if result:
            print("[SUCCESS] Data fetched:")
            # Print specifically the fields that might cause frontend crashes
            print(json.dumps({
                "symbol": result.get('symbol'),
                "price": result.get('price'),
                "details": result.get('details'),
                "financials": result.get('financials')
            }, indent=2, ensure_ascii=False))
            
            # Type check critical fields for frontend
            details = result.get('details', {})
            print(f"Type check - market_cap: {type(details.get('market_cap'))}")
            print(f"Type check - per: {type(details.get('pe_ratio'))}")
        else:
            print("[FAILURE] No data returned (None)")
            
    except Exception as e:
        print(f"[CRITICAL ERROR] Execution failed:")
        traceback.print_exc()

    print("\n--- [DEBUG] Testing '005930.KS' (Direct Code) ---")
    try:
        result = get_stock_info("005930.KS", skip_ai=True)
        if result:
            print("[SUCCESS] Data fetched for code.")
        else:
            print("[FAILURE] No data for code.")
    except Exception as e:
        traceback.print_exc()

except ImportError as e:
    print(f"Import Error: {e}")
    # Fallback to run from root if backend import fails
