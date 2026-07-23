import pandas as pd
import numpy as np

class PatternStatistician:
    """
    캔들 패턴을 인식하고 역사적 확률(날씨)을 계산하는 클래스
    """
    
    def __init__(self):
        pass

    def identify_patterns(self, df: pd.DataFrame):
        """
        DataFrame(Open, High, Low, Close)에서 마지막 캔들의 패턴을 식별합니다.
        Returns: list of pattern names (Korean)
        """
        if len(df) < 2: # At least 2 candles for comparison
            return []
            
        patterns = []
        
        # 최신 캔들
        curr = df.iloc[-1]
        prev = df.iloc[-2]
        
        # 캔들 속성 계산
        body = abs(curr['Close'] - curr['Open'])
        upper_shadow = curr['High'] - max(curr['Close'], curr['Open'])
        lower_shadow = min(curr['Close'], curr['Open']) - curr['Low']
        total_range = curr['High'] - curr['Low']
        
        if total_range == 0:
            return ["도지형"] # 변동 없음
            
        body_ratio = body / total_range
        upper_ratio = upper_shadow / total_range
        lower_ratio = lower_shadow / total_range
        
        # 1. 망치형 (Hammer) - 하락 추세나 바닥권에서 발생 시 상승 반전 신호
        # 몸통이 작고 아래 꼬리가 긺 (몸통의 2배 이상)
        if lower_ratio > 0.6 and upper_ratio < 0.1:
            patterns.append("망치형")
            
        # 2. 유성형 (Shooting Star) - 상승 추세에서 발생 시 하락 반전 신호
        # 몸통이 작고 윗 꼬리가 긺
        if upper_ratio > 0.6 and lower_ratio < 0.1:
            patterns.append("유성형")
            
        # 3. 장대 양봉 (Long Bullish)
        if curr['Close'] > curr['Open'] and body_ratio > 0.8:
            patterns.append("장대 양봉")
            
        # 4. 장대 음봉 (Long Bearish)
        if curr['Close'] < curr['Open'] and body_ratio > 0.8:
            patterns.append("장대 음봉")
            
        # 5. 도지형 (Doji) - 시가와 종가가 거의 같음
        if body_ratio < 0.05:
            patterns.append("도지형")
            
        # 6. 상승 장악형 (Bullish Engulfing)
        # 전일 음봉, 금일 양봉이 전일 몸통을 감쌈
        if (prev['Close'] < prev['Open']) and (curr['Close'] > curr['Open']):
            if curr['Open'] < prev['Close'] and curr['Close'] > prev['Open']:
                 patterns.append("상승 장악형")

        # 7. 하락 장악형 (Bearish Engulfing)
        if (prev['Close'] > prev['Open']) and (curr['Close'] < curr['Open']):
             if curr['Open'] > prev['Close'] and curr['Close'] < prev['Open']:
                 patterns.append("하락 장악형")
                 
        return patterns

    def calculate_rsi(self, series, period=14):
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    def identify_trend(self, df: pd.DataFrame):
        """
        이동평균선과 RSI를 결합하여 더 정교한 추세를 식별합니다.
        """
        if len(df) < 20:
            return "횡보세"
            
        curr = df.iloc[-1]
        
        # Calculate MA20 and Slope
        ma20 = df['Close'].rolling(window=20).mean()
        curr_ma20 = ma20.iloc[-1]
        prev_ma20 = ma20.iloc[-5] if len(ma20) > 5 else curr_ma20
        ma_slope = (curr_ma20 - prev_ma20) / prev_ma20
        
        # Calculate RSI
        rsi = self.calculate_rsi(df['Close']).iloc[-1]
        
        trend = "횡보세"
        
        if curr['Close'] > curr_ma20:
            if ma_slope > 0.005: # 0.5% rise over 5 days
                trend = "강한 상승 추세"
            else:
                trend = "완만한 상승 추세"
        elif curr['Close'] < curr_ma20:
            if ma_slope < -0.005:
                trend = "강한 하락 추세"
            else:
                trend = "완만한 하락 추세"
                
        # RSI Filter
        if rsi > 70:
            trend += " (과매수 구간)"
        elif rsi < 30:
            trend += " (과매도 구간)"
            
        return trend

    def calculate_probability(self, df: pd.DataFrame, pattern_name: str, lookback_days: int = 365):
        """
        과거 데이터 Backtest: 상승 확률(Win Rate)과 기대 수익률(Avg Return) 계산
        lookback_days: 분석할 과거 데이터 기간 (기본값: 365일, 5년 분석 시 1825일 권장)
        """
        target_df = df.iloc[-lookback_days:].copy() if len(df) > lookback_days else df.copy()
        target_df = target_df.reset_index(drop=True)
        
        # Pre-calculate indicators for speed
        target_df['MA20'] = target_df['Close'].rolling(window=20).mean()
        target_df['RSI'] = self.calculate_rsi(target_df['Close'])
        
        occurrences = 0
        rise_count = 0
        total_return = 0
        
        # Iterate history
        for i in range(20, len(target_df) - 1):
            is_match = False
            curr = target_df.iloc[i]
            prev = target_df.iloc[i-1]
            
            # Trend Pattern Matching
            if "추세" in pattern_name:
                ma20 = curr['MA20']
                rsi = curr['RSI']
                if pd.isna(ma20) or pd.isna(rsi): continue
                
                # Reconstruct simple trend logic for backtesting
                # For string matching, we simplify to main direction
                if "상승" in pattern_name and curr['Close'] > ma20:
                    is_match = True
                elif "하락" in pattern_name and curr['Close'] < ma20:
                    is_match = True
                elif "횡보" in pattern_name and abs(curr['Close'] - ma20)/ma20 < 0.01:
                    is_match = True
                    
                # Refine by RSI if in pattern name
                if "과매수" in pattern_name and rsi <= 70: is_match = False
                if "과매도" in pattern_name and rsi >= 30: is_match = False

            # Candle Pattern Matching
            else:
                body = abs(curr['Close'] - curr['Open'])
                total_range = curr['High'] - curr['Low']
                if total_range == 0: continue
                
                upper_s = curr['High'] - max(curr['Close'], curr['Open'])
                lower_s = min(curr['Close'], curr['Open']) - curr['Low']
                
                u_r = upper_s / total_range
                l_r = lower_s / total_range
                b_r = body / total_range
                
                if pattern_name == "망치형":
                    if l_r > 0.6 and u_r < 0.1: is_match = True
                elif pattern_name == "유성형":
                    if u_r > 0.6 and l_r < 0.1: is_match = True
                elif pattern_name == "장대 양봉":
                    if curr['Close'] > curr['Open'] and b_r > 0.8: is_match = True
                elif pattern_name == "장대 음봉":
                    if curr['Close'] < curr['Open'] and b_r > 0.8: is_match = True
                elif pattern_name == "도지형":
                    if b_r < 0.05: is_match = True
                elif pattern_name == "상승 장악형":
                     if (prev['Close'] < prev['Open']) and (curr['Close'] > curr['Open']):
                        if curr['Open'] < prev['Close'] and curr['Close'] > prev['Open']:
                            is_match = True
                elif pattern_name == "하락 장악형":
                     if (prev['Close'] > prev['Open']) and (curr['Close'] < curr['Open']):
                        if curr['Open'] > prev['Close'] and curr['Close'] < prev['Open']:
                            is_match = True

            if is_match:
                occurrences += 1
                next_day = target_df.iloc[i+1]
                
                # Calculate Return
                daily_return = (next_day['Close'] - curr['Close']) / curr['Close'] * 100
                total_return += daily_return
                
                if next_day['Close'] > curr['Close']:
                    rise_count += 1
                    
        if occurrences == 0:
            return {
                "pattern": pattern_name,
                "count": 0,
                "rise_prob": 0,
                "avg_return": 0,
                "weather": "Unknown"
            }
            
        rise_prob = (rise_count / occurrences) * 100
        avg_return = total_return / occurrences
        
        weather = "흐림"
        if rise_prob >= 60: weather = "맑음 ☀️"
        elif rise_prob >= 53: weather = "구름 조금 ⛅" # Adjusted thresholds
        elif rise_prob <= 40: weather = "비 🌧️"
        
        return {
            "pattern": pattern_name,
            "count": occurrences,
            "rise_prob": round(rise_prob, 1),
            "avg_return": round(avg_return, 2),
            "weather": weather
        }

