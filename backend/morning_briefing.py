import json
import asyncio
from datetime import datetime
import pytz
from typing import Dict, Any, List

from ai_analysis import generate_with_retry, API_KEY
from stock_data import (
    get_market_data, fetch_google_news, get_simple_quote, 
    get_market_news, get_macro_calendar, get_dart_risk_alerts
)
from db_manager import get_watchlist
from utils.briefing_store import save_morning_briefing
from korea_data import get_ipo_data, get_live_disclosures

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
            # 병렬로 시세 및 뉴스 수집
            results = list(executor.map(fetch_symbol_info, target_symbols))
            watchlist_details = [r for r in results if r is not None]
            
            # [Added] 국내 종목의 경우 최근 공시도 체크하여 전문성 강화
            for detail in watchlist_details:
                sym = detail['symbol']
                if sym.isdigit() and len(sym) == 6 or sym.endswith(('.KS', '.KQ')):
                    try:
                        disclosures = get_live_disclosures(sym)
                        if disclosures:
                            detail['recent_disclosures'] = [d.get('title') for d in disclosures[:2]]
                    except: pass
    
    print(f"[DEBUG] Final watchlist_details count: {len(watchlist_details)}")

    # 1.4 추가 시장 컨텍스트 (뉴스, 일정 등)
    try:
        m_news = get_market_news()[:3] # 주요 뉴스 3건
        macro = get_macro_calendar()[:3] # 주요 일정 3건
        ipo = get_ipo_data()[:2] # 최근 IPO 2건
        risk_alerts = get_dart_risk_alerts()[:2] # 주요 리스크 공시 2건
        
        market_context = {
            "top_news": [n.get('title') for n in m_news],
            "macro_schedule": [f"{m.get('event')} ({m.get('date')})" for m in macro],
            "ipo_schedule": [f"{i.get('name')} ({i.get('date')})" for i in ipo if isinstance(i, dict)] if ipo else [],
            "risk_alerts": [r.get('title') for r in risk_alerts]
        }
    except Exception as e:
        print(f"[MorningBrief] Context fetch error: {e}")
        market_context = {}

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
    2. 시장 컨텍스트(뉴스/일정): {json.dumps(market_context, ensure_ascii=False)}
    3. 회원님 관심종목 리얼타임 데이터: {json.dumps(watchlist_details, ensure_ascii=False)}

    [작성 가이드라인 - 필독 및 엄수]
    - **네이버 AI 브리핑 스타일**: 이용자들이 '편하게' 볼 수 있도록 구조화하세요.
        - **Headline**: 전체 시장의 핵심을 관통하는 하나의 파워풀한 헤드라인을 작성하세요.
        - **Summary Bullets**: 상단 '요약' 박스에 들어갈 핵심 포인트 3가지를 아주 간결하게 작성하세요.
        - **Sections**: 시장 분석, 수급 동향, 핵심 테마/업종 이슈 등 주제별로 섹션을 나누세요. 각 섹션은 이모지와 제목으로 시작합니다.
    - **중복 배제**: 각 항목 간 내용이 겹치지 않게 정보를 효율적으로 배치하세요.
    - **모드별 최적화**: 전문가 버전(격식)과 초보자 버전(비유/쉬운 용어)을 각각 생성하세요.
    - **가독성 극대화**: 줄글은 3~4줄 내외로 제한하고 가독성이 좋은 어조를 사용하세요.
    - **투자 자문 금지**: 가격 제시, 매도/매수 추천은 절대 불가합니다.

    [출력 포맷 (JSON)]
    {{
        "market_title": "메인 헤드라인 (출력 예: 외국인·기관 순매수에 코스피 2.91% 상승)",
        "summary_bullets": ["전문가용 핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
        "simple_summary_bullets": ["초보자용 쉬운 요약 1", "쉬운 요약 2", "쉬운 요약 3"],
        "sections": [
            {{
                "emoji": "📈",
                "title": "섹션 제목 (예: 반도체 대장주 강세에 지수 견인)",
                "content": "상세 전문가 분석 내용..."
            }},
            {{
                "emoji": "💰",
                "title": "섹션 제목",
                "content": "상세 전문가 분석 내용..."
            }}
        ],
        "simple_sections": [
            {{
                "emoji": "📈",
                "title": "쉬운 섹션 제목 (예: 삼성전자·하이닉스가 기운을 냈어요)",
                "content": "초보자도 이해하기 쉬운 비유 섞인 설명..."
            }}
        ],
        "watchlist_briefs": [
            {{
                "symbol": "AAPL",
                "name": "애플",
                "insight": "전문가용 종목 분석",
                "simple_insight": "초보자용 쉬운 종목 설명"
            }}
        ],
        "market_focus": "오늘 꼭 확인해야 할 주요 일정 (아주 간결하게)",
        "disclaimer": "법적 고지 문구"
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
