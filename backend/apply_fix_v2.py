
import sys
import os

target_file = 'backend/korea_data.py'
with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Clean up previously appended function and any debris
cleaned_lines = []
stop = False
for line in lines:
    if 'def get_korean_investment_indicators' in line:
        stop = True
    if not stop:
        cleaned_lines.append(line)

# New robust function
new_func = """
def get_korean_investment_indicators(symbol: str, freq: str = "0", rpt: str = "3"):
    try:
        code = symbol.split('.')[0]
        import requests, re, json
        HEADER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}"
        res_frame = requests.get(frame_url, headers=HEADER, timeout=7)
        match = re.search(r"encparam:\\s*'([^']*)'", res_frame.text)
        if not match: return None
        encparam = match.group(1)
        data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq={freq}&rpt={rpt}&finGubun=MAIN&encparam={encparam}"
        res_data = requests.get(data_url, headers={"Referer": frame_url, "User-Agent": HEADER["User-Agent"]}, timeout=7)
        try: json_data = res_data.json()
        except: json_data = json.loads(res_data.content.decode('utf-8', 'ignore'))
        
        headers = []
        for h in json_data.get("YYMM", []):
            clean_h = re.sub(r'<[^>]*>', '', h).replace("\\n","").replace("\\t","").strip()
            match = re.search(r'(\\d{4}/\\d{2})', clean_h)
            if match:
                hdr = match.group(1)
                if "(E)" in clean_h: hdr += "(E)"
                headers.append(hdr)
            else: headers.append(None)
            
        indicators = []
        for row in json_data.get("DATA", []):
            name, accode, vals = str(row.get("ACC_NM", "")).strip(), str(row.get("ACCODE", "")), {}
            for i, h in enumerate(headers):
                if h:
                    v = row.get(f"DATA{i+1}")
                    try: vals[h] = float(str(v).replace(',', '')) if v is not None and str(v).strip() not in ["","-"] else None
                    except: vals[h] = None
            indicators.append({"name": name, "accode": accode, "values": vals})
        return {"status": "success", "headers": [h for h in headers if h], "indicators": indicators}
    except: return None
"""

# New get_stock_financials body
new_body = """
    import re, requests, yfinance as yf, pandas as pd, io
    from bs4 import BeautifulSoup
    
    is_global = bool(re.search(r"[A-Za-z]", symbol)) and not symbol.endswith((".KS", ".KQ"))
    if is_global:
        try:
            ticker_name = symbol.split(".")[0]
            t = yf.Ticker(ticker_name)
            info = t.info
            return {
                "status": "success", "symbol": symbol,
                "market_cap": f"{info.get('marketCap', 0):,}",
                "per": str(info.get('trailingPE', 'N/A')),
                "pbr": str(info.get('priceToBook', 'N/A')),
                "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 'N/A',
                "revenue": f"{info.get('totalRevenue', 0) / 1e8:.0f}억" if info.get('totalRevenue') else "N/A",
                "detailed": { "success": True, "summary": info, "full_data": {} }
            }
        except: pass

    try:
        res = gather_naver_stock_data(symbol) or {}
        detailed = { "success": False, "summary": {}, "full_data": {} }
        code = symbol.split('.')[0]
        
        # 1. Primary: HTML Scrape (Main Page - Server Side)
        try:
            url = f"https://finance.naver.com/item/main.naver?code={code}"
            resp = requests.get(url, headers=HEADER, timeout=7)
            if resp.ok:
                # Use BeautifulSoup to find the specific table
                soup = BeautifulSoup(resp.content.decode('euc-kr', 'ignore'), 'html.parser')
                table_div = soup.select_one('div.section.cop_analysis')
                if table_div:
                    table = table_div.find('table')
                    if table:
                        df = pd.read_html(io.StringIO(str(table)))[0]
                        if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(-1)
                        headers = [str(c).strip() for c in df.columns[1:]]
                        clean_headers = [f"{h.split('.')[0]}/{h.split('.')[1]}" if '.' in h else h for h in [h.replace('\\n','').strip() for h in headers]]
                        
                        mapping = {
                            "매출액": "revenue", "영업이익": "operating_income", "당기순이익": "net_income",
                            "영업이익률": "operating_margin", "순이익률": "net_income_margin", "ROE": "roe",
                            "부채비율": "debt_ratio", "당좌비율": "quick_ratio", "유보율": "reserve_ratio",
                            "EPS": "eps", "PER": "per", "BPS": "bps", "PBR": "pbr"
                        }
                        
                        for _, row in df.iterrows():
                            label = str(row.iloc[0]).strip()
                            key = next((v for k, v in mapping.items() if k in label), None)
                            if key:
                                vals = [float(str(v).replace(',','')) if str(v).strip() not in ["","-","nan"] else None for v in row.values[1:]]
                                detailed["full_data"][key] = { "dates": clean_headers, "values": vals }
                                detailed["summary"][key] = next((v for v in reversed(vals) if v is not None), None)
                        detailed["success"] = True
        except Exception as e:
            print(f"Primary Scrape Error: {e}")

        # 2. Secondary: WiseReport Backup (Mapping by ACCODE if needed)
        if not detailed["success"] or len(detailed["full_data"]) < 5:
            wr = get_korean_investment_indicators(symbol, freq="0", rpt="3")
            if wr:
                wr_mapping = { "222100": "per", "222400": "pbr", "121500": "roe", "115000": "debt_ratio" }
                for ind in wr["indicators"]:
                    key = wr_mapping.get(ind["accode"])
                    if key and key not in detailed["full_data"]:
                        vals = [ind["values"].get(h) for h in wr["headers"]]
                        detailed["full_data"][key] = { "dates": wr["headers"], "values": vals }
                        detailed["summary"][key] = next((v for v in reversed(vals) if v is not None), None)
                detailed["success"] = True

        return {
            "status": "success", "symbol": symbol,
            "market_cap": res.get("market_cap_str", "N/A"),
            "per": str(detailed["summary"].get("per", res.get("per", "N/A"))),
            "pbr": str(detailed["summary"].get("pbr", res.get("pbr", "N/A"))),
            "roe": detailed["summary"].get("roe", res.get("roe", "N/A")),
            "revenue": detailed["summary"].get("revenue", "N/A"),
            "detailed": detailed
        }
    except Exception as e:
        print(f"Financials error for {symbol}: {e}")
        return { "status": "error", "message": str(e) }
"""

# Replace get_stock_financials
start_idx = -1
for i, line in enumerate(cleaned_lines):
    if 'def get_stock_financials(symbol: str):' in line:
        start_idx = i; break

if start_idx != -1:
    end_idx = -1
    for i in range(start_idx, len(cleaned_lines)):
        if 'def get_korean_market_indices():' in cleaned_lines[i]:
            end_idx = i; break
    
    if end_idx != -1:
        final_lines = cleaned_lines[:start_idx+1] + [new_body + "\\n\\n"] + cleaned_lines[end_idx:]
        final_lines.append(new_func)
        with open(target_file, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)
        print("Success!")
    else: print("End marker not found")
else: print("Start marker not found")
