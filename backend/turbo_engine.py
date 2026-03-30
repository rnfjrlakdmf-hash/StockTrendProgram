import time
import asyncio
from typing import Dict, Any, List
import pandas as pd
import numpy as np
import logging

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
            if time.time() - entry['timestamp'] < self.cache_ttl:
                logger.info(f"⚡ [Cache Hit] {key} - Turbo mode activated (0ms)")
                return entry['data']
            else:
                logger.info(f"⌛ [Cache Expired] {key} - Refreshing data...")
                del self._cache[key] # 만료된 캐시 삭제
        return None

    def set_cache(self, key: str, data: Any):
        """데이터를 메모리에 저장하여 다음 요청 시 즉시 반환"""
        self._cache[key] = {
            'data': data,
            'timestamp': time.time()
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
        return [res for res in results if not isinstance(res, Exception)]

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

# 전역 엔진 인스턴스 (앱 전체에서 공유)
turbo_engine = TurboEngine()
