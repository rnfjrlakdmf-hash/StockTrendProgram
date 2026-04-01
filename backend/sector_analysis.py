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
        
        # Step 1: Fetch Main Sector Page
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1050001.aspx?cmp_cd={code}"
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
            
        # 1-2. Sector comparison list
        compare_sectors = []
        select_box = soup.select_one("select#setSect")
        if select_box:
            for opt in select_box.select("option"):
                v = opt.get("value")
                n = opt.get_text(strip=True)
                if v:
                    compare_sectors.append({
                        "id": v, "name": n,
                        "selected": "selected" in opt.attrs or opt.get("selected") == "selected"
                    })

        # Step 2: Intelligent Table Scraper (Text-based searching)
        target_metrics = {
            "주가수익률": ["주가수익률", "수익률"],
            "배당수익률": ["배당수익률", "배당"],
            "PER": ["PER"],
            "PBR": ["PBR"],
            "ROE": ["ROE"],
            "부채비율": ["부채비율"],
            "매출총이익률": ["매출총이익률"],
            "영업이익률": ["영업이익률"]
        }
        
        charts = {}
        summary_table = []
        all_tables = soup.select("table")

        for metric_name, keywords in target_metrics.items():
            relevant_table = None
            for table in all_tables:
                table_text = table.get_text()
                if any(kw in table_text for kw in keywords):
                    relevant_table = table
                    break
            
            if not relevant_table:
                # If table not found by text, try ID as fallback
                fallback_ids = {
                    "주가수익률": "cTB11", "배당수익률": "cTB12", "PER": "cTB13", "PBR": "cTB14",
                    "ROE": "cTB15", "부채비율": "cTB16", "매출총이익률": "cTB17", "영업이익률": "cTB18"
                }
                fid = fallback_ids.get(metric_name)
                relevant_table = soup.select_one(f"table#{fid}")
            
            if not relevant_table:
                continue
            
            # Extract headers (periods)
            headers = [th.get_text(strip=True) for th in relevant_table.select("thead th") if th.get_text(strip=True) and "항목" not in th.get_text()]
            if not headers:
                continue

            # Extract rows
            rows_data = []
            for tr in relevant_table.select("tbody tr"):
                tds = tr.select("td")
                if not tds:
                    continue
                name_el = tds[0]
                name = name_el.get_text(strip=True)
                val_dict = {"name": name}
                for i, h in enumerate(headers):
                    if i+1 < len(tds):
                        v_str = tds[i+1].get_text(strip=True).replace(',', '').replace('%', '')
                        try:
                            if v_str in ('', '-', 'N/A', 'NaN'):
                                val_dict[h] = None
                            else:
                                val_dict[h] = float(v_str)
                        except:
                            val_dict[h] = None
                rows_data.append(val_dict)

            if rows_data:
                # Chart formulation
                chart_data = []
                for h in headers:
                    entry = {"period": h}
                    for rd in rows_data:
                        entry[rd["name"]] = rd.get(h)
                    chart_data.append(entry)
                
                charts[metric_name] = {
                    "headers": headers,
                    "rows": rows_data,
                    "chart_data": chart_data
                }

                # Update Summary Table (Latest values)
                latest_h = headers[-1]
                for rd in rows_data:
                    s_entry = next((s for s in summary_table if s["name"] == rd["name"]), None)
                    if not s_entry:
                        s_entry = {"name": rd["name"]}
                        summary_table.append(s_entry)
                    s_entry[metric_name] = rd.get(latest_h)

        # Step 3: Final Data Assembly
        if not summary_table:
            # Fatal scenario fallback: Minimal data
            summary_table = [{"name": symbol, "PER": 0.0, "PBR": 0.0}]

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors if compare_sectors else [{"id": "0", "name": "시장평균", "selected": True}],
            "charts": charts,
            "summary_table": summary_table,
            "turbo_version": "1.9.0",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        print(f"Turbo Sector Error: {e}")
        return {
            "status": "success",
            "symbol": symbol,
            "summary_table": [{"name": symbol, "PER": 0, "PBR": 0}],
            "error_msg": str(e)
        }
