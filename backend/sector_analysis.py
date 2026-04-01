import requests
from bs4 import BeautifulSoup
import re
import json
from typing import Dict, List, Any
import urllib.parse
from korea_data import HEADER, decode_safe
from turbo_engine import turbo_cache

@turbo_cache(ttl_seconds=3600)
def get_sector_analysis_data(symbol: str) -> Dict[str, Any]:
    """
    네이버 금융 섹터분석(WiseReport c1050001.aspx) 데이터를 스크랩합니다.
    주가수익률, 배당성익률, PER, PBR, ROE, 부채비율 등 섹터 비교 데이터를 추출합니다.
    """
    code = symbol.split('.')[0]
    code = re.sub(r'[^0-9]', '', code)
    if not (len(code) == 6 and code.isdigit()):
        return {"status": "error", "message": "Invalid symbol"}

    try:
        session = requests.Session()
        session.headers.update(HEADER)
        
        # Step 1: 섹터 분석 메인 프레임 접속
        # cmp_cd: 종목코드
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1050001.aspx?cmp_cd={code}"
        res = session.get(url, timeout=7)
        html = decode_safe(res)
        soup = BeautifulSoup(html, 'html.parser')
        
        # 기본 정보 추출 (섹터 명 등)
        sector_info = {}
        title_box = soup.select_one(".cmp_comment")
        if title_box:
            sector_info["description"] = title_box.text.strip()

        # Step 2: 비교 업종 리스트 추출 (Select Box)
        compare_sectors = []
        select_box = soup.select_one("select#setSect")
        if select_box:
            for opt in select_box.select("option"):
                compare_sectors.append({
                    "id": opt.get("value"),
                    "name": opt.text.strip(),
                    "selected": "selected" in opt.attrs or opt.get("selected") == "selected"
                })

        # Step 3: 시계열 데이터 파싱 (차트용 데이터)
        # 네이버 섹터 분석 페이지는 스크립트 내에 JSON 형태의 데이터를 포함하거나 
        # 특정 AJAX 호출을 통해 차트를 그립니다. 
        # c1050001.aspx 내의 하단 테이블(cTB15, cTB16 등)에서 텍스트 데이터를 직접 추출합니다.
        
        charts = {}
        
        # 테이블 ID 매핑 (네이버 WiseReport 기준)
        # cTB11: 주가수익률
        # cTB12: 배당수익률
        # cTB13: PER
        # cTB14: PBR
        # cTB15: ROE
        # cTB16: 부채비율
        # cTB17: 매출총이익률
        # cTB18: 영업이익률
        
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
        
        for tid, title in table_mapping.items():
            table = soup.select_one(f"table#{tid}")
            if not table: continue
            
            # Header (연도/날짜)
            headers = [th.text.strip() for th in table.select("thead tr th") if th.text.strip() != "항목"]
            
            rows_data = []
            rows = table.select("tbody tr")
            for row in rows:
                name_td = row.select_one("td.txt") or row.select_one("th")
                if not name_td: continue
                name = name_td.text.strip()
                
                vals = row.select("td.num")
                val_dict = {"name": name}
                for i, h in enumerate(headers):
                    if i < len(vals):
                        v_str = vals[i].text.strip().replace(',', '')
                        try:
                            val_dict[h] = float(v_str) if v_str and v_str != '-' else None
                        except:
                            val_dict[h] = None
                rows_data.append(val_dict)
            
            # Recharts 친화적 포맷으로 변환 (연도별로 묶기)
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

        return {
            "status": "success",
            "symbol": symbol,
            "sector_info": sector_info,
            "compare_sectors": compare_sectors,
            "charts": charts,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        print(f"Sector Analysis Scraping Error for {symbol}: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Test
    import datetime
    data = get_sector_analysis_data("005930")
    print(json.dumps(data, indent=2, ensure_ascii=False))
