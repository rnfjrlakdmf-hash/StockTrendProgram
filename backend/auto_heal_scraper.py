import os
import requests
import datetime
from dart_ipo import fetch_dart_ipo_schedule

WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

def send_approval_request(error_msg, current_code_snippet, proposed_code_snippet):
    """
    반자동(Human-in-the-loop) 방식을 위해 관리자에게 알림을 보냅니다.
    """
    payload = {
        "text": f"⚠️ *[KIND 공모주 스크래퍼 장애 감지]*\n\n"
                f"*오류 내역:* {error_msg}\n"
                f"KIND의 UI가 변경되었을 가능성이 높습니다. AI가 대체 코드를 생성했습니다.\n\n"
                f"*현재 로직 (일부):*\n```python\n{current_code_snippet}\n```\n"
                f"*AI 제안 로직 (일부):*\n```python\n{proposed_code_snippet}\n```\n\n"
                f"승인하시려면 사내 어드민 페이지(또는 승인 명령어)를 통해 패치(Patch)를 수락해주세요."
    }
    
    if WEBHOOK_URL:
        try:
            requests.post(WEBHOOK_URL, json=payload, timeout=5)
            print("[Auto-Heal] 관리자에게 승인 요청 웹훅을 전송했습니다.")
        except Exception as e:
            print(f"[Auto-Heal] 웹훅 전송 실패: {e}")
    else:
        print("[Auto-Heal] WEBHOOK_URL이 설정되지 않아 로그로만 출력합니다.")
        print(payload["text"])


def run_health_check_and_heal():
    """
    정기적으로 스크래퍼의 정상 작동 여부를 확인하고, 실패 시 자동 복구 로직을 수행합니다.
    """
    print(f"[{datetime.datetime.now()}] 스크래퍼 헬스체크 시작...")
    
    # 1. 크롤러 동작 테스트
    result = fetch_dart_ipo_schedule()
    
    if len(result) > 0:
        print(f"[{datetime.datetime.now()}] 정상 작동 중입니다. (추출된 데이터: {len(result)}건)")
        return
        
    # 2. 결과가 없으면 UI 변경/에러로 간주하고 복구 로직 가동
    print(f"[{datetime.datetime.now()}] 스크래핑 실패 감지! AI 기반 분석 및 복구 절차 돌입...")
    
    # 실제 환경에서는 여기서 HTML을 새로 받고 LLM(OpenAI/Gemini)에 요청을 보냅니다.
    # [Prompt Example]
    # "다음 HTML 구조에서 회사명, 청약일정, 주관사, 희망공모가액을 파싱하는 bs4 파이썬 코드를 작성해줘."
    
    # 이 스크립트는 시뮬레이션 코드(Mock)이므로 더미 코드를 생성합니다.
    current_code = "target_table = None\nfor tbl in soup.find_all('table'):..."
    proposed_code = "target_table = soup.find('div', class_='new-ipo-list').find('table')"
    
    # 3. 반자동 방식이므로 바로 반영하지 않고 알림을 전송
    send_approval_request(
        error_msg="데이터가 반환되지 않음 (테이블 탐색 실패)",
        current_code_snippet=current_code,
        proposed_code_snippet=proposed_code
    )

if __name__ == "__main__":
    # 수동 실행용
    run_health_check_and_heal()
