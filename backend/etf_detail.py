import requests
import pandas as pd
from bs4 import BeautifulSoup
import io
import re
import yfinance as yf

AMC_MAP = {
    "KODEX": "삼성자산운용", "TIGER": "미래에셋자산운용", "KBSTAR": "KB자산운용",
    "ACE": "한국투자신탁운용", "ARIRANG": "한화자산운용", "KIBO": "키움투자자산운용",
    "HANARO": "NH-Amundi자산운용", "SOL": "한국투자신탁운용", "TIMEFOLIO": "타임폴리오자산운용"
}

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
        "chart_data": []
    }
    
    is_us = not symbol.isdigit()
    
    if is_us:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            data["name"] = info.get("shortName", symbol)
            data["basic_info"]["ter"] = f"{info.get('ytdReturn', 0) * 100:.2f}%" if info.get('ytdReturn') else "N/A"
            data["basic_info"]["aum"] = f"${info.get('totalAssets', 0):,}" if info.get('totalAssets') else "N/A"
            data["basic_info"]["dividend_yield"] = f"{info.get('yield', 0) * 100:.2f}%" if info.get('yield') else "0.00%"
            data["basic_info"]["amc"] = info.get("fundFamily", "알 수 없음")
            
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
            
            hist = ticker.history(period="2y")
            hist['ma5'] = hist['Close'].rolling(window=5).mean()
            hist['ma20'] = hist['Close'].rolling(window=20).mean()
            hist['ma60'] = hist['Close'].rolling(window=60).mean()
            hist['ma120'] = hist['Close'].rolling(window=120).mean()
            hist = hist.tail(252)
            
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
            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        
        # 1. Fetch yfinance chart data for KR ETF (OHLCV)
        try:
            hist = yf.Ticker(f"{symbol}.KS").history(period="2y")
            hist['ma5'] = hist['Close'].rolling(window=5).mean()
            hist['ma20'] = hist['Close'].rolling(window=20).mean()
            hist['ma60'] = hist['Close'].rolling(window=60).mean()
            hist['ma120'] = hist['Close'].rolling(window=120).mean()
            hist = hist.tail(252)
            
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
        except:
            pass

        # 2. Get Integration Info
        api_url = f"https://m.stock.naver.com/api/stock/{symbol}/integration"
        api_resp = requests.get(api_url, headers=headers)
        if api_resp.status_code == 200:
            api_data = api_resp.json()
            data["name"] = api_data.get("stockName", "알 수 없음")
            
            # Set top-level market data
            data["market_data"]["price"] = api_data.get("closePrice", "0")
            data["market_data"]["change"] = api_data.get("compareToPreviousClosePrice", "0")
            data["market_data"]["change_percent"] = api_data.get("fluctuationsRatio", "0.00")
            
            # Map AMC from name
            first_word = data["name"].split(' ')[0].upper()
            for key, val in AMC_MAP.items():
                if key in first_word:
                    data["basic_info"]["amc"] = val
                    break
            
            nav_val_str = ""
            for info in api_data.get("totalInfos", []):
                key = info.get("key", "")
                val = info.get("value", "")
                code = info.get("code", "")
                
                if "수익률" in key:
                    data["performance"][key] = val
                elif "보수" in key or code == "fundPay":
                    data["basic_info"]["ter"] = val
                elif "순자산총액" in key:
                    data["basic_info"]["aum"] = val
                elif "상장일" in key:
                    data["basic_info"]["launch_date"] = val.replace(".", "-")
                elif "분배율" in key:
                    data["basic_info"]["dividend_yield"] = val
                
                # Market Data mappings
                if code == "nav":
                    nav_val_str = val
                    data["market_data"]["nav"] = val
                elif code == "accumulatedTradingVolume":
                    data["market_data"]["volume"] = val
                elif code == "highPriceOf52Weeks":
                    data["market_data"]["high52w"] = val
                elif code == "lowPriceOf52Weeks":
                    data["market_data"]["low52w"] = val
            
            # Calculate disparity for KR ETF
            try:
                curr_p = float(data["market_data"]["price"].replace(",", ""))
                nav_p = float(nav_val_str.replace(",", ""))
                if nav_p > 0:
                    disparity = ((curr_p - nav_p) / nav_p) * 100
                    data["market_data"]["disparity"] = f"{disparity:+.2f}%"
            except:
                data["market_data"]["disparity"] = "N/A"
                    
        # 3. AUM fallback using etfItemList
        if data["basic_info"]["aum"] in ["0원", "알 수 없음", "N/A"]:
            try:
                list_data = requests.get("https://finance.naver.com/api/sise/etfItemList.nhn").json()
                for etf in list_data.get('result', {}).get('etfItemList', []):
                    if etf['itemcode'] == symbol:
                        data["basic_info"]["aum"] = f"{etf['marketSum']}억원"
                        break
            except: pass

        # 4. Extract CU
        try:
            web_url = f"https://finance.naver.com/item/main.naver?code={symbol}"
            web_resp = requests.get(web_url, headers=headers)
            web_resp.encoding = 'euc-kr'
            soup = BeautifulSoup(web_resp.text, "html.parser")
            
            tables = soup.find_all("table")
            for t in tables:
                df = pd.read_html(io.StringIO(str(t)))[0]
                if len(df.columns) >= 3:
                    records = df.values.tolist()
                    for row in records:
                        name = str(row[0]).strip()
                        weight = str(row[2]).strip()
                        if name and name not in ['nan', '종목(자산)', '종목명'] and '%' in weight:
                            name_clean = " ".join(name.split())
                            data["holdings"].append({"name": name_clean, "weight": weight})
                            if len(data["holdings"]) >= 10: break
                    if len(data["holdings"]) > 0: break
        except: pass
                
        return {"status": "success", "data": data}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import json
    res = get_etf_detail("069500")
    print(json.dumps(res, ensure_ascii=False, indent=2))
