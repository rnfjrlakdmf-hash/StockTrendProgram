from korea_data import get_naver_sise_data
import json

try:
    print("Fetching Naver Sise Data...")
    data = get_naver_sise_data()
    investors = data.get("investor_items", {})
    
    print("\n[Foreigner Buy]")
    print(json.dumps(investors.get("foreigner_buy"), indent=2, ensure_ascii=False))
    
    print("\n[Foreigner Sell]")
    print(json.dumps(investors.get("foreigner_sell"), indent=2, ensure_ascii=False))

    print("\n[Institution Buy]")
    print(json.dumps(investors.get("institution_buy"), indent=2, ensure_ascii=False))

    print("\n[Institution Sell]")
    print(json.dumps(investors.get("institution_sell"), indent=2, ensure_ascii=False))

except Exception as e:
    print(f"Error: {e}")
