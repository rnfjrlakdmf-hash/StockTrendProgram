from fastapi import APIRouter
import FinanceDataReader as fdr
import yfinance as yf
import logging
from cachetools import TTLCache, cached
from datetime import timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

# Cache for 24 hours (86400 seconds)
@cached(cache=TTLCache(maxsize=1, ttl=86400))
def get_all_kospi_kosdaq():
    try:
        # Fetch KOSPI and KOSDAQ
        df_kospi = fdr.StockListing('KOSPI')
        df_kosdaq = fdr.StockListing('KOSDAQ')
        
        # Fetch US Stocks (NASDAQ, S&P500)
        df_nasdaq = fdr.StockListing('NASDAQ')
        df_sp500 = fdr.StockListing('S&P500')
        
        # Fetch ETFs (Korean)
        df_etf_kr = fdr.StockListing('ETF/KR')
        
        stocks = []
        for _, row in df_kospi.iterrows():
            stocks.append({"ticker": str(row['Code']), "name": str(row['Name']), "market": "KOSPI"})
        for _, row in df_kosdaq.iterrows():
            stocks.append({"ticker": str(row['Code']), "name": str(row['Name']), "market": "KOSDAQ"})
            
        for _, row in df_etf_kr.iterrows():
            stocks.append({"ticker": str(row['Symbol']), "name": str(row['Name']), "market": "ETF"})
            
        # Add US Stocks (avoiding duplicates if in both indices)
        us_tickers = set()
        for _, row in df_sp500.iterrows():
            ticker = str(row['Symbol'])
            if ticker not in us_tickers:
                stocks.append({"ticker": ticker, "name": str(row['Name']), "market": "US"})
                us_tickers.add(ticker)
                
        for _, row in df_nasdaq.iterrows():
            ticker = str(row['Symbol'])
            if ticker not in us_tickers:
                stocks.append({"ticker": ticker, "name": str(row['Name']), "market": "US"})
                us_tickers.add(ticker)
                
        return {"status": "success", "count": len(stocks), "data": stocks}
    except Exception as e:
        logger.error(f"Error fetching stock list: {e}")
        return {"status": "error", "message": str(e)}

import requests
from bs4 import BeautifulSoup

# Cache for 6 hours to prevent rate limits

def parse_naver_cop_table(soup):
    try:
        table = soup.select_one('.section.cop_analysis table')
        if not table:
            return None
            
        thead_ths = [th.text.strip() for th in table.select('thead tr:nth-of-type(2) th')]
        years = [y for y in thead_ths[:4] if y]
        rows = table.select('tbody tr')
        
        def get_row_floats(row_idx):
            if row_idx >= len(rows): return []
            tds = rows[row_idx].select('td')
            vals = []
            for td in tds[:4]:
                t = td.text.strip().replace(',', '')
                if not t or t == '-' or t == 'N/A':
                    vals.append(None)
                else:
                    try:
                        vals.append(float(t))
                    except:
                        vals.append(None)
            return vals

        return {
            "years": years,
            "revenue": get_row_floats(0),
            "operating_income": get_row_floats(1),
            "net_income": get_row_floats(2),
            "operating_margin": get_row_floats(3),
            "net_margin": get_row_floats(4),
            "roe": get_row_floats(5),
            "debt_ratio": get_row_floats(6),
            "quick_ratio": get_row_floats(7),
            "reserve_ratio": get_row_floats(8),
            "eps": get_row_floats(9),
            "per": get_row_floats(10),
            "bps": get_row_floats(11),
            "pbr": get_row_floats(12),
            "dps": get_row_floats(13),
            "dividend_yield": get_row_floats(14),
            "payout_ratio": get_row_floats(15)
        }
    except Exception as e:
        logger.error(f"Error parsing Naver cop table: {e}")
        return None


