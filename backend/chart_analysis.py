import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime
from pattern_statistics import PatternStatistician
from korea_data import get_naver_daily_prices, get_investor_history, search_stock_code, get_naver_stock_info

class ChartAnalyzer:
    def __init__(self):
        self.stats = PatternStatistician()

    def analyze_weather_forecast(self, ticker: str, df: pd.DataFrame = None):
        """
        '내일의 날씨 예보': 캔들 패턴 기반 통계적 확률 분석
        """
        try:
            if df is None or df.empty:
                df = yf.Ticker(ticker).history(period="5y")

            if df.empty or len(df) < 20: 
                return {"weather": "Unknown", "probability": 0, "pattern": "데이터 부족", "count": 0}
            
            patterns = self.stats.identify_patterns(df)
            
            main_pattern = ""
            if not patterns:
                main_pattern = self.stats.identify_trend(df)
            else:
                main_pattern = patterns[-1]
            
            result = self.stats.calculate_probability(df, main_pattern, lookback_days=1825)
            
            avg_return_str = f"{result['avg_return']}%"
            
            if "추세" in main_pattern:
                comment = f"회사의 과거 5년 통계를 분석한 결과, '{main_pattern}' 상황일 때 다음날 평균적으로 {avg_return_str} 수준의 오르내림을 보였습니다. (상향 확률 {result['rise_prob']}%)"
            else:
                comment = f"과거 5년간 '{main_pattern}'이 발생했던 {result['count']}번의 사례를 분석한 결과, 다음날 평균 {avg_return_str}의 변동이 있었으며 상향했던 비중은 {result['rise_prob']}%였습니다."

            return {
                "weather": result['weather'],
                "probability": result['rise_prob'],
                "pattern": main_pattern,
                "count": result['count'],
                "avg_return": result['avg_return'],
                "comment": comment
            }
            
        except Exception as e:
            print(f"Weather Forecast Error: {e}")
            return {"weather": "Unknown", "probability": 0, "pattern": "분석 실패", "count": 0}

    def analyze_whale_tracker(self, code: str):
        """
        '투자자별 추정 평균 단가': 최근 3개월 기관/외국인 추정 평단가 산출
        """
        import re
        clean_code = symbol_to_clean_code(code)
        
        # Security: KR Only (Naver data source)
        if not (clean_code.isdigit() and len(clean_code) == 6):
            return None
            
        data = get_investor_history(clean_code, days=40)
        
        if not data:
            return None
            
        inst_buy_sum = 0
        inst_vol_sum = 0
        frgn_buy_sum = 0
        frgn_vol_sum = 0
        
        current_price = data[0]['price']
        
        ingredients = []
        for i in range(min(5, len(data))):
            d = data[i]
            retail = -(d['institution'] + d['foreigner'])
            
            ingredients.append({
                "date": d['date'],
                "price": d['price'],
                "institution": d['institution'],
                "foreigner": d['foreigner'],
                "retail": retail,
                "winner": max(
                    ("개인", retail), 
                    ("외국인", d['foreigner']), 
                    ("기관", d['institution']), 
                    key=lambda x: x[1]
                )[0] if max(retail, d['foreigner'], d['institution']) > 0 else "순매수 없음"
            })

        for d in data:
            p = d['price']
            if d['institution'] > 0:
                inst_buy_sum += (d['institution'] * p)
                inst_vol_sum += d['institution']
            if d['foreigner'] > 0:
                frgn_buy_sum += (d['foreigner'] * p)
                frgn_vol_sum += d['foreigner']
                
        inst_vwap = int(inst_buy_sum / inst_vol_sum) if inst_vol_sum > 0 else 0
        frgn_vwap = int(frgn_buy_sum / frgn_vol_sum) if frgn_vol_sum > 0 else 0
        
        return {
            "current_price": current_price,
            "institution": {
                "avg_price": inst_vwap,
                "return_rate": round(((current_price - inst_vwap) / inst_vwap * 100), 1) if inst_vwap > 0 else 0
            },
            "foreigner": {
                "avg_price": frgn_vwap,
                "return_rate": round(((current_price - frgn_vwap) / frgn_vwap * 100), 1) if frgn_vwap > 0 else 0
            },
            "ingredients": ingredients
        }

# Helper to clean code (e.g. 005930.KS -> 005930)
def symbol_to_clean_code(symbol: str) -> str:
    import re
    code = symbol.split('.')[0]
    return re.sub(r'[^0-9]', '', code)

# Singleton instance
chart_analyzer = ChartAnalyzer()

