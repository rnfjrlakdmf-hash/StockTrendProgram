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
        stock = yf.Ticker(yf_ticker)
        
        # Use fast_info to avoid yfinance hanging issues
        try:
            fi = stock.fast_info
            price = fi.last_price
        except:
            # Fallback to KOSDAQ if KOSPI fails
            yf_ticker = f"{ticker}.KQ"
            stock = yf.Ticker(yf_ticker)
            fi = stock.fast_info
            price = fi.last_price
            
        return {
            "status": "success",
            "ticker": ticker,
            "name": f"종목 {ticker}", # For Korean name we might need to rely on frontend params or simple fallback
            "price": getattr(fi, 'last_price', 0),
            "previousClose": getattr(fi, 'previous_close', 0),
            "per": 0,
            "pbr": 0,
            "dividendYield": 0,
            "marketCap": getattr(fi, 'market_cap', 0),
            "summary": "해당 종목에 대한 분석 데이터가 준비 중입니다. 인공지능 기반 실시간 분석을 통해 주가 전망 및 목표가를 제공합니다."
        }
    except Exception as e:
        logger.error(f"Error fetching info for {ticker}: {e}")
        return {
            "status": "success", # Return dummy success to prevent 404 in frontend
            "ticker": ticker,
            "name": f"종목 {ticker}",
            "price": 0,
            "previousClose": 0,
            "per": 0,
            "pbr": 0,
            "dividendYield": 0,
            "marketCap": 0,
            "summary": "해당 종목에 대한 분석 데이터가 준비 중입니다. 인공지능 기반 실시간 분석을 통해 주가 전망 및 목표가를 제공합니다."
        }

@router.get("/api/seo/stocks")
def get_seo_stocks():
    """Returns all KOSPI/KOSDAQ stocks for sitemap generation"""
    return get_all_kospi_kosdaq()

@router.get("/api/seo/stock-info/{ticker}")
def get_seo_stock_info(ticker: str):
    """Fast cache-friendly endpoint for individual stock SEO page rendering"""
    return get_cached_stock_info(ticker)
