import json
import asyncio
from datetime import datetime
import pytz
from typing import Dict, Any, List

from ai_analysis import generate_with_retry, API_KEY
from stock_data import get_market_data, fetch_google_news, get_simple_quote
from db_manager import get_watchlist
from utils.briefing_store import save_morning_briefing

async def generate_user_morning_briefing(user_id: str):
    """
    특정 사용자의 관심종목과 시장 데이터를 결합하여 맞춤형 모닝 브리핑 생성
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    def log_debug(msg):
        with open("morning_brief_debug.log", "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now()}] {msg}\n")
            
    log_debug(f"Briefing for user_id: '{user_id}' at {now}")
    
    print(f"[DEBUG] Briefing for user_id: '{user_id}' at {now}")
    
    # 1. 데이터 수집
    # 1.1 시장 지수 (미국 중심)
    market_data = get_market_data() # 지수, 환율 등 포함됨
    
    # 1.2 관심종목 데이터 (TurboQuant Parallel Processing)
    watchlist = get_watchlist(user_id)
    log_debug(f"Found watchlist for '{user_id}': {watchlist}")
    print(f"[DEBUG] Found watchlist for '{user_id}': {watchlist}")
    
    # [Fix] 만약 로그인 사용자의 관심종목이 없고 guest 데이터가 있다면 안내 또는 로직 점검
    if not watchlist and user_id != "guest":
        guest_watchlist = get_watchlist("guest")
        if guest_watchlist:
            log_debug(f"User '{user_id}' has empty watchlist, but 'guest' has items. Migration may be needed.")
            print(f"[DEBUG] User '{user_id}' has empty watchlist, but 'guest' has items. Migration may be needed.")
    
    watchlist_details = []
    
    target_symbols = watchlist[:5] if watchlist else []
    
    def fetch_symbol_info(symbol):
        try:
            print(f"[DEBUG] Fetching info for symbol: {symbol}")
            quote = get_simple_quote(symbol)
            if not quote:
                print(f"[DEBUG] Failed to get quote for {symbol}, using fallback data")
                quote = {"symbol": symbol, "name": symbol, "price": "확인불가", "change": "0.00%"}
            
            news = fetch_google_news(symbol, max_results=2)
            return {
                "symbol": symbol,
                "name": quote.get('name', symbol),
                "price": quote.get('price', 'N/A'),
                "change": quote.get('change', 'N/A'),
                "news": [n.get('title', '') for n in (news or [])]
            }
        except Exception as e:
            print(f"[DEBUG] Error fetching info for {symbol}: {e}")
            return {
                "symbol": symbol,
                "name": symbol,
                "price": "N/A",
                "change": "N/A",
                "news": []
            }

    if target_symbols:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(fetch_symbol_info, target_symbols))
            watchlist_details = [r for r in results if r is not None]
    
    print(f"[DEBUG] Final watchlist_details count: {len(watchlist_details)}")

    # 1.3 사용자 정보 (개인화용)
    from db_manager import get_user
    user_info = get_user(user_id)
    user_name = user_info.get('name', '투자자') if user_info else '투자자'

    # 2. AI 브리핑 생성
    if not API_KEY:
        return {
            "status": "error",
            "message": "Gemini API 키가 설정되지 않았습니다."
        }

    # 지수 요약 텍스트 생성
    indices_raw = market_data.get('indices', []) # Case-sensitive fix: 'Indices' -> 'indices'
    index_list = []
    for idx in indices_raw:
        label = idx.get('label', '시장 지수')
        value = idx.get('value')
        change = idx.get('change', '0.00%')
        if value and value != "N/A":
            index_list.append(f"{label}: {value} ({change})")
    
    # 만약 index_list가 비어있으면 korea_data에서 직접 가져오기 시도
    if not index_list:
        try:
            from korea_data import get_korean_market_indices
            k_indices = get_korean_market_indices()
            for k, v in k_indices.items():
                index_list.append(f"{k.upper()}: {v.get('value')} ({v.get('percent')})")
        except:
            pass

    index_summary = ", ".join(index_list) if index_list else "현재 시장 데이터를 수집 중입니다."

    # 프롬프트 구성
    prompt = f"""
    당신은 {user_name} 회원님만을 위한 전담 'AI 수석 투자 전략가'입니다. 
    오늘 아침({now.strftime('%Y-%m-%d %H:%M')}) 시장 상황과 회원님의 핵심 관심종목 리서치 결과를 분석한 프라이빗 보고서를 작성하세요.

    [회원 정보]
    - 회원 성함: {user_name} 님

    [입력 데이터]
    1. 시장 지표: {index_summary}
    2. 회원님 관심종목 리얼타임 데이터: {json.dumps(watchlist_details, ensure_ascii=False)}

    [작성 가이드라인 - 필독 및 엄수]
    - **실시간 데이터 기반**: 제공된 [입력 데이터]에 명시된 숫자와 시장 상황에만 철저히 기초하여 분석하세요.
    - **가변성 확보**: 매번 브리핑을 작성할 때마다 첫 문장과 분석의 초점을 다르게 하세요. (예: 어떤 날은 기술주 중심, 어떤 날은 금리나 환율 중심 등)
    - **추측 금지**: 데이터가 'N/A'이거나 불분명한 경우, 멋대로 주가나 지수를 추정한 분석을 내놓지 마세요. 대신 '데이터 수집 중' 혹은 '시장 확인 필요'라고 명시하세요.
    - 말투: 매우 격식 있고 전문적이며 신뢰감을 주는 비서/전략가 말투를 사용하세요. (예: "~입니다", "~를 분석하였습니다", "관찰되고 있습니다")
    - 내용: 일반적인 뉴스 요약을 넘어, 데이터 간의 연관성이나 시장의 함의를 짧고 강렬하게 짚어주세요.
    - **중요**: {user_name} 님을 직접 언급하며 맞춤형 보고서라는 느낌을 강조하세요.
    - **투자 자문 금지**: 특정 가격대 제시, 매수/매도 추천은 절대 불가하며 데이터 기반 현황 보고 위주로 작성하세요.

    [출력 포맷 (JSON)]
    {{
        "market_title": "오늘의 전략적 시장 가이드라인 (매번 다르게 생성)",
        "market_summary": "{user_name} 님을 위한 글로벌 마켓 핵심 요약 (구체적인 지수 숫자 포함)",
        "watchlist_briefs": [
            {{
                "symbol": "종목코드",
                "name": "종목명",
                "insight": "{user_name} 님이 주시하는 이 종목의 핵심 모멘텀 분석 (데이터 기반으로 매번 다르게)"
            }},
            ...
        ],
        "market_focus": "금일 반드시 모니터링해야 할 거시 경제 일정 및 공시",
        "disclaimer": "본 보고서는 AI가 공개된 데이터를 정교하게 분석한 가이드이며, 최종 투자 결정은 {user_name} 님의 판단하에 이루어져야 합니다."
    }}
    """

    try:
        # 비동기 실행을 위해 run_in_executor 사용 고려 가능하나 여기서는 단순 호출
        response = generate_with_retry(prompt, json_mode=True)
        
        # 텍스트 추출 및 정제
        text = response.text.strip()
        
        # 마크다운 코드 블록 제거용 정규표현식 (혹시 모를 경우대비)
        if text.startswith("```json"):
            text = text.replace("```json", "", 1).replace("```", "", 1).strip()
        elif text.startswith("```"):
            text = text.replace("```", "", 1).replace("```", "", 1).strip()
            
        briefing_result = json.loads(text)
        
        # [Critical Fix] 결과가 딕셔너리가 아닌 문자열일 경우 대응
        if not isinstance(briefing_result, dict):
            raise ValueError(f"AI returned unexpected format: {type(briefing_result)}")
            
        # 메타데이터 추가
        briefing_result["user_id"] = user_id
        briefing_result["generated_at"] = now.isoformat()
        
        # DB 저장
        save_morning_briefing(user_id, briefing_result)
        
        return briefing_result
    except Exception as e:
        print(f"[MorningBrief] Generation error: {e}")
        raise # 상위 layer (main.py)로 에러 전달
