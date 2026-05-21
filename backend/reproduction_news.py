
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_data import get_market_news
from korea_data import get_naver_flash_news

print("--- Testing Google News Fetch via get_market_news ---")
try:
    news = get_market_news()
    print(f"Result count: {len(news)}")
    for n in news[:3]:
        print(n)
except Exception as e:
    print(f"Error calling get_market_news: {e}")

print("\n--- Testing Naver News Direct via get_naver_flash_news ---")
try:
    naver_news = get_naver_flash_news()
    print(f"Result count: {len(naver_news)}")
    for n in naver_news[:3]:
        print(n)
except Exception as e:
    print(f"Error calling get_naver_flash_news: {e}")
