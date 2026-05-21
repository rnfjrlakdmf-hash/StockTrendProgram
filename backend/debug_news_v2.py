
import sys
import os

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_data import get_market_news, fetch_google_news
from korea_data import get_naver_flash_news

print("--- Testing Google News ---")
try:
    g_news = fetch_google_news("글로벌 증시", lang='ko', region='KR', period='1d')
    print(f"Google News Count: {len(g_news)}")
    if g_news:
        print(f"Sample: {g_news[0]}")
except Exception as e:
    print(f"Google News Error: {e}")

print("\n--- Testing Naver Flash News (Fallback) ---")
try:
    n_news = get_naver_flash_news()
    print(f"Naver News Count: {len(n_news)}")
    if n_news:
        print(f"Sample: {n_news[0]}")
except Exception as e:
    print(f"Naver News Error: {e}")

print("\n--- Testing get_market_news() ---")
try:
    final_news = get_market_news()
    print(f"Final Info Count: {len(final_news)}")
    if final_news:
        print(f"Sample: {final_news[0]}")
except Exception as e:
    print(f"get_market_news Error: {e}")
