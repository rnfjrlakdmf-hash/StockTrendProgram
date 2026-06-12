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
        
        stocks = []
        for _, row in df_kospi.iterrows():
            stocks.append({"ticker": str(row['Code']), "name": str(row['Name']), "market": "KOSPI"})
        for _, row in df_kosdaq.iterrows():
            stocks.append({"ticker": str(row['Code']), "name": str(row['Name']), "market": "KOSDAQ"})
            
        return {"status": "success", "count": len(stocks), "data": stocks}
    except Exception as e:
        logger.error(f"Error fetching stock list: {e}")
        return {"status": "error", "message": str(e)}

# Cache for 6 hours to prevent rate limits
@cached(cache=TTLCache(maxsize=2000, ttl=21600))
def get_cached_stock_info(ticker: str):
    try:
        yf_ticker = f"{ticker}.KS" if ticker.isdigit() else ticker
        # Quick fallback logic for KOSDAQ if KOSPI fails could be added, but .KS usually resolves KOSDAQ via yfinance fallback or we use .KQ
        # We can try .KS, if info is empty, try .KQ
        stock = yf.Ticker(yf_ticker)
        info = stock.info
        if not info or 'regularMarketPrice' not in info:
            yf_ticker = f"{ticker}.KQ"
            stock = yf.Ticker(yf_ticker)
            info = stock.info
            
        return {
            "status": "success",
            "ticker": ticker,
            "name": info.get('longName', '') or info.get('shortName', ''),
            "price": info.get('regularMarketPrice', info.get('currentPrice', 0)),
            "previousClose": info.get('regularMarketPreviousClose', info.get('previousClose', 0)),
            "per": info.get('trailingPE', 0),
            "pbr": info.get('priceToBook', 0),
            "dividendYield": info.get('dividendYield', 0),
            "marketCap": info.get('marketCap', 0),
            "summary": info.get('longBusinessSummary', '해당 종목에 대한 분석 데이터가 준비 중입니다.')
        }
    except Exception as e:
        logger.error(f"Error fetching info for {ticker}: {e}")
        return {
            "status": "error",
            "ticker": ticker,
            "message": "Data currently unavailable"
        }

@router.get("/api/seo/stocks")
def get_seo_stocks():
    """Returns all KOSPI/KOSDAQ stocks for sitemap generation"""
    return get_all_kospi_kosdaq()

@router.get("/api/seo/stock-info/{ticker}")
def get_seo_stock_info(ticker: str):
    """Fast cache-friendly endpoint for individual stock SEO page rendering"""
    return get_cached_stock_info(ticker)
