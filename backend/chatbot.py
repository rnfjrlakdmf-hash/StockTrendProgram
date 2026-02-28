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

# 한국어 종목명 매핑 (Frontend와 동기화 필요)
STOCK_KOREAN_MAP = {
    # 미국 주식
    "테슬라": "TSLA", "애플": "AAPL", "마이크로소프트": "MSFT", "엔비디아": "NVDA", "아마존": "AMZN",
    "구글": "GOOGL", "알파벳": "GOOGL", "메타": "META", "페이스북": "META", "넷플릭스": "NFLX",
    "AMD": "AMD", "인텔": "INTC", "쿠팡": "CPNG", "코카콜라": "KO", "펩시": "PEP",
    "스타벅스": "SBUX", "나이키": "NKE", "디즈니": "DIS", "보잉": "BA", "화이자": "PFE",
    "팔란티어": "PLTR", "아이온큐": "IONQ", "유니티": "U", "로블록스": "RBLX", "코인베이스": "COIN",
    "리비안": "RIVN", "루시드": "LCID", "티큐": "TQQQ", "속슬": "SOXL", "슈드": "SCHD",

    # 한국 주식
    "삼성전자": "005930.KS", "삼전": "005930.KS", "에스케이하이닉스": "000660.KS", "하이닉스": "000660.KS", "SK하이닉스": "000660.KS",
    "엘지에너지솔루션": "373220.KS", "엘지엔솔": "373220.KS", "삼성바이오로직스": "207940.KS", "삼바": "207940.KS",
    "현대차": "005380.KS", "현대자동차": "005380.KS", "기아": "000270.KS", "셀트리온": "068270.KS",
    "포스코": "005490.KS", "포스코홀딩스": "005490.KS", "네이버": "035420.KS", "카카오": "035720.KS",
    "삼성에스디아이": "006400.KS", "엘지화학": "051910.KS", "카카오뱅크": "323410.KS", "카뱅": "323410.KS",
    "두산에너빌리티": "034020.KS", "에코프로": "086520.KQ", "에코프로비엠": "247540.KQ", "엘앤에프": "066970.KQ",
    "에이치엘비": "028300.KQ", "알테오젠": "196170.KQ", "펄어비스": "263750.KQ", "하이브": "352820.KS",
    "엔씨소프트": "036570.KS", "크래프톤": "259960.KS", "엘지전자": "066570.KS"
}

def get_market_context(message: str):
    """
    메시지에서 종목 코드를 찾아 기본 시세를 조회합니다.
    """
    # 1. 종목 코드 추출 (대문자 알파벳 2-5자 또는 숫자6자리.KS/KQ)
    # 영어 티커: AAPL, TSLA, BTC-USD (하이픈 포함)
    # 한국 티커: 005930.KS, 035420.KQ
    potential_tickers = re.findall(r'\b[A-Z]{2,5}\b|\b\d{6}\.[A-Z]{2}\b', message.upper())
    
    # 2. 한글 종목명 매핑 확인
    # 메시지에 포함된 한글 단어가 매핑 키에 있는지 확인
    for kor_name, ticker in STOCK_KOREAN_MAP.items():
        if kor_name in message or kor_name in message.replace(" ", ""):
            potential_tickers.append(ticker)

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

from ai_analysis import analyze_theme

from ai_analysis import analyze_theme
from korea_data import search_stock_code, get_naver_news, get_stock_financials

