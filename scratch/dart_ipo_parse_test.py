import os
import requests
import zipfile
import io
import re
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.getenv('DART_API_KEY')
rcept_no = "20260508000911" # 그리드위즈

url = f"https://opendart.fss.or.kr/api/document.xml?crtfc_key={api_key}&rcept_no={rcept_no}"
res = requests.get(url)

with zipfile.ZipFile(io.BytesIO(res.content)) as z:
    for filename in z.namelist():
        if filename.endswith(".xml"):
            print(f"Reading {filename}")
            xml_content = z.read(filename).decode('utf-8', errors='ignore')
            
            # extract text
            soup = BeautifulSoup(xml_content, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            
            # Simple regex search
            print("--- Snippet ---")
            idx = text.find("청약기일")
            if idx != -1:
                print(text[idx-50:idx+200])
            else:
                print("청약기일 not found.")
            
            idx2 = text.find("공모희망가액")
            if idx2 == -1:
                idx2 = text.find("희망공모가액")
            if idx2 != -1:
                print(text[idx2-50:idx2+200])
            else:
                print("희망공모가액 not found.")
            
            break
