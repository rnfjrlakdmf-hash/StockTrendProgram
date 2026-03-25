"""
Stock Events (주식 이벤트)
차트 변곡점 탐지 및 스토리 생성
"""

from typing import Dict, List, Optional
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import numpy as np


# ============================================================
# 글로벌 이벤트 데이터베이스
# ============================================================

GLOBAL_EVENTS = {
    # 경제 위기
    "2008-09": {
        "title": "리먼 브라더스 파산",
        "icon": "💥",
        "description": "세계 금융위기의 시작. 모든 주식이 폭락했어요.",
        "impact": "negative",
        "keywords": ["금융위기", "리먼", "파산"]
    },
    "2020-03": {
        "title": "코로나19 팬데믹",
        "icon": "🦠",
        "description": "전 세계가 멈추며 주가가 반토막 났던 시기예요.",
        "impact": "negative",
        "keywords": ["코로나", "팬데믹", "봉쇄"]
    },
    "2020-11": {
        "title": "코로나 백신 개발 성공",
        "icon": "💉",
        "description": "희망의 빛! 주가가 다시 살아나기 시작했어요.",
        "impact": "positive",
        "keywords": ["백신", "화이자", "모더나"]
    },
    "2022-02": {
        "title": "러시아-우크라이나 전쟁",
        "icon": "⚔️",
        "description": "전쟁 발발로 글로벌 증시가 흔들렸어요.",
        "impact": "negative",
        "keywords": ["전쟁", "우크라이나", "러시아"]
    },
    "2023-03": {
        "title": "실리콘밸리은행 파산",
        "icon": "🏦",
        "description": "미국 은행 위기로 금융주가 폭락했어요.",
        "impact": "negative",
        "keywords": ["SVB", "은행", "파산"]
    }
}


# ============================================================
# 회사별 이벤트 데이터베이스
# ============================================================

COMPANY_EVENTS = {
    "005930.KS": {  # 삼성전자
        "2010-06": {
            "title": "갤럭시 S 출시",
            "icon": "🚀",
            "description": "스마트폰 시대의 시작! 애플과의 경쟁이 본격화됐어요.",
            "impact": "positive"
        },
        "2016-10": {
            "title": "갤럭시 노트7 리콜 사태",
            "icon": "🔥",
            "description": "배터리 폭발 문제로 전량 리콜. 주가가 크게 흔들렸어요.",
            "impact": "negative"
        },
        "2017-02": {
            "title": "이재용 부회장 구속",
            "icon": "⚖️",
            "description": "경영 공백 우려로 주가가 불안했던 시기예요.",
            "impact": "negative"
        },
        "2021-05": {
            "title": "반도체 슈퍼 사이클",
            "icon": "💎",
            "description": "전 세계 반도체 부족으로 삼성전자 주가가 급등했어요.",
            "impact": "positive"
        }
    },
    "AAPL": {  # 애플
        "2007-01": {
            "title": "아이폰 첫 출시",
            "icon": "📱",
            "description": "세상을 바꾼 아이폰! 애플의 황금기가 시작됐어요.",
            "impact": "positive"
        },
        "2011-10": {
            "title": "스티브 잡스 별세",
            "icon": "🕊️",
            "description": "애플의 전설이 떠났지만, 유산은 계속됐어요.",
            "impact": "neutral"
        },
        "2020-08": {
            "title": "시가총액 2조 달러 돌파",
            "icon": "👑",
            "description": "역사상 최초! 애플이 2조 달러 기업이 됐어요.",
            "impact": "positive"
        }
    },
    "TSLA": {  # 테슬라
        "2020-01": {
            "title": "상하이 기가팩토리 가동",
            "icon": "🏭",
            "description": "중국 시장 진출! 테슬라의 글로벌 확장이 시작됐어요.",
            "impact": "positive"
        },
        "2021-10": {
            "title": "시가총액 1조 달러 돌파",
            "icon": "🚗",
            "description": "전기차의 승리! 테슬라가 1조 달러 기업이 됐어요.",
            "impact": "positive"
        }
    }
}


# ============================================================
# 변곡점 탐지 알고리즘
# ============================================================

