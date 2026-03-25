import pandas as pd
import numpy as np
from datetime import datetime
from pattern_statistics import PatternStatistician
from korea_data import get_naver_daily_prices, get_investor_history, search_stock_code, get_naver_stock_info

class ChartAnalyzer:
    def __init__(self):
        self.stats = PatternStatistician()

    def analyze_weather_forecast(self, ticker: str, df: pd.DataFrame = None):
        """
        '내일의 날씨 예보': 캔들 패턴 기반 통계적 확률 분석
        ticker: YFinance acceptable ticker (e.g. 005930.KS)
        df: Optional pre-fetched DataFrame
        """
        try:
            # Fetch 5 years data
            # Use yfinance for speed on history
            import yfinance as yf
            
            if df is None or df.empty:
                df = yf.Ticker(ticker).history(period="5y")

            if df.empty or len(df) < 20: 
                return {"weather": "Unknown", "probability": 0, "pattern": "데이터 부족", "count": 0}
            
            # Identify current pattern
            patterns = self.stats.identify_patterns(df)
            
            main_pattern = ""
            if not patterns:
                # Fallback to Trend Analysis
                main_pattern = self.stats.identify_trend(df)
            else:
                # Pick the most significant pattern (last one)
                main_pattern = patterns[-1]
            
            # Backtest (Lookback 5 years = approx 1825 days)
            result = self.stats.calculate_probability(df, main_pattern, lookback_days=1825)
            
            # Formulate comment based on pattern type
            comment = ""
            avg_return_str = f"{result['avg_return']}%" if result['avg_return'] > 0 else f"{result['avg_return']}%"
            
            if "추세" in main_pattern:
                comment = f"현재 '{main_pattern}'입니다. 과거 5년간 유사한 패턴에서 {result['rise_prob']}% 확률로 다음날 평균 {avg_return_str} 변동했습니다."
            else:
                comment = f"지난 5년간 '{main_pattern}' 발생 {result['count']}회 중 {result['rise_prob']}% 확률로 상승 (평균 {avg_return_str}) 했습니다."

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
        '세력 평단가 추적기': 최근 3개월 기관/외국인 추정 평단가 산출
        code: 6-digit stock code
        """
        # Fetch 40 days (approx 2 months) to prevent timeout
        data = get_investor_history(code, days=40)
        
        if not data:
            return None # Frontend will handle null
            
        # Calculate VWAP (Volume Weighted Average Price) for Net Buys
        # Logic: 
        # Only count days where they BOUGHT (Net Buy > 0).
        # We assume they bought at that day's 'Close' (or Avg of High/Low). 'Close' is simple proxy.
        # This is an ESTIMATE.
        
        inst_buy_sum = 0
        inst_vol_sum = 0
        frgn_buy_sum = 0
        frgn_vol_sum = 0
        
        current_price = data[0]['price'] # Latest price
        
        # Breakdown for Candle Ingredients (Last 5 days)
        ingredients = []
        for i in range(min(5, len(data))):
            d = data[i]
            # Estimate Retail: Purely residual?
            # Naver doesn't give Retail Net Buy in that table usually.
            # But usually Sum(Net Buy) ~= 0 (excluding Pension/Etc).
            # Let's estimate Retail = -(Inst + Frgn). THIS IS ROUGH.
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
                )[0] if max(retail, d['foreigner'], d['institution']) > 0 else "매도 우위"
            })

        # Whale Calculation (3 Months)
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

# Singleton instance
chart_analyzer = ChartAnalyzer()

def get_chart_analysis_full(symbol: str, interval: str = "1d"):
    """
    Main Entrypoint: Aggregates Weather, Whale, and Ingredients.
    Handles Symbol Resolution (Name -> Code) and Market Type (KS/KQ).
    """
    code = symbol
    # 1. Resolve Name to Code if needed
    # If not 6 digits, assume it is a keyword
    if not (symbol.isdigit() and len(symbol) == 6):
        found_code = search_stock_code(symbol)
        if found_code:
            code = found_code
        else:
            # Try cleaning input (e.g. 005930.KS -> 005930)
            clean = symbol.split('.')[0]
            if clean.isdigit() and len(clean) == 6:
                code = clean
    
    # Final validation
    if not code.isdigit() or len(code) != 6:
import pandas as pd
import numpy as np
from datetime import datetime
from pattern_statistics import PatternStatistician
from korea_data import get_naver_daily_prices, get_investor_history, search_stock_code, get_naver_stock_info

class ChartAnalyzer:
    def __init__(self):
        self.stats = PatternStatistician()

    def analyze_weather_forecast(self, ticker: str, df: pd.DataFrame = None):
        """
        '내일의 날씨 예보': 캔들 패턴 기반 통계적 확률 분석
        ticker: YFinance acceptable ticker (e.g. 005930.KS)
        df: Optional pre-fetched DataFrame
        """
        try:
            # Fetch 5 years data
            # Use yfinance for speed on history
            import yfinance as yf
            
            if df is None or df.empty:
                df = yf.Ticker(ticker).history(period="5y")

            if df.empty or len(df) < 20: 
                return {"weather": "Unknown", "probability": 0, "pattern": "데이터 부족", "count": 0}
            
            # Identify current pattern
            patterns = self.stats.identify_patterns(df)
            
            main_pattern = ""
            if not patterns:
                # Fallback to Trend Analysis
                main_pattern = self.stats.identify_trend(df)
            else:
                # Pick the most significant pattern (last one)
                main_pattern = patterns[-1]
            
            # Backtest (Lookback 5 years = approx 1825 days)
            result = self.stats.calculate_probability(df, main_pattern, lookback_days=1825)
            
            # Formulate comment based on pattern type
            comment = ""
            avg_return_str = f"{result['avg_return']}%" if result['avg_return'] > 0 else f"{result['avg_return']}%"
            
            if "추세" in main_pattern:
                comment = f"현재 '{main_pattern}'입니다. 과거 5년간 유사한 패턴에서 {result['rise_prob']}% 확률로 다음날 평균 {avg_return_str} 변동했습니다."
            else:
                comment = f"지난 5년간 '{main_pattern}' 발생 {result['count']}회 중 {result['rise_prob']}% 확률로 상승 (평균 {avg_return_str}) 했습니다."

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
        '세력 평단가 추적기': 최근 3개월 기관/외국인 추정 평단가 산출
        code: 6-digit stock code
        """
        # Fetch 40 days (approx 2 months) to prevent timeout
        data = get_investor_history(code, days=40)
        
        if not data:
            return None # Frontend will handle null
            
        # Calculate VWAP (Volume Weighted Average Price) for Net Buys
        # Logic: 
        # Only count days where they BOUGHT (Net Buy > 0).
        # We assume they bought at that day's 'Close' (or Avg of High/Low). 'Close' is simple proxy.
        # This is an ESTIMATE.
        
        inst_buy_sum = 0
        inst_vol_sum = 0
        frgn_buy_sum = 0
        frgn_vol_sum = 0
        
        current_price = data[0]['price'] # Latest price
        
        # Breakdown for Candle Ingredients (Last 5 days)
        ingredients = []
        for i in range(min(5, len(data))):
            d = data[i]
            # Estimate Retail: Purely residual?
            # Naver doesn't give Retail Net Buy in that table usually.
            # But usually Sum(Net Buy) ~= 0 (excluding Pension/Etc).
            # Let's estimate Retail = -(Inst + Frgn). THIS IS ROUGH.
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
                )[0] if max(retail, d['foreigner'], d['institution']) > 0 else "매도 우위"
            })

        # Whale Calculation (3 Months)
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

