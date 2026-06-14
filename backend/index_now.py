import os
import json
import sqlite3
import requests
from datetime import datetime

INDEXNOW_KEY = "d7b5f1f44a3e4b7b9f8f2b0f4a4c5e6d"
HOST = "stock-trend-program.co.kr"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"
# IndexNow API endpoint (Naver and Bing share the same protocol, pinging one usually propagates, 
# but pinging Naver directly is good for Korean SEO, or indexnow.org for general)
ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://searchadvisor.naver.com/indexnow"
]

DB_PATH = os.path.join(os.path.dirname(__file__), "stock_data.db")

def get_recent_stocks(limit=50):
    try:
        res = requests.get("http://127.0.0.1:8000/api/seo/stocks", timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data and "data" in data:
                # API returns list of {ticker, name, market}
                # Sort them or just pick random/first 50 for quick ping
                import random
                stocks = data["data"]
                random.shuffle(stocks)
                return [s["ticker"] for s in stocks[:limit]]
        return []
    except Exception as e:
        print(f"Error reading stocks: {e}")
        return []

def ping_indexnow(urls):
    if not urls:
        print("[IndexNow] No URLs to ping.")
        return

    payload = {
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls
    }

    for endpoint in ENDPOINTS:
        try:
            headers = {"Content-Type": "application/json; charset=utf-8"}
            response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
            if response.status_code in [200, 202]:
                print(f"[IndexNow] Successfully pinged {endpoint} with {len(urls)} URLs.")
            else:
                print(f"[IndexNow] Failed to ping {endpoint}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[IndexNow] Error pinging {endpoint}: {e}")

def run_indexnow_sync():
    print(f"[{datetime.now().isoformat()}] Starting IndexNow Sync...")
    
    # 1. Base URLs
    urls = [
        f"https://{HOST}/",
        f"https://{HOST}/portfolio",
        f"https://{HOST}/supply-chain",
        f"https://{HOST}/community"
    ]

    # 2. Add recent stock URLs
    recent_tickers = get_recent_stocks(limit=100)
    for t in recent_tickers:
        urls.append(f"https://{HOST}/stock/{t}")

    # Remove duplicates
    urls = list(set(urls))
    
    # Ping
    ping_indexnow(urls)
    print(f"[{datetime.now().isoformat()}] IndexNow Sync Completed.")

if __name__ == "__main__":
    run_indexnow_sync()
