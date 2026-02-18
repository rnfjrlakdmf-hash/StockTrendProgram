import re
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ==========================================
# 1. Account Nutritionist (Sector Analysis)
# ==========================================

from korea_data import get_naver_stock_info, search_stock_code

# ==========================================
# 1. Account Nutritionist (Sector Analysis)
# ==========================================

SECTOR_NUTRIENT_MAP = {
    # Carbs: High Energy, High Growth, High Volatility
    "Technology": "탄수화물 (성장/에너지)",
    "Communication Services": "탄수화물 (성장/에너지)",
    "Consumer Cyclical": "탄수화물 (성장/에너지)",
    
    # Protein: Muscle, Stability, Core Structure
    "Financial Services": "단백질 (기초체력)",
    "Industrials": "단백질 (기초체력)",
    "Real Estate": "단백질 (기초체력)",
    
    # Vitamins: Protection, Defense, Immunity
    "Healthcare": "비타민 (면역/방어)",
    "Consumer Defensive": "비타민 (면역/방어)",
    "Utilities": "비타민 (면역/방어)",
    
    # Fat: High Density, stored energy
    "Energy": "지방 (고밀도 에너지)",
    "Basic Materials": "지방 (고밀도 에너지)",
    
    # Water: Essential but boring
    "Cash": "물 (필수 수분)",
    "Unknown": "기타 (식이섬유)"
}

# Simplified Korean Sector Mapping
KOR_SECTOR_MAP = {
    "반도체": "Technology", "IT": "Technology", "전자": "Technology", "전기": "Technology", "소프트웨어": "Technology", 
    "통신": "Communication Services", "미디어": "Communication Services", "엔터": "Communication Services", "서비스": "Communication Services",
    "제약": "Healthcare", "바이오": "Healthcare", "헬스": "Healthcare", "의료": "Healthcare",
    "은행": "Financial Services", "금융": "Financial Services", "보험": "Financial Services", "증권": "Financial Services",
    "운송": "Industrials", "항공": "Industrials", "자동차": "Industrials", "해운": "Industrials", "운수창고": "Industrials", "기계": "Industrials", "조선": "Industrials", "건설": "Industrials",
    "유통": "Consumer Cyclical", "섬유": "Consumer Cyclical", "의복": "Consumer Cyclical", "호텔": "Consumer Cyclical",
    "음식료": "Consumer Defensive", "생활용품": "Consumer Defensive",
    "화학": "Basic Materials", "철강": "Basic Materials", "금속": "Basic Materials",
    "에너지": "Energy", "정유": "Energy", "전력": "Utilities", "가스": "Utilities",
    "방송": "Communication Services", "엔터테인먼트": "Communication Services"
}

NUTRIENT_COLOR_MAP = {
    "탄수화물 (성장/에너지)": "#f59e0b", # Amber (Rice/Bread)
    "단백질 (기초체력)": "#ef4444",    # Red (Meat)
    "비타민 (면역/방어)": "#10b981",    # Green (Veggie)
    "지방 (고밀도 에너지)": "#eab308",  # Yellow (Oil)
    "물 (필수 수분)": "#3b82f6",       # Blue (Water)
    "기타 (식이섬유)": "#94a3b8"       # Gray
}

def get_korean_nutrient(kor_sector_name):
    # Heuristic mapping
    for key, val in KOR_SECTOR_MAP.items():
        if key in kor_sector_name:
            return SECTOR_NUTRIENT_MAP.get(val, "기타 (식이섬유)")
    return "기타 (식이섬유)"

