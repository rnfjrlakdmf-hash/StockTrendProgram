# -*- coding: utf-8 -*-
# [Commercial Protection] 한국투자증권(KIS) API v1 전면 비활성화 (법적 리스크 원천 차단)
# 상업적 출시 및 라이선스 위반 방지를 위해 모든 통신 기능을 중단하며, 안전한 더미 메서드를 제공합니다.

class KisApi:
    def __init__(self, app_key=None, app_secret=None, account=None, allow_mock=False):
        self.app_key = app_key
        self.app_secret = app_secret
        self.account = account
        self.allow_mock = allow_mock

    def get_balance(self):
        return None

    def get_approval_key(self):
        return None

    def get_access_token(self):
        return None

    def get_current_price(self, symbol: str):
        return None

    def get_fluctuation_rank(self, sort_type="0"):
        return []

    def place_order(self, symbol: str, order_type: str, price: int, qty: int):
        return {"status": "error", "msg": "상업용 라이선스 정책에 따라 KIS API 주문 연동이 비활성화되었습니다."}
