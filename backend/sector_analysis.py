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
            
        ajax_json = response.json()
        
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
        
        if i_headers:
            # Step 3-1. Group all raw items by our target metric names
            metric_groups = {}
            for item in indicators_data.get("data", []):
                nm = item.get("NM", "").upper()
                seq = int(item.get("SEQ", 0))
                
                m_key = None
                if "PER" in nm and "FWD" not in nm: m_key = "per"
                elif "PBR" in nm and "FWD" not in nm: m_key = "pbr"
                elif "FWD. 12M PER" in nm: m_key = "fwd_per"
                elif "FWD. 12M PBR" in nm: m_key = "fwd_pbr"
                elif "ROE" in nm: m_key = "roe"
                elif "ROA" in nm: m_key = "roa"
                elif "부채비율" in nm: m_key = "debt_ratio"
                elif "유동비율" in nm: m_key = "current_ratio"
                elif "배당성향" in nm: m_key = "payout_ratio"
                elif "매출액증가율" in nm: m_key = "sales_growth"
                elif "영업이익증가율" in nm: m_key = "op_growth"
                elif "순이익증가율" in nm: m_key = "net_growth"
                elif "배당수익률" in nm: m_key = "div_yield"
                elif "주가수익률" in nm: m_key = "주가수익률"
                elif "영업이익률" in nm: m_key = "op_margin"
                elif "순이익률" in nm: m_key = "net_margin"
                elif "매출총이익률" in nm: m_key = "gross_margin"
                
                if m_key:
                    # Filter out total amount items
                    if ("금액" in nm or "자산" in nm or ("부채" in nm and "비율" not in nm)) and seq > 1:
                        continue
                    
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

        # 4. Extract Comparison Sectors (dt2) - v2.7.6
        dt2 = ajax_json.get("dt2", [])
        compare_sectors = []
        if isinstance(dt2, list):
            for sec in dt2:
                sec_id = sec.get("SEC_CD")
                sec_nm = sec.get("SEC_NM_K")
                if sec_id and sec_nm:
                    compare_sectors.append({
                        "id": sec_id,
                        "name": sec_nm,
                        "selected": str(sec_id) == str(sector_id)
                    })

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
