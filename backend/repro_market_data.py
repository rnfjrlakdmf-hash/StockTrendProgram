
from korea_data import get_naver_market_dashboard
import json

def test_market_data():
    data = get_naver_market_dashboard()
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_market_data()
