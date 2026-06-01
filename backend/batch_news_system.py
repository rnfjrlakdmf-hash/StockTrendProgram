"""
🚀 배치 뉴스 수집 시스템 (1만명 규모 최적화)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 핵심 전략: "1번 대량 수집 → 이용자별 분류 발송"

기존 방식 (비효율):
  이용자 10,000명 × 관심종목 5개 = 50,000번 API 호출/사이클
  → 하루 API 호출 수 폭발 → 25,000 한도 초과

개선된 방식 (배치):
  Step 1: 모든 이용자 관심종목 수집 → 중복 제거 (예: 200개 고유 종목)
  Step 2: 200개 종목 × 1회 API 호출 = 200번만 호출
  Step 3: 수집된 뉴스를 메모리 캐시에 저장
  Step 4: 각 이용자 관심종목에 맞춰 분류하여 FCM 발송
  → 하루 약 4,800 ~ 9,600회 (한도의 19~38%만 사용)

📊 API 호출 계획:
  - 상위 100개 인기종목: 30분마다 재수집 (100 × 48 = 4,800회/일)
  - 나머지 종목:        2시간마다 재수집 (최대 200 × 12 = 2,400회/일)
  - 총 최대 약 7,200회/일 (25,000 한도의 29%)

✅ 공식 네이버 Open API 사용 (상업적 이용 합법)
✅ 이용자 수 1만명 → 10만명으로 늘어도 API 호출 수 동일
"""

import asyncio
import os
import re
import time
import requests
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Dict, List, Set, Optional
from collections import defaultdict
from db_manager import get_db_connection

# ─── 일반 시장 기사 및 스팸/봇 기사 제외 패턴 ────────────────────────────
# 이런 기사들은 특정 종목 이름이 나와도 단순 시세 나열이거나 기계 생성(봇) 기사일 확률이 높음
GENERIC_EXCLUDE_PATTERNS = [
    r'서학개미.{0,20}(담|매수|사들)',  # 서학개미 매수 리스트 기사
    r'주간\s*(톱픽|TOP)',             # 주간 톱픽 나열 기사
    r'오늘의\s*주식',                  # 오늘의 주식 나열
    r'(급등|급락)\s*(종목|주)',        # 급등/급락 종목 나열 (특정 종목 주제 아님)
    r'관련주.{0,10}(들썩|강세|급등)',  # 테마 관련주 나열
    r'\d+개\s*종목',                  # N개 종목 나열형
    r'(상위|하위)\s*\d+',             # 상위/하위 N위 나열
    # ── [추가] 단순 시세 봇 기사 필터링 (탑스타뉴스, 빅데이터뉴스 등) ──
    r'주가.*\d+원.*\d+%?\s*(상승|하락|등락|급등|급락)', # 예: 삼성중공업 주가, 6월 1일 장중 28,200원 0.89% 상승
    r'(외국인|기관|개인|투신).*(순매수|순매도|팔고|사고)', # 예: 외국인/기관 순매수 상위 종목
    r'\[빅데이터 리포트\]',            # 기계 생성 리포트
    r'(투자|매매)\s*동향',             # 매매 동향 나열
    r'거래량\s*(급증|폭발)',           # 단순 거래량 알림
]

# 해외 종목 한글 대표명 정제 (검색 최적화용) ─────────────────────────────────
# 너무 길거나 복잡한 한글명 → 짧고 명확한 검색 키워드로 변환
FOREIGN_KR_SEARCH_NAME = {
    "GOOGL": "구글", "GOOG": "구글",
    "AAPL": "애플", "TSLA": "테슬라", "MSFT": "마이크로소프트",
    "NVDA": "엔비디아", "AMZN": "아마존", "META": "메타",
    "NFLX": "넷플릭스", "AMD": "AMD", "INTC": "인텔",
    "QCOM": "퀄컴", "AVGO": "브로드컴", "ASML": "ASML",
    "KO": "코카콜라", "PEP": "펩시", "SBUX": "스타벅스",
    "NKE": "나이키", "DIS": "디즈니", "PFE": "화이자",
    "MRNA": "모더나", "PLTR": "팔란티어", "BA": "보잉",
    "WMT": "월마트", "COST": "코스트코", "V": "비자",
    "MA": "마스터카드", "SNOW": "스노우플레이크",
    "ARM": "ARM", "SMCI": "슈퍼마이크로", "DELL": "델",
    "BABA": "알리바바", "TM": "도요타", "SONY": "소니",
    "SPOT": "스포티파이", "UBER": "우버", "ABNB": "에어비앤비",
    "SHOP": "쇼피파이", "LLY": "일라이릴리", "TSM": "TSMC",
    "MU": "마이크론", "COIN": "코인베이스", "HOOD": "로빈후드",
    "RIVN": "리비안", "LCID": "루시드",
}

