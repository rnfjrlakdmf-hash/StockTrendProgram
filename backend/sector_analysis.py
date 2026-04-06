import requests
import json
import logging
import re

# [v4.0.0] Ironclad-Sync (Ultimate Perfection)
# Fixes Mojibake using Unicode escapes and ensures precise data mapping 
# by using a row-by-row HTML table parser. 

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v4.0.0 Ironclad-Sync Analysis for {symbol}")
    
    try:
        # 1. Unicode Escapes (Ensures consistency across all server environments)
        # "\ub300\uc0c1 \uc885\ubaa9" == "대상 종목"
        # "\uc5c5\uc915 \ud3c9\uade0" == "업종 평균"
        # "\uc2dc\uc7a5 \uc9c0\uc218" == "시장 지수"
        TARGET_LABEL = "\ub300\uc0c1 \uc885\ubaa9"
        INDUSTRY_LABEL = "\uc5c5\uc915 \ud3c9\uade0"
        MARKET_LABEL = "\uc2dc\uc7a5 \uc9c0\uc218"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://finance.naver.com/"
        }

        # 2. Fetch Sector AJAX (cF9001) - Industry/Market Baseline
        sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            sector_url += f"&sec_cd={sector_id}"
            
        s_resp = requests.get(sector_url, headers=headers, timeout=10)
        try:
            ajax_json = s_resp.json()
        except:
            json_str = s_resp.content.decode('cp949', errors='replace')
            ajax_json = json.loads(json_str)

        if not ajax_json: 
            logging.error(f"cF9001 returned empty for {symbol}")
            return None

        # 3. Fetch Naver SSR (main.naver) - Financial Summary (PER, ROE)
        ssr_url = f"https://finance.naver.com/item/main.naver?code={symbol}"
        f_resp = requests.get(ssr_url, headers=headers, timeout=10)
        # Force UTF-8 encoding for Naver SSR
        ssr_html = f_resp.content.decode('utf-8', errors='replace')

        # 4. Indicators & Key Mapping
        indicators_data = ajax_json.get("dt3", {})
        # Typically: ['2021/12', '2022/12', '2023/12', '2024/12']
        i_headers = indicators_data.get("yymm", [])
        data_items = indicators_data.get("data", [])
        
        category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}
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
                
                if m_key: id_to_key[it_id] = m_key

        # Group data
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 5. Ironclad Row-by-Row Parser for PER/ROE
        # Extract the specific Financial Summary table section
        # Look for the 'section cop_analysis' area
        cop_analysis = re.search(r'section cop_analysis.*?tbody(.*?)</tbody>', ssr_html, re.S)
        if cop_analysis:
            rows = re.findall(r'<tr[^>]*>.*?</tr>', cop_analysis.group(1), re.S)
            for row in rows:
                # Check for label in <th>
                for target in ["PER", "ROE"]:
                    m_key = target.lower()
                    if m_key in metric_groups: continue
                    
                    if target in row and '<th' in row:
                        # Ensure it's the exact label row
                        # Naver labels: PER(배), ROE(%)
                        vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row, re.S)
                        if vals:
                            dummy_item = {"GUBN": "1", "NM": target, "ITEM": f"IRONCLAD_{target}"}
                            # Map the first 4 columns to i_headers (Historical 4-year set)
                            for i, v in enumerate(vals[:4]):
                                if i < len(i_headers):
                                    fy_offset = i - 3
                                    fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                                    try:
                                        dummy_item[fy_key] = float(v.replace(',', ''))
                                    except:
                                        dummy_item[fy_key] = None
                            
                            metric_groups[m_key] = [dummy_item]
                            logging.info(f"Ironclad Restored {target}: {vals[:2]}...")

        # 6. Assembly & Multi-Year Sync
        for m_key, items in metric_groups.items():
            m_rows = []
            processed_categories = set()
            for item in items:
                gubn = str(item.get("GUBN", "1"))
                if gubn in processed_categories: continue
                processed_categories.add(gubn)
                
                name = category_map.get(gubn, "기타")
                row = {"name": name}
                
                # Dynamic FY mapping based on Wisereport Headers
                for idx, h in enumerate(i_headers):
                    fy_offset = idx - 3
                    fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                    val = item.get(fy_key)
                    row[h] = val
                m_rows.append(row)

            if m_rows:
                # Recharts expects numeric zero if value is missing for rendering stability
                chart_data = []
                for h in i_headers:
                    if not h: continue
                    entry = {"period": h}
                    for r in m_rows:
                        entry[r["name"]] = r.get(h) if r.get(h) is not None else 0.0
                    chart_data.append(entry)
                    
                charts[m_key] = {
                    "headers": i_headers,
                    "rows": m_rows,
                    "chart_data": chart_data
                }
                
                # Update Summary Table (Latest Year only)
                for r in m_rows:
                    if r["name"] == TARGET_LABEL:
                        s_entry = next((s for s in summary_table if s["name"] == TARGET_LABEL), None)
                        if not s_entry:
                            s_entry = {"name": TARGET_LABEL}
                            summary_table.append(s_entry)
                        
                        latest_h = i_headers[-1] if i_headers else None
                        if latest_h: s_entry[m_key] = r.get(latest_h)

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
        
        result = {
            "symbol": symbol,
            "sector_id": sector_id,
            "compare_sectors": compare_sectors,
            "summary_table": summary_table,
            "charts": charts,
            "raw_headers": i_headers,
            "version": "v4.0.0 (Ironclad-Sync)"
        }
        return result

    except Exception as e:
        logging.error(f"Critical Error in Ironclad-Mashup: {e}", exc_info=True)
        return None