def analyze_portfolio_nutrition(symbols: list) -> dict:
    """
    Analyzes portfolio sectors and maps them to 'Nutrients'.
    """
    nutrient_counts = {}
    sector_breakdown = {}
    details = [] # [New] Store per-symbol details
    
    valid_symbols = 0
    
    for symbol in symbols:
        try:
            sector = "Unknown"
            nutrient = "기타 (식이섬유)"
            
            # Clean input
            raw_sym = str(symbol).strip()
            search_code = raw_sym
            
            # 1. Check if it is a Korean Name (contains Hangul)
            if re.search('[가-힣]', raw_sym):
                found = search_stock_code(raw_sym)
                if found:
                    search_code = found
                else:
                    # Name search failed
                    pass
            
            # 2. Check for Korean Stock (Numeric code or KS/KQ suffix)
            is_korean_code = search_code.isdigit() 
            is_korean = search_code.endswith(".KS") or search_code.endswith(".KQ") or is_korean_code
            
            if is_korean:
                # Cleanup code format
                final_code = search_code
                if "." in search_code and search_code.split('.')[0].isdigit():
                    final_code = search_code.split('.')[0]
                
                info = get_naver_stock_info(final_code)
                if info:
                    sector = info.get('sector', 'Unknown')
                    nutrient = get_korean_nutrient(sector)
                else:
                    sector = "Unknown (KR)"
            else:
                # US Stock via yfinance
                ticker = yf.Ticker(search_code)
                info = ticker.info
                # Use mapped sector or directly
                # For US, yfinance returns english sectors "Technology", etc.
                # Use SECTOR_NUTRIENT_MAP directly
                raw_sector = info.get('sector', 'Unknown')
                sector = raw_sector # Keep English for now or map?
                nutrient = SECTOR_NUTRIENT_MAP.get(raw_sector, "기타 (식이섬유)")
            
            # Count
            nutrient_counts[nutrient] = nutrient_counts.get(nutrient, 0) + 1
            sector_breakdown[sector] = sector_breakdown.get(sector, 0) + 1
            valid_symbols += 1
            
            # [New] Add to details
            details.append({
                "symbol": raw_sym,
                "code": search_code,
                "sector": sector,
                "nutrient": nutrient
            })
            
        except Exception as e:
            print(f"Error fetching sector for {symbol}: {e}")
            nutrient_counts["기타 (식이섬유)"] = nutrient_counts.get("기타 (식이섬유)", 0) + 1
            details.append({
                "symbol": symbol,
                "code": symbol,
                "sector": "Error",
                "nutrient": "기타 (식이섬유)"
            })
            
    # Calculate Percentages
    nutrition_data = []
    total = max(valid_symbols, 1) # Avoid div by zero
    
    for nutrient, count in nutrient_counts.items():
        percent = round((count / total) * 100, 1)
        
        # [New] Group symbols by nutrient for frontend display
        relevant_symbols = [d['symbol'] for d in details if d['nutrient'] == nutrient]
        
        nutrition_data.append({
            "name": nutrient,
            "value": percent,
            "count": count,
            "fill": NUTRIENT_COLOR_MAP.get(nutrient, "#94a3b8"),
            "symbols": relevant_symbols # List of symbols in this nutrient
        })
        
    # Sort by value
    nutrition_data.sort(key=lambda x: x['value'], reverse=True)
        
    return {
        "nutrition": nutrition_data,
        "sectors": sector_breakdown,
        "total_assets": valid_symbols,
        "details": details 
    }

# ==========================================
# 2. Dividend Calendar (Second Salary)
# ==========================================

def fetch_seibro_dividend(stock_code: str) -> dict:
    """
    SEIBRO API를 통해 배당 정보를 조회합니다.
    Ref: getDividendRankN1 (배당순위)
    Note: API Key must be set in env as SEIBRO_API_KEY
    Returns: dict with keys 'amount', 'date', 'type' if found, else None
    """
    api_key = os.getenv("SEIBRO_API_KEY")
    if not api_key:
        return None
    
    try:
        url = "http://api.seibro.or.kr/openapi/service/StockSvc/getDividendRankN1"
        # Hex Key는 그대로 사용
        params = {
            "ServiceKey": api_key,
            "year": datetime.now().year - 1, # 작년 기준 실적
            "rankTpcd": "1", # 시가배당률순
            "stkTpcd": "1", # KOSPI
            "listTpcd": "1",
            "numOfRows": "500", # 상위 500개 조회 (매칭 확률 높이기 위해)
            "pageNo": "1"
        }
        
        res = requests.get(url, params=params, timeout=4)
        
        if res.status_code == 200 and "<resultCode>00</resultCode>" in res.text:
            # Simple XML Parsing using ElementTree
            import xml.etree.ElementTree as ET
            root = ET.fromstring(res.text)
            
            # Find item with matching code
            # Field: shotnIsin (단축코드) matches stock_code
            for item in root.findall(".//item"):
                code_node = item.find("shotnIsin")
                if code_node is not None and code_node.text == stock_code:
                    # Found the stock!
                    amt_node = item.find("divAmtPerStk") # 주당배당금
                    date_node = item.find("setaccMmdd")  # 결산월일 (예: 1231)
                    
                    amount = float(amt_node.text) if amt_node is not None and amt_node.text else 0
                    date_str = date_node.text if date_node is not None else "1229"
                    
                    # Estimate next payment date based on settlement date
                    # Usually payment is 3-4 months after settlement
                    # If settlement is 12/31, payment is usually April
                    if amount > 0:
                        return {
                            "amount": amount,
                            "settlement_date": date_str,
                            "source": "SEIBRO"
                        }
            
            # If not found in first page, maybe try KOSDAQ? (stkTpcd=2)
            # But for performance, we skip excessive calls in this loop
            
    except Exception as e:
        # print(f"[SEIBRO] Error: {e}")
        pass
        
    return None

