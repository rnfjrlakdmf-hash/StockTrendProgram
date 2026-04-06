import requests
import json
import logging

# [v2.8.5] Ultimate-Fix
# Robust indicator collection from both dt3 and dt0 to ensure PER/ROE availability.

def get_sector_analysis_data(symbol, sector_id=None):
    """
    Fetches comparative sector data with ultimate robustness for PER, ROE, etc.
    """
    try:
        url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            url += f"&sec_cd={sector_id}"
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
            "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
        }

        response = requests.get(url, headers=headers, timeout=10)
        
        # Multi-stage decoding (UTF-8 / CP949)
        try:
            ajax_json = response.json()
        except:
            try:
                decoded_content = response.content.decode('cp949', errors='replace')
                ajax_json = json.loads(decoded_content)
            except:
                decoded_content = response.content.decode('utf-8', errors='replace')
                ajax_json = json.loads(decoded_content)

        if not ajax_json:
            return None

        # Headers and Setup
        indicators_data = ajax_json.get("dt3", {})
        if not isinstance(indicators_data, dict): indicators_data = {}
        i_headers = indicators_data.get("yymm", [])
        if not isinstance(i_headers, list): i_headers = []
        data_items = indicators_data.get("data", [])
        
        dt0_data = ajax_json.get("dt0", {}).get("data", [])
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        
        charts = {}
        summary_table = []
        metric_groups = {}
        id_to_key = {}

        # 1. Map ITEM IDs to Indicator Keys (v2.8.5 Hybrid Strategy)
        for item in data_items:
            if item.get("GUBN") == "1":
                it_id = str(item.get("ITEM"))
                nm = str(item.get("NM", "")).upper()
                
                m_key = None
                # Strategic Mapping
                if it_id == "1": m_key = "eps"
                elif it_id == "2": m_key = "bps"
                elif "PER" in nm or "주가수익비율" in nm or it_id == "4": m_key = "per"
                elif "PBR" in nm or "주가순자산" in nm or it_id == "3": m_key = "pbr"
                elif "ROE" in nm or "자기자본" in nm or it_id == "5": m_key = "roe"
                elif "ROA" in nm or "총자산" in nm: m_key = "roa"
                elif "배당성향" in nm: m_key = "payout_ratio"
                elif "배당수익률" in nm or "DPS" in nm or it_id == "8": m_key = "div_yield"
                elif "부채비율" in nm or it_id == "6": m_key = "debt_ratio"
                elif "유동비율" in nm: m_key = "current_ratio"
                elif "영업이익률" in nm: m_key = "op_margin"
                elif "매출액증가율" in nm: m_key = "sales_growth"
                elif "주가수익률" in nm:
                    if "연간" in nm: m_key = "주가수익률_연간"
                    else: m_key = "주가수익률"
                
                if m_key: id_to_key[it_id] = m_key

        # 2. Extract Data from dt3
        for item in data_items:
            it_id = str(item.get("ITEM"))
            m_key = id_to_key.get(it_id)
            if m_key:
                if m_key not in metric_groups: metric_groups[m_key] = []
                metric_groups[m_key].append(item)

        # 3. Fallback: Search dt0 for Missing PER/ROE (Ultimate logic)
        for item in dt0_data:
            nm = str(item.get("NM", "")).upper()
            target_key = None
            if "PER" in nm or "주가수익비율" in nm: target_key = "per"
            elif "ROE" in nm or "자기자본" in nm: target_key = "roe"
            elif "PBR" in nm: target_key = "pbr"
            
            if target_key and target_key not in metric_groups:
                # dt0 has same FY_4...FY1 structure
                metric_groups[target_key] = [item]

        # 4. Form Charts and Summary
        for m_key, items in metric_groups.items():
            m_rows = []
            processed_categories = set()
            for item in items:
                gubn = str(item.get("GUBN", "1"))
                if gubn in processed_categories: continue
                processed_categories.add(gubn)
                
                name = category_map.get(gubn, "기타")
                row = {"name": name}
                
                for idx, h in enumerate(i_headers):
                    fy_offset = idx - 3
                    fy_key = f"FY{fy_offset}" if fy_offset >= 0 else f"FY_{abs(fy_offset)}"
                    # Handle Naver special cases
                    if fy_offset == 0: fy_key = "FY0"
                    if fy_offset == 1: fy_key = "FY1"
                    
                    val = item.get(fy_key)
                    try:
                        row[h] = float(val) if val is not None and val != "" else None
                    except:
                        row[h] = None
                m_rows.append(row)

            if m_rows:
                charts[m_key] = {
                    "headers": i_headers,
                    "rows": m_rows,
                    "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in i_headers if h]
                }
                
                for r in m_rows:
                    s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                    if not s_entry:
                        s_entry = {"name": r["name"]}
                        summary_table.append(s_entry)
                    
                    latest_h = i_headers[-2] if len(i_headers) > 1 else (i_headers[-1] if i_headers else None)
                    if latest_h: s_entry[m_key] = r.get(latest_h)

        # 5. Comparison Sectors
        compare_sectors = []
        dt2 = ajax_json.get("dt2", [])
        if dt2 and isinstance(dt2, list):
            for sec in dt2:
                sec_nm = str(sec.get("SEC_NM_K", "")).strip()
                sec_id = sec.get("SEC_CD", "")
                if sec_nm and sec_id:
                    compare_sectors.append({"id": sec_id, "name": sec_nm, "selected": str(sec_id) == str(sector_id)})
        
        if not compare_sectors:
            for item in dt0_data:
                if item.get("GUBN") == "1" and item.get("SEQ") == 2:
                    nm = str(item.get("NM", "")).strip()
                    if nm and len(nm) > 1:
                        compare_sectors.append({"id": sector_id or "DEFAULT", "name": nm, "selected": True})
        
        # If still empty, use skeleton
        if not summary_table:
            summary_table = [{"name": "대상 종목"}, {"name": "업종 평균"}, {"name": "시장 지수"}]

        return {
            "symbol": symbol,
            "sector_id": sector_id,
            "compare_sectors": compare_sectors,
            "summary_table": summary_table,
            "charts": charts,
            "raw_headers": i_headers
        }

    except Exception as e:
        logging.error(f"Error in get_sector_analysis_data: {e}")
        return None
