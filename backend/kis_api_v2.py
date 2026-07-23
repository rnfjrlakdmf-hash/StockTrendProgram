# -*- coding: utf-8 -*-
# [Commercial Protection] 한국투자증권(KIS) API v2 전면 비활성화 (법적 리스크 원천 차단)
# 상업적 출시 및 라이선스 위반 방지를 위해 모든 통신 기능을 중단하며, 안전한 더미 메서드를 제공합니다.

class KisApiV2:
    def __init__(self):
        self.app_key = ""
        self.app_secret = ""

    def is_available(self) -> bool:
        # 무조건 False 반환하여 KIS API 사용을 차단하고 Fallback을 강제 적용합니다.
        return False

    def get_access_token(self):
        return None

    def get_current_price(self, symbol: str):
        return None

    def get_daily_prices(self, symbol: str, limit: int = 30):
        return []

    def get_fluctuation_rank(self, sort_type: str = "0"):
        return []

# 싱글톤 인스턴스 제공
kis_api_v2 = KisApiV2()