def get_dividend_calendar(symbols: list) -> list:
    """
    Fetches dividend dates and amounts with improved accuracy.
    - US stocks: Confirmed ex-dividend date from yfinance + historical projection
    - Korean stocks: yfinance .KS history for quarterly detection + Naver fallback
    """
    calendar_events = []
    
    for symbol in symbols:
        try:
            # --- Step 1: Resolve symbol ---
            raw_sym = str(symbol).strip()
            search_code = raw_sym
            
            if re.search('[가-힣]', raw_sym):
                found = search_stock_code(raw_sym)
                if found:
                    search_code = found
                else:
                    print(f"[Dividend] Could not resolve Korean name: {raw_sym}")
                    continue
            
            # --- Step 2: Determine market type ---
            is_korean_code = search_code.isdigit()
            is_korean = search_code.endswith(".KS") or search_code.endswith(".KQ") or is_korean_code
            
            if is_korean:
                final_code = search_code
                if "." in search_code and search_code.split('.')[0].isdigit():
                    final_code = search_code.split(".")[0]
                
                # === Korean Stock Dividends ===
                # Priority 0: SEIBRO API (If key works)
                seibro_data = fetch_seibro_dividend(final_code)
                if seibro_data:
                    # Estimate payment date (Settlement + 4 months approx)
                    # ex) 1231 -> Next year April
                    settlement_mmdd = seibro_data.get('settlement_date', '1231') 
                    try:
                        month = int(settlement_mmdd[:2])
                        day = int(settlement_mmdd[2:])
                    except:
                        month=12; day=31
                    
                    year = datetime.now().year
                    # If settlement is Dec, payment is next year April
                    if month >= 11:
                        pay_year = year + 1
                        pay_month = 4
                        pay_day = 15 # Approx
                    else:
                        pay_year = year
                        pay_month = month + 3
                        if pay_month > 12:
                            pay_year += 1
                            pay_month -= 12
                        pay_day = 15
                        
                    pay_date = f"{pay_year}-{pay_month:02d}-{pay_day:02d}"
                    
                    calendar_events.append({
                        "date": pay_date,
                        "symbol": raw_sym,
                        "name": raw_sym,
                        "amount": seibro_data['amount'],
                        "currency": "KRW",
                        "type": "확정 (SEIBRO)", # 공공데이터 기반
                        "source": "공공데이터포털"
                    })
                    continue

                # Primary: yfinance .KS ticker for actual dividend history
                yf_ticker_code = f"{final_code}.KS"
                yf_success = False
                try:
                    ticker = yf.Ticker(yf_ticker_code)
                    dividends = ticker.dividends
                    
                    if not dividends.empty:
                        now = pd.Timestamp.now()
                        if dividends.index.tz is not None:
                            now = pd.Timestamp.now(tz=dividends.index.tz)
                        
                        eighteen_months_ago = now - pd.DateOffset(months=18)
                        recent_divs = dividends[dividends.index > eighteen_months_ago]
                        
                        if not recent_divs.empty:
                            num_divs = len(recent_divs)
                            if num_divs >= 4:
                                div_type = "분기배당"
                            elif num_divs >= 2:
                                div_type = "반기배당"
                            else:
                                div_type = "연간배당"
                            
                            for date, amount in recent_divs.items():
                                projected_date = date + pd.DateOffset(years=1)
                                current_time = pd.Timestamp.now(tz=date.tz) if date.tz else pd.Timestamp.now()
                                if projected_date < current_time:
                                    projected_date += pd.DateOffset(years=1)
                                
                                # Get actual month name for display
                                month = projected_date.month
                                quarter_label = f"{month}월"
                                
                                calendar_events.append({
                                    "date": projected_date.strftime("%Y-%m-%d"),
                                    "symbol": raw_sym,
                                    "name": raw_sym,
                                    "amount": float(amount),
                                    "currency": "KRW",
                                    "type": div_type,
                                    "source": "예상 (과거 이력 기반)"
                                })
                            yf_success = True
                except Exception as e:
                    print(f"[Dividend] yfinance failed for {yf_ticker_code}: {e}")

                # Fallback: Naver stock info (annual only)
                if not yf_success:
                    info = get_naver_stock_info(final_code)
                    if info and info.get('dvr', 0) > 0:
                        stock_name = info.get('name', raw_sym)
                        dvr_pct = info.get('dvr', 0) * 100
                        
                        calendar_events.append({
                            "date": f"{datetime.now().year}-12-29",
                            "symbol": raw_sym,
                            "name": stock_name,
                            "amount": info.get('dp_share', 0),
                            "yield": round(dvr_pct, 2),
                            "currency": "KRW",
                            "type": "연간배당",
                            "source": "예상 (네이버 기반)"
                        })
                continue

            # === US/Global Stock Dividends ===
            ticker = yf.Ticker(search_code)
            
            try:
                info = ticker.info
            except:
                info = {}
            
            ticker_name = info.get('shortName', raw_sym)
            ticker_currency = info.get('currency', 'USD')
            
            # Method 1: Confirmed next ex-dividend date from yfinance
            ex_div_timestamp = info.get('exDividendDate')
            last_div_value = info.get('lastDividendValue', 0)
            
            confirmed_date_str = None
            if ex_div_timestamp and last_div_value:
                try:
                    ex_div_date = datetime.fromtimestamp(ex_div_timestamp)
                    if ex_div_date > datetime.now() - timedelta(days=7):
                        confirmed_date_str = ex_div_date.strftime("%Y-%m-%d")
                        calendar_events.append({
                            "date": confirmed_date_str,
                            "symbol": raw_sym,
                            "name": ticker_name,
                            "amount": float(last_div_value),
                            "currency": ticker_currency,
                            "type": "확정 (Ex-Dividend)",
                            "source": "확정"
                        })
                except Exception as e:
                    print(f"[Dividend] Ex-div date parse error for {raw_sym}: {e}")
            
            # Method 2: Historical projection for future dates
            dividends = ticker.dividends
            if not dividends.empty:
                now = pd.Timestamp.now()
                if dividends.index.tz is not None:
                    now = pd.Timestamp.now(tz=dividends.index.tz)

                one_year_ago = now - pd.DateOffset(years=1)
                recent_divs = dividends[dividends.index > one_year_ago]
                
                num_divs = len(recent_divs)
                if num_divs >= 4:
                    div_freq = "Quarterly"
                elif num_divs >= 2:
                    div_freq = "Semi-Annual"
                else:
                    div_freq = "Annual"
                
                for date, amount in recent_divs.items():
                    projected_date = date + pd.DateOffset(years=1)
                    current_time = pd.Timestamp.now(tz=date.tz) if date.tz else pd.Timestamp.now()
                    
                    if projected_date < current_time:
                        projected_date += pd.DateOffset(years=1)
                    
                    proj_date_str = projected_date.strftime("%Y-%m-%d")
                    
                    # Skip if too close to confirmed date (avoid duplicates)
                    if confirmed_date_str:
                        try:
                            confirmed_dt = datetime.strptime(confirmed_date_str, "%Y-%m-%d")
                            proj_dt = projected_date.to_pydatetime()
                            if hasattr(proj_dt, 'replace'):
                                proj_dt = proj_dt.replace(tzinfo=None)
                            if abs((proj_dt - confirmed_dt).days) < 30:
                                continue
                        except:
                            pass
                    
                    calendar_events.append({
                        "date": proj_date_str,
                        "symbol": raw_sym,
                        "name": ticker_name,
                        "amount": float(amount),
                        "currency": ticker_currency,
                        "type": f"예상 ({div_freq})",
                        "source": "예상 (과거 이력 기반)"
                    })
                
        except Exception as e:
            print(f"Error fetching dividends for {symbol}: {e}")
            
    # Sort by date
    calendar_events.sort(key=lambda x: x['date'])
    return calendar_events

