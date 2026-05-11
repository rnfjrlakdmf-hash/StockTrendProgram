
import sys
import os

target_file = 'backend/korea_data.py'
with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Remove the previously appended function if it's there (to start clean)
# We know we appended it at the end.
cleaned_lines = []
for line in lines:
    if 'def get_korean_investment_indicators' in line:
        break
    cleaned_lines.append(line)

# 2. Re-append the function at the end properly
new_func = """
def get_korean_investment_indicators(symbol: str, freq: str = "0", rpt: str = "3"):
    try:
        code = symbol.split('.')[0]
        import requests, re, json
        HEADER = {"User-Agent": "Mozilla/5.0"}
        frame_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={code}"
        res_frame = requests.get(frame_url, headers=HEADER, timeout=7)
        encparam = re.search(r"encparam:\\s*'([^']*)'", res_frame.text).group(1)
        data_url = f"https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd={code}&frq={freq}&rpt={rpt}&finGubun=MAIN&encparam={encparam}"
        res_data = requests.get(data_url, headers={"Referer": frame_url}, timeout=7)
        try: json_data = res_data.json()
        except: json_data = json.loads(res_data.content.decode('utf-8', 'ignore'))
        headers = []
        for h in json_data.get("YYMM", []):
            clean_h = re.sub(r'<[^>]*>', '', h).strip()
            match = re.search(r'(\\d{4}/\\d{2})', clean_h)
            headers.append(match.group(1) if match else None)
        indicators = []
        for row in json_data.get("DATA", []):
            name, accode, vals = str(row.get("ACC_NM", "")).strip(), str(row.get("ACCODE", "")), {}
            for i, h in enumerate(headers):
                if h:
                    v = row.get(f"DATA{i+1}")
                    try: vals[h] = float(str(v).replace(',', '')) if v else None
                    except: vals[h] = None
            indicators.append({"name": name, "accode": accode, "values": vals})
        return {"status": "success", "headers": [h for h in headers if h], "indicators": indicators}
    except: return None
"""

# 3. Modify get_stock_financials
# Find the line "def get_stock_financials(symbol: str):"
start_idx = -1
for i, line in enumerate(cleaned_lines):
    if 'def get_stock_financials(symbol: str):' in line:
        start_idx = i
        break

if start_idx != -1:
    # Find the next function "def get_korean_market_indices():"
    end_idx = -1
    for i in range(start_idx, len(cleaned_lines)):
        if 'def get_korean_market_indices():' in cleaned_lines[i]:
            end_idx = i
            break
    
    if end_idx != -1:
        # Construct the new function body
        new_body = [
            '    import re, requests, yfinance as yf, pandas as pd, io\\n',
            '    is_global = bool(re.search(r"[A-Za-z]", symbol)) and not symbol.endswith((".KS", ".KQ"))\\n',
            '    if is_global:\\n',
            '        try:\\n',
            '            t = yf.Ticker(symbol.split(".")[0])\\n',
            '            info = t.info\\n',
            '            return {"status": "success", "symbol": symbol, "market_cap": f"{info.get(\'marketCap\', 0):,}", "per": str(info.get(\'trailingPE\', \'N/A\')), "pbr": str(info.get(\'priceToBook\', \'N/A\')), "roe": info.get(\'returnOnEquity\', 0)*100, "detailed": {"success": True, "summary": info, "full_data": {}}}\\n',
            '        except: pass\\n',
            '    try:\\n',
            '        res = gather_naver_stock_data(symbol) or {}\\n',
            '        detailed = {"success": False, "summary": {}, "full_data": {}}\\n',
            '        try:\\n',
            '            resp = requests.get(f"https://finance.naver.com/item/main.naver?code={symbol.split(\'.\')[0]}", headers=HEADER, timeout=7)\\n',
            '            html = resp.content.decode("euc-kr", "ignore")\\n',
            '            tables = pd.read_html(io.StringIO(html))\\n',
            '            fin_df = next((df for df in tables if any("매출액" in str(v) for v in df.values.flatten())), None)\\n',
            '            if fin_df is not None:\\n',
            '                if isinstance(fin_df.columns, pd.MultiIndex): fin_df.columns = fin_df.columns.get_level_values(-1)\\n',
            '                headers = [str(c).strip() for c in fin_df.columns[1:]]\\n',
            '                clean_headers = [f"{h.split(\'.\')[0]}/{h.split(\'.\')[1]}" if \'.\' in h else h for h in [h.replace(\'\\n\',\'\').strip() for h in headers]]\\n',
            '                mapping = {"매출액": "revenue", "영업이익": "operating_income", "ROE": "roe", "PER": "per", "PBR": "pbr"}\\n',
            '                for _, row in fin_df.iterrows():\\n',
            '                    label = str(row.iloc[0]).strip()\\n',
            '                    key = next((v for k, v in mapping.items() if k in label), None)\\n',
            '                    if key:\\n',
            '                        vals = [float(str(v).replace(\',\',\'\')) if str(v).strip() not in ["","-","nan"] else None for v in row.values[1:]]\\n',
            '                        detailed["full_data"][key] = {"dates": clean_headers, "values": vals}\\n',
            '                        detailed["summary"][key] = next((v for v in reversed(vals) if v is not None), None)\\n',
            '                detailed["success"] = True\\n',
            '        except: pass\\n',
            '        if not detailed["success"] or len(detailed["full_data"]) < 3:\\n',
            '            wr = get_korean_investment_indicators(symbol)\\n',
            '            if wr:\\n',
            '                wr_mapping = {"ROE": "roe", "PER": "per", "PBR": "pbr"}\\n',
            '                for ind in wr["indicators"]:\\n',
            '                    key = next((v for k, v in wr_mapping.items() if k in ind["name"]), None)\\n',
            '                    if key and (key not in detailed["full_data"]):\\n',
            '                        vals = [ind["values"].get(h) for h in wr["headers"]]\\n',
            '                        detailed["full_data"][key] = {"dates": wr["headers"], "values": vals}\\n',
            '                        detailed["summary"][key] = vals[-1] if vals else None\\n',
            '                detailed["success"] = True\\n',
            '        return {"status": "success", "symbol": symbol, "market_cap": res.get("market_cap_str", "N/A"), "per": str(detailed["summary"].get("per", res.get("per", "N/A"))), "pbr": str(detailed["summary"].get("pbr", res.get("pbr", "N/A"))), "roe": detailed["summary"].get("roe", res.get("roe", "N/A")), "revenue": detailed["summary"].get("revenue", "N/A"), "detailed": detailed}\\n',
            '    except Exception as e: return {"status": "error", "message": str(e)}\\n',
            '\\n\\n'
        ]
        
        # Replace the block
        # Keep the function signature line
        final_lines = cleaned_lines[:start_idx+1] + new_body + cleaned_lines[end_idx:]
        
        # Append the indicator function at the end
        final_lines.append(new_func)
        
        with open(target_file, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)
        print("Success!")
    else:
        print("End marker not found")
else:
    print("Start marker not found")