def detect_inflection_points(symbol: str, period: str = "1y", interval: str = "1d") -> List[Dict]:
    """
    차트에서 주요 변곡점 탐지
    
    Args:
        symbol: 종목 코드
        period: 기간 (1mo, 3mo, 6mo, 1y, 2y, 5y)
        interval: 데이터 간격 (1d, 1wk, 1mo)
    
    Returns:
        변곡점 리스트
    """
    try:
        # 가격 데이터 가져오기
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return []
        
        events = []
        
        # 1. 급등/급락 구간 탐지 (일간 변동률 20% 이상)
        hist['daily_change'] = hist['Close'].pct_change() * 100
        
        for i in range(1, len(hist)):
            change = hist['daily_change'].iloc[i]
            
            if abs(change) >= 15:  # 15% 이상 변동
                events.append({
                    "date": hist.index[i].strftime("%Y-%m-%d"),
                    "price": float(hist['Close'].iloc[i]),
                    "type": "surge" if change > 0 else "crash",
                    "change": float(change),
                    "volume": float(hist['Volume'].iloc[i])
                })
        
        # 2. 추세 전환점 탐지 (이동평균선 교차)
        hist['MA20'] = hist['Close'].rolling(window=20).mean()
        hist['MA50'] = hist['Close'].rolling(window=50).mean()
        
        for i in range(1, len(hist)):
            if pd.isna(hist['MA20'].iloc[i]) or pd.isna(hist['MA50'].iloc[i]):
                continue
            
            # 골든 크로스 (상승 전환)
            if (hist['MA20'].iloc[i-1] <= hist['MA50'].iloc[i-1] and 
                hist['MA20'].iloc[i] > hist['MA50'].iloc[i]):
                events.append({
                    "date": hist.index[i].strftime("%Y-%m-%d"),
                    "price": float(hist['Close'].iloc[i]),
                    "type": "golden_cross",
                    "change": 0,
                    "volume": float(hist['Volume'].iloc[i])
                })
            
            # 데드 크로스 (하락 전환)
            elif (hist['MA20'].iloc[i-1] >= hist['MA50'].iloc[i-1] and 
                  hist['MA20'].iloc[i] < hist['MA50'].iloc[i]):
                events.append({
                    "date": hist.index[i].strftime("%Y-%m-%d"),
                    "price": float(hist['Close'].iloc[i]),
                    "type": "dead_cross",
                    "change": 0,
                    "volume": float(hist['Volume'].iloc[i])
                })
        
        # 3. 거래량 폭증 탐지 (평균 대비 3배 이상)
        avg_volume = hist['Volume'].mean()
        
        for i in range(len(hist)):
            if hist['Volume'].iloc[i] >= avg_volume * 3:
                events.append({
                    "date": hist.index[i].strftime("%Y-%m-%d"),
                    "price": float(hist['Close'].iloc[i]),
                    "type": "volume_spike",
                    "change": float(hist['daily_change'].iloc[i]) if i > 0 else 0,
                    "volume": float(hist['Volume'].iloc[i])
                })
        
        # 날짜순 정렬 및 중복 제거
        events = sorted(events, key=lambda x: x['date'])
        
        # 같은 날짜의 이벤트는 가장 중요한 것만 남김
        unique_events = {}
        for event in events:
            date = event['date']
            if date not in unique_events or abs(event['change']) > abs(unique_events[date]['change']):
                unique_events[date] = event
        
        return list(unique_events.values())
        
    except Exception as e:
        print(f"Error detecting inflection points: {e}")
        return []


# ============================================================
# 이벤트 매칭 및 스토리 생성
# ============================================================

def match_events_with_stories(symbol: str, events: List[Dict]) -> List[Dict]:
    """
    감지된 이벤트에 스토리 매칭
    
    Args:
        symbol: 종목 코드
        events: 감지된 변곡점 리스트
    
    Returns:
        스토리가 추가된 이벤트 리스트
    """
    stories = []
    
    for event in events:
        story = create_story_for_event(symbol, event)
        if story:
            stories.append(story)
    
    # 중요도 순으로 정렬 (변동률이 큰 순)
    stories = sorted(stories, key=lambda x: abs(x.get('change', 0)), reverse=True)
    
    # 상위 10개만 반환 (너무 많으면 복잡함)
    return stories[:10]


def create_story_for_event(symbol: str, event: Dict) -> Optional[Dict]:
    """
    단일 이벤트에 대한 스토리 생성
    """
    date = event['date']
    year_month = date[:7]  # YYYY-MM
    
    # 1. 글로벌 이벤트 매칭
    if year_month in GLOBAL_EVENTS:
        global_event = GLOBAL_EVENTS[year_month]
        return {
            "date": date,
            "price": event['price'],
            "icon": global_event['icon'],
            "title": global_event['title'],
            "description": global_event['description'],
            "impact": global_event['impact'],
            "change": event.get('change', 0),
            "type": "global"
        }
    
    # 2. 회사별 이벤트 매칭
    if symbol in COMPANY_EVENTS and year_month in COMPANY_EVENTS[symbol]:
        company_event = COMPANY_EVENTS[symbol][year_month]
        return {
            "date": date,
            "price": event['price'],
            "icon": company_event['icon'],
            "title": company_event['title'],
            "description": company_event['description'],
            "impact": company_event['impact'],
            "change": event.get('change', 0),
            "type": "company"
        }
    
    # 3. 자동 생성 스토리 (변동률 기반)
    return create_auto_story(symbol, event)


