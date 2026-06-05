import requests

def get_frankfurter_fx():
    """
    Frankfurter API를 사용하여 USD/KRW 환율을 가져옵니다.
    - 회원가입/API 키 불필요
    - 상업적 무제한 무료 (유럽중앙은행 ECB 오픈소스 데이터 기반)
    - 실시간 환율 반영 (주말, 야간에도 최신 종가 반환)
    """
    url = "https://api.frankfurter.app/latest?from=USD&to=KRW"
    
    try:
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        if "rates" in data and "KRW" in data["rates"]:
            rate_float = float(data["rates"]["KRW"])
            # 소수점 2자리까지 표기
            return {"price": f"{rate_float:,.2f}", "change": "0.00%"}
        else:
            print(f"Frankfurter API Rate Data Error: {data}")
            
    except Exception as e:
        print(f"Frankfurter FX Request Error: {e}")
    
    return {"price": "1,350", "change": "0.00%"}

# auto_blog_bot.py와 scheduler_service.py에서 기존 함수명으로 호출하고 있으므로 
# 함수명을 맞추기 위한 래퍼(Wrapper)
def get_alpha_vantage_fx():
    return get_frankfurter_fx()
