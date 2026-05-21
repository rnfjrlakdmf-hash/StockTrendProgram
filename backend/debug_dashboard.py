from korea_data import get_naver_market_dashboard
import json

try:
    data = get_naver_market_dashboard()
    print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