def create_auto_story(symbol: str, event: Dict) -> Dict:
    """
    변동률 기반 자동 스토리 생성
    """
    change = event.get('change', 0)
    
    # 변동률에 따른 아이콘 및 설명
    if change > 10:
        icon = "🚀"
        title = "급등 발생"
        description = f"{abs(change):.1f}% 급등했습니다. 강력한 상승 모멘텀을 보였습니다."
        impact = "positive"
    elif change > 5:
        icon = "📈"
        title = "강한 상승"
        description = f"{abs(change):.1f}% 상승했습니다. 긍정적인 시장 반응이 있었습니다."
        impact = "positive"
    elif change > 2:
        icon = "↗️"
        title = "완만한 상승"
        description = f"{abs(change):.1f}% 상승했습니다."
        impact = "positive"
    elif change < -10:
        icon = "📉"
        title = "급락 발생"
        description = f"{abs(change):.1f}% 급락했습니다. 강한 하락 압력이 있었습니다."
        impact = "negative"
    elif change < -5:
        icon = "⚠️"
        title = "데드 크로스 발생"
        description = f"{abs(change):.1f}% 하락했습니다. 단기 평균선이 장기 평균선을 아래로 뚫었으며, 주의가 필요합니다."
        impact = "negative"
    elif change < -2:
        icon = "↘️"
        title = "하락 움직임"
        description = f"{abs(change):.1f}% 하락했습니다."
        impact = "negative"
    else:
        icon = "➡️"
        title = "횡보 움직임"
        description = f"변동폭이 작은 횡보 흐름을 보였습니다."
        impact = "neutral"
    
    return {
        "date": event['date'],
        "price": event['price'],
        "icon": icon,
        "title": title,
        "description": description,
        "impact": impact,
        "change": change,
        "type": "auto"
    }


def create_auto_story(symbol: str, event: Dict) -> Dict:
    """
    변동률 기반 자동 스토리 생성 (뉴스/공시 정보 포함)
    """
    # 먼저 뉴스/공시 정보 추가 (신버전 함수는 파일 하단에 정의됨)
    enriched_event = enrich_event_with_news(symbol, event.get('date', ''), event)
    
    change = enriched_event.get('change', 0)
    event_type = enriched_event.get('type', '')
    
    # 뉴스/공시 정보로 설명 강화
    extra_context = ""
    if 'news' in enriched_event and enriched_event['news'].get('title'):
        extra_context = f" 관련 뉴스: {enriched_event['news']['title']}"
    elif 'disclosure' in enriched_event and enriched_event['disclosure'].get('title'):
        extra_context = f" 관련 공시: {enriched_event['disclosure']['title']}"
    
    # 급등
    if change >= 15:
        return {
            "date": enriched_event['date'],
            "price": enriched_event['price'],
            "icon": "🚀",
            "title": f"급등 {change:.1f}%!",
            "description": f"이날 주가가 {change:.1f}% 급등했어요!{extra_context}",
            "impact": "positive",
            "change": change,
            "type": "auto",
            "news": enriched_event.get('news'),
            "disclosure": enriched_event.get('disclosure')
        }
    
    # 급락
    elif change <= -15:
        return {
            "date": enriched_event['date'],
            "price": enriched_event['price'],
            "icon": "📉",
            "title": f"급락 {abs(change):.1f}%",
            "description": f"이날 주가가 {abs(change):.1f}% 폭락했어요.{extra_context}",
            "impact": "negative",
            "change": change,
            "type": "auto",
            "news": enriched_event.get('news'),
            "disclosure": enriched_event.get('disclosure')
        }
    
    # 골든 크로스
    elif event_type == "golden_cross":
        return {
            "date": enriched_event['date'],
            "price": enriched_event['price'],
            "icon": "✨",
            "title": "골든 크로스 발생!",
            "description": f"단기 평균선이 장기 평균선을 뚫고 올라갔어요. 상승 신호예요!{extra_context}",
            "impact": "positive",
            "change": 0,
            "type": "auto",
            "news": enriched_event.get('news'),
            "disclosure": enriched_event.get('disclosure')
        }
    
    # 데드 크로스
    elif event_type == "dead_cross":
        return {
            "date": enriched_event['date'],
            "price": enriched_event['price'],
            "icon": "⚠️",
            "title": "데드 크로스 발생",
            "description": f"단기 평균선이 장기 평균선 아래로 떨어졌어요. 주의가 필요해요.{extra_context}",
            "impact": "negative",
            "change": 0,
            "type": "auto",
            "news": enriched_event.get('news'),
            "disclosure": enriched_event.get('disclosure')
        }
    
    # 거래량 폭증
    elif event_type == "volume_spike":
        return {
            "date": enriched_event['date'],
            "price": enriched_event['price'],
            "icon": "📊",
            "title": "거래량 폭증!",
            "description": f"평소보다 3배 이상 많은 거래가 일어났어요.{extra_context}",
            "impact": "neutral",
            "change": change,
            "type": "auto",
            "news": enriched_event.get('news'),
            "disclosure": enriched_event.get('disclosure')
        }
    
    return None



