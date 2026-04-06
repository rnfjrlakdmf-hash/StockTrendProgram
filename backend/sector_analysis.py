import requests
import json
import logging
import re

# [v3.0.0] Core-Sync (Ultimate Mashup)
# This module implements a hybrid data fetching strategy.
# It merges Sector Comparison (cF9001) with Financial Summary (cF1001) 
# to restore missing PER and ROE indicators.

def get_sector_analysis_data(symbol, sector_id=None):
    """
    Ultimate hybrid fetch for comparative analysis.
    Combines industry-level metrics (EPS, BPS, PBR, etc.) with company-level (PER, ROE).
    """
    try:
        # 1. Fetch Sector Data (cF9001)
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            sector_url += f"&sec_cd={sector_id}"
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
            "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
        }

        s_resp = requests.get(sector_url, headers=headers, timeout=10)
        try:
            ajax_json = s_resp.json()
        except:
            try:
                ajax_json = json.loads(s_resp.content.decode('cp949', errors='replace'))
            except:
                ajax_json = json.loads(s_resp.content.decode('utf-8', errors='replace'))

        if not ajax_json: return None

        # 2. Fetch Core Financials (cF1001) as Fallback for PER/ROE
        # freq_typ=Y (Annual), fin_typ=0 (Consolidated)
        fin_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"
        f_resp = requests.get(fin_url, headers=headers, timeout=10)
        fin_html = f_resp.text

        # 3. Process Sector Indicators (dt3)
        indicators_data = ajax_json.get("dt3", {})
        i_headers = indicators_data.get("yymm", [])
        if not i_headers: i_headers = []
        data_items = indicators_data.get("data", [])
        dt0_data = ajax_json.get("dt0", {}).get("data", [])
        
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # Scan for existing metrics in dt3
        for item in data_items:
            if item.get("GUBN") == "1":
                it_id = str(item.get("ITEM"))
                nm = str(item.get("NM", "")).upper()
                m_key = None
                if it_id == "1": m_key = "eps"
                elif it_id == "2": m_key = "bps"
                elif it_id == "3" or "PBR" in nm: m_key = "pbr"
                elif it_id == "6" or "부채" in nm: m_key = "debt_ratio"
                elif it_id == "8" or "배당" in nm: m_key = "div_yield"
                elif it_id == "9": m_key = "current_ratio"
                
                if m_key: id_to_key[it_id] = m_key

        # Group existing data
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 4. Hybrid Sync: Injecting PER/ROE from cF1001 HTML
        # Extract headers (Years) from HTML
        html_years = re.findall(r'<th[^>]*>(\d{4}/\d{2})', fin_html)
        if not html_years:
            # Fallback to sector headers if regex failed
            html_years = i_headers if i_headers else ["N/A"]

        for target in ["PER", "ROE"]:
            m_key = target.lower()
            if m_key in metric_groups: continue

            # Robust searching for PER/ROE row
            # Naver HTML might have tags inside <td> like <span class="txt">
            # Using broader regex to capture values
            row_pattern = rf'{target}.*?</tr>'
            row_match = re.search(row_pattern, fin_html, re.S | re.I)
            if row_match:
                # Find all values including those inside spans or with commas
                vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row_match.group(), re.S)
                if vals:
                    dummy_item = {"GUBN": "1", "NM": target, "ITEM": f"HP_{target}"}
                    for i, v in enumerate(vals):
                        if i < len(html_years):
                            h = html_years[i]
                            val_clean = v.replace(',', '')
                            try:
                                float_val = float(val_clean)
                            except:
                                float_val = None
                            
                            # We map HTML values positions (0-7) to our FY keys
                            # cF1001 usually has 8 columns: 4 past, 4 future.
                            # Column 4 corresponds to FY0 (Current Year)
                            fy_idx = i - 3
                            fy_key = f"FY{fy_idx}" if fy_idx >= 0 else f"FY_{abs(fy_idx)}"
                            dummy_item[fy_key] = float_val
                    
                    metric_groups[m_key] = [dummy_item]

        # 5. Form Final Charts and Summary
        for m_key, items in metric_groups.items():
            m_rows = []
            processed_categories = set()
            for item in items:
                gubn = str(item.get("GUBN", "1"))
                if gubn in processed_categories: continue
                processed_categories.add(gubn)
                
                name = category_map.get(gubn, "기타")
                row = {"name": name}
                
                # Preferred header set
                target_headers = i_headers if i_headers else html_years
                
                for idx, h in enumerate(target_headers):
                    fy_offset = idx - 3
                    fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                    val = item.get(fy_key)
                    try:
                        row[h] = float(val) if val is not None and val != "" else None
                    except:
                        row[h] = None
                m_rows.append(row)

            if m_rows:
                final_headers = i_headers if i_headers else html_years
                charts[m_key] = {
                    "headers": final_headers,
                    "rows": m_rows,
                    "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in final_headers if h]
                }
                
                for r in m_rows:
                    s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                    if not s_entry:
                        s_entry = {"name": r["name"]}
                        summary_table.append(s_entry)
                    
                    latest_h = final_headers[-2] if len(final_headers) > 1 else (final_headers[-1] if final_headers else None)
                    if latest_h: s_entry[m_key] = r.get(latest_h)

        # 6. Sector Dropdown (dt2)
        compare_sectors = []
        dt2 = ajax_json.get("dt2", [])
        if dt2 and isinstance(dt2, list):
            for sec in dt2:
                sec_nm = str(sec.get("SEC_NM_K", "")).strip()
                if sec_nm:
                    sec_id = sec.get("SEC_CD", "")
                    compare_sectors.append({"id": sec_id, "name": sec_nm, "selected": str(sec_id) == str(sector_id)})
        
        if not compare_sectors:
            for item in dt0_data:
                if item.get("GUBN") == "1" and item.get("SEQ") == 2:
                    nm = str(item.get("NM", "")).strip()
                    if nm:
                        compare_sectors.append({"id": sector_id or "DEFAULT", "name": nm, "selected": True})

        return {
            "symbol": symbol,
            "sector_id": sector_id,
            "compare_sectors": compare_sectors,
            "summary_table": summary_table,
            "charts": charts,
            "raw_headers": i_headers if i_headers else html_years
        }

    except Exception as e:
        logging.error(f"Error in get_sector_analysis_data: {e}")
        return None
