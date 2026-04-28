import requests
import pandas as pd
from bs4 import BeautifulSoup
import io
import re
import yfinance as yf
from deep_translator import GoogleTranslator

AMC_MAP = {
    "KODEX": "삼성자산운용", "TIGER": "미래에셋자산운용", "KBSTAR": "KB자산운용",
    "ACE": "한국투자신탁운용", "ARIRANG": "한화자산운용", "KIBO": "키움투자자산운용",
    "HANARO": "NH-Amundi자산운용", "SOL": "한국투자신탁운용", "TIMEFOLIO": "타임폴리오자산운용"
}

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

def get_etf_detail(symbol: str):
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
        "similar_etfs": []
    }
    
    # Normalize symbol for market detection (Internal use only)
    clean_sym = symbol.split('.')[0]
    is_us = not clean_sym.isdigit()
    
    if is_us:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            eng_name = info.get("shortName", symbol)
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
                idx_name = ETF_INDEX_MAP.get(symbol.upper())
                
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
            
            hist = ticker.history(period="1y")
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
                    found_group = [p for p in peers if p["symbol"] != symbol.upper()]
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
        try:
            # Try KS then KQ
            hist = yf.Ticker(f"{clean_sym}.KS").history(period="1y")
            if hist.empty: hist = yf.Ticker(f"{clean_sym}.KQ").history(period="1y")
            
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
        except: pass

        # 2. Naver Mobile API (Primary Data Source)
        try:
            api_url = f"https://m.stock.naver.com/api/stock/{clean_sym}/integration"
            basic_url = f"https://m.stock.naver.com/api/stock/{clean_sym}/basic"
            
            api_resp = requests.get(api_url, headers=headers, timeout=5)
            if api_resp.status_code == 200:
                api_json = api_resp.json()
                data["name"] = api_json.get("stockName", data["name"])
                
                # Market Data (Price, Change) from basic API if possible
                basic_resp = requests.get(basic_url, headers=headers, timeout=5)
                if basic_resp.status_code == 200:
                    bj = basic_resp.json()
                    data["market_data"]["price"] = bj.get("closePrice", "0")
                    data["market_data"]["change"] = bj.get("compareToPreviousClosePrice", "0")
                    data["market_data"]["change_percent"] = bj.get("fluctuationsRatio", "0.00")
                
                # Indicator Data (TER, AUM, NAV, Dividend, Performance)
                ind = api_json.get("etfKeyIndicator", {})
                if ind:
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
                    
                    # [Backup] If some performance data is missing from Naver, use calculated data from yfinance history
                    if len(data["performance"]) < 4 and "chart_data" in data and len(data["chart_data"]) > 0:
                        try:
                            # Use yfinance data fetched earlier if available
                            # 'hist' for KR is defined around line 199
                            if 'hist' in locals() and not hist.empty:
                                calc_perf = calculate_performance(hist)
                                for k, v in calc_perf.items():
                                    if k not in data["performance"]:
                                        data["performance"][k] = v
                        except: pass

                # Additional Info (Index, Listing Date)
                for info in api_json.get("totalInfos", []):
                    k, v, c = info.get("key", ""), info.get("value", ""), info.get("code", "")
                    if c == "etfBaseIdx" or "기초지수" in k: data["basic_info"]["index"] = v
                    elif c == "listingDate" or "상장일" in k: data["basic_info"]["launch_date"] = v.replace(".", "-")
                    elif c == "highPriceOf52Weeks": data["market_data"]["high52w"] = v
                    elif c == "lowPriceOf52Weeks": data["market_data"]["low52w"] = v
                    elif c == "accumulatedTradingVolume": data["market_data"]["volume"] = v
        except: pass

        # 3. AMC Mapping and Hardcoded Fallbacks (Listing Dates)
        hardcoded_dates = {
            "069500": "2002-10-14", "114800": "2009-09-16", "122630": "2010-07-21",
            "229200": "2015-10-07", "233740": "2015-12-17", "252670": "2016-09-22"
        }
        if clean_sym in hardcoded_dates and data["basic_info"]["launch_date"] == "알 수 없음":
            data["basic_info"]["launch_date"] = hardcoded_dates[clean_sym]

        for key, val in AMC_MAP.items():
            if key in data["name"].upper():
                data["basic_info"]["amc"] = val
                break

        # 4. Ultimate Fallback Scraping (Listing Date, Index, Holdings)
        try:
            if data["basic_info"]["launch_date"] == "알 수 없음" or not data["holdings"]:
                web_url = f"https://finance.naver.com/item/main.naver?code={clean_sym}"
                web_resp = requests.get(web_url, headers=headers, timeout=5)
                if web_resp.status_code == 200:
                    web_resp.encoding = 'euc-kr'
                    soup_text = web_resp.text
                    soup = BeautifulSoup(soup_text, "html.parser")
                    
                    # 4.1 Search for Launch Date via Regex in soup
                    if data["basic_info"]["launch_date"] == "알 수 없음":
                        dates = re.findall(r"20\d{2}[.-]\d{2}[.-]\d{2}", soup_text)
                        if dates:
                            # Usually the 1st or 2nd date in the info section is the listing date
                            data["basic_info"]["launch_date"] = dates[0].replace(".", "-")

                    # 4.2 Search for Index
                    for th in soup.find_all("th"):
                        txt = th.get_text().strip()
                        if "기초지수" in txt and data["basic_info"]["index"] == "알 수 없음":
                            td = th.find_next_sibling("td")
                            if td: data["basic_info"]["index"] = td.get_text().strip()

                    # 4.3 Holdings
                    if not data["holdings"]:
                        cu_div = soup.find("div", {"class": "section cu_info"}) or soup.find("div", {"class": "section etf_analysis"})
                        if cu_div:
                            for t in cu_div.find_all("table"):
                                try:
                                    df = pd.read_html(io.StringIO(str(t)))[0]
                                    if len(df.columns) >= 3:
                                        for row in df.values.tolist():
                                            n, w = str(row[0]).strip(), str(row[2]).strip()
                                            if n and n not in ['nan', '종목명', '종목(자산)'] and '%' in w:
                                                data["holdings"].append({"name": " ".join(n.split()), "weight": w})
                                                if len(data["holdings"]) >= 10: break
                                        if data["holdings"]: break
                                except: pass
        except: pass

        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": f"Global error: {str(e)}"}

if __name__ == "__main__":
    import json
    res = get_etf_detail("069500")
    print(json.dumps(res, ensure_ascii=False, indent=2))
