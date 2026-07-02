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
            
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        header = ["날짜(YYYY-MM-DD)", "일간 조회수(PV)", "일간 순방문자(UV)"]
        
        # 3. 데이터를 'YYYY-MM' 월별로 그룹화
        from collections import defaultdict
        grouped_data = defaultdict(list)
        for r in rows:
            date_str = r[0] # "2026-06-30"
            month_key = date_str[:7] # "2026-06"
            grouped_data[month_key].append(r)
            
        # 4. 각 월별로 탭(Worksheet)을 만들거나 찾아서 데이터 기록
        for month_key, month_rows in grouped_data.items():
            try:
                sheet = spreadsheet.worksheet(month_key)
            except gspread.exceptions.WorksheetNotFound:
                # 탭이 없으면 새로 생성
                sheet = spreadsheet.add_worksheet(title=month_key, rows=100, cols=10)
            
            sheet_data = [header]
            for r in month_rows:
                sheet_data.append([r[0], r[1], r[2]])
                
            sheet.clear()
            sheet.update(values=sheet_data, range_name='A1')
            
            # 5. 시트 디자인 예쁘게 꾸미기
            sheet.freeze(rows=1)
            sheet.format('A1:C1', {
                "backgroundColor": {"red": 0.1, "green": 0.3, "blue": 0.6},
                "horizontalAlignment": "CENTER",
                "textFormat": {"foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}, "fontSize": 11, "bold": True}
            })
            if len(month_rows) > 0:
                sheet.format(f'A2:C{len(month_rows)+1}', {
                    "horizontalAlignment": "CENTER",
                    "textFormat": {"fontSize": 10}
                })
                
            # 6. 글씨가 잘리지 않도록 A~C열(0~3) 너비 고정값으로 넓게 조정
            body = {
                "requests": [
                    {
                        "updateDimensionProperties": {
                            "range": {"sheetId": sheet.id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1},
                            "properties": {"pixelSize": 150},
                            "fields": "pixelSize"
                        }
                    },
                    {
                        "updateDimensionProperties": {
                            "range": {"sheetId": sheet.id, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2},
                            "properties": {"pixelSize": 130},
                            "fields": "pixelSize"
                        }
                    },
                    {
                        "updateDimensionProperties": {
                            "range": {"sheetId": sheet.id, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3},
                            "properties": {"pixelSize": 150},
                            "fields": "pixelSize"
                        }
                    }
                ]
            }
            spreadsheet.batch_update(body)
                
        print(f"[GoogleSheets] 총 {len(rows)}일치의 데이터를 {len(grouped_data)}개의 월별 시트에 분산 동기화했습니다.")
        return True
        
    except Exception as e:
        import traceback
        print(f"[GoogleSheets-Error] 동기화 중 오류 발생: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # 단독 실행 테스트용
    sync_analytics_to_sheet()
