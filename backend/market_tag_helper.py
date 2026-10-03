import re
import requests
import logging

logger = logging.getLogger(__name__)

# In-memory cache for fast 0-delay, 0-cost lookup
_KR_MARKET_CACHE = {
    # Pre-cache top KOSPI stocks
    "005930": "[코스피]", "000660": "[코스피]", "373220": "[코스피]", "207940": "[코스피]",
    "005380": "[코스피]", "000270": "[코스피]", "068270": "[코스피]", "005490": "[코스피]",
    "035420": "[코스피]", "035720": "[코스피]", "012330": "[코스피]", "051910": "[코스피]",
    "105560": "[코스피]", "055550": "[코스피]", "028260": "[코스피]", "096770": "[코스피]",
    "010130": "[코스피]", "003670": "[코스피]", "011200": "[코스피]", "009150": "[코스피]",
    "034020": "[코스피]", "007660": "[코스피]", "015760": "[코스피]", "003490": "[코스피]",
    "047040": "[코스피]", "395160": "[코스피]", "122630": "[코스피]", "381170": "[코스피]",
    "042700": "[코스피]", "012450": "[코스피]", "267260": "[코스피]",
    # Pre-cache top KOSDAQ stocks
    "196170": "[코스닥]", # 알테오젠
    "247540": "[코스닥]", # 에코프로비엠
    "086520": "[코스닥]", # 에코프로
    "277810": "[코스닥]", # 레인보우로보틱스
    "028300": "[코스닥]", # HLB
    "263750": "[코스닥]", # 펄어비스
    "214150": "[코스닥]", # 클래시스
    "293490": "[코스닥]", # 카카오게임즈
    "058470": "[코스닥]", # 리노공업
    "035900": "[코스닥]", # JYP Ent.
}

# Major US index membership (Free & instant)
_NASDAQ_TOP = {
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "GOOG", "META", "TSLA", "AVGO", "COST", 
    "PEP", "CSCO", "NFLX", "ADBE", "TMUS", "AMD", "QCOM", "TXN", "AMGN", "INTC", 
    "INTU", "HON", "AMAT", "BKNG", "ISRG", "SBUX", "MDLZ", "GILD", "LRCX", "ADI", 
    "ADP", "REGN", "PANW", "VRTX", "KLAC", "SNPS", "CDNS", "ASML", "ARM", "CRWD", 
    "MELI", "PYPL", "ABNB", "MRVL", "ORLY", "CTAS", "NXPI", "DXCM", "FTNT", "WDAY",
    "PLTR", "SMCI", "COIN", "MSTR", "ROKU", "SOFI", "HOOD", "RIVN", "LCID",
    # Emerging & High Momentum US Tech
    "RGTI", "RKLB", "SOUN", "ASTS", "SERV", "LUNR", "MARA", "NVDL", "TQQQ"
}

_NYSE_TOP = {
    "OKLO", "IONQ", "JOBY", "ACHR", "BBAI", "RDW", "PL", "AI", "SMR", "F", "BA", "GM",
    "IBM", "CAT", "JPM", "V", "UNH", "MA", "WMT", "JNJ", "PG", "HD", "ORCL", "BAC", 
    "CVX", "ABBV", "KO", "MRK", "CRM", "XOM", "DIS", "ACN", "TMO", "MCD", "ABT", 
    "LIN", "WFC", "GE", "PM", "VZ", "NOW", "DHR", "NEE", "RTX", "UNP", "LOW", "PFE", 
    "SPGI", "MS", "GS", "ELV", "BLK", "SYK", "T", "DE", "LMT", "SCHW", "MDT", "TJX", 
    "AXP", "CB", "BMY", "CI", "C", "MMC", "VLO", "EOG", "OXY", "SLB", "NIO", "BABA", "TSM"
}

_AMEX_TOP = {
    "SOXL", "SPY", "IVV", "VOO", "DIA", "IWM", "XLE", "XLF", "XLK", "GDX", "HYG", "EEM"
}

