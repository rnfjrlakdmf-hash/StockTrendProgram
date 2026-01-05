import os
import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from typing import Dict, Any
from dotenv import load_dotenv

# .env 파일 로드 (명시적 경로 설정)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# 환경 변수에서 API 키 로드 (없으면 None)
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        print("[SUCCESS] Gemini API Key loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to configure Gemini API: {e}")
else:
    print(f"[WARNING] Gemini API Key not found in {env_path}")

def get_json_model():
    """JSON 출력을 강제하는 Gemini 모델 반환"""
    return genai.GenerativeModel('gemini-2.0-flash', generation_config={"response_mime_type": "application/json"})

def get_text_model():
    """일반 텍스트 출력을 위한 Gemini 모델 반환"""
    return genai.GenerativeModel('gemini-2.0-flash')

def analyze_stock(stock_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gemini API를 사용하여 주식 데이터를 분석하고 점수를 매깁니다.
    API 키가 없거나 오류 발생 시 모의(Mock) 데이터를 반환합니다.
    """
    
    # API 키가 없는 경우 모의 데이터 반환 (비상용)
    if not API_KEY:
        print("Warning: No Gemini API Key found. Returning mock analysis.")
        return get_mock_analysis(stock_data)

    model = get_json_model()

    # 프롬프트 구성
    prompt = f"""
    You are a professional stock market analyst from Wall Street. 
    Analyze the following stock data and provide a structured JSON response.

    Stock Information:
    - Symbol: {stock_data.get('symbol')}
    - Name: {stock_data.get('name')}
    - Price: {stock_data.get('price')} {stock_data.get('currency')}
    - Sector: {stock_data.get('sector')}
    - Financials: {stock_data.get('financials')}
    
    Recent News Headlines (Source & Time):
    {json.dumps([f"[{n['publisher']}] {n['title']} ({n.get('published','')})" for n in stock_data.get('news', [])], ensure_ascii=False)}

    Instructions:
    1. Evaluate the stock's health based on the financials (PER, PBR, ROE, Growth).
    2. Analyze the 'Recent News Headlines' to determine the market sentiment (Positive/Negative/Neutral).
    3. Assign a 'Total Score' (0-100) combining financials and sentiment.
    4. Assign sub-scores for 'Supply/Demand' (Technical), 'Financials' (Fundamental), and 'Sentiment' (News - based on actual headlines).
    5. Write a brief 'Investment Briefing' (Korean, 3 sentences max) summarizing WHY you gave this score.

    Response Format (JSON only):
    {{
        "score": <0-100>,
        "metrics": {{
            "supplyDemand": <0-100>,
            "financials": <0-100>,
            "news": <0-100>
        }},
        "analysis_summary": "<Korean analysis text>"
    }}
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)

    except Exception as e:
        print(f"AI Analysis Error: {e}")
        return get_mock_analysis(stock_data)

def get_mock_analysis(stock_data):
    """API 호출 실패/미설정 시 보여줄 그럴싸한 가짜 데이터"""
    symbol = stock_data.get('symbol', '')
    
    return {
        "score": 75,
        "metrics": {
            "supplyDemand": 65,
            "financials": 80,
            "news": 60
        },
        "analysis_summary": f"현재 {symbol} 데이터에 대한 AI 분석 연결이 설정되지 않았습니다. 기본적으로 양호한 재무 상태를 유지하고 있는 것으로 보이며, 상세 분석을 위해서는 Gemini API 키가 필요합니다."
    }

