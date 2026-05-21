import yfinance as yf
import pandas as pd
import numpy as np

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def check_portfolio_risk(tickers=["AAPL", "TSLA", "NVDA", "MSFT", "AMD"]):
    """
    지정된 종목들의 위험 요소를 분석합니다.
    - 급등락 감지 (3% 이상)
    - RSI 과열/침체 감지
    """
    alerts = []
    total_volatility = 0
    safe_score = 100
    
    for symbol in tickers:
        try:
            # 최근 1개월 데이터 가져오기 (RSI 계산용)
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1mo")
            
            if hist.empty:
                continue
                
            current_price = hist['Close'].iloc[-1]
            prev_price = hist['Close'].iloc[-2]
            change_pct = ((current_price - prev_price) / prev_price) * 100
            
            # 1. 급등락 감지
            if abs(change_pct) >= 3.0:
                level = "Critical" if abs(change_pct) >= 5.0 else "High"
                msg = f"장중 {change_pct:+.1f}% 급등락 발생"
                alerts.append({
                    "name": f"{symbol}", 
                    "alertType": "변동성 경고",
                    "message": msg,
                    "level": level,
                    "time": "실시간"
                })
                safe_score -= 10
            
            # 2. RSI 감지
            rsi = calculate_rsi(hist['Close']).iloc[-1]
            if rsi >= 70:
                alerts.append({
                    "name": f"{symbol}",
                    "alertType": "RSI 과열",
                    "message": f"RSI {rsi:.0f} (매도 구간 진입)",
                    "level": "Medium",
                    "time": "기술적 지표"
                })
                safe_score -= 5
            elif rsi <= 30:
                alerts.append({
                    "name": f"{symbol}",
                    "alertType": "RSI 침체",
                    "message": f"RSI {rsi:.0f} (과매도 구간)",
                    "level": "Low", 
                    "time": "기술적 지표"
                })
            
            # 변동성 누적 (단순 절대값 평균 근사치)
            total_volatility += abs(change_pct)
            
        except Exception as e:
            print(f"Risk check failed for {symbol}: {e}")
            continue

    avg_volatility = total_volatility / len(tickers) if tickers else 0
    
    # 안전 점수 보정 (0~100)
    safe_score = max(0, min(100, safe_score))

    return {
        "alerts": alerts,
        "metrics": {
            "volatility": f"{avg_volatility:.1f}%",
            "safe_score": safe_score,
            "alert_count": len(alerts)
        }
    }
