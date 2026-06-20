import requests
from bs4 import BeautifulSoup
import json
import os
import traceback
from datetime import datetime
import pytz

try:
    from firebase_config import initialize_firebase, send_topic_push, db
except ImportError:
    pass

STATE_FILE = os.path.join(os.path.dirname(__file__), 'whale_state.json')

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_state(state: dict):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Whale] Failed to save state: {e}")

def check_whale_alerts():
    """네이버 금융 외국인/기관 순매수 상위 페이지를 스크래핑하여 1위 종목 알림을 보냅니다."""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')
    
    state = load_state()
    if state.get("date") != today_str:
        state = {"date": today_str, "alerted_stocks": []}
        
    url = "https://finance.naver.com/sise/sise_deal_rank.naver"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"[Whale] Failed to fetch Naver rank: {res.status_code}")
            return
            
        res.encoding = 'euc-kr'
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # '외국인' 탭의 첫 번째 종목 찾기 (코스피 기준)
        # sise_deal_rank.naver 구조상 테이블들이 여러개 있음.
        # 첫번째 <table class="type_r1"> 가 코스피 외국인 순매수
        tables = soup.find_all('table', class_='type_r1')
        if not tables:
            print("[Whale] Could not find rank tables")
            return
            
        # 첫 번째 테이블의 첫 번째 유효한 row(tbody의 tr) 찾기
        first_table = tables[0]
        rows = first_table.find_all('tr')
        
        top_stock_name = None
        for row in rows:
            name_cell = row.find('a', class_='company')
            if name_cell:
                top_stock_name = name_cell.text.strip()
                break
                
        if not top_stock_name:
            print("[Whale] No stock name found in table")
            return
            
        # 알림 발송 조건: 아직 오늘 알림이 나가지 않은 종목일 때
        if top_stock_name not in state["alerted_stocks"]:
            title = f"🚨 [세력 포착] 외국인 폭풍 매수 1위: {top_stock_name}"
            body = "지금 장중에 외국인이 가장 많이 담고 있는 종목입니다. 실시간 수급을 확인하세요!"
            print(f"[Whale] Alert Triggered: {title}")
            
            try:
                initialize_firebase()
                send_topic_push("live_alerts", title, body, f"/stock/{top_stock_name}")
                
                if db:
                    doc_ref = db.collection('alerts').document()
                    doc_ref.set({
                        'title': title,
                        'body': body,
                        'link': f"/stock/{top_stock_name}",
                        'timestamp': datetime.now(kst),
                        'read': False
                    })
            except Exception as e:
                print(f"[Whale] Firebase push error: {e}")
                
            state["alerted_stocks"].append(top_stock_name)
            save_state(state)
            
    except Exception as e:
        print(f"[Whale] Exception: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    check_whale_alerts()
