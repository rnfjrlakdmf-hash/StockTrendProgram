import requests
import time
from typing import Dict, List, Any
from turbo_engine import turbo_cache

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://stock.naver.com/"
}

# Cache for Major Indicators
MAJOR_INDICATORS_CACHE = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL = 60 # 1 minute for near real-time sync

def fetch_naver_json(url: str) -> List[Any]:
    try:
        res = requests.get(url, headers=HEADER, timeout=5)
        if res.status_code == 200:
            return res.json()
        return []
    except Exception as e:
        print(f"[MajorIndicators] Error fetching {url}: {e}")
        return []

def get_major_economic_indicators(refresh=False):
    """
    Fetch major economic indicators from Naver's specialized endpoints.
    Categories: Exchange(RPC), Energy, Metals, Bonds, Interest Rates
    """
    global MAJOR_INDICATORS_CACHE
    
    if not refresh and MAJOR_INDICATORS_CACHE["data"] and (time.time() - MAJOR_INDICATORS_CACHE["timestamp"] < CACHE_TTL):
        return MAJOR_INDICATORS_CACHE["data"]

    base_url = "https://stock.naver.com/api/securityService/marketindex"
    
    # 1. RPC (General Summary - Exchange Rates, etc)
    rpc_data = fetch_naver_json(f"{base_url}/majors/rpc")
    
    # 2. Energy (Oil, Gas)
    energy_data = fetch_naver_json(f"{base_url}/energy")
    
    # 3. Metals (Gold, Silver)
    metals_data = fetch_naver_json(f"{base_url}/metals")
    
    # 4. Bonds (Major Countries)
    bond_data = fetch_naver_json(f"{base_url}/majors/bond")
    
    # 5. Interest Rates (Standard/Base)
    standard_interest_data = fetch_naver_json(f"{base_url}/majors/standardInterest")
    
    # 5.1 Domestic Market Interest Rates (CD, Call, COFIX, etc.)
    domestic_interest_data = fetch_naver_json(f"{base_url}/majors/domesticInterest")

    # 6. Crypto (Corrected Endpoint)
    crypto_data = fetch_naver_json("https://stock.naver.com/api/coin/rank/UPBIT/majors")

    # Normalize Output
    combined = {
        "RPC": rpc_data,
        "Energy": energy_data,
        "Metals": metals_data,
        "Bonds": bond_data,
        "Interest": standard_interest_data,
        "DomesticInterest": domestic_interest_data,
        "Crypto": crypto_data,
        "updatedAt": time.strftime("%H:%M:%S")
    }
    
    MAJOR_INDICATORS_CACHE = {
        "data": combined,
        "timestamp": time.time()
    }
    
    return combined

@turbo_cache(ttl_seconds=60)
def get_normalized_major_indicators():
    """
    Returns data in a format compatible with MarketIndicators.tsx UI
    """
    raw = get_major_economic_indicators()
    
    def process_item(item, is_crypto=False):
        if not item: return None
        
        # Crypto API uses different field names (tradePrice, changeRate, etc.)
        if is_crypto:
            return {
                "name": item.get("name") or "Unknown",
                "symbol": item.get("symbolCode") or item.get("itemCode"),
                "price": item.get("tradePrice"),
                "change": item.get("changeRate") or "0.00",
                "risefall": item.get("changeType"),
                "unit": "USD"
            }
            
        return {
            "name": item.get("name") or "Unknown",
            "symbol": item.get("reutersCode") or item.get("symbolCode") or item.get("itemCode"),
            "price": item.get("closePrice") or item.get("basePrice"),
            "change": item.get("fluctuationsRatio") or "0.00",
            "risefall": item.get("fluctuationsType", {}).get("name") if isinstance(item.get("fluctuationsType"), dict) else None,
            "unit": item.get("unit") or ""
        }

    # Groups for UI
    result = {
        "Forex": [process_item(x) for x in raw.get("RPC", []) if x.get("categoryType") in ["exchange", "exchangeWorld"]],
        "Commodity": [process_item(x) for x in raw.get("Energy", []) + raw.get("Metals", [])],
        "Bonds": [process_item(x) for x in raw.get("Bonds", [])],
        "Interest": [process_item(x) for x in raw.get("Interest", []) + raw.get("DomesticInterest", [])],
        "Indices": [process_item(x) for x in raw.get("RPC", []) if x.get("categoryType") == "index"],
        "Crypto": [process_item(x, True) for x in raw.get("Crypto", [])[:10]] if raw.get("Crypto") else [],
        "updatedAt": raw.get("updatedAt")
    }
    
    return result