def generate_market_briefing(market_data: Dict[str, Any], news_data: list, tech_score: int = 50) -> Dict[str, Any]:
    """
    시장 데이터(지수), 뉴스, 기술적 점수를 바탕으로 AI 브리핑을 생성합니다.
    """
    if not API_KEY:
        return get_mock_briefing()

    model = get_json_model()
    
    # 지수 데이터 정리
    indices_str = ", ".join([f"{item['label']}: {item['change']}" for item in market_data.get('indices', [])])
    
    # 뉴스 데이터 정리 (최신 5개만) - 소스 포함
    news_contexts = [f"[{n['source']}] {n['title']}" for n in news_data[:5]]
    
    prompt = f"""
    You are a professional financial anchor. Generate a daily market briefing based on the following data:
    
    Market Indices: {indices_str}
    Calculated Fear & Greed Index (Technical): {tech_score} / 100
    Key News Headlines: {json.dumps(news_contexts, ensure_ascii=False)}
    
    Instructions:
    1. 'sentiment_score': Combine the 'Calculated Fear & Greed Index' (70% weight) and the sentiment from news (30% weight) to decide the final score.
    2. 'summary': Write a 3-sentence summary in Korean. Explain WHY the market has this score (technical indicators vs news). Reference specific news or index movements.
    3. 'sentiment_label': 0-25 Extreme Fear, 26-45 Fear, 46-54 Neutral, 55-75 Greed, 76-100 Extreme Greed.
    
    Output Format (JSON):
    {{
        "title": "One catchy headline summarizing the market (Korean)",
        "summary": "Analysis text...",
        "sentiment_score": <Final Score 0-100>,
        "sentiment_label": "Fear/Neutral/Greed etc",
        "key_term": {{
            "term": "Select one financial term",
            "definition": "Explain it simply in Korean"
        }}
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Briefing Gen Error: {e}")
        return get_mock_briefing()

def get_mock_briefing():
    return {
        "title": "API 연결 대기중: 시장 데이터 수신 불가",
        "summary": "현재 Gemini API 키가 설정되지 않아 AI 브리핑을 생성할 수 없습니다. .env 파일을 확인해주세요. 기본적으로 시장은 기술주 중심으로 혼조세를 보이고 있을 가능성이 높습니다.",
        "sentiment_score": 50,
        "sentiment_label": "Neutral",
        "key_term": {
            "term": "API (Application Programming Interface)",
            "definition": "운영체제와 응용프로그램 사이의 통신에 사용되는 언어나 메시지 형식을 말합니다."
        }
    }

def compare_stocks(stock1_data: Dict[str, Any], stock2_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    두 종목의 데이터를 바탕으로 비교 분석 리포트를 생성합니다.
    """
    if not API_KEY:
        return {
            "winner": stock1_data['symbol'],
            "summary": "API 키가 없어 상세 비교가 불가능합니다."
        }
        
    model = get_json_model()
    
    prompt = f"""
    Compare two stocks based on the provided data and declare a winner for investment attractiveness.
    
    Stock A:
    - Symbol: {stock1_data.get('symbol')}
    - Name: {stock1_data.get('name')}
    - Price: {stock1_data.get('price')}
    - Score: {stock1_data.get('score')}
    - Financials: {stock1_data.get('financials')}
    
    Stock B:
    - Symbol: {stock2_data.get('symbol')}
    - Name: {stock2_data.get('name')}
    - Price: {stock2_data.get('price')}
    - Score: {stock2_data.get('score')}
    - Financials: {stock2_data.get('financials')}
    
    Instructions:
    1. Compare their valuations (PE, PBR, etc) and AI scores.
    2. Decide which one is more attractive RIGHT NOW.
    3. Write a 'Comparison Verdict' in Korean explaining why. Mention specific metrics.
    
    Response Format (JSON):
    {{
        "winner": "{stock1_data.get('symbol')} or {stock2_data.get('symbol')}",
        "summary": "Korean comparison summary..."
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Comparison Error: {e}")
        return {
            "winner": stock1_data['symbol'], # Fallback
            "summary": "분석 중 오류가 발생했습니다."
        }

def analyze_portfolio(allocation: list) -> str:
    """
    포트폴리오 구성(종목 및 비중)을 받아 AI 닥터 리포트(문자열)를 생성합니다.
    allocation example: [{"symbol": "AAPL", "weight": 40}, ...]
    """
    if not API_KEY:
        return "API 키가 없어 AI 포트폴리오 진단이 불가능합니다."

    model = get_text_model() # 텍스트 모델 사용
    
    # 포트폴리오 문자열 변환
    portfolio_str = ", ".join([f"{item['symbol']} ({item['weight']}%)" for item in allocation])
    
    prompt = f"""
    You are a professional portfolio manager. 
    Review the following stock portfolio allocation finalized by a Mean-Variance Optimization model.
    
    Portfolio: {portfolio_str}
    
    Instructions:
    1. Identify the 'Sector Bias' (e.g., Too much tech? Balanced?).
    2. Assess the 'Risk Profile' (Aggressive vs Defensive).
    3. Suggest ONE improvement or compliment in Korean.
    
    Output Format:
    Write a 3-sentence 'Doctor's Note' in Korean. Be professional but witty.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Portfolio Analysis Error: {e}")
        return "포트폴리오 분석 중 오류가 발생했습니다."

