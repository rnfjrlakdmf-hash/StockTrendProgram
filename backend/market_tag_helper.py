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
    "PLTR", "SMCI", "COIN", "MSTR", "ROKU", "SOFI", "HOOD", "RIVN", "LCID"
}

_SP500_NYSE_TOP = {
    "BRK.A", "BRK.B", "BRK-A", "BRK-B", "LLY", "JPM", "V", "UNH", "MA", "WMT", "JNJ", 
    "PG", "HD", "ORCL", "BAC", "CVX", "ABBV", "KO", "MRK", "CRM", "XOM", "DIS", 
    "ACN", "TMO", "MCD", "CSCO", "ABT", "LIN", "WFC", "IBM", "GE", "PM", "CAT", 
    "VZ", "NOW", "TXN", "DHR", "NEE", "AMAT", "RTX", "UNP", "LOW", "PFE", "SPGI", 
    "MS", "GS", "HON", "BA", "ELV", "BLK", "SYK", "T", "DE", "LMT", "SCHW", "MDT", 
    "TJX", "AXP", "CB", "BMY", "CI", "C", "MMC", "VLO", "EOG", "OXY", "SLB"
}

_US_MARKET_CACHE = {}


def get_stock_market_tag(symbol: str) -> str:
    """
    종목 코드나 티커를 기반으로 [코스피], [코스닥], [나스닥], [S&P500], [NYSE] 태그를
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
                tag = "[국내]"
                
            _KR_MARKET_CACHE[raw_code] = tag
            return tag
        except Exception:
            return "[국내]"
            
    # 3. 미국/해외 주식 티커
    if clean_sym in _US_MARKET_CACHE:
        return _US_MARKET_CACHE[clean_sym]
        
    if clean_sym in _NASDAQ_TOP:
        tag = "[나스닥]"
        _US_MARKET_CACHE[clean_sym] = tag
        return tag
        
    if clean_sym in _SP500_NYSE_TOP:
        tag = "[S&P500]"
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
                tag = "[S&P500]" if clean_sym in _SP500_NYSE_TOP else "[NYSE]"
            elif "AMEX" in exch or "ASE" in exchange_raw:
                tag = "[아멕스]"
            else:
                tag = f"[{exch}]" if exch else "[미국]"
                
            _US_MARKET_CACHE[clean_sym] = tag
            return tag
    except Exception:
        pass
        
    return "[미국]"
