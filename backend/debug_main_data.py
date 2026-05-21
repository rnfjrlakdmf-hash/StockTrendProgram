import sys
import os
sys.path.append(os.getcwd())
from backend.korea_data import get_naver_main_data
import json

print("Fetching Naver Main Data...")
data = get_naver_main_data()
print(json.dumps(data, indent=2, ensure_ascii=False))
