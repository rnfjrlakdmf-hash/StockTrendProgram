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
            
        # 2. 각 심볼별로 뉴스 확인
        for symbol, users in symbol_users.items():
            await self.check_symbol_news(symbol, users)
            await asyncio.sleep(2)  # 구글/네이버 차단 방지를 위한 2초 대기
            
        # 첫 번째 실행 완료 마킹 (초기화)
        if self.is_first_run:
            self.is_first_run = False
            print("[NewsAlert] First run complete (initialized states)")

    async def check_symbol_news(self, symbol: str, users: List[str]):
        """특정 종목의 최신 뉴스 1건을 확인하고 변경 시 알림 발송"""
        from stock_data import get_korean_stock_name, fetch_google_news, GLOBAL_KOREAN_NAMES
        
        stock_name = get_korean_stock_name(symbol) or GLOBAL_KOREAN_NAMES.get(symbol, symbol)
        
        def _fetch_news():
            news_items = []
            
            def _get_abbreviations(name):
                abbrs = {name}
                if name.endswith("중공업"): abbrs.add(name[:-3] + "重")
                elif name.endswith("전자"): abbrs.update([name[:-2] + "전", name[:-2] + "電"])
                elif name.endswith("자동차"): abbrs.add(name[:-3] + "차")
                elif name.endswith("바이오로직스"): abbrs.add(name[:-5] + "바이오")
                elif name == "카카오뱅크": abbrs.add("카뱅")
                elif name == "카카오페이": abbrs.add("카페")
                elif name == "SK하이닉스": abbrs.add("하이닉스")
                return abbrs

            valid_names = _get_abbreviations(stock_name)
            
            def _is_relevant(title):
                # US tickers or general names check
                if not stock_name: return True
                for vn in valid_names:
                    if vn in title:
                        return True
                return False
            
            # 1. 네이버 뉴스 (한국 주식인 경우만)
            clean_sym = symbol.split('.')[0] if '.' in symbol else symbol
            if clean_sym.isdigit() and len(clean_sym) == 6:
                try:
                    url = f"https://m.stock.naver.com/api/news/stock/{clean_sym}?pageSize=1"
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    res = requests.get(url, headers=headers, timeout=5)
                    data = res.json()
                    if data and len(data) > 0 and 'items' in data[0] and len(data[0]['items']) > 0:
                        item = data[0]['items'][0]
                        n_title = item.get('title', '')
                        
                        # [Fix] 깐깐한 필터링: 제목에 종목명이나 약어가 없으면 그룹사 공통 뉴스일 수 있으므로 차단
                        if _is_relevant(n_title):
                            news_items.append({
                                'id': item.get('articleId'),
                                'title': n_title,
                                'publisher': item.get('officeName', '네이버 뉴스'),
                                'source': 'naver'
                            })
                        else:
                            print(f"[NewsAlert] Filtered irrelevant Naver News for {stock_name}: {n_title}")
                except: pass
                
            # 2. 구글 뉴스 (모든 주식)
            try:
                # 검색어 최적화: "삼성전자 주식" 또는 "애플 주식"
                search_query = f"{stock_name} 주식" if not stock_name.endswith('주식') else stock_name
                g_news = fetch_google_news(search_query)
                if g_news and len(g_news) > 0:
                    top_g = g_news[0]
                    g_title = top_g.get('title', '')
                    
                    # [Fix] 구글 뉴스도 동일한 깐깐한 필터링 적용
                    if _is_relevant(g_title):
                        news_items.append({
                            'id': top_g.get('link'),  # 구글 뉴스는 링크를 고유 ID로 사용
                            'title': g_title,
                            'publisher': top_g.get('publisher', '구글 뉴스'),
                            'source': 'google'
                        })
                    else:
                        print(f"[NewsAlert] Filtered irrelevant Google News for {stock_name}: {g_title}")
            except: pass
            
            return news_items

        fetched_news = await asyncio.to_thread(_fetch_news)
        if not fetched_news:
            return
            
        # 첫 실행이면 상태만 기록하고 알림 발송 안함
        if self.is_first_run:
            for item in fetched_news:
                key = f"{symbol}_{item['source']}"
                self.last_seen_articles[key] = item['id']
            return
            
        # 새로운 기사 확인 및 알림 발송
        for item in fetched_news:
            key = f"{symbol}_{item['source']}"
            article_id = item['id']
            
            if not article_id:
                continue
                
            if self.last_seen_articles.get(key) != article_id:
                self.last_seen_articles[key] = article_id
                
                # [Fix] 중복 속보 방지: 최근 발송된 기사 제목과 유사도(단어 중복률) 검사
                import re
                new_title_words = set(re.findall(r'\w+', item['title']))
                is_duplicate = False
                
                if not hasattr(self, 'sent_titles'):
                    self.sent_titles = {}
                    
                recent_titles = self.sent_titles.get(symbol, [])
                for past_title in recent_titles:
                    past_words = set(re.findall(r'\w+', past_title))
                    if not new_title_words or not past_words: continue
                    intersection = len(new_title_words.intersection(past_words))
                    
                    # 제목 내 단어의 40% 이상이 일치하면 같은 뉴스로 간주 (언론사만 다른 경우 차단)
                    similarity = intersection / min(len(new_title_words), len(past_words))
                    if similarity > 0.4:
                        is_duplicate = True
                        break
                        
                if is_duplicate:
                    print(f"[NewsAlert] 중복 뉴스 알림 차단 ({stock_name}): {item['title']}")
                    continue
                    
                # 최근 발송 제목 목록에 추가 (최대 10개 유지)
                if symbol not in self.sent_titles:
                    self.sent_titles[symbol] = []
                self.sent_titles[symbol].append(item['title'])
                if len(self.sent_titles[symbol]) > 10:
                    self.sent_titles[symbol].pop(0)
                
                # 푸시 알림 발송
                await self.send_news_push(symbol, stock_name, item, users)
            
    async def send_news_push(self, symbol: str, stock_name: str, news_item: dict, users: List[str]):
        """유저들에게 새로운 뉴스 푸시 알림 발송"""
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_user_fcm_tokens
            
            title = news_item.get('title', '새로운 소식')
            office_name = news_item.get('publisher', '뉴스')
            source = news_item.get('source', '')
            
            # 소스에 따른 이모지 변경
            source_icon = "🌍" if source == 'google' else "🇰🇷"
            
            # FCM 알림 메시지 구성
            push_title = f"{source_icon} {stock_name} 속보!"
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
