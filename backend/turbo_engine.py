import time
import asyncio
from typing import Dict, Any, List, Callable
import pandas as pd
import numpy as np
import logging
from functools import wraps

# 터보 엔진 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TurboEngine")

class TurboEngine:
    """
    StockTrendProgram의 핵심 고성능 연산 엔진
    데이터 캐싱 및 퀀트 연산을 전담합니다.
    """
    def __init__(self):
        # 메모리 내 데이터 캐시 (Memory Cache)
        self._cache: Dict[str, Any] = {}
        # 캐시 유지 시간 (초) - 기본 5분 (300초)
        self.cache_ttl = 300 
        logger.info("🚀 Turbo Engine Initialized - High Performance Mode")

    def get_cache(self, key: str):
        """저장된 유효 캐시가 있으면 즉시 반환 (조회 속도 0ms 목표)"""
        if key in self._cache:
            entry = self._cache[key]
            # 시간 만료 여부 확인
            ttl = entry.get('ttl', self.cache_ttl)
            if time.time() - entry['timestamp'] < ttl:
                logger.info(f"⚡ [Cache Hit] {key} - Turbo mode activated (0ms)")
                return entry['data']
            else:
                logger.info(f"⌛ [Cache Expired] {key} - Refreshing data...")
                del self._cache[key] # 만료된 캐시 삭제
        return None

    def set_cache(self, key: str, data: Any, ttl: int = None):
        """데이터를 메모리에 저장하여 다음 요청 시 즉시 반환"""
        self._cache[key] = {
            'data': data,
            'timestamp': time.time(),
            'ttl': ttl if ttl is not None else self.cache_ttl
        }
        logger.info(f"💾 [Cache Set] {key} - Optimized for speed")

    def clear_cache(self):
        """캐시 전체 삭제 (시스템 유지보수용)"""
        self._cache.clear()
        logger.info("🧹 Turbo Engine Cache Cleared")

    async def scan_market_parallel(self, symbols: List[str], fetch_func):
        """
        [Turbo Scan] 병렬 데이터 수집 엔진
        수십 개의 종목 데이터를 동시에 비동기로 수집하여 전수 조사를 가속화합니다.
        """
        tasks = [fetch_func(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_results = []
        for res, symbol in zip(results, symbols):
            if isinstance(res, Exception):
                logger.error(f"❌ [Turbo Scan Error] Failed for {symbol}: {res}")
            elif res:
                valid_results.append(res)
        return valid_results

    def calculate_momentum_score(self, price_series: pd.Series):
        """
        [Turbo Score] 초고속 모멘텀 연산 (NumPy 기반)
        대량의 가격 데이터를 퀀트 전용 로직으로 계산하여 가장 유망한 종목을 선정합니다.
        """
        if price_series.empty or len(price_series) < 20: return 0
        
        # NumPy 벡터 연산으로 속도 극대화
        returns = price_series.pct_change().dropna().values
        if len(returns) == 0: return 0
        
        momentum = np.mean(returns[-20:]) # 최근 20일 평균 수익률
        volatility = np.std(returns)      # 변동성 (위험도)
        
        # 위험 대비 수익률(샤프 지수 스타일) 기반의 터보 점수 산출
        score = (momentum / (volatility + 1e-9)) * 100
        return float(np.round(score, 2))

    async def scan_with_filters(self, filters: Dict[str, Any]):
        """
        [Turbo Filter] 복합 지표 기반 고속 필터링 스캐너
        사용자가 지정한 전략 필터(F-Score, PER 등)를 시장 전체 종목에 적용합니다.
        """
        logger.info(f"🔍 [Turbo Filter] Scanning with: {filters}")
        
        # 1단계: 기본 정보 로드 (실제 구현 시 DB나 캐시에서 상위 N개 가져오기)
        # 여기서는 예시를 위해 korea_data 등에서 가져오는 것으로 가정
        # (실제 서비스에서는 미리 연산된 지표 테이블을 활용)
        from korea_data import get_all_stock_codes
        symbols = get_all_stock_codes()[:100] # 성능상 100개로 제한 (테스트용)
        
        results = []
        
        # 2단계: 각 종목별 지표 체크 (병렬 처리 권장이나 여기선 로직 집중)
        # 실제로는 get_financial_summary 등의 데이터를 활용
        from korea_data import get_financial_summary
        
        async def check_stock(symbol_info):
            symbol = symbol_info['symbol']
            name = symbol_info['name']
            
            # 재무 데이터 가져오기 (캐시 활용)
            summary = get_financial_summary(symbol)
            if not summary: return None
            
            # 필터 조건 검증 로직
            match = True
            
            # 1. F-Score 필터
            if "f_score" in filters:
                target_f = filters["f_score"]
                current_f = summary.get("f_score", 0)
                if current_f < target_f: match = False
                
            # 2. PER 필터
            if match and "per" in filters:
                per_filter = filters["per"]
                current_per = summary.get("per", 999)
                if "max" in per_filter and current_per > per_filter["max"]: match = False
                if "min" in per_filter and current_per < per_filter["min"]: match = False
                
            # 3. 배당수익률 필터 (dividend_yield)
            if match and "dividend_yield" in filters:
                div_filter = filters["dividend_yield"]
                current_div = summary.get("dividend_yield", 0)
                if "min" in div_filter and current_div < div_filter["min"]: match = False

            if match:
                return {
                    "symbol": symbol,
                    "name": name,
                    "price": summary.get("price", 0),
                    "change": summary.get("change", 0),
                    "change_percent": summary.get("change_percent", "0%"),
                    "f_score": summary.get("f_score", 0),
                    "per": summary.get("per", 0),
                    "dividend_yield": summary.get("dividend_yield", 0)
                }
            return None

        # 병렬 실행
        tasks = [check_stock(s) for s in symbols]
        scan_results = await asyncio.gather(*tasks)
        results = [r for r in scan_results if r]
        
        # F-Score 및 점수순 정렬
        results.sort(key=lambda x: (x['f_score'], -x['per']), reverse=True)
        
        logger.info(f"✅ [Turbo Filter] Found {len(results)} matches")
        return results

# 전역 엔진 인스턴스 (앱 전체에서 공유)
turbo_engine = TurboEngine()

def turbo_cache(ttl_seconds: int = 300):
    """
    터보 엔진 기반 캐싱 데코레이터.
    함수의 인자를 기반으로 키를 생성하여, 중복 호출 시 0ms 응답을 달성합니다.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            key_parts = [func.__name__] + [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            cache_key = ":".join(key_parts)
            
            cached_data = turbo_engine.get_cache(cache_key)
            if cached_data is not None:
                return cached_data
                
            result = await func(*args, **kwargs)
            if result is not None:
                turbo_engine.set_cache(cache_key, result, ttl=ttl_seconds)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            key_parts = [func.__name__] + [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            cache_key = ":".join(key_parts)
            
            cached_data = turbo_engine.get_cache(cache_key)
            if cached_data is not None:
                return cached_data
                
            result = func(*args, **kwargs)
            
            # [Fix] Strictly prevent caching None, False, or empty data
            if result is None or result is False:
                return result

            # 상태 코드가 있는 dict 구조일 경우, 성공(success)이 아니면 캐시하지 않음
            if isinstance(result, dict) and result.get("status") == "error":
                return result

            if result:
                turbo_engine.set_cache(cache_key, result, ttl=ttl_seconds)
            return result

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator
