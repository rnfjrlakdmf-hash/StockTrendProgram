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

def generate_beginner_insight(df):
    """
    Generate very easy metaphors for beginners based on technical indicators.
    """
    if df.empty or len(df) < 120:
        return {"text": "데이터가 충분하지 않아 상세 가이드를 제공할 수 없어요. 조금만 더 지켜봐 주세요!", "status": "normal", "tips": []}

    last_row = df.iloc[-1]
    ma5 = df['Close'].rolling(5).mean().iloc[-1]
    ma20 = df['Close'].rolling(20).mean().iloc[-1]
    ma60 = df['Close'].rolling(60).mean().iloc[-1]
    ma120 = df['Close'].rolling(120).mean().iloc[-1]
    current_price = last_row['Close']
    
    insight = ""
    status = "normal"
    
    if ma5 > ma20 > ma60 > ma120:
        insight = "현재 이동평균선(5일, 20일, 60일, 120일)이 정배열 상태입니다. 단기 주가가 장기 평균선 위에 위치해 있습니다. "
        status = "positive"
    elif ma5 < ma20 < ma60 < ma120:
        insight = "현재 이동평균선(5일, 20일, 60일, 120일)이 역배열 상태입니다. 단기 주가가 장기 평균선 아래에 위치해 있습니다. "
        status = "negative"
    else:
        insight = "현재 이동평균선이 혼재된 상태(횡보 추세)입니다. 뚜렷한 상승이나 하락 방향성이 통계적으로 나타나지 않고 있습니다. "
    
    if current_price > ma20:
        insight += "오늘 종가는 최근 20일 평균 가격선 위에 형성되어 있습니다. "
    else:
        insight += "오늘 종가는 최근 20일 평균 가격선 아래에 형성되어 있습니다. "
        
    avg_vol = df['Volume'].tail(20).mean()
    if last_row['Volume'] > avg_vol * 1.5:
        insight += "오늘 거래량은 최근 20일 평균 거래량 대비 1.5배 이상 수치입니다. "
    
    insight += "\n\n<small>* 본 지표는 과거 데이터를 바탕으로 기계적으로 산출된 통계값이며, 투자를 권유하거나 미래 수익을 보장하지 않습니다. 모든 투자 결정의 책임은 본인에게 있습니다.</small>"

    return {
        "text": insight,
        "status": status,
        "tips": [
            {"label": "5일선", "desc": "최근 5영업일 간의 종가 평균을 이은 선입니다."},
            {"label": "20일선", "desc": "최근 20영업일 간의 종가 평균을 이은 선입니다."},
            {"label": "60일선", "desc": "최근 60영업일 간의 종가 평균을 이은 선입니다."},
            {"label": "120일선", "desc": "최근 120영업일 간의 종가 평균을 이은 선입니다."}
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
            beginner_insight = generate_beginner_insight(insight_df)
        
        weather = chart_analyzer.analyze_weather_forecast(yf_ticker, df=df)
        
    except Exception as e:
        print(f"Chart Full Fetch Error: {e}")

    return {
        "weather": weather,
        "whale": chart_analyzer.analyze_whale_tracker(code),
        "history": history,
        "stories": stories,
        "beginner_insight": beginner_insight,
        "debug_v": "v2.1"
    }