_US_MARKET_CACHE = {}


def get_stock_market_tag(symbol: str) -> str:
    """
    종목 코드나 티커를 기반으로 [코스피], [코스닥], [나스닥], [NYSE], [AMEX] 태그를
    완전 무료(0원) 및 초고속(0ms 캐시)으로 반환합니다.
    """
    if not symbol:
        return ""
    
    clean_sym = symbol.strip().upper()
    
    # 1. 국내 종목 접미사 검사
    if clean_sym.endswith(".KS"):
        return "[코스피]"
    if clean_sym.endswith(".KQ"):
        return "[코스닥]"
    
    raw_code = clean_sym.split(".")[0]
    
    # 2. 국내 종목 6자리 숫자 코드
    if raw_code.isdigit() and len(raw_code) == 6:
        if raw_code in _KR_MARKET_CACHE:
            return _KR_MARKET_CACHE[raw_code]
        
        # 네이버 증권 무료 모바일 Basic API로 시장 판별
        try:
            url = f"https://m.stock.naver.com/api/stock/{raw_code}/basic"
            res = requests.get(url, timeout=1.5).json()
            sosok = str(res.get("sosok", ""))
            ex_name = res.get("stockExchangeName", "")
            
            if sosok == "0" or "KOSPI" in ex_name:
                tag = "[코스피]"
            elif sosok == "1" or "KOSDAQ" in ex_name:
                tag = "[코스닥]"
            elif sosok == "2" or "KONEX" in ex_name:
                tag = "[코넥스]"
            else:
                tag = "[코스피]"
                
            _KR_MARKET_CACHE[raw_code] = tag
            return tag
        except Exception:
            return "[코스피]"
            
    # 3. 미국/해외 주식 티커
    if clean_sym in _US_MARKET_CACHE:
        return _US_MARKET_CACHE[clean_sym]
        
    if clean_sym in _NYSE_TOP:
        tag = "[NYSE]"
        _US_MARKET_CACHE[clean_sym] = tag
        return tag

    if clean_sym in _AMEX_TOP:
        tag = "[AMEX]"
        _US_MARKET_CACHE[clean_sym] = tag
        return tag

    if clean_sym in _NASDAQ_TOP:
        tag = "[나스닥]"
        _US_MARKET_CACHE[clean_sym] = tag
        return tag
        
    # 야후 파이낸스 무료 Lookup API로 거래소 확인
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={clean_sym}&quotesCount=1"
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=2.0).json()
        quotes = res.get("quotes", [])
        if quotes:
            exch = quotes[0].get("exchDisp", "").upper()
            exchange_raw = quotes[0].get("exchange", "").upper()
            
            if "NASDAQ" in exch or "NMS" in exchange_raw or "NGM" in exchange_raw:
                tag = "[나스닥]"
            elif "NYSE" in exch or "NYQ" in exchange_raw or "NYS" in exchange_raw:
                tag = "[NYSE]"
            elif "AMEX" in exch or "ASE" in exchange_raw:
                tag = "[AMEX]"
            else:
                tag = f"[{exch}]" if exch else "[나스닥]"
                
            _US_MARKET_CACHE[clean_sym] = tag
            return tag
    except Exception:
        pass

    # 기본 규칙: 1~3자리는 전통 NYSE, 4자리 이상은 나스닥
    if len(clean_sym) <= 3 and clean_sym.isalpha():
        tag = "[NYSE]"
    else:
        tag = "[나스닥]"
        
    _US_MARKET_CACHE[clean_sym] = tag
    return tag


def get_clean_market_name(symbol: str) -> str:
    """
    괄호 없는 순수 거래소명 반환 (예: '나스닥', 'NYSE', 'AMEX', '코스피', '코스닥')
    """
    tag = get_stock_market_tag(symbol)
    return tag.replace("[", "").replace("]", "").strip()
