from backend.portfolio_analysis import analyze_portfolio_factors, analyze_portfolio_nutrition, get_dividend_calendar
import json

def test_repro():
    print("Testing Portfolio Analysis with mixed inputs...")
    
    # Mix of formats that might come from frontend/KIS
    symbols = ["005930", "005930.KS", "000660", "AAPL"] 
    
    print("\n[1. Nutrition]")
    try:
        nut = analyze_portfolio_nutrition(symbols)
        print(json.dumps(nut, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Nutrition Check Failed: {e}")

    print("\n[2. Factors]")
    try:
        factors = analyze_portfolio_factors(symbols)
        print(json.dumps(factors, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Factors Check Failed: {e}")

    print("\n[3. Calendar]")
    try:
        cal = get_dividend_calendar(symbols)
        print(json.dumps(cal, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Calendar Check Failed: {e}")

if __name__ == "__main__":
    test_repro()
