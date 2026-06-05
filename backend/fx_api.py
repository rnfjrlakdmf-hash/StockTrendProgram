import os
import requests
import datetime
from dotenv import load_dotenv

load_dotenv()

def get_exim_fx():
    """
    한국수출입은행 API를 사용하여 USD/KRW 환율(매매기준율)을 가져옵니다.
    100% 무료 공공데이터이며 하루 호출 제한이 넉넉합니다.
    """
    api_key = os.getenv("EXIM_AUTH_KEY", "")
    if not api_key:
        print("⚠️ EXIM_AUTH_KEY 가 설정되지 않았습니다. 기본값을 반환합니다.")
        return {"price": "1,350", "change": "0.00%"}
        
    url = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON"
    
    # 수출입은행은 비영업일(주말 등) 및 당일 오전 11시 이전엔 데이터를 반환하지 않을 수 있음
    # 그럴 경우 날짜를 뒤로 미루며 찾는 로직이 필요하지만, 여기서는 최신 호출로 시도
    params = {
        "authkey": api_key,
        "data": "AP01"
    }
    
    try:
        res = requests.get(url, params=params, verify=False, timeout=5)
        res.raise_for_status()
        data_list = res.json()
        
        # 데이터가 비어있을 경우 (영업일 11시 이전이거나 휴일)
        if not data_list:
            print("한국수출입은행 데이터가 비어있습니다. (비영업일이거나 오전 11시 이전)")
            return {"price": "1,350", "change": "0.00%"}
            
        for item in data_list:
            # cur_unit이 USD인 미국 달러 데이터 찾기
            if item.get("cur_unit") == "USD":
                deal_bas_r = item.get("deal_bas_r", "1,350") # 매매 기준율 (예: 1,352.50)
                # 쉼표를 제거하고 소수점 2자리로 통일할 수도 있지만, 넘어온 텍스트를 그대로 써도 좋음
                return {"price": deal_bas_r, "change": "0.00%"}
                
        print(f"달러(USD) 정보를 찾지 못했습니다.")
            
    except Exception as e:
        print(f"한국수출입은행 FX Request Error: {e}")
    
    return {"price": "1,350", "change": "0.00%"}

# auto_blog_bot.py와 scheduler_service.py에서 get_alpha_vantage_fx를 
# 이 모듈에서 가져다 쓰기 때문에, 함수 이름을 맞춰주기 위한 래퍼(Wrapper)
def get_alpha_vantage_fx():
    return get_exim_fx()
