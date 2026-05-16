"""
Morning Briefing Service (AI 마켓 밸런스 브리핑)
장 시작 전 관심종목에 대한 호재 3개, 악재 3개를 요약하여 푸시 알림을 발송합니다.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import List, Dict, Any
import requests
from db_manager import get_db_connection, get_watchlist, get_user_fcm_tokens, get_all_users
from ai_analysis import generate_with_retry
from firebase_config import send_multicast_notification
from stock_data import get_korean_stock_name, fetch_google_news, GLOBAL_KOREAN_NAMES

class MorningBriefingService:
    def __init__(self):
        self.is_running = False

    async def run_daily_briefing(self, market_type: str = 'KR'):
        """
        매일 정해진 시간에 실행되는 브리핑 발송 로직
        market_type: 'KR' (08:30) or 'US' (22:00)
        """
        print(f"[MorningBriefing] Starting {market_type} briefing process...")
        
        # 1. 모든 유저 정보 가져오기
        users = get_all_users()
        if not users:
            print("[MorningBriefing] No users found.")
            return

        for user in users:
            user_id = user['id']
            # 유저의 FCM 토큰 확인
            tokens_data = get_user_fcm_tokens(user_id)
            if not tokens_data:
                continue
            
            tokens = [t['token'] for t in tokens_data]

            # 유저의 관심종목 가져오기
            watchlist_rows = get_watchlist(user_id)
            if not watchlist_rows:
                continue

            # 해당 마켓의 종목만 필터링
            target_symbols = []
            for row in watchlist_rows:
                symbol = row[0]
                is_kr = symbol.isdigit() and len(symbol) == 6
                if market_type == 'KR' and is_kr:
                    target_symbols.append(symbol)
                elif market_type == 'US' and not is_kr:
                    target_symbols.append(symbol)

            if not target_symbols:
                continue

            # 2. 각 종목별 밸런스 분석 및 발송
            for symbol in target_symbols:
                try:
                    await self.analyze_and_send(user_id, tokens, symbol)
                    await asyncio.sleep(1) # Rate limit 방지
                except Exception as e:
                    print(f"[MorningBriefing] Error for {symbol}: {e}")

    async def analyze_and_send(self, user_id: str, tokens: List[str], symbol: str):
        """종목별 뉴스 분석 및 알림 발송"""
        stock_name = get_korean_stock_name(symbol) or GLOBAL_KOREAN_NAMES.get(symbol, symbol)
        
        # 뉴스 수집
        news_list = await self.fetch_latest_news(symbol, stock_name)
        if not news_list:
            print(f"[MorningBriefing] No news for {stock_name}")
            return

        # AI 분석 (3 호재 / 3 악재)
        analysis = await self.analyze_news_balance(symbol, stock_name, news_list)
        if not analysis:
            return

        # 메시지 구성
        title = f"⚖️ {stock_name} 장전 밸런스 브리핑"
        
        # 호재/악재 텍스트 구성 (2:2 압축)
        pros_list = analysis.get('pros', [])[:2]
        cons_list = analysis.get('cons', [])[:2]
        
        pros_str = "\n".join([f"🟢 {p}" for p in pros_list])
        cons_str = "\n".join([f"🔴 {c}" for c in cons_list])
        ai_opinion = analysis.get('ai_opinion', '신중한 투자 판단 필요')
        
        # 모바일 알림창 크기에 맞게 초압축
        body = f"{pros_str}\n{cons_str}\n🤖 {ai_opinion}\n⚠️ 투자책임은 본인에게 있습니다."

        # 알림 발송
        send_multicast_notification(
            tokens=tokens,
            title=title,
            body=body,
            data={
                "type": "morning_briefing",
                "symbol": symbol,
                "url": f"/discovery?symbol={symbol}"
            }
        )
        print(f"[MorningBriefing] Sent briefing for {stock_name} to {user_id}")

    async def fetch_latest_news(self, symbol: str, stock_name: str) -> List[str]:
        """최신 뉴스 헤드라인 수집"""
        headlines = []
        
        # 한국 주식 (네이버)
        if symbol.isdigit() and len(symbol) == 6:
            try:
                url = f"https://m.stock.naver.com/api/news/stock/{symbol}?pageSize=10"
                res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                data = res.json()
                # 네이버 뉴스 API 응답 구조 확인 (리스트 형태)
                if isinstance(data, list):
                    for group in data:
                        for item in group.get('items', []):
                            headlines.append(item.get('title'))
            except Exception as e:
                print(f"[MorningBriefing] Naver News Error: {e}")
            
        # 구글 뉴스 (공통)
        try:
            g_news = fetch_google_news(f"{stock_name} 주식")
            if g_news:
                for n in g_news[:10]:
                    headlines.append(n.get('title'))
        except Exception as e:
            print(f"[MorningBriefing] Google News Error: {e}")
        
        return list(set(headlines)) # 중복 제거

    async def analyze_news_balance(self, symbol: str, name: str, headlines: List[str]) -> Dict[str, Any]:
        """AI를 사용해 호재 2개, 악재 2개 추출 (모바일 최적화)"""
        prompt = f"""
        Analyze the recent news headlines for {name} ({symbol}) and categorize them into 2 Positives (Pros) and 2 Negatives (Cons).
        Provide a 1-sentence AI opinion.
        
        CRITICAL RULES:
        - Each point MUST be shorter than 25 Korean characters. (Extremely concise)
        - All text must be in Korean.
        - Return 2 Pros and 2 Cons only.
        
        Headlines:
        {json.dumps(headlines[:20], ensure_ascii=False)}
        
        Response Format (JSON):
        {{
            "pros": ["Concise positive 1", "Concise positive 2"],
            "cons": ["Concise negative 1", "Concise negative 2"],
            "ai_opinion": "1-sentence summary (Korean)"
        }}
        """
        
        try:
            response = await asyncio.to_thread(generate_with_retry, prompt, True)
            return json.loads(response.text)
        except Exception as e:
            print(f"[MorningBriefing] AI Analysis Error: {e}")
            return None

# 전역 인스턴스
morning_briefing_service = MorningBriefingService()
