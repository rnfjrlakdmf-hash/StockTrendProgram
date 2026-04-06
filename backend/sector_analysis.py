# -*- coding: utf-8 -*-
import requests
import json
import logging
import re

# [v4.6.9] Victory-Unified-Final (Absolute Reliability)
# 1. Mega-Merger: Preserves Industry/Market lines while restoring Target metrics.
# 2. Dropdown Fix: Robust sector list extraction from AJAX dt2/dt3.
# 3. Encoding Guard: Pure UTF-8 handling for summary tables.

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v4.6.9 Victory-Unified Analysis for {symbol}")
    
    try:
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

        # 2. Extract Years from SSR (Fallback)
        ssr_years = re.findall(r'(\d{4}\.\d{2})', ssr_html)
        unique_ssr_years = []
        for y in ssr_years:
            fmt = y.replace('.', '/')
            if fmt not in unique_ssr_years: unique_ssr_years.append(fmt)
        fallback_headers = unique_ssr_years[:4]

        # 3. Fetch Sector AJAX (cF9001) - Baseline Metrics
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

        # 4. Timeline Setup
        i_headers = [h for h in ajax_json.get("dt3", {}).get("yymm", []) if h]
        if not i_headers: i_headers = fallback_headers
        
        data_items = ajax_json.get("dt3", {}).get("data", [])
        category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}
        
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # 4.1 Define Metric Mapping
        for item in data_items:
            # We map metrics primarily based on NM to be robust
            nm = str(item.get("NM", "")).upper()
            it_id = str(item.get("ITEM"))
            m_key = None
            if "EPS" in nm or it_id == "1": m_key = "eps"
            elif "BPS" in nm or it_id == "2": m_key = "bps"
            elif "PBR" in nm or it_id == "3": m_key = "pbr"
            elif "부채" in nm or it_id == "6": m_key = "debt_ratio"
            elif "배당" in nm or it_id == "8": m_key = "div_yield"
            elif "ROE" in nm or it_id == "9": m_key = "roe"
            elif "영업이익" in nm or it_id == "11": m_key = "operating_margin"
            
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                # Check for duplicates within GUBN
                gubn = str(item.get("GUBN"))
                if not any(str(x.get("GUBN")) == gubn for x in metric_groups[m_key]):
                    metric_groups[m_key].append(item)

        # 5. SSR-Independent Restoration for PER/ROE (High-Precision Merge)
        cop_analysis = re.search(r'section cop_analysis.*?tbody(.*?)</tbody>', ssr_html, re.S)
        if cop_analysis:
            rows = re.findall(r'<tr[^>]*>.*?</tr>', cop_analysis.group(1), re.S)
            for row in rows:
                for target in ["PER", "ROE"]:
                    m_key = target.lower()
                    if target in row and '<th' in row:
                        vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row, re.S)
                        if vals:
                            restored = {"GUBN": "1", "NM": target, "ITEM": f"SSR_{target}"}
                            for i, v in enumerate(vals[:4]):
                                fy_offset = i - 3
                                fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                                v_c = v.replace(',', '')
                                if v_c and v_c != '-':
                                    try: restored[fy_key] = float(v_c)
                                    except: restored[fy_key] = None
                            
                            # Mega-Merger: Update ONLY target, keep Industry/Market
                            if m_key not in metric_groups:
                                metric_groups[m_key] = [restored]
                            else:
                                existing = metric_groups[m_key]
                                target_idx = next((i for i, x in enumerate(existing) if str(x.get("GUBN")) == "1"), None)
                                if target_idx is not None:
                                    existing[target_idx].update(restored)
                                else:
                                    existing.append(restored)

        # 6. Final Integration & Returns Chart
        # 6.1 Process Returns Chart (dt0)
        rtn_items = ajax_json.get("dt0", {}).get("data", [])
        if rtn_items:
            rtn_headers = ajax_json.get("dt0", {}).get("yymm", [])
            rtn_rows = []
            processed_rtn = set()
            for item in rtn_items:
                gubn = str(item.get("GUBN"))
                if gubn in processed_rtn: continue
                processed_rtn.add(gubn)
                nm = category_map.get(gubn, item.get("NM", "ETC"))
                row = {"name": nm}
                for i, h in enumerate(rtn_headers):
                    fy_o = i - 3
                    fy_k = f"FY{fy_o}" if fy_o >= 0 else f"FY_{abs(fy_o)}"
                    row[h] = item.get(fy_k)
                rtn_rows.append(row)
            
            c_data = []
            for h in rtn_headers:
                ent = {"period": h}
                for r in rtn_rows: ent[r["name"]] = r.get(h) or 0.0
                c_data.append(ent)
            charts["주가수익률"] = {"headers": rtn_headers, "rows": rtn_rows, "chart_data": c_data}

        # 6.2 Process Other Metrics
        for m_key, items in metric_groups.items():
            m_rows = []
            for item in items:
                gubn = str(item.get("GUBN"))
                name = category_map.get(gubn, "Other")
                row = {"name": name}
                for idx, h in enumerate(i_headers):
                    fy_o = idx - 3
                    fy_k = f"FY{fy_o}" if fy_o >= 0 else f"FY_{abs(fy_o)}"
                    row[h] = item.get(fy_k)
                m_rows.append(row)
            
            if m_rows:
                c_data = []
                for h in i_headers:
                    ent = {"period": h}
                    for r in m_rows: ent[r["name"]] = r.get(h) or 0.0
                    c_data.append(ent)
                charts[m_key] = {"headers": i_headers, "rows": m_rows, "chart_data": c_data}
                
                # Update Summary Table with latest value (FY0)
                for r in m_rows:
                    s_r = next((x for x in summary_table if x["name"] == r["name"]), None)
                    if not s_r:
                        s_r = {"name": r["name"]}
                        summary_table.append(s_r)
                    if len(i_headers) >= 4:
                        s_r[m_key] = r.get(i_headers[len(i_headers)-3]) # FY0 logic

        # 7. Enhanced Dropdown (Industry Selection)
        compare_sectors = []
        seen_ids = set()
        dt2 = ajax_json.get("dt2", [])
        if dt2:
            for s in dt2:
                s_id, s_nm = str(s.get("SEC_CD", "")), str(s.get("SEC_NM_K", "")).strip()
                if s_id and s_id not in seen_ids:
                    seen_ids.add(s_id)
                    compare_sectors.append({"id": s_id, "name": s_nm, "selected": s_id == str(sector_id)})
        
        # Fallback for sectors if dt2 empty (from dt3 GUBN rows)
        if not compare_sectors:
            for item in data_items:
                if str(item.get("GUBN")) == "2":
                    s_nm = str(item.get("NM")).strip()
                    if s_nm and s_nm not in seen_ids:
                        seen_ids.add(s_nm)
                        compare_sectors.append({"id": "", "name": s_nm, "selected": False})

        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "summary_table": summary_table,
                "charts": charts,
                "compare_sectors": compare_sectors,
                "version": "v4.6.9 (Victory-Unified-Final)"
            }
        }

    except Exception as e:
        logging.error(f"Error in v4.6.9 Analysis: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
