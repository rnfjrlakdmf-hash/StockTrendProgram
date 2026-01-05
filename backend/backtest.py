import yfinance as yf
import pandas as pd
import numpy as np

def run_backtest(symbol: str, period="1y", initial_capital=10000):
    """
    간단한 이동평균 교차(Golden Cross) 전략 백테스팅
    - 매수: 단기 이평선(5일) > 장기 이평선(20일)
    - 매도: 단기 이평선(5일) < 장기 이평선(20일)
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"error": "No data found"}
            
        # 데이터 전처리
        df = hist[['Close']].copy()
        df['SMA_Short'] = df['Close'].rolling(window=5).mean()
        df['SMA_Long'] = df['Close'].rolling(window=20).mean()
        
        # 포지션 계산 (1: 매수 상태, 0: 현금 보유)
        df['Signal'] = 0
        df.loc[df['SMA_Short'] > df['SMA_Long'], 'Signal'] = 1
        
        # 일별 수익률 계산
        df['Returns'] = df['Close'].pct_change()
        
        # 전략 수익률: 어제 시그널을 보고 오늘 시초가에 진입했다고 가정(혹은 종가 진입)
        # 여기서는 종가 기준 간단 계산 (Signal을 하루 뒤로 미뤄서 곱함)
        df['Strategy Returns'] = df['Signal'].shift(1) * df['Returns']
        
        # 누적 자산 가치 (Equity Curve)
        df['Cumulative Strategy'] = (1 + df['Strategy Returns']).cumprod() * initial_capital
        df['Cumulative BuyHold'] = (1 + df['Returns']).cumprod() * initial_capital
        
        # NaN 처리
        df.fillna(method='bfill', inplace=True)
        df.fillna(initial_capital, inplace=True) # 앞부분 NaN은 초기 자본금으로
        
        # 최종 결과 산출
        final_equity = df['Cumulative Strategy'].iloc[-1]
        buy_hold_equity = df['Cumulative BuyHold'].iloc[-1]
        
        total_return = ((final_equity - initial_capital) / initial_capital) * 100
        buy_hold_return = ((buy_hold_equity - initial_capital) / initial_capital) * 100
        
        # MDD (Max Drawdown) 계산
        running_max = df['Cumulative Strategy'].cummax()
        drawdown = (df['Cumulative Strategy'] - running_max) / running_max
        max_drawdown = drawdown.min() * 100
        
        # 차트용 데이터 변환 (날짜 인덱스를 문자열로)
        chart_data = []
        for index, row in df.iterrows():
            chart_data.append({
                "date": index.strftime('%Y-%m-%d'),
                "strategy": round(row['Cumulative Strategy'], 2),
                "buy_hold": round(row['Cumulative BuyHold'], 2)
            })
            
        return {
            "symbol": symbol,
            "period": period,
            "initial_capital": initial_capital,
            "final_equity": round(final_equity, 2),
            "total_return": round(total_return, 2),
            "buy_hold_return": round(buy_hold_return, 2),
            "max_drawdown": round(max_drawdown, 2),
            "chart_data": chart_data # 프론트엔드 차트용
        }

    except Exception as e:
        print(f"Backtest Error: {e}")
        return {"error": str(e)}
