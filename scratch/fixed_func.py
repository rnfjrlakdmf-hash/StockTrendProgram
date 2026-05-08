def get_stock_financials(symbol: str):
    """ Legacy Wrapper to prevent duplicated requests (Supports Global) """
    import re
    import yfinance as yf
    import math
    import requests
    from bs4 import BeautifulSoup
    
    # Check if it's a US/Global stock
    is_global = False
    try:
        is_global = bool(re.search(r'[A-Za-z]', symbol)) and not symbol.endswith(('.KS', '.KQ'))
    except:
        pass
        
    if is_global:
        try:
            # Global Stock Logic (yfinance)
            ticker_name = symbol.split('.')[0]
            t = yf.Ticker(ticker_name)
            
            info = {}
            try:
                info = t.info
            except: pass
            
            mcap = info.get('marketCap') or 0
            financials = {
                "market_cap": f"{mcap / 1e12:.2f}T" if mcap > 1e12 else f"{mcap / 1e9:.2f}B" if mcap > 0 else "N/A",
                "per": str(info.get('trailingPE', 'N/A')),
                "pbr": str(info.get('priceToBook', 'N/A')),
                "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 'N/A',
                "revenue": f"{info.get('totalRevenue', 0) / 1e8:.0f}억" if info.get('totalRevenue') else "N/A",
                "operating_income": "N/A", "debt_ratio": "N/A"
            }
            
            income_stmt = t.income_stmt
            balance_sheet = t.balance_sheet
            
            try:
                if not income_stmt.empty:
                    rev = income_stmt.loc['Total Revenue'].iloc[0] if 'Total Revenue' in income_stmt.index else 0
                    op_inc = income_stmt.loc['Operating Income'].iloc[0] if 'Operating Income' in income_stmt.index else 0
                    financials['revenue'] = f"{rev / 1e8:.0f}억" if rev != 0 else financials['revenue']
                    financials['operating_income'] = f"{op_inc / 1e8:.0f}억" if op_inc != 0 else "N/A"
                    
                    if not balance_sheet.empty:
                        liab = balance_sheet.loc['Total Liabilities Net Minority Interest'].iloc[0] if 'Total Liabilities Net Minority Interest' in balance_sheet.index else 0
                        equity = balance_sheet.loc['Stockholders Equity'].iloc[0] if 'Stockholders Equity' in balance_sheet.index else 0
                        if equity != 0:
                            financials['debt_ratio'] = f"{(liab / equity) * 100:.2f}%"
            except: pass
            
            if financials['operating_income'] == 'N/A':
                financials['operating_income'] = info.get('operatingCashflow', 'N/A')
            
            if financials['debt_ratio'] == 'N/A':
                financials['debt_ratio'] = info.get('debtToEquity', 'N/A')

            annual_data = []
            quarterly_data = []
            
            def get_val(df, key, col):
                if df.empty or key not in df.index or col not in df.columns:
                    return 0
                val = df.loc[key, col]
                import pandas as pd
                if pd.isna(val): return 0
                return float(val)

            try:
                for i, date in enumerate(income_stmt.columns[:4]):
                    d_str = str(date.year)
                    assets = get_val(balance_sheet, 'Total Assets', date)
                    annual_data.append({
                        "date": d_str,
                        "revenue": get_val(income_stmt, 'Total Revenue', date),
                        "operating_income": get_val(income_stmt, 'Operating Income', date),
                        "net_income": get_val(income_stmt, 'Net Income', date),
                        "total_assets": assets
                    })
                    
                q_stmt = t.quarterly_income_stmt
                if not q_stmt.empty:
                    for i, date in enumerate(q_stmt.columns[:4]):
                        d_str = f"{date.year}.{((date.month-1)//3)+1}Q"
                        quarterly_data.append({
                            "date": d_str,
                            "revenue": get_val(q_stmt, 'Total Revenue', date),
                            "operating_income": get_val(q_stmt, 'Operating Income', date),
                            "net_income": get_val(q_stmt, 'Net Income', date)
                        })
            except Exception as e:
                print(f"Global financials detailed error: {e}")

            financials.update({
                "detailed": {
                    "success": True,
                    "summary": {
                        "per": info.get('trailingPE', 'N/A'),
                        "pbr": info.get('priceToBook', 'N/A'),
                        "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 'N/A'
                    },
                    "annual": annual_data,
                    "quarterly": quarterly_data
                }
            })
            return financials
        except Exception as e:
            print(f"Global info fetch error for {symbol}: {e}")
            if not any(c.isalpha() for c in symbol):
                pass
            else:
                return {
                    "per": "N/A", "pbr": "N/A", "success": False,
                    "detailed": { "success": False, "annual": [], "quarterly": [], "summary": {"per": "N/A", "pbr": "N/A", "roe": "N/A"} }
                }

    # --- DOMESTIC STOCK LOGIC (Naver) ---
    try:
        res = gather_naver_stock_data(symbol)
        if not res:
            res = {
                "market_cap_str": "N/A", "per": "N/A", "pbr": "N/A", "roe": "N/A",
                "revenue": "N/A", "operating_income": "N/A", "net_income": "N/A", "debt_ratio": "N/A"
            }
            
        detailed = res.get("detailed_financials")
        if not detailed or not detailed.get("success"):
            ind_data = get_korean_investment_indicators(symbol)
            if ind_data and ind_data.get("status") == "success":
                headers = ind_data.get("headers", [])
                indicators = ind_data.get("indicators", [])
                
                summary = {
                    "per": res.get("per", "N/A"), "pbr": res.get("pbr", "N/A"), "roe": res.get("roe", "N/A"),
                    "revenue": "N/A", "operating_income": "N/A", "net_income": "N/A", "debt_ratio": "N/A"
                }
                
                for ind in indicators:
                    name = str(ind.get("name", ""))
                    vals = ind.get("values", {})
                    latest_h = headers[-1] if headers else None
                    if not latest_h: continue
                    val = vals.get(latest_h, "N/A")
                    if "매출액" in name or "⸮" in name: summary["revenue"] = val
                    elif "영업이익" in name or "÷" in name: summary["operating_income"] = val
                    elif "당기순이익" in name or "籢" in name: summary["net_income"] = val
                    elif "부채비율" in name or "θñ" in name: summary["debt_ratio"] = val
                    elif "ROE" in name: summary["roe"] = val
                
                full_data = {}
                for ind in indicators:
                    name = str(ind.get("name", ""))
                    internal_key = None
                    if "매출액" in name or "⸮" in name: internal_key = "revenue"
                    elif "영업이익" in name or "÷" in name: internal_key = "operating_income"
                    elif "당기순이익" in name or "籢" in name: internal_key = "net_income"
                    elif "ROE" in name: internal_key = "roe"
                    elif "부채비율" in name or "θñ" in name: internal_key = "debt_ratio"
                    elif "PER" in name: internal_key = "per"
                    elif "PBR" in name: internal_key = "pbr"
                    
                    if internal_key:
                        full_data[internal_key] = {
                            "dates": headers,
                            "values": [ind["values"].get(h) for h in headers]
                        }

                detailed = {
                    "success": True, "summary": summary, "full_data": full_data, "annual": [], "quarterly": []
                }
            else:
                try:
                    import pandas as pd
                    import io
                    code = symbol.split('.')[0]
                    url = f"https://finance.naver.com/item/main.naver?code={code}"
                    HEADER = {'User-Agent': 'Mozilla/5.0'}
                    resp = requests.get(url, headers=HEADER, timeout=5)
                    if resp.ok:
                        tables = pd.read_html(io.StringIO(resp.text))
                        fin_df = None
                        for df in tables:
                            if any('매출액' in str(val) for val in df.values.flatten()):
                                fin_df = df
                                break
                        if fin_df is not None:
                            if isinstance(fin_df.columns, pd.MultiIndex):
                                fin_df.columns = fin_df.columns.get_level_values(-1)
                            cols = [str(c) for c in fin_df.columns[1:]]
                            rows = fin_df.iloc[:, 0].values
                            summary = {
                                "per": res.get("per", "N/A"), "pbr": res.get("pbr", "N/A"), "roe": res.get("roe", "N/A"),
                                "revenue": "N/A", "operating_income": "N/A", "debt_ratio": "N/A"
                            }
                            full_data = {}
                            mapping = {"매출액": "revenue", "영업이익": "operating_income", "당기순이익": "net_income", "ROE": "roe", "부채비율": "debt_ratio", "PER": "per", "PBR": "pbr"}
                            for i, row_name in enumerate(rows):
                                row_name = str(row_name)
                                for k, v in mapping.items():
                                    if k in row_name:
                                        vals = [str(val).replace(',', '').replace('nan', '-').strip() for val in fin_df.iloc[i, 1:]]
                                        full_data[v] = {"dates": cols, "values": vals}
                                        if v in summary and len(vals) > 0 and vals[-1] != '-':
                                            summary[v] = vals[-1]
                            detailed = {"success": True, "summary": summary, "full_data": full_data, "annual": [], "quarterly": []}
                        else: raise Exception("Table not found")
                    else: raise Exception(f"HTTP {resp.status_code}")
                except Exception as ex:
                    print(f"Scrape failed: {ex}")
                    detailed = {
                        "success": True,
                        "summary": {
                            "per": res.get("per", "N/A"), "pbr": res.get("pbr", "N/A"), "roe": res.get("roe", "N/A"),
                            "revenue": "N/A", "operating_income": "N/A", "net_income": "N/A", "debt_ratio": "N/A"
                        },
                        "full_data": {
                            "per": {"dates": ["현재"], "values": [res.get("per", "N/A")]},
                            "pbr": {"dates": ["현재"], "values": [res.get("pbr", "N/A")]}
                        }, 
                        "annual": [], "quarterly": []
                    }
            
        financials = {
            "market_cap": res.get("market_cap_str", "N/A"),
            "per": str(detailed["summary"].get('per', 'N/A')),
            "pbr": str(detailed["summary"].get('pbr', 'N/A')),
            "roe": detailed["summary"].get('roe'),
            "revenue": detailed["summary"].get('revenue'),
            "operating_income": detailed["summary"].get('operating_income'),
            "debt_ratio": detailed["summary"].get('debt_ratio'),
            "detailed": detailed
        }
        return financials
    except Exception as e:
        print(f"Final crawl error for {symbol}: {e}")
        return {"per": "N/A", "pbr": "N/A", "success": False}