# ─── 네이버 Open API 설정 ──────────────────────────────────────────────────
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
NAVER_NEWS_API_URL = "https://openapi.naver.com/v1/search/news.json"

# ─── 인기 종목 판단 기준 ────────────────────────────────────────────────────
TOP_STOCK_MIN_USERS = 5   # 5명 이상 관심 등록 → 인기 종목 (30분 주기)
OTHER_STOCK_INTERVAL = 120  # 나머지 종목: 2시간(120분) 주기

# ─── 뉴스 캐시 유효 시간 ────────────────────────────────────────────────────
NEWS_CACHE_TTL_MINUTES = 30   # 30분간 캐시 유지

# ─── 해외 종목 영문명 매핑 ──────────────────────────────────────────────────
GLOBAL_ENGLISH_NAMES = {
    "AAPL": "Apple", "TSLA": "Tesla", "MSFT": "Microsoft", "NVDA": "Nvidia",
    "AMZN": "Amazon", "GOOGL": "Alphabet", "GOOG": "Alphabet", "META": "Meta",
    "NFLX": "Netflix", "AMD": "AMD", "INTC": "Intel", "QCOM": "Qualcomm",
    "AVGO": "Broadcom", "TXN": "Texas Instruments", "ASML": "ASML",
    "KO": "Coca-Cola", "PEP": "Pepsi", "SBUX": "Starbucks", "NKE": "Nike",
    "DIS": "Disney", "MCD": "McDonald", "JNJ": "Johnson Johnson",
    "PFE": "Pfizer", "MRNA": "Moderna", "PLTR": "Palantir",
    "BA": "Boeing", "BAC": "Bank America", "WMT": "Walmart",
    "COST": "Costco", "V": "Visa", "MA": "Mastercard",
    "SNOW": "Snowflake", "ARM": "ARM Holdings", "SMCI": "Super Micro",
    "DELL": "Dell", "BABA": "Alibaba", "TM": "Toyota", "SONY": "Sony",
    "SPOT": "Spotify", "UBER": "Uber", "ABNB": "Airbnb",
    "SHOP": "Shopify", "LLY": "Eli Lilly", "TSM": "TSMC",
    "MU": "Micron", "COIN": "Coinbase", "HOOD": "Robinhood",
    "RIVN": "Rivian", "LCID": "Lucid Motors",
}


def is_korean_stock(symbol: str) -> bool:
    """국내 종목 여부 (6자리 숫자)"""
    clean = symbol.split('.')[0]
    return clean.isdigit() and len(clean) == 6


