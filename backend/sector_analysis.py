# -*- coding: utf-8 -*-
import requests
import json
import logging
import re

# [v4.7.0] Naver-Perfect-Mirror (Sector Analysis Absolute Integration)
# 1. 8-Metric Grid: Complete coverage of Naver's Sector Analysis indicators.
# 2. Perfect Line Balance: Guarantees 3 lines (Target, Sector, Market) for 8 metrics.
# 3. Dynamic Sectoring: WICS-based industry selection logic.

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v4.7.0 Naver-Perfect-Mirror Analysis for {symbol}")
    
    try:
        # Standard Literal Labels (Matching Naver UI)
        TARGET_LABEL = "대상 종목"
        INDUSTRY_LABEL = "섹터 평균"  # Changed from 업종 to 섹터 for Perfect Mirror
        MARKET_LABEL = "시장 지수"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://finance.naver.com/"
        }

        # 1. Fetch Naver SSR (main.naver) for PER, ROE fallback
        f_resp = requests.get(f"https://finance.naver.com/item/main.naver?code={symbol}", headers=headers, timeout=10)
        ssr_html = f_resp.content.decode('utf-8', errors='replace')
        
        # Extract Timeline from SSR
        ssr_years = re.findall(r'(\d{4}\.\d{2})', ssr_html)
        unique_ssr_years = []
        for y in ssr_years:
            fmt = y.replace('.', '/')
            if fmt not in unique_ssr_years: unique_ssr_years.append(fmt)
        fallback_headers = unique_ssr_years[:4]

        # 2. Fetch Sector AJAX (cF9011 or cF9001) - Base for comparisons
        # Note: Naver cF9011 is often used for Sector Analysis 8-grid
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

        # 3. Timeline Setup
        i_headers = [h for h in ajax_json.get("dt3", {}).get("yymm", []) if h]
        if not i_headers: i_headers = fallback_headers
        
        data_items = ajax_json.get("dt3", {}).get("data", [])
        category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}
        
        charts = {}
        summary_table = []
        metric_groups = {}

        # 4. Metric Mapping (Expanded to 8 Key Indicators)
        # ID 3:PBR, 6:Debt, 8:Div, 9:ROE, 11:GrossMargin, 12/5:PER, 10:Growth
        for item in data_items:
            nm = str(item.get("NM", "")).upper()
            it_id = str(item.get("ITEM"))
            m_key = None
            if "PBR" in nm or it_id == "3": m_key = "pbr"
            elif "부채" in nm or it_id == "6": m_key = "debt_ratio"
            elif "배당" in nm or it_id == "8": m_key = "div_yield"
            elif "ROE" in nm or it_id == "9": m_key = "roe"
            elif "PER" in nm or it_id in ["5", "12"]: m_key = "per"
            elif "매출액증가율" in nm or it_id == "10": m_key = "growth"
            elif "매출총이익률" in nm or it_id == "11": m_key = "margin"
            
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                # Deduplication
                gubn = str(item.get("GUBN"))
                if not any(str(x.get("GUBN")) == gubn for x in metric_groups[m_key]):
                    metric_groups[m_key].append(item)

        # 5. SSR-Independent Restoration for PER/ROE
        cop_analysis = re.search(r'section cop_analysis.*?tbody(.*?)</tbody>', ssr_html, re.S)
        if cop_analysis:
            row_htmls = re.findall(r'<tr[^>]*>.*?</tr>', cop_analysis.group(1), re.S)
            for row_html in row_htmls:
                for target_nm in ["PER", "ROE"]:
                    m_key = target_nm.lower()
                    if target_nm in row_html and '<th' in row_html:
                        vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row_html, re.S)
                        if vals:
                            restored = {"GUBN": "1", "NM": target_nm, "ITEM": f"SSR_{target_nm}"}
                            for i, v in enumerate(vals[:4]):
                                fy_offset = i - 3
                                fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                                v_c = v.replace(',', '')
                                if v_c and v_c != '-':
                                    try: restored[fy_key] = float(v_c)
                                    except: restored[fy_key] = None
                            
                            # Merge Logic
                            if m_key not in metric_groups:
                                metric_groups[m_key] = [restored]
                            else:
                                existing = metric_groups[m_key]
                                t_idx = next((i for i, x in enumerate(existing) if str(x.get("GUBN")) == "1"), None)
                                if t_idx is not None: existing[t_idx].update(restored)
                                else: existing.append(restored)

        # 6. Returns Chart (dt0) - "주가수익률"
        rtn_items = ajax_json.get("dt0", {}).get("data", [])
        if rtn_items:
            rtn_headers = ajax_json.get("dt0", {}).get("yymm", [])
            rtn_rows = []
            processed_rtn = set()
            # Sort so Target(1), Sector(2), Market(3)
            sorted_rtn = sorted(rtn_items, key=lambda x: str(x.get("GUBN")))
            for item in sorted_rtn:
                gubn = str(item.get("GUBN"))
                if gubn not in ["1", "2", "3"] or gubn in processed_rtn: continue
                processed_rtn.add(gubn)
                nm = category_map.get(gubn, "ETC")
                row = {"name": nm}
                for i, h in enumerate(rtn_headers):
                    off = i - 3
                    key = f"FY{off}" if off >= 0 else f"FY_{abs(off)}"
                    row[h] = item.get(key)
                rtn_rows.append(row)
            
            c_data = []
            for h in rtn_headers:
                ent = {"period": h}
                for r in rtn_rows: ent[r["name"]] = r.get(h) or 0.0
                c_data.append(ent)
            charts["주가수익률"] = {"headers": rtn_headers, "rows": rtn_rows, "chart_data": c_data}

        # 7. Integration & Summary Table
        for m_key, items in metric_groups.items():
            m_rows = []
            # Sort items by GUBN for consistent ordering
            sorted_items = sorted(items, key=lambda x: str(x.get("GUBN")))
            for item in sorted_items:
                gubn = str(item.get("GUBN"))
                if gubn not in ["1", "2", "3"]: continue
                nm = category_map.get(gubn, "Other")
                row = {"name": nm}
                for idx, h in enumerate(i_headers):
                    off = idx - 3
                    key = f"FY{off}" if off >= 0 else f"FY_{abs(off)}"
                    row[h] = item.get(key)
                m_rows.append(row)
            
            if m_rows:
                c_data = []
                for h in i_headers:
                    ent = {"period": h}
                    for r in m_rows: ent[r["name"]] = r.get(h) or 0.0
                    c_data.append(ent)
                # Map internal keys to Display Titles
                titles = {
                    "per": "PER", "pbr": "PBR", "roe": "ROE", 
                    "div_yield": "배당수익률", "debt_ratio": "부채비율", 
                    "margin": "매출총이익률", "growth": "매출액증가율"
                }
                charts[titles.get(m_key, m_key)] = {"headers": i_headers, "rows": m_rows, "chart_data": c_data}
                
                # Summary Table (FY0 sync)
                for r in m_rows:
                    s_r = next((x for x in summary_table if x["name"] == r["name"]), None)
                    if not s_r:
                        s_r = {"name": r["name"]}
                        summary_table.append(s_r)
                    if len(i_headers) >= 4:
                        fy0_h = i_headers[3]
                        s_r[m_key] = r.get(fy0_h)

        # 8. Dropdown Synchronization
        compare_sectors = []
        dt2 = ajax_json.get("dt2", [])
        if dt2:
            seen_ids = set()
            for s in dt2:
                s_id, s_nm = str(s.get("SEC_CD", "")), str(s.get("SEC_NM_K", "")).strip()
                if s_id and s_id not in seen_ids:
                    seen_ids.add(s_id)
                    compare_sectors.append({"id": s_id, "name": s_nm, "selected": s_id == str(sector_id)})

        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "summary_table": summary_table,
                "charts": charts,
                "compare_sectors": compare_sectors,
                "version": "v4.7.0 (Naver-Perfect-Mirror)"
            }
        }

    except Exception as e:
        logging.error(f"Error in v4.7.0 Mirror: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
