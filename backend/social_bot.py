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
    """아침 브리핑 텍스트 생성 (예시)"""
    message = (
        "🌅 <b>[스톡 트렌드] 오늘의 모닝 브리핑</b>\n\n"
        "간밤 미국 증시에서 AI 반도체 섹터가 강세를 보였습니다.\n"
        "오늘 국내 시장에서도 <b>#HBM #반도체장비</b> 테마의 수급 집중이 예상됩니다.\n\n"
        "💡 <b>오늘 주목해야 할 테마 & 종목</b>\n"
        "1️⃣ 엔비디아 관련주 (SK하이닉스, 한미반도체)\n"
        "2️⃣ 전력 설비 관련주 (LS일렉트릭, HD현대일렉트릭)\n\n"
        "👇 <b>장 시작 전, 실시간 AI 테마 분석 보러가기</b>\n"
        "https://stock-trend-program.co.kr/discovery"
    )
    return message

def generate_closing_summary():
    """장 마감 요약 텍스트 생성 (예시)"""
    message = (
        "📈 <b>[스톡 트렌드] 오늘 장 특징주 마감 요약</b>\n\n"
        "오늘 코스피/코스닥 시장을 뜨겁게 달군 특징주들을 확인하세요!\n\n"
        "🔥 <b>실시간 검색 상위 랭킹 TOP 3</b>\n"
        "1. 삼양식품 (어닝 서프라이즈 기대감)\n"
        "2. 알테오젠 (외국인 대량 매수 포착)\n"
        "3. 현대차 (인도 법인 IPO 추진)\n\n"
        "👇 <b>내일 급등이 예상되는 종목 시그널 확인하기</b>\n"
        "https://stock-trend-program.co.kr/signals"
    )
    return message

if __name__ == "__main__":
    # 테스트 실행
    print("텔레그램 발송 테스트를 시작합니다...")
    msg = generate_closing_summary()
    send_telegram_message(msg)