# Singleton instance
chart_analyzer = ChartAnalyzer()

def get_yf_ticker(symbol: str) -> str:
    """
    Resolves a stock symbol (name or code) to a yfinance-compatible ticker string (e.g., 005930.KS).
    """
    code = symbol
    # 1. Resolve Name to Code if needed
    # If not 6 digits, assume it is a keyword
    if not (symbol.isdigit() and len(symbol) == 6):
        found_code = search_stock_code(symbol)
        if found_code:
            code = found_code
        else:
            # Try cleaning input (e.g. 005930.KS -> 005930)
            clean = symbol.split('.')[0]
            if clean.isdigit() and len(clean) == 6:
                code = clean
    
    # Final validation
    if not code.isdigit() or len(code) != 6:
        # If code is still invalid, return original symbol which will likely fail yfinance
        # The caller (get_chart_analysis_full) should handle this error.
        return symbol

    # 2. Determine Market Type for YFinance (KS vs KQ)
    # Default to KS, but check Naver for KOSDAQ
    yf_ticker = f"{code}.KS"
    
    info = get_naver_stock_info(code)
    if info:
        if info.get('market_type') == 'KQ':
            yf_ticker = f"{code}.KQ"
    return yf_ticker

def generate_beginner_insight(df):
    """
    Generate very easy metaphors for beginners based on technical indicators.
    """
    if df.empty or len(df) < 120:
        return "데이터가 충분하지 않아 상세 가이드를 제공할 수 없어요. 조금만 더 지켜봐 주세요!"

    last_row = df.iloc[-1]
    
    # Calculate MAs
    ma5 = df['Close'].rolling(5).mean().iloc[-1]
    ma20 = df['Close'].rolling(20).mean().iloc[-1]
    ma60 = df['Close'].rolling(60).mean().iloc[-1]
    ma120 = df['Close'].rolling(120).mean().iloc[-1]
    
    current_price = last_row['Close']
    
    insight = ""
    status = "normal" # positive, negative, normal
    
    # 1. Trend Analysis (Metaphor: Path/Road)
    if ma5 > ma20 > ma60 > ma120:
        insight = "지금 이 주식은 **'탄탄한 고속도로'** 위에 있어요! 단기부터 장기까지 모두 상승 중인 아주 건강한 상태(정배열)입니다. "
        status = "positive"
    elif ma5 < ma20 < ma60 < ma120:
        insight = "현재 **'가파른 내리막길'**을 걷고 있어요. 서두르기보다는 비가 그치기를 기다리는 여유가 필요한 시점(역배열)입니다. "
        status = "negative"
    else:
        insight = "지금은 **'안개 낀 교차로'**에 서 있는 것 같아요. 방향을 정하기 위해 힘을 모으고 있는 박스권 구간입니다. "
        
    # 2. Moving Average Meanings (Metaphors)
    if current_price > ma20:
        insight += "심리적 지지선인 20일선(한 달 평균) 위에 있어 투자자들의 기분이 좋은 상태예요. "
    else:
        insight += "현재 주가가 20일선 아래에 있어 시장이 조금 긴장하고 있는 모습이에요. "
        
    # 3. Volume (Metaphor: Energy)
    avg_vol = df['Volume'].tail(20).mean()
    last_vol = last_row['Volume']
    if last_vol > avg_vol * 1.5:
        insight += "오늘 에너지가 평소보다 **1.5배 이상 강력**해요! 누군가 큰 관심을 보이고 있다는 신호일 수 있습니다. 🔥"
    
    return {
        "text": insight,
        "status": status,
        "tips": [
            {"label": "5일선", "desc": "주식의 '오늘 컨디션'이에요. 활발하게 움직이는지 알 수 있습니다."},
            {"label": "20일선", "desc": "투자자들의 '심리 마지노선'이에요. 이 위면 보통 안심해요."},
            {"label": "120일선", "desc": "주식의 '기초 체력'이에요. 이 선이 위를 향하면 장기적으로 튼튼하다는 뜻입니다."}
        ]
    }

