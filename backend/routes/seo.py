from fastapi import APIRouter
import FinanceDataReader as fdr
import yfinance as yf
import logging
import os
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

def fetch_korean_company_overview(ticker: str, name: str) -> str:
    """
    네이버 금융 / WiseReport 공식 기업 개요(무슨 회사인지, 주요 사업 및 제품 현황)를 실시간 수집합니다.
    """
    clean_ticker = ticker.split('.')[0] if '.' in ticker else ticker
    try:
        url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={clean_ticker}"
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=4)
        if r.status_code == 200:
            r.encoding = 'utf-8'
            soup = BeautifulSoup(r.text, 'html.parser')
            lis = soup.select('.cmp_comment li')
            if lis:
                texts = [li.text.strip() for li in lis if li.text.strip()]
                if texts:
                    return ' '.join(texts)
    except Exception as e:
        logger.warning(f"[SEO] Failed to fetch WiseReport summary for {ticker}: {e}")
        
    return f"{name} 기업의 핵심 비즈니스 요약 및 주요 실적 현황입니다. 인공지능 기반 분석을 통해 실시간 주가 동향과 객관적 가치 평가 정보를 제공하고 있습니다."

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


US_STOCK_KOREAN_NAMES = {
    "META": "메타 플랫폼스",
    "AAPL": "애플",
    "NVDA": "엔비디아",
    "TSLA": "테슬라",
    "MSFT": "마이크로소프트",
    "GOOGL": "알파벳 (구글)",
    "GOOG": "알파벳 (구글)",
    "AMZN": "아마존닷컴",
    "AMD": "AMD",
    "INTC": "인텔",
    "QCOM": "퀄컴",
    "AVGO": "브로드컴",
    "TSM": "TSMC",
    "PLTR": "팔란티어",
    "NFLX": "넷플릭스",
    "COIN": "코인베이스",
    "ARM": "ARM 홀딩스",
    "MU": "마이크론 테크놀로지",
    "ASML": "ASML",
    "BABA": "알리바바",
    "DIS": "월트 디즈니",
    "SBUX": "스타벅스",
    "NKE": "나이키",
    "KO": "코카콜라",
    "PEP": "펩시코",
    "JNJ": "존슨앤드존슨",
    "UNH": "유나이티드헬스",
    "V": "비자",
    "MA": "마스터카드",
    "JPM": "JP모건 체이스",
    "BAC": "뱅크오브아메리카",
    "WMT": "월마트",
    "COST": "코스트코",
    "RIVN": "리비안",
    "LCID": "루시드",
    "GM": "제너럴모터스",
    "F": "포드",
    "IONQ": "아이온큐",
    "ASTS": "AST 스페이스모바일",
    "RKLB": "로켓랩",
    "SOFI": "소파이 테크놀로지스",
    "JOBY": "조비 에비에이션",
    "ACHR": "아처 에비에이션",
    "LUNR": "인튜이티브 머신스",
    "RGTI": "리게티 컴퓨팅",
    "QUBT": "퀀텀 컴퓨팅",
    "UPST": "업스타트 홀딩스",
    "AFRM": "어펌",
    "HOOD": "로빈후드",
    "SMCI": "슈퍼마이크로컴퓨터",
    "MSTR": "마이크로스트래티지"
}

