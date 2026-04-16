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
from turbo_engine import turbo_engine
import pandas as pd

def _collect_raw_data(user_id: str):
    """지표, 뉴스, 관심종목 시세 등 원천 데이터를 병렬로 수집 (AI 없는 순수 데이터)"""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    # 1. 데이터 수집 (Turbo Parallel Mode)
    from concurrent.futures import ThreadPoolExecutor
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        # 1.1 시장 데이터 수집 (지수, 환율 등)
        f_market = executor.submit(get_market_data)
        
        # 1.2 시장 컨텍스트 수집 (뉴스, 일정, 리스크 등)
        def fetch_market_context():
            try:
                m_news = get_market_news()[:3]
                macro = get_macro_calendar()[:3]
                ipo = get_ipo_data()[:2]
                risk_alerts = get_dart_risk_alerts()[:2]
                return {
                    "top_news": [n.get('title') for n in m_news],
                    "macro_schedule": [f"{m.get('event')} ({m.get('date')})" for m in macro],
                    "ipo_schedule": [f"{i.get('name')} ({i.get('date')})" for i in ipo if isinstance(i, dict)] if ipo else [],
                    "risk_alerts": [r.get('title') for r in risk_alerts]
                }
            except: return {}
        f_context = executor.submit(fetch_market_context)

        # 1.3 관심종목 목록 및 상세 정보
        watchlist = get_watchlist(user_id)
        target_symbols = watchlist[:5] if watchlist else []
        
        def fetch_symbol_info_parallel(symbol):
            try:
                # [Optimization] 내부 서브 태스크들을 병렬로 처리하여 전체 수집 시간을 최적화
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=4) as sub_executor:
                    f_quote = sub_executor.submit(get_simple_quote, symbol)
                    f_news = sub_executor.submit(fetch_google_news, symbol)
                    
                    def fetch_history_and_score():
                        try:
                            from korea_data import get_naver_daily_prices
                            history = get_naver_daily_prices(symbol)
                            if history:
                                prices = [h['close'] for h in reversed(history)]
                                return turbo_engine.calculate_momentum_score(pd.Series(prices))
                        except: return None
                    f_score = sub_executor.submit(fetch_history_and_score)
                    
                    f_disclosures = None
                    if symbol.isdigit() and len(symbol) == 6 or symbol.endswith(('.KS', '.KQ')):
                        f_disclosures = sub_executor.submit(get_live_disclosures, symbol)
                    
                    # 결과 취합 (최대 6초)
                    quote = None
                    try: quote = f_quote.result(timeout=5)
                    except: pass
                    
                    news_raw = []
                    try: news_raw = f_news.result(timeout=5)
                    except: pass
                    
                    score = None
                    try: score = f_score.result(timeout=4)
                    except: pass
                    
                    disclosures = []
                    if f_disclosures:
                        try: disclosures = f_disclosures.result(timeout=4)
                        except: pass
                
                res = {
                    "symbol": symbol,
                    "name": quote.get('name', symbol) if quote else symbol,
                    "price": quote.get('price', 'N/A') if quote else 'N/A',
                    "change": quote.get('change', 'N/A') if quote else 'N/A',
                    "news": [n.get('title', '') for n in (news_raw[:2] if news_raw else [])],
                    "turbo_score": score,
                    "recent_disclosures": [d.get('title') for d in disclosures[:2]] if disclosures else []
                }
                
                return res
            except Exception as e:
                print(f"[Turbo] Error info for {symbol}: {e}")
                return None

        # 종목별 상세 정보 수집 시작
        f_watchlist = [executor.submit(fetch_symbol_info_parallel, s) for s in target_symbols]
        
        # 결과 기다리기 (안전한 타임아웃 적용 - 15초)
        market_data = {}
        try:
            market_data = f_market.result(timeout=10) # 10초로 단축
        except Exception as e:
            print(f"[TurboBrief] Market Data Fetch Timeout: {e}")
            market_data = {"indices": []}

        market_context = {}
        try:
            # 시장 컨텍스트는 부가 정보이므로 짧은 타임아웃(7초)
            market_context = f_context.result(timeout=7)
        except Exception as e:
            print(f"[TurboBrief] Market Context Timeout: {e}")
            market_context = {}
            print(f"[TurboBrief] Context Data Fetch Timeout/Error: {e}")

        watchlist_details = []
        for f in f_watchlist:
            try:
                res = f.result(timeout=15)
                if res: watchlist_details.append(res)
            except Exception as e:
                print(f"[TurboBrief] Symbol Data Fetch Timeout/Error: {e}")

    from db_manager import get_user
    user_info = get_user(user_id)
    user_name = user_info.get('name', '투자자') if user_info else '투자자'
    
    return {
        "market_data": market_data,
        "market_context": market_context,
        "watchlist_details": watchlist_details,
        "user_name": user_name,
        "now": now
    }

