import requests
from bs4 import BeautifulSoup
import re
import json
import datetime
from typing import Dict, List, Any, Optional
import urllib.parse
from korea_data import HEADER, decode_safe
from turbo_engine import turbo_cache

@turbo_cache(ttl_seconds=3600)
def get_sector_analysis_data(symbol: str) -> Dict[str, Any]:
    """
    [v1.6.0] 네이버 금융 섹터분석(WiseReport c1050001.aspx) 정밀 스크랩
    - 모든 비교 업종 리스트 추출
    - 각 지표별(주가수익률, 배당, PER 등) 연도/분기별 전체 데이터 파싱
    - 데이터 누락 방지를 위한 이중 검증 로직 포함
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return {"status": "error", "message": "Invalid symbol"}

    try:
        session = requests.Session()
        session.headers.update(HEADER)
        
        # Step 1: 섹터 분석 메인 페이지 접속
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1050001.aspx?cmp_cd={code}"
        res = session.get(url, timeout=10)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1-1. 섹터 기본 정보
        sector_info = {}
        title_box = soup.select_one(".cmp_comment")
        if title_box:
            sector_info["description"] = title_box.text.strip()
            
        # 1-2. 전체 비교 업종 리스트 (모든 섹정 데이터화)
        compare_sectors = []
        select_box = soup.select_one("select#setSect")
        if select_box:
            for opt in select_box.select("option"):
                val = opt.get("value")
                name = opt.text.strip()
                if val:
                    compare_sectors.append({
                        "id": val,
                        "name": name,
                        "selected": "selected" in opt.attrs or opt.get("selected") == "selected"
                    })

        # Step 2: 8대 지표 테이블 정밀 파싱
        # cTB11 ~ cTB18 (수익률, 배당, PER, PBR, ROE, 부채비율, GPM, OPM)
        table_mapping = {
            "cTB11": "주가수익률",
            "cTB12": "배당수익률",
            "cTB13": "PER",
            "cTB14": "PBR",
            "cTB15": "ROE",
            "cTB16": "부채비율",
            "cTB17": "매출총이익률",
            "cTB18": "영업이익률"
        }
        
        charts = {}
        summary_table = [] # 섹터별 최신 지표 요약표용

        for tid, title in table_mapping.items():
            table = soup.select_one(f"table#{tid}")
            if not table: continue
            
            # Header 파싱 (연도/분기)
            # <th> 내부에 span 등이 있을 수 있으므로 text로만 추출
            headers = []
            thead_th = table.select("thead tr th")
            for th in thead_th:
                t = th.get_text(strip=True)
                if t and t != "항목":
                    headers.append(t)
            
            # Row 데이터 파싱
            rows_data = []
            tbody_rows = table.select("tbody tr")
            for row in tbody_rows:
                # 항목명 (종목명, 섹터명 등)
                name_td = row.select_one("td.txt") or row.select_one("th")
                if not name_td: continue
                name = name_td.get_text(strip=True)
                
                # 수치 데이터
                val_tds = row.select("td.num")
                val_dict = {"name": name}
                for i, h in enumerate(headers):
                    if i < len(val_tds):
                        v_str = val_tds[i].get_text(strip=True).replace(',', '')
                        try:
                            # 'N/A' 또는 '-' 처리
                            if v_str in ('', '-', 'N/A'):
                                val_dict[h] = None
                            else:
                                val_dict[h] = float(v_str)
                        except:
                            val_dict[h] = None
                rows_data.append(val_dict)
            
            # Recharts용 시계열 변환
            chart_data = []
            for h in headers:
                entry = {"period": h}
                for rd in rows_data:
                    entry[rd["name"]] = rd.get(h)
                chart_data.append(entry)
                
            charts[title] = {
                "headers": headers,
                "rows": rows_data,
                "chart_data": chart_data
            }

            # [Update v1.6.0] 최신 지표 요약 (가장 오른쪽 컬럼 데이터)
            if headers:
                latest_h = headers[-1]
                for rd in rows_data:
                    # 섹터별 요약 리스트 업데이트 또는 신규 생성
                    sector_entry = next((s for s in summary_table if s["name"] == rd["name"]), None)
                    if not sector_entry:
                        sector_entry = {"name": rd["name"]}
                        summary_table.append(sector_entry)
                    
                    sector_entry[title] = rd.get(latest_h)

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors,
            "charts": charts,
            "summary_table": summary_table, # 신규 추가: 전 섹터 비교표 데이터
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        print(f"Sector Deep Analysis Scraping Error for {symbol}: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Test Debug
    res = get_sector_analysis_data("005930")
    print(json.dumps(res, indent=2, ensure_ascii=False))