US_STOCK_OVERVIEWS_KO = {
    "META": (
        "메타 플랫폼스(Meta Platforms, Inc.)는 전 세계 사용자들이 모바일 기기, PC, 가상현실(VR) 헤드셋 및 AI 스마트 글래스를 통해 소통하고 콘텐츠를 공유할 수 있는 플랫폼과 하드웨어를 개발하는 글로벌 선도 빅테크 기업입니다. "
        "주요 사업은 크게 앱 패밀리(Family of Apps, FoA)와 리얼리티 랩스(Reality Labs, RL) 2대 부문으로 구성되어 있습니다. "
        "패밀리 오브 앱스(FoA) 부문은 피드, 릴스, 스토리, 그룹, 마켓플레이스를 제공하는 페이스북(Facebook), 이미지 및 비디오 중심 소셜 플랫폼인 인스타그램(Instagram), 실시간 텍스트 및 음성·영상 통화를 지원하는 메신저(Messenger)와 왓츠앱(WhatsApp), 텍스트 기반 대화 플랫폼 스레드(Threads), 그리고 앱과 웹, 스마트 글래스 전반에 탑재된 대화형 인공지능 '메타 AI(Meta AI)'를 운영하고 있습니다. "
        "리얼리티 랩스(RL) 부문은 메타 퀘스트(Meta Quest) VR/MR 헤드셋을 비롯하여, 레이밴 메타(Ray-Ban Meta) 등 혁신적인 AI 스마트 글래스와 신경 신호 제어 손목 밴드(Meta Neural Band) 등 차세대 공간 컴퓨팅 및 웨어러블 하드웨어, 소프트웨어 생태계를 구축하고 있습니다. "
        "또한 마이크로소프트(MSFT), 엔비디아(NVDA), AMD, 브로드컴, OpenAI 등 주요 글로벌 테크 기업들과 차세대 AI 및 컴퓨팅 인프라 분야에서 긴밀하게 협력하고 있습니다. "
        "구 사명은 페이스북(Facebook, Inc.)이었으며 2021년 10월 메타 플랫폼스로 사명을 변경하였습니다. 2004년 설립되었으며 본사는 미국 캘리포니아주 멘로파크에 위치해 있습니다."
    ),
    "AAPL": (
        "애플(Apple Inc.)은 스마트폰(아이폰), 태블릿(아이패드), 개인용 컴퓨터(맥), 웨어러블 기기(애플워치, 에어팟, 비전 프로) 및 다양한 디지털 서비스 생태계를 설계, 제조 및 판매하는 글로벌 선도 테크 기업입니다. "
        "iOS, macOS 등 독자적인 하드웨어-소프트웨어 통합 운영체제를 기반으로 앱스토어, 애플뮤직, 아이클라우드, 애플페이 등의 고수익 서비스 사업을 영위하고 있으며, 자체 온디바이스 인공지능인 애플 인텔리전스(Apple Intelligence)를 제품 전반에 통합하고 있습니다."
    ),
    "NVDA": (
        "엔비디아(NVIDIA Corporation)는 인공지능(AI), 딥러닝, 고성능 컴퓨팅(HPC) 및 그래픽 가속을 위한 GPU와 풀스택 가속 컴퓨팅 플랫폼을 설계하는 글로벌 반도체 선도 기업입니다. "
        "생성형 AI 모델 훈련 및 추론의 글로벌 표준인 호퍼(Hopper) 및 블랙웰(Blackwell) 아키텍처 GPU와 독점 소프트웨어 플랫폼인 CUDA를 통해 글로벌 데이터센터와 AI 인프라 시장을 독점적으로 주도하고 있습니다."
    ),
    "TSLA": (
        "테슬라(Tesla, Inc.)는 순수 전기차(EV), 대규모 배터리 에너지 저장 시스템(메가팩·파워월), 태양광 패널 및 완전자율주행(FSD) 소프트웨어, 휴머노이드 로봇(옵티머스)을 설계 및 생산하는 글로벌 친환경 모빌리티 및 AI 로보틱스 기업입니다. "
        "모델 S, 3, X, Y 및 사이버트럭 등의 완성차 라인업과 슈퍼차저 글로벌 급속 충전 네트워크를 바탕으로 지속 가능한 에너지로의 글로벌 전환을 이끌고 있습니다."
    ),
    "MSFT": (
        "마이크로소프트(Microsoft Corporation)는 애저(Azure) 클라우드 인프라, 윈도우 OS, 오피스 생산성 소프트웨어(Microsoft 365), 깃허브, 링크드인 및 엑스박스 게이밍 플랫폼을 영위하는 글로벌 종합 소프트웨어 및 클라우드 대기업입니다. "
        "OpenAI와의 독점적 파트너십을 기반으로 엔터프라이즈 생성형 AI 코파일럿(Copilot) 생태계를 구축하여 전 세계 기업의 디지털 전환을 주도하고 있습니다."
    ),
    "GOOGL": (
        "알파벳(Alphabet Inc.)은 전 세계 최대의 검색 엔진 구글(Google), 글로벌 동영상 플랫폼 유튜브(YouTube), 안드로이드 모바일 운영체제, 크롬 브라우저 및 구글 클라우드(GCP)를 운영하는 글로벌 빅테크 기업입니다. "
        "자체 개발한 초거대 언어모델 제미나이(Gemini)와 전용 AI 칩 TPU(Tensor Processing Unit)를 바탕으로 검색, 광고, 클라우드, 자율주행(웨이모) 전 영역에서 AI 기술 혁신을 선도하고 있습니다."
    ),
    "AMZN": (
        "아마존닷컴(Amazon.com, Inc.)은 글로벌 1위 전자상거래 마켓플레이스와 클라우드 인프라 시장 점유율 1위인 아마존웹서비스(AWS)를 보유한 글로벌 기술 대기업입니다. "
        "프라임 멤버십, 대규모 물류 자동화 풀필먼트 네트워크, 고마진 디지털 광고 사업 및 생성형 AI 인프라(베드록, 트레이니엄)를 결합하여 견고한 현금 흐름을 창출하고 있습니다."
    ),
    "TSM": (
        "TSMC(Taiwan Semiconductor Manufacturing Company)는 글로벌 최첨단 반도체 파운드리(위탁 제조) 시장 점유율 50% 이상을 차지하고 있는 세계 최대의 파운드리 기업입니다. "
        "애플, 엔비디아, AMD, 퀄컴 등 글로벌 빅테크 기업들의 최선단 3나노, 2나노 미세공정 AI 반도체 칩을 독점적으로 양산하고 있습니다."
    ),
    "AMD": (
        "AMD(Advanced Micro Devices, Inc.)는 고성능 컴퓨팅 및 그래픽 처리를 위한 마이크로프로세서(라이젠 CPU), 그래픽 가속기(라데온 GPU) 및 데이터센터용 AI 가속 칩(인스팅트)을 설계하는 글로벌 팹리스 반도체 선도 기업입니다. "
        "데이터센터용 EPYC 프로세서와 오픈소스 ROCm AI 소프트웨어 플랫폼을 통해 글로벌 AI 가속기 시장에서 엔비디아의 핵심 대항마로 부상하고 있습니다."
    ),
    "INTC": (
        "인텔(Intel Corporation)은 PC 및 데이터센터용 x86 마이크로프로세서, 반도체 칩셋을 개발하고 자체 첨단 반도체 파운드리 제조 시설을 육성 중인 미국의 선도적 종합 반도체 기업(IDM)입니다. "
        "미국 정부의 반도체법 지원과 자체 코어 울트라 AI PC 프로세서를 기반으로 차세대 반도체 제조 및 AI 시장 반등을 도모하고 있습니다."
    ),
    "PLTR": (
        "팔란티어 테크놀로지스(Palantir Technologies Inc.)는 국가 안보, 국방 및 대기업을 위한 대규모 빅데이터 분석과 인공지능 의사결정 플랫폼(고담, 파운드리, AIP)을 공급하는 소프트웨어 기업입니다. "
        "기업 및 군사용 생성형 AI 도입을 가속화하는 AIP(Artificial Intelligence Platform)의 폭발적 수요에 힘입어 빠른 매출 성장과 수익성 개선을 달성하고 있습니다."
    )
}