def generate_instant_briefing(user_id: str):
    """AI를 사용하지 않고 수집된 데이터를 바탕으로 즉시 하이브리드 리포트 생성"""
    raw = _collect_raw_data(user_id)
    market_data = raw["market_data"]
    watchlist_details = raw["watchlist_details"]
    user_name = raw["user_name"]
    now = raw["now"]

    # 지수 정보 요약
    indices = market_data if isinstance(market_data, list) else market_data.get('indices', [])
    main_idx = indices[0] if indices else {"label": "시장", "value": "-", "change": "0%"}
    
    # 관심종목 요약
    watchlist_briefs = []
    for item in watchlist_details:
        watchlist_briefs.append({
            "symbol": item["symbol"],
            "name": item["name"],
            "insight": f"현재 {item['price']}원에 거래 중이며 최신 소식을 확인하고 있습니다.",
            "simple_insight": f"지금 {item['price']}원이에요. 곧 AI가 분석해드릴게요!"
        })

    briefing = {
        "market_title": f"[{main_idx['label']}] 현재 {main_idx['value']} ({main_idx['change']}) 기록 중",
        "summary_bullets": [
            "사용자님, 시장 데이터를 즉시 수집했습니다.",
            "현재 관심종목들의 시세를 확인 중이며, AI가 심층 분석 보고서를 작성하고 있습니다.",
            "로딩이 길어지는 경우 '전문가 모드'를 해제하거나 잠시 후 다시 확인해 주세요."
        ],
        "sections": [
            {
                "emoji": "⚡",
                "title": "실시간 데이터 속보",
                "content": "AI 인텔리전스가 가동 중입니다. 먼저 실시간 지표와 종목 시세를 확인하세요."
            }
        ],
        "watchlist_briefs": watchlist_briefs,
        "market_focus": "AI 분석이 완료되면 오늘 정밀 전략이 공개됩니다.",
        "disclaimer": "본 데이터는 실시간 시세 정보를 바탕으로 한 즉시 리포트이며, 정밀 분석은 잠시 후 제공됩니다.",
        "user_id": user_id,
        "generated_at": now.isoformat(),
        "is_instant": True,
        "category": "MARKET" # 즉시 리포트는 기본적으로 시장 요약
    }
    # [Zero-Wait] 즉시 리포트 결과 반환 (저장은 호출측인 main.py에서 담당하도록 일원화)
    return briefing