def get_chart_analysis_full(symbol, interval="1d", period=None):
    """
    Combined analysis: Weather + Whale Tracker + Full History (Chart) + Stories + Beginner Insight
    """
    code = symbol
    yf_ticker = get_yf_ticker(code)
    
    if not (yf_ticker.split('.')[0].isdigit() and len(yf_ticker.split('.')[0]) == 6):
        return {"error": "Invalid Symbol", "weather": {"weather": "Unknown"}, "whale": None, "history": [], "stories": []}

    import yfinance as yf
    from stock_events import detect_inflection_points
    
    history = []
    stories = []
    weather = {"weather": "Unknown", "probability": 0, "pattern": "데이터 실패", "count": 0}
    beginner_insight = {"text": "분석 중...", "status": "normal", "tips": []}

    try:
        if not period:
            if interval == "1wk": period = "2y"
            elif interval == "1mo": period = "5y"
            else: period = "1y"
        
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
            
            stories = detect_inflection_points(yf_ticker, interval, df)
            
            # [New] Generate Beginner Insight using daily data (if not available, fetch 1y daily)
            insight_df = df
            if interval != "1d":
                insight_df = yf.Ticker(yf_ticker).history(period="1y", interval="1d")
            beginner_insight = generate_beginner_insight(insight_df)
        
        weather = chart_analyzer.analyze_weather_forecast(yf_ticker, df=df)
        
    except Exception as e:
        print(f"History Fetch Error: {e}")

    return {
        "weather": weather,
        "whale": chart_analyzer.analyze_whale_tracker(code),
        "history": history,
        "stories": stories,
        "beginner_insight": beginner_insight
    }