_US_OVERVIEW_TRANSLATION_CACHE = {}

def translate_us_overview_to_korean(ticker: str, name: str, raw_summary: str) -> str:
    sym = ticker.upper().split('.')[0]
    if sym in US_STOCK_OVERVIEWS_KO:
        return US_STOCK_OVERVIEWS_KO[sym]

    if sym in _US_OVERVIEW_TRANSLATION_CACHE:
        return _US_OVERVIEW_TRANSLATION_CACHE[sym]

    if not raw_summary or len(raw_summary.strip()) < 15:
        return f"{name} 기업의 핵심 비즈니스 모델 및 주요 사업 현황입니다. 인공지능 기반 분석을 통해 실시간 주가 동향과 객관적 가치 평가 정보를 제공하고 있습니다."

    # Gemini LLM 번역 시도
    try:
        from ai_analysis import get_text_model
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            model = get_text_model()
            prompt = (
                f"다음 미국 주식({sym} / {name})의 기업 비즈니스 소개를 한국 주식 투자자를 위해 이해하기 쉽고 유려한 한국어로 번역 및 요약해줘.\n"
                f"- 조건: 3~5개 문장, 고유명사나 제품명은 적절한 한글/원어 표기를 사용하고, 서술어는 '~합니다', '~제공합니다' 등의 정중한 어조를 사용할 것.\n"
                f"- 서두나 사족 없이 번역된 본문 내용만 출력할 것.\n\n"
                f"{raw_summary[:2500]}"
            )
            resp = model.generate_content(prompt)
            if resp and resp.text and len(resp.text.strip()) > 20:
                result = resp.text.strip()
                _US_OVERVIEW_TRANSLATION_CACHE[sym] = result
                return result
    except Exception as e:
        logger.warning(f"[SEO] Gemini translation failed for {ticker}: {e}")

    # Fallback to deep_translator
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source='en', target='ko').translate(raw_summary[:1200])
        if result and len(result) > 20:
            _US_OVERVIEW_TRANSLATION_CACHE[sym] = result
            return result
    except Exception as e:
        logger.warning(f"[SEO] deep_translator fallback failed for {ticker}: {e}")

    return f"{name} 기업의 핵심 비즈니스 모델 및 주요 사업 현황입니다. 인공지능 기반 분석을 통해 실시간 주가 동향과 객관적 가치 평가 정보를 제공하고 있습니다."


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
        
        clean_ticker = ticker.split('.')[0] if '.' in ticker else ticker
        
        # 한국 주식 판별: 
        # 1) 6자리이고 첫 글자가 숫자인 코드 (예: 005930, 0161M0, 005935, 373220 등 - 코스피, 코스닥, 코넥스, K-OTC 모두 지원)
        # 2) 접미사가 .KS 또는 .KQ 인 경우
        is_kr_stock = (len(clean_ticker) == 6 and clean_ticker[0].isdigit()) or ticker.endswith('.KS') or ticker.endswith('.KQ')
        is_us_stock = not is_kr_stock
        
        if is_us_stock:
            # Handle US Stock via yfinance (거래소 접미사 .O, .N 등 제거)
            us_ticker = clean_ticker.upper()
            t = yf.Ticker(us_ticker)
            info = t.info
            cal = t.calendar or {}
            
            raw_name = info.get('shortName') or info.get('longName') or f"종목 {us_ticker}"
            if us_ticker in US_STOCK_KOREAN_NAMES:
                name = f"{US_STOCK_KOREAN_NAMES[us_ticker]} ({raw_name})"
            else:
                name = raw_name

            price = info.get('currentPrice') or info.get('regularMarketPrice') or 0
            prev = info.get('previousClose') or 0
            per = info.get('trailingPE') or 0.0
            pbr = info.get('priceToBook') or 0.0
            div = info.get('dividendYield') or 0.0
            cap = info.get('marketCap') or 0
            
            raw_summary = info.get('longBusinessSummary') or ""
            summary = translate_us_overview_to_korean(us_ticker, name, raw_summary)
            
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
                url_int = f"https://m.stock.naver.com/api/stock/{clean_ticker}/integration"
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
                url_price = f"https://m.stock.naver.com/api/stock/{clean_ticker}/price?pageSize=5"
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
                url_fin = f"https://m.stock.naver.com/api/stock/{clean_ticker}/finance/annual"
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

            summary = fetch_korean_company_overview(clean_ticker, name)
            
            ex_div_str = None
            pay_str = None
            
            # Fetch dividend schedule for Korean stocks using yfinance
            try:
                cal = yf.Ticker(f"{clean_ticker}.KS").calendar
                if not cal:
                    cal = yf.Ticker(f"{clean_ticker}.KQ").calendar
                
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

        if price == 0 and is_us_stock:
            # Treat 0 price for US tickers as not found
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
            "financials": financials,
            "isUs": is_us_stock,
            "currency": "USD" if is_us_stock else "KRW",
            "currencySymbol": "$" if is_us_stock else "원"
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
