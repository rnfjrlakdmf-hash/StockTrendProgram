"""
News Alert Monitor (관심종목 뉴스 알림 모니터)
사용자의 관심종목에 새로운 뉴스나 특이 공시가 뜰 경우 푸시 알림을 발송합니다.
"""

import asyncio
import requests
from typing import Dict, List, Set
from db_manager import get_db_connection
from stock_data import get_korean_stock_name

class NewsAlertMonitor:
    def __init__(self):
        self.running = False
        self.check_interval = 300  # 5분(300초)마다 체크
        self.last_seen_articles = {}  # {symbol: last_article_id}
        self.is_first_run = True

    async def start(self):
        """뉴스 모니터링 시작"""
        print("[NewsAlert] Monitor started")
        self.running = True
        
        while self.running:
            try:
                await self.check_all_news()
            except Exception as e:
                print(f"[NewsAlert] Error in monitoring loop: {e}")
            
            await asyncio.sleep(self.check_interval)
            
    def stop(self):
        self.running = False
        print("[NewsAlert] Monitor stopped")

    async def check_all_news(self):
        """관심종목의 최신 뉴스 체크"""
        # 1. FCM 토큰이 있는 유저의 관심종목 가져오기
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # FCM 토큰이 있는 활성 사용자의 관심종목만 가져옴
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
            
        # 2. 각 심볼별로 네이버 뉴스 확인
        for symbol, users in symbol_users.items():
            # 미국 주식은 포맷이 다르므로 일단 한국 주식(숫자 6자리)만 지원
            if not symbol.isdigit() or len(symbol) != 6:
                continue
                
            await self.check_symbol_news(symbol, users)
            
        # 첫 번째 실행 완료 마킹 (초기화)
        if self.is_first_run:
            self.is_first_run = False
            print("[NewsAlert] First run complete (initialized states)")

    async def check_symbol_news(self, symbol: str, users: List[str]):
        """특정 종목의 최신 뉴스 1건을 확인하고 변경 시 알림 발송"""
        def _fetch_news():
            try:
                url = f"https://m.stock.naver.com/api/news/stock/{symbol}?pageSize=1"
                headers = {'User-Agent': 'Mozilla/5.0'}
                res = requests.get(url, headers=headers, timeout=5)
                data = res.json()
                if data and len(data) > 0 and 'items' in data[0] and len(data[0]['items']) > 0:
                    return data[0]['items'][0]
                return None
            except Exception as e:
                return None

        news_item = await asyncio.to_thread(_fetch_news)
        if not news_item:
            return
            
        article_id = news_item.get('articleId')
        if not article_id:
            return
            
        # 첫 실행이면 상태만 기록하고 알림 발송 안함 (폭탄 방지)
        if self.is_first_run:
            self.last_seen_articles[symbol] = article_id
            return
            
        # 새로운 기사인 경우!
        if self.last_seen_articles.get(symbol) != article_id:
            self.last_seen_articles[symbol] = article_id
            
            # 푸시 알림 발송
            await self.send_news_push(symbol, news_item, users)
            
    async def send_news_push(self, symbol: str, news_item: dict, users: List[str]):
        """유저들에게 새로운 뉴스 푸시 알림 발송"""
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_user_fcm_tokens
            
            stock_name = get_korean_stock_name(symbol) or symbol
            title = news_item.get('title', '새로운 소식')
            office_name = news_item.get('officeName', '뉴스')
            
            # FCM 알림 메시지 구성
            push_title = f"📰 {stock_name} 속보!"
            push_body = f"[{office_name}] {title}"
            
            # 발송할 토큰 모두 수집
            all_tokens = []
            for user_id in users:
                tokens_data = get_user_fcm_tokens(user_id)
                for t in tokens_data:
                    all_tokens.append(t['token'])
                    
            if not all_tokens:
                return
                
            # 여러 기기에 동시 발송
            result = send_multicast_notification(
                tokens=all_tokens,
                title=push_title,
                body=push_body,
                data={
                    "type": "news_alert",
                    "symbol": symbol,
                    "url": f"/discovery?symbol={symbol}"
                }
            )
            
            if result.get('success'):
                print(f"[NewsAlert] Sent news for {stock_name} to {result.get('success_count')} devices")
                
        except Exception as e:
            print(f"[NewsAlert] Push notification error: {e}")

# 전역 인스턴스
news_alert_monitor = NewsAlertMonitor()
