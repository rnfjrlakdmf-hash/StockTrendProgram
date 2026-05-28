import os
import requests
import datetime
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('DART_API_KEY')

for i in range(1, 30):
    date_str = (datetime.datetime.now() - datetime.timedelta(days=i)).strftime('%Y%m%d')
    page_no = 1
    total_pages = 1
    
    while page_no <= total_pages:
        url = f'https://opendart.fss.or.kr/api/list.json?crtfc_key={api_key}&bgn_de={date_str}&end_de={date_str}&page_count=100&page_no={page_no}'
        res = requests.get(url)
        data = res.json()
        
        if data.get('status') == '000':
            total_pages = data.get('total_page', 1)
            for item in data.get('list', []):
                if "증권신고서" in item.get('report_nm', ''):
                    print(f"FOUND in {date_str}: {item.get('corp_name')} - {item.get('report_nm')} ({item.get('rcept_no')})")
        else:
            break
        page_no += 1
