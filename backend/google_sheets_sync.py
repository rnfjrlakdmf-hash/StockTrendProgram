import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from db_manager import get_db_connection

# 구글 시트 API 연동 설정
SCOPE = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]

# 키 파일 경로 (상대경로)
KEY_FILE = os.path.join(os.path.dirname(__file__), 'google_sheets_key.json')
# 사용자 스프레드시트 ID
SPREADSHEET_ID = '1oxGkP7ENVyWaiIBLkqaWTeOYo9s8jb0QDku_-PWK6lU'

def sync_analytics_to_sheet():
    print("[GoogleSheets] 통계 데이터 동기화를 시작합니다...")
    
    if not os.path.exists(KEY_FILE):
        print(f"[GoogleSheets-Error] 키 파일이 없습니다: {KEY_FILE}")
        return False
        
    try:
        # 1. 인증 및 시트 연결
        creds = ServiceAccountCredentials.from_json_keyfile_name(KEY_FILE, SCOPE)
        client = gspread.authorize(creds)
        sheet = client.open_by_key(SPREADSHEET_ID).sheet1
        
        # 2. DB에서 전체 통계 데이터 가져오기 (오름차순: 옛날 데이터부터)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT date, pageviews, unique_visitors FROM site_analytics ORDER BY date ASC")
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            print("[GoogleSheets] 연동할 통계 데이터가 없습니다.")
            return True
            
        # 3. 시트에 쓸 데이터 구성 (헤더 + 데이터)
        header = ["날짜(YYYY-MM-DD)", "일간 조회수(PV)", "일간 순방문자(UV)"]
        sheet_data = [header]
        
        for r in rows:
            sheet_data.append([r[0], r[1], r[2]])
            
        # 4. 시트 내용 전체 지우고 새로 덮어쓰기 (중복 방지 및 완벽한 동기화)
        sheet.clear()
        sheet.update(values=sheet_data, range_name='A1')
        
        # 5. 시트 디자인 예쁘게 꾸미기 (포맷팅)
        # 첫 번째 행(헤더) 고정
        sheet.freeze(rows=1)
        
        # 헤더 스타일 적용 (파란색 배경, 흰색 굵은 글씨, 가운데 정렬)
        sheet.format('A1:C1', {
            "backgroundColor": {"red": 0.1, "green": 0.3, "blue": 0.6},
            "horizontalAlignment": "CENTER",
            "textFormat": {"foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}, "fontSize": 11, "bold": True}
        })
        
        # 데이터 영역 스타일 적용 (가운데 정렬)
        if len(rows) > 0:
            sheet.format(f'A2:C{len(rows)+1}', {
                "horizontalAlignment": "CENTER",
                "textFormat": {"fontSize": 10}
            })
        
        print(f"[GoogleSheets] 총 {len(rows)}일치의 데이터를 성공적으로 동기화했습니다.")
        return True
        
    except Exception as e:
        print(f"[GoogleSheets-Error] 동기화 중 오류 발생: {e}")
        return False

if __name__ == "__main__":
    # 단독 실행 테스트용
    sync_analytics_to_sheet()
