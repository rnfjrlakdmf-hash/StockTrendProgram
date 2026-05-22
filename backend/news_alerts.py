"""
News Alert Monitor (관심종목 뉴스 알림 모니터)
사용자의 관심종목에 새로운 뉴스나 특이 공시가 뜰 경우 푸시 알림을 발송합니다.
국내 종목: 네이버 뉴스 + 구글 뉴스
해외 종목: 구글 뉴스 (영문 검색)
"""

import asyncio
import requests
import re
from typing import Dict, List, Set
from db_manager import get_db_connection
from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
from dart_disclosure import get_dart_disclosures

# 해외 종목 영문 이름 매핑 (구글 뉴스 검색용)
GLOBAL_ENGLISH_NAMES = {
    "AAPL": "Apple", "TSLA": "Tesla", "MSFT": "Microsoft", "NVDA": "Nvidia",
    "AMZN": "Amazon", "GOOGL": "Google", "GOOG": "Google", "META": "Meta",
    "NFLX": "Netflix", "AMD": "AMD", "INTC": "Intel", "QCOM": "Qualcomm",
    "AVGO": "Broadcom", "TXN": "Texas Instruments", "ASML": "ASML",
    "KO": "Coca-Cola", "PEP": "Pepsi", "SBUX": "Starbucks", "NKE": "Nike",
    "DIS": "Disney", "MCD": "McDonald's", "JNJ": "Johnson & Johnson",
    "PFE": "Pfizer", "MRNA": "Moderna", "PLTR": "Palantir", "IONQ": "IonQ",
    "RBLX": "Roblox", "COIN": "Coinbase", "RIVN": "Rivian", "LCID": "Lucid",
    "BA": "Boeing", "BAC": "Bank of America", "WMT": "Walmart",
    "COST": "Costco", "HD": "Home Depot", "PG": "Procter & Gamble",
    "V": "Visa", "MA": "Mastercard", "PANW": "Palo Alto Networks",
    "SNOW": "Snowflake", "ARM": "ARM Holdings", "SMCI": "Super Micro",
    "MSTR": "MicroStrategy", "DELL": "Dell", "BABA": "Alibaba",
    "NIO": "NIO", "XPEV": "Xpeng", "LI": "Li Auto", "HOOD": "Robinhood",
    "SQ": "Block Square", "PYPL": "PayPal", "ADBE": "Adobe",
    "CRM": "Salesforce", "ORCL": "Oracle", "CSCO": "Cisco",
    "TM": "Toyota", "HMC": "Honda", "SONY": "Sony",
    "SPOT": "Spotify", "UBER": "Uber", "ABNB": "Airbnb",
    "SHOP": "Shopify", "LLY": "Eli Lilly", "TSM": "TSMC",
    "UNH": "UnitedHealth", "NVO": "Novo Nordisk",
    "BRK-B": "Berkshire Hathaway", "AIXI": "Aixi", "CRCL": "Circle",
    "MU": "Micron", "SNDK": "SanDisk",
    "TQQQ": "TQQQ Nasdaq", "SOXL": "SOXL semiconductor",
    "SCHD": "SCHD ETF", "JEPI": "JEPI ETF", "SPY": "SPY S&P500",
    "QQQ": "QQQ Nasdaq", "GLD": "Gold ETF", "SLV": "Silver ETF",
    "TLT": "Treasury bond ETF", "TMF": "TMF bond",
    "NVDL": "Nvidia leveraged", "TSLL": "Tesla leveraged",
}


def is_korean_stock(symbol: str) -> bool:
    """국내 종목 여부 판단 (6자리 숫자 = 국내)"""
    clean = symbol.split('.')[0]
    return clean.isdigit() and len(clean) == 6


