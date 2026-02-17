import yfinance as yf
import pandas as pd
import numpy as np
try:
    import scipy.optimize as sco
    SCIPY_AVAILABLE = True
except ImportError:
    sco = None
    SCIPY_AVAILABLE = False
    print("[WARNING] scipy not installed. Portfolio optimization will be unavailable.")

# Common Korean stock name to ticker mapping
NAME_TO_TICKER = {
    "삼성전자": "005930.KS",
    "SK하이닉스": "000660.KS",
    "LG에너지솔루션": "373220.KS",
    "삼성바이오로직스": "207940.KS",
    "현대차": "005380.KS",
    "기아": "000270.KS",
    "셀트리온": "068270.KS",
    "KB금융": "105560.KS",
    "신한지주": "055550.KS",
    "NAVER": "035420.KS",
    "네이버": "035420.KS",
    "POSCO홀딩스": "005490.KS",
    "포스코홀딩스": "005490.KS",
    "삼성물산": "028260.KS",
    "현대모비스": "012330.KS",
    "카카오": "035720.KS",
    "하나금융지주": "086790.KS",
    "메리츠금융지주": "138040.KS",
    "LG전자": "066570.KS",
    "삼성생명": "032830.KS",
    "삼성SDI": "006400.KS",
    "삼성중공업": "010140.KS",
    "한국전력": "015760.KS",
    "HMM": "011200.KS",
    "두산에너빌리티": "034020.KS",
    "하이브": "352820.KS",
    "대한항공": "003490.KS",
    "SK텔레콤": "017670.KS",
    "고려아연": "010130.KS",
    "KT&G": "033780.KS",
    "우리금융지주": "316140.KS",
    "기업은행": "024110.KS",
    "S-Oil": "010950.KS",
    "에쓰오일": "010950.KS",
    "HD현대중공업": "329180.KS",
    "LG화학": "051910.KS",
}

def resolve_ticker(name: str) -> str:
    # 1. Check mapping
    if name in NAME_TO_TICKER:
        return NAME_TO_TICKER[name]
    
    # 2. Handle partial matches or English variations if needed (Simple version)
    # If it ends with .KS or .KQ, assume it's already a ticker
    if name.endswith('.KS') or name.endswith('.KQ'):
        return name
        
    # 3. If it looks like a US ticker (all alpha), return as is
    # If it looks like a KR code (6 digits), append .KS
    if name.isdigit() and len(name) == 6:
        return f"{name}.KS"
        
    return name

def get_data(symbols, period="1y"):
    """여러 종목의 수정주가 데이터를 가져옵니다."""
    data = pd.DataFrame()
    for sym_input in symbols:
        sym = resolve_ticker(sym_input) # Resolve name to ticker
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period=period)
            if not hist.empty:
                # Use original input name for column if possible, or ticker
                # But to avoid confusion, let's use the resolved ticker or a Display Name map back?
                # For optimization math, key doesn't matter much, but for display it does.
                # Let's keep the user's input symbol as the key if possible, OR mapped ticker.
                # Using resolved ticker is safer for uniqueness.
                data[sym_input] = hist['Close']
            else:
                print(f"Empty data for {sym} (Input: {sym_input})")
        except Exception as e:
            print(f"Failed to fetch {sym} (Input: {sym_input}): {e}")
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
        if not SCIPY_AVAILABLE:
            return {"error": "scipy is not installed on this server. Portfolio optimization is unavailable."}
        
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
