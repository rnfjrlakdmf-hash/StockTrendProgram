import os
import json
import xml.etree.ElementTree as ET
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

JSON_KEY_FILE = os.path.join(os.path.dirname(__file__), "google-seo-key.json")
SITEMAP_URL = "https://stock-trend-program.co.kr/sitemap.xml"
SCOPES = ["https://www.googleapis.com/auth/indexing"]
ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"

def get_urls_from_sitemap(sitemap_url):
    """sitemap.xml에서 모든 URL을 추출합니다."""
    try:
        response = requests.get(sitemap_url, timeout=10)
        if response.status_code != 200:
            print(f"[Google Indexer] sitemap 다운로드 실패: {response.status_code}")
            return []
        
        root = ET.fromstring(response.content)
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        urls = []
        for loc in root.findall('.//ns:loc', namespace):
            if loc.text:
                urls.append(loc.text)
        
        if not urls:
            for loc in root.findall('.//loc'):
                if loc.text:
                    urls.append(loc.text)
                    
        return urls
    except Exception as e:
        print(f"[Google Indexer] sitemap 파싱 에러: {e}")
        return []

def publish_urls_to_google(urls):
    """추출한 URL들을 구글 인덱싱 API에 전송합니다."""
    if not os.path.exists(JSON_KEY_FILE):
        print(f"[Google Indexer] JSON 키 파일을 찾을 수 없습니다: {JSON_KEY_FILE}")
        return False
        
    try:
        credentials = service_account.Credentials.from_service_account_file(
            JSON_KEY_FILE, scopes=SCOPES
        )
        authed_session = AuthorizedSession(credentials)
        
        success_count = 0
        error_count = 0
        
        target_urls = urls[:200]
        
        print(f"[Google Indexer] 총 {len(urls)}개 중 {len(target_urls)}개의 URL 전송을 시작합니다...")
        
        for url in target_urls:
            content = {
                "url": url,
                "type": "URL_UPDATED"
            }
            
            response = authed_session.post(ENDPOINT, json=content)
            
            if response.status_code == 200:
                success_count += 1
            else:
                error_count += 1
                print(f"전송 실패 ({url}): {response.text}")
                
        print(f"[Google Indexer] 작업 완료! 성공: {success_count}건, 실패: {error_count}건")
        return True
        
    except Exception as e:
        print(f"[Google Indexer] 구글 API 연동 에러: {e}")
        return False

if __name__ == "__main__":
    print("=== 구글 인덱싱 봇 실행 ===")
    urls = get_urls_from_sitemap(SITEMAP_URL)
    if urls:
        publish_urls_to_google(urls)
    else:
        print("Sitemap에서 URL을 찾지 못했습니다.")
