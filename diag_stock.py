
import sys
import os

# Add backend to sys.path to import korea_data
sys.path.append(os.path.join(os.getcwd(), 'backend'))
import korea_data

def diag():
    code = "005930"
    print(f"--- Testing get_naver_stock_info for {code} ---")
    data = korea_data.get_naver_stock_info(code)
    print(f"Result (Samsung Electronics): {data}")
    
    code2 = "010140"
    print(f"\n--- Testing get_naver_stock_info for {code2} ---")
    data2 = korea_data.get_naver_stock_info(code2)
    print(f"Result (Samsung Heavy Industries): {data2}")

if __name__ == "__main__":
    diag()
