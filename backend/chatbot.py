import os
import yfinance as yf
import re
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from dotenv import load_dotenv

# .env 파일 로드 (명시적 경로 설정)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# 환경 변수에서 Gemini API 키 로드
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
    except Exception as e:
        print(f"[ERROR] Failed to configure Gemini API in chatbot: {e}")

def get_market_context(message: str):
    """
    메시지에서 종목 코드를 찾아 기본 시세를 조회합니다.
    """
    # 1. 종목 코드 추출 (대문자 알파벳 2-5자 또는 숫자6자리.KS/KQ)
    # 영어 티커: AAPL, TSLA, BTC-USD (하이픈 포함)
    # 한국 티커: 005930.KS, 035420.KQ
    potential_tickers = re.findall(r'\b[A-Z]{2,5}\b|\b\d{6}\.[A-Z]{2}\b', message.upper())
    
    # 중복 제거
    tickers = set(potential_tickers)
    # 의미 없는 단어 필터링 (간단하게)
    ignore_list = {"THE", "WHO", "HOW", "WHY", "WHAT", "WHEN", "IS", "ARE", "WAS", "WERE", "DO", "DOES", "DID", "CAN", "COULD", "SHOULD", "WOULD", "MAY", "MIGHT", "MUST", "HAVE", "HAS", "HAD", "BUY", "SELL", "HOLD", "YES", "NO"}
    valid_tickers = [t for t in tickers if t not in ignore_list]

    context = ""
    for ticker in valid_tickers:
        try:
            stock = yf.Ticker(ticker)
            # fast_info 사용이 더 빠름
            info = stock.fast_info
            price = info.last_price
            prev_close = info.previous_close
            
            if price and prev_close:
                change = price - prev_close
                pct = (change / prev_close) * 100
                context += f"[{ticker}] Price: {price:.2f}, Change: {change:+.2f} ({pct:+.2f}%)\n"
        except:
            pass
            
    return context

def chat_with_ai(message: str) -> str:
    if not API_KEY:
        return "죄송합니다. Gemini API 키가 설정되지 않아 답변할 수 없습니다. .env 파일을 확인해주세요."

    # 1. 텍스트에서 종목 정보 조회 (Context Injection)
    market_context = get_market_context(message)
    
    # 2. 시스템 프롬프트 구성
    system_prompt = f"""
    당신은 월스트리트 출신의 친절하고 유머러스한 'AI 주식 상담사'입니다.
    사용자의 주식 투자 관련 질문에 대해 전문적이면서도 쉽게 이해할 수 있도록 답변하세요.
    
    [현재 파악된 시장 데이터]
    (이 데이터는 실시간 yfinance 조회 결과입니다. 답변 시 이 수치를 적극 활용하세요.)
    {market_context}

    지침:
    1. 사용자가 특정 종목(예: 삼성전자, 테슬라)을 언급했으나 위 '시장 데이터'에 없다면, "실시간 가격 정보를 가져오지 못했지만..." 하고 일반적인 지식을 기반으로 답변하세요.
    2. 매수/매도 추천을 직접적으로 하지 마세요. 대신 "현재 상황은 ~하므로 긍정적/부정적으로 보입니다" 정도로 의견을 제시하세요.
    3. 답변은 한국어로, 친근한 말투(해요체)로 작성하세요. 적절한 이모지를 사용하세요.
    4. 너무 길지 않게 핵심만 3~4문장 내외로 답변하세요.
    """

    try:
        # 모델 설정 (Gemini Flash 사용)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # 채팅 세션 시작 (히스토리는 유지하지 않음, 단발성 질문 처리)
        # 만약 히스토리가 필요하면 chat = model.start_chat() 사용
        # 여기선 간단히 generate_content 사용
        
        full_prompt = f"{system_prompt}\n\n사용자 질문: {message}"
        
        response = model.generate_content(full_prompt)
        return response.text
        
    except Exception as e:
        print(f"Chatbot Error: {e}")
        return f"죄송합니다. 잠시 생각할 시간이 필요해요. (오류: {str(e)})"
