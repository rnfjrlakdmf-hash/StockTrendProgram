import os
import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class DartApiClient:
    """
    💼 금융감독원 Open DART API 연동 클라이언트
    ──────────────────────────────────────────
    공식 API를 사용하여 기업의 공시 정보 및 재무제표를 합법적으로 조회합니다.
    """
    
    BASE_URL = "https://opendart.fss.or.kr/api"
    _corp_codes_cache: Optional[Dict[str, str]] = None

    def __init__(self):
        self.api_key = os.getenv("DART_API_KEY", "").strip()

    def is_available(self) -> bool:
        """API 키가 설정되어 작동 가능한 상태인지 확인"""
        return len(self.api_key) > 0

    def _load_corp_code(self, stock_code: str) -> Optional[str]:
        """stock_code(6자리)를 DART corp_code(8자리)로 변환"""
        if DartApiClient._corp_codes_cache is None:
            try:
                # backend 폴더 또는 현재 파일의 상위 폴더 경로 유추
                base_dir = os.path.dirname(os.path.abspath(__file__))
                json_path = os.path.join(base_dir, "dart_corp_codes.json")
                if os.path.exists(json_path):
                    with open(json_path, "r", encoding="utf-8") as f:
                        DartApiClient._corp_codes_cache = json.load(f)
                else:
                    # 상위 폴더 등 다른 경로 탐색
                    json_path_alt = os.path.join(os.getcwd(), "dart_corp_codes.json")
                    if os.path.exists(json_path_alt):
                        with open(json_path_alt, "r", encoding="utf-8") as f:
                            DartApiClient._corp_codes_cache = json.load(f)
                    else:
                        DartApiClient._corp_codes_cache = {}
            except Exception as e:
                print(f"[DART-API] dart_corp_codes.json 로드 실패: {e}")
                DartApiClient._corp_codes_cache = {}

        clean_code = stock_code.split('.')[0]
        return DartApiClient._corp_codes_cache.get(clean_code)

    def get_realtime_disclosures(self, days_ago: int = 0) -> List[Dict]:
        """
        📋 실시간 기업 공시 목록 수집
        - days_ago: 조회할 시작일 범위 (0 이면 오늘 공시만 조회)
        """
        if not self.is_available():
            print("[DART-API] ⚠️ DART_API_KEY가 설정되어 있지 않습니다.")
            return []

        url = f"{self.BASE_URL}/list.json"
        
        target_date = datetime.now() - timedelta(days=days_ago)
        date_str = target_date.strftime("%Y%m%d")
        today_str = datetime.now().strftime("%Y%m%d")

        params = {
            "crtfc_key": self.api_key,
            "bgn_de": date_str,
            "end_de": today_str,
            "page_no": "1",
            "page_count": "100"
        }

        try:
            res = requests.get(url, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                status = data.get("status")
                
                if status == "000":  # 정상
                    reports = data.get("list", [])
                    cleaned_reports = []
                    for r in reports:
                        stock_code = r.get("stock_code", "").strip()
                        cleaned_reports.append({
                            "corp_code": r.get("corp_code"),
                            "corp_name": r.get("corp_name"),
                            "stock_code": stock_code if stock_code else None,
                            "report_nm": r.get("report_nm"),
                            "rcept_no": r.get("rcept_no"),
                            "flr_nm": r.get("flr_nm"),
                            "rcept_dt": r.get("rcept_dt"),
                            "rm": r.get("rm"),
                            "link": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={r.get('rcept_no')}"
                        })
                    return cleaned_reports
                elif status == "013":  # 조회된 데이터가 없음
                    return []
                else:
                    print(f"[DART-API] ❌ API 오류 (상태코드: {status}): {data.get('message')}")
            else:
                print(f"[DART-API] HTTP 오류: {res.status_code}")
        except Exception as e:
            print(f"[DART-API] 호출 예외 발생: {e}")

        return []

    def get_financial_sheets(self, corp_code: str, bsns_year: str, reprt_code: str = "11011") -> List[Dict]:
        """
        📊 단일회사 주요재무제표 조회 (재무상태표, 손익계산서 등)
        - corp_code: DART 고유번호 (8자리)
        - bsns_year: 사업연도 (예: '2025')
        - reprt_code: 보고서 코드 (1분기: '11013', 반기: '11012', 3분기: '11014', 사업보고서: '11011')
        """
        if not self.is_available():
            return []

        url = f"{self.BASE_URL}/fnlttSinglAcnt.json"
        params = {
            "crtfc_key": self.api_key,
            "corp_code": corp_code,
            "bsns_year": bsns_year,
            "reprt_code": reprt_code
        }

        try:
            res = requests.get(url, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "000":
                    return data.get("list", [])
                else:
                    print(f"[DART-API] 재무제표 조회 오류: {data.get('message')}")
            else:
                print(f"[DART-API] HTTP 오류: {res.status_code}")
        except Exception as e:
            print(f"[DART-API] 재무제표 예외: {e}")
        return []

    def get_korean_financial_summary(self, stock_code: str) -> Optional[Dict]:
        """
        💼 국내 주식의 주요 재무 정보 조회 및 기존 포맷 변환
        """
        corp_code = self._load_corp_code(stock_code)
        if not corp_code:
            print(f"[DART-API] corp_code 변환 실패: {stock_code}")
            return None

        # 최신 2개년 데이터를 시도 (올해 보고서가 아직 공시 안 된 경우 대비)
        current_year = datetime.now().year
        years_to_try = [str(current_year - 1), str(current_year - 2)]
        
        financial_items = []
        for year in years_to_try:
            items = self.get_financial_sheets(corp_code, year)
            if items:
                financial_items = items
                break

        if not financial_items:
            return None

        # 기본 구조 매핑
        summary = {
            "revenue": "N/A",
            "operating_income": "N/A",
            "net_income": "N/A",
            "total_assets": "N/A",
            "debt_ratio": "N/A"
        }

        try:
            # 주요 계정과목 식별
            # account_nm: '매출액', '영업이익', '당기순이익', '자산총계', '부채총계', '자본총계' 등
            liabilities = 0
            equity = 0
            
            for item in financial_items:
                acc_name = item.get("account_nm", "").replace(" ", "")
                amt_str = item.get("thstrm_amount", "").replace(",", "")
                try:
                    amt_val = int(amt_str) if amt_str.isdigit() or (amt_str.startswith("-") and amt_str[1:].isdigit()) else 0
                except:
                    amt_val = 0

                # 한글 계정 명칭 매칭
                if "매출액" in acc_name or "매출" == acc_name:
                    summary["revenue"] = f"{amt_val:,.0f}" if amt_val else "N/A"
                elif "영업이익" in acc_name:
                    summary["operating_income"] = f"{amt_val:,.0f}" if amt_val else "N/A"
                elif "당기순이익" in acc_name:
                    summary["net_income"] = f"{amt_val:,.0f}" if amt_val else "N/A"
                elif "자산총계" in acc_name:
                    summary["total_assets"] = f"{amt_val:,.0f}" if amt_val else "N/A"
                elif "부채총계" in acc_name:
                    liabilities = amt_val
                elif "자본총계" in acc_name:
                    equity = amt_val

            # 부채비율 계산
            if liabilities and equity:
                ratio = (liabilities / equity) * 100
                summary["debt_ratio"] = f"{ratio:.2f}%"

        except Exception as e:
            print(f"[DART-API] 재무 정보 정제 실패: {e}")

        return summary

# ─── 전역 단일 인스턴스 ──────────────────────────────────────────────────────
dart_api_client = DartApiClient()


# ─── 전역 단일 인스턴스 ──────────────────────────────────────────────────────
dart_api_client = DartApiClient()
