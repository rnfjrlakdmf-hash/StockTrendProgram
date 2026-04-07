# -*- coding: utf-8 -*-
import requests
import json
import logging
import re

# [Helper] Robust Decoding
def decode_safe(res: requests.Response) -> str:
    """
    Decodes response content robustly.
    Always uses explicit try-except fallback to prevent Mojibake.
    """
    content = res.content
    try:
        return content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return content.decode('cp949')
        except UnicodeDecodeError:
            return content.decode('utf-8', 'replace')

# [v4.9.0] Naver-Absolute-Mirror (Sector Analysis Perfect Integration)
# 1. 100% UI Parity: All 17 metrics now match Naver's Sector Analysis (c1090001.aspx) exactly.
# 2. Dynamic Mapping: Uses Naver's internal 'proc' IDs for each indicator.
# 3. Synchronized Sectoring: Ensures the exact WICS peer group is used for comparisons.

def get_sector_analysis_data(symbol, sector_id=None):
    logging.info(f"Starting v4.9.5 Precision-Sync Analysis for {symbol}")
    active_sector_id = str(sector_id) if sector_id else ""
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://finance.naver.com/"
    }
    
    TARGET_LABEL = "내 종목"
    INDUSTRY_LABEL = "섹터 평균"
    MARKET_LABEL = "시장 지수"
    category_map = {"1": TARGET_LABEL, "2": INDUSTRY_LABEL, "3": MARKET_LABEL}

    try:
        # 1. Extract Accurate Sector ID (sec_cd) from UI
        # We visit c1090001.aspx to find the active sector ID if not provided.
        try:
            ui_page_url = f"https://navercomp.wisereport.co.kr/v2/company/c1090001.aspx?cmp_cd={symbol}"
            ui_resp = requests.get(ui_page_url, headers=headers, timeout=5)
            ui_html = decode_safe(ui_resp)
            
            # Find sector dropdown
            select_match = re.search(r'<select[^>]*id=["\']sector["\'][^>]*>(.*?)</select>', ui_html, re.S)
            compare_sectors = []
            if select_match:
                opts = re.findall(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*>(.*?)</option>', select_match.group(1), re.S)
                for opt_id, opt_nm in opts:
                    if not opt_id: continue
                    compare_sectors.append({"id": opt_id, "name": opt_nm.strip()})
                
                if not active_sector_id:
                    # Find selected or default
                    sel_match = re.search(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*selected[^>]*>', select_match.group(1), re.S)
                    if sel_match: active_sector_id = sel_match.group(1)
                    elif compare_sectors: active_sector_id = compare_sectors[0]["id"]
            
            # Also find standard headers (Timeline)
            ssr_years = re.findall(r'(\d{4}\.\d{2})', ui_html)
            unique_ssr_years = []
            for y in ssr_years:
                fmt = y.replace('.', '/')
                if fmt not in unique_ssr_years: unique_ssr_years.append(fmt)
            master_headers = unique_ssr_years[:6] # Typically 6 items
        except Exception as e:
            logging.error(f"UI extraction error: {e}")
            master_headers = ["2021", "2022", "2023", "2024", "2025", "2026(E)"]
            compare_sectors = []

        # 2. Universal Metric Fetcher (17 Indicators)
        charts = {}
        summary_table = []
        
        # All Proc Mapping (Extracted from Naver UI Packets)
        metric_procs = {
            "per": ("PER", "1"),
            "pbr": ("PBR", "2"),
            "rev_growth": ("매출액증가율", "3"),
            "op_growth": ("영업이익증가율", "4"),
            "net_growth": ("순이익증가율", "5"),
            "debt_ratio": ("부채비율", "6"),
            "div_yield": ("배당수익률", "8"),
            "roe": ("ROE", "9"),
            "roa": ("ROA", "10"),
            "gross_margin": ("매출총이익률", "11"),
            "op_margin": ("영업이익률", "12"),
            "net_margin": ("순이익률", "13"),
            "curr_ratio": ("유동비율", "14"),
            "div_payout": ("배당성향", "15"),
            "fwd_per": ("Fwd. 12M PER", "18"),
            "fwd_pbr": ("Fwd. 12M PBR", "20")
        }

        # Master Timeline Sync Logic
        final_headers = []

        for m_key, (label, proc_id) in metric_procs.items():
            try:
                url = f"https://navercomp.wisereport.co.kr/company/chart/c1090001.aspx?proc={proc_id}&cmp_cd={symbol}&data_typ=1&chartType=svg"
                if active_sector_id: url += f"&sec_cd={active_sector_id}"
                
                resp = requests.get(url, headers=headers, timeout=5)
                # Parse robustly - MUST use decode_safe to prevent mojibake
                decoded_text = decode_safe(resp)
                try:
                    j = json.loads(decoded_text)
                except Exception as e:
                    logging.error(f"JSON Parse Error: {e}")
                    continue
                
                m_yymm = j.get("yymm", [])
                if not final_headers and m_yymm: final_headers = m_yymm
                
                m_items = j.get("data", [])
                rows = []
                for item in m_items:
                    gubn = str(item.get("GUBN"))
                    if gubn not in ["1", "2", "3"]: continue
                    if str(item.get("SEQ", "1")) != "1": continue
                    nm = category_map.get(gubn, "Other")
                    row = {"name": nm}
                    
                    # [v4.9.5] Dynamic FY Alignment Logic
                    is_est = any('(E)' in x or '(A)' in x for x in m_yymm)
                    fy0_idx = len(m_yymm) - 2 if is_est and len(m_yymm) > 1 else len(m_yymm) - 1
                    if fy0_idx < 0: fy0_idx = 0
                    
                    for idx, h in enumerate(m_yymm):
                        off = idx - fy0_idx
                        key = f"FY{off}" if off >= 0 else f"FY_{abs(off)}"
                        val = item.get(key)
                        row[h] = val
                    rows.append(row)
                
                if rows:
                    c_data = []
                    for h in m_yymm:
                        ent = {"period": h}
                        for r in rows: ent[r["name"]] = r.get(h) or 0.0
                        c_data.append(ent)
                    charts[label] = {"headers": m_yymm, "rows": rows, "chart_data": c_data}
                    
                    # Summary Table update (using the determined FY0 index)
                    fy0_idx = len(m_yymm) - 2 if (any('(E)' in x for x in m_yymm) and len(m_yymm) > 1) else len(m_yymm) - 1
                    if fy0_idx < 0: fy0_idx = 0
                    
                    target_h = m_yymm[fy0_idx] if len(m_yymm) > fy0_idx else None
                    for r in rows:
                        s_r = next((x for x in summary_table if x["name"] == r["name"]), None)
                        if not s_r:
                            s_r = {"name": r["name"]}
                            summary_table.append(s_r)
                        if target_h:
                            s_r[m_key] = r.get(target_h)
            except Exception as e:
                logging.error(f"Error fetching {label}: {e}")

        # 3. Handle Special 'Price Returns' (dt1) for genuine granular chart parity
        try:
            import datetime
            sector_url = f"https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd={symbol}&data_typ=1&chartType=svg"
            if active_sector_id: sector_url += f"&sec_cd={active_sector_id}"
            s_resp = requests.get(sector_url, headers=headers, timeout=10)
            try:
                decoded_text = decode_safe(s_resp)
                ajax_json = json.loads(decoded_text)
            except Exception as e:
                logging.error(f"JSON Parse Error in Price Returns: {e}")
                ajax_json = {}
                
            dt1 = ajax_json.get("dt1", {})
            if dt1 and "TRD_DT" in dt1:
                trd_dt = dt1.get("TRD_DT", [])
                stk_rtn = dt1.get("STK_RTN", [])
                sec_rtn = dt1.get("SEC_RTN", [])
                mkt_rtn = dt1.get("MKT_RTN", [])
                
                detailed_yymm = []
                c_data = []
                
                row_stk = {"name": "내 종목"}
                row_sec = {"name": "섹터 평균"}
                row_mkt = {"name": "시장 지수"}
                
                for i, ms in enumerate(trd_dt):
                    if not ms: continue
                    dt_str = datetime.datetime.fromtimestamp(ms / 1000.0).strftime('%Y/%m/%d')
                    detailed_yymm.append(dt_str)
                    
                    v_stk = stk_rtn[i] if i < len(stk_rtn) else 0.0
                    v_sec = sec_rtn[i] if i < len(sec_rtn) else 0.0
                    v_mkt = mkt_rtn[i] if i < len(mkt_rtn) else 0.0
                    
                    row_stk[dt_str] = v_stk
                    row_sec[dt_str] = v_sec
                    row_mkt[dt_str] = v_mkt
                    
                    c_data.append({
                        "period": dt_str,
                        "내 종목": v_stk,
                        "섹터 평균": v_sec,
                        "시장 지수": v_mkt
                    })
                    
                rtn_rows = [row_stk, row_sec, row_mkt]
                charts["주가수익률"] = {"headers": detailed_yymm, "rows": rtn_rows, "chart_data": c_data}
        except Exception as e:
            logging.error(f"Error fetching Price Returns: {e}")

        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "summary_table": summary_table,
                "charts": charts,
                "compare_sectors": compare_sectors,
                "active_sector_id": active_sector_id,
                "version": "v4.9.5 (Precision-Sync)"
            }
        }

    except Exception as e:
        logging.error(f"Fatal error in v4.9.0: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