def analyze_theme(theme_keyword: str):
    """
    사용자가 입력한 테마(예: '비만치료제', '온디바이스AI')에 대해
    관련 종목과 핵심 이슈를 정리해줍니다.
    """
    if not API_KEY:
        return {
            "theme": theme_keyword,
            "description": "API 키가 없어 테마 분석이 불가능합니다.",
            "leaders": [],
            "followers": []
        }

    model = get_json_model()
    
    prompt = f"""
    Analyze the investment theme: "{theme_keyword}".
    
    Instructions:
    1. Briefly explain what this theme is about and why it's trending (Korean).
    2. Identify 3 'Leading Stocks' (Global or Korean, mix is fine). Provide Symbol and Name.
    3. Identify 3 'Follower/Related Stocks'.
    4. Provide a 'Risk Factor' for this theme.
    
    Response Format (JSON):
    {{
        "theme": "{theme_keyword}",
        "description": "Theme definition and momentum reason (Korean)...",
        "risk_factor": "One major risk (Korean)...",
        "leaders": [
            {{"symbol": "LLY", "name": "Eli Lilly", "reason": "Market leader in GLP-1..."}},
            ...
        ],
        "followers": [
            {{"symbol": "NVO", "name": "Novo Nordisk", "reason": "..."}},
            ...
        ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Theme Analysis Error: {e}")
        return None

    """
    뉴스 목록을 받아 숏폼(TikTok/Shorts style)용 3줄 요약 목록을 생성합니다.
    (API Quota 절약을 위해 비활성화 - 정적 데이터 반환)
    """
    # API 호출 없이 원본 뉴스만 간단히 가공하여 반환
    return [
        {"title": n.get('title', '뉴스'), "point": n.get('source', 'News'), "impact": "상세 내용은 클릭하여 확인하세요."} 
        for n in news_data[:3]
    ]

def analyze_earnings_impact(symbol: str, news_list: list) -> Dict[str, Any]:
    if not API_KEY:
         return {
            "symbol": symbol,
            "tone": "Neutral",
            "summary": "API 키 미설정",
            "pros": ["데이터 없음"],
            "cons": ["데이터 없음"]
        }
        
    model = get_json_model()
    
    news_text = json.dumps([n['title'] for n in news_list[:10]], ensure_ascii=False)
    
    prompt = f"""
    Analyze the 'Earnings Call/Report' sentiment for {symbol} based on these news headlines:
    {news_text}
    
    Instructions:
    1. Determine the 'CEO/Market Tone' (Confident/Cautious/Disappointed/Euphoric).
    2. Extract 3 'Key Positives' (Pros).
    3. Extract 3 'Key Negatives' (Cons).
    4. Write a 'Whisper Summary' (Korean, 2 sentences) interpreting the hidden meaning.
    
    Response Format (JSON):
    {{
        "tone": "Confident",
        "score": <0-100 score of result>,
        "summary": "Korean summary...",
        "pros": ["Pro 1", "Pro 2", "Pro 3"],
        "cons": ["Con 1", "Con 2", "Con 3"]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Earnings Analysis Error: {e}")
        return None

def analyze_supply_chain(symbol: str) -> Dict[str, Any]:
    """
    특정 기업의 공급망(Supply Chain) 및 경쟁 관계를 분석하여
    상관관계 맵(Graph Data)을 생성합니다.
    (API Quota 절약을 위해 비활성화 - 정적 데이터 반환)
    """
    return {
        "symbol": symbol,
        "nodes": [
            {"id": symbol, "group": "target", "label": symbol},
            {"id": "Supplier", "group": "supplier", "label": "주요 공급사"},
            {"id": "Customer", "group": "customer", "label": "주요 고객사"},
            {"id": "Competitor", "group": "competitor", "label": "경쟁사"}
        ],
        "links": [
            {"source": "Supplier", "target": symbol, "value": "Supply"},
            {"source": symbol, "target": "Customer", "value": "Sales"},
            {"source": symbol, "target": "Competitor", "value": "Compete"}
        ],
        "summary": "현재 API 사용량 제한으로 인해 공급망 분석이 비활성화되었습니다."
    }

def analyze_chart_patterns(symbol: str) -> Dict[str, Any]:
    """
    주가 데이터를 기반으로 차트 패턴(헤드앤숄더, 이중바닥 등)과 
    지지/저항선을 AI가 분석합니다.
    (API Quota 절약을 위해 비활성화 - 정적 데이터 반환)
    """
    return {
        "pattern": "Uptrend (Provisional)",
        "signal": "Hold",
        "confidence": 50,
        "support": 0,
        "resistance": 0,
        "summary": "현재 API 사용량 제한으로 인해 정밀 차트 분석이 일시 중단되었습니다."
    }

def analyze_trading_log(log_text: str) -> Dict[str, Any]:
    """
    사용자의 매매 일지나 고민을 분석하여 뼈 때리는 조언을 제공합니다.
    """
    if not API_KEY:
        return {
            "advice": "API 키가 없어 조언을 해드릴 수 없네요. 하지만 뇌동매매는 금물입니다!",
            "score": 50,
            "action_plan": "1. 매매 원칙 세우기\n2. 분할 매수하기"
        }

    model = get_json_model()
    
    prompt = f"""
    You are a Strict & Witty Trading Coach (Personal Trainer style).
    A user sent this trading log/diary entry:
    "{log_text}"
    
    Instructions:
    1. Identify the user's psychological state (FOMO, Panic, Greed, Regret, etc.).
    2. Critique their action/thought process sharply but constructively (Korean).
    3. Give a 'Mental Score' (0-100, where 100 is perfectly rational).
    4. Provide a 3-step 'Action Plan' to fix this habit.
    
    Response Format (JSON):
    {{
        "psychology": "FOMO (Fear Of Missing Out)",
        "advice": "Why did you buy at the peak? You are feeding the whales. Stop chasing green candles!",
        "style": "Strict/Witty",
        "score": 40,
        "action_plan": [
            "Rule 1: Never buy when RSI > 70.",
            "Rule 2: ...",
            "Rule 3: ..."
        ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Trading Coach Error: {e}")
        return None

def check_sniper_alert(symbol: str, condition_type: str) -> Dict[str, Any]:
    """
    특정 조건(Sniper Alert)이 충족되었는지 확인합니다. (MVP용 Simulation)
    """
    if not API_KEY:
        # AI 호출은 없지만 데이터 수집을 위해 경고는 안 날림. 
        # 다만 코드는 일관성을 위해 체크.
        pass
        
    # 데이터 가져오기
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.last_price
        
        hist = ticker.history(period="1mo")
        if hist.empty:
            return {"triggered": False, "message": "데이터 부족"}
            
        current_close = hist['Close'].iloc[-1]
        
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1] if not rsi.empty else 50
        
    except Exception as e:
        print(f"Sniper Data Error: {e}")
        return {"triggered": False, "message": "데이터 조회 실패"}

    triggered = False
    message = ""
    detail = ""
    
    if condition_type == "RSI_OVERSOLD":
        if current_rsi < 30:
            triggered = True
            message = "🚨 [포착] RSI 과매도 구간 진입! (골든존)"
            detail = f"현재 RSI: {current_rsi:.1f} (기준 < 30)"
        else:
            message = "아직 매수 타이밍이 아닙니다."
            detail = f"현재 RSI: {current_rsi:.1f}"
            
    elif condition_type == "RSI_OVERBOUGHT":
        if current_rsi > 70:
            triggered = True
            message = "⚠️ [경고] RSI 과열 구간! (차익 실현 고려)"
            detail = f"현재 RSI: {current_rsi:.1f} (기준 > 70)"
        else:
            message = "아직 과열권이 아닙니다."
            detail = f"현재 RSI: {current_rsi:.1f}"

    elif condition_type == "PRICE_DROP":
        prev_close = hist['Close'].iloc[-2]
        change = ((current_close - prev_close) / prev_close) * 100
        if change < -3.0:
            triggered = True
            message = "📉 [포착] 당일 -3% 이상 급락 발생!"
            detail = f"현재 변동률: {change:.2f}%"
        else:
            message = "특이한 급락세 없음."
            detail = f"현재 변동률: {change:.2f}%"
    
    return {
        "symbol": symbol,
        "type": condition_type,
        "triggered": triggered,
        "message": message,
        "detail": detail,
        "price": price
    }

def track_insider_trading(symbol: str) -> Dict[str, Any]:
    """
    특정 기업의 내부자 거래(Insider Trading) 내역을 추적하고 분석합니다.
    (API Quota 절약을 위해 비활성화 - 정적 데이터 반환)
    """
    return {
        "transactions": [],
        "sentiment": "Neutral",
        "score": 50,
        "summary": "API 사용량 최적화를 위해 내부자 거래 시뮬레이션을 비활성화했습니다."
    }

def analyze_market_weather() -> Dict[str, Any]:
    """
    시장 주요 지표(VIX, S&P500, 환율, 금리 등)를 종합하여
    '오늘의 증시 날씨'를 결정하고 해설을 제공합니다.
    (API Quota 절약을 위해 비활성화 - 간단 로직으로 대체)
    """
    # 데이터 수집 (yfinance)
    try:
        import yfinance as yf
        tickers = ["^VIX", "^GSPC"]
        data = yf.download(tickers, period="5d", progress=False)['Close']
        latest = data.iloc[-1]
        prev = data.iloc[-2]
        sp500_change = ((latest["^GSPC"] - prev["^GSPC"]) / prev["^GSPC"]) * 100
        vix = latest["^VIX"]
        
    except Exception:
        sp500_change = 0
        vix = 20
        
    # 간단한 규칙 기반 날씨 결정
    weather = "Cloudy"
    icon = "Cloud"
    if sp500_change > 0.5 and vix < 20:
        weather = "Sunny"
        icon = "Sun"
    elif sp500_change < -0.5 or vix > 25:
        weather = "Rainy"
        icon = "Rain"
        
    return {
        "weather": weather,
        "icon": icon,
        "temperature": 50 + (sp500_change * 10),
        "summary": "AI API 절약 모드 작동 중입니다. (지수 기반 자동 계산)",
        "details": {
            "vix": round(float(vix), 2),
            "sp500_change": round(float(sp500_change), 2)
        }
    }

def calculate_delisting_risk(symbol: str) -> Dict[str, Any]:
    """
    기업의 재무제표(부채비율, 영업이익, 유동비율 등)를 분석하여
    상장폐지 위험도(Risk Score)를 계산합니다.
    """
    if not API_KEY:
        return {"risk_score": 0, "level": "Unknown", "reason": "API Key Missing"}

    financial_summary = ""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        balance_sheet = ticker.balance_sheet
        financials = ticker.financials
        
        if balance_sheet.empty or financials.empty:
            return {"risk_score": 0, "level": "Safe", "reason": "No Data (Assuming Safe for Demo)"}
            
        total_debt = balance_sheet.loc['Total Debt'].iloc[0] if 'Total Debt' in balance_sheet.index else 0
        total_equity = balance_sheet.loc['Stockholders Equity'].iloc[0] if 'Stockholders Equity' in balance_sheet.index else 1
        
        net_income = financials.loc['Net Income'].iloc[0] if 'Net Income' in financials.index else 0
        operating_income = financials.loc['Operating Income'].iloc[0] if 'Operating Income' in financials.index else 0
        
        debt_ratio = (total_debt / total_equity) * 100 if total_equity != 0 else 999
        
        financial_summary = f"""
        Symbol: {symbol}
        Total Debt: {total_debt}
        Total Equity: {total_equity}
        Debt Ratio: {debt_ratio:.2f}%
        Latest Net Income: {net_income}
        Latest Operating Income: {operating_income}
        """
        
    except Exception as e:
        print(f"Financial Data Error: {e}")
        financial_summary = f"Symbol: {symbol} (Financial Data Fetch Failed)"

    model = get_json_model()
    
    prompt = f"""
    You are a 'Financial Auditor'.
    Analyze the delisting risk (Financial Health) of {symbol} based on:
    {financial_summary}
    
    Instructions:
    1. Calculate a 'Delisting Risk Score' (0-100).
       - 0-20: Very Safe (Blue Chip)
       - 21-50: Moderate Risk
       - 51-80: High Risk (Warning)
       - 81-100: Critical (Delisting Imminent)
    2. Determine the 'Risk Level' (Safe / Caution / Danger / Critical).
    3. Provide a 'Audit Report' summary in Korean, explaining WHY (e.g., "3년 연속 적자", "부채비율 500% 초과").
    
    Response Format (JSON):
    {{
        "risk_score": 15,
        "level": "Safe",
        "summary": "재무구조가 매우 탄탄하며 현금 흐름이 우수합니다. 상장폐지 우려는 없습니다.",
        "details": ["부채비율 45% (양호)", "영업이익 흑자 지속"]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Risk Analysis Error: {e}")
        return None
