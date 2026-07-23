import requests
import json
import pandas as pd
from bs4 import BeautifulSoup
import io
import re
import yfinance as yf
from deep_translator import GoogleTranslator
from datetime import datetime, timedelta
import logging

from turbo_engine import turbo_cache

AMC_MAP = {
    "KODEX": "삼성자산운용", "TIGER": "미래에셋자산운용", "KBSTAR": "KB자산운용",
    "ACE": "한국투자신탁운용", "ARIRANG": "한화자산운용", "KIBO": "키움투자자산운용",
    "HANARO": "NH-Amundi자산운용", "SOL": "신한자산운용", "TIMEFOLIO": "타임폴리오자산운용",
    "BlackRock": "블랙록", "Vanguard": "뱅가드", "State Street": "스테이트 스트리트",
    "Invesco": "인베스코", "Charles Schwab": "찰스 슈왑", "ProShares": "프로셰어즈",
    "Direxion": "디렉시온", "JPMorgan": "제이피모건"
}

def get_naver_daily_prices(symbol, days=252):
    try:
        now = datetime.now()
        start = now - timedelta(days=days+100)
        url = f"https://api.finance.naver.com/siseJson.naver?symbol={symbol}&requestType=1&startTime={start.strftime('%Y%m%d')}&endTime={now.strftime('%Y%m%d')}&timeframe=day"
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
        text = resp.content.decode('euc-kr', 'replace')
        import re
        matches = re.findall(r'\["(20\d{6})",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)', text)
        if not matches: return pd.DataFrame()
        data_list = []
        for m in matches:
            dt = f"{m[0][:4]}-{m[0][4:6]}-{m[0][6:]}"
            data_list.append({"Date": dt, "Open": float(m[1]), "High": float(m[2]), "Low": float(m[3]), "Close": float(m[4]), "Volume": float(m[5])})
        df = pd.DataFrame(data_list)
        if df.empty: return df
        df.set_index("Date", inplace=True)
        df.sort_index(inplace=True)
        return df.tail(days)
    except:
        return pd.DataFrame()

def safe_to_float(val):
    if val is None: return 0.0
    try:
        if isinstance(val, (int, float)): return float(val)
        # Remove commas, spaces, and percent signs
        clean = str(val).replace(',', '').replace('%', '').strip()
        return float(clean)
    except:
        return 0.0

def calculate_performance(hist):
    """
    주가 히스토리(DataFrame)를 기반으로 1개월, 3개월, 6개월, 1년 수익률을 직접 산출합니다.
    """
    perf_data = {}
    if hist.empty or len(hist) < 2:
        return perf_data
        
    try:
        current_close = hist['Close'].iloc[-1]
        last_date = hist.index[-1]
        
        periods = [
            ("1개월", 1),
            ("3개월", 3),
            ("6개월", 6),
            ("1년", 12)
        ]
        
        for label, months in periods:
            target_date = last_date - pd.DateOffset(months=months)
            # 가장 가까운 과거 날짜의 인덱스를 찾음
            # get_indexer는 일치하는 항목이 없을 때 가장 가까운 항목(nearest)을 찾도록 설정 가능
            past_idx = hist.index.get_indexer([target_date], method='nearest')[0]
            
            if past_idx >= 0:
                past_close = hist['Close'].iloc[past_idx]
                if past_close > 0:
                    diff_pct = ((current_close - past_close) / past_close) * 100
                    perf_data[label] = f"{diff_pct:+.2f}%"
    except Exception as e:
        print(f"Performance calculation error: {e}")
        
    return perf_data


