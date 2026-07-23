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
        self._realtime_cache = {}
        self._realtime_cache_time = {}

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

        now_ts = datetime.now()
        if days_ago in self._realtime_cache_time:
            if (now_ts - self._realtime_cache_time[days_ago]).total_seconds() < 60:
                return self._realtime_cache[days_ago]

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
                    
                    self._realtime_cache[days_ago] = cleaned_reports
                    self._realtime_cache_time[days_ago] = now_ts
                    return cleaned_reports
                elif status == "013":  # 조회된 데이터가 없음
                    self._realtime_cache[days_ago] = []
                    self._realtime_cache_time[days_ago] = now_ts
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

    def _parse_amount(self, amt_str: str):
        """금액 문자열 → int 변환 (원 단위). 실패 시 None."""
        if not amt_str:
            return None
        cleaned = amt_str.replace(",", "").strip()
        if cleaned in ("", "-", "N/A", "nan"):
            return None
        try:
            return int(cleaned)
        except:
            return None

    def _extract_metrics_from_items(self, items: list) -> dict:
        """
        DART fnlttSinglAcnt 응답 리스트에서 핵심 재무 지표 추출.
        연결재무제표(CFS) 우선, 없으면 별도(OFS) 사용.
        반환: { revenue, operating_income, net_income, total_assets, total_liabilities, total_equity }
        """
        # CFS 우선
        cfs = [i for i in items if i.get("fs_div") == "CFS"]
        target = cfs if cfs else items

        result = {}
        for item in target:
            acc = item.get("account_nm", "").replace(" ", "")
            amt = self._parse_amount(item.get("thstrm_amount", ""))
            if amt is None:
                continue
            if ("매출액" in acc or acc == "수익(매출액)") and "revenue" not in result:
                result["revenue"] = amt
            elif "영업이익" in acc and "operating_income" not in result:
                result["operating_income"] = amt
            elif "당기순이익" in acc and "net_income" not in result:
                result["net_income"] = amt
            elif "자산총계" in acc and "total_assets" not in result:
                result["total_assets"] = amt
            elif "부채총계" in acc and "total_liabilities" not in result:
                result["total_liabilities"] = amt
            elif "자본총계" in acc and "total_equity" not in result:
                result["total_equity"] = amt
        return result

    def get_full_data_for_financials(self, stock_code: str) -> dict:
        """
        ✅ [합법적 공공 데이터] DART 공식 API 기반 FinancialsTable full_data 구성
        
        네이버 스크래핑을 완전히 대체합니다.
        - 연간: 최근 4개 사업연도 (사업보고서 11011)
        - 분기: 최근 4개 분기 (1Q: 11014 / 2Q(반기): 11012 / 3Q: 11013 / 4Q는 연간에 포함)
        
        반환: {
          "success": True,
          "full_data": {
            "revenue":          { "dates": [...], "values": [...] },
            "operating_income": { "dates": [...], "values": [...] },
            "net_income":       { "dates": [...], "values": [...] },
            "operating_margin": { "dates": [...], "values": [...] },
            "net_income_margin":{ "dates": [...], "values": [...] },
            "debt_ratio":       { "dates": [...], "values": [...] },
            "roe":              { "dates": [...], "values": [...] },
          },
          "summary": { "per": ..., "pbr": ..., "roe": ... }
        }
        """
        if not self.is_available():
            return {"success": False, "error": "DART_API_KEY not set"}

        corp_code = self._load_corp_code(stock_code)
        if not corp_code:
            return {"success": False, "error": f"Corp code not found for {stock_code}"}

        import datetime
        current_year = datetime.datetime.now().year
        current_month = datetime.datetime.now().month

        # ─── 1. 연간 데이터 수집 (사업보고서 11011) ───────────────────────
        # 가장 최근 확정 연간 보고서 기준: 현재가 4월 이후면 작년 연보 포함, 이전이면 재작년부터
        annual_start_year = current_year - 1 if current_month >= 4 else current_year - 2
        annual_years = [str(annual_start_year - i) for i in range(4)]  # 최근→과거 순
        annual_years.reverse()  # 과거→최근 순

        annual_data = {}  # { "2022": {metrics}, ... }
        for year in annual_years:
            items = self.get_financial_sheets(corp_code, year, "11011")
            if items:
                metrics = self._extract_metrics_from_items(items)
                if metrics.get("revenue") is not None or metrics.get("operating_income") is not None:
                    annual_data[year] = metrics

        # ─── 2. 분기 데이터 수집 ──────────────────────────────────────────
        # 분기 보고서 코드: 11014=1분기(3월), 11012=반기(6월), 11013=3분기(9월)
        # 최신 연도부터 최근 4개 분기 수집
        quarter_schedule = []
        for y_offset in range(2):
            yr = str(current_year - y_offset)
            # 현재 월 기준으로 이미 공시된 분기만 포함
            if y_offset == 0:
                if current_month >= 11:  # 11월 이후: 3Q까지 공시
                    quarter_schedule.extend([
                        (yr, "11013", f"{yr}/09"),
                        (yr, "11012", f"{yr}/06"),
                        (yr, "11014", f"{yr}/03"),
                    ])
                elif current_month >= 8:  # 8월 이후: 2Q(반기)까지 공시
                    quarter_schedule.extend([
                        (yr, "11012", f"{yr}/06"),
                        (yr, "11014", f"{yr}/03"),
                    ])
                elif current_month >= 5:  # 5월 이후: 1Q까지 공시
                    quarter_schedule.extend([
                        (yr, "11014", f"{yr}/03"),
                    ])
                # 1~4월은 작년 3Q 이후 데이터 없음
            else:
                # 작년은 전체 3개 분기 포함
                quarter_schedule.extend([
                    (yr, "11013", f"{yr}/09"),
                    (yr, "11012", f"{yr}/06"),
                    (yr, "11014", f"{yr}/03"),
                ])

        quarterly_data = []  # [{ "label": "2025/03", metrics... }, ...]
        for (yr, reprt_code, label) in quarter_schedule:
            if len(quarterly_data) >= 4:
                break
            items = self.get_financial_sheets(corp_code, yr, reprt_code)
            if items:
                metrics = self._extract_metrics_from_items(items)
                if metrics.get("revenue") is not None or metrics.get("operating_income") is not None:
                    quarterly_data.append({"label": label, **metrics})

        # 과거→최근 순으로 정렬
        quarterly_data.sort(key=lambda x: x["label"])

        # ─── 3. full_data 조립 ─────────────────────────────────────────────
        # 연간 날짜 헤더 (예: 2022/12, 2023/12)
        ann_labels = [f"{y}/12" for y in sorted(annual_data.keys())]
        qtr_labels = [q["label"] for q in quarterly_data]
        all_labels = ann_labels + qtr_labels
        total = len(all_labels)

        if total == 0:
            return {"success": False, "error": "No data retrieved from DART"}

        def to_eok(val):
            """원 → 억원 변환"""
            if val is None:
                return None
            return round(val / 100_000_000, 2)

        def build_series(annual_key, quarterly_key=None):
            qkey = quarterly_key or annual_key
            ann_vals = [to_eok(annual_data.get(y, {}).get(annual_key)) for y in sorted(annual_data.keys())]
            qtr_vals = [to_eok(q.get(qkey)) for q in quarterly_data]
            return {"dates": all_labels, "values": ann_vals + qtr_vals}

        full_data = {}
        full_data["revenue"]          = build_series("revenue")
        full_data["operating_income"] = build_series("operating_income")
        full_data["net_income"]       = build_series("net_income")

        # 영업이익률 (%)
        margin_vals = []
        for i, label in enumerate(all_labels):
            if i < len(ann_labels):
                yr = sorted(annual_data.keys())[i] if i < len(annual_data) else None
                r = annual_data.get(yr, {}).get("revenue") if yr else None
                o = annual_data.get(yr, {}).get("operating_income") if yr else None
            else:
                qi = i - len(ann_labels)
                r = quarterly_data[qi].get("revenue") if qi < len(quarterly_data) else None
                o = quarterly_data[qi].get("operating_income") if qi < len(quarterly_data) else None
            if r and o and r != 0:
                margin_vals.append(round((o / r) * 100, 2))
            else:
                margin_vals.append(None)
        full_data["operating_margin"] = {"dates": all_labels, "values": margin_vals}

        # 순이익률 (%)
        net_margin_vals = []
        for i, label in enumerate(all_labels):
            if i < len(ann_labels):
                yr = sorted(annual_data.keys())[i] if i < len(annual_data) else None
                r = annual_data.get(yr, {}).get("revenue") if yr else None
                n = annual_data.get(yr, {}).get("net_income") if yr else None
            else:
                qi = i - len(ann_labels)
                r = quarterly_data[qi].get("revenue") if qi < len(quarterly_data) else None
                n = quarterly_data[qi].get("net_income") if qi < len(quarterly_data) else None
            if r and n and r != 0:
                net_margin_vals.append(round((n / r) * 100, 2))
            else:
                net_margin_vals.append(None)
        full_data["net_income_margin"] = {"dates": all_labels, "values": net_margin_vals}

        # 부채비율 (%) - 연간 + 분기 (분기 대차대조표 데이터가 있는 경우)
        debt_vals = []
        for yr in sorted(annual_data.keys()):
            l = annual_data[yr].get("total_liabilities")
            e = annual_data[yr].get("total_equity")
            if l is not None and e and e != 0:
                debt_vals.append(round((l / e) * 100, 2))
            else:
                debt_vals.append(None)
        # 분기: total_liabilities와 total_equity가 수집된 경우 계산, 없으면 None
        for q in quarterly_data:
            l_q = q.get("total_liabilities")
            e_q = q.get("total_equity")
            if l_q is not None and e_q and e_q != 0:
                debt_vals.append(round((l_q / e_q) * 100, 2))
            else:
                debt_vals.append(None)
        full_data["debt_ratio"] = {"dates": all_labels, "values": debt_vals}

        # total_equity 시계열 (억원) - EPS/BPS 계산에 필요
        eq_ann_vals = [to_eok(annual_data.get(y, {}).get("total_equity")) for y in sorted(annual_data.keys())]
        eq_qtr_vals = [to_eok(q.get("total_equity")) for q in quarterly_data]
        full_data["total_equity"] = {"dates": all_labels, "values": eq_ann_vals + eq_qtr_vals}

        # ROE (%) - 연간 + 분기 (데이터가 있는 경우)
        roe_vals = []
        for yr in sorted(annual_data.keys()):
            n = annual_data[yr].get("net_income")
            e = annual_data[yr].get("total_equity")
            if n is not None and e and e != 0:
                roe_vals.append(round((n / e) * 100, 2))
            else:
                roe_vals.append(None)
        for q in quarterly_data:
            n_q = q.get("net_income")
            e_q = q.get("total_equity")
            if n_q is not None and e_q and e_q != 0:
                roe_vals.append(round((n_q / e_q) * 100, 2))
            else:
                roe_vals.append(None)
        full_data["roe"] = {"dates": all_labels, "values": roe_vals}

        # ─── 4. 요약 정보 (최신 연간 기준) ───────────────────────────────
        latest_annual = annual_data.get(sorted(annual_data.keys())[-1], {}) if annual_data else {}
        rev_latest = latest_annual.get("revenue")
        oi_latest = latest_annual.get("operating_income")
        ni_latest = latest_annual.get("net_income")
        l_latest = latest_annual.get("total_liabilities")
        e_latest = latest_annual.get("total_equity")

        summary_roe = round((ni_latest / e_latest) * 100, 2) if ni_latest and e_latest else None
        summary_debt = round((l_latest / e_latest) * 100, 2) if l_latest and e_latest else None

        return {
            "success": True,
            "full_data": full_data,
            "summary": {
                "revenue_eok": to_eok(rev_latest),
                "operating_income_eok": to_eok(oi_latest),
                "net_income_eok": to_eok(ni_latest),
                "debt_ratio": summary_debt,
                "roe": summary_roe,
            },
            "source": "dart_official_api"  # 합법적 데이터 출처 표시
        }

    def get_large_holding_disclosures(self, days_ago: int = 0) -> List[Dict]:
        """
        🐳 지분 5%+ 대량보유상황보고서 조회
        - DART 공시 목록에서 '주식등의대량보유상황보고서' 키워드로 필터링
        - 반환: [{ corp_name, report_nm, rcept_no, link, rcept_dt }, ...]
        """
        all_disclosures = self.get_realtime_disclosures(days_ago=days_ago)
        KEYWORDS = ["대량보유", "주식등의대량보유상황보고서", "대량보유상황"]
        result = []
        for d in all_disclosures:
            report_nm = d.get("report_nm", "")
            if any(kw in report_nm for kw in KEYWORDS):
                result.append(d)
        return result

    def get_insider_trading_disclosures(self, days_ago: int = 0) -> List[Dict]:
        """
        🚨 임원/주요주주 내부자 거래 공시 조회
        - DART 공시 목록에서 '임원ㆍ주요주주특정증권등소유상황보고서' 키워드로 필터링
        - 반환: [{ corp_name, report_nm, rcept_no, link, rcept_dt }, ...]
        """
        all_disclosures = self.get_realtime_disclosures(days_ago=days_ago)
        KEYWORDS = ["임원", "주요주주", "소유상황보고서", "임원소유"]
        result = []
        for d in all_disclosures:
            report_nm = d.get("report_nm", "")
            if any(kw in report_nm for kw in KEYWORDS):
                result.append(d)
        return result


# ─── 전역 단일 인스턴스 ──────────────────────────────────────────────────────
dart_api_client = DartApiClient()