# ============================================================
# 뉴스/공시 매칭 함수
# ============================================================

def enrich_event_with_news(symbol: str, event_date: str, event: Dict) -> Dict:
    """
    특정 이벤트에 관련된 뉴스 또는 공시를 찾아서 추가
    
    Args:
        symbol: 종목 코드
        event_date: 이벤트 발생 날짜 (YYYY-MM-DD)
        event: 이벤트 딕셔너리
    
    Returns:
        뉴스/공시 정보가 추가된 이벤트 딕셔너리
    """
    from datetime import datetime, timedelta
    
    enriched_event = event.copy()
    
    try:
        # 날짜 파싱
        event_dt = datetime.strptime(event_date, "%Y-%m-%d")
        
        # 검색 범위: 이벤트 날짜 ±7일 (더 넓은 범위)
        start_date = (event_dt - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (event_dt + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # 1. 뉴스 검색 - 이벤트 날짜 범위의 과거 뉴스 직접 검색
        try:
            from korea_data import get_integrated_stock_news
            print(f"[DEBUG] Fetching historical news for {symbol} between {start_date} and {end_date}...")
            
            # 통합 뉴스 함수로 심볼 기반 검색
            news_list = get_integrated_stock_news(symbol=symbol)
            
            print(f"[DEBUG] Found {len(news_list)} news items in date range")
            
            if news_list:
                for idx, news_item in enumerate(news_list[:5], 1):
                    print(f"[DEBUG] News {idx}: {news_item.get('date')} - {news_item.get('title', '')[:50]}...")
                
                # 첫 번째 뉴스 사용
                enriched_event['news'] = {
                    'title': news_list[0].get('title', ''),
                    'link': news_list[0].get('link', ''),
                    'publisher': news_list[0].get('press', news_list[0].get('publisher', ''))
                }
                print(f"[DEBUG] ✓ Using news: {news_list[0].get('title', '')[:50]}")
            else:
                print(f"[DEBUG] ✗ No news found in date range {start_date} to {end_date}")
        except Exception as e:
            print(f"News matching error: {e}")
        
        # 2. 공시 검색 (한국 주식인 경우)
        if symbol.endswith('.KS') or symbol.endswith('.KQ'):
            try:
                from korea_data import get_dart_disclosures
                clean_symbol = symbol.replace('.KS', '').replace('.KQ', '')
                disclosures = get_dart_disclosures(clean_symbol)
                
                if disclosures:
                    for disclosure in disclosures[:20]:  # 최근 20개만 확인
                        if 'date' in disclosure:
                            disc_date = disclosure['date']
                            if start_date <= disc_date <= end_date:
                                enriched_event['disclosure'] = {
                                    'title': disclosure.get('title', ''),
                                    'link': disclosure.get('link', ''),
                                    'submitter': disclosure.get('submitter', ''),
                                    'type': disclosure.get('type', '')
                                }
                                break  # 첫 번째 매칭 공시 사용
            except Exception as e:
                print(f"Disclosure matching error: {e}")
    
    except Exception as e:
        print(f"Event enrichment error: {e}")
    
    return enriched_event


# ============================================================
# 메인 함수
# ============================================================

def get_chart_story(symbol: str, period: str = "1y", interval: str = "1d") -> Dict:
    """
    차트 스토리텔링 데이터 생성
    
    Args:
        symbol: 종목 코드
        period: 기간
        interval: 데이터 간격 (1d, 1wk, 1mo)
    
    Returns:
        스토리 데이터
    """
    try:
        # 1. 변곡점 탐지 (현재 interval에 맞춰 탐지)
        events = detect_inflection_points(symbol, period, interval)
        
        # 2. 스토리 매칭
        stories = match_events_with_stories(symbol, events)
        
        # 3. 각 스토리에 뉴스/공시 정보 추가
        enriched_stories = []
        for story in stories:
            if 'date' in story:
                enriched_story = enrich_event_with_news(symbol, story['date'], story)
                enriched_stories.append(enriched_story)
            else:
                enriched_stories.append(story)
        
        # 4. 가격 데이터 가져오기 (OHLV 포함)
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        price_data = []
        for date, row in hist.iterrows():
            price_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": float(row['Volume'])
            })
        
        return {
            "success": True,
            "symbol": symbol,
            "period": period,
            "price_data": price_data,
            "stories": enriched_stories,
            "total_stories": len(enriched_stories)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"스토리 생성 중 오류 발생: {str(e)}"
        }
