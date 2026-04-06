# -*- coding: utf-8 -*-
import requests
import json
import logging
import re

# [v4.6.0] Victory-Gold (The Final Unification)
# 1. Literal Korean Labels: Ensures perfect matching between Backend and Frontend.
# 2. SSR Independent Extraction: Restores PER/ROE even when AJAX is blocked.
# 3. Definite Mapping: FY0 fixed for Summary Table (Stock Trend Perfection).

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v4.6.0 Victory-Gold Analysis for {symbol}")
    
    try:
        # Standard Literal Labels (No Unicode Escapes for absolute clarity)
        TARGET_LABEL = "대상 종목"
        INDUSTRY_LABEL = "업종 평균"
        MARKET_LABEL = "시장 지수"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://finance.naver.com/"
        }

        # 1. Fetch Naver SSR (main.naver) - Financial Summary (PER, ROE)
        f_resp = requests.get(f"https://finance.naver.com/item/main.naver?code={symbol}", headers=headers, timeout=10)
        ssr_html = f_resp.content.decode('utf-8', errors='replace')

        # 2. Extract Years from SSR (Defensive Fallback)
        ssr_years = re.findall(r'(\d{4}\.\d{2})', ssr_html)
        unique_ssr_years = []
        for y in ssr_years:
            fmt = y.replace('.', '/')
            if fmt not in unique_ssr_years: unique_ssr_years.append(fmt)
        fallback_headers = unique_ssr_years[:4] # Typically 4 historical years

        # 3. Fetch Sector AJAX (cF9001) - Baseline Metrics (EPS, BPS, PBR)
        # Even if this returns 0 bytes, our SSR-independent restoration will save PER/ROE.
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id: sector_url += f"&sec_cd={sector_id}"
            
        s_resp = requests.get(sector_url, headers=headers, timeout=10)
        ajax_json = {}
        try:
            ajax_json = s_resp.json()
        except:
            try:
                json_str = s_resp.content.decode('cp949', errors='replace')
                ajax_json = json.loads(json_str)
            except: pass

        # 4. Timeline Setup (Prioritize Wisereport if alive)
        i_headers = [h for h in ajax_json.get("dt3", {}).get("yymm", []) if h]
        if not i_headers: i_headers = fallback_headers # FALLBACK
        
        data_items = ajax_json.get("dt3", {}).get("data", [])
        category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}
        
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # Scan for existing metrics from AJAX
        for item in data_items:
            if str(item.get("GUBN")) == "1":
                it_id, nm = str(item.get("ITEM")), str(item.get("NM", "")).upper()
                m_key = None
                if it_id == "1" or "EPS" in nm: m_key = "eps"
                elif it_id == "2" or "BPS" in nm: m_key = "bps"
                elif it_id == "3" or "PBR" in nm: m_key = "pbr"
                elif it_id == "6" or "부채" in nm: m_key = "debt_ratio"
                elif it_id == "8" or "배당" in nm: m_key = "div_yield"
                if m_key: id_to_key[it_id] = m_key

        # Group data from AJAX
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 5. SSR-Independent Restoration for PER/ROE
        # Look for the 'section cop_analysis' area
        cop_analysis = re.search(r'section cop_analysis.*?tbody(.*?)</tbody>', ssr_html, re.S)
        if cop_analysis:
            rows = re.findall(r'<tr[^>]*>.*?</tr>', cop_analysis.group(1), re.S)
            for row in rows:
                for target in ["PER", "ROE"]:
                    m_key = target.lower()
                    # Only restore if AJAX failed to provide it
                    if m_key in metric_groups: continue
                    if target in row and '<th' in row:
                        vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row, re.S)
                        if vals:
                            # Standardizing restored item
                            restored = {"GUBN": "1", "NM": target, "ITEM": f"SSR_{target}"}
                            # Map columns to relative fiscal years
                            for i, v in enumerate(vals[:4]):
                                fy_offset = i - 3
                                fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                                v_c = v.replace(',', '')
                                if v_c and v_c != '-':
                                    try: restored[fy_key] = float(v_c)
                                    except: restored[fy_key] = None
                            
                            metric_groups[m_key] = [restored]
                            logging.info(f"Target {target} Restored Independent of AJAX.")

        # 6. Final Assembly & Synchronization
        for m_key, items in metric_groups.items():
            m_rows = []
            processed_categories = set()
            for item in items:
                gubn = str(item.get("GUBN", "1"))
                if gubn in processed_categories: continue
                processed_categories.add(gubn)
                
                name = category_map.get(gubn, "기타")
                row_d = {"name": name}
                for idx, h in enumerate(i_headers):
                    fy_o = idx - 3
                    fy_k = f"FY{fy_o}" if fy_o >= 0 else f"FY_{abs(fy_o)}"
                    row_d[h] = item.get(fy_k)
                m_rows.append(row_d)

            if m_rows:
                chart_data = []
                for h in i_headers:
                    entry = {"period": h}
                    for r in m_rows:
                        entry[r["name"]] = r.get(h) if r.get(h) is not None else 0.0
                    chart_data.append(entry)
                
                charts[m_key] = {"headers": i_headers, "rows": m_rows, "chart_data": chart_data}
                
                # Update Summary Table (Always matching TARGET_LABEL)
                for r in m_rows:
                    t_name = r["name"]
                    if t_name in [TARGET_LABEL, INDUSTRY_LABEL, MARKET_LABEL]:
                        s_e = next((s for s in summary_table if s["name"] == t_name), None)
                        if not s_e:
                            s_e = {"name": t_name}
                            summary_table.append(s_e)
                        
                        # Fix FY0 position (index 3 if 4 years set)
                        if len(i_headers) >= 4:
                            fy0_h = i_headers[3]
                            s_e[m_key] = r.get(fy0_h)

        # 7. Sector Dropdown
        compare_sectors = []
        dt2 = ajax_json.get("dt2", [])
        if dt2 and isinstance(dt2, list):
            for sec in dt2:
                sec_nm = str(sec.get("SEC_NM_K", "")).strip()
                if sec_nm:
                    compare_sectors.append({
                        "id": str(sec.get("SEC_CD", "")),
                        "name": sec_nm,
                        "selected": str(sec.get("SEC_CD", "")) == str(sector_id)
                    })
        
        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "sector_id": sector_id,
                "compare_sectors": compare_sectors,
                "summary_table": summary_table,
                "charts": charts,
                "raw_headers": i_headers,
                "version": "v4.6.5 (Victory-Unified)"
            }
        }

    except Exception as e:
        logging.error(f"Critical Error in Victory-Unified: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
