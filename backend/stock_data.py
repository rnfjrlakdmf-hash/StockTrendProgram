import yfinance as yf
import pandas as pd
from GoogleNews import GoogleNews
import datetime

def get_stock_info(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 기본 정보 추출 (fast_info 우선 사용)
        try:
            current_price = ticker.fast_info.last_price
            previous_close = ticker.fast_info.previous_close
        except:
             # fast_info 실패 시 info 사용
            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
            previous_close = info.get('previousClose', info.get('regularMarketPreviousClose', 0))
        
        if previous_close and previous_close != 0:
            change_percent = ((current_price - previous_close) / previous_close) * 100
            change_str = f"{change_percent:+.2f}%"
        else:
            change_str = "0.00%"

        # 언어 감지 및 뉴스 검색 (한국 주식은 ko, 미국은 en)
        lang = 'ko' if '.KS' in symbol or '.KQ' in symbol else 'en'
        stock_news = fetch_google_news(f"{symbol} stock news", lang=lang)

        # 재무 지표 추출
        pe_ratio = info.get('trailingPE')
        pbr = info.get('priceToBook')
        roe = info.get('returnOnEquity')
        revenue_growth = info.get('revenueGrowth')
        market_cap = info.get('marketCap')
        
        # 시가총액 포맷팅 (TK -> Trillion/Billion)
        if market_cap:
            if market_cap > 1e12:
                mkt_cap_str = f"{market_cap / 1e12:.2f}T"
            elif market_cap > 1e9:
                mkt_cap_str = f"{market_cap / 1e9:.2f}B"
            else:
                mkt_cap_str = f"{market_cap / 1e6:.2f}M"
        else:
            mkt_cap_str = "N/A"

        # 통화 정보 확인
        currency = None
        
        # 1. 한국 종목(.KS, .KQ)은 무조건 KRW로 강제 설정 (API 오류 방지)
        if symbol.endswith('.KS') or symbol.endswith('.KQ'):
            currency = 'KRW'
            
        # 2. 그 외의 경우 fast_info 사용
        if not currency:
            try:
                currency = ticker.fast_info.currency
            except:
                pass
        
        # 3. 그래도 없으면 info 사용
        if not currency:
            currency = info.get('currency')
        
        # 4. 기본값 설정
        if not currency:
            currency = 'USD'

        return {
            "name": info.get('shortName', symbol),
            "symbol": symbol,
            "price": f"{current_price:,.2f}",
            "currency": currency,
            "change": change_str,
            "summary": info.get('longBusinessSummary', 'No summary available.'),
            "sector": info.get('sector', 'Unknown'),
            # AI 분석을 위한 Raw Data
            "financials": {
                "pe_ratio": pe_ratio,
                "pbr": pbr,
                "roe": roe,
                "revenue_growth": revenue_growth,
                "market_cap": mkt_cap_str
            },
            # Google News 데이터 사용
            "news": stock_news[:5],
            # 아래는 나중에 AI가 덮어쓸 값들
            "score": 0, 
            "metrics": {
                "supplyDemand": 0,
                "financials": 0,
                "news": 0
            }
        }
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

def get_simple_quote(symbol: str):
    """
    관심 종목 표시를 위해 가격과 등락률만 빠르게 조회합니다.
    뉴스 검색이나 AI 분석을 수행하지 않습니다.
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # fast_info 사용 (속도 최신화)
        try:
            current_price = ticker.fast_info.last_price
            previous_close = ticker.fast_info.previous_close
        except:
             # fast_info 실패 시 info 사용 (느림)
            info = ticker.info
            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
            previous_close = info.get('previousClose', info.get('regularMarketPreviousClose', 0))
        
        # 데이터가 없거나 0인 경우 처리
        if not current_price:
            return None

        if previous_close and previous_close != 0:
            change_percent = ((current_price - previous_close) / previous_close) * 100
            change_str = f"{change_percent:+.2f}%"
        else:
            change_str = "0.00%"
            
        # 이름 가져오기 (느릴 수 있으므로 실패시 심볼 사용)
        try:
             # fast_info에는 이름이 없으므로 info가 필요하지만, 
             # 티커 객체 생성 시점에 일부 메타데이터가 있을 수 있음.
             # 속도를 위해 이름은 생략하거나 별도 캐싱이 좋지만, 여기선 일단 간단히 시도
             # info를 호출하면 느려지므로, 차라리 symbol을 리턴하거나 클라이언트가 알도록 함.
             # 하지만 UI에 이름이 필요하므로... info 호출 최소화가 필요함.
             # Ticker('AAPL').info 는 HTTP 요청을 함.
             # 일단은 이름 없이 보내거나, 이름을 꼭 원하면 info 호출 (속도 저하 감수)
             # 타협: 이름은 WatchlistWidget에서 관리하거나, 처음 추가할 때 DB에 저장하는게 맞음.
             # 여기서는 UI 표시에 필요한 최소한의 데이터를 위해... info 호출은 뺍니다. 
             # (Watchlist UI에 이름 표시 부분이 있으니 필요하긴 한데... 
             #  기존 코드에서 db_manager가 symbol만 저장해서 이름이 없음)
             # 속도를 위해 일단 이름은 symbol로 대체하고, 필요한 경우만 info 호출 로직 추가 가능.
             pass
        except:
            pass

        return {
            "symbol": symbol,
            "price": f"{current_price:,.2f}",
            "change": change_str,
            # 속도 위해 info 호출 생략 -> 이름란에 심볼 표시될 수 있음. 
            # 제대로 하려면 DB에 name 컬럼 추가를 권장.
            "name": symbol 
        }
    except Exception as e:
        print(f"Simple Quote Error for {symbol}: {e}")
        return None


def fetch_google_news(query, lang='en', period='1d'):
    """Google News에서 뉴스 검색"""
    try:
        googlenews = GoogleNews(lang=lang, period=period)
        googlenews.get_news(query)
        # 결과가 최신순이 아닐 수 있어서 날짜순 정렬 시도 (생략 가능)
        results = googlenews.results()
        
        cleaned_results = []
        for res in results:
            cleaned_results.append({
                "title": res.get("title", ""),
                "publisher": res.get("media", ""),
                "link": res.get("link", ""),
                "published": res.get("date", "") # 날짜 형식 문자열 그대로 전달
            })
        return cleaned_results
    except Exception as e:
        print(f"Google News Error: {e}")
        return []

def get_market_data():
    """주요 지수 및 트렌딩 종목 데이터 수집"""
    indices = [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^IXIC", "label": "NASDAQ"},
        {"symbol": "^KS11", "label": "KOSPI"},
    ]
    
    results = []
    for idx in indices:
        try:
            ticker = yf.Ticker(idx["symbol"])
            # fast_info가 더 빠르고 안정적일 때가 많음
            price = ticker.fast_info.last_price
            prev_close = ticker.fast_info.previous_close
            change = ((price - prev_close) / prev_close) * 100
            
            results.append({
                "label": idx["label"],
                "value": f"{price:,.2f}",
                "change": f"{change:+.2f}%",
                "up": change >= 0
            })
        except:
             # 에러 시 기본값 (이전 가짜 데이터 구조 유지)
            results.append({
                "label": idx["label"],
                "value": "Error",
                "change": "0.00%",
                "up": True
            })

    # 인기 종목 (예시로 고정된 몇 개를 실시간 조회)
    movers_tickers = ["NVDA", "TSLA", "AAPL"]
    movers = []
    
    descriptions = {
        "NVDA": "AI 대장주 수요 지속",
        "TSLA": "전기차 시장 변동성",
        "AAPL": "안정적 기술주 흐름"
    }

    for sym in movers_tickers:
        try:
             t = yf.Ticker(sym)
             p = t.fast_info.last_price
             prev = t.fast_info.previous_close
             chg = ((p - prev) / prev) * 100
             
             movers.append({
                 "name": sym,
                 "price": f"{p:,.2f}",
                 "change": f"{chg:+.2f}%",
                 "desc": descriptions.get(sym, "주요 거래 종목")
             })
        except:
            pass

    return {
        "indices": results,
        "movers": movers
    }

def get_market_news():
    """시장 전반의 주요 뉴스 수집 (Google News 활용)"""
    # 주요 키워드로 검색 (Market News, Tech stocks 등)
    # 한국어 브리핑을 위해 영어 뉴스를 가져와도 되지만, 사용자 편의를 위해 혼합하거나 선택 가능.
    # 여기서는 글로벌 이슈 파악을 위해 'Stock Market News' (en) 사용
    
    news_list = fetch_google_news("Stock Market News", lang='en', period='1d')
    
    # 빅테크 뉴스도 추가
    tech_news = fetch_google_news("NVIDIA Apple Tesla stock", lang='en', period='1d')
    
    # 두 리스트 병합 및 중복 제거 (링크 기준)
    combined = news_list + tech_news
    seen_links = set()
    unique_news = []
    
    for n in combined:
        if n['link'] not in seen_links:
            unique_news.append({
                "source": n['publisher'],
                "title": n['title'],
                "link": n['link'],
                "time": n['published'] # GoogleNews는 '1 hour ago' 같은 문자열을 줄 때가 많음
            })
            seen_links.add(n['link'])
            
    return unique_news[:10] # 최대 10개만 반환

def calculate_technical_sentiment(symbol="^GSPC"):
    """
    기술적 지표를 기반으로 시장 점수(0~100)를 산출합니다.
    - 50일/200일 이동평균선
    - RSI
    - 모멘텀
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6mo")
        
        if hist.empty:
            return 50 # 기본값
            
        # 1. 이동평균선 점수 (40점 만점)
        # 데이터가 부족할 수 있으므로 안전하게 처리
        if len(hist) < 200:
             ma50 = hist['Close'].iloc[-1]
             ma200 = hist['Close'].iloc[-1]
        else:
            ma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
            ma200 = hist['Close'].rolling(window=200).mean().iloc[-1]
            
        current = hist['Close'].iloc[-1]
        
        ma_score = 20
        if current > ma50: ma_score += 10
        if current > ma200: ma_score += 10
        if ma50 > ma200: ma_score += 5 # 골든크로스 상태
        
        # 2. RSI 점수 (30점 만점)
        # 공포/탐욕 지수: RSI가 높으면(탐욕), 낮으면(공포)
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        
        # loss가 0인 경우 처리
        if loss.iloc[-1] == 0:
            rsi_val = 100
        else:
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            rsi_val = rsi.iloc[-1]
        
        # 50을 기준으로 ±15점 변동
        # (rsi - 50) * 0.6 -> ±30 * 0.6 = ±18
        rsi_score = 15 + (rsi_val - 50) * 0.6
        rsi_score = max(0, min(30, rsi_score))
        
        # 3. 모멘텀 점수 (30점 만점)
        month_ago = hist['Close'].iloc[-20] if len(hist) > 20 else hist['Close'].iloc[0]
        momentum = (current - month_ago) / month_ago * 100
        
        # 모멘텀 1%당 2점
        mom_score = 15 + (momentum * 2)
        mom_score = max(0, min(30, mom_score))
        
        total_score = ma_score + rsi_score + mom_score
        return int(max(0, min(100, total_score)))
        
    except Exception as e:
        print(f"Technical Sentiment Error: {e}")
        return 50

def get_insider_trading(symbol: str):
    """
    해당 종목의 내부자 거래 내역을 가져옵니다.
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # yfinance의 insider_transactions (or insider_purchases)
        # DataFrame을 반환하므로 리스트 dict로 변환해야 함
        insider = ticker.insider_transactions
        
        if insider is None or insider.empty:
            return []
            
        # 최신 10개만, 날짜순 정렬
        # 컬럼명이 다를 수 있으므로 확인 필요하나 보통: 'Shares', 'Value', 'Text', 'Start Date' 등
        trades = []
        
        # 인덱스가 날짜인 경우가 많음, 혹은 'Start Date' 컬럼
        # reset_index를 통해 모든 데이터를 컬럼으로
        df = insider.reset_index()
        
        # 컬럼 이름 표준화 시도 (yfinance 버전에 따라 다름)
        # 보통: 'Insider', 'Position', 'URL', 'Text', 'Start Date', 'Ownership', 'Value', 'Shares'
        
        for _, row in df.head(10).iterrows():
            # 날짜 처리
            date_val = row.get('Start Date', row.get('Date', 'N/A'))
            if isinstance(date_val, (pd.Timestamp, datetime.datetime)):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)
                
            trades.append({
                "insider": row.get('Insider', 'Unknown'),
                "position": row.get('Position', ''),
                "date": date_str,
                "shares": int(row.get('Shares', 0)) if pd.notna(row.get('Shares')) else 0,
                "value": int(row.get('Value', 0)) if pd.notna(row.get('Value')) else 0,
                "text": row.get('Text', '')  # Sale / Purchase ...
            })
            
        return trades

    except Exception as e:
        print(f"Insider Data Error for {symbol}: {e}")
        return []


def get_macro_calendar():
    """
    이번 주의 주요 거시 경제 일정(CPI, FOMC 등)을 반환합니다.
    실제 API 연동 대신 데모용 정적 데이터를 반환합니다.
    추후 Fred API나 Investing.com 크롤링으로 대체 가능.
    """
    # 데모 데이터: 현재 날짜 기준으로 동적으로 생성하거나 고정된 중요 이벤트 표시
    today = datetime.date.today()
    
    # 예시 이벤트 리스트
    events = [
        {"event": "CPI 발표 (소비자물가지수)", "importance": "High", "time": "22:30"},
        {"event": "FOMC 회의록 공개", "importance": "High", "time": "04:00 (익일)"},
        {"event": "신규 실업수당 청구건수", "importance": "Medium", "time": "22:30"},
        {"event": "비농업 고용지수", "importance": "High", "time": "21:30"},
        {"event": "PPI 발표 (생산자물가지수)", "importance": "Medium", "time": "22:30"}
    ]
    
    # 요일별로 배치 (월~금)
    weekly_calendar = []
    start_of_week = today - datetime.timedelta(days=today.weekday())
    
    for i in range(5):
        day = start_of_week + datetime.timedelta(days=i)
        
        # 임의로 이벤트 배정 (실제론 날짜 매핑 필요)
        day_events = []
        if i == 1: # 화
             day_events.append(events[0])
        elif i == 2: # 수
             day_events.append(events[1])
        elif i == 3: # 목
             day_events.append(events[2])
        elif i == 4: # 금
             day_events.append(events[3])
             day_events.append(events[4])
             
        weekly_calendar.append({
            "date": day.strftime("%Y-%m-%d"),
            "day": day.strftime("%A"),
            "events": day_events
        })
        
    return weekly_calendar

def get_all_assets():
    """
    주식, 코인, 환율, 원자재 등 다양한 자산군의 현재 시세를 반환합니다.
    """
    tickers = {
        "Indices": [
            {"symbol": "^GSPC", "name": "S&P 500"},
            {"symbol": "^KS11", "name": "KOSPI"},
            {"symbol": "^N225", "name": "Nikkei 225"}
        ],
        "Crypto": [
            {"symbol": "BTC-USD", "name": "Bitcoin"},
            {"symbol": "ETH-USD", "name": "Ethereum"},
            {"symbol": "XRP-USD", "name": "Ripple"}
        ],
        "Forex": [
            {"symbol": "KRW=X", "name": "USD/KRW"},
            {"symbol": "JPYKRW=X", "name": "JPY/KRW"},
            {"symbol": "EURKRW=X", "name": "EUR/KRW"}
        ],
        "Commodity": [
            {"symbol": "GC=F", "name": "Gold"},
            {"symbol": "CL=F", "name": "Crude Oil"},
            {"symbol": "SI=F", "name": "Silver"}
        ]
    }
    
    result = {}
    
    for category, items in tickers.items():
        category_data = []
        for item in items:
            try:
                t = yf.Ticker(item["symbol"])
                # fast_info 사용
                price = t.fast_info.last_price
                prev = t.fast_info.previous_close
                change = ((price - prev) / prev) * 100
                
                category_data.append({
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": price,
                    "change": change,
                    "currency": "USD" if "USD" in item["symbol"] or "=F" in item["symbol"] else "KRW" 
                })
            except Exception as e:
                # 에러 발생 시 더미 데이터 혹은 생략
                pass
        result[category] = category_data
        
    return result