def get_yf_ticker(symbol: str) -> str:
    """
    Resolves a stock symbol (name or code) to a yfinance-compatible ticker string.
    """
    code = symbol
    if not (symbol.isdigit() and len(symbol) == 6):
        found_code = search_stock_code(symbol)
        if found_code:
            code = found_code
        else:
            clean = symbol.split('.')[0]
            if clean.isdigit() and len(clean) == 6:
                code = clean
    
    if not (code.isdigit() and len(code) == 6):
        return symbol # US Stocks return as is
        
    yf_ticker = f"{code}.KS"
    info = get_naver_stock_info(code)
    if info and info.get('market_type') == 'KQ':
        yf_ticker = f"{code}.KQ"
    return yf_ticker

def generate_beginner_insight(df, ticker="알 수 없는 종목"):
    """
    Generate very easy metaphors for beginners based on technical indicators using LLM.
    Strictly adheres to compliance rules to avoid unauthorized investment advisory (유사투자자문업).
    """
    from ai_analysis import generate_with_retry
    import json
    
    if df.empty or len(df) < 120:
        return {"text": "데이터가 충분하지 않아 상세 가이드를 제공할 수 없어요. 조금만 더 지켜봐 주세요!", "status": "normal", "tips": []}

    # 최근 30영업일의 데이터를 추출 (LLM 토큰 절약 및 단기/중기 트렌드 파악 목적)
    recent_df = df.tail(30).copy()
    
    # 5, 20, 60, 120 이평선은 전체 df에서 계산 후 tail로 가져옴
    recent_df['ma5'] = df['Close'].rolling(5).mean().tail(30)
    recent_df['ma20'] = df['Close'].rolling(20).mean().tail(30)
    recent_df['ma60'] = df['Close'].rolling(60).mean().tail(30)
    recent_df['ma120'] = df['Close'].rolling(120).mean().tail(30)
    
    # 날짜를 문자열로 변환하여 JSON 형태로 만듦
    # Date 인덱스가 있는 경우 처리
    if isinstance(recent_df.index, pd.DatetimeIndex):
        recent_df['date_str'] = recent_df.index.strftime('%Y-%m-%d')
    else:
        recent_df['date_str'] = recent_df['Date'].dt.strftime('%Y-%m-%d') if 'Date' in recent_df.columns else "Unknown"

    chart_data_list = []
    for _, row in recent_df.iterrows():
        chart_data_list.append({
            "date": row['date_str'],
            "open": int(row['Open']) if not pd.isna(row['Open']) else 0,
            "high": int(row['High']) if not pd.isna(row['High']) else 0,
            "low": int(row['Low']) if not pd.isna(row['Low']) else 0,
            "close": int(row['Close']) if not pd.isna(row['Close']) else 0,
            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0,
            "ma5": int(row['ma5']) if not pd.isna(row['ma5']) else 0,
            "ma20": int(row['ma20']) if not pd.isna(row['ma20']) else 0,
            "ma60": int(row['ma60']) if not pd.isna(row['ma60']) else 0
        })

    prompt = f"""
당신은 대한민국 최고의 '기술적 차트 분석 전문가(Technical Analyst)'입니다.
다음은 {ticker}의 최근 30영업일 캔들, 거래량, 이동평균선(ma) 데이터입니다.
이 데이터를 바탕으로 주식 초보자도 이해하기 쉽게 입체적인 차트 분석 브리핑을 작성해 주세요.

[차트 데이터 (최근 30일)]
{json.dumps(chart_data_list[-15:], ensure_ascii=False)} # 최근 15일치만 프롬프트에 포함하여 핵심 집중
* 참고: 데이터의 마지막 항목이 오늘(가장 최근) 데이터입니다.

[⚠️ 매우 중요: 유사투자자문업 법적 준수 사항]
당신은 투자 자문가가 아닙니다. 불특정 다수에게 팩트만 전달하는 AI 브리핑 도구입니다.
1. "매수하세요", "매도하세요", "보유하세요", "비중을 확대하세요", "관심있게 지켜보세요" 등의 행동 지시어나 추천/권유 표현을 절대 사용하지 마세요.
2. "목표가", "손절가", "진입점" 등 특정 가격을 제시하지 마세요.
3. 오직 캔들 패턴(예: 밑꼬리가 길다, 장대양봉 등), 거래량 추이, 이동평균선의 상태(돌파, 지지, 저항, 골든크로스, 데드크로스) 등 '기술적 지표의 객관적 상태'만 해석하세요.
4. 초보자가 읽기 편하게 HTML <b>, <strong>, 혹은 Markdown **강조** 등을 섞어 3~4문장으로 깔끔하게 작성하세요.
5. 분석 내용 가장 마지막(하단)에 반드시 다음 면책 조항을 `<br><br><small class="text-red-400 font-bold">⚠️ 본 분석은 기계적으로 산출된 통계 및 기술적 지표일 뿐, 투자 권유나 자문이 아니며 모든 투자 판단의 책임은 본인에게 있습니다.</small>` 형태로 똑같이 포함시키세요.

출력은 반드시 아래 JSON 형식을 엄격하게 지켜주세요:
{{
    "text": "차트 분석 결과 내용 (HTML 태그 및 면책조항 포함)",
    "status": "positive 또는 negative 또는 normal 중 하나 (차트 분위기 파악)",
    "tips": [
        {{"label": "핵심 키워드1 (예: 골든크로스)", "desc": "해당 키워드에 대한 초보자용 짧은 설명"}},
        {{"label": "핵심 키워드2 (예: 장대양봉)", "desc": "설명..."}}
    ]
}}
"""
    try:
        response = generate_with_retry(prompt, json_mode=True, timeout=30)
        # Gemini API returns a GenerateContentResponse object, we need to extract and parse its text
        response_text = response.text
        response_data = json.loads(response_text)
        
        if isinstance(response_data, dict) and "text" in response_data:
            return response_data
    except Exception as e:
        print(f"Beginner Insight AI Gen Error: {e}")
        
    # AI 생성 실패 시 기존 하드코딩된 폴백 메시지 반환
    return {
        "text": "현재 차트 데이터를 기반으로 AI 분석 엔진이 정보를 갱신하고 있습니다. 이동평균선과 거래량 추이를 통해 추세를 관찰해 보세요.<br><br><small class='text-red-400 font-bold'>⚠️ 본 분석은 기술적 지표일 뿐, 투자 권유나 자문이 아니며 모든 투자 판단의 책임은 본인에게 있습니다.</small>",
        "status": "normal",
        "tips": [
            {"label": "이동평균선", "desc": "과거 일정 기간 동안의 주가 평균을 선으로 연결한 지표입니다."}
        ]
    }

