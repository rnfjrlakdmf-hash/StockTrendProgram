import requests
import json
import logging
import re

# [v3.2.1] Ultimate SSR-Mashup (Final)
# Combines Wisereport AJAX for industry data and Naver SSR for target company financials.
# Solves the "AJAX 0-byte" and "Naver Security" issues.

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v3.2.1 Ultimate SSR-Mashup for {symbol}")
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://finance.naver.com/"
        }

        # 1. Fetch Sector AJAX (cF9001) - Industry/Market Baseline
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            sector_url += f"&sec_cd={sector_id}"
            
        s_resp = requests.get(sector_url, headers=headers, timeout=10)
        try:
            ajax_json = s_resp.json()
        except:
            json_str = s_resp.content.decode('cp949', errors='replace')
            ajax_json = json.loads(json_str)

        if not ajax_json: return None

        # 2. Fetch Naver SSR (main.naver) - Target Company Financials (PER, ROE, etc.)
        ssr_url = f"https://finance.naver.com/item/main.naver?code={symbol}"
        f_resp = requests.get(ssr_url, headers=headers, timeout=10)
        # Naver SSR uses UTF-8 now, but EUC-KR fallback just in case
        try:
            ssr_html = f_resp.content.decode('utf-8')
        except:
            ssr_html = f_resp.content.decode('cp949', errors='replace')

        # 3. Headers & Data Items Setup
        indicators_data = ajax_json.get("dt3", {})
        i_headers = indicators_data.get("yymm", [])
        data_items = indicators_data.get("data", [])
        
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # Scan for existing metrics in AJAX
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

        # Group data
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 4. Critical Restoration: Extracting from SSR Table
        # The table of interest is usually "section_cop_analysis" (기업실적분석)
        # Extract Years from the table header first
        # Format: <th[^>]*><span>2023.12</span></th>
        table_years = re.findall(r'(\d{4}\.\d{2})', ssr_html)
        # Filter for the summary table years (typically 10-15 occurrences)
        unique_years = []
        for y in table_years:
            if y not in unique_years: unique_years.append(y.replace('.', '/'))
        
        # Mapping Logic
        for target in ["PER", "ROE"]:
            m_key = target.lower()
            if m_key in metric_groups: continue

            # Final Regex: Search for the label and extract all following numeric values in that row
            # Naver's table structure is rows like <tr><th scope="row">...PER...</th><td>...</td>...</tr>
            row_pattern = rf'<th[^>]*>.*?{target}.*?</th>(.*?)(?:</tr>|<th)'
            row_match = re.search(row_pattern, ssr_html, re.S | re.I)
            if row_match:
                vals = re.findall(r'<td[^>]*>[\s\n\t]*([\d,\.-]+)[\s\n\t]*</td>', row_match.group(), re.S)
                # Cleanup and convert to numeric
                clean_vals = [v.replace(',', '') for v in vals if v.strip()]
                if clean_vals:
                    dummy_item = {"GUBN": "1", "NM": target, "ITEM": f"RESTORED_{target}"}
                    # Map to FY keys (FY_3 to FY4)
                    # Naver SSR Summary Table typically: FY_3, FY_2, FY_1, FY0, FY1(E), FY2(E), FY3(E)
                    for i, v in enumerate(clean_vals):
                        fy_idx = i - 3
                        fy_key = f"FY{fy_idx}" if fy_idx >= 0 else f"FY_{abs(fy_idx)}"
                        try:
                            dummy_item[fy_key] = float(v)
                        except:
                            dummy_item[fy_key] = None
                    
                    metric_groups[m_key] = [dummy_item]
                    logging.info(f"Restored {target} from SSR Mashup.")

        # 5. Assembly
        final_headers = i_headers if i_headers else unique_years[:4] # Historical 4 years
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
                    row[h] = val
                m_rows.append(row)

            if m_rows:
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
                    
                    # FY0 mapping (typically index 3 in a 4-year historical set)
                    fy0_h = final_headers[3] if len(final_headers) > 3 else (final_headers[-1] if final_headers else None)
                    if fy0_h: s_entry[m_key] = r.get(fy0_h)

        # 6. Sector Mapping (dt2)
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
            "symbol": symbol,
            "sector_id": sector_id,
            "compare_sectors": compare_sectors,
            "summary_table": summary_table,
            "charts": charts,
            "raw_headers": final_headers
        }

    except Exception as e:
        logging.error(f"Critical Error in SSR-Mashup: {e}", exc_info=True)
        return None