@cached(cache=TTLCache(maxsize=2000, ttl=21600))
def get_cached_stock_info(ticker: str):
    try:
        import re
        import urllib.parse
        ticker = urllib.parse.unquote(ticker).strip()
        
        # --- Name to Ticker Resolution ---
        if re.search('[가-힣]', ticker):
            stocks_info = get_all_kospi_kosdaq()
            if stocks_info.get('status') == 'success':
                target_name = ticker.replace(" ", "").lower()
                for s in stocks_info['data']:
                    if s['name'].replace(" ", "").lower() == target_name:
                        ticker = s['ticker']
                        break
        # ---------------------------------
        
        is_us_stock = not ticker.isdigit()
        
        if is_us_stock:
            # Handle US Stock via yfinance
            t = yf.Ticker(ticker)
            info = t.info
            cal = t.calendar or {}
            
            name = info.get('shortName') or info.get('longName') or f"종목 {ticker}"
            price = info.get('currentPrice') or info.get('regularMarketPrice') or 0
            prev = info.get('previousClose') or 0
            per = info.get('trailingPE') or 0.0
            pbr = info.get('priceToBook') or 0.0
            div = info.get('dividendYield') or 0.0
            cap = info.get('marketCap') or 0
            summary = info.get('longBusinessSummary') or f"{name} 기업의 핵심 비즈니스 정보 및 주가 동향 리포트입니다."
            
            # Dividend Schedule
            ex_div_date = cal.get('Ex-Dividend Date')
            pay_date = cal.get('Dividend Date')
            ex_div_str = ex_div_date.strftime('%Y-%m-%d') if ex_div_date else None
            pay_str = pay_date.strftime('%Y-%m-%d') if pay_date else None
            
            financials = {
                "years": ["최근 12개월"],
                "revenue": [info.get('totalRevenue') / 100000000 if info.get('totalRevenue') else None],
                "operating_income": [info.get('operatingIncome') / 100000000 if info.get('operatingIncome') else None],
                "net_income": [info.get('netIncomeToCommon') / 100000000 if info.get('netIncomeToCommon') else None],
                "operating_margin": [info.get('operatingMargins') * 100 if info.get('operatingMargins') else None],
                "net_margin": [info.get('profitMargins') * 100 if info.get('profitMargins') else None],
                "roe": [info.get('returnOnEquity') * 100 if info.get('returnOnEquity') else None],
                "debt_ratio": [info.get('debtToEquity') if info.get('debtToEquity') else None],
                "quick_ratio": [info.get('quickRatio') * 100 if info.get('quickRatio') else None],
                "reserve_ratio": None,
                "eps": [info.get('trailingEps')],
                "per": [per],
                "bps": [info.get('bookValue')],
                "pbr": [pbr],
                "dps": [info.get('dividendRate')],
                "dividend_yield": [div * 100 if div else None],
                "payout_ratio": [info.get('payoutRatio') * 100 if info.get('payoutRatio') else None]
            }
            
        else:
            # Handle Korean Stock via modern Naver Mobile JSON API
            m_headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Referer': 'https://m.stock.naver.com/'
            }
            
            name = f"종목 {ticker}"
            price = 0
            prev = 0
            per = 0.0
            pbr = 0.0
            div = 0.0
            cap = 0
            financials = None
            
            # 1. Integration API (시세, PER, PBR, 배당률, 시가총액, 종목명 등)
            try:
                url_int = f"https://m.stock.naver.com/api/stock/{ticker}/integration"
                res_int = requests.get(url_int, headers=m_headers, timeout=5)
                if res_int.status_code == 200:
                    int_data = res_int.json()
                    name = int_data.get('stockName') or name
                    total_infos = {item.get('code'): item.get('value') for item in int_data.get('totalInfos', [])}
                    
                    def parse_int_val(val):
                        if not val: return 0
                        cleaned = re.sub(r'[^0-9-]', '', str(val))
                        try: return int(cleaned)
                        except: return 0

                    def parse_float_val(val):
                        if not val: return 0.0
                        cleaned = re.sub(r'[^0-9.-]', '', str(val))
                        try: return float(cleaned)
                        except: return 0.0

                    price = parse_int_val(total_infos.get('lastClosePrice') or total_infos.get('closePrice'))
                    per = parse_float_val(total_infos.get('per'))
                    pbr = parse_float_val(total_infos.get('pbr'))
                    div = parse_float_val(total_infos.get('dividendYieldRatio')) / 100.0 if total_infos.get('dividendYieldRatio') else 0.0
                    
                    market_val_str = total_infos.get('marketValue') or ''
                    if market_val_str:
                        jo_match = re.search(r'([0-9,]+)조', market_val_str)
                        eok_match = re.search(r'([0-9,]+)억', market_val_str)
                        jo = int(jo_match.group(1).replace(',', '')) if jo_match else 0
                        eok = int(eok_match.group(1).replace(',', '')) if eok_match else 0
                        cap = (jo * 10000 + eok) * 100000000
            except Exception as e:
                logger.error(f"Error fetching naver integration for {ticker}: {e}")

            # 2. 전일가 및 최근가 보정 (/price API)
            prev = price
            try:
                url_price = f"https://m.stock.naver.com/api/stock/{ticker}/price?pageSize=5"
                res_price = requests.get(url_price, headers=m_headers, timeout=4)
                if res_price.status_code == 200:
                    price_list = res_price.json()
                    if isinstance(price_list, list) and len(price_list) >= 2:
                        prev = int(re.sub(r'[^0-9-]', '', str(price_list[1].get('closePrice') or price)))
                    if isinstance(price_list, list) and len(price_list) >= 1 and price == 0:
                        price = int(re.sub(r'[^0-9-]', '', str(price_list[0].get('closePrice') or 0)))
            except Exception as e:
                logger.debug(f"Price fallback error for {ticker}: {e}")

            # 3. 재무제표 API (/finance/annual)
            try:
                url_fin = f"https://m.stock.naver.com/api/stock/{ticker}/finance/annual"
                res_fin = requests.get(url_fin, headers=m_headers, timeout=5)
                if res_fin.status_code == 200:
                    fin_json = res_fin.json()
                    fin_info = fin_json.get('financeInfo', {})
                    tr_list = fin_info.get('trTitleList', [])
                    years = [t.get('title') for t in tr_list]
                    year_keys = [t.get('key') for t in tr_list]
                    
                    row_map = {}
                    for row in fin_info.get('rowList', []):
                        t_name = row.get('title')
                        cols = row.get('columns', {})
                        vals = []
                        for yk in year_keys:
                            raw_v = cols.get(yk, {}).get('value')
                            if not raw_v or raw_v == '-' or raw_v == 'N/A':
                                vals.append(None)
                            else:
                                try:
                                    vals.append(float(raw_v.replace(',', '')))
                                except:
                                    vals.append(None)
                        if t_name:
                            row_map[t_name] = vals
                    
                    if years and row_map:
                        financials = {
                            "years": years,
                            "revenue": row_map.get('매출액', []),
                            "operating_income": row_map.get('영업이익', []),
                            "net_income": row_map.get('당기순이익', []),
                            "operating_margin": row_map.get('영업이익률', []),
                            "net_margin": row_map.get('순이익률', []),
                            "roe": row_map.get('ROE', []),
                            "debt_ratio": row_map.get('부채비율', []),
                            "quick_ratio": row_map.get('당좌비율', []),
                            "reserve_ratio": row_map.get('유보율', []),
                            "eps": row_map.get('EPS', []),
                            "per": row_map.get('PER', []),
                            "bps": row_map.get('BPS', []),
                            "pbr": row_map.get('PBR', []),
                            "dps": row_map.get('주당배당금', []),
                            "dividend_yield": [div * 100 if div else None] * len(years),
                            "payout_ratio": []
                        }
            except Exception as e:
                logger.error(f"Error fetching naver finance annual for {ticker}: {e}")

            summary = f"{name} 기업의 핵심 비즈니스 요약 및 주요 실적 현황입니다. 인공지능 기반 분석을 통해 실시간 주가 동향과 객관적 가치 평가 정보를 제공하고 있습니다."
            
            ex_div_str = None
            pay_str = None
            
            # Fetch dividend schedule for Korean stocks using yfinance
            try:
                cal = yf.Ticker(f"{ticker}.KS").calendar
                if not cal:
                    cal = yf.Ticker(f"{ticker}.KQ").calendar
                
                if cal:
                    ex_div_date = cal.get('Ex-Dividend Date')
                    pay_date = cal.get('Dividend Date')
                    if ex_div_date:
                        ex_div_str = ex_div_date.strftime('%Y-%m-%d')
                    if pay_date:
                        pay_str = pay_date.strftime('%Y-%m-%d')
            except:
                pass

        # Generate internal links (Related Stocks) to enhance Crawl Depth
        all_stocks_res = get_all_kospi_kosdaq()
        related_stocks = []
        if all_stocks_res["status"] == "success":
            import random
            stocks_list = all_stocks_res["data"]
            # Pick 8 random stocks to link to for maximizing SEO crawl depth
            if len(stocks_list) > 8:
                random_picks = random.sample(stocks_list, 8)
                related_stocks = [{"ticker": s["ticker"], "name": s["name"]} for s in random_picks]

        if price == 0 and not ticker.isdigit():
            # Treat 0 price for non-digit tickers as not found
            return {"status": "error", "message": "Stock not found"}

        return {
            "status": "success",
            "ticker": ticker,
            "name": name,
            "price": price,
            "previousClose": prev,
            "per": per,
            "pbr": pbr,
            "dividendYield": div,
            "marketCap": cap,
            "summary": summary,
            "exDividendDate": ex_div_str,
            "paymentDate": pay_str,
            "relatedStocks": related_stocks,
            "financials": financials
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error fetching info for {ticker}: {e}")
        
        # [Fallback Logic] 방대한 크롤링 봇(Google) 접근 시 Rate Limit으로 인한 404(실패) 방지
        fallback_name = ticker
        try:
            stocks_info = get_all_kospi_kosdaq()
            if stocks_info.get("status") == "success":
                for s in stocks_info["data"]:
                    if s["ticker"] == ticker:
                        fallback_name = s["name"]
                        break
        except:
            pass

        return {
            "status": "success",
            "ticker": ticker,
            "name": fallback_name,
            "price": 0,
            "previousClose": 0,
            "per": 0.0,
            "pbr": 0.0,
            "dividendYield": 0.0,
            "marketCap": 0,
            "summary": f"[{fallback_name}] 현재 실시간 주가 연동 중이거나 데이터 검증 중입니다. 본 페이지는 {fallback_name} ({ticker}) 기업의 비즈니스 현황 및 투자 참고용 지표를 제공하기 위한 임시 안내 페이지입니다. 최신 주가 및 AI 분석 결과가 곧 업데이트됩니다.",
            "exDividendDate": None,
            "paymentDate": None,
            "relatedStocks": [{"ticker": "005930", "name": "삼성전자"}, {"ticker": "AAPL", "name": "Apple"}] # 최소한의 연결고리
        }

@router.get("/seo/stocks")
def get_seo_stocks():
    """Returns all KOSPI/KOSDAQ stocks for sitemap generation"""
    return get_all_kospi_kosdaq()

@router.get("/seo/stock-info/{ticker}")
def get_seo_stock_info(ticker: str):
    """Fast cache-friendly endpoint for individual stock SEO page rendering"""
    return get_cached_stock_info(ticker)

# ----------------- Theme SEO Data -----------------
THEMES_DATA = {
    "ai": {"name": "인공지능(AI)", "desc": "글로벌 AI 경쟁이 심화되며 수혜를 입는 기업군입니다.", "risk": "글로벌 빅테크의 기술 발전 속도에 종속적일 수 있습니다.", "leaders": ["035420", "035720"], "followers": ["005930", "000660", "222800"]},
    "secondary-battery": {"name": "2차전지", "desc": "전기차 전환 가속화와 함께 폭발적인 성장이 기대되는 배터리 관련 기업들입니다.", "risk": "전기차 수요 캐즘(Chasm) 및 원자재 가격 변동 리스크가 있습니다.", "leaders": ["373220", "006400", "051910"], "followers": ["086520", "247540", "003670"]},
    "robot": {"name": "로봇/지능형로봇", "desc": "인구 구조 변화와 공장 자동화 수요 증가로 부각되는 로봇 기술 기업군입니다.", "risk": "실제 상용화 시점과 R&D 비용 회수 기간이 길어질 수 있습니다.", "leaders": ["028300", "428140", "058470"], "followers": ["053160", "047310"]},
    "semiconductor": {"name": "반도체 장비", "desc": "AI 칩 수요 증가와 미세공정 전환에 따른 HBM 및 장비 관련 핵심 기업입니다.", "risk": "글로벌 반도체 사이클(업턴/다운턴)에 매우 민감하게 반응합니다.", "leaders": ["005930", "000660", "042700"], "followers": ["036540", "222800", "253450"]},
    "superconductor": {"name": "초전도체", "desc": "상온 상압 초전도체 물질 발견 이슈에 따라 변동성이 극대화되는 테마입니다.", "risk": "학계의 검증 결과에 따라 주가가 극단적으로 변동하는 초고위험 테마입니다.", "leaders": ["045970", "066980"], "followers": ["022220", "011280", "118000"]},
    "low-pbr": {"name": "저PBR (밸류업)", "desc": "정부의 기업 밸류업 프로그램 수혜가 예상되는 자산 가치 대비 저평가 기업들입니다.", "risk": "정부 정책의 연속성 및 기업의 실제 주주환원 의지에 따라 차별화될 수 있습니다.", "leaders": ["055550", "105560", "086790"], "followers": ["316140", "139130", "000810"]},
    "defense": {"name": "방위산업", "desc": "글로벌 지정학적 긴장 고조와 각국의 국방비 증액에 따라 수출이 급증하는 테마입니다.", "risk": "수주 산업 특성상 대규모 계약 지연이나 무기 체계 결함 발생 시 큰 타격을 받습니다.", "leaders": ["012450", "047810", "004020"], "followers": ["079550", "004090"]},
    "entertainment": {"name": "엔터테인먼트", "desc": "K-POP의 글로벌 팬덤 확장과 지적재산권(IP) 수익화로 성장하는 기업들입니다.", "risk": "아티스트의 스캔들, 재계약 불발 등 인적 리스크가 실적에 즉각 반영됩니다.", "leaders": ["352820", "035900", "041510"], "followers": ["122870", "073640"]},
    "bio": {"name": "바이오/제약", "desc": "신약 개발의 폭발적 파급력과 블록버스터 신약 파이프라인을 보유한 제약/바이오 기업입니다.", "risk": "임상 실패 시 주가가 급락하며, 오랜 R&D 기간 동안 막대한 자금이 소요됩니다.", "leaders": ["207940", "068270", "000100"], "followers": ["096530", "008930", "128940"]},
    "ecommerce": {"name": "이커머스/핀테크", "desc": "디지털 결제 확산과 온라인 쇼핑 침투율 증가의 수혜를 받는 플랫폼 기업입니다.", "risk": "해외 직구 플랫폼의 국내 진출 및 치열한 출혈 경쟁으로 인한 마진 압박이 있습니다.", "leaders": ["035420", "035720"], "followers": ["001120", "041140"]},
    "shipbuilding": {"name": "조선/해운", "desc": "슈퍼 사이클 도래 및 친환경 선박 교체 수요로 인해 실적 턴어라운드가 진행되는 섹터입니다.", "risk": "원자재(후판) 가격 상승과 노동 인력 부족이 이익 훼손 요인으로 작용할 수 있습니다.", "leaders": ["329180", "042660", "010140"], "followers": ["011200", "011930", "042700"]},
    "metaverse": {"name": "메타버스", "desc": "가상 현실, 증강 현실 하드웨어 보급 및 가상 세계 플랫폼과 연관된 기술 기업들입니다.", "risk": "아직 대중화 시점이 불확실하며 뚜렷한 수익 모델 구축에 긴 시간이 필요합니다.", "leaders": ["035420", "035720"], "followers": ["032800", "293490", "083500"]},
    "nuclear": {"name": "원자력 발전", "desc": "탄소 중립 달성과 글로벌 원전 르네상스 시대를 맞아 수출 수혜가 기대되는 테마입니다.", "risk": "정치적 이슈에 따른 정책 변동성과 막대한 초기 자본 투입이 리스크입니다.", "leaders": ["034020", "051600"], "followers": ["032560", "013360", "042660"]},
    "cloud": {"name": "클라우드 컴퓨팅", "desc": "기업들의 디지털 전환(DX) 가속화로 폭발적으로 성장하는 클라우드 인프라 및 SaaS 기업입니다.", "risk": "아마존, MS 등 글로벌 빅테크와의 직접적인 경쟁에서 점유율 확보가 어렵습니다.", "leaders": ["030200", "035420", "018260"], "followers": ["001810", "110660"]},
    "gaming": {"name": "게임", "desc": "신작 흥행과 글로벌 IP 확장에 따라 주가 탄력성이 매우 높은 콘텐츠 산업입니다.", "risk": "신작 흥행 실패 시 실적 공백이 길어지며, 중국 등 해외 판호 발급 이슈가 큽니다.", "leaders": ["259960", "036570", "066570"], "followers": ["063080", "293490", "193250"]},
    "webtoon": {"name": "웹툰/웹소설", "desc": "K-스토리의 글로벌 진출 및 드라마/영화화(OSMU) 판권 수익이 기대되는 테마입니다.", "risk": "작가의 불법 유통 리스크와 주요 플랫폼의 수수료 정책 변화에 민감합니다.", "leaders": ["035420", "035720"], "followers": ["087600", "122870", "293490"]},
    "beauty": {"name": "화장품 (인디브랜드)", "desc": "미국 및 동남아로 수출 다변화에 성공한 중소형 뷰티 브랜드 및 ODM 기업들입니다.", "risk": "주요 수출국(미국/일본)의 트렌드 변화가 극심하며 진입 장벽이 낮습니다.", "leaders": ["192820", "137310", "090430"], "followers": ["051900", "031430"]},
    "healthcare": {"name": "원격의료/헬스케어", "desc": "의료 시스템 디지털화 및 비대면 진료 합법화 수혜가 예상되는 헬스케어 테마입니다.", "risk": "의사 협회 등 이익 집단과의 규제 갈등 및 법률 개정 지연 리스크가 존재합니다.", "leaders": ["042000", "033250", "010280"], "followers": ["022100", "005930"]},
    "aviation": {"name": "항공/여행", "desc": "보복 소비 및 글로벌 이동 정상화에 따라 실적 회복세가 뚜렷한 리오프닝 섹터입니다.", "risk": "유가 상승과 환율(강달러) 변동에 따라 원가 부담이 급증할 수 있습니다.", "leaders": ["003490", "020560", "089860"], "followers": ["039200", "028670", "035250"]},
    "food": {"name": "K-푸드/음식료", "desc": "해외 수출이 급증하며 글로벌 방어주에서 성장주로 재평가받는 식품 기업입니다.", "risk": "곡물 가격 변동, 기후 위기로 인한 원재료 인플레이션 압박에 취약합니다.", "leaders": ["097950", "004370", "248100"], "followers": ["003230", "005300", "007310"]}
}

@router.get("/seo/themes")
def get_seo_themes():
    """Returns all available themes for sitemap generation"""
    themes_list = [{"slug": k, "name": v["name"]} for k, v in THEMES_DATA.items()]
    return {"status": "success", "count": len(themes_list), "data": themes_list}

@router.get("/seo/themes/{slug}")
def get_seo_theme_detail(slug: str):
    """Returns detailed information for a specific theme"""
    if slug not in THEMES_DATA:
        return {"status": "error", "message": "Theme not found"}
        
    theme_info = THEMES_DATA[slug]
    
    # Get stock names mapping
    all_stocks = get_all_kospi_kosdaq()
    ticker_to_name = {}
    if all_stocks.get("status") == "success":
        for stock in all_stocks.get("data", []):
            ticker_to_name[stock["ticker"]] = stock["name"]
            
    def map_tickers(tickers):
        return [{"ticker": t, "name": ticker_to_name.get(t, f"종목 {t}")} for t in tickers]
    
    return {
        "status": "success",
        "slug": slug,
        "name": theme_info["name"],
        "description": theme_info["desc"],
        "risk_factor": theme_info["risk"],
        "leaders": map_tickers(theme_info["leaders"]),
        "followers": map_tickers(theme_info["followers"])
    }