# ==========================================
# 3. Factor Precision Diagnosis (Radar)
# ==========================================

def analyze_portfolio_factors(symbols: list) -> dict:
    """
    Calculates 6-factor scores for the portfolio.
    Returns simulated/calculated scores normalized to 0-100.
    """
    
    # Store aggregate metrics
    betas = []
    pe_ratios = [] # Value (Inverse)
    yields = []
    volatilities = []
    momentums = [] # RSI or Return
    # alphas = [] 
    
    for symbol in symbols:
        try:
            is_korean_code = symbol.isdigit()
            is_korean = symbol.endswith(".KS") or symbol.endswith(".KQ") or is_korean_code
            
            beta = 1.0
            pe = 30.0
            div_yield = 0.0
            vol = 20.0
            mom = 0.0

            if is_korean:
                search_code = symbol
                if "." in symbol:
                     search_code = symbol.split(".")[0]

                info = get_naver_stock_info(search_code)
                if info:
                    # Beta (Manual Default or Future Scrape)
                    beta = 1.0 
                    
                    # Value (PER)
                    if info.get('per') and info['per'] > 0:
                        pe = info['per']
                    elif info.get('est_per') and info['est_per'] > 0:
                        pe = info['est_per']
                        
                    # Yield
                    div_yield = info.get('dvr', 0) # 0.05 etc.
                    
                    # Momentum (High/Low)
                    # Use position in 52w range as proxy for momentum
                    if info.get('year_high') and info.get('year_low') and info.get('price'):
                        h = info['year_high']
                        l = info['year_low']
                        p = info['price']
                        if h > l:
                            # 0 to 1 scale. 1 = All time high (Strong Momentum)
                            pos = (p - l) / (h - l)
                            mom = (pos - 0.5) * 100 # -50 to +50
                        else:
                            mom = 0
                    
                    # Volatility -> Default
                    vol = 20.0 

            else:
                # US Stock (yfinance)
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                beta = info.get('beta', 1.0) or 1.0
                pe = info.get('forwardPE', info.get('trailingPE', 30)) or 30
                div_yield = info.get('dividendYield', 0) or 0
                
                # Momentum & Volatility (Need history)
                hist = ticker.history(period="6mo")
                if not hist.empty:
                    returns = hist['Close'].pct_change().dropna()
                    vol = returns.std() * np.sqrt(252) * 100
                    mom = ((hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100

            betas.append(beta)
            pe_ratios.append(pe)
            yields.append(div_yield * 100) # Convert to %
            volatilities.append(vol)
            momentums.append(mom)

        except Exception as e:
            print(f"Error fetching factors for {symbol}: {e}")
            
    if not betas:
        return {}
        
    # --- Aggregation & Normalization (0-100 Scale for Radar) ---
    
    # 1. Beta Score (High Beta = High Risk/Aggressive)
    # Avg Beta 1.0 -> 50, 1.5 -> 75, 2.0 -> 100, 0.5 -> 25
    avg_beta = np.mean(betas)
    score_beta = min(max(avg_beta * 50, 0), 100)
    
    # 2. Value Score (Low P/E = High Value)
    # P/E 20 -> 50, 10 -> 75, 5 -> 100, 40 -> 25
    avg_pe = np.mean(pe_ratios)
    score_value = min(max(100 - (avg_pe * 1.5), 0), 100) # Simple heuristic
    
    # 3. Yield Score (High Yield = High Score)
    # Yield 2% -> 40, 5% -> 100
    avg_yield = np.mean(yields)
    score_yield = min(max(avg_yield * 20, 0), 100)
    
    # 4. Momentum Score (High Return = High Score)
    avg_mom = np.mean(momentums)
    score_momentum = min(max(50 + avg_mom, 0), 100) # 0% return -> 50 score
    
    # 5. Volatility Score (High Vol = High Score)
    avg_vol = np.mean(volatilities)
    score_volatility = min(max(avg_vol * 2, 0), 100) # 25% vol -> 50 score
    
    # 6. Alpha (Simulated/Heuristic for now)
    # Used Momentum vs Beta to guess? Or just random for demo if data insufficient?
    # Let's use (Momentum - Beta*5) as a proxy for "Excess Return"
    raw_alpha = avg_mom - (avg_beta * 5) # If beta is 1.0 (5% expected baseline), and mom is 10%, alpha is positive
    score_alpha = min(max(50 + raw_alpha, 0), 100)
    
    return {
        "beta": round(score_beta, 1),
        "value": round(score_value, 1),
        "yield": round(score_yield, 1),
        "momentum": round(score_momentum, 1),
        "volatility": round(score_volatility, 1),
        "alpha": round(score_alpha, 1),
        "raw_stats": {
            "avg_beta": round(avg_beta, 2),
            "avg_pe": round(avg_pe, 1),
            "avg_yield": round(avg_yield, 2),
            "avg_momentum": round(avg_mom, 1)
        }
    }