def get_stock_display_info(symbol: str):
    """
    종목의 표시용 정보 반환
    Returns: (korean_name, english_name, is_korean)
    """
    is_korean = is_korean_stock(symbol)

    if is_korean:
        kr_name = get_korean_stock_name(symbol) or symbol
        return kr_name, None, True
    else:
        # 해외 종목: .O / .N / .A 같은 거래소 suffix 제거 후 매핑 조회
        # 예: "GOOGL.O" → "GOOGL", "AAPL.O" → "AAPL"
        base_symbol = symbol.split('.')[0] if '.' in symbol else symbol

        ko_raw = GLOBAL_KOREAN_NAMES.get(base_symbol) or GLOBAL_KOREAN_NAMES.get(symbol, base_symbol)
        if isinstance(ko_raw, list):
            kr_name = ko_raw[0]
        else:
            kr_name = ko_raw

        en_name = GLOBAL_ENGLISH_NAMES.get(base_symbol) or GLOBAL_ENGLISH_NAMES.get(symbol)
        return kr_name, en_name, False



class NewsAlertMonitor:
    def __init__(self):
        self.running = False
        self.check_interval = 120  # 2분마다 체크
        self.last_seen_articles = {}  # {symbol_source: last_article_id}
        self.sent_titles = {}  # {symbol: [title1, title2, ...]}
        self._load_sent_history()  # 서버 재시작 시 발송 이력 복원

    def _load_sent_history(self):
        """DB에서 최근 24시간 이내 발송된 뉴스 이력을 불러와 중복 방지에 활용"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            # news_sent_log 테이블이 없으면 생성
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS news_sent_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    article_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            # 최근 24시간 이내 발송된 기록 로드
            cursor.execute("""
                SELECT symbol, article_id, title FROM news_sent_log
                WHERE sent_at > datetime('now', '-24 hours')
                ORDER BY sent_at DESC
            """)
            rows = cursor.fetchall()
            conn.close()
            for symbol, article_id, title in rows:
                if symbol not in self.last_seen_articles:
                    self.last_seen_articles[symbol] = []
                self.last_seen_articles[symbol].append(str(article_id))
                if symbol not in self.sent_titles:
                    self.sent_titles[symbol] = []
                if title not in self.sent_titles[symbol]:
                    self.sent_titles[symbol].append(title)
            print(f"[NewsAlert] 발송 이력 복원 완료: {len(rows)}건")
        except Exception as e:
            print(f"[NewsAlert] 발송 이력 복원 실패 (무시): {e}")

    def _save_sent_log(self, symbol: str, article_id: str, title: str):
        """발송된 뉴스를 DB에 기록 (재시작 후에도 중복 방지)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            # 이미 같은 article_id가 최근 24시간 내 기록되어 있으면 스킵
            cursor.execute("""
                SELECT 1 FROM news_sent_log
                WHERE symbol=? AND article_id=?
                AND sent_at > datetime('now', '-24 hours')
            """, (symbol, article_id))
            if cursor.fetchone():
                conn.close()
                return  # 이미 발송된 기사
            cursor.execute("""
                INSERT INTO news_sent_log (symbol, article_id, title) VALUES (?, ?, ?)
            """, (symbol, str(article_id), title))
            # 오래된 로그(7일 초과) 자동 삭제
            cursor.execute("DELETE FROM news_sent_log WHERE sent_at < datetime('now', '-7 days')")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[NewsAlert] 발송 로그 저장 실패 (무시): {e}")

    async def start(self):
        """뉴스 모니터링 시작"""
        print("[NewsAlert] Monitor started (국내 + 해외 종목 지원)")
        self.running = True

        while self.running:
            try:
                await self.check_all_news()
            except Exception as e:
                print(f"[NewsAlert] Error in monitoring loop: {e}")

            await asyncio.sleep(self.check_interval)

    def stop(self):
        self.running = False
        print("[NewsAlert] Monitor stopped")

    async def check_all_news(self):
        """관심종목의 최신 뉴스 체크 (국내 + 해외 모두)"""
        conn = get_db_connection()
        cursor = conn.cursor()

        # FCM 토큰이 있는 활성 사용자의 관심종목만 가져옴
        cursor.execute("""
            SELECT DISTINCT w.user_id, w.symbol
            FROM watchlist w
            JOIN fcm_tokens f ON w.user_id = f.user_id
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return

        # 심볼별 유저 리스트 매핑
        symbol_users = {}
        for user_id, symbol in rows:
            if symbol not in symbol_users:
                symbol_users[symbol] = []
            symbol_users[symbol].append(user_id)

        # 각 심볼별로 뉴스 확인 (국내/해외 구분 없이 처리)
        for symbol, users in symbol_users.items():
            await self.check_symbol_news(symbol, users)
            await asyncio.sleep(2)  # 구글/네이버 차단 방지를 위한 2초 대기

    async def check_symbol_news(self, symbol: str, users: List[str]):
        """특정 종목의 최신 뉴스를 확인하고 변경 시 알림 발송"""
        from stock_data import fetch_google_news

        kr_name, en_name, is_korean = get_stock_display_info(symbol)

        def _fetch_news():
            news_items = []

            # ── 관련성 판단 함수 ──────────────────────────────────────────
            def _is_relevant(title: str, item_source: str) -> bool:
                """뉴스 제목이 해당 종목과 관련있는지 확인"""
                title_lower = title.lower()

                # 네이버 종목 뉴스판과 직접 등록한 DART 공시는 관련성 100% 신뢰
                if item_source in ('naver', 'disclosure'):
                    return True

                if is_korean:
                    # 국내 종목: 한글 이름 기반 체크
                    def _get_abbreviations(name):
                        clean_name = re.sub(r'(?:홀딩스|바이오로직스|중공업|전자|자동차|제?\d+호?스팩|우선주|우)$', '', name).strip()
                        abbrs = {name, clean_name}
                        if name.endswith("중공업"): abbrs.add(name[:-3] + "重")
                        elif name.endswith("전자"): abbrs.update([name[:-2] + "전", name[:-2] + "電"])
                        elif name.endswith("자동차"): abbrs.add(name[:-3] + "차")
                        elif name.endswith("바이오로직스"): abbrs.add(name[:-5] + "바이오")
                        elif name == "카카오뱅크": abbrs.add("카뱅")
                        elif name == "카카오페이": abbrs.add("카페")
                        elif name == "SK하이닉스": abbrs.add("하이닉스")
                        if len(clean_name) >= 3:
                            abbrs.add(clean_name[:2])
                        return {x for x in abbrs if x and len(x) >= 2}

                    for vn in _get_abbreviations(kr_name):
                        if vn in title:
                            return True
                    return False
                else:
                    # 해외 종목: 티커, 영문명, 한글명 모두 체크
                    if symbol.upper() in title.upper():
                        return True
                    if en_name:
                        for word in en_name.split():
                            if len(word) > 3 and word.lower() in title_lower:
                                return True
                    if kr_name and kr_name != symbol:
                        if isinstance(GLOBAL_KOREAN_NAMES.get(symbol), list):
                            for kn in GLOBAL_KOREAN_NAMES[symbol]:
                                if kn in title:
                                    return True
                        elif kr_name in title:
                            return True
                    return False

            # ── 1. 네이버 뉴스 ─────────────────────────────────────────────
            clean_sym = symbol.split('.')[0]
            if is_korean:
                # 국내 종목: 네이버 증권 종목 뉴스 API (상위 12건 검사)
                try:
                    url = f"https://m.stock.naver.com/api/news/stock/{clean_sym}?pageSize=12"
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    res = requests.get(url, headers=headers, timeout=5)
                    data = res.json()
                    if data and len(data) > 0 and 'items' in data[0] and len(data[0]['items']) > 0:
                        for item in data[0]['items'][:12]:
                            n_title = item.get('title', '')
                            office_id = item.get('officeId', '')
                            article_id = item.get('articleId', '')

                            if _is_relevant(n_title, 'naver'):
                                news_items.append({
                                    'id': article_id,
                                    'title': n_title,
                                    'publisher': item.get('officeName', '네이버 뉴스'),
                                    'source': 'naver',
                                    'url': f"https://m.stock.naver.com/investment/news/article/{office_id}/{article_id}" if office_id and article_id else f"/discovery?q={symbol}"
                                })
                            else:
                                print(f"[NewsAlert] Filtered irrelevant Naver News for {kr_name}: {n_title}")
                except Exception as e:
                    print(f"[NewsAlert] Naver news fetch error for {symbol}: {e}")
            else:
                # 해외 종목: 한글 이름으로 네이버 뉴스 검색 (상위 8건 검사)
                if kr_name and kr_name != clean_sym:
                    try:
                        naver_query = f"{kr_name} 주식" if not kr_name.endswith('주식') else kr_name
                        from stock_data import fetch_google_news as _fetch_naver_style
                        kr_g_news = _fetch_naver_style(naver_query, lang='ko', region='KR')
                        if kr_g_news and len(kr_g_news) > 0:
                            for top_kr in kr_g_news[:8]:
                                kr_title = top_kr.get('title', '')
                                if _is_relevant(kr_title, 'naver_kr'):
                                    news_items.append({
                                        'id': f"kr_google_{hash(kr_title) % 100000}",
                                        'title': kr_title,
                                        'publisher': top_kr.get('publisher', '구글 뉴스 (한국어)'),
                                        'source': 'naver_kr',
                                        'url': top_kr.get('url', f"/discovery?q={symbol}")
                                    })
                                    print(f"[NewsAlert] 🇰🇷 한국어 뉴스 발견 for {kr_name}: {kr_title[:40]}")
                    except Exception as e:
                        print(f"[NewsAlert] Korean news fetch error for {symbol}: {e}")

            # ── 2. 구글 뉴스 ──────────────────────────────────────────────
            try:
                if is_korean:
                    search_query = f"{kr_name} 주식" if not kr_name.endswith('주식') else kr_name
                    g_news = fetch_google_news(search_query)
                else:
                    if en_name:
                        search_query = f"{en_name} stock"
                    else:
                        search_query = f"{symbol} stock"
                    g_news = fetch_google_news(search_query, lang='en', region='US')

                if g_news and len(g_news) > 0:
                    for top_g in g_news[:8]:
                        g_title = top_g.get('title', '')

                        if _is_relevant(g_title, 'google'):
                            news_items.append({
                                'id': top_g.get('link'),
                                'title': g_title,
                                'publisher': top_g.get('publisher', '구글 뉴스'),
                                'source': 'google',
                                'url': top_g.get('link') or f"/discovery?q={symbol}"
                            })
                        else:
                            print(f"[NewsAlert] Filtered irrelevant Google News for {kr_name}({symbol}): {g_title}")
            except Exception as e:
                print(f"[NewsAlert] Google news fetch error for {symbol}: {e}")

            # ── 3. DART 공시 (국내 종목만 지원) ─────────────────────────────
            if is_korean:
                try:
                    disclosures = get_dart_disclosures(symbol, period="1d")
                    for d in disclosures:
                        d_title = d.get('title', '')
                        d_link = d.get('link', '')
                        d_submitter = d.get('submitter', '금융감독원 DART')
                        if d_title and d_link:
                            news_items.append({
                                'id': d_link,
                                'title': f"[공시] {d_title}",
                                'publisher': d_submitter,
                                'source': 'disclosure',
                                'url': d_link
                            })
                except Exception as de:
                    print(f"[NewsAlert] DART disclosure fetch error for {symbol}: {de}")

            return news_items

        fetched_news = await asyncio.to_thread(_fetch_news)
        if not fetched_news:
            return

        # 해당 종목의 캐시 리스트 초기화 확인
        if symbol not in self.last_seen_articles:
            self.last_seen_articles[symbol] = []

        # 새로운 기사 확인 및 알림 발송
        for item in fetched_news:
            article_id = str(item['id'])

            if not article_id:
                continue

            # 중복 체크 ①: 메모리 캐시 리스트 체크
            if article_id in self.last_seen_articles[symbol]:
                continue

            # 중복 속보 방지 ②: DB 기반 article_id 중복 체크 (재시작 후에도 유효)
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 1 FROM news_sent_log
                    WHERE symbol=? AND article_id=?
                    AND sent_at > datetime('now', '-24 hours')
                """, (symbol, article_id))
                already_sent = cursor.fetchone() is not None
                conn.close()
                if already_sent:
                    # 메모리 캐시 싱크 맞추기
                    self.last_seen_articles[symbol].append(article_id)
                    if len(self.last_seen_articles[symbol]) > 100:
                        self.last_seen_articles[symbol].pop(0)
                    print(f"[NewsAlert] 중복 뉴스 차단 (DB 이력, {kr_name}): {item['title'][:40]}")
                    continue
            except Exception:
                pass

            # 중복 속보 방지 ③: 제목 유사도 검사 (기준 70%로 유지)
            new_title_words = set(re.findall(r'\w+', item['title']))
            is_duplicate = False

            recent_titles = self.sent_titles.get(symbol, [])
            for past_title in recent_titles:
                past_words = set(re.findall(r'\w+', past_title))
                if not new_title_words or not past_words:
                    continue
                intersection = len(new_title_words.intersection(past_words))
                similarity = intersection / min(len(new_title_words), len(past_words))
                if similarity > 0.7:
                    is_duplicate = True
                    break

            if is_duplicate:
                print(f"[NewsAlert] 중복 뉴스 알림 차단 (유사도, {kr_name}): {item['title'][:40]}")
                continue

            # 최근 발송 제목 목록에 추가 (최대 20개 유지)
            if symbol not in self.sent_titles:
                self.sent_titles[symbol] = []
            self.sent_titles[symbol].append(item['title'])
            if len(self.sent_titles[symbol]) > 20:
                self.sent_titles[symbol].pop(0)

            # 메모리 캐시에 기사 ID 추가 (최대 100개 유지)
            self.last_seen_articles[symbol].append(article_id)
            if len(self.last_seen_articles[symbol]) > 100:
                self.last_seen_articles[symbol].pop(0)

            # DB에 발송 이력 저장 (재시작 후에도 중복 방지)
            self._save_sent_log(symbol, article_id, item['title'])

            print(f"[NewsAlert] New article detected for {kr_name}({symbol}): {item['title']}")
            await self.send_news_push(symbol, kr_name, is_korean, item, users)

    async def send_news_push(self, symbol: str, display_name: str, is_korean: bool, news_item: dict, users: List[str]):
        """유저들에게 새로운 뉴스 푸시 알림 발송"""
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_user_fcm_tokens

            title = news_item.get('title', '새로운 소식')
            office_name = news_item.get('publisher', '뉴스')
            source = news_item.get('source', '')

            # 국내/해외/소스에 따른 이모지
            if source == 'disclosure':
                source_icon = "📢"
            elif not is_korean:
                source_icon = "🌐"  # 해외 종목
            elif source == 'naver':
                source_icon = "🇰🇷"
            else:
                source_icon = "📰"

            if source == 'disclosure':
                push_title = f"{source_icon} {display_name} 공시 속보!"
            else:
                push_title = f"{source_icon} {display_name} 속보!"
            push_body = f"[{office_name}] {title}"

            # 클릭 시 이동할 URL: 항상 종목발굴 페이지로 (clean symbol 사용)
            clean_symbol = symbol.split('.')[0] if '.' in symbol else symbol
            discovery_url = f"/discovery?q={clean_symbol}"
            news_url = news_item.get('url') or discovery_url

            # 발송할 토큰 모두 수집
            all_tokens = []
            for user_id in users:
                tokens_data = get_user_fcm_tokens(user_id)
                for t in tokens_data:
                    if t.get('pref_news', True):
                        all_tokens.append(t['token'])

            if not all_tokens:
                return

            # 여러 기기에 동시 발송
            result = send_multicast_notification(
                tokens=all_tokens,
                title=push_title,
                body=push_body,
                data={
                    "type": "news_alert",
                    "symbol": str(clean_symbol),
                    "url": str(discovery_url),        # 클릭 시 종목발굴 페이지로 이동
                    "news_url": str(news_url),         # 실제 뉴스 URL (참조용)
                    "is_global": str(not is_korean).lower()
                }
            )


            if result.get('success'):
                market_type = "해외" if not is_korean else "국내"
                print(f"[NewsAlert] [{market_type}] Sent news for {display_name}({symbol}) to {result.get('success_count')} devices")

        except Exception as e:
            print(f"[NewsAlert] Push notification error: {e}")


# 전역 인스턴스
news_alert_monitor = NewsAlertMonitor()
