import requests
import json
import logging

# [v2.8.1] Diamond-Fix
# This module handles the fetching and parsing of sector analysis data from Naver Finance.

def get_sector_analysis_data(symbol, sector_id=None):
    """
    Fetches comparative sector data including PER, PBR, ROE, etc.
    """
    try:
        # 1. Base API URL (Naver Finance WiseReport Ajax)
        # cmp_cd: Company code
        # data_typ: 1 (Return/Indicator comparison)
        # sec_cd: Sector code (WI26 standard)
        url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
        if sector_id:
            url += f"&sec_cd={sector_id}"
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
            "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
        }

        response = requests.get(url, headers=headers, timeout=10)
        
        # [v2.7.9] Multi-stage decoding for Naver Finance Response (EUC-KR/CP949 fallback)
        try:
            ajax_json = response.json()
        except:
            try:
                # Try explicit CP949 decoding
                decoded_content = response.content.decode('cp949', errors='replace')
                ajax_json = json.loads(decoded_content)
            except:
                # Last resort fallback
                decoded_content = response.content.decode('utf-8', errors='replace')
                ajax_json = json.loads(decoded_content)

        if not ajax_json:
            return None

        # 2. Extract Indicator Headers (Timeline)
        # Usually dt3 contains the financial indicators
        indicators_data = ajax_json.get("dt3", {})
        if not isinstance(indicators_data, dict):
            indicators_data = {}
            
        i_headers = indicators_data.get("yymm", [])
        if not isinstance(i_headers, list):
            i_headers = []
        
        data_items = indicators_data.get("data", [])
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        
        charts = {}
        summary_table = []
        
        if i_headers:
            metric_groups = {}
            # [v2.8.0] Pre-scan dt3 to map ITEM IDs to Indicator Keys
            id_to_key = {}
            for item in data_items:
                if item.get("GUBN") == "1":
                    it_id = str(item.get("ITEM"))
                    nm_raw = item.get("NM", "")
                    nm = nm_raw.upper() if isinstance(nm_raw, str) else ""
                    
                    m_key = None
                    if it_id == "1":
                        if "EPS" in nm: m_key = "eps"
                    elif it_id == "2":
                        if "BPS" in nm: m_key = "bps"
                    elif it_id == "8" or "DPS" in nm: 
                        m_key = "div_yield"
                    
                    if "PER" in nm or "주가수익비율" in nm: m_key = "per"
                    elif "PBR" in nm or "주가순자산" in nm or it_id == "3": m_key = "pbr"
                    elif "ROE" in nm or "자기자본" in nm: m_key = "roe"
                    elif "ROA" in nm or "총자산" in nm: m_key = "roa"
                    elif "배당성향" in nm: m_key = "payout_ratio"
                    elif "배당수익률" in nm: m_key = "div_yield"
                    elif "부채비율" in nm or it_id == "6": m_key = "debt_ratio"
                    elif "유동비율" in nm: m_key = "current_ratio"
                    elif "영업이익률" in nm: m_key = "op_margin"
                    elif "순이익률" in nm: m_key = "net_margin"
                    elif "매출액증가율" in nm: m_key = "sales_growth"
                    elif "영업이익증가율" in nm: m_key = "op_growth"
                    elif "순이익증가율" in nm: m_key = "net_growth"
                    elif "주가수익률" in nm:
                        if "연간" in nm: m_key = "주가수익률_연간"
                        else: m_key = "주가수익률"
                    
                    if m_key: id_to_key[it_id] = m_key

            # Group items by matched key
            for item in data_items:
                it_id = str(item.get("ITEM"))
                m_key = id_to_key.get(it_id)
                
                if not m_key:
                    nm_raw = item.get("NM")
                    if nm_raw and isinstance(nm_raw, str):
                        nm = nm_raw.upper()
                        if "PER" in nm: m_key = "per"
                        elif "PBR" in nm: m_key = "pbr"
                        elif "ROE" in nm: m_key = "roe"
                        elif "배당" in nm: m_key = "div_yield"
                
                if m_key:
                    if m_key not in metric_groups: metric_groups[m_key] = []
                    metric_groups[m_key].append(item)

            # Build charts and summary table from groups
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
                        "chart_data": [{"period": h, **{r["name"]: r.get(h) for r in m_rows}} for h in i_headers]
                    }
                    
                    for r in m_rows:
                        s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                        if not s_entry:
                            s_entry = {"name": r["name"]}
                            summary_table.append(s_entry)
                        
                        # Use latest value for summary
                        latest_h = i_headers[-2] if len(i_headers) > 1 else (i_headers[-1] if i_headers else None)
                        if latest_h:
                            s_entry[m_key] = r.get(latest_h)

        # 4. Extract Comparison Sectors (dt2) - v2.7.9 Emergency Fix
        compare_sectors = []
        dt2 = ajax_json.get("dt2")
        
        # Fallback to predefined major sectors if dt2 is missing (Naver API changed)
        major_sectors = [
            {"id": "WI620", "name": "반도체"},
            {"id": "WI600", "name": "소프트웨어"},
            {"id": "WI610", "name": "IT하드웨어"},
            {"id": "WI300", "name": "자동차"},
            {"id": "WI110", "name": "화학"},
            {"id": "WI200", "name": "철강"},
            {"id": "WI400", "name": "에너지"},
            {"id": "IKS013", "name": "KOSPI 전기전자"},
            {"id": "IKS012", "name": "KOSPI 비금속"}
        ]
        
        if dt2 and isinstance(dt2, list) and len(dt2) > 0:
            for sec in dt2:
                sec_nm = sec.get("SEC_NM_K", "").strip() if isinstance(sec.get("SEC_NM_K"), str) else ""
                sec_id = sec.get("SEC_CD", "")
                if sec_nm and sec_id:
                    compare_sectors.append({"id": sec_id, "name": sec_nm, "selected": str(sec_id) == str(sector_id)})
        else:
            # Try to find the default sector from dt0 (v2.7.9 Logic)
            dt0_data = ajax_json.get("dt0", {}).get("data", [])
            for item in dt0_data:
                if item.get("GUBN") == "1" and item.get("SEQ") == 2:
                    default_nm_raw = item.get("NM")
                    default_nm = default_nm_raw.strip() if isinstance(default_nm_raw, str) else ""
                    if default_nm and len(default_nm) > 1:
                        compare_sectors.append({"id": sector_id or "DEFAULT", "name": default_nm, "selected": True})
            
            # Append major sectors as fallback options
            existing_names = [s["name"] for s in compare_sectors]
            for ms in major_sectors:
                if ms["name"] not in existing_names:
                    ms_copy = ms.copy()
                    if ms_copy["id"] == sector_id: ms_copy["selected"] = True
                    compare_sectors.append(ms_copy)

        if not compare_sectors:
            compare_sectors.append({"id": sector_id or "", "name": "주요 업종 (기본)", "selected": True})

        if not summary_table:
            # Provide skeleton for UI stability
            summary_table = [
                {"name": "대상 종목"},
                {"name": "업종 평균"},
                {"name": "시장 지수"}
            ]

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
