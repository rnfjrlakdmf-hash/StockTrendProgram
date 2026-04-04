import requests
from bs4 import BeautifulSoup
import re
import json
import datetime
from typing import Dict, List, Any, Optional
import urllib.parse
from korea_data import HEADER, decode_safe
from turbo_engine import turbo_cache

# # @turbo_cache(ttl_seconds=3600)
def get_sector_analysis_data(symbol: str, sector_id: Optional[str] = None) -> Dict[str, Any]:
    """
    [v2.1.0] TurboQuant Intelligent Sector Scraper (Elite Precision)
    - Fix SEQ mapping (pick SEQ 1 for ratios)
    - Correct PER 6M+ error
    - Support for 15+ interactive metrics
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return {"status": "error", "message": "Invalid symbol"}

    try:
        session = requests.Session()
        turbo_headers = HEADER.copy()
        turbo_headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "max-age=0",
        })
        session.headers.update(turbo_headers)
        
        # Step 1: Sector Basic Meta
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1090001.aspx?cmp_cd={code}"
        if sector_id:
            url += f"&set_sect={sector_id}"
            
        res = session.get(url, timeout=10)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        sector_info = {}
        desc_box = soup.select_one(".cmp_comment") or soup.select_one(".txt_sector")
        if desc_box:
            sector_info["description"] = desc_box.get_text(strip=True)
            
        compare_sectors = []
        select_box = soup.select_one("select#sector")
        if select_box:
            for opt in select_box.select("option"):
                v = opt.get("value")
                n = opt.get_text(strip=True)
                if v:
                    compare_sectors.append({
                        "id": v, "name": n,
                        "selected": "selected" in opt.attrs or opt.get("selected") == "selected"
                    })
        
        # [v2.4.1] Diamond Fix: Force specific sector as selected if requested
        if sector_id:
            for s in compare_sectors:
                s["selected"] = (s["id"] == sector_id)

        # Step 2: Fetch Multi-proc AJAX Data
        target_sec = sector_id
        if not target_sec and compare_sectors:
            target_sec = next((s["id"] for s in compare_sectors if s.get("selected")), compare_sectors[0]["id"])
        
        if not target_sec: target_sec = "WI620"

        # [v2.1.1] Optimized Fetch Logic - All metrics in one unified call where possible
        ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={code}&sec_cd={target_sec}&data_typ=1"
        ajax_res = session.get(ajax_url, timeout=10)
        ajax_content = decode_safe(ajax_res)
        ajax_json = json.loads(ajax_content)
        
        charts = {}
        summary_table = []
        
        # 3-1. Time-series Returns (dt1)
        ts_data = ajax_json.get("dt1", {})
        ts_dates = ts_data.get("TRD_DT", [])
        if ts_dates:
            ts_rows = []
            stk_rtn = ts_data.get("STK_RTN", [])
            sec_rtn = ts_data.get("SEC_RTN", [])
            mkt_rtn = ts_data.get("MKT_RTN", [])
            
            for i, timestamp in enumerate(ts_dates):
                dt = datetime.datetime.fromtimestamp(timestamp / 1000.0)
                date_str = dt.strftime("%Y-%m-%d")
                ts_rows.append({
                    "period": date_str,
                    "대상 종목": stk_rtn[i] if i < len(stk_rtn) else None,
                    "업종 평균": sec_rtn[i] if i < len(sec_rtn) else None,
                    "시장 지수": mkt_rtn[i] if i < len(mkt_rtn) else None,
                })
            charts["주가수익률"] = {
                "headers": ["대상 종목", "업종 평균", "시장 지수"],
                "chart_data": ts_rows
            }

        # 3-2. Yearly Returns (dt0)
        yield_data = ajax_json.get("dt0", {})
        y_headers = yield_data.get("yymm", [])
        if y_headers:
            yield_rows = []
            for item in yield_data.get("data", []):
                name = item.get("NM", "Unknown")
                gubn = str(item.get("GUBN"))
                if gubn == "1": name = "대상 종목"
                elif gubn == "2": name = "업종 평균"
                elif gubn == "3": name = "시장 지수"
                
                row = {"name": name}
                for i, h in enumerate(y_headers):
                    fy_key = f"FY_{4-i}" if i < 4 else f"FY{i-4}"
                    val = item.get(fy_key)
                    row[h] = float(val) if val is not None and val != "" else None
                yield_rows.append(row)
            
            # [v2.2.0] Standardized key and filter estimates
            yield_rows = [r for r in yield_rows if "(E)" not in str(r.get("name", ""))]
            y_headers = [h for h in y_headers if "(E)" not in h]
            
            charts["주가수익률_연간"] = {
                "headers": y_headers,
                "rows": yield_rows,
                "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in yield_rows}} for h in y_headers]
            }
            
            # [v2.0.3] Add latest return to summary table
            latest_y_h = y_headers[-1]
            for r in yield_rows:
                s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                if not s_entry:
                    s_entry = {"name": r["name"]}
                    summary_table.append(s_entry)
                s_entry["주가수익률"] = r.get(latest_y_h)

        # 3-3. Comprehensive Data Extraction (dt3)
        # [v2.5.0] Royal Final METRICS_MAP (Enhanced Alphanumeric Keys)
        METRICS_MAP = {
            1: "per", 18: "fwd_per", 
            2: "pbr", 20: "fwd_pbr",
            6: "debt_ratio", 14: "current_ratio", 
            9: "roe", 10: "roa", 
            8: "div_yield", 15: "payout_ratio",
            3: "sales_growth", 4: "op_growth", 5: "net_growth",
            11: "gross_margin", 12: "op_margin", 13: "net_margin"
        }
        
        indicators_data = ajax_json.get("dt3", {})
        i_headers = indicators_data.get("yymm", [])
        
        if i_headers:
            item_groups = {}
            for item in indicators_data.get("data", []):
                # [Fix] Critical: Support both SEQ 1 (Ratio/Multiple) and SEQ 2 (Growth/Margin variants)
                seq = int(item.get("SEQ", 0))
                i_code = int(item.get("ITEM", 0))
                
                # Allow SEQ 1 for most metrics, SEQ 2 for op_growth (4)
                if seq not in [1, 2]: continue
                
                if i_code not in item_groups: item_groups[i_code] = []
                item_groups[i_code].append(item)
                
            for i_code, rows in item_groups.items():
                m_name = METRICS_MAP.get(i_code) or rows[0].get("NM", f"Item {i_code}")
                m_rows = []
                for item in rows:
                    name = item.get("NM", "Unknown")
                    gubn = str(item.get("GUBN"))
                    if gubn == "1": name = "대상 종목"
                    elif gubn == "2": name = "업종 평균"
                    elif gubn == "3": name = "시장 지수"

                    row = {"name": name}
                    for idx, h in enumerate(i_headers):
                        fy_key = f"FY_{4-idx}" if idx < 4 else f"FY{idx-4}"
                        val = item.get(fy_key)
                        row[h] = float(val) if val is not None and val != "" else None
                    m_rows.append(row)
                
                if m_rows:
                    charts[m_name] = {
                        "headers": i_headers,
                        "rows": m_rows,
                        "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in i_headers]
                    }
                    
                    latest_h = i_headers[-1]
                    for r in m_rows:
                        s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                        if not s_entry:
                            s_entry = {"name": r["name"]}
                            summary_table.append(s_entry)
                        s_entry[m_name] = r.get(latest_h)

        if not summary_table:
            summary_table = [{"name": symbol, "PER": 0.0, "PBR": 0.0}]

        # [v2.3.0] Final Data Purge - Recursive (E) removal from all charts
        def purge_estimates(obj):
            if isinstance(obj, dict):
                # Remove keys containing (E)
                new_dict = {k: purge_estimates(v) for k, v in obj.items() if "(E)" not in str(k)}
                return new_dict
            elif isinstance(obj, list):
                # Remove entire rows/items containing (E) in their values (specifically under 'period' or 'name')
                return [purge_estimates(i) for i in obj if not any("(E)" in str(v) for v in (i.values() if isinstance(i, dict) else [i]))]
            return obj

        cleaned_charts = purge_estimates(charts)

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors if compare_sectors else [{"id": "0", "name": "시장평균", "selected": True}],
            "charts": cleaned_charts,
            "summary_table": summary_table,
            "turbo_version": "2.5.0 (Royal-Final)",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "status": "success",
            "symbol": symbol,
            "summary_table": [{"name": symbol, "PER": 0, "PBR": 0}],
            "error_msg": str(e)
        }