def calculate_risk_stats(hist, risk_free_annual=0.035):
    """
    과거 주가 히스토리를 기반으로 리스크 지표를 계산합니다.
    ※ 모든 수치는 과거 데이터 기반 통계치이며 미래 성과를 보장하지 않습니다.
    """
    stats = {
        "volatility": "N/A",
        "mdd": "N/A",
        "sharpe": "N/A",
        "avg_volume_30d": "N/A",
        "position_pct": None,
        "high52": None,
        "low52": None,
    }
    if hist.empty or len(hist) < 20:
        return stats
    try:
        close = hist['Close'].dropna()
        daily_returns = close.pct_change().dropna()
        if len(daily_returns) >= 20:
            vol = daily_returns.std() * (252 ** 0.5) * 100
            stats["volatility"] = f"{vol:.2f}%"
        if len(close) >= 2:
            rolling_max = close.cummax()
            drawdown = (close - rolling_max) / rolling_max * 100
            mdd = drawdown.min()
            stats["mdd"] = f"{mdd:.2f}%"
        if len(daily_returns) >= 20:
            rf_daily = risk_free_annual / 252
            excess = daily_returns - rf_daily
            if excess.std() > 0:
                sharpe = (excess.mean() / excess.std()) * (252 ** 0.5)
                stats["sharpe"] = f"{sharpe:.2f}"
        if len(close) >= 2:
            current = float(close.iloc[-1])
            high52 = float(close.tail(252).max())
            low52 = float(close.tail(252).min())
            if high52 > low52:
                pos = (current - low52) / (high52 - low52) * 100
                stats["position_pct"] = round(pos, 1)
                stats["high52"] = round(high52, 2)
                stats["low52"] = round(low52, 2)
        if 'Volume' in hist.columns and len(hist) >= 20:
            avg_vol = int(hist['Volume'].tail(30).mean())
            stats["avg_volume_30d"] = f"{avg_vol:,}"
    except Exception as e:
        print(f"Risk stats calculation error: {e}")
    return stats


