"""
Auto Price Alert Monitor (자동 시세 알림 모니터)
관심종목의 급등/급락(5%) 및 52주 신고가 도달 시 자동으로 푸시 알림을 발송합니다.
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Set
import yfinance as yf
from db_manager import get_db_connection
from stock_data import get_korean_stock_name

class AutoPriceMonitor:
    def __init__(self):
        self.running = False
        self.check_interval = 300  # 5분(300초)마다 체크
        # 알림 발송 기록: { "YYYY-MM-DD": { "005930": {"up_5": True, "down_5": True, "high_52": True} } }
        self.notified_events = {}

    async def start(self):
        """모니터링 시작"""
        print("[AutoPriceAlert] Monitor started")
        self.running = True
        
        while self.running:
            try:
                await self.check_all_symbols()
            except Exception as e:
                print(f"[AutoPriceAlert] Error in monitoring loop: {e}")
            
            await asyncio.sleep(self.check_interval)

    def stop(self):
        self.running = False
        print("[AutoPriceAlert] Monitor stopped")

    def _get_today_str(self):
        return datetime.now().strftime("%Y-%m-%d")

    async def check_all_symbols(self):
        """모든 관심종목의 현재 시세 및 자동 조건 체크"""
        today_str = self._get_today_str()
        
        # 오늘자 초기화
        if today_str not in self.notified_events:
            self.notified_events = {today_str: {}}

        # FCM 토큰이 있는 활성 사용자의 관심종목만 가져옴
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT w.user_id, w.symbol 
            FROM watchlist w
            JOIN fcm_tokens f ON w.user_id = f.user_id
        """)
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return

        # 심볼별 유저 리스트 매핑
        symbol_users = {}
        for user_id, symbol in rows:
            if symbol not in symbol_users:
                symbol_users[symbol] = []
            symbol_users[symbol].append(user_id)

        # 병렬로 각 심볼 시세 체크
        async def check_single_symbol(symbol, users):
            try:
                await self.check_and_alert(symbol, users, today_str)
            except Exception as e:
                print(f"[AutoPriceAlert] Error checking {symbol}: {e}")

        tasks = [check_single_symbol(sym, users) for sym, users in symbol_users.items()]
        if tasks:
            await asyncio.gather(*tasks)

    async def check_and_alert(self, symbol: str, users: List[str], today_str: str):
        """단일 종목의 가격을 조회하고 알림 조건 검사"""
        def _fetch_price_data():
            try:
                # 한국 주식 지원
                yf_sym = f"{symbol}.KS" if (symbol.isdigit() and len(symbol) == 6) else symbol
                ticker = yf.Ticker(yf_sym)
                
                # fast_info를 통해 매우 빠르게 이전 종가, 현재가, 52주 최고가 조회
                current = ticker.fast_info.last_price
                prev_close = ticker.fast_info.previous_close
                high_52 = ticker.fast_info.year_high
                
                # yfinance에서 코스닥 종목을 못 찾았을 경우 .KQ로 재시도
                if current is None or current == 0:
                    if symbol.isdigit() and len(symbol) == 6:
                        yf_sym = f"{symbol}.KQ"
                        ticker = yf.Ticker(yf_sym)
                        current = ticker.fast_info.last_price
                        prev_close = ticker.fast_info.previous_close
                        high_52 = ticker.fast_info.year_high

                return current, prev_close, high_52
            except Exception:
                return None, None, None

        current, prev_close, high_52 = await asyncio.to_thread(_fetch_price_data)
        
        if not current or not prev_close:
            return

        # 상태 딕셔너리 초기화
        if symbol not in self.notified_events[today_str]:
            self.notified_events[today_str][symbol] = {"up_5": False, "down_5": False, "high_52": False}
        
        state = self.notified_events[today_str][symbol]
        
        # 1. 등락률 계산
        change_pct = ((current - prev_close) / prev_close) * 100
        
        alerts_to_send = []

        # 🚀 5% 이상 상승 포착 (오늘 알림을 안 보낸 경우)
        if change_pct >= 5.0 and not state["up_5"]:
            state["up_5"] = True
            alerts_to_send.append({
                "title": "🚀 급등 포착",
                "body": f"주식 가격이 {change_pct:.1f}% 올랐어요! ({int(current):,}원)" if current >= 100 else f"주식 가격이 {change_pct:.1f}% 올랐어요! (${current:.2f})",
                "type": "surge"
            })

        # 📉 5% 이상 하락 포착
        elif change_pct <= -5.0 and not state["down_5"]:
            state["down_5"] = True
            alerts_to_send.append({
                "title": "📉 급락 포착",
                "body": f"주식 가격이 {abs(change_pct):.1f}% 떨어졌어요. ({int(current):,}원)" if current >= 100 else f"주식 가격이 {abs(change_pct):.1f}% 떨어졌어요. (${current:.2f})",
                "type": "drop"
            })

        # 🏆 52주 신고가 근접/돌파 포착 (1% 이내)
        if high_52 and current >= high_52 * 0.99 and not state["high_52"]:
            state["high_52"] = True
            alerts_to_send.append({
                "title": "🏆 신고가 경신",
                "body": f"최근 1년 중 최고가를 기록했어요! ({int(current):,}원)" if current >= 100 else f"최근 1년 중 최고가를 기록했어요! (${current:.2f})",
                "type": "high_52"
            })

        # 알림 발송
        for alert in alerts_to_send:
            await self.send_auto_push(symbol, alert["title"], alert["body"], users)

    async def send_auto_push(self, symbol: str, title_prefix: str, body: str, users: List[str]):
        """유저들에게 자동 가격 푸시 알림 발송"""
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_user_fcm_tokens
            
            stock_name = get_korean_stock_name(symbol) or symbol
            push_title = f"{title_prefix} ({stock_name})"
            
            all_tokens = []
            for user_id in users:
                tokens_data = get_user_fcm_tokens(user_id)
                for t in tokens_data:
                    all_tokens.append(t['token'])
                    
            if not all_tokens:
                return
                
            send_multicast_notification(
                tokens=all_tokens,
                title=push_title,
                body=body,
                data={
                    "type": "auto_price_alert",
                    "symbol": symbol,
                    "url": f"/discovery?symbol={symbol}"
                }
            )
            print(f"[AutoPriceAlert] Sent '{title_prefix}' for {stock_name} to {len(all_tokens)} devices")
            
        except Exception as e:
            print(f"[AutoPriceAlert] Push error: {e}")

# 전역 인스턴스
auto_price_monitor = AutoPriceMonitor()
