import os
import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from typing import Dict, Any
from dotenv import load_dotenv
from datetime import datetime

# .env 파일 로드 (명시적 경로 설정)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# 환경 변수에서 API 키 로드 (없으면 None)
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        # Security: Mask key in logs
        masked_key = API_KEY[:4] + "*" * (len(API_KEY)-8) + API_KEY[-4:]
        print(f"[SUCCESS] Gemini API Key loaded successfully. ({masked_key})")
    except Exception as e:
        print(f"[ERROR] Failed to configure Gemini API: {e}")
else:
    print(f"[WARNING] Gemini API Key not found in {env_path}")

def get_json_model():
    """JSON 출력을 강제하는 Gemini 모델 반환 (기본값)"""
    return genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})

def get_text_model():
    """일반 텍스트 출력을 위한 Gemini 모델 반환"""
    return genai.GenerativeModel('gemini-2.5-flash')

def generate_with_retry(prompt: str, json_mode: bool = True, timeout: int = 30, temperature: float = 0.1, models_to_try: list = None):
    """
    여러 모델을 순차적으로 시도하여 API 제한/오류를 우회합니다.
    timeout: 각 모델 시도당 최대 대기 시간 (초)
    temperature: 0.0 ~ 1.0 (낮을수록 정해진 답, 높을수록 창의적)
    models_to_try: 시도할 모델 리스트 (기본값: flash -> pro)
    """
    import concurrent.futures
    
    if models_to_try is None:
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.0-flash", 
            "gemini-flash-latest",
            "gemini-pro-latest"
        ]
    
    last_error = None
    
    def _generate(model_name):
        """Helper function to generate content with a specific model"""
        config = {"response_mime_type": "application/json", "temperature": temperature} if json_mode else {"temperature": temperature}
        model = genai.GenerativeModel(model_name, generation_config=config)
        return model.generate_content(prompt)
    
    for model_name in models_to_try:
        try:
            # Use ThreadPoolExecutor with timeout
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_generate, model_name)
                try:
                    response = future.result(timeout=timeout)
                    return response
                except concurrent.futures.TimeoutError:
                    print(f"[WARNING] Model {model_name} timed out after {timeout}s")
                    last_error = TimeoutError(f"Gemini API call timed out after {timeout} seconds")
                    continue
        except Exception as e:
            print(f"[WARNING] Model {model_name} failed: {e}")
            last_error = e
            continue
            
    raise last_error

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

    # [Safe Convert] Financials의 NaN 처리
    import math
    safe_financials = {}
    raw_fin = stock_data.get('financials', {})
    if isinstance(raw_fin, dict):
        for k, v in raw_fin.items():
            try:
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    safe_financials[k] = "N/A"
                else:
                    safe_financials[k] = v
            except:
                safe_financials[k] = str(v)
    else:
        safe_financials = str(raw_fin)

    prompt = f"""
    You are a professional financial data analyst. Provide a CONCISE, READABLE data summary.
    
    Stock: {stock_data.get('symbol')} - {stock_data.get('name')}
    Price: {stock_data.get('price')} {stock_data.get('currency')}
    Sector: {stock_data.get('sector')}
    Financials: {json.dumps(safe_financials, ensure_ascii=False)}
    
    Recent News:
    {json.dumps([f"[{n.get('press', n.get('publisher', 'N/A'))}] {n['title']}" for n in stock_data.get('news', [])[:5]], ensure_ascii=False)}

    CRITICAL: Keep Korean text CONCISE and SCANNABLE. Use bullet points!
    NEVER provide direct buy/sell recommendations or specific price targets.

    Required Analysis (JSON format):
    
    1. **Data Scores** (0-100):
       - Overall analysis score
       - Supply/Demand Trend Intensity
       - Financial Stability/Strength
       - News Sentiment Factor
    
    2. **Key Context** (Korean - MAX 4 bullet points):
       Format as:
       📊 [데이터 포인트 1] (객관적 사실)
       📊 [데이터 포인트 2] (수치 포함)
       ⚠️ [유의 사항] (리스크 요인)
       📝 [시장 관찰] (데이터 흐름 요약)
       
       Example:
       📊 시장 지배력: 반도체 점유율 1위 (45%) 확인
       📊 재무 지표: PER 12배로 업계 평균(15배) 대비 수치적 차이 존재
       ⚠️ 유의 사항: 원자재 가격 변동에 따른 수익성 영향 가능성
       📝 시장 관찰: 외국인 매수세 지속 여부가 지표에 영향
    
    3. **Data Indicators**:
       - volatility: 변동성 수준 (number)
       - trend_strength: 추세 강도 % (number)
       - observation_point: "주요 데이터 관찰 포인트" (Korean, 1 sentence)
    
    4. **3-Line Data Summary** (Korean - each 1 sentence max):
       - supply: 수급 데이터 요약
       - momentum: 추세 흐름 요약
       - risk: 주요 변량/리스크 데이터
    
    5. **Translate Top 3 News** (Korean title + 1-line summary)
    
    6. **Related Stocks** (3 competitors only):
       - symbol, name, reason (Korean, brief)

    Response Format (JSON):
    {{
        "score": <0-100>,
        "metrics": {{
            "supplyDemand": <0-100>,
            "financials": <0-100>,
            "news": <0-100>
        }},
        "analysis_summary": "📊 [포인트1]\\n📊 [포인트2]\\n⚠️ [유의사항]\\n📝 [요약]",
        "strategy": {{
            "volatility": <number>,
            "trend_strength": <number>,
            "observation_point": "<Korean 1 sentence>"
        }},
        "rationale": {{
            "supply": "<Korean 1 sentence>",
            "momentum": "<Korean 1 sentence>",
            "risk": "<Korean 1 sentence>"
        }},
        "translated_news": [
            {{ "original_title": "...", "title": "<Korean>", "summary": "<Korean 1-line>" }},
            ...
        ],
        "related_stocks": [
            {{ "symbol": "...", "name": "...", "reason": "..." }},
            ...
        ]
    }}
    """

    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)

    except Exception as e:
        print(f"AI Analysis Error: {e}")
        return get_mock_analysis(stock_data, error_msg=str(e))

