
import sys
import os
import time
import logging

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from stock_data import get_stock_info
from korea_data import get_naver_stock_info

def test_naver_direct(symbol):
    logger.info(f"Testing direct Naver fetch for {symbol}...")
    start = time.time()
    try:
        data = get_naver_stock_info(symbol)
        elapsed = time.time() - start
        if data:
            logger.info(f"Naver fetch SUCCESS in {elapsed:.2f}s")
            logger.info(f"Name: {data.get('name')}, Price: {data.get('price')}")
        else:
            logger.error(f"Naver fetch FAILED (None returned) in {elapsed:.2f}s")
    except Exception as e:
        logger.error(f"Naver fetch EXCEPTION: {e}")

def test_stock_data_wrapper(symbol):
    logger.info(f"Testing get_stock_info wrapper for {symbol}...")
    start = time.time()
    try:
        data = get_stock_info(symbol, skip_ai=True)
        elapsed = time.time() - start
        if data:
            logger.info(f"Wrapper fetch SUCCESS in {elapsed:.2f}s")
            logger.info(f"Name: {data.get('name')}, Price: {data.get('price')}")
        else:
            logger.error(f"Wrapper fetch FAILED (None returned) in {elapsed:.2f}s")
    except Exception as e:
        logger.error(f"Wrapper fetch EXCEPTION: {e}")

if __name__ == "__main__":
    test_symbol = "005930" # Samsung Electronics
    
    print("=== TEST 1: Direct Naver Crawl ===")
    test_naver_direct(f"{test_symbol}.KS")
    
    print("\n=== TEST 2: Stock Data Wrapper ===")
    test_stock_data_wrapper(test_symbol)
