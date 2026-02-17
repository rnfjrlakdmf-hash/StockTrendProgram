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

def get_chart_analysis_full(symbol: str):
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
        return {"error": "Invalid Symbol", "weather": {"weather": "Unknown"}, "whale": None}

    # 2. Determine Market Type for YFinance (KS vs KQ)
    # Default to KS, but check Naver for KOSDAQ
    yf_ticker = f"{code}.KS"
    
    info = get_naver_stock_info(code)
    if info:
        if info.get('market_type') == 'KQ':
            yf_ticker = f"{code}.KQ"
            
    # [Improvement] Fetch History Once and Reuse
    import yfinance as yf
    history = []
    weather = {"weather": "Unknown", "probability": 0, "pattern": "데이터 실패", "count": 0}

    try:
        # Fetch 1 year data
        df = yf.Ticker(yf_ticker).history(period="1y")
        
        # Format history for Frontend (recharts)
        if not df.empty:
            df_reset = df.reset_index()
            for _, row in df_reset.iterrows():
                history.append({
                    "date": row['Date'].strftime('%Y-%m-%d'),
                    "open": row['Open'],
                    "high": row['High'],
                    "low": row['Low'],
                    "close": row['Close'],
                    "volume": row['Volume']
                })
        
        # Pass DF to weather analyzer to avoid re-fetching
        weather = chart_analyzer.analyze_weather_forecast(yf_ticker, df=df)
        
    except Exception as e:
        print(f"History Fetch Error: {e}")

    return {
        "weather": weather,
        "whale": chart_analyzer.analyze_whale_tracker(code),
        "history": history # For Candle Chart
    }
