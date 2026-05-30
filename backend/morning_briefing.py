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
            
            tokens = [t['token'] for t in tokens_data if t.get('pref_morning', True)]
            if not tokens:
                continue

            # 유저의 관심종목 가져오기
            watchlist_rows = get_watchlist(user_id)
            if not watchlist_rows:
                continue

            # 해당 마켓의 종목만 필터링
            target_symbols = []
            for row in watchlist_rows:
                symbol = row[0]
                clean_sym = symbol.split('.')[0] if '.' in symbol else symbol
                is_kr = clean_sym.isdigit() and len(clean_sym) == 6
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
        """종목별 뉴스 분석 및 알림 발송 (호재/악재 2개 알림 분할 및 수급 정보 추가)"""
        stock_name = get_korean_stock_name(symbol) or GLOBAL_KOREAN_NAMES.get(symbol, symbol)
        
        # 뉴스 수집
        news_list = await self.fetch_latest_news(symbol, stock_name)
        if not news_list:
            return

        # AI 분석 (3 호재 / 3 악재)
        analysis = await self.analyze_news_balance(symbol, stock_name, news_list)
        if not analysis:
            return

        # 1. 수급 정보 요약 생성 (국내 주식 한정)
        investor_summary = ""
        clean_sym = symbol.split('.')[0] if '.' in symbol else symbol
        is_kr = clean_sym.isdigit() and len(clean_sym) == 6
        if is_kr:
            try:
                from korea_data import get_naver_investor_data
                inv_res = get_naver_investor_data(symbol, trader_day=1)
                if inv_res.get("status") == "success" and inv_res.get("data", {}).get("trend"):
                    trend_data = inv_res["data"]["trend"][0]
                    retail = trend_data.get("retail", 0)
                    foreigner = trend_data.get("foreigner", 0)
                    institution = trend_data.get("institution", 0)
                    
                    def format_volume(vol):
                        if vol == 0:
                            return "0주"
                        sign = "+" if vol > 0 else ""
                        abs_vol = abs(vol)
                        if abs_vol >= 10000:
                            return f"{sign}{vol / 10000:.1f}만주"
                        elif abs_vol >= 1000:
                            return f"{sign}{vol / 1000:.1f}천주"
                        else:
                            return f"{sign}{vol}주"
                            
                    investor_summary = f"\n📊 [전날 수급] 개인: {format_volume(retail)} | 외인: {format_volume(foreigner)} | 기관: {format_volume(institution)}"
            except Exception as ie:
                print(f"[MorningBriefing] Failed to fetch investor data for {stock_name}: {ie}")

        # 호재/악재 텍스트 구성 (3:3 분할)
        pros_list = analysis.get('pros', [])[:3]
        cons_list = analysis.get('cons', [])[:3]
        ai_opinion = analysis.get('ai_opinion', '신중한 판단 필요')

        has_pros = len(pros_list) > 0
        has_cons = len(cons_list) > 0

        # 호재도 악재도 없으면 발송 생략 (빈 알림 방지)
        if not has_pros and not has_cons:
            print(f"[MorningBriefing] No pros/cons for {stock_name}, skipping push.")
            return

        # === 1. 호재 알림 발송 ===
        if has_pros:
            title_pro = f"⚖️ [호재] {stock_name} AI 브리핑"
            pros_str = "\n".join([f"🟢 {p}" for p in pros_list])
            body_pro = f"{pros_str}{investor_summary}"
            
            send_multicast_notification(
                tokens=tokens,
                title=title_pro,
                body=body_pro,
                data={
                    "type": "morning_briefing_pro",
                    "symbol": symbol,
                    "url": f"/discovery?q={symbol}"
                }
            )
            # 알림이 꼬이거나 씹히는 것을 방지하기 위해 0.5초 대기
            await asyncio.sleep(0.5)

        # === 2. 악재 알림 발송 ===
        if has_cons:
            title_con = f"⚖️ [악재/리스크] {stock_name} AI 브리핑"
            cons_str = "\n".join([f"🔴 {c}" for c in cons_list])
            
            # 만약 호재가 없어서 수급 정보를 못 보냈다면, 악재 알림에 수급 정보를 붙임
            inv_str = investor_summary if not has_pros else ""
            body_con = f"{cons_str}\n🤖 {ai_opinion}{inv_str}\n⚠️ 본 정보는 참고용입니다."

            send_multicast_notification(
                tokens=tokens,
                title=title_con,
                body=body_con,
                data={
                    "type": "morning_briefing_con",
                    "symbol": symbol,
                    "url": f"/discovery?q={symbol}"
                }
            )
        
        print(f"[MorningBriefing] Sent split briefing (pro/con) for {stock_name} to {user_id}")

    async def fetch_latest_news(self, symbol: str, stock_name: str) -> List[str]:
        """최신 뉴스 헤드라인 수집"""
        headlines = []
        
        # 한국 주식 (네이버) - 접미사 제거 후 6자리 코드 추출
        clean_sym = symbol.split('.')[0] if '.' in symbol else symbol
        if clean_sym.isdigit() and len(clean_sym) == 6:
            try:
                url = f"https://m.stock.naver.com/api/news/stock/{clean_sym}?pageSize=15"
                res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                data = res.json()
                if isinstance(data, list):
                    for group in data:
                        for item in group.get('items', []):
                            headlines.append(item.get('title'))
            except: pass
            
        # 구글 뉴스 (공통)
        try:
            g_news = fetch_google_news(f"{stock_name} 주식")
            if g_news:
                for n in g_news[:10]:
                    headlines.append(n.get('title'))
        except: pass
        
        return list(set(headlines))

    async def analyze_news_balance(self, symbol: str, name: str, headlines: List[str]) -> Dict[str, Any]:
        """AI를 사용해 호재 3개, 악재 3개 추출 (초보자 친화 + 준법 버전)"""
        prompt = f"""
        Extract up to 3 factual 'Upward Factors' (호재) and 3 'Downward Risks' (악재) for the company '{name}' ({symbol}) based ONLY on the provided news headlines.
        
        STRICT RELEVANCE RULES:
        1. Only include news that is directly and specifically about the company '{name}'.
        2. Absolutely ignore news about other companies (e.g. if the target company is '{name}', ignore news about '대성산업' or '와이제이링크').
        3. Absolutely ignore news about regions or unrelated terms (e.g. if the target company is '서남', ignore news about '서남아시아' or '서남 수협').
        4. If there are not enough valid news headlines for '{name}', return fewer factors (e.g. 1 or 2 items, or empty list if none). Do not hallucinate or make up news.
        
        STRICT LEGAL & COMPLIANCE RULES:
        1. NEVER recommend buying, selling, or holding. Avoid directive/subjective words: "추천", "주의", "매수 권장", "손절", "관리 필요", "긍정적", "부정적".
        2. Keep all descriptions strictly neutral, factual, and objective.
        3. Explain in plain Korean (쉬운 우리말) for beginners. Avoid difficult financial jargon (e.g. instead of "컨센서스 상회", use "시장 예상보다 높은 실적").
        4. Neutral summary (ai_opinion): Max 30 characters.
        
        Headlines:
        {json.dumps(headlines[:25], ensure_ascii=False)}
        
        Response Format (JSON):
        {{
            "pros": ["Simple factual factor 1", "Simple factual factor 2", ...],
            "cons": ["Simple factual risk 1", "Simple factual risk 2", ...],
            "ai_opinion": "Easy neutral summary"
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
