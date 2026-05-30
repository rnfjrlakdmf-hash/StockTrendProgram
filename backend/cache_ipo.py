import os
import json
import requests
from bs4 import BeautifulSoup

def update_ipo_cache():
    """
    DART API + AI 파싱에 사용된 Gemini API가 한도 초과(429)로 차단되었으므로,
    우선 안전하게 작동하는 네이버 금융 크롤링 캐시 방식으로 원복합니다.
    (하루 1회만 백그라운드에서 실행되므로 차단 및 상업적 이슈 최소화)
    """
    url = "https://finance.naver.com/sise/ipo.naver"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    ipo_list = []
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        html = res.content.decode('euc-kr', 'replace')
        soup = BeautifulSoup(html, 'html.parser')
        
        for r in soup.find_all('tr'):
            tds = r.find_all('td')
            if not tds: continue
            text = tds[0].text.strip()
            if not text or '공모가' not in text: continue
            
            parts = [p.strip() for p in text.split('\n') if p.strip()]
            if not parts: continue
            
            name = parts[0]
            if name.startswith('코스닥'): name = name[3:]
            elif name.startswith('코스피'): name = name[3:]
            elif name.startswith('코넥스'): name = name[3:]
            
            ipo = {
                "name": name,
                "date": "미정",
                "price": "미정",
                "band": "",
                "detail": ""
            }
            
            for i, p in enumerate(parts):
                if p == '공모가' and i+1 < len(parts): 
                    price_val = parts[i+1]
                    if '~' in price_val:
                        ipo['band'] = price_val
                        ipo['price'] = '미정'
                    else:
                        ipo['price'] = price_val
                        ipo['band'] = price_val
                if p == '개인청약' and i+1 < len(parts): ipo['date'] = parts[i+1].replace('.', '')
                if p == '주관사' and i+1 < len(parts): ipo['detail'] = parts[i+1]
                
            ipo_list.append(ipo)
            
    except Exception as e:
        print(f"[IPO Naver Cache] Crawl Error: {e}")
        return False
        
    cache_path = os.path.join(os.path.dirname(__file__), 'ipo_cache.json')
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(ipo_list, f, ensure_ascii=False, indent=4)
        
    print(f"IPO Cache Updated via Naver Fallback: {len(ipo_list)} items")
    return True

if __name__ == "__main__":
    update_ipo_cache()