def generate_user_morning_briefing(user_id: str):
    """전체 AI 모닝 브리핑 생성 (심층 분석 모드)"""
    raw = _collect_raw_data(user_id)
    market_data = raw["market_data"]
    market_context = raw["market_context"]
    watchlist_details = raw["watchlist_details"]
    user_name = raw["user_name"]
    now = raw["now"]

    def log_debug(msg):
        with open("morning_brief_debug.log", "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now()}] {msg}\n")
            
    log_debug(f"Turbo-Parallel data fetch completed. Watchlist count: {len(watchlist_details)}")

    # 2. AI 브리핑 생성
    if not API_KEY:
        return {
            "status": "error",
            "message": "Gemini API 키가 설정되지 않았습니다."
        }

    # 지수 요약 텍스트 생성
    indices_raw = market_data if isinstance(market_data, list) else market_data.get('indices', [])
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

    from stock_data import get_market_status_info
    
    # [Market Status Check] 고도화된 시간 판별 로직 적용
    ms_info = get_market_status_info()
    market_status_text = f"{ms_info['text']} (KST {ms_info['current_time_kst']})"
    avoid_words = "마감, 마쳤습니다, 종가, 끝났습니다" if ms_info['can_trade_regular'] else ""

    # 프롬프트 구성
    prompt = f"""
    당신은 {user_name} 회원님만을 위한 'AI 뉴스 데이터 큐레이터'입니다. 
    오늘({now.strftime('%Y-%m-%d %H:%M')}) 시장 데이터와 관심종목의 뉴스를 [호재성]과 [주의/악재성] 팩트로 분류하여 제공하세요.

    [현재 시장 정보]
    - 시간 상태: {market_status_text}
    - 정규장 운영 여부: {'거래 중' if ms_info['can_trade_regular'] else '종료/대기'}

    [회원 정보]
    - 회원 성함: {user_name} 님

    [입력 데이터]
    1. 시장 지표: {index_summary}
    2. 시장 컨텍스트(뉴스/일정): {json.dumps(market_context, ensure_ascii=False)}
    3. 회원님 관심종목 리얼타임 데이터: {json.dumps(watchlist_details, ensure_ascii=False)}

    [준수 사항]
    1. 주관적 분석 금지: 당신의 의견이나 투자 전략을 절대 작성하지 마세요.
    2. 판단은 이용자가: 당신은 오직 뉴스를 [호재성]과 [주의/악재성]으로 기계적으로 분류(Tagging)만 하세요.
    3. 투자 권유 단어 차단: "매수", "매도", "추천" 등의 단어는 절대 금지됩니다.
    4. 매크로 인사이트 강화: 시장 지표(금리, 유가, VIX 등)의 변화가 회원님의 관심종목이나 전체 시장에 미치는 영향을 전문 용어("위험선호", "헤지 수요", "밸류에이션 부담" 등)를 사용하여 설명하세요.
    5. 표현 주의: 현재 시장 상태가 '{market_status_text}'임을 인지하세요. {"만약 장중이라면 '" + avoid_words + "'와 같은 '종료'를 의미하는 단어를 절대 사용하지 마세요. 대신 '상승세', '기록 중', '거래 중' 등의 표현을 사용하세요." if avoid_words else ""}

    [가이드 요약]
    - Headline: 시장 팩트 및 주요 매크로 흐름 중심 한 줄 요약.
    - 내 종목 뉴스 분류: {len(watchlist_details)}개의 관심종목별 뉴스를 [호재성 소식]과 [주의/악재성 소식]으로 나누어 나열. 지표 변화(금리 등)와의 연관성 포함.

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
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        # 마크다운 코드 블록 제거
        if text.startswith("```json"):
            text = text.replace("```json", "", 1).replace("```", "", 1).strip()
        elif text.startswith("```"):
            text = text.replace("```", "", 1).replace("```", "", 1).strip()
            
        briefing_result = json.loads(text)
        
        if not isinstance(briefing_result, dict):
            raise ValueError(f"AI returned unexpected format: {type(briefing_result)}")

        # [Fallback] 만약 AI가 관심종목 분석을 누락했거나 빈 배열을 반환한 경우, 수동으로 채워 넣음
        if watchlist_details and (not briefing_result.get("watchlist_briefs") or len(briefing_result.get("watchlist_briefs", [])) == 0):
            log_debug(f"AI omitted watchlist_briefs. Applying automatic fallback for {len(watchlist_details)} stocks.")
            briefing_result["watchlist_briefs"] = []
            for item in watchlist_details:
                price = item.get('price', '-')
                name = item.get('name', item.get('symbol', '알 수 없는 종목'))
                briefing_result["watchlist_briefs"].append({
                    "symbol": item.get('symbol'),
                    "name": name,
                    "insight": f"현재 {price}원 부근에서 흐름을 보이고 있으며, AI가 실시간 기술적 분석을 수집 중입니다.",
                    "simple_insight": f"지금 {price}원이에요. 자세한 내용은 곧 요약해 드릴게요!"
                })
            
        # 4. 카테고리 결정 (Naver Style)
        category = "MARKET"
        if watchlist_details:
            # 주요 종목 변동성이 크거나 뉴스가 많으면 WATCHLIST
            category = "WATCHLIST"
        
        # [Special] 공시 정보가 우세하거나 제목에 공시가 있으면 DISCLOSURE
        if "공시" in briefing_result.get("market_title", ""):
            category = "DISCLOSURE"
        
        # 시스템 자동 생성인 경우 PERIODIC (1시간 주기) 강조
        if user_id == 'SYSTEM':
            category = "PERIODIC"

        briefing_result["category"] = category
        briefing_result["user_id"] = user_id
        briefing_result["generated_at"] = now.isoformat()
        
        # 최종 완료 및 저장
        try:
            from utils.briefing_store import save_morning_briefing
            # [Update Logic] 새로운 줄이 아니라 기존 기록을 덮어씀 (히스토리 중복 방지)
            save_morning_briefing(user_id, briefing_result)
            return briefing_result
        except Exception as e:
            print(f"[TurboBrief] Final save failed: {e}")
            return briefing_result
    except Exception as e:
        print(f"[MorningBrief] Generation error: {e}")
        raise # 상위 layer (main.py)로 에러 전달