def get_chart_analysis_full(symbol, interval="1d", period=None):
    """
    Combined analysis: Weather + Whale Tracker + Full History (Chart) + Beginner Insight
    """
    code = symbol
    yf_ticker = get_yf_ticker(code)
    
    from stock_events import detect_inflection_points
    
    # Initialize variables to avoid UnboundLocalError
    history = []
    stories = []
    beginner_insight = {"text": "분석 데이터가 부족합니다.", "status": "normal", "tips": []}
    weather = {"pattern": "분석 중", "comment": "데이터를 불러오는 중입니다."}

    try:
        # [NEW] Strictly limit intraday intervals to 1d to prevent performance lag
        is_intraday = interval in ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"]
        
        if is_intraday:
            yf_period = "1d"
        elif not period:
            if interval == "1wk": period = "2y"
            elif interval == "1mo": period = "5y"
            else: period = "1y"
            yf_period = period
        else:
            yf_period = period
            if period == "1주일": yf_period = "5d"
            elif period == "3개월": yf_period = "3mo"
            elif period == "1년": yf_period = "1y"
            elif period == "3년": yf_period = "3y"
            elif period == "5년": yf_period = "5y"
            elif period == "10년": yf_period = "10y"
            elif period == "1일": yf_period = "1d"

        df = yf.Ticker(yf_ticker).history(period=yf_period, interval=interval)
        
        if not df.empty:
            df_reset = df.reset_index()
            date_col = 'Date' if 'Date' in df_reset.columns else 'Datetime'
            
            for _, row in df_reset.iterrows():
                date_str = row[date_col].strftime('%Y-%m-%d %H:%M') if yf_period == "1d" else row[date_col].strftime('%Y-%m-%d')
                history.append({
                    "date": date_str, "open": row['Open'], "high": row['High'], "low": row['Low'], "close": row['Close'], "volume": row['Volume']
                })
            
            stories = detect_inflection_points(yf_ticker, yf_period, interval)
            
            # Beginner Insight (1y daily)
            insight_df = df
            if interval != "1d" or yf_period != "1y":
                insight_df = yf.Ticker(yf_ticker).history(period="1y", interval="1d")
            beginner_insight = generate_beginner_insight(insight_df, ticker=yf_ticker)
        
        weather = chart_analyzer.analyze_weather_forecast(yf_ticker, df=df)
        
    except Exception as e:
        print(f"Chart Full Fetch Error: {e}")

    return {
        "weather": weather,
        "whale": chart_analyzer.analyze_whale_tracker(code),
        "history": history,
        "stories": stories,
        "beginner_insight": beginner_insight,
        "debug_v": "v2.2"
    }
