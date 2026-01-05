import yfinance as yf
import pandas as pd
import numpy as np
import scipy.optimize as sco

def get_data(symbols, period="1y"):
    """여러 종목의 수정주가 데이터를 가져옵니다."""
    data = pd.DataFrame()
    for sym in symbols:
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period=period)
            if not hist.empty:
                data[sym] = hist['Close']
        except Exception as e:
            print(f"Failed to fetch {sym}: {e}")
    return data

def portfolio_annualised_performance(weights, mean_returns, cov_matrix):
    returns = np.sum(mean_returns * weights) * 252
    std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    return std, returns

def neg_sharpe_ratio(weights, mean_returns, cov_matrix, risk_free_rate):
    p_var, p_ret = portfolio_annualised_performance(weights, mean_returns, cov_matrix)
    return -(p_ret - risk_free_rate) / p_var

def maximize_sharpe_ratio(mean_returns, cov_matrix, risk_free_rate):
    num_assets = len(mean_returns)
    args = (mean_returns, cov_matrix, risk_free_rate)
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bound = (0.0, 1.0)
    bounds = tuple(bound for asset in range(num_assets))
    
    result = sco.minimize(neg_sharpe_ratio, num_assets*[1./num_assets,], args=args,
                        method='SLSQP', bounds=bounds, constraints=constraints)
    return result

def optimize_portfolio(symbols: list):
    """
    주어진 종목 리스트에 대해 샤프 지수를 최대화하는 포트폴리오 비중을 계산합니다.
    """
    try:
        if len(symbols) < 2:
            return {"error": "At least 2 symbols are required."}

        df = get_data(symbols, period="1y")
        
        # 데이터가 부족한 종목 제거
        df.dropna(axis=1, how='all', inplace=True)
        df.dropna(inplace=True)
        
        if df.columns.empty:
            return {"error": "No valid data found."}
            
        returns = df.pct_change()
        mean_returns = returns.mean()
        cov_matrix = returns.cov()
        num_assets = len(mean_returns)
        risk_free_rate = 0.04 # 가정된 무위험 이자율 4%
        
        # 최적화 수행
        max_sharpe = maximize_sharpe_ratio(mean_returns, cov_matrix, risk_free_rate)
        
        optimal_weights = max_sharpe.x
        optimal_ret, optimal_vol = portfolio_annualised_performance(optimal_weights, mean_returns, cov_matrix)
        optimal_sharpe = (optimal_ret - risk_free_rate) / optimal_vol
        
        # 결과 포맷팅
        allocation = []
        for i, sym in enumerate(df.columns):
            weight = round(optimal_weights[i] * 100, 2)
            if weight > 0.01: # 0.01% 이상만 표시
                allocation.append({"symbol": sym, "weight": weight})
                
        # 비중 순으로 정렬
        allocation.sort(key=lambda x: x['weight'], reverse=True)
        
        return {
            "status": "success",
            "allocation": allocation,
            "metrics": {
                "expected_return": round(optimal_ret * 100, 2),
                "volatility": round(optimal_vol * 100, 2),
                "sharpe_ratio": round(optimal_sharpe, 2)
            }
        }
        
    except Exception as e:
        print(f"Portfolio Optimization Error: {e}")
        return {"error": str(e)}
