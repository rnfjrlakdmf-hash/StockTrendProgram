import os
import re

def patch():
    file_path = r"c:\Users\rnfjr\StockTrendProgram\backend\korea_data.py"
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. gather_naver_stock_data의 차단용 return 제거
    # gather_naver_stock_data(symbol: str): 아래의 [Commercial Bypass] return 블록을 찾아서 제거합니다.
    bypass_pattern = r"(def gather_naver_stock_data\(symbol: str\):.*?)\n\s+# \[Commercial Bypass\] KIS API 미작동 시 네이버 금융 크롤링 차단.*?after_market_data\": None\s+\}"
    
    # gather_naver_stock_data 선언부 바로 뒤로 연결되게 치환
    replacement_bypass = r"\1"
    
    # 덮어쓰기 적용 1
    content_new, count_bypass = re.subn(bypass_pattern, replacement_bypass, content, flags=re.DOTALL)
    print(f"Bypass patterns removed: {count_bypass}")

    # 2. get_korean_investment_indicators를 DART API 기반으로 덮어썼던 부분 재검증 (이미 완료했으므로 확인 차원)
    if count_bypass > 0:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content_new)
        print("Successfully patched korea_data.py for stock detail indicators!")
    else:
        print("Bypass pattern match failed. No changes made.")

if __name__ == "__main__":
    patch()