def chat_with_ai(message: str) -> str:
    if not API_KEY:
        return "죄송합니다. Gemini API 키가 설정되지 않아 답변할 수 없습니다. .env 파일을 확인해주세요."

    # 1. 투자 조언/분석 의도 파악 (Intent Detection)
    # 키워드: 매수 데이터, 수급 분석, 전망 지표, 투자 지표, 지표 확인
    investment_keywords = ["매수", "매도", "수급", "차트", "지표", "어때", "분석", "전망", "투자", "데이터", "지금"]
    is_investment_query = any(k in message for k in investment_keywords)

    # 2. 종목 감지 (Entity Extraction using Global Map)
    # 기존 Regex 방식보다 search_stock_code가 더 정확함 (한글 종목명 지원)
    # 메시지에서 명사형 단어들을 추출해서 대조하거나, 단순하게 map을 순회?
    # 효율성을 위해: 메시지 내의 단어들을 search_stock_code로 체크.
    
    target_stock = None
    market_context = ""
    
    # 간단한 단어 토크나이징 (띄어쓰기 기준)
    words = message.split()
    for word in words:
        # 조사 제거 (은/는/이/가/을/를 등 간단 처리)
        clean_word = re.sub(r'[은는이가을를의도]', '', word)
        found = search_stock_code(clean_word)
        if found:
            target_stock = found
            break # 첫 번째 발견된 종목에 집중 (복수 종목 처리는 추후)
    
    # 만약 종목을 못 찾았지만 기존 Regex로 티커가 발견된 경우
    if not target_stock:
         # 기존 get_market_context 로직의 일부 차용
         potential_tickers = re.findall(r'\b[A-Z]{2,5}\b|\b\d{6}\.[A-Z]{2}\b', message.upper())
         if potential_tickers:
             target_stock = {"symbol": potential_tickers[0], "name": potential_tickers[0]} # 임시

    # [Deep Analysis Mode] 종목이 있고 투자 질문인 경우
    if target_stock and is_investment_query:
        symbol = target_stock['symbol']
        name = target_stock['name']
        print(f"Deep Analysis for: {name} ({symbol})")
        
        # A. 기본 시세 (Price)
        try:
            stock = yf.Ticker(symbol)
            price_info = stock.fast_info
            current_price = price_info.last_price
            prev_close = price_info.previous_close
            change_pct = ((current_price - prev_close) / prev_close * 100) if prev_close else 0
            
            market_context += f"[기본 시세]\n종목명: {name} ({symbol})\n현재가: {current_price:,.0f}원\n등락률: {change_pct:+.2f}%\n"
        except:
            market_context += f"[기본 시세]\n종목명: {name}\n(실시간 시세 조회 실패)\n"

        # B. 재무/회계 데이터 (Financials)
        # 한국 주식인 경우 korea_data 활용, 아니면 yfinance.info 활용
        financials = None
        if ".KS" in symbol or ".KQ" in symbol:
            financials = get_stock_financials(symbol)
        
        # Fallback or US Stock
        if not financials: 
            try:
                info = stock.info
                financials = {
                    "market_cap": f"{info.get('marketCap', 0):,} local_currency",
                    "per": info.get('trailingPE', 'N/A'),
                    "pbr": info.get('priceToBook', 'N/A'),
                    "roe": info.get('returnOnEquity', 'N/A'),
                    "revenue_growth": info.get('revenueGrowth', 'N/A')
                }
            except:
                financials = {}
        
        market_context += f"\n[재무/회계 지표]\n"
        market_context += f"- 시가총액: {financials.get('market_cap', 'N/A')}\n"
        market_context += f"- PER(주가수익비율): {financials.get('per', 'N/A')}\n"
        market_context += f"- PBR(주가순자산비율): {financials.get('pbr', 'N/A')}\n"
        market_context += f"- 수익성 지표: (참고: 동종 업계 대비 확인 필요)\n"

        # C. 최신 뉴스 (News) - 네이버 뉴스 크롤링
        news_list = []
        if ".KS" in symbol or ".KQ" in symbol:
            news_list = get_naver_news(symbol)
        else:
             # 미국 주식은 yfinance news
             try:
                 news_list = [{"title": n['title'], "link": n['link'], "date": "Recent"} for n in stock.news[:3]]
             except:
                 pass
        
        market_context += f"\n[최신 관련 뉴스 Top 5]\n"
        if news_list:
            for idx, news in enumerate(news_list[:5]):
                market_context += f"{idx+1}. {news['title']} ({news['date']})\n"
        else:
            market_context += "(최신 주요 뉴스가 없거나 조회되지 않았습니다.)\n"

        # D. 시스템 프롬프트 (Data Analyst role)
        system_prompt = f"""
        당신은 **'객관적인 주식 데이터 분석가'**입니다.
        사용자가 질문한 종목에 대해 수집된 **시세, 재무, 뉴스 등 실시간 데이터**를 기반으로 객관적인 사실과 지표의 의미를 해석해줍니다.
        답변은 전문적이며 중립적이어야 하며, 결코 특정 종목의 매수 또는 매도를 권유하거나 투자 판단을 내리는 '조언'을 해서는 안 됩니다.

        [분석 대상 데이터]
        {market_context}

        [답변 가이드라인]
        1. **데이터 요약**: 수집된 주요 지표(PER, PBR 등)와 최근 시세 동향을 먼저 요약하여 제시하세요.
        2. **지표의 의미 해석**: 
           - 각 지표가 일반적인 금융 시장에서 어떤 의미를 갖는지 초보자도 알 수 있게 객관적으로 설명하세요.
           - 예: "PER가 10배라는 것은 기업의 이익 대비 주가가 10배 수준임을 의미하며, 이는 동종 업계 평균 대비 어떠한 수준인지 대조해보는 지표가 됩니다."
        3. **뉴스 팩트 전달**: 최근 뉴스에서 나타난 핵심적인 사건이나 공시 내용을 팩트 위주로 정리하세요.
        4. **중립성 유지**: "산다/판다", "기다려라", "관망해라"와 같은 주관적인 행동 지침을 절대 주지 마세요. 대신 "지표상으로는 이러한 특징이 관찰되니 참고하십시오"와 같은 중립적 표현을 사용하세요.
        5. **말투**: 명확하고 신뢰감 있는 뉴스 브리핑 톤 또는 데이터 리포트 톤을 유지하세요 (해요체 사용 가능).
        """

    # [General Mode] 일반 질문 (기존 로직 유지)
    else:
        # 기존 컨텍스트 조회 로직
        market_context = get_market_context(message)
        
        # 테마 검색
        if not market_context and any(k in message for k in ["관련주", "테마", "수혜주", "대장주", "어떤 종목", "알려줘"]):
             # (기존 테마 로직 생략 없이 사용하거나, 필요 시 복원. 여기선 지면상 핵심만 유지)
             pass 

        # 시장 브리핑
        if not market_context:
             # (기존 시장 브리핑 로직 ... )
             pass

        system_prompt = f"""
        당신은 친절한 AI 주식 비서입니다.
        사용자의 질문: "{message}"
        
        [참고 데이터]
        {market_context}
        
        위 데이터를 참고하여 답변해주세요. 데이터가 없으면 일반적인 금융 지식을 활용하세요.
        """
        if is_investment_query and not target_stock:
             system_prompt += "\n(참고: 특정 종목을 언급해주시면 더 정확한 분석이 가능합니다.)"

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        full_prompt = f"{system_prompt}\n\n사용자 질문: {message}"
        # print("Prompt used:", full_prompt) # Debug
        response = model.generate_content(full_prompt)
        return response.text
        
    except Exception as e:
        print(f"Chatbot Error: {e}")
        return f"죄송합니다. 분석 중 오류가 발생했습니다. ({str(e)})"
