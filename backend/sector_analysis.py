import requests
import json
import logging
import re

logger = logging.getLogger(__name__)

def get_sector_analysis_data(symbol, sector_id):
    """
    Fetches comprehensive sector comparison data from Naver Finance.
    Endpoint: cF9001.aspx (Industry Comparison)
    """
    try:
        # sector_id가 None이거나 'None' 문자열인 경우 처리
        if not sector_id or sector_id == "None":
            sector_id = ""
            
        # 1. Fetch Industry Comparison Data (cF9001.aspx)
        ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={symbol}&sec_cd={sector_id}&data_typ=1"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
        }
        
        response = requests.get(ajax_url, headers=headers, timeout=10)
        if response.status_code != 200:
            return {"error": f"Failed to fetch sector data (HTTP {response.status_code})"}
            
        # [v2.7.9] Enhanced Decoding Logic
        content = response.content
        try:
            # Try UTF-8 first
            ajax_json = json.loads(content.decode('utf-8'))
        except:
            try:
                # Fallback to CP949 (EUC-KR) if it's a Naver legacy response
                ajax_json = json.loads(content.decode('cp949'))
            except:
                # Last resort: replace errors
                ajax_json = json.loads(content.decode('utf-8', errors='replace'))
        
        # 2. Extract Industry Overview (dt1) - Safe Indexing (v2.7.5)
        dt1 = ajax_json.get("dt1")
        if not dt1 or not isinstance(dt1, list) or len(dt1) == 0:
            overview = {}
        else:
            overview = dt1[0]
        
        # 3. Extract Detailed Comparison Data (dt3)
        charts = {}
        summary_table = []
        
        indicators_data = ajax_json.get("dt3", {})
        if not isinstance(indicators_data, dict):
            indicators_data = {}
            
        i_headers = indicators_data.get("yymm", [])
        if not isinstance(i_headers, list):
            i_headers = []
        
        data_items = indicators_data.get("data", [])
        category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
        
        if i_headers:
            # [v2.8.0] Pre-scan dt3 to map ITEM IDs to Indicator Keys
            # This solves the "Missing Industry/Market Data" bug where names are corrupted in non-target rows.
            id_to_key = {}
            for item in data_items:
                # We identify the indicator from the Target Stock (GUBN 1) row which usually has a better NM
                if item.get("GUBN") == "1":
                    it_id = str(item.get("ITEM"))
                    nm = item.get("NM", "").upper()
                    
                    m_key = None
                    # Return/Price related
                    if it_id == "1":
                        if "EPS" in nm: m_key = "eps"
                    elif it_id == "2":
                        if "BPS" in nm: m_key = "bps"
                    elif it_id == "8" or "DPS" in nm: 
                        m_key = "div_yield" # Defaulting ITEM 8 to div related
                    
                    # Keywords Matching (Hybrid)
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

            # 3. Form Charts (v2.8.0 Hierarchical Mapping)
            for item in data_items:
                it_id = str(item.get("ITEM"))
                gubn = item.get("GUBN")
                category_name = category_map.get(gubn, "기타")
                
                # Map the item to a key using our pre-scanned ID map
                m_key = id_to_key.get(it_id)
                
                # Fallback to NM matching if ID mapping failed
                if not m_key:
                    nm = item.get("NM", "").upper()
                    if "PER" in nm: m_key = "per"
                    elif "PBR" in nm: m_key = "pbr"
                    elif "ROE" in nm: m_key = "roe"
                    elif "배당" in nm: m_key = "div_yield"
                
                if m_key:
                    
                    if m_key not in metric_groups: metric_groups[m_key] = []
                    metric_groups[m_key].append(item)

            # Step 3-2. Build charts and summary table
            category_map = {"1": "대상 종목", "2": "업종 평균", "3": "시장 지수"}
            
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
                    
                    # Update summary table
                    for r in m_rows:
                        s_entry = next((s for s in summary_table if s["name"] == r["name"]), None)
                        if not s_entry:
                            s_entry = {"name": r["name"]}
                            summary_table.append(s_entry)
                        
                        latest_val = None
                        for h in reversed(i_headers):
                            if r.get(h) is not None:
                                latest_val = r.get(h)
                                break
                        s_entry[m_key] = latest_val

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
                sec_nm = sec.get("SEC_NM_K", "").strip()
                sec_id = sec.get("SEC_CD", "")
                if sec_nm and sec_id:
                    compare_sectors.append({"id": sec_id, "name": sec_nm, "selected": str(sec_id) == str(sector_id)})
        else:
            # Try to find the default sector from dt0 (v2.7.9 Logic)
            dt0_data = ajax_json.get("dt0", {}).get("data", [])
            for item in dt0_data:
                if item.get("GUBN") == "1" and item.get("SEQ") == 2:
                    default_nm = item.get("NM", "").strip()
                    # Clean up encoding/garbage if needed
                    if default_nm and len(default_nm) > 1:
                        compare_sectors.append({"id": sector_id or "DEFAULT", "name": default_nm, "selected": True})
            
            # Append major sectors as fallback options
            existing_names = [s["name"] for s in compare_sectors]
            for ms in major_sectors:
                if ms["name"] not in existing_names:
                    ms_copy = ms.copy()
                    if ms_copy["id"] == sector_id: ms_copy["selected"] = True
                    compare_sectors.append(ms_copy)

        # If still empty, add at least one
        if not compare_sectors:
            compare_sectors.append({"id": sector_id or "", "name": "주요 업종 (기본)", "selected": True})

        if not summary_table:
            # Provide a more complete skeleton for UI stability
            summary_table = [
                {"name": "대상 종목", "per": 0.0, "pbr": 0.0, "roe": 0.0, "div_yield": 0.0, "debt_ratio": 0.0},
                {"name": "업종 평균", "per": 0.0, "pbr": 0.0, "roe": 0.0, "div_yield": 0.0, "debt_ratio": 0.0}
            ]

        return {
            "status": "success",
            "data": {
                "overview": {
                    "sector_name": overview.get("SEC_NM_K", "Unknown"),
                    "stock_count": overview.get("SEC_NM_K_CNT", "0"),
                    "sector_return_1d": overview.get("SEC_RTN_1D", "0"),
                    "sector_return_1m": overview.get("SEC_RTN_1M", "0")
                },
                "compare_sectors": compare_sectors,
                "charts": charts,
                "summary_table": summary_table,
                "raw_headers": i_headers
            }
        }

    except Exception as e:
        import traceback
        logger.error(f"Critical error in get_sector_analysis_data: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "status": "error",
            "message": str(e),
            "data": {
                "overview": {"sector_name": "데이터 오류", "stock_count": "0"},
                "charts": {},
                "summary_table": [],
                "raw_headers": []
            }
        }