if __name__ == "__main__":
    # Unit Test for Pattern Recognition
    print("Testing PatternStatistician...")
    ps = PatternStatistician()

    # 1. Test Hammer Pattern
    # Open=100, Close=102, High=102, Low=90
    # Body=2, Upper=0, Lower=10, Range=12
    # Lower/Range = 10/12 = 0.83 (>0.6) -> Hammer
    mock_hammer = pd.DataFrame([
        {"Open": 100, "High": 110, "Low": 90, "Close": 105}, # Prev
        {"Open": 100, "High": 102, "Low": 90, "Close": 102}  # Curr (Hammer)
    ])
    patterns = ps.identify_patterns(mock_hammer)
    print(f"Test Hammer: {patterns} (Expected: ['망치형'])")
    
    # 2. Test Shooting Star Pattern
    # Open=100, Close=98, High=110, Low=98
    # Body=2, Upper=10, Lower=0, Range=12
    # Upper/Range = 10/12 = 0.83 (>0.6) -> Shooting Star
    mock_shooting = pd.DataFrame([
        {"Open": 90, "High": 100, "Low": 80, "Close": 95}, # Prev
        {"Open": 100, "High": 110, "Low": 98, "Close": 98}  # Curr (Shooting Star)
    ])
    patterns_2 = ps.identify_patterns(mock_shooting)
    print(f"Test Shooting Star: {patterns_2} (Expected: ['유성형'])")

    # 3. Test Engulfing (Bullish)
    # Prev: Open 100, Close 90 (Bearish)
    # Curr: Open 85, Close 105 (Bullish, engulfs prev)
    mock_engulf = pd.DataFrame([
        {"Open": 100, "High": 100, "Low": 90, "Close": 90}, # Prev
        {"Open": 85, "High": 105, "Low": 85, "Close": 105}  # Curr
    ])
    patterns_3 = ps.identify_patterns(mock_engulf)
    print(f"Test Bullish Engulfing: {patterns_3} (Expected: ['장대 양봉', '상승 장악형'])")
