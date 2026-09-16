# -*- coding: utf-8 -*-
"""
장마감 수급 퀀트 스캐너 실시간 시세 알림 모니터
- 5% 변동 도달 및 1차 기술적 벤치마크선(+10%) 도달 시 실시간 알림 발송
- 자본시장법 준수: 일체의 매수/매도/익절/손절 권유 없이 객관적 시세 수치와 통계 팩트만 전달
"""

import os
import json
import asyncio
import logging
import urllib.request
from datetime import datetime
import pytz

from holiday_checker import is_holiday, is_market_open_hours

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://m.stock.naver.com/'
}

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CACHE_FILE = os.path.join(DATA_DIR, "quant_scanner_alerts_sent.json")


class QuantScannerAlertMonitor:
    def __init__(self):
        self.running = False
        self.check_interval = 60  # 정규장 중 60초 간격 점검
        self.notified_events = self._load_notified_events()

    def _get_today_str(self):
        kst = pytz.timezone('Asia/Seoul')
        return datetime.now(kst).strftime("%Y-%m-%d")

    def _load_notified_events(self) -> dict:
        """재기동 시 당일 중복 발송 방지를 위해 캐시 로드"""
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    today_str = self._get_today_str()
                    # 당일 기록만 유지
                    return {k: v for k, v in data.items() if k.startswith(today_str)}
        except Exception as e:
            logger.warning(f"[QuantAlert] Failed to load cache: {e}")
        return {}

    def _save_notified_events(self):
        """발송 기록 저장"""
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.notified_events, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"[QuantAlert] Failed to save cache: {e}")

    async def start(self):
        """실시간 모니터링 데몬 시작"""
        print("[QuantAlert] 🚀 Quant Scanner Alert Monitor daemon started.")
        self.running = True

        # 서버 기동 직후 15초 대기 후 시작
        await asyncio.sleep(15)

        while self.running:
            try:
                # 1. 한국 증시 휴장일 및 정규장(09:00 ~ 15:30) 운영 여부 검사
                if not is_holiday("kor") and is_market_open_hours("kor"):
                    await self.check_quant_targets()
                else:
                    # 장마감 또는 휴장 시간일 때는 5분 대기
                    await asyncio.sleep(300)
                    continue
            except Exception as e:
                print(f"[QuantAlert] Error in monitoring cycle: {e}")

            await asyncio.sleep(self.check_interval)

    def stop(self):
        self.running = False
        print("[QuantAlert] Monitor daemon stopped.")

    def _fetch_realtime_price(self, code: str):
        """네이버 모바일 일별 시세 API에서 당일 체결가 및 고가 조회"""
        try:
            url = f"https://m.stock.naver.com/api/stock/{code}/price?pageSize=2"
            req = urllib.request.Request(url, headers=HEADERS)
            res = urllib.request.urlopen(req, timeout=3)
            data = json.loads(res.read().decode('utf-8'))
            if data and len(data) > 0:
                item = data[0]
                close_price = int(str(item.get('closePrice', '0')).replace(',', ''))
                high_price = int(str(item.get('highPrice', '0')).replace(',', ''))
                fluc_str = str(item.get('fluctuationsRatio', '0')).replace(',', '')
                try:
                    fluctuations_ratio = float(fluc_str)
                except ValueError:
                    fluctuations_ratio = 0.0
                return close_price, high_price, fluctuations_ratio
        except Exception as e:
            logger.debug(f"[QuantAlert] Failed to fetch price for {code}: {e}")
        return None, None, None

    async def check_quant_targets(self):
        """스캐너 최근 포착 종목들의 시세를 검사하고 도달 알림 발송"""
        today_str = self._get_today_str()

        # 스캐너 데이터 생성기 호출 (스레드에서 안전하게 실행)
        try:
            from routes.closing_scanner import generate_closing_scanner_data
            scanner_data = await asyncio.to_thread(generate_closing_scanner_data)
        except Exception as e:
            print(f"[QuantAlert] Failed to load scanner data: {e}")
            return

        # 모니터링 대상 종목 수집: 0일전(오늘) 및 최근 1~3일전 포착 종목들
        candidate_items = {}
        for d_idx in [0, 1, 2, 3]:
            day_group = scanner_data.get(d_idx, {})
            items = day_group.get("items", [])
            for item in items:
                code = item.get("code")
                # 가장 최근 포착 기준(낮은 d_idx)을 우선 반영
                if code and code not in candidate_items:
                    candidate_items[code] = item

        if not candidate_items:
            return

        for code, item in candidate_items.items():
            entry_price = item.get("entryPrice", 0)
            resistance_price = item.get("resistancePrice", 0)
            name = item.get("name", code)

            if entry_price <= 0:
                continue

            # 실시간 시세 조회
            current_price, high_price, day_fluc = await asyncio.to_thread(self._fetch_realtime_price, code)
            if not current_price or current_price <= 0:
                continue

            effective_high = max(current_price, high_price or current_price)

            # 포착가 대비 변동률 계산
            current_return = round(((current_price - entry_price) / entry_price) * 100, 1)
            high_return = round(((effective_high - entry_price) / entry_price) * 100, 1)

            # 1. 5% 도달 검사 (+5.0% 이상 변동 도달)
            key_5pct = f"{today_str}_{code}_5pct"
            if high_return >= 5.0 and not self.notified_events.get(key_5pct):
                self.notified_events[key_5pct] = True
                self._save_notified_events()

                title = f"📢 [퀀트 시세] {name} +5.0% 변동 도달"
                body = (
                    f"수급 퀀트 포착가({entry_price:,}원) 대비 실시간 현재가({current_price:,}원, +{current_return:+.1f}%) 도달이 확인되었습니다.\n"
                    f"장중 최고가: {effective_high:,}원 (+{high_return:+.1f}%)\n"
                    f"※ 본 알림은 기계적 시세 도달 통계이며 투자 권유가 아닙니다."
                )
                await self._broadcast_alert(code=code, name=name, title=title, body=body, alert_sub_type="quant_5pct")

            # 2. 1차 저항선 도달 검사 (+10% 벤치마크선 도달)
            key_10pct = f"{today_str}_{code}_10pct"
            if resistance_price > 0 and effective_high >= resistance_price and not self.notified_events.get(key_10pct):
                self.notified_events[key_10pct] = True
                self._save_notified_events()

                title = f"🎯 [퀀트 통계] {name} 1차 벤치마크선 도달 확인"
                body = (
                    f"수급 퀀트 1차 기술적 벤치마크선({resistance_price:,}원)에 장중 도달했습니다.\n"
                    f"현재가 {current_price:,}원 / 장중 최고가: {effective_high:,}원 (+{high_return:+.1f}%)\n"
                    f"※ 본 알림은 알고리즘 통계 검증이며 투자 권유가 아닙니다."
                )
                await self._broadcast_alert(code=code, name=name, title=title, body=body, alert_sub_type="quant_10pct")

    async def _broadcast_alert(self, code: str, name: str, title: str, body: str, alert_sub_type: str):
        """푸시 알림, Firestore 알림 센터, 텔레그램으로 안전 발송"""
        print(f"[QuantAlert] 🔔 Triggered: {title}")

        # 1. FCM 푸시 알림 발송
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_all_fcm_tokens

            tokens = await asyncio.to_thread(get_all_fcm_tokens)
            if tokens:
                push_data = {
                    "type": "quant_scanner",
                    "sub_type": alert_sub_type,
                    "symbol": code,
                    "name": name,
                    "url": "/scanner",
                    "is_global": "true"
                }
                res = await asyncio.to_thread(
                    send_multicast_notification,
                    tokens=tokens,
                    title=title,
                    body=body,
                    data=push_data
                )
                print(f"[QuantAlert] FCM broadcast result: {res.get('success', False)}")
        except Exception as e:
            print(f"[QuantAlert] FCM broadcast error: {e}")

        # 2. 텔레그램 알림 발송 (HTML 포맷)
        try:
            from telegram_service import send_telegram_teaser
            tg_text = (
                f"<b>{title}</b>\n\n"
                f"{body.replace(chr(10), '<br>')}\n\n"
                f"👉 <a href='https://stock-trend-program.co.kr/scanner'>장마감 수급 퀀트 스캐너에서 통계 확인하기</a>"
            )
            await asyncio.to_thread(send_telegram_teaser, tg_text, alert_type="quant_scanner")
        except Exception as e:
            logger.debug(f"[QuantAlert] Telegram teaser error: {e}")


# 싱글톤 인스턴스
quant_scanner_alert_monitor = QuantScannerAlertMonitor()
