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
from holiday_checker import is_holiday
from firebase_config import send_multicast_notification
from stock_data import get_korean_stock_name, fetch_google_news, GLOBAL_KOREAN_NAMES

class MorningBriefingService:
    def __init__(self):
        self.is_running = False

    async def run_daily_briefing(self, market_type: str = 'KR'):
        """Runs the morning briefing job for a specific market"""
        print(f"[MorningBriefing] Starting {market_type} morning briefing process...")
        market_str = "kor" if market_type.upper() == "KR" else "us"
        if is_holiday(market_str):
            print(f"[MorningBriefing] 오늘은 {market_type} 시장 휴장일이므로 브리핑을 생략합니다.")
            return

        conn = get_db_connection()      # 1. 모든 유저 정보 가져오기
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

        # 객관적 뉴스 요약 구성 및 필터링
        def filter_items(items):
            res = []
            for item in items:
                text = str(item).strip()
                if not text: continue
                # 필터링할 키워드
                if any(x in text for x in ["없음", "정보 없", "알 수 없", "해당 뉴스", "확인 불가", "None", "해당 사항"]):
                    continue
                # 모바일 푸시에서 잘리지 않게 방어
                if len(text) > 35:
                    text = text[:32] + "..."
                res.append(text)
            return res[:3]

        facts_list = filter_items(analysis.get('market_facts', []))
        
        raw_ai_summary = str(analysis.get('ai_summary', '')).strip()
        ai_summary = raw_ai_summary[:35] + "..." if len(raw_ai_summary) > 35 else raw_ai_summary

        has_facts = len(facts_list) > 0

        # 뉴스가 없으면 발송 생략
        if not has_facts:
            print(f"[MorningBriefing] No valid facts for {stock_name}, skipping push.")
            return

        # === 단일 알림 발송 ===
        title = f"📰 {stock_name} 간추린 모닝 팩트"
        body_parts = []
        
        if has_facts:
            body_parts.append("\n".join([f"▪️ {f.replace('[', '').replace(']', '')}" for f in facts_list]))
            
        if ai_summary:
            body_parts.append(f"🤖 {ai_summary.replace('[', '').replace(']', '')}")
        
        if investor_summary:
            clean_investor = investor_summary.replace("|", "").replace("[전날 수급]", "전날 수급 ").replace("  ", " ").strip()
            body_parts.append(f"\n{clean_investor}")
            
        body = "\n".join(body_parts)

        send_multicast_notification(
            tokens=tokens,
            title=title,
            body=body,
            data={
                "type": "morning_briefing",
                "symbol": clean_sym,
                "url": f"/discovery?q={clean_sym}"
            },
            target_users=[user_id]
        )
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alert_history (user_id, symbol, type, message, current_price, buy_price, threshold)
                VALUES (?, ?, 'market', ?, 0, 0, 0)
            """, (user_id, stock_name, f"{title}\n{body}"))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[MorningBriefing] Failed to save alert to DB: {e}")
            
        print(f"[MorningBriefing] Sent briefing for {stock_name} to {user_id}")

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
        """AI를 사용해 객관적 사실(팩트) 3개 추출 (초보자 친화 + 유사투자자문업 준법 버전)"""
        prompt = f"""
        Extract up to 3 purely factual bullet points about the company '{name}' ({symbol}) based ONLY on the provided news headlines.
        
        STRICT RELEVANCE RULES:
        1. Only include news that is directly and specifically about the company '{name}'.
        2. Absolutely ignore news about other companies (e.g. if the target company is '{name}', ignore news about '대성산업' or '와이제이링크').
        3. Absolutely ignore news about regions or unrelated terms.
        4. If there are not enough valid news headlines for '{name}', return fewer facts (e.g. 1 item, or empty list if none). Do not hallucinate.
        
        STRICT LEGAL & COMPLIANCE RULES (CRITICAL):
        1. NEVER classify news as "good" (호재) or "bad" (악재).
        2. NEVER recommend buying, selling, or holding. Avoid directive/subjective words: "추천", "주의", "매수", "매도", "목표", "긍정적", "부정적".
        3. Keep all descriptions strictly neutral, factual, and objective. Only state the WHAT (e.g. "수주 계약 체결", "매출 감소 발표").
        4. Explain in plain Korean (쉬운 우리말) for beginners.
        5. Each fact MUST be extremely concise (Max 35 characters) to fit in a mobile push notification.
        6. Neutral summary (ai_summary): Max 35 characters. Simply summarize the overall theme neutrally.
        
        Headlines:
        {json.dumps(headlines[:25], ensure_ascii=False)}
        
        Response Format (JSON):
        {{
            "market_facts": ["Factual bullet point 1", "Factual bullet point 2", "Factual bullet point 3"],
            "ai_summary": "Extremely concise neutral summary"
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
