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
            "index": "알 수 없음"
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
            data["basic_info"]["amc"] = info.get("fundFamily", "알 수 없음")
            
            hist = ticker.history(period="1y")
            data["chart_data"] = [{"date": str(idx).split(' ')[0], "price": float(row['Close'])} for idx, row in hist.iterrows()]
            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        
        # 1. Fetch yfinance chart data for KR ETF
        try:
            hist = yf.Ticker(f"{symbol}.KS").history(period="1y")
            data["chart_data"] = [{"date": str(idx).split(' ')[0], "price": float(row['Close'])} for idx, row in hist.iterrows()]
        except:
            pass

        # 2. Get Integration Info
        api_url = f"https://m.stock.naver.com/api/stock/{symbol}/integration"
        api_resp = requests.get(api_url, headers=headers)
        if api_resp.status_code == 200:
            api_data = api_resp.json()
            data["name"] = api_data.get("stockName", "알 수 없음")
            
            # Map AMC from name
            first_word = data["name"].split(' ')[0].upper()
            for key, val in AMC_MAP.items():
                if key in first_word:
                    data["basic_info"]["amc"] = val
                    break
            
            for info in api_data.get("totalInfos", []):
                key = info.get("key", "")
                val = info.get("value", "")
                if "수익률" in key:
                    data["performance"][key] = val
                elif "보수" in key or info.get("code") == "fundPay":
                    data["basic_info"]["ter"] = val
                elif "순자산총액" in key:
                    data["basic_info"]["aum"] = val
                elif "상장일" in key:
                    data["basic_info"]["launch_date"] = val.replace(".", "-")
                elif "분배율" in key:
                    data["basic_info"]["dividend_yield"] = val
                    
        # 3. AUM fallback using etfItemList
        if data["basic_info"]["aum"] in ["0원", "알 수 없음"]:
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