@turbo_cache(ttl_seconds=3600) # Detail data is cached for 1 hour
def get_etf_detail(symbol: str):
    symbol = symbol.upper().strip()
    if not symbol:
        return {"status": "error", "message": "Symbol is required"}
        
    data = {
        "symbol": symbol,
        "name": "알 수 없음",
        "basic_info": {
            "ter": "0.0%",
            "amc": "알 수 없음",
            "aum": "0원",
            "launch_date": "알 수 없음",
            "index": "알 수 없음",
            "dividend_yield": "0.00%"
        },
        "market_data": {
            "price": "0",
            "change": "0",
            "change_percent": "0.00",
            "nav": "0",
            "disparity": "0.00%",
            "volume": "0",
            "high52w": "0",
            "low52w": "0"
        },
        "holdings": [],
        "performance": {},
        "chart_data": [],
        "similar_etfs": [],
        "risk_stats": {},
        "sector_weights": [],
    }
    
    # Normalize symbol for market detection (Internal use only)
    clean_sym = symbol.split('.')[0]
    
    # [BugFix] 한국 ETF/ETN은 6자리이며 숫자로 시작함 (영문 포함 가능, 예: 0183V0)
    # 기존 is_us = not clean_sym.isdigit() 로직은 영문이 포함된 한국 코드를 모두 미국으로 오인함.
    import re
    is_kr_format = bool(re.match(r'^\d[A-Z0-9]{5}$', clean_sym.upper()))
    is_us = not is_kr_format
    
    if is_us:
        try:
            ticker = yf.Ticker(clean_sym)
            info = ticker.info
            
            eng_name = info.get("shortName", clean_sym)
            # Try stock_data dictionary first
            try:
                from stock_data import GLOBAL_KOREAN_NAMES
                kor_name = GLOBAL_KOREAN_NAMES.get(symbol.upper())
            except ImportError:
                kor_name = None
                
            if kor_name:
                data["name"] = kor_name
            else:
                try:
                    translated = GoogleTranslator(source='en', target='ko').translate(eng_name)
                    data["name"] = translated.replace("결과", "").strip() if translated else eng_name
                except:
                    data["name"] = eng_name
            
            eng_amc = info.get("fundFamily", "알 수 없음")
            if eng_amc != "알 수 없음":
                # Check AMC_MAP first for common families
                amc_found = False
                for en, ko in AMC_MAP.items():
                    if en.lower() in eng_amc.lower():
                        data["basic_info"]["amc"] = ko
                        amc_found = True
                        break
                
                if not amc_found:
                    try:
                        kor_amc = GoogleTranslator(source='en', target='ko').translate(eng_amc)
                        data["basic_info"]["amc"] = kor_amc.replace("Inc.", "").replace("LLC", "").strip()
                    except:
                        data["basic_info"]["amc"] = eng_amc
            else:
                data["basic_info"]["amc"] = "알 수 없음"
                
            # Enhanced Basic Info for US ETFs
            # Expense Ratio (TER) - Try multiple fields
            er = info.get('expenseRatio') or info.get('netExpenseRatio')
            if er:
                data["basic_info"]["ter"] = f"{er if er < 1 else er/100:.2f}%" if er < 0.1 else f"{er:.2f}%"
                # Handle cases where er might be 0.0912 vs 0.09. yfinance can be inconsistent.
                # Actually, 0.09 usually means 0.09%. Let's be careful.
                # If er is 0.09, it likely means 0.09%. If it's 0.0009, it means 0.09%.
                if er < 0.01: # 0.0009 type
                    data["basic_info"]["ter"] = f"{er * 100:.2f}%"
                else: # 0.09 type
                    data["basic_info"]["ter"] = f"{er:.2f}%"
            else:
                data["basic_info"]["ter"] = "N/A"
                
            # Launch Date (fundInceptionDate is Unix timestamp)
            fid = info.get('fundInceptionDate')
            if fid:
                 try:
                     data["basic_info"]["launch_date"] = str(pd.to_datetime(fid, unit='s')).split(' ')[0]
                 except:
                     data["basic_info"]["launch_date"] = "N/A"
            else:
                data["basic_info"]["launch_date"] = "N/A"
            
            # Underlying Index - Fallback to hardcoded map then summary parsing
            ETF_INDEX_MAP = {
                "SPY": "S&P 500 Index", "IVV": "S&P 500 Index", "VOO": "S&P 500 Index",
                "QQQ": "Nasdaq-100 Index", "DIA": "Dow Jones Industrial Average",
                "SOXX": "PHLX Semiconductor Sector Index", "SOXL": "PHLX Semiconductor Sector Index",
                "SMH": "MVIS US Listed Semiconductor 25 Index",
                "SCHD": "Dow Jones U.S. Dividend 100 Index",
                "JEPI": "S&P 500 Index (Income Focus)"
            }
            
            idx_name = info.get('underlyingIndexName') or info.get('indexName')
            if not idx_name:
                idx_name = ETF_INDEX_MAP.get(clean_sym.upper())
                
            if not idx_name:
                summary = info.get('longBusinessSummary', '')
                # Improved regex to capture common index patterns
                match = re.search(r'([A-Z0-9][\w\s&.\-]+ Index)', summary)
                if match:
                    idx_name = match.group(1).strip()
            
            if idx_name:
                data["basic_info"]["index"] = idx_name
            else:
                data["basic_info"]["index"] = "N/A"

            data["basic_info"]["aum"] = f"${info.get('totalAssets', 0):,}" if info.get('totalAssets') else "N/A"
            data["basic_info"]["dividend_yield"] = f"{info.get('yield', 0) * 100:.2f}%" if info.get('yield') else "0.00%"
            
            # Populate Market Data
            current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            nav_price = info.get("navPrice", 0)
            
            hist = ticker.history(period="1y")
            
            if not hist.empty:
                if len(hist) >= 2:
                    current_price = float(hist['Close'].iloc[-1])
                    prev_close = float(hist['Close'].iloc[-2])
                    change = current_price - prev_close
                    change_pct = (change / prev_close) * 100
                    data["market_data"]["change"] = f"{change:+.2f}"
                    data["market_data"]["change_percent"] = f"{change_pct:+.2f}"
                elif not current_price:
                    current_price = float(hist['Close'].iloc[-1])

            data["market_data"]["price"] = f"{current_price:,.2f}"
            data["market_data"]["nav"] = f"{nav_price:,.2f}" if nav_price else "N/A"
            
            if nav_price and current_price and nav_price > 0:
                disparity = ((current_price - nav_price) / nav_price) * 100
                data["market_data"]["disparity"] = f"{disparity:+.2f}%"
            else:
                data["market_data"]["disparity"] = "N/A"
                
            data["market_data"]["volume"] = f"{info.get('volume', 0):,}"
            data["market_data"]["high52w"] = f"{info.get('fiftyTwoWeekHigh', 0):,.2f}"
            data["market_data"]["low52w"] = f"{info.get('fiftyTwoWeekLow', 0):,.2f}"
            
            if not hist.empty:
                hist['ma5'] = hist['Close'].rolling(window=5).mean()
                hist['ma20'] = hist['Close'].rolling(window=20).mean()
                hist['ma60'] = hist['Close'].rolling(window=60).mean()
                hist['ma120'] = hist['Close'].rolling(window=120).mean()
                hist = hist.tail(252) # Keep max 252 days for chart
            
            data["chart_data"] = [
                {
                    "date": str(idx).split(' ')[0], 
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume']),
                    "ma5": float(row['ma5']) if pd.notna(row['ma5']) else None,
                    "ma20": float(row['ma20']) if pd.notna(row['ma20']) else None,
                    "ma60": float(row['ma60']) if pd.notna(row['ma60']) else None,
                    "ma120": float(row['ma120']) if pd.notna(row['ma120']) else None
                } for idx, row in hist.iterrows()
            ]
            
            # [환율 추가] Fetch USD/KRW Exchange Rate
            try:
                rate_ticker = yf.Ticker("USDKRW=X")
                data["exchange_rate"] = rate_ticker.fast_info.get('last_price', 1350.0)
            except:
                data["exchange_rate"] = 1350.0

            # [Fix] Calculate performance for US ETFs
            data["performance"] = calculate_performance(hist)

            # [NEW] Risk Stats (MDD, Volatility, Sharpe, 52-week position)
            data["risk_stats"] = calculate_risk_stats(hist)

            # [NEW] Sector Weights for US ETFs
            try:
                raw_sectors = info.get('sectorWeightings', [])
                if raw_sectors and isinstance(raw_sectors, list):
                    SECTOR_KO = {
                        "Technology": "기술", "Healthcare": "헬스케어", "Financial Services": "금융",
                        "Consumer Cyclical": "경기소비재", "Industrials": "산업재",
                        "Communication Services": "통신서비스", "Consumer Defensive": "필수소비재",
                        "Energy": "에너지", "Basic Materials": "소재", "Real Estate": "부동산",
                        "Utilities": "유틸리티", "realestate": "부동산", "technology": "기술",
                        "healthcare": "헬스케어", "financialServices": "금융",
                        "consumerCyclical": "경기소비재", "industrials": "산업재",
                        "communicationServices": "통신서비스", "consumerDefensive": "필수소비재",
                        "energy": "에너지", "basicMaterials": "소재", "utilities": "유틸리티",
                    }
                    sector_list = []
                    for item in raw_sectors:
                        if isinstance(item, dict):
                            for k, v in item.items():
                                label = SECTOR_KO.get(k, k)
                                pct = round(float(v) * 100, 1) if float(v) <= 1 else round(float(v), 1)
                                if pct > 0.1:
                                    sector_list.append({"name": label, "value": pct})
                    sector_list.sort(key=lambda x: x["value"], reverse=True)
                    data["sector_weights"] = sector_list[:10]
            except Exception as se:
                print(f"Sector weights error: {se}")
                
            # [NEW] Holdings for US ETFs
            try:
                if hasattr(ticker, 'funds_data') and hasattr(ticker.funds_data, 'top_holdings'):
                    funds_holdings = ticker.funds_data.top_holdings
                    if funds_holdings is not None and not funds_holdings.empty:
                        for idx, row in funds_holdings.head(10).iterrows():
                            name = str(row.get('Name', idx))
                            pct = row.get('Holding Percent', 0)
                            if pct > 0:
                                data["holdings"].append({"name": name, "weight": f"{pct*100:.2f}%"})
            except Exception as he:
                print(f"US Holdings error: {he}")
                
            # [NEW] Populate Similar ETFs for US ETFs
            PEER_GROUPS = {
                "S&P 500": [{"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust"}, {"symbol": "IVV", "name": "iShares Core S&P 500 ETF"}, {"symbol": "VOO", "name": "Vanguard S&P 500 ETF"}, {"symbol": "SPLG", "name": "SPDR Portfolio S&P 500 ETF"}],
                "NASDAQ": [{"symbol": "QQQ", "name": "Invesco QQQ Trust"}, {"symbol": "QQQM", "name": "Invesco NASDAQ 100 ETF"}, {"symbol": "TQQQ", "name": "ProShares UltraPro QQQ (3X)"}],
                "DIVIDEND": [{"symbol": "SCHD", "name": "Schwab US Dividend Equity ETF"}, {"symbol": "JEPI", "name": "JPMorgan Equity Premium Income ETF"}, {"symbol": "VYM", "name": "Vanguard High Dividend Yield ETF"}, {"symbol": "DGRO", "name": "iShares Core Dividend Growth ETF"}],
                "SEMICONDUCTOR": [{"symbol": "SMH", "name": "VanEck Semiconductor ETF"}, {"symbol": "SOXX", "name": "iShares Semiconductor ETF"}, {"symbol": "SOXL", "name": "Direxion Daily Semiconductor Bull 3X"}],
                "BOND": [{"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF"}, {"symbol": "TMF", "name": "Direxion Daily 20+ Yr Trsy Bull 3X"}, {"symbol": "SHV", "name": "iShares Short Treasury Bond ETF"}],
                "GOLD": [{"symbol": "GLD", "name": "SPDR Gold Shares"}, {"symbol": "IAU", "name": "iShares Gold Trust"}],
                "TECH": [{"symbol": "XLK", "name": "Technology Select Sector SPDR Fund"}, {"symbol": "VGT", "name": "Vanguard Information Technology ETF"}],
            }
            
            summary_upper = str(info.get('longBusinessSummary', '')).upper()
            name_upper = eng_name.upper()
            found_group = None
            
            for key, peers in PEER_GROUPS.items():
                if key in name_upper or key in summary_upper:
                    found_group = [p for p in peers if p["symbol"] != clean_sym.upper()]
                    if found_group:
                        data["similar_etfs"] = found_group
                        break
            
            # If no group found, try generic matching
            if not data["similar_etfs"]:
                if "VALUE" in name_upper: data["similar_etfs"] = [{"symbol": "VTV", "name": "Vanguard Value ETF"}, {"symbol": "IWD", "name": "iShares Russell 1000 Value ETF"}]
                elif "GROWTH" in name_upper: data["similar_etfs"] = [{"symbol": "VUG", "name": "Vanguard Growth ETF"}, {"symbol": "IWF", "name": "iShares Russell 1000 Growth ETF"}]
                elif "EMERGING" in name_upper: data["similar_etfs"] = [{"symbol": "VWO", "name": "Vanguard FTSE Emerging Markets ETF"}, {"symbol": "IEMG", "name": "iShares Core MSCI Emerging Markets ETF"}]
                else: data["similar_etfs"] = [{"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust (미국 대표)"}, {"symbol": "QQQ", "name": "Invesco QQQ Trust (나스닥 대표)"}]

            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    # KR ETF Logic
    try:
        # Modern User-Agent
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://finance.naver.com/"
        }
        clean_sym = symbol.split('.')[0]
        
        # 1. Chart Data (Optional/Non-blocking)
        hist = pd.DataFrame()
        try:
            # Try KS then KQ
            hist = yf.Ticker(f"{clean_sym}.KS").history(period="1y")
            if hist.empty or len(hist) < 20: 
                hist_kq = yf.Ticker(f"{clean_sym}.KQ").history(period="1y")
                if not hist_kq.empty and len(hist_kq) > len(hist):
                    hist = hist_kq
            
            # Fallback to Naver API if yfinance fails or data is too short
            if hist.empty or len(hist) < 20:
                hist = get_naver_daily_prices(clean_sym, 252)
            
            if not hist.empty:
                hist['ma5'] = hist['Close'].rolling(window=5).mean()
                hist['ma20'] = hist['Close'].rolling(window=20).mean()
                hist['ma60'] = hist['Close'].rolling(window=60).mean()
                hist['ma120'] = hist['Close'].rolling(window=120).mean()
                hist = hist.tail(252)
                
                data["chart_data"] = [
                    {
                        "date": str(idx).split(' ')[0], 
                        "open": safe_to_float(row['Open']),
                        "high": safe_to_float(row['High']),
                        "low": safe_to_float(row['Low']),
                        "close": safe_to_float(row['Close']),
                        "volume": int(row['Volume']),
                        "ma5": safe_to_float(row['ma5']) if pd.notna(row['ma5']) else None,
                        "ma20": safe_to_float(row['ma20']) if pd.notna(row['ma20']) else None,
                        "ma60": safe_to_float(row['ma60']) if pd.notna(row['ma60']) else None,
                        "ma120": safe_to_float(row['ma120']) if pd.notna(row['ma120']) else None
                    } for idx, row in hist.iterrows()
                ]
                # [NEW] KR ETF 리스크 지표
                data["risk_stats"] = calculate_risk_stats(hist)
        except: pass

        # 2. Naver Mobile API (Primary Data Source)
        try:
            api_url = f"https://m.stock.naver.com/api/stock/{clean_sym}/integration"
            basic_url = f"https://m.stock.naver.com/api/stock/{clean_sym}/basic"
            
            api_resp = requests.get(api_url, headers=headers, timeout=5)
            if api_resp.status_code == 200:
                api_resp.encoding = 'utf-8' # Force UTF-8 for Mobile API
                api_json = api_resp.json()
                data["name"] = api_json.get("stockName", data["name"])
                
                # Indicator Data (TER, AUM, NAV, Dividend, Performance)
                ind = api_json.get("etfKeyIndicator", {})
                if ind:
                    if ind.get("issuerName"):
                        data["basic_info"]["amc"] = ind.get("issuerName")
                    
                    data["basic_info"]["ter"] = f"{safe_to_float(ind.get('totalFee', 0)):.2f}%"
                    data["basic_info"]["aum"] = ind.get("marketValue", data["basic_info"]["aum"])
                    data["basic_info"]["dividend_yield"] = f"{safe_to_float(ind.get('dividendYieldTtm', 0)):.2f}%"
                    
                    if ind.get("nav"):
                        nav_v = safe_to_float(ind['nav'])
                        data["market_data"]["nav"] = f"{nav_v:,.2f}" if nav_v > 0 else ind['nav']
                    
                    sign, rate = ind.get("deviationSign", ""), safe_to_float(ind.get("deviationRate", 0))
                    data["market_data"]["disparity"] = f"{sign}{rate:.2f}%"
                    
                    for k, v in {"returnRate1m": "1개월", "returnRate3m": "3개월", "returnRate6m": "6개월", "returnRate1y": "1년"}.items():
                        if k in ind:
                            f_val = safe_to_float(ind[k])
                            data["performance"][v] = f"{'+' if f_val > 0 else ''}{f_val:.2f}%"

                if not data["performance"] and not hist.empty and len(hist) > 1:
                    try:
                        last_close = hist['Close'].iloc[-1]
                        for p_label, d_offset in [("1개월", 21), ("3개월", 63), ("6개월", 126), ("1년", 252)]:
                            if len(hist) > d_offset:
                                past_close = hist['Close'].iloc[-(d_offset+1)]
                                ret = ((last_close - past_close) / past_close) * 100
                                data["performance"][p_label] = f"{'+' if ret > 0 else ''}{ret:.2f}%"
                    except: pass

                # Additional Info (Index, Listing Date)
                for info in api_json.get("totalInfos", []):
                    k, v, c = info.get("key", ""), info.get("value", ""), info.get("code", "")
                    if c == "etfBaseIdx" or "기초지수" in k: data["basic_info"]["index"] = v
                    elif c == "listingDate" or "상장일" in k: data["basic_info"]["launch_date"] = v.replace(".", "-")
                    elif c == "highPriceOf52Weeks": data["market_data"]["high52w"] = v
                    elif c == "lowPriceOf52Weeks": data["market_data"]["low52w"] = v
                    elif c == "accumulatedTradingVolume": data["market_data"]["volume"] = v
                
                # Market Data (Price, Change)
                basic_resp = requests.get(basic_url, headers=headers, timeout=5)
                if basic_resp.status_code == 200:
                    bj = basic_resp.json()
                    data["market_data"]["price"] = bj.get("closePrice", "0")
                    data["market_data"]["change"] = bj.get("compareToPreviousClosePrice", "0")
                    data["market_data"]["change_percent"] = bj.get("fluctuationsRatio", "0.00")
        except: pass

        # 3. 한국 ETF 구성 종목(Holdings) 스크래핑
        # [BugFix] 기존 HTML 파싱 방식이 호가 테이블 등을 구성종목으로 오인해 
        # 비정상적인 비중(800만%)과 인코딩 에러(글자 깨짐)를 발생시켰으므로 삭제합니다.
        # 빈 배열을 반환하여 프론트엔드에서 '정보 없음'으로 안전하게 렌더링되도록 처리.


        # 5. Populate Similar ETFs for KR ETFs
        if not data["similar_etfs"]:
            name_str = data["name"].upper()
            KR_PEERS = {
                "200": [{"symbol": "069500", "name": "KODEX 200"}, {"symbol": "133690", "name": "TIGER 미국나스닥100"}, {"symbol": "148020", "name": "KBSTAR 200"}],
                "나스닥": [{"symbol": "133690", "name": "TIGER 미국나스닥100"}, {"symbol": "379800", "name": "KODEX 미국나스닥100TR"}],
                "S&P": [{"symbol": "360200", "name": "TIGER 미국S&P500"}, {"symbol": "379810", "name": "KODEX 미국S&P500TR"}],
                "배당": [{"symbol": "458730", "name": "TIGER 미국배당다우존스"}, {"symbol": "458740", "name": "ACE 미국배당다우존스"}],
                "반도체": [{"symbol": "091160", "name": "KODEX 반도체"}, {"symbol": "091230", "name": "TIGER 반도체"}],
                "2차전지": [{"symbol": "305720", "name": "KODEX 2차전지산업"}, {"symbol": "305540", "name": "TIGER 2차전지테마"}],
            }
            
            for key, peers in KR_PEERS.items():
                if key in name_str:
                    found_kr = [p for p in peers if p["symbol"] != clean_sym]
                    if found_kr:
                        data["similar_etfs"] = found_kr
                        break
                        
            if not data["similar_etfs"]:
                data["similar_etfs"] = [{"symbol": "069500", "name": "KODEX 200 (국내 코스피 대표)"}, {"symbol": "360200", "name": "TIGER 미국S&P500 (해외 S&P 대표)"}]

        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": f"Global error: {str(e)}"}

if __name__ == "__main__":
    import json
    res = get_etf_detail("069500")
    print(json.dumps(res, ensure_ascii=False, indent=2))
