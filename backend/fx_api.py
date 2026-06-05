import os
import requests
from dotenv import load_dotenv

load_dotenv()

def get_alpha_vantage_fx():
    """
    Alpha Vantage API를 사용하여 USD/KRW 환율을 가져옵니다.
    네이버 크롤링이나 야후 파이낸스를 대체하는 합법적인 오픈 API 방식입니다.
    """
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    if not api_key:
        print("⚠️ ALPHA_VANTAGE_API_KEY 가 설정되지 않았습니다. 기본값을 반환합니다.")
        return {"price": "1,350", "change": "0.00%"}
        
    url = f"https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=KRW&apikey={api_key}"
    try:
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        if "Realtime Currency Exchange Rate" in data:
            rate_str = data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]
            rate_float = float(rate_str)
            # 환율 변동 정보는 제공되지 않으므로 0.00%로 고정하거나 이전 종가가 필요함.
            return {"price": f"{rate_float:,.2f}", "change": "0.00%"}
        else:
            print(f"Alpha Vantage FX Rate Data Error: {data}")
            
    except Exception as e:
        print(f"Alpha Vantage FX Request Error: {e}")
    
    return {"price": "1,350", "change": "0.00%"}