def fetch_naver_news_official(query: str, display: int = 100) -> List[dict]:
    """
    ✅ 공식 네이버 Open API로 뉴스 검색
    - 상업적 이용 합법
    - 안정적, 차단 없음
    - display: 최대 100개까지 한 번에 수집
    """
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("[BatchNews] ⚠️ 네이버 API 키 미설정! .env 파일을 확인하세요.")
        return []

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": query,
        "display": min(display, 100),  # 최대 100개
        "start": 1,
        "sort": "date",  # 최신순
    }

    try:
        res = requests.get(NAVER_NEWS_API_URL, headers=headers, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            items = data.get("items", [])
            # HTML 태그 제거 + 제목에서 [도메인] 패턴 제거
            cleaned = []
            for item in items:
                title = re.sub(r'<[^>]+>', '', item.get("title", ""))
                # [www.site.com] 또는 [site.com] 같은 도메인 태그 제거
                title = re.sub(r'\[([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})\]\s*', '', title).strip()
                # HTML 엔티티 디코딩 (&amp; &lt; &gt; &quot; 등)
                import html as html_lib
                title = html_lib.unescape(title)
                desc = re.sub(r'<[^>]+>', '', item.get("description", ""))
                desc = html_lib.unescape(desc)
                # 언론사 도메인에서 깔끔한 이름 추출 (www. 제거)
                original_link = item.get("originallink", "")
                raw_domain = original_link.split("/")[2] if original_link else ""
                publisher = raw_domain.replace("www.", "").split(".")[0] if raw_domain else "네이버 뉴스"
                cleaned.append({
                    "title": title,
                    "description": desc,
                    "link": item.get("link", ""),
                    "publisher": publisher,
                    "pubDate": item.get("pubDate", ""),
                })
            return cleaned
        elif res.status_code == 401:
            print("[BatchNews] ❌ 네이버 API 인증 실패. Client ID/Secret 확인 필요.")
        elif res.status_code == 429:
            print("[BatchNews] ⚠️ 네이버 API 호출 한도 초과!")
        else:
            print(f"[BatchNews] 네이버 API 오류: {res.status_code}")
    except Exception as e:
        print(f"[BatchNews] 네이버 API 호출 실패: {e}")

    return []


class BatchNewsSystem:
    """
    1만명 규모 최적화 배치 뉴스 수집 및 분류 발송 시스템
    
    작동 원리:
    1. 스케줄러가 주기적으로 collect_and_distribute() 호출
    2. DB에서 모든 이용자 관심종목 수집 → 중복 제거
    3. 종목별 인기도 계산 (= 관심 이용자 수)
    4. 인기 종목부터 네이버 API로 뉴스 수집 (종목당 1회 호출)
    5. 수집된 뉴스를 메모리 캐시에 저장
    6. 각 이용자의 관심종목 뉴스만 필터링하여 FCM 발송
    """

    def __init__(self):
        self.running = False
        # 뉴스 캐시: {symbol: {"news": [...], "fetched_at": datetime}}
        self.news_cache: Dict[str, dict] = {}
        # 발송 이력: {symbol: {article_id: True}}
        self.sent_log: Dict[str, Set[str]] = {}
        # 종목별 마지막 수집 시각
        self.last_fetched: Dict[str, datetime] = {}
        # API 호출 통계
        self.api_call_count_today = 0
        self.api_call_reset_time = datetime.now().replace(hour=0, minute=0, second=0)

        self._load_sent_history()

    def _load_sent_history(self):
        """서버 재시작 시 DB에서 발송 이력 복원"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS batch_news_sent_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    article_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            cursor.execute("""
                SELECT symbol, article_id FROM batch_news_sent_log
                WHERE sent_at > datetime('now', '-24 hours')
            """)
            rows = cursor.fetchall()
            conn.close()

            for symbol, article_id in rows:
                if symbol not in self.sent_log:
                    self.sent_log[symbol] = set()
                self.sent_log[symbol].add(article_id)

            print(f"[BatchNews] [OK] 발송 이력 복원: {len(rows)}건")
        except Exception as e:
            print(f"[BatchNews] 발송 이력 복원 실패 (무시): {e}")

    def _save_sent_log(self, symbol: str, article_id: str, title: str):
        """발송 이력 DB 저장"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO batch_news_sent_log (symbol, article_id, title)
                VALUES (?, ?, ?)
            """, (symbol, article_id, title))
            cursor.execute("DELETE FROM batch_news_sent_log WHERE sent_at < datetime('now', '-7 days')")
            conn.commit()
            conn.close()
        except Exception:
            pass

    def _is_already_sent(self, symbol: str, article_id: str) -> bool:
        """이미 발송된 뉴스인지 확인"""
        return article_id in self.sent_log.get(symbol, set())

    def _mark_sent(self, symbol: str, article_id: str, title: str):
        """발송 완료 마킹"""
        if symbol not in self.sent_log:
            self.sent_log[symbol] = set()
        self.sent_log[symbol].add(article_id)
        self._save_sent_log(symbol, article_id, title)

    def _reset_daily_counter(self):
        """자정 이후 API 호출 카운터 초기화"""
        now = datetime.now()
        if now.date() > self.api_call_reset_time.date():
            self.api_call_count_today = 0
            self.api_call_reset_time = now.replace(hour=0, minute=0, second=0)

    def _should_fetch(self, symbol: str, user_count: int) -> bool:
        """해당 종목을 지금 수집해야 하는지 판단"""
        self._reset_daily_counter()

        # 일일 API 호출 한도 체크 (안전 마진: 25,000 중 20,000만 사용)
        if self.api_call_count_today >= 20000:
            print(f"[BatchNews] ⚠️ 일일 API 호출 한도(20,000) 도달. 오늘 수집 중지.")
            return False

        last = self.last_fetched.get(symbol)
        if last is None:
            return True  # 한 번도 수집 안 됨

        elapsed_minutes = (datetime.now() - last).total_seconds() / 60

        # 인기 종목 (5명 이상 관심): 30분 주기
        if user_count >= TOP_STOCK_MIN_USERS:
            return elapsed_minutes >= 30
        # 일반 종목: 2시간 주기
        else:
            return elapsed_minutes >= OTHER_STOCK_INTERVAL

    def _get_news_query(self, symbol: str, kr_name: Optional[str]) -> str:
        """종목별 최적 검색 쿼리 생성 (단순하고 정확한 키워드 사용)"""
        if is_korean_stock(symbol):
            # 국내 종목: 한글 이름으로 검색 (짧고 핵심적인 이름)
            name = kr_name or symbol
            # 너무 긴 이름은 첫 단어만 사용 (예: "삼성전자우" → "삼성전자")
            if len(name) > 6 and '우' == name[-1]:
                name = name[:-1]
            return f"{name} 주식"
        else:
            # 해외 종목: 정제된 한글 대표명 우선 사용
            base = symbol.split('.')[0]
            # 정제된 한글 대표명 (예: "구글 Class A" → "구글")
            clean_kr = FOREIGN_KR_SEARCH_NAME.get(base)
            if clean_kr:
                return f"{clean_kr} 주식"
            # 영문명 사용
            en_name = GLOBAL_ENGLISH_NAMES.get(base, base)
            return f"{en_name} stock"

    def fetch_and_cache_news(self, symbol: str, kr_name: Optional[str]):
        """
        종목 뉴스 수집 및 캐시 저장 (API 1회 호출로 최대 100개 뉴스 저장)
        """
        query = self._get_news_query(symbol, kr_name)
        news_items = fetch_naver_news_official(query, display=100)

        self.news_cache[symbol] = {
            "news": news_items,
            "fetched_at": datetime.now(),
            "query": query,
        }
        self.last_fetched[symbol] = datetime.now()
        self.api_call_count_today += 1

        print(f"[BatchNews] 📰 수집완료 [{symbol}] '{query}' → {len(news_items)}개 뉴스 (오늘 누적 API: {self.api_call_count_today}회)")

    def get_cached_news(self, symbol: str) -> List[dict]:
        """캐시된 뉴스 반환 (유효 시간 내)"""
        cached = self.news_cache.get(symbol)
        if not cached:
            return []
        age_minutes = (datetime.now() - cached["fetched_at"]).total_seconds() / 60
        if age_minutes > NEWS_CACHE_TTL_MINUTES:
            return []  # 캐시 만료
        return cached.get("news", [])

    def _parse_pub_date(self, pub_date_str: str) -> Optional[datetime]:
        """네이버 API pubDate 파싱 (예: 'Sun, 25 May 2026 08:30:00 +0900')"""
        try:
            return parsedate_to_datetime(pub_date_str).replace(tzinfo=None)
        except Exception:
            return None

    def _is_recent_news(self, item: dict, max_hours: int = 48) -> bool:
        """뉴스가 최근 N시간 이내인지 확인 (오래된 뉴스 차단)"""
        pub_date = self._parse_pub_date(item.get("pubDate", ""))
        if pub_date is None:
            return True  # 날짜 파싱 실패 시 허용 (안전)
        cutoff = datetime.now() - timedelta(hours=max_hours)
        return pub_date >= cutoff

    def _is_generic_market_article(self, title: str) -> bool:
        """일반 시장 나열형 기사인지 확인 (특정 종목 주제 아님)"""
        for pattern in GENERIC_EXCLUDE_PATTERNS:
            if re.search(pattern, title):
                return True
        return False

    def _relevance_score(self, title: str, keywords: List[str]) -> int:
        """
        제목 기반 관련성 점수 계산
        점수 기준:
          +3 : 키워드가 제목 앞 20자 이내에 등장 (주어/주제)
          +2 : 키워드가 제목에 독립 단어로 등장
          +1 : 키워드가 제목 어딘가에 등장
           0 : 제목에 없음 → 발송 불가
        최소 통과 점수: 1점 이상 (제목에 반드시 포함)
        """
        score = 0
        title_lower = title.lower()

        for kw in keywords:
            if not kw or len(kw) < 2:
                continue
            kw_lower = kw.lower()

            if kw_lower in title_lower:
                score += 1  # 기본 점수: 제목에 존재
                # 앞 20자 이내면 +2 추가 (주제로 등장)
                pos = title_lower.find(kw_lower)
                if pos <= 20:
                    score += 2
                # 독립 단어로 등장하면 +1 추가
                # (예: "구글" vs "구글플렉스" 구분)
                pattern = r'(?<![\w가-힣])' + re.escape(kw_lower) + r'(?![\w가-힣])'
                if re.search(pattern, title_lower):
                    score += 1

        return score

    def filter_relevant_news(
        self,
        news_items: List[dict],
        symbol: str,
        kr_name: Optional[str],
        min_score: int = 1
    ) -> List[dict]:
        """
        🔍 강화된 3단계 관련성 필터

        단계 1: 날짜 필터 — 48시간 이내 뉴스만 허용
        단계 2: 일반 시장 기사 제외 — 종목 나열형 기사 차단
        단계 3: 점수 기반 관련성 — 제목에 반드시 종목명 포함 + 위치 점수
        """
        if not news_items:
            return []

        relevant = []
        is_korean = is_korean_stock(symbol)
        base_symbol = symbol.split('.')[0]

        # 매칭 키워드 목록 구성
        keywords = []
        if is_korean:
            # 국내 종목: 한글 이름 + 종목코드
            if kr_name:
                keywords.append(kr_name)
                # 약칭 추가 (예: "삼성전자" → "삼성"은 너무 광범위하므로 생략)
                # 단, 이름이 4자 이상이면 앞 3자도 추가
                if len(kr_name) >= 4:
                    keywords.append(kr_name[:3])
            keywords.append(base_symbol)  # 종목코드
        else:
            # 해외 종목: 정제된 한글명 + 영문명 + 티커
            clean_kr = FOREIGN_KR_SEARCH_NAME.get(base_symbol)
            if clean_kr:
                keywords.append(clean_kr)
            elif kr_name and kr_name != base_symbol:
                # 복잡한 이름이면 첫 단어만 ("구글 Class A" → "구글")
                first_word = kr_name.split()[0]
                if len(first_word) >= 2:
                    keywords.append(first_word)

            en_name = GLOBAL_ENGLISH_NAMES.get(base_symbol, "")
            if en_name:
                # 영문명의 첫 단어만 사용 ("Bank America" → "Bank"는 너무 광범위)
                # 단어가 1개이거나 고유명사면 그대로
                en_words = [w for w in en_name.split() if len(w) >= 4]
                keywords.extend(en_words[:2])  # 최대 2단어

            keywords.append(base_symbol)  # 티커 (예: NVDA, TSLA)

        for item in news_items:
            title = item.get("title", "")
            if not title:
                continue

            # ── 단계 1: 날짜 필터 ────────────────────────────────────────
            if not self._is_recent_news(item, max_hours=48):
                continue  # 48시간 이상 된 뉴스 차단

            # ── 단계 2: 일반 시장 나열 기사 제외 ────────────────────────
            if self._is_generic_market_article(title):
                continue  # "서학개미 매수 리스트" 등 차단

            # ── 단계 3: 점수 기반 관련성 검사 ────────────────────────────
            score = self._relevance_score(title, keywords)
            if score >= min_score:
                item["_relevance_score"] = score  # 디버깅용
                relevant.append(item)

        # 관련성 점수 높은 순으로 정렬 (최대 10개만 발송)
        relevant.sort(key=lambda x: x.get("_relevance_score", 0), reverse=True)
        return relevant[:10]

    async def collect_and_distribute(self):
        """
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        핵심 메서드: 배치 수집 → 이용자별 분류 발송
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        흐름:
        1. DB에서 모든 이용자 관심종목 로드
        2. 종목별 관심 이용자 수 계산 (인기도 측정)
        3. 인기 종목부터 순서대로 뉴스 수집 (API 절약)
        4. 각 이용자의 관심종목 뉴스 분류
        5. 새 뉴스 있는 이용자에게만 FCM 발송
        """
        print(f"\n[BatchNews] ━━━ 배치 수집 시작 ({datetime.now().strftime('%H:%M:%S')}) ━━━")

        # ── Step 1: DB에서 모든 관심종목 로드 ────────────────────────────
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT w.user_id, w.symbol
                FROM watchlist w
                JOIN fcm_tokens f ON w.user_id = f.user_id
                WHERE f.token IS NOT NULL AND f.token != ''
            """)
            rows = cursor.fetchall()
            conn.close()
        except Exception as e:
            print(f"[BatchNews] DB 조회 실패: {e}")
            return

        if not rows:
            print("[BatchNews] 관심종목 없음. 건너뜀.")
            return

        # ── Step 2: 종목별 관심 이용자 집계 ──────────────────────────────
        # symbol → [user_id, user_id, ...]
        symbol_users: Dict[str, List[str]] = defaultdict(list)
        for user_id, symbol in rows:
            symbol_users[symbol].append(user_id)

        # 인기도 순으로 정렬 (많이 관심 받는 종목 먼저 수집)
        sorted_symbols = sorted(symbol_users.items(), key=lambda x: len(x[1]), reverse=True)

        total_symbols = len(sorted_symbols)
        top_symbols = [(s, u) for s, u in sorted_symbols if len(u) >= TOP_STOCK_MIN_USERS]
        other_symbols = [(s, u) for s, u in sorted_symbols if len(u) < TOP_STOCK_MIN_USERS]

        print(f"[BatchNews] 📊 총 {total_symbols}개 고유 종목 | 인기({len(top_symbols)}개) | 일반({len(other_symbols)}개)")
        print(f"[BatchNews] 👥 총 활성 이용자: {len(set(u for _, users in sorted_symbols for u in users))}명")

        # ── Step 3: 뉴스 수집 (종목당 API 1회 호출) ──────────────────────
        # 한글 종목명 로드
        kr_names = self._load_kr_names([s for s, _ in sorted_symbols])

        fetched_count = 0
        for symbol, users in sorted_symbols:
            if not self._should_fetch(symbol, len(users)):
                continue  # 이미 최근에 수집했거나 한도 초과

            kr_name = kr_names.get(symbol)
            self.fetch_and_cache_news(symbol, kr_name)
            fetched_count += 1

            # API 과부하 방지: 종목 간 0.3초 지연
            await asyncio.sleep(0.3)

        print(f"[BatchNews] 🔄 이번 사이클 신규 수집: {fetched_count}개 종목")

        # ── Step 4~5: 이용자별 뉴스 분류 및 FCM 발송 ─────────────────────
        await self._distribute_to_users(symbol_users, kr_names)

        print(f"[BatchNews] ━━━ 배치 완료 ({datetime.now().strftime('%H:%M:%S')}) ━━━\n")

    async def _distribute_to_users(
        self,
        symbol_users: Dict[str, List[str]],
        kr_names: Dict[str, str]
    ):
        """
        수집된 캐시 뉴스를 이용자별로 분류하여 FCM 발송
        - 같은 뉴스를 여러 이용자에게 한 번에 발송 (멀티캐스트 최적화)
        """
        # 발송할 내용: {article_id: {"news": item, "users": [user_id, ...], "symbol": ..., "kr_name": ...}}
        pending_sends: Dict[str, dict] = {}

        for symbol, users in symbol_users.items():
            kr_name = kr_names.get(symbol, symbol)
            news_items = self.get_cached_news(symbol)

            if not news_items:
                continue

            # 관련 뉴스만 필터링
            relevant = self.filter_relevant_news(news_items, symbol, kr_name)

            for item in relevant:
                # 고유 ID: 링크 기반
                article_id = item.get("link", "") or str(hash(item.get("title", "")))
                if not article_id:
                    continue

                # 이미 발송된 뉴스 스킵
                if self._is_already_sent(symbol, article_id):
                    continue

                # 발송 대기 목록에 추가
                key = f"{symbol}_{article_id}"
                if key not in pending_sends:
                    pending_sends[key] = {
                        "news": item,
                        "symbol": symbol,
                        "kr_name": kr_name,
                        "users": [],
                    }
                pending_sends[key]["users"].extend(users)

        if not pending_sends:
            print("[BatchNews] 새로운 뉴스 없음.")
            return

        print(f"[BatchNews] 📤 발송 준비: {len(pending_sends)}건의 새 뉴스")

        # 실제 FCM 발송
        sent_count = 0
        for key, send_data in pending_sends.items():
            try:
                success = await self._send_fcm(
                    symbol=send_data["symbol"],
                    kr_name=send_data["kr_name"],
                    news_item=send_data["news"],
                    user_ids=list(set(send_data["users"])),  # 중복 이용자 제거
                )
                if success:
                    article_id = send_data["news"].get("link", "")
                    self._mark_sent(
                        send_data["symbol"],
                        article_id,
                        send_data["news"].get("title", "")
                    )
                    sent_count += 1
            except Exception as e:
                print(f"[BatchNews] FCM 발송 오류: {e}")

        print(f"[BatchNews] [OK] 발송 완료: {sent_count}건")

    async def _send_fcm(
        self,
        symbol: str,
        kr_name: str,
        news_item: dict,
        user_ids: List[str]
    ) -> bool:
        """FCM 멀티캐스트 발송"""
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_user_fcm_tokens

            is_korean = is_korean_stock(symbol)
            title_text = news_item.get("title", "새로운 소식")
            publisher = news_item.get("publisher", "")

            # 혹시 title에 남아있는 도메인 패턴 한 번 더 제거 (이중 방어)
            import re as _re, html as _html
            clean_title = _re.sub(r'\[([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})\]\s*', '', title_text).strip()
            clean_title = _html.unescape(clean_title)

            # 알림 제목: [뉴스 속보] 형식으로 통일
            push_title = f"📰 [뉴스 속보] {kr_name}"

            # 본문: 제목 + 언론사 출처
            push_body = clean_title
            if publisher:
                push_body += f"\n\n출처: {publisher}"

            # 뉴스 알림 허용한 이용자 토큰만 수집
            all_tokens = []
            for uid in user_ids:
                tokens_data = get_user_fcm_tokens(uid)
                for t in tokens_data:
                    if t.get("pref_news", True) and t.get("token"):
                        all_tokens.append(t["token"])

            if not all_tokens:
                return False

            clean_symbol = symbol.split('.')[0]
            result = send_multicast_notification(
                tokens=all_tokens,
                title=push_title,
                body=push_body,
                data={
                    "type": "news_alert",
                    "symbol": clean_symbol,
                    "url": f"/discovery?q={clean_symbol}",
                    "news_url": news_item.get("link", ""),
                    "is_global": str(not is_korean).lower(),
                }
            )

            if result.get("success"):
                success_count = result.get("success_count", 0)
                print(f"[BatchNews] 📱 [{kr_name}] → {success_count}대 발송 완료: {title_text[:40]}")
                return True

        except Exception as e:
            print(f"[BatchNews] FCM 오류 ({symbol}): {e}")

        return False

    def _load_kr_names(self, symbols: List[str]) -> Dict[str, str]:
        """종목 한글 이름 일괄 로드"""
        result = {}
        try:
            from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
            for symbol in symbols:
                if is_korean_stock(symbol):
                    name = get_korean_stock_name(symbol)
                    result[symbol] = name or symbol
                else:
                    base = symbol.split('.')[0]
                    kr = GLOBAL_KOREAN_NAMES.get(base) or GLOBAL_KOREAN_NAMES.get(symbol)
                    if isinstance(kr, list):
                        result[symbol] = kr[0]
                    elif kr:
                        result[symbol] = kr
                    else:
                        result[symbol] = base
        except Exception as e:
            print(f"[BatchNews] 한글 이름 로드 실패 (무시): {e}")
        return result

    def get_api_stats(self) -> dict:
        """API 호출 통계 반환 (관리자 대시보드용)"""
        self._reset_daily_counter()
        return {
            "api_calls_today": self.api_call_count_today,
            "api_limit_daily": 25000,
            "safe_limit": 20000,
            "usage_percent": round(self.api_call_count_today / 25000 * 100, 1),
            "cached_symbols": len(self.news_cache),
            "sent_log_symbols": len(self.sent_log),
        }

    async def start(self, interval_minutes: int = 10):
        """
        배치 뉴스 수집 스케줄러 시작
        - interval_minutes: 사이클 간격 (기본 10분)
        """
        self.running = True
        print(f"[BatchNews] 🚀 배치 뉴스 시스템 시작 (사이클: {interval_minutes}분)")
        print(f"[BatchNews] 📋 인기종목({TOP_STOCK_MIN_USERS}명+): 30분 주기 | 일반종목: 2시간 주기")

        while self.running:
            try:
                await self.collect_and_distribute()
            except Exception as e:
                print(f"[BatchNews] 사이클 오류: {e}")

            # 다음 사이클까지 대기
            await asyncio.sleep(interval_minutes * 60)

    def stop(self):
        self.running = False
        print("[BatchNews] 시스템 중지")


# ─── 전역 인스턴스 ──────────────────────────────────────────────────────────
batch_news_system = BatchNewsSystem()
