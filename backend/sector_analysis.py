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
    [v1.7.0] TurboQuant Enhanced Sector Engine (Interactive)
    - sector_id 파라미터를 지원하여 드롭다운 선택 시 실시간 데이터 로드
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return {"status": "error", "message": "Invalid symbol"}

    try:
        session = requests.Session()
        # Enhanced headers for better bypass
        turbo_headers = HEADER.copy()
        turbo_headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "max-age=0",
        })
        session.headers.update(turbo_headers)
        
        # Step 1: Multiple data source attempts
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1050001.aspx?cmp_cd={code}"
        if sector_id:
            url += f"&set_sect={sector_id}"
            
        res = session.get(url, timeout=10)
        html = decode_safe(res)
        
        # Basic Validation
        if len(html) < 2000 or "로그인" in html:
            # Try a different endpoint or parameter if blocked
            alt_url = f"https://navercomp.wisereport.co.kr/v2/company/c1050001.aspx?cmp_cd={code}&target=fin_info"
            res = session.get(alt_url, timeout=10)
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

        # Step 2: Global Indicators Scraper (8 key metrics)
        table_ids = {
            "cTB11": "주가수익률", "cTB12": "배당수익률", "cTB13": "PER", "cTB14": "PBR",
            "cTB15": "ROE", "cTB16": "부채비율", "cTB17": "매출총이익률", "cTB18": "영업이익률"
        }
        
        charts = {}
        summary_table = []

        all_tables = soup.select("table")
        for table in all_tables:
            tid = table.get("id")
            if tid not in table_ids: continue
            
            title = table_ids[tid]
            
            # Header Extraction (Safe)
            headers = []
            for th in table.select("thead tr th"):
                t = th.get_text(strip=True)
                if t and "항목" not in t:
                    headers.append(t)
            
            if not headers: continue

            # Row Data Extraction (Universal)
            rows_data = []
            for row in table.select("tbody tr"):
                name_el = row.select_one("td.txt") or row.select_one("th") or row.select_one("td:first-child")
                if not name_el: continue
                name = name_el.get_text(strip=True)
                
                vals = row.select("td.num")
                val_dict = {"name": name}
                for i, h in enumerate(headers):
                    if i < len(vals):
                        v_str = vals[i].get_text(strip=True).replace(',', '').replace('%', '')
                        try:
                            if v_str in ('', '-', 'N/A', 'NaN'):
                                val_dict[h] = None
                            else:
                                val_dict[h] = float(v_str)
                        except:
                            val_dict[h] = None
                rows_data.append(val_dict)
            
            # Formulate Chart Data
            chart_data = []
            for h in headers:
                entry = {"period": h}
                for rd in rows_data:
                    entry[rd["name"]] = rd.get(h)
                chart_data.append(entry)
                
            charts[title] = {
                "headers": headers,
                "rows": rows_data,
                "chart_data": chart_data
            }

            # Update Universal Summary
            latest_h = headers[-1]
            for rd in rows_data:
                s_entry = next((s for s in summary_table if s["name"] == rd["name"]), None)
                if not s_entry:
                    s_entry = {"name": rd["name"]}
                    summary_table.append(s_entry)
                s_entry[title] = rd.get(latest_h)

        # Step 3: Emergency Data Injection (If empty)
        if not summary_table or len(summary_table) < 2:
            # If standard scraping failed, try to inject the symbol itself at least
            summary_table.append({"name": symbol, "status": "partial_data"})

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors,
            "charts": charts,
            "summary_table": summary_table,
            "turbo_version": "1.6.5",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        print(f"Turbo Sector Error: {e}")
        return {"status": "error", "message": f"Turbo Engine Recovery Failed: {str(e)}"}
