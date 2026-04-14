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
                # 시세, 뉴스, 공시를 동시에 가져오기 위해 내부 실행
                quote = get_simple_quote(symbol)
                news_raw = fetch_google_news(symbol)
                
                res = {
                    "symbol": symbol,
                    "name": quote.get('name', symbol) if quote else symbol,
                    "price": quote.get('price', 'N/A') if quote else 'N/A',
                    "change": quote.get('change', 'N/A') if quote else 'N/A',
                    "news": [n.get('title', '') for n in (news_raw[:2] if news_raw else [])]
                }
                
                # [TurboQuant] 모멘텀 점수 계산을 위한 과거 데이터 수집
                try:
                    from korea_data import get_naver_daily_prices
                    history = get_naver_daily_prices(symbol)
                    if history:
                        prices = [h['close'] for h in reversed(history)]
                        score = turbo_engine.calculate_momentum_score(pd.Series(prices))
                        res['turbo_score'] = score
                except: pass

                # 국내 종목 공시 추가
                if symbol.isdigit() and len(symbol) == 6 or symbol.endswith(('.KS', '.KQ')):
                    try:
                        disclosures = get_live_disclosures(symbol)
                        if disclosures:
                            res['recent_disclosures'] = [d.get('title') for d in disclosures[:2]]
                    except: pass
                
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
        "is_instant": True
    }
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
    - **관심종목 맞춤 분석 필수**: 입력 데이터 3번에 제공된 '회원님 관심종목 리얼타임 데이터'에 나열된 모든 개별 종목에 대해 반드시 `watchlist_briefs` 배열에 분석(insight)을 생성해야 합니다. 특히 종목별로 제공되는 **`turbo_score` (퀀트 모멘텀 점수)**를 활용하여 수치 기반의 신뢰도 높은 인사이트를 제공하세요.
    - **투자 자문 금지**: 가격 예측, 수익률 보장, 명시적인 매도/매수 추천 단어는 절대 금지하되, 당일의 객관적인 사실, 차트 동향, 뉴스, 실적, 수급 기반의 실용적인 인사이트만을 제공하세요.

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
        
        # 최종 완료 및 저장
        from utils.briefing_store import save_morning_briefing
        save_morning_briefing(user_id, briefing_result)
        
        print(f"[TurboBrief] Fully generated and saved deep briefing for {user_id}")
        return briefing_result
    except Exception as e:
        print(f"[MorningBrief] Generation error: {e}")
        raise # 상위 layer (main.py)로 에러 전달
