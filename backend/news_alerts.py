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
        """특정 종목의 최신 뉴스 1건을 확인하고 변경 시 알림 발송"""
        from stock_data import fetch_google_news

        kr_name, en_name, is_korean = get_stock_display_info(symbol)

        def _fetch_news():
            news_items = []

            # ── 관련성 판단 함수 ──────────────────────────────────────────
            def _is_relevant(title: str) -> bool:
                """뉴스 제목이 해당 종목과 관련있는지 확인"""
                title_lower = title.lower()

                if is_korean:
                    # 국내 종목: 한글 이름 기반 체크
                    def _get_abbreviations(name):
                        abbrs = {name}
                        if name.endswith("중공업"): abbrs.add(name[:-3] + "重")
                        elif name.endswith("전자"): abbrs.update([name[:-2] + "전", name[:-2] + "電"])
                        elif name.endswith("자동차"): abbrs.add(name[:-3] + "차")
                        elif name.endswith("바이오로직스"): abbrs.add(name[:-5] + "바이오")
                        elif name == "카카오뱅크": abbrs.add("카뱅")
                        elif name == "카카오페이": abbrs.add("카페")
                        elif name == "SK하이닉스": abbrs.add("하이닉스")
                        return abbrs

                    for vn in _get_abbreviations(kr_name):
                        if vn in title:
                            return True
                    return False
                else:
                    # 해외 종목: 티커, 영문명, 한글명 모두 체크
                    # 1) 티커 심볼 체크 (예: AAPL, TSLA)
                    if symbol.upper() in title.upper():
                        return True
                    # 2) 영문 회사명 체크 (예: Apple, Tesla)
                    if en_name:
                        for word in en_name.split():
                            if len(word) > 3 and word.lower() in title_lower:
                                return True
                    # 3) 한글명 체크 (예: 애플, 테슬라)
                    if kr_name and kr_name != symbol:
                        # 한글명이 있고 티커와 다른 경우만
                        if isinstance(GLOBAL_KOREAN_NAMES.get(symbol), list):
                            for kn in GLOBAL_KOREAN_NAMES[symbol]:
                                if kn in title:
                                    return True
                        elif kr_name in title:
                            return True
                    return False

            # ── 1. 네이버 뉴스 (국내 종목만) ─────────────────────────────
            clean_sym = symbol.split('.')[0]
            if is_korean:
                try:
                    url = f"https://m.stock.naver.com/api/news/stock/{clean_sym}?pageSize=1"
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    res = requests.get(url, headers=headers, timeout=5)
                    data = res.json()
                    if data and len(data) > 0 and 'items' in data[0] and len(data[0]['items']) > 0:
                        item = data[0]['items'][0]
                        n_title = item.get('title', '')
                        office_id = item.get('officeId', '')
                        article_id = item.get('articleId', '')

                        if _is_relevant(n_title):
                            news_items.append({
                                'id': article_id,
                                'title': n_title,
                                'publisher': item.get('officeName', '네이버 뉴스'),
                                'source': 'naver',
                                'url': f"https://m.stock.naver.com/investment/news/article/{office_id}/{article_id}" if office_id and article_id else f"/discovery?symbol={symbol}"
                            })
                        else:
                            print(f"[NewsAlert] Filtered irrelevant Naver News for {kr_name}: {n_title}")
                except Exception as e:
                    print(f"[NewsAlert] Naver news fetch error for {symbol}: {e}")

            # ── 2. 구글 뉴스 ──────────────────────────────────────────────
            try:
                if is_korean:
                    # 국내 종목: 한글 검색
                    search_query = f"{kr_name} 주식" if not kr_name.endswith('주식') else kr_name
                    g_news = fetch_google_news(search_query)
                else:
                    # 해외 종목: 영문 검색 우선
                    if en_name:
                        search_query = f"{en_name} stock"
                    else:
                        search_query = f"{symbol} stock"
                    g_news = fetch_google_news(search_query, lang='en', region='US')

                if g_news and len(g_news) > 0:
                    top_g = g_news[0]
                    g_title = top_g.get('title', '')

                    if _is_relevant(g_title):
                        news_items.append({
                            'id': top_g.get('link'),
                            'title': g_title,
                            'publisher': top_g.get('publisher', '구글 뉴스'),
                            'source': 'google',
                            'url': top_g.get('link') or f"/discovery?symbol={symbol}"
                        })
                    else:
                        print(f"[NewsAlert] Filtered irrelevant Google News for {kr_name}({symbol}): {g_title}")
            except Exception as e:
                print(f"[NewsAlert] Google news fetch error for {symbol}: {e}")

            return news_items

        fetched_news = await asyncio.to_thread(_fetch_news)
        if not fetched_news:
            return

        # 새로운 기사 확인 및 알림 발송
        for item in fetched_news:
            key = f"{symbol}_{item['source']}"
            article_id = item['id']

            if not article_id:
                continue

            if self.last_seen_articles.get(key) != article_id:
                self.last_seen_articles[key] = article_id

                # 중복 속보 방지: 최근 발송된 기사 제목과 유사도 검사
                new_title_words = set(re.findall(r'\w+', item['title']))
                is_duplicate = False

                recent_titles = self.sent_titles.get(symbol, [])
                for past_title in recent_titles:
                    past_words = set(re.findall(r'\w+', past_title))
                    if not new_title_words or not past_words:
                        continue
                    intersection = len(new_title_words.intersection(past_words))
                    # 제목 내 단어의 40% 이상이 일치하면 같은 뉴스로 간주
                    similarity = intersection / min(len(new_title_words), len(past_words))
                    if similarity > 0.4:
                        is_duplicate = True
                        break

                if is_duplicate:
                    print(f"[NewsAlert] 중복 뉴스 알림 차단 ({kr_name}): {item['title']}")
                    continue

                # 최근 발송 제목 목록에 추가 (최대 10개 유지)
                if symbol not in self.sent_titles:
                    self.sent_titles[symbol] = []
                self.sent_titles[symbol].append(item['title'])
                if len(self.sent_titles[symbol]) > 10:
                    self.sent_titles[symbol].pop(0)

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
            if not is_korean:
                source_icon = "🌐"  # 해외 종목
            elif source == 'naver':
                source_icon = "🇰🇷"
            else:
                source_icon = "📰"

            push_title = f"{source_icon} {display_name} 속보!"
            push_body = f"[{office_name}] {title}"
            news_url = news_item.get('url') or f"/discovery?symbol={symbol}"

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
                    "symbol": str(symbol),
                    "url": str(news_url),
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