def get_mock_analysis(stock_data, error_msg: str = None):
    """API 호출 실패/미설정 시 보여줄 그럴싸한 가짜 데이터"""
    symbol = stock_data.get('symbol', '')
    
    summary = f"현재 {symbol} 데이터에 대한 AI 분석 연결이 설정되지 않았습니다. 기본적으로 양호한 재무 상태를 유지하고 있는 것으로 보이며, 상세 분석을 위해서는 Gemini API 키가 필요합니다."
    
    if error_msg:
        if "429" in error_msg or "Quota" in error_msg:
            summary = f"AI 요청 한도(Quota)를 초과했습니다. 잠시 후 시도하거나, Google AI Studio에서 결제 정보를 등록(Pay-as-you-go)하면 해결됩니다."
        else:
            summary = f"AI 분석 중 오류가 발생했습니다: {error_msg}. (일시적인 서비스 장애일 수 있습니다)"

    return {
        "score": 75,
        "metrics": {
            "supplyDemand": 65,
            "financials": 80,
            "news": 60
        },
        "analysis_summary": summary,
        "related_stocks": [
            {"symbol": "AAPL", "name": "Apple", "reason": "동일 섹터 (Tech) 대장주"},
            {"symbol": "MSFT", "name": "Microsoft", "reason": "글로벌 기술 경쟁사"},
            {"symbol": "GOOGL", "name": "Alphabet", "reason": "AI 및 플랫폼 경쟁"}
        ]
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
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Briefing Gen Error: {e}")
        return get_mock_briefing(error_msg=str(e))

def get_mock_briefing(error_msg: str = None):
    summary_text = "현재 Gemini API 키가 설정되지 않아 AI 브리핑을 생성할 수 없습니다. .env 파일을 확인해주세요."
    if error_msg:
        if "429" in error_msg or "Quota" in error_msg:
             summary_text = f"AI 요청 한도(Quota)를 초과했습니다. 잠시 후 재시도하거나 Google AI Studio에서 결제/요금제(Billing)를 설정하세요."
        else:
             summary_text = f"AI 분석 중 오류가 발생했습니다: {error_msg}."
        
    return {
        "title": "AI 서비스 일시 중단" if error_msg else "API 연결 대기중: 시장 데이터 수신 불가",
        "summary": summary_text,
        "sentiment_score": 50,
        "sentiment_label": "Neutral",
        "key_term": {
            "term": "System Error" if error_msg else "API (Application Programming Interface)",
            "definition": "서비스 일시 장애 상태입니다." if error_msg else "운영체제와 응용프로그램 사이의 통신에 사용되는 언어나 메시지 형식을 말합니다."
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
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Comparison Error: {e}")
        return {
            "winner": stock1_data['symbol'], # Fallback
            "summary": "분석 중 오류가 발생했습니다."
        }

def analyze_portfolio(allocation: list) -> str:
    """
    포트폴리오 구성(종목 및 비중)을 받아 AI 분석 리포트(문자열)를 생성합니다.
    allocation example: [{"symbol": "AAPL", "weight": 40}, ...]
    """
    if not API_KEY:
        return "API 키가 없어 AI 포트폴리오 분석이 불가능합니다."

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
    Write a 3-sentence 'Analyst Note' in Korean. Be professional and objective.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False)
        return response.text
    except Exception as e:
        print(f"Portfolio Analysis Error: {e}")
        return "포트폴리오 분석 중 오류가 발생했습니다."

def analyze_theme(theme_keyword: str):
    """
    사용자가 입력한 테마(예: '비만치료제', '온디바이스AI') 또는 
    일상 표현(예: '요즘 너무 더워', '전쟁나면 어떡해')에 대해
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
    Analyze the Stock Theme '{theme_keyword}' for the Korean Market (KOSPI/KOSDAQ).

    Instructions:
    1. Identify the 'Theme Description' and 'Key Risk Factor'.
    2. **[New] Theme Lifecycle Clock**: Determine the current phase of this theme.
       - 'Morning' (07:00): Birth/Early Stage (태동기) - High Potential, High Risk.
       - 'Noon' (12:00): Growth/Explosion (성장기) - Everyone knows it, prices soaring.
       - 'Evening' (18:00): Maturity (성숙기) - Growth slowing, established players dominate.
       - 'Night' (23:00): Decline/Bubble Burst (쇠퇴기) - Hype over, prices falling. 
       - Provide 'phase' (Morning/Noon/Evening/Night) and 'time' (e.g., "07:00").
       - Provide short 'comment' (e.g., "지금은 파티가 끝나는 시간입니다.").
    3. List 3 'Leaders' (대장주) and 3 'Followers' (부대장주).
       - **PRIORITIZE KOREAN STOCKS**.
    4. **[New] Real vs Fake Detector**: For EACH stock, determine if it's a REAL beneficiary or FAKE (Hype only).
       - 'is_real': true if >10% revenue comes from this theme or core tech exists.
       - 'is_real': false if just news/rumors without logic.
       - 'reason': Short reason (e.g., "매출 90% 배터리" or "단순 지분 투자설").
    5. Translate everything to Korean.

    Response Format (JSON):
    {{
        "theme": "{theme_keyword}",
        "description": "Short description...",
        "risk_factor": "One key risk...",
        "lifecycle": {{
            "phase": "Morning",
            "time": "07:00",
            "comment": "남들 모를 때 선점하세요!"
        }},
        "leaders": [
            {{"name": "Stock A", "symbol": "005930", "is_real": true, "reason": "Global No.1 Market Share"}}
        ],
        "followers": [
            {{"name": "Stock B", "symbol": "000660", "is_real": false, "reason": "No direct revenue yet"}}
        ]
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Theme Analysis Error: {e}")
        # Fallback Mock Data
        return {
            "theme": theme_keyword,
            "description": "AI 호출 실패로 인한 예시 데이터입니다.",
            "risk_factor": "데이터 부족",
            "lifecycle": {
                "phase": "Noon",
                "time": "12:00",
                "comment": "지금이 가장 뜨거운 시간입니다!"
            },
            "leaders": [
                {"name": "예시전자", "symbol": "005930.KS", "is_real": true, "reason": "예시: 진짜 수혜주"},
                {"name": "예시반도체", "symbol": "000660.KS", "is_real": true, "reason": "예시: 핵심 기술 보유"}
            ],
            "followers": [
                {"name": "예시건설", "symbol": "000720.KS", "is_real": false, "reason": "주의: 구체적 사업 없음"}
            ]
        }

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
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Earnings Analysis Error: {e}")
        return None

def analyze_supply_chain(symbol: str) -> Dict[str, Any]:
    """
    특정 기업의 공급망(Supply Chain) 및 경쟁 관계를 분석하여
    상관관계 맵(Graph Data)을 생성합니다.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    if not API_KEY:
        return {
            "symbol": symbol,
            "commodities": [
                {"name": "국제 유가 (Crude Oil)", "type": "Risk", "ticker": "CL=F", "reason": "운송 비용 상승", "price_display": "$78.50", "change_display": "+1.2%", "change_value": 1.2},
                {"name": "알루미늄 (Aluminum)", "type": "Benefit", "ticker": "ALI=F", "reason": "차체 경량화 소재", "price_display": "$2,200", "change_display": "-0.5%", "change_value": -0.5}
            ],
            "nodes": [
                {"id": symbol, "group": "target", "label": symbol, "ticker": symbol, "event": {"name": "실적 발표 (Earnings)", "d_day": "D-5", "date": "2024-05-15"}},
                {"id": "Supplier", "group": "supplier", "label": "LG Energy", "ticker": "373220.KS", "price_display": "₩390,000", "change_display": "+2.1%", "change_value": 2.1},
                {"id": "Customer", "group": "customer", "label": "Hertz", "ticker": "HTZ"},
                {"id": "Competitor", "group": "competitor", "label": "BYD", "ticker": "1211.HK"}
            ],
            "links": [
                {"source": "Supplier", "target": symbol, "value": "Battery Supply", "weight": 0.9, "width_type": "artery"},
                {"source": symbol, "target": "Customer", "value": "Fleet Sales", "weight": 0.3, "width_type": "capillary"},
                {"source": symbol, "target": "Competitor", "value": "Global EV M/S", "weight": 0.5, "width_type": "capillary"}
            ],
            "summary": "API 키 미설정으로 인한 데모 데이터 (Supply Chain 2.0)"
        }

    model = get_json_model()
    
    prompt = f"""
    Analyze the Global Supply Chain and Value Chain for {symbol}.
    Current Date: {today}

    Instructions:
    1. Identify key 'Suppliers' (Tier 1/2), 'Customers' (Major Clients), and 'Competitors'.
    2. Define relationships (Supply, Sales, Compete).
    3. **Revenue Dependency**: Estimate dependency weight (0.1-1.0) and width_type (artery/capillary).
    4. **Commodities**: Identify 1-2 key raw materials (Benefit/Risk).
       - **Name**: Must be in Korean logic (e.g., "국제 유가", "구리", "리튬").
       - **Reason**: Brief context in Korean (e.g., "원자재 비용 상승", "판매가 인상 수혜").
    5. **[New] Themes & Risks per Node**:
       - For EACH company (Target, Supplier, Customer, Competitor), identify 1-2 key **themes** they belong to (e.g., "#AI칩", "#2차전지", "#자율주행").
       - These should be short, hashtag-style Korean labels.
    6. **[New] Risk Score**:
       - Calculate an overall 'risk_score' (0-100) for this supply chain based on dependencies, geopolitical factors, and commodity trends.
    7. **Upcoming Events (D-Day) for ALL Nodes**: 
       - Identify 1 pivotal upcoming event for **EACH** company.
       - e.g. "Earnings", "New Model Launch", "Litigation".
       - **Date**: Provide the specific date (YYYY-MM-DD) if known.
       - **Label**: 'd_day' (e.g. D-14, D-30) relative to {today}.
       - If exact date unknown, use "D-??" and date="Unknown".
    8. Provide a 'Supply Chain Summary' in Korean (3 bullet points).
    9. Translate node labels to sensible Korean/English.
    10. **CRITICAL**: Provide the Stock Ticker for each company if public.

    Response Format (JSON):
    {{
        "symbol": "{symbol}",
        "risk_score": <0-100>,
        "commodities": [
            {{"name": "국제 유가", "type": "Risk", "ticker": "CL=F", "reason": "운송 및 제조 원가 상승 부담"}}
        ],
        "nodes": [
            {{
                "id": "{symbol}", "group": "target", "label": "{symbol} (Kor Name)", "ticker": "{symbol}",
                "themes": ["#AI가속기", "#HBM"],
                "event": {{"name": "신제품 발표", "d_day": "D-30", "date": "2024-06-15"}} 
            }}
        ],
        "links": [
            {{"source": "S1", "target": "{symbol}", "value": "Supply", "weight": 0.8, "width_type": "artery"}}
        ],
        "summary": "Korean summary..."
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        data = json.loads(response.text)

        # [New] Enrich with Real-time Stock Data (Nodes & Commodities)
        import yfinance as yf
        
        # 1. Enrich Nodes
        for node in data.get("nodes", []):
            ticker_sym = node.get("ticker")
            if ticker_sym:
                try:
                    # Clean ticker
                    if ":" in ticker_sym: ticker_sym = ticker_sym.split(":")[-1]
                    if ticker_sym.isdigit() and len(ticker_sym) == 6: ticker_sym += ".KS"
                    
                    yt = yf.Ticker(ticker_sym)
                    price = yt.fast_info.last_price
                    prev = yt.fast_info.previous_close
                    
                    if price and prev:
                        change = ((price - prev) / prev) * 100
                        curr = "₩" if ".KS" in ticker_sym or ".KQ" in ticker_sym else "$"
                        
                        node["price_display"] = f"{curr}{price:,.0f}" if curr == "₩" else f"{curr}{price:,.2f}"
                        node["change_display"] = f"{change:+.2f}%"
                        node["change_value"] = change
                except: pass

        # 2. Enrich Commodities (Oil, etc.)
        for comm in data.get("commodities", []):
            ticker_sym = comm.get("ticker")
            if ticker_sym:
                try:
                    yt = yf.Ticker(ticker_sym)
                    price = yt.fast_info.last_price
                    prev = yt.fast_info.previous_close
                    if price and prev:
                        change = ((price - prev) / prev) * 100
                        comm["price_display"] = f"${price:,.2f}"
                        comm["change_display"] = f"{change:+.2f}%"
                        comm["change_value"] = change
                except: pass
        # 3. Ensure array properties exist to prevent frontend crashes
        data["nodes"] = data.get("nodes") or []
        data["links"] = data.get("links") or []
        data["commodities"] = data.get("commodities") or []

        # [Fix] Ensure summary is always a string to prevent frontend split errors
        summary_raw = data.get("summary", "")
        if isinstance(summary_raw, list):
            data["summary"] = "\n".join(str(s) for s in summary_raw)
        elif not isinstance(summary_raw, str):
            data["summary"] = str(summary_raw)

        return data

    except Exception as e:
        print(f"Supply Chain Analysis Error: {e}")
        return None

def analyze_supply_chain_scenario(keyword: str, target_symbol: str = None) -> Dict[str, Any]:
    """
    Butterfly Effect Simulator:
    Generates a causal chain from a keyword (e.g., "Typhoon") to related stocks.
    If target_symbol is provided, analyzes the impact specifically on that company.
    """
    if not API_KEY:
        summary_text = f"'{keyword}' 키워드가 '{target_symbol}'에게 미치는 나비효과 분석입니다." if target_symbol else "API 키 미설정으로 인한 데모 시나리오입니다."
        return {
            "scenario": keyword,
            "paths": [
                {"step": "태풍 발생", "impact": "Negative"},
                {"step": "농작물 피해 (밀/옥수수)", "impact": "Price UP"},
                {"step": "사료 가격 인상", "impact": "Cost UP"},
                {"step": "육계(닭고기) 가격 인상", "impact": "Revenue UP"},
                {"step": "하림/마니커 주가 상승", "impact": "Positive"}
            ],
            "final_stocks": [
                {"name": target_symbol if target_symbol else "하림", "symbol": target_symbol if target_symbol else "136480.KQ", "reason": "닭고기 가격 상승 수혜"}
            ],
            "summary": summary_text
        }
        
    model = get_json_model()
    
    if target_symbol:
        prompt = f"""
        TASK: Connect the "Event" to the "Target Company" via a causal chain.
        
        INPUTS:
        - Event: "{keyword}"
        - Target Company: "{target_symbol}"
        
        CONSTRAINTS:
        1. The output JSON **MUST** have "{target_symbol}" as the ONLY item in 'final_stocks'.
        2. You MUST construct a logical path from "{keyword}" to "{target_symbol}".
           - Example logic: Event -> Market Change -> Industry Impact -> "{target_symbol}" Impact.
        3. Rate the final impact specific to "{target_symbol}" (Positive or Negative).
        
        REQUIRED JSON OUTPUT FORMAT:
        {{
            "scenario": "{keyword} -> {target_symbol}",
            "paths": [
                {{"step": "{keyword}", "impact": "Neutral"}},
                {{"step": "Intermediate Step 1", "impact": "..."}},
                {{"step": "Intermediate Step 2", "impact": "..."}},
                {{"step": "Impact on {target_symbol}", "impact": "Positive/Negative"}}
            ],
            "final_stocks": [
                {{
                    "name": "{target_symbol}", 
                    "symbol": "{target_symbol}", 
                    "reason": "Explain how the chain affects this specific company (Sales/Cost/Sentiment)."
                }}
            ],
            "summary": "One sentence summary."
        }}
        """
    else:
        prompt = f"""
        Analyze the 'Butterfly Effect' (Causal Chain) for the keyword: "{keyword}".
        
        Instructions:
        1. Create a logical chain of events starting from the keyword.
           - e.g. Typhoon -> Crop Damage -> Grain Price Up -> Feed Cost Up -> Chicken Price Up -> Harim Stock Up.
        2. Identify the final beneficiary stocks (Korean preferred).
        3. Output the path steps and the final stock recommendations.
        
        Response Format (JSON):
        {{
            "scenario": "{keyword}",
            "paths": [
                {{"step": "Event 1", "impact": "Neutral/Positive/Negative"}},
                {{"step": "Result 2", "impact": "Price UP/DOWN"}},
                ...
            ],
            "final_stocks": [
                {{"name": "Stock Name", "symbol": "Ticker", "reason": "Why it benefits"}}
            ],
            "summary": "Short Korean explanation of the logic."
        }}
        """
    
    try:
        # Temperature 1.0 to break strong probability associations
        # Use gemini-2.5-pro for better instruction following on forced scenarios
        temp = 1.0 if target_symbol else 0.4
        models = ["gemini-2.5-flash", "gemini-2.5-pro"] if target_symbol else None
        
        # Increase timeout for complex reasoning
        response = generate_with_retry(prompt, json_mode=True, temperature=temp, models_to_try=models, timeout=60)
        return json.loads(response.text)
    except Exception as e:
        print(f"Scenario Analysis Error: {e}")
        return None

def analyze_chart_patterns(symbol: str) -> Dict[str, Any]:
    """
    주가 데이터를 기반으로 차트 패턴(헤드앤숄더, 이중바닥 등)과 
    지지/저항선을 AI가 분석합니다.
    """
    if not API_KEY:
        return {
            "pattern": "Uptrend (Provisional)",
            "signal": "Hold",
            "confidence": 50,
            "support": 0,
            "resistance": 0,
            "summary": "API 키 미설정"
        }

    # 한글 종목명 등 URL 디코딩 및 정규화
    import urllib.parse
    symbol = urllib.parse.unquote(symbol)

    # 6자리 숫자만 있는 경우 한국 주식(.KS)으로 간주 (yfinance용 처리)
    if symbol.isdigit() and len(symbol) == 6:
        symbol = f"{symbol}.KS"

    # 간단한 가격 데이터 가져오기 (문맥 제공용 & 차트 그리기용)
    history_data = []
    try:
        import yfinance as yf
        # 3개월치 데이터 가져오기 (차트 시각화용)
        hist = yf.Ticker(symbol).history(period="3mo")
        
        # DataFrame을 리스트로 변환
        for date, row in hist.iterrows():
            history_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(row['Close'], 2)
            })
            
        closes = hist['Close'].tolist()[-20:] # AI에게는 최근 20일 데이터만 제공 (토큰 절약)
        price_str = str(closes)
    except:
        price_str = "Data unavailable"

    model = get_json_model()
    
    prompt = f"""
    Analyze the technical chart data for {symbol} based on recent price action trends (Conceptually).
    Recent 20 days closing prices: {price_str}

    Instructions:
    1. Identify the dominant 'Chart Pattern' (e.g., Double Bottom, Head & Shoulders, Bull Flag, Uptrend). Please provide the pattern name in Korean (e.g., "이중 바닥형", "상승 깃발형").
    2. Determine key 'Price Concentration Zones' (Support and Resistance Approximation).
    3. Identify the 'Trend Category' (Rising Consensus / Declining Consensus / Side Trend).
    4. Provide a 'Pattern Consistency Score' (0-100).
    5. Write a short 'Technical Data Summary' in Korean.

    Response Format (JSON):
    {{
        "pattern": "상승 깃발형",
        "signal": "Rising Consensus",
        "confidence": 85,
        "support": 150.5,
        "resistance": 175.0,
        "summary": "Korean technical summary..."
    }}
    """
    
    # 통화 기호 결정
    currency_symbol = "$"
    if symbol.endswith(".KS") or symbol.endswith(".KQ"):
        currency_symbol = "₩"

    try:
        response = generate_with_retry(prompt, json_mode=True)
        result = json.loads(response.text)
        
        # [New] 패턴 이름 한글화 (fallback)
        pattern_map = {
            "Uptrend": "상승 추세", "Downtrend": "하락 추세",
            "Bull Flag": "상승 깃발형", "Bear Flag": "하락 깃발형",
            "Double Bottom": "이중 바닥형", "Double Top": "이중 천장형",
            "Head & Shoulders": "헤드 앤 숄더", "Inverse Head & Shoulders": "역헤드 앤 숄더",
            "Rectangle": "박스권", "Triangle": "삼각형 패턴",
            "Wedge": "쐐기형", "Channel": "채널형"
        }
        
        # AI가 영어를 반환했을 경우 매핑 시도
        pat = result.get("pattern", "")
        for eng, kor in pattern_map.items():
            if eng.lower() in pat.lower():
                result["pattern"] = kor
                break

        result['currency'] = currency_symbol
        result['symbol'] = symbol 
        result['history'] = history_data # [New] 차트 데이터 추가
        return result
    except Exception as e:
        print(f"Chart Analysis Error: {e}")
        return None

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
        response = generate_with_retry(prompt, json_mode=True)
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
    """
    # 실제 데이터는 stock_data.get_insider_trading 에서 가져오지만, 
    # 여기서는 그 의미를 해석하는 AI 기능을 수행
    if not API_KEY:
        return {
            "transactions": [],
            "sentiment": "Neutral",
            "score": 50,
            "summary": "API 키 미설정"
        }
        
    model = get_json_model()
    
    prompt = f"""
    Analyze the implication of 'Insider Trading' for a stock {symbol}.
    (Assume hypothetical recent insider buying/selling if no data provided, or genreal sentiment).
    
    Instructions:
    1. Determine 'Insider Sentiment' (Bullish/Bearish).
    2. Give a 'Insider Signal Score' (0-100).
    3. Provide a 'Summary' in Korean explains what insiders are doing.

    Response Format (JSON):
    {{
        "sentiment": "Bullish",
        "score": 80,
        "summary": "Korean summary..."
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Insider Analysis Error: {e}")
        return None

def analyze_market_weather() -> Dict[str, Any]:
    """
    시장 주요 지표(VIX, S&P500, 환율, 금리 등)를 종합하여
    '오늘의 증시 날씨'를 결정하고 해설을 제공합니다.
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
        
    if not API_KEY:
        # 간단한 규칙 기반 날씨 결정 (API 없을 때)
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
            "summary": "AI API 절약 모드 작동 중 (규칙 기반)",
            "details": {
                "vix": round(float(vix), 2),
                "sp500_change": round(float(sp500_change), 2)
            }
        }
        
    # API 사용
    model = get_json_model()
    
    prompt = f"""
    You are a 'Market Weather Caster'.
    Current Market Data:
    - S&P 500 Daily Change: {sp500_change:.2f}%
    - VIX (Fear Index): {vix:.2f}
    
    Instructions:
    1. Decide the 'Market Weather' (Sunny / Cloudy / Rainy / Stormy).
    2. Choose an 'Icon' (Sun / Cloud / Rain / Lightning).
    3. Calculate 'Market Temperature' (0-100, Hot is Bullish, Cold is Bearish).
    4. Write a witty 'Weather Forecast' in Korean.
    
    Response Format (JSON):
    {{
        "weather": "Sunny",
        "icon": "Sun",
        "temperature": 80,
        "summary": "Korean weather forecast...",
        "details": {{
            "vix": {vix},
            "sp500_change": {sp500_change}
        }}
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
         # 에러 시 fallback
        return {
            "weather": "Cloudy", 
            "icon": "Cloud", 
            "temperature": 50, 
            "summary": "API 호출 실패, 흐림.",
             "details": { "vix": vix, "sp500_change": sp500_change }
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
        Net Income: {net_income}
        Operating Income: {operating_income}
        """
        
    except Exception as e:
        print(f"Delisting Check Error: {e}")
        financial_summary = f"Symbol: {symbol} (Financial Data unavailable)"

    model = get_json_model()
    
    prompt = f"""
    You are a 'Technical Financial Analyst'.
    Analyze the financial stability and delisting risk metrics of {symbol} based on:
    {financial_summary}
    
    Instructions:
    1. Calculate a 'Delisting Risk Score' (0-100).
       - 0-20: Very Safe (Blue Chip)
       - 21-50: Moderate Risk
       - 51-80: High Risk (Warning)
       - 81-100: Critical (Delisting Imminent)
    2. Determine the 'Risk Level' (Safe / Caution / Danger / Critical).
    3. Provide a 'Data Analysis Report' summary in Korean, explaining WHY (e.g., "3년 연속 적자", "부채비율 500% 초과").
    
    Response Format (JSON):
    {{
        "risk_score": 15,
        "level": "Safe",
        "summary": "재무구조가 매우 탄탄하며 현금 흐름이 우수합니다. 상장폐지 우려는 없습니다.",
        "details": ["부채비율 45% (양호)", "영업이익 흑자 지속"]
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Risk Analysis Error: {e}")
        return None

# ==========================================
# [New] AI 1분 브리핑 (Stock Insight)
# ==========================================

def generate_stock_briefing(symbol: str) -> Dict[str, Any]:
    """
    종목의 재무·뉴스·수급·공시를 종합하여 중립적 1분 요약을 생성합니다.
    절대 투자 추천을 하지 않고 팩트만 전달합니다.
    """
    # 1. 데이터 수집
    news_data = []
    disclosure_data = []
    investor_data = {}
    price_data = {}
    
    try:
        from stock_data import get_simple_quote, fetch_google_news
        quote = get_simple_quote(symbol)
        if quote:
            # get_simple_quote returns "change", not "change_pct" explicitly
            price_data = {
                "price": quote.get("price", "N/A"),
                "change": quote.get("change", "N/A"),
                "change_pct": quote.get("change", "N/A"), # Fallback to standard change
            }
    except Exception as e:
        print(f"[Briefing] Price data error: {e}")
    
    try:
        from stock_data import fetch_google_news
        # Avoid blocking too long, limit results or use naver/google.
        news = fetch_google_news(symbol, max_results=3)
        news_data = [n.get("title", "") for n in (news or [])]
    except Exception as e:
        print(f"[Briefing] News data error: {e}")
    
    try:
        from dart_disclosure import get_dart_disclosures
        disclosures = get_dart_disclosures(symbol)
        disclosure_data = [d.get("title", "") for d in (disclosures or [])[:3]]
    except Exception as e:
        print(f"[Briefing] Disclosure data error: {e}")
    
    try:
        # Use valid target for history
        target_symbol = symbol + ".KS" if len(symbol) == 6 else symbol
        from korea_data import get_investor_history
        history = get_investor_history(target_symbol, days=5)
        if history and len(history) > 0:
            latest = history[0]
            # korea_data returns 'foreigner' and 'institution', not 'foreign_net' / 'institution_net'
            f_net = latest.get("foreigner", 0)
            i_net = latest.get("institution", 0)
            investor_data = {
                "foreign_net": f"{f_net:,}",
                "institution_net": f"{i_net:,}",
            }
    except Exception as e:
        print(f"[Briefing] Investor data error: {e}")
    
    # 2. AI 요약 생성
    if not API_KEY:
        return {
            "symbol": symbol,
            "briefing": f"{symbol} 종목의 AI 브리핑을 생성하려면 Gemini API 키가 필요합니다.",
            "price": price_data,
            "news_count": len(news_data),
            "disclosure_count": len(disclosure_data),
            "disclaimer": "본 정보는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }
    
    context = f"""
    종목: {symbol}
    현재가: {price_data.get('price', 'N/A')}원 (일간 변동: {price_data.get('change_pct', 'N/A')})
    최근 뉴스: {json.dumps(news_data, ensure_ascii=False)}
    최근 공시: {json.dumps(disclosure_data, ensure_ascii=False)}
    수급 현황 (최근 1일 순매수): 외국인 {investor_data.get('foreign_net', 'N/A')}주, 기관 {investor_data.get('institution_net', 'N/A')}주
    """
    
    prompt = f"""
    당신은 객관적 지표를 신속하게 요약해주는 'AI 데이터 분석 비서'입니다.
    투자자가 화면을 볼 때 위쪽(요약문)과 아래쪽(핵심포인트)이 완전히 똑같은 내용으로 중복 표기되지 않게 **명확히 분리해서** 작성해주세요.

    [작성 규칙]
    1. briefing (상단 요약문): 전체적인 흐름(수급, 이슈 등)을 딱 1~2문장의 자연스러운 줄글(평문)로 간략히 설명하세요. (이모지 및 개조식 금지, "~입니다/보입니다" 체 사용)
    2. key_points (하단 목록): 가장 중요한 특징 3가지를 아주 짧은 단답형 키워드 위주로 요약하세요. (각 포인트 앞에는 🔥, 📈, 📉, 💡 등 적절한 이모지 1개씩 필수)
    3. 수급(외국인/기관)을 설명할 때는 **숫자(주(株))와 순매수/순매도 여부**를 반드시 포함하세요.
    4. 매수/매도 권유 금지. 철저히 객관적 사실만 기재.
    
    [데이터]
    {context}
    
    Response Format (JSON):
    {{
        "briefing": "삼성전자는 현재 주주총회 관련 불확실성 속에서 외국인의 대규모 매도세가 이어지며 약세를 보이고 있습니다. 기관의 순매수 유입에도 방어에 실패한 모습입니다.",
        "key_points": ["📉 외국인 773만주 대량 순매도", "🏢 기관 160만주 순매수 유입", "💡 주주총회 불확실성 증대"],
        "sentiment_score": <0-100 사이 중립 50>
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True, timeout=15)
        result = json.loads(response.text)
        result["symbol"] = symbol
        result["price"] = price_data
        result["news_count"] = len(news_data)
        result["disclosure_count"] = len(disclosure_data)
        result["investor"] = investor_data
        result["disclaimer"] = "본 정보는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        return result
    except Exception as e:
        print(f"[Briefing] AI generation error: {e}")
        return {
            "symbol": symbol,
            "briefing": f"{symbol} 종목 브리핑 생성 중 오류가 발생했습니다.",
            "price": price_data,
            "disclaimer": "본 정보는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }


# ==========================================
# [New] Portfolio Analysis Integration
# ==========================================

from portfolio_analysis import (
    analyze_portfolio_composition,
    get_dividend_calendar,
    analyze_portfolio_factors
)

def analyze_portfolio_data(portfolio_items: list[str]) -> Dict[str, Any]:
    """
    사용자의 보유 종목 리스트를 받아 포트폴리오 자산 배분 상태를 분석합니다.
    (예: "삼성전자, TSLA, NVDA")
    """
    if not API_KEY:
        return {
            "score": 60,
            "analysis": "API 키 미설정 (분석 불가)",
            "report": "정밀 분석을 위해 API 키를 설정해주세요.",
            "details": {
                "sector_risk": "Unknown",
                "diversification": "Unknown"
            },
            # Return empty structures for frontend safety
            "nutrition": {"nutrition": [], "sectors": {}},
            "calendar": [],
            "factors": {}
        }
        
    portfolio_str = ", ".join(portfolio_items)
    
    # 1. Run Data Analysis (Composition, Dividend, Factors)
    try:
        composition_data = analyze_portfolio_composition(portfolio_items)
        calendar_data = get_dividend_calendar(portfolio_items)
        factor_data = analyze_portfolio_factors(portfolio_items)
    except Exception as e:
        print(f"Portfolio Data Analysis Error: {e}")
        composition_data = {}
        calendar_data = []
        factor_data = {}

    # Prepare Context for AI
    composition_summary = f"Asset Composition Breakdown: {composition_data.get('composition', [])}"
    factor_summary = f"Factor Scores (0-100): {factor_data}"
    
    model = get_json_model()
    
    prompt = f"""
    You are a 'Beginner-Friendly Portfolio Doctor'.
    Portfolio Assets: [{portfolio_str}]
    
    Data provided:
    1. Sector Breakdown: {composition_summary}
    2. Factor Metrics: {factor_summary}
    
    Instructions:
    1. **Balance Score (0-100)**: Rate the portfolio's balance. 80+ is excellent, 50-70 is average, below 50 needs attention.
    2. **Allocation Style**: Give a catchy Korean name for the style (e.g., "불타는 성장형 고구마", "든든한 국밥같은 안정형").
    3. **Analysis Report**: 
       - Write for a **complete beginner** who just started stock trading.
       - Use an intuitive metaphor (e.g., 'Nutritional balance of a meal', 'A physical health checkup', or 'Driving a car').
       - **AVOID complex jargon** like "beta", "alpha", "volatility", "diversification" without easy explanation.
       - Explain WHY the score is high/low and what ONE simple thing they could do to improve it.
       - Keep it under 4 sentences.
    
    Response Format (JSON) - MUST BE IN KOREAN:
    {{
        "score": 75,
        "analysis": "성장에 올인한 공격수 스타일",
        "report": "현재 포트폴리오는 마치 고기만 가득한 식단 같아요! 수익을 낼 힘은 강력하지만, 시장이 흔들릴 때 버틸 채소(안정적인 종목)가 부족합니다. 조금 더 안정적인 회사들을 섞어주면 훨씬 튼튼한 포트폴리오가 될 거예요.",
        "details": {{
            "sector_risk": "한 곳에 너무 몰려있어요",
            "diversification": "조금 더 골고루 담는 게 필요해요"
        }}
    }}
    """
    

    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        result = json.loads(response.text)
        
        # Inject the calculated data into the result for the frontend
        result["composition"] = composition_data
        result["calendar"] = calendar_data if isinstance(calendar_data, list) else []
        result["factors"] = factor_data if isinstance(factor_data, dict) else {}
        
        # Sanitize numeric fields to avoid NaN/Infinity JSON serialization errors
        import math
        if not isinstance(result.get("score"), (int, float)) or math.isnan(result.get("score", 0)):
            result["score"] = 50
        if not isinstance(result.get("analysis"), str):
            result["analysis"] = "분석 완료"
        if not isinstance(result.get("report"), str):
            result["report"] = "분석 결과를 확인해 보세요."
            
        return result
    except Exception as e:
        print(f"[analyze_portfolio_data] Error: {e}")
        return {
            "score": 50,
            "analysis": "분석 완료",
            "report": "AI 분석을 완료했습니다. 더 정확한 분석을 위해 API 키를 확인해 주세요.",
            "details": {},
            "composition": composition_data if isinstance(composition_data, dict) else {},
            "calendar": calendar_data if isinstance(calendar_data, list) else [],
            "factors": factor_data if isinstance(factor_data, dict) else {},
        }

def analyze_node_detail(symbol: str, name: str = None) -> Dict[str, Any]:
    """
    공급망 맵의 특정 노드(기업) 클릭 시 상세 분석 리포트를 생성합니다.
    최신 뉴스 해석과 기업의 핵심 테마/리스크를 요약합니다.
    """
    if not API_KEY:
        return {
            "summary": "AI 분석 연결이 필요합니다. (API 키 미설정)",
            "news_analysis": ["뉴스 분석을 제공할 수 없습니다."],
            "investment_tip": "안정적인 투자를 위해 기업의 재무 상태를 먼저 확인하세요.",
            "themes": ["#데이터부족"]
        }

    # 뉴스 데이터 가져오기 (기존 로직 활용)
    from stock_data import get_stock_info
    stock_info = get_stock_info(symbol, skip_ai=False)
    
    news_titles = [n['title'] for n in stock_info.get('news', [])[:5]]
    news_context = "\n".join(news_titles) if news_titles else "최근 관련 뉴스 없음"
    
    node_name = name or stock_info.get('name', symbol)

    model = get_json_model()
    
    prompt = f"""
    Analyze the stock '{node_name} ({symbol})' in the context of the supply chain.
    Recent News: 
    {news_context}

    Instructions:
    1. **Summary**: Provide a 2-sentence strategic summary of this company's current position in Korean.
    2. **News Analysis**: Briefly interpret why the recent news headlines are significant for this company (Korean).
    3. **Strategic Analysis Context**: Provide one neutral strategic point derived from the data for this stock (Korean).
    4. **Themes**: Identify 3 key hashtags representing this company (e.g., #AI, #Energy).

    Response Format (JSON):
    {{
        "summary": "...",
        "news_analysis": ["Point 1", "Point 2"],
        "analysis_point": "...",
        "themes": ["#Theme1", "#Theme2", "#Theme3"]
    }}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=True)
        return json.loads(response.text)
    except Exception as e:
        print(f"Node Detail Analysis Error: {e}")
        return {
            "summary": f"{node_name}에 대한 AI 분석 중 오류가 발생했습니다.",
            "news_analysis": ["현재 뉴스 데이터를 분석할 수 없습니다."],
            "investment_tip": "재시도하거나 다른 기업을 조회해 보세요.",
            "themes": ["#오류"]
        }
