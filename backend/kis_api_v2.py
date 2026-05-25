import os
import time
import requests
from typing import Dict, List, Optional

class KisApiV2:
    """
    📈 한국투자증권(KIS) Open API v2 클라이언트 (시세 조회 전용)
    ────────────────────────────────────────────────────────
    공식 API를 사용하여 실시간 주가, 일봉 차트, 거래 랭킹 등을 수집합니다.
    """
    
    BASE_URL_REAL = "https://openapi.koreainvestment.com:9443"

    # 토큰 공유 캐시
    _access_token: Optional[str] = None
    _token_expired_at: float = 0.0

    def __init__(self):
        # 환경변수 로드 (.env)
        self.app_key = os.getenv("KIS_APPKEY", "").strip()
        self.app_secret = os.getenv("KIS_SECRET", "").strip()

    def is_available(self) -> bool:
        """API 키가 유효하게 존재하는지 확인"""
        return len(self.app_key) > 0 and len(self.app_secret) > 0

    def get_access_token(self) -> Optional[str]:
        """
        🔑 KIS Access Token 발급 및 갱신 (유효기간 24시간 자동 캐싱)
        """
        if not self.is_available():
            return None

        now = time.time()
        # 캐싱된 토큰 유효 시 즉시 반환
        if KisApiV2._access_token and now < KisApiV2._token_expired_at:
            return KisApiV2._access_token

        url = f"{self.BASE_URL_REAL}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }

        try:
            res = requests.post(url, json=body, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if "access_token" in data:
                    KisApiV2._access_token = data["access_token"]
                    # 만료 시간 설정 (안전 마진 60초)
                    KisApiV2._token_expired_at = now + int(data["expires_in"]) - 60
                    print(f"[KIS-API] 🔑 토큰 발급 성공. (유효시간: {data['expires_in']}초)")
                    return KisApiV2._access_token
                else:
                    print(f"[KIS-API] 토큰 발급 응답 오류: {data}")
            else:
                print(f"[KIS-API] 토큰 요청 HTTP 오류: {res.status_code}")
        except Exception as e:
            print(f"[KIS-API] 토큰 요청 예외 발생: {e}")

        return None

    def get_current_price(self, symbol: str) -> Optional[Dict]:
        """
        💰 개별 국내 주식 실시간 시세 및 전일 대비 정보
        - symbol: 6자리 종목코드 (예: '005930')
        """
        token = self.get_access_token()
        if not token:
            return None

        clean_symbol = symbol.split('.')[0]
        url = f"{self.BASE_URL_REAL}/uapi/domestic-stock/v1/quotations/inquire-price"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHKST01010100"  # 국내주식 현재가 조회 TR ID
        }
        params = {
            "fid_cond_mrkt_div_code": "J",  # J: 주식
            "fid_input_iscd": clean_symbol
        }

        try:
            res = requests.get(url, headers=headers, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("rt_cd") == "0":
                    output = data.get("output", {})
                    # stck_prpr (현재가), prdy_vrss (전일대비금액), prdy_ctrt (등락률)
                    return {
                        "symbol": symbol,
                        "price": int(output.get("stck_prpr", 0)),
                        "change_amt": int(output.get("prdy_vrss", 0)),
                        "change_rate": float(output.get("prdy_ctrt", 0.0)),
                        "high": int(output.get("stck_hgpr", 0)),
                        "low": int(output.get("stck_lwpr", 0)),
                        "volume": int(output.get("acml_vol", 0)),
                        "value": int(output.get("acml_tr_pbmn", 0))  # 누적 거래대금
                    }
                else:
                    print(f"[KIS-API] 시세 조회 오류 ({symbol}): {data.get('msg1')}")
            else:
                print(f"[KIS-API] 시세 조회 HTTP 오류: {res.status_code}")
        except Exception as e:
            print(f"[KIS-API] 시세 조회 예외 발생: {e}")

        return None

    def get_daily_prices(self, symbol: str, limit: int = 30) -> List[Dict]:
        """
        📅 국내 주식 일봉 데이터 목록 조회 (차트용)
        - symbol: 6자리 종목코드
        - limit: 조회할 과거 거래일 수
        """
        token = self.get_access_token()
        if not token:
            return []

        clean_symbol = symbol.split('.')[0]
        url = f"{self.BASE_URL_REAL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHKST03010100"  # 주식 일별/주별/월별 차트실시 조회
        }
        
        # 오늘 날짜와 N일 전 날짜 설정
        from datetime import datetime, timedelta
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=limit * 2)).strftime("%Y%m%d")  # 여유있게 2배 범위

        params = {
            "fid_cond_mrkt_div_code": "J",
            "fid_input_iscd": clean_symbol,
            "fid_input_date_1": start_date,
            "fid_input_date_2": end_date,
            "fid_period_div_code": "D",     # D: 일별
            "fid_org_adpr_prc_yn": "Y"      # Y: 수정주가 반영
        }

        try:
            res = requests.get(url, headers=headers, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("rt_cd") == "0":
                    output2 = data.get("output2", [])
                    parsed_days = []
                    for item in output2[:limit]:
                        # 날짜 변환 (YYYYMMDD -> YYYY-MM-DD)
                        raw_date = item.get("stck_bsop_date")
                        date_formatted = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}" if len(raw_date) == 8 else raw_date
                        
                        parsed_days.append({
                            "date": date_formatted,
                            "open": int(item.get("stck_oprc", 0)),
                            "high": int(item.get("stck_hgpr", 0)),
                            "low": int(item.get("stck_lwpr", 0)),
                            "close": int(item.get("stck_clpr", 0)),
                            "volume": int(item.get("acml_vol", 0))
                        })
                    return parsed_days
                else:
                    print(f"[KIS-API] 일봉 조회 오류 ({symbol}): {data.get('msg1')}")
            else:
                print(f"[KIS-API] 일봉 조회 HTTP 오류: {res.status_code}")
        except Exception as e:
            print(f"[KIS-API] 일봉 조회 예외 발생: {e}")

        return []

    def get_fluctuation_rank(self, sort_type: str = "0") -> List[Dict]:
        """
        🔥 등락률 랭킹 조회
        - sort_type: "0" (상승률 순), "1" (하락률 순)
        """
        token = self.get_access_token()
        if not token:
            return []

        url = f"{self.BASE_URL_REAL}/uapi/domestic-stock/v1/ranking/fluctuation"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHPST01700000",
            "custtype": "P"
        }
        params = {
            "fid_cond_mrkt_div_code": "J",
            "fid_cond_scr_div_code": "20170",
            "fid_input_iscd": "0000",
            "fid_rank_sort_cls_code": sort_type,
            "fid_prc_cls_code": "0",
            "fid_input_price_1": "",
            "fid_input_price_2": "",
            "fid_vol_cls_code": "",
            "fid_trgt_cls_code": "0",
            "fid_trgt_exls_cls_code": "0",
            "fid_div_cls_code": "0",
            "fid_rsfl_rate1": "",
            "fid_rsfl_rate2": ""
        }

        try:
            res = requests.get(url, headers=headers, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("rt_cd") == "0":
                    output = data.get("output", [])
                    parsed = []
                    for idx, item in enumerate(output[:10]):
                        parsed.append({
                            "rank": idx + 1,
                            "symbol": item.get("stck_shrn_iscd"),
                            "name": item.get("hts_kor_isnm"),
                            "price": int(item.get("stck_prpr", 0)),
                            "change_rate": float(item.get("prdy_ctrt", 0.0))
                        })
                    return parsed
        except Exception as e:
            print(f"[KIS-API] 등락 랭킹 예외 발생: {e}")

        return []

# ─── 전역 단일 인스턴스 ──────────────────────────────────────────────────────
kis_api_v2 = KisApiV2()
