import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_message(message: str):
    """텔레그램 채널로 메시지를 전송합니다."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram Bot] 토큰이나 채널 ID가 설정되지 않아 발송을 건너뜁니다.")
        return False
        
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("[Telegram Bot] 메시지 발송 성공!")
            return True
        else:
            print(f"[Telegram Bot] 발송 실패: {response.text}")
            return False
    except Exception as e:
        print(f"[Telegram Bot] 에러 발생: {e}")
        return False

def generate_morning_briefing():
    """아침 브리핑 텍스트 생성 (컴플라이언스 준수/비용 0원 버전)"""
    message = (
        "🌅 <b>[스톡 트렌드] 오늘의 증시 모닝 브리핑</b>\n\n"
        "간밤 글로벌 증시 동향과 오늘 국내 시장의 주요 체크 포인트를 확인하세요.\n\n"
        "💡 <b>오늘 시장을 움직일 주요 이슈는?</b>\n"
        "매일 아침 업데이트되는 객관적인 증시 일정과 테마 동향 리포트를\n"
        "장 시작 전에 미리 팩트 체크하시기 바랍니다.\n\n"
        "👇 <b>실시간 AI 시장 분석 리포트 보러가기</b>\n"
        "https://stock-trend-program.co.kr/discovery"
    )
    return message

def generate_closing_summary():
    """장 마감 요약 텍스트 생성 (컴플라이언스 준수/비용 0원 버전)"""
    message = (
        "📈 <b>[스톡 트렌드] 오늘 장 마감 시황 브리핑 업데이트!</b>\n\n"
        "오늘 코스피/코스닥 시장의 주요 수급 현황과 테마 동향 리포트가 업로드 되었습니다.\n\n"
        "오늘 외국인과 기관은 어떤 섹터에 돈을 넣었을까요?\n"
        "시장을 움직인 진짜 돈의 흐름을 팩트 체크해보세요!\n\n"
        "👇 <b>객관적인 시장 데이터 분석 리포트 무료로 확인하기</b>\n"
        "https://stock-trend-program.co.kr/signals"
    )
    return message

if __name__ == "__main__":
    # 테스트 실행
    print("텔레그램 발송 테스트를 시작합니다...")
    msg = generate_closing_summary()
    send_telegram_message(msg)
