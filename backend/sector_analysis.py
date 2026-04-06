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
    Combines industry-level metrics (EPS, BPS, PBR, etc.) from cF9001 
    with company-level valuation (PER, ROE) from cF1001.
    """
    logging.info(f"Starting v3.0.0 Hybrid Analysis for {symbol}")
    try:
        # 1. Headers (Strict Browser Simulation)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
            "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
        }

        # 2. Fetch Sector Data (cF9001) - Focus on Industry Metrics
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            sector_url += f"&sec_cd={sector_id}"
            
        s_resp = requests.get(sector_url, headers=headers, timeout=15)
        try:
            ajax_json = s_resp.json()
        except:
            json_str = s_resp.content.decode('cp949', errors='replace')
            ajax_json = json.loads(json_str)

        if not ajax_json: 
            logging.error(f"cF9001 returned empty for {symbol}")
            return None

        # 3. Fetch Core Financials (cF1001) - Restoration of PER/ROE
        # freq_typ=Y (Annual), fin_typ=0 (Consolidated)
        fin_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"
        f_resp = requests.get(fin_url, headers=headers, timeout=15)
        # Naver uses EUC-KR/CP949 for HTML responses sometimes
        try:
            fin_html = f_resp.content.decode('utf-8')
        except:
            fin_html = f_resp.content.decode('cp949', errors='replace')

        # 4. Standardizing Headers across both sources
        indicators_data = ajax_json.get("dt3", {})
        i_headers = indicators_data.get("yymm", []) # e.g. ["2020/12", ...]
        data_items = indicators_data.get("data", [])
        
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # Scan for existing metrics in dt3 (EPS, BPS, PBR, etc.)
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
                
                if m_key: id_to_key[it_id] = m_key

        # Group existing data
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 5. Hybrid Restoration Logic: Extracting PER/ROE from cF1001 HTML
        # Extract headers (Years) from HTML to ensure alignment
        html_years = re.findall(r'<th[^>]*>(\d{4}/\d{2})', fin_html)
        if not html_years: html_years = i_headers if i_headers else ["N/A"]

        for target in ["PER", "ROE"]:
            m_key = target.lower()
            if m_key in metric_groups: continue

            # Search row for PER or ROE
            # Note: NM can be 'PER' or 'ROE' or 'ROE(%)'
            target_regex = rf'{target}.*?</tr>'
            row_match = re.search(target_regex, fin_html, re.S | re.I)
            if row_match:
                # Find all <td> values in this row
                vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row_match.group(), re.S)
                if vals:
                    # Construct dummy object compatible with DT3 format
                    dummy_item = {"GUBN": "1", "NM": target, "ITEM": f"HP_{target}"}
                    # Map values to FY keys (FY_3 to FY4)
                    for i, v in enumerate(vals):
                        val_clean = v.replace(',', '')
                        try:
                            float_val = float(val_clean)
                        except:
                            float_val = None
                        
                        fy_idx = i - 3
                        fy_key = f"FY{fy_idx}" if fy_idx >= 0 else f"FY_{abs(fy_idx)}"
                        dummy_item[fy_key] = float_val
                    
                    metric_groups[m_key] = [dummy_item]
                    logging.info(f"Restored {target} from cF1001 mashup.")

        # 6. Final Data Assembly
        final_headers = i_headers if i_headers else html_years
        for m_key, items in metric_groups.items():
            m_rows = []
            processed_categories = set()
            for item in items:
                gubn = str(item.get("GUBN", "1"))
                if gubn in processed_categories: continue
                processed_categories.add(gubn)
                
                name = category_map.get(gubn, "기타")
                row = {"name": name}
                
                for idx, h in enumerate(final_headers):
                    fy_offset = idx - 3
                    fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                    val = item.get(fy_key)
                    try:
                        row[h] = float(val) if val is not None and val != "" else None
                    except:
                        row[h] = None
                m_rows.append(row)

            if m_rows:
                charts[m_key] = {
                    "headers": final_headers,
                    "rows": m_rows,
                    "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in final_headers if h]
                }
                
                # Add to summary table (using last stable year if available)
                for r in m_rows:
                    s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                    if not s_entry:
                        s_entry = {"name": r["name"]}
                        summary_table.append(s_entry)
                    
                    latest_h = final_headers[-2] if len(final_headers) > 1 else (final_headers[-1] if final_headers else None)
                    if latest_h: s_entry[m_key] = r.get(latest_h)

        # 7. Sector Dropdown (dt2)
        compare_sectors = []
        dt2 = ajax_json.get("dt2", [])
        if dt2 and isinstance(dt2, list):
            for sec in dt2:
                sec_nm = str(sec.get("SEC_NM_K", "")).strip()
                if sec_nm:
                    sec_id = sec.get("SEC_CD", "")
                    compare_sectors.append({"id": sec_id, "name": sec_nm, "selected": str(sec_id) == str(sector_id)})
        
        # Fallback for sector dropdown
        if not compare_sectors:
            dt0_data = ajax_json.get("dt0", {}).get("data", [])
            for item in dt0_data:
                if item.get("GUBN") == "1" and item.get("SEQ") == 2:
                    nm = str(item.get("NM", "")).strip()
                    if nm:
                        compare_sectors.append({"id": sector_id or "UNKNOWN", "name": nm, "selected": True})

        return {
            "symbol": symbol,
            "sector_id": sector_id,
            "compare_sectors": compare_sectors,
            "summary_table": summary_table,
            "charts": charts,
            "raw_headers": final_headers
        }

    except Exception as e:
        logging.error(f"Critical Error in hybrid analysis: {e}", exc_info=True)
        return None
