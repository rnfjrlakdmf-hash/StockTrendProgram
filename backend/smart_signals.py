"""
Smart Signals — 거래량 폭증, 공시, 수급 이상 감지
팩트 기반 이벤트 감지 시스템 (투자 추천 없음)
"""

import json
import traceback
from datetime import datetime, timedelta
from typing import List, Dict, Optional


def detect_volume_surge(symbol: str, threshold: float = 2.0) -> Optional[Dict]:
    """
    거래량 폭증 감지
    현재 거래량이 20일 평균 대비 threshold배 이상이면 시그널 생성
    
    Returns: signal dict or None
    """
    try:
        from korea_data import get_stock_quote_naver
        
        quote = get_stock_quote_naver(symbol)
        if not quote:
            return None
        
        volume = quote.get("volume", 0)
        avg_volume = quote.get("avg_volume", 0)
        
        # 평균 거래량이 없으면 스킵
        if not avg_volume or avg_volume == 0:
            return None
        
        ratio = volume / avg_volume
        
        if ratio >= threshold:
            name = quote.get("name", symbol)
            price = quote.get("price", 0)
            change_pct = quote.get("change_pct", 0)
            
            return {
                "symbol": symbol,
                "signal_type": "VOLUME_SURGE",
                "title": f"🔥 {name} 거래량 {int(ratio * 100)}% 폭증",
                "summary": f"현재 거래량 {volume:,}주 (20일 평균 {avg_volume:,}주 대비 {ratio:.1f}배)",
                "data": {
                    "name": name,
                    "volume": volume,
                    "avg_volume": avg_volume,
                    "ratio": round(ratio, 2),
                    "price": price,
                    "change_pct": change_pct
                }
            }
        
        return None
        
    except Exception as e:
        print(f"[SmartSignal] Volume surge detection error for {symbol}: {e}")
        return None


def detect_new_disclosures(symbol: str, last_check_titles: list = None) -> List[Dict]:
    """
    새로운 공시감지
    
    Returns: list of signal dicts
    """
    signals = []
    try:
        from dart_disclosure import get_dart_disclosures
        
        disclosures = get_dart_disclosures(symbol)
        if not disclosures:
            return []
        
        last_titles = set(last_check_titles or [])
        
        for disc in disclosures[:5]:  # 최근 5개만 체크
            title = disc.get("title", "")
            if title and title not in last_titles:
                # 주요 공시 키워드 체크
                important_keywords = [
                    "유상증자", "무상증자", "자기주식", "전환사채",
                    "실적", "영업이익", "매출액", "배당",
                    "분할", "합병", "인수", "매각", "상장폐지",
                    "보호예수", "신주인수권", "사업보고서"
                ]
                
                is_important = any(kw in title for kw in important_keywords)
                
                signals.append({
                    "symbol": symbol,
                    "signal_type": "DISCLOSURE",
                    "title": f"📢 {disc.get('submitter', symbol)} 공시: {title[:40]}",
                    "summary": title,
                    "data": {
                        "full_title": title,
                        "date": disc.get("date", ""),
                        "link": disc.get("link", ""),
                        "type": disc.get("type", ""),
                        "is_important": is_important
                    }
                })
        
        return signals
        
    except Exception as e:
        print(f"[SmartSignal] Disclosure detection error for {symbol}: {e}")
        return []


def detect_investor_surge(symbol: str) -> Optional[Dict]:
    """
    외국인/기관 수급 이상 감지
    최근 매수/매도가 급변한 경우 시그널 생성
    
    Returns: signal dict or None
    """
    try:
        from korea_data import get_investor_history
        
        history = get_investor_history(symbol, days=10)
        if not history or len(history) < 3:
            return None
        
        # 최근 데이터
        latest = history[0] if history else {}
        foreign_net = latest.get("foreign_net", 0)
        inst_net = latest.get("institution_net", 0)
        
        # 이전 5일 평균
        prev_foreign = []
        prev_inst = []
        for h in history[1:6]:
            prev_foreign.append(h.get("foreign_net", 0))
            prev_inst.append(h.get("institution_net", 0))
        
        avg_foreign = sum(prev_foreign) / len(prev_foreign) if prev_foreign else 0
        avg_inst = sum(prev_inst) / len(prev_inst) if prev_inst else 0
        
        # 임계값: 평균의 3배 이상 변동
        signals_found = []
        
        if abs(foreign_net) > 0 and avg_foreign != 0:
            if abs(foreign_net) > abs(avg_foreign) * 3:
                direction = "순매수" if foreign_net > 0 else "순매도"
                return {
                    "symbol": symbol,
                    "signal_type": "INVESTOR_SURGE",
                    "title": f"👥 {symbol} 외국인 {direction} 급변",
                    "summary": f"외국인 {direction} {abs(foreign_net):,}주 (5일 평균 대비 급변)",
                    "data": {
                        "foreign_net": foreign_net,
                        "institution_net": inst_net,
                        "avg_foreign": round(avg_foreign),
                        "avg_institution": round(avg_inst),
                        "date": latest.get("date", "")
                    }
                }
        
        if abs(inst_net) > 0 and avg_inst != 0:
            if abs(inst_net) > abs(avg_inst) * 3:
                direction = "순매수" if inst_net > 0 else "순매도"
                return {
                    "symbol": symbol,
                    "signal_type": "INVESTOR_SURGE",
                    "title": f"🏦 {symbol} 기관 {direction} 급변",
                    "summary": f"기관 {direction} {abs(inst_net):,}주 (5일 평균 대비 급변)",
                    "data": {
                        "foreign_net": foreign_net,
                        "institution_net": inst_net,
                        "avg_foreign": round(avg_foreign),
                        "avg_institution": round(avg_inst),
                        "date": latest.get("date", "")
                    }
                }
        
        return None
        
    except Exception as e:
        print(f"[SmartSignal] Investor surge detection error for {symbol}: {e}")
        return None


def scan_watchlist_signals(watchlist_symbols: List[str]) -> List[Dict]:
    """
    관심 종목 리스트에 대해 모든 시그널을 스캔
    
    Returns: list of detected signals
    """
    all_signals = []
    
    for symbol in watchlist_symbols:
        try:
            # 1. 거래량 폭증
            vol_signal = detect_volume_surge(symbol)
            if vol_signal:
                all_signals.append(vol_signal)
            
            # 2. 공시 감지
            disc_signals = detect_new_disclosures(symbol)
            all_signals.extend(disc_signals)
            
            # 3. 수급 이상
            inv_signal = detect_investor_surge(symbol)
            if inv_signal:
                all_signals.append(inv_signal)
                
        except Exception as e:
            print(f"[SmartSignal] Scan error for {symbol}: {e}")
    
    return all_signals


def get_investor_top_stocks(market: str = "KR", limit: int = 10) -> Dict:
    """
    외국인/기관 순매수 상위 종목 조회
    
    Returns: dict with foreign_top and institution_top lists
    """
    try:
        from korea_data import get_market_investors
        
        data = get_market_investors()
        if not data:
            return {"foreign_top": [], "institution_top": []}
        
        return {
            "foreign_top": (data.get("foreign_buy", []) or [])[:limit],
            "institution_top": (data.get("institution_buy", []) or [])[:limit],
            "foreign_sell": (data.get("foreign_sell", []) or [])[:limit],
            "institution_sell": (data.get("institution_sell", []) or [])[:limit],
        }
        
    except Exception as e:
        print(f"[SmartSignal] Get investor top error: {e}")
        return {"foreign_top": [], "institution_top": []}
