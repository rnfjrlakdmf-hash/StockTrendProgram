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
    logging.info(f"Starting v4.8.0 Deep-Sector-Matrix Analysis for {symbol}")
    active_sector_id = str(sector_id) if sector_id else ""
    
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

        # 2. Fetch Sector AJAX (cF9001.aspx) - Base for comparisons
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id: sector_url += f"&sec_cd={sector_id}"
            
        s_resp = requests.get(sector_url, headers=headers, timeout=10)
        ajax_json = {}
        try:
            json_str = s_resp.content.decode('cp949', errors='replace')
            ajax_json = json.loads(json_str)
        except:
            try: ajax_json = s_resp.json()
            except: pass

        # 3. Timeline Setup
        i_headers = [h for h in ajax_json.get("dt3", {}).get("yymm", []) if h]
        if not i_headers: i_headers = fallback_headers
        
        data_items = ajax_json.get("dt3", {}).get("data", [])
        category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}
        
        charts = {}
        summary_table = []
        metric_groups = {}

        # 4. Metric Mapping (Exact Naver Indicator Mapping - v4.8.0 Updated)
        # ID 1:PER, 2:PBR, 3:Revenue Growth, 4:ROE, 5:Gross Margin, 6:Debt Ratio, 8:Div Yield, 9:ROA (sometimes)
        for item in data_items:
            it_id = str(item.get("ITEM"))
            nm = str(item.get("NM", ""))
            m_key = None
            if it_id == "1": m_key = "per"
            elif it_id == "2": m_key = "pbr"
            elif it_id == "3": m_key = "growth" # 매출액증가율
            elif it_id == "4": m_key = "roe"
            elif it_id == "5": m_key = "margin" # 매출총이익률
            elif it_id == "6": m_key = "debt_ratio"
            elif it_id == "8": m_key = "div_yield"
            
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                gubn = str(item.get("GUBN"))
                if not any(str(x.get("GUBN")) == gubn for x in metric_groups[m_key]):
                    metric_groups[m_key].append(item)

        # 5. SSR-Independent Restoration for PER/ROE (Safe fallback)
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
            # Normalize Returns Chart (dt0) to Master i_headers
            rtn_rows = []
            processed_rtn = set()
            sorted_rtn = sorted(rtn_items, key=lambda x: str(x.get("GUBN")))
            for item in sorted_rtn:
                gubn = str(item.get("GUBN"))
                if gubn not in ["1", "2", "3"] or gubn in processed_rtn: continue
                processed_rtn.add(gubn)
                nm = category_map.get(gubn, "ETC")
                row = {"name": nm}
                # Sync with master i_headers
                for idx, h in enumerate(i_headers):
                    # FY_4=2020, FY_3=2021, FY_2=2022, FY_1=2023, FY0=2024, FY1=2025
                    # idx=0 (2021) should be FY_3
                    off = idx - 3
                    key = f"FY{off}" if off >= 0 else f"FY_{abs(off)}"
                    row[h] = item.get(key)
                rtn_rows.append(row)
            
            c_data = []
            for h in i_headers:
                ent = {"period": h}
                for r in rtn_rows: ent[r["name"]] = r.get(h) or 0.0
                c_data.append(ent)
            charts["주가수익률"] = {"headers": i_headers, "rows": rtn_rows, "chart_data": c_data}

        # 7. Integration & Summary Table (Core 8)
        titles = {
            "per": "PER", "pbr": "PBR", "roe": "ROE", 
            "div_yield": "배당수익률", "debt_ratio": "부채비율", 
            "margin": "매출총이익률", "growth": "매출액증가율"
        }
        for m_key, items in metric_groups.items():
            m_rows = []
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
                charts[titles.get(m_key, m_key)] = {"headers": i_headers, "rows": m_rows, "chart_data": c_data}
                
                for r in m_rows:
                    s_r = next((x for x in summary_table if x["name"] == r["name"]), None)
                    if not s_r:
                        s_r = {"name": r["name"]}
                        summary_table.append(s_r)
                    if len(i_headers) >= 4:
                        fy0_h = i_headers[3]
                        s_r[m_key] = r.get(fy0_h)

        # 8. Extra Detailed Metrics (v4.8.0 - c1090001.aspx proc API)
        extra_procs = {
            "15": "배당성향",
            "18": "Fwd. 12M PER 추이",
            "20": "Fwd. 12M PBR 추이",
            "10": "ROA",
            "14": "유동비율",
            "4": "영업이익증가율",
            "5": "순이익증가율",
            "12": "영업이익률",
            "13": "순이익률"
        }
        
        for proc_id, label in extra_procs.items():
            try:
                e_url = f"https://navercomp.wisereport.co.kr/company/chart/c1090001.aspx?proc={proc_id}&cmp_cd={symbol}&data_typ=1&chartType=svg"
                if active_sector_id: e_url += f"&sec_cd={active_sector_id}"
                e_resp = requests.get(e_url, headers=headers, timeout=5)
                e_json = e_resp.json()
                
                e_headers = i_headers # Universal Timeline Sync
                e_items = e_json.get("data", [])
                if not e_items: continue
                
                e_rows = []
                for item in e_items:
                    gubn = str(item.get("GUBN"))
                    if gubn not in ["1", "2", "3"]: continue
                    nm = category_map.get(gubn, "Other")
                    row = {"name": nm}
                    # Precise Multi-Year Alignment logic
                    for idx, h in enumerate(e_headers):
                        # Naver Details API logic:
                        # 2021 (idx=0) -> FY_3
                        # 2022 (idx=1) -> FY_2
                        # 2023 (idx=2) -> FY_1
                        # 2024 (idx=3) -> FY0
                        # 2025 (idx=4) -> FY1
                        # 2026(E) (idx=5) -> FY2 (often null)
                        off = idx - 3
                        key = f"FY{off}" if off >= 0 else f"FY_{abs(off)}"
                        row[h] = item.get(key)
                    e_rows.append(row)
                
                if e_rows:
                    c_data = []
                    for h in e_headers:
                        ent = {"period": h}
                        for r in e_rows: ent[r["name"]] = r.get(h) or 0.0
                        c_data.append(ent)
                    charts[label] = {"headers": e_headers, "rows": e_rows, "chart_data": c_data}
            except Exception as e:
                logging.error(f"Error fetching extra metric {label}: {e}")

        # 9. Dropdown Synchronization (Unchanged Logic)
        compare_sectors = []
        try:
            page_url = f"https://navercomp.wisereport.co.kr/v2/company/c1090001.aspx?cmp_cd={symbol}"
            p_resp = requests.get(page_url, headers=headers, timeout=5)
            try: p_html = p_resp.content.decode('cp949')
            except: p_html = p_resp.content.decode('utf-8', errors='replace')
            
            select_match = re.search(r'<select[^>]*id=["\']sector["\'][^>]*>(.*?)</select>', p_html, re.S)
            if select_match:
                opts = re.findall(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*>(.*?)</option>', select_match.group(1), re.S)
                for opt_id, opt_nm in opts:
                    if not opt_id: continue
                    compare_sectors.append({
                        "id": opt_id,
                        "name": opt_nm.strip(),
                        "selected": opt_id == active_sector_id
                    })
                
                if not active_sector_id:
                    sel_match = re.search(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*selected[^>]*>', select_match.group(1), re.S)
                    if sel_match: active_sector_id = sel_match.group(1)
                    elif compare_sectors: active_sector_id = compare_sectors[0]["id"]
            
        except Exception as e:
            logging.error(f"Sector Dropdown Error: {e}")

        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "summary_table": summary_table,
                "charts": charts,
                "compare_sectors": compare_sectors,
                "active_sector_id": active_sector_id,
                "version": "v4.8.0 (Deep-Sector-Matrix)"
            }
        }

    except Exception as e:
        logging.error(f"Error in v4.8.0 Mirror Sync: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
