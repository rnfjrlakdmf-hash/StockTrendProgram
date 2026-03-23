import requests
import pandas as pd
from bs4 import BeautifulSoup
import io
import re
import yfinance as yf

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
        "performance": {}
    }
    
    # Check if US stock by looking for letters in symbol
    is_us = not symbol.isdigit()
    
    if is_us:
        # Handle US ETF using yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            data["name"] = info.get("shortName", symbol)
            data["basic_info"]["ter"] = f"{info.get('ytdReturn', 0) * 100:.2f}%" if info.get('ytdReturn') else "N/A (API 제한)"
            data["basic_info"]["aum"] = f"${info.get('totalAssets', 0):,}" if info.get('totalAssets') else "N/A"
            data["basic_info"]["dividend_yield"] = f"{info.get('yield', 0) * 100:.2f}%" if info.get('yield') else "0.00%"
            data["basic_info"]["amc"] = info.get("fundFamily", "알 수 없음")
            
            # yfinance holdings are often unavailable in basic fast info, but we return empty anyway
            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    # Handle KR ETF using Naver Finance
    try:
        # 1. Get Basic Info from Mobile API (Very stable for names, AUM, returns, etc.)
        api_url = f"https://m.stock.naver.com/api/stock/{symbol}/integration"
        headers = {"User-Agent": "Mozilla/5.0"}
        
        api_resp = requests.get(api_url, headers=headers)
        if api_resp.status_code == 200:
            api_data = api_resp.json()
            data["name"] = api_data.get("stockName", "알 수 없음")
            
            infos = api_data.get("totalInfos", [])
            for info in infos:
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
                    
        # 2. Extract Holdings and Extra info from Main HTML Page
        web_url = f"https://finance.naver.com/item/main.naver?code={symbol}"
        web_resp = requests.get(web_url, headers=headers)
        web_resp.encoding = 'euc-kr'
        soup = BeautifulSoup(web_resp.text, "html.parser")
        
        # Summary Info text (AMC, Index)
        summary = soup.select_one(".summary_info")
        if summary:
            amc_match = re.search(r'자산운용사\s*([^\s]+운용|[^\s]+)', summary.text)
            if amc_match:
                data["basic_info"]["amc"] = amc_match.group(1)
            index_match = re.search(r'기초지수\s*([^\n]+)', summary.text)
            if index_match:
                data["basic_info"]["index"] = index_match.group(1).strip()
                
        # Holdings isolation: Parse tables individually
        tables = soup.find_all("table")
        for t in tables:
            try:
                df = pd.read_html(io.StringIO(str(t)))[0]
                
                # Naver headers can sometimes become row 0 or MultiIndex.
                # Safe approach: convert entire dataframe to string and search for '%'
                # Usually, columns: [Name, Shares, Weight(%), CurrentPrice, ... ]
                # We look for a table with at least 3 columns where the 3rd column occasionally contains '%'
                if len(df.columns) >= 3:
                    # Convert to list of lists
                    records = df.values.tolist()
                    for row in records:
                        name = str(row[0]).strip()
                        weight = str(row[2]).strip()
                        
                        # A valid holding row has a name (not header) and a percentage weight
                        if name and name not in ['nan', '종목(자산)', '종목명'] and '%' in weight:
                            name_clean = " ".join(name.split())
                            data["holdings"].append({"name": name_clean, "weight": weight})
                            if len(data["holdings"]) >= 10:
                                break
                    
                    if len(data["holdings"]) > 0:
                        break # Found the holdings table, no need to parse other tables
                        
            except Exception:
                pass
                
        return {"status": "success", "data": data}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import json
    res = get_etf_detail("069500")
    print(json.dumps(res, ensure_ascii=False, indent=2))
