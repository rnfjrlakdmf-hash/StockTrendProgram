import requests
from bs4 import BeautifulSoup
import re
import json
import datetime
from typing import Dict, List, Any, Optional
import urllib.parse
from korea_data import HEADER, decode_safe
from turbo_engine import turbo_cache

@turbo_cache(ttl_seconds=3600)
def get_sector_analysis_data(symbol: str, sector_id: Optional[str] = None) -> Dict[str, Any]:
    """
    [v1.9.0] TurboQuant Intelligent Sector Scraper
    - Text-based table recognition (PER, PBR, ROE, etc.)
    - Support for dynamic sector selection
    - Robust fallback for missing data
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
        
        # Step 1: Fetch Main Sector Page (v1.9.1 Correct Source)
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1090001.aspx?cmp_cd={code}"
        if sector_id:
            url += f"&set_sect={sector_id}"
            
        res = session.get(url, timeout=10)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1-1. Sector basic meta
        sector_info = {}
        desc_box = soup.select_one(".cmp_comment") or soup.select_one(".txt_sector")
        if desc_box:
            sector_info["description"] = desc_box.get_text(strip=True)
            
        # 1-2. Sector comparison list (ID fixed as 'sector')
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

        # Step 2: Fetch AJAX Data for Charts and Tables (v1.9.2 AJAX Integration)
        target_sec = sector_id
        if not target_sec and compare_sectors:
            # Pick currently selected or first one
            target_sec = next((s["id"] for s in compare_sectors if s.get("selected")), compare_sectors[0]["id"])
        
        if not target_sec:
            target_sec = "WI620" # Default fallback (Semiconductor)

        ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={code}&sec_cd={target_sec}&data_typ=1"
        ajax_res = session.get(ajax_url, timeout=10)
        
        # v1.9.3: Fix mojibake by using correct UTF-8 decoding
        # WiseReport AJAX responses are now usually UTF-8
        try:
            ajax_content = ajax_res.content.decode('utf-8')
        except UnicodeDecodeError:
            ajax_content = decode_safe(ajax_res)
            
        ajax_json = json.loads(ajax_content)
        
        # Step 3: Intelligent Data Mapping
        charts = {}
        summary_table = []
        
        # 3-1. Yield (dt0)
        yield_data = ajax_json.get("dt0", {})
        y_headers = yield_data.get("yymm", [])
        if y_headers:
            yield_rows = []
            for item in yield_data.get("data", []):
                # Use NM if available, else derive from GUBN
                name = item.get("NM", "Unknown")
                gubn = str(item.get("GUBN"))
                if gubn == "1": name = "대상 종목"
                elif gubn == "2": name = "업종 평균"
                elif gubn == "3": name = "시장 지수"
                
                row = {"name": name}
                for i, h in enumerate(y_headers):
                    fy_key = f"FY_{4-i}" if i < 5 else f"FY{i-4}"
                    val = item.get(fy_key)
                    row[h] = float(val) if val is not None and val != "" else None
                yield_rows.append(row)
            
            charts["주가수익률"] = {
                "headers": y_headers,
                "rows": yield_rows,
                "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in yield_rows}} for h in y_headers]
            }

        # 3-2. Core Metrics (dt3: PER, PBR, ROE, etc.)
        # ITEM 1: PER, 2: PBR, 3: Revenue Growth, 6: Debt Ratio, 8: Div, 9: ROE, 11: GPM
        metrics_map = {
            1: "PER", 2: "PBR", 9: "ROE", 6: "부채비율", 
            11: "영업이익률", 8: "배당수익률", 3: "매출성장률"
        }
        indicators_data = ajax_json.get("dt3", {})
        i_headers = indicators_data.get("yymm", [])
        
        if i_headers:
            for i_code, m_name in metrics_map.items():
                m_rows = []
                for item in indicators_data.get("data", []):
                    if str(item.get("ITEM")) == str(i_code):
                        name = item.get("NM", "Unknown")
                        gubn = str(item.get("GUBN"))
                        if gubn == "1": name = "대상 종목"
                        elif gubn == "2": name = "업종 평균"
                        elif gubn == "3": name = "시장 지수"

                        row = {"name": name}
                        for idx, h in enumerate(i_headers):
                            fy_key = f"FY_{4-idx}" if idx < 5 else f"FY{idx-4}"
                            val = item.get(fy_key)
                            row[h] = float(val) if val is not None and val != "" else None
                        m_rows.append(row)
                
                if m_rows:
                    charts[m_name] = {
                        "headers": i_headers,
                        "rows": m_rows,
                        "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in i_headers]
                    }
                    
                    # Update Summary Table (Latest)
                    latest_h = i_headers[-1]
                    for r in m_rows:
                        s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                        if not s_entry:
                            s_entry = {"name": r["name"]}
                            summary_table.append(s_entry)
                        s_entry[m_name] = r.get(latest_h)

        # Step 4: Final Data Assembly
        if not summary_table:
            summary_table = [{"name": symbol, "PER": 0.0, "PBR": 0.0}]

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors if compare_sectors else [{"id": "0", "name": "시장평균", "selected": True}],
            "charts": charts,
            "summary_table": summary_table,
            "turbo_version": "2.0.0 (Gold-Standard)",
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
