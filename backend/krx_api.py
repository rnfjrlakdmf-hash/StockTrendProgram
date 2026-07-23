import os
import requests
import random
import time
from rank_data import get_global_ranking

KRX_API_KEY = os.getenv("KRX_API_KEY", "")

# 인메모리 캐시 (10초)
CACHE = {"data": [], "timestamp": 0}

def fetch_krx_live_ranking():
    global CACHE
    now = time.time()
    
    if now - CACHE["timestamp"] < 10 and CACHE["data"]:
        # Simulate slight random fluctuations for the "Live Flip Clock" effect during testing
        for item in CACHE["data"]:
            if random.random() > 0.5:
                fluctuation = random.randint(-5, 5) * 100
                item["price_num"] = max(0, item["price_num"] + fluctuation)
                item["price"] = f"{item['price_num']:,}"
                item["amount"] = item["amount"] + random.randint(1000, 5000)
        return CACHE["data"]

    # Try KRX MDC API (MDCSTAT015 or similar volume ranking)
    headers = {
        "AUTH_KEY": KRX_API_KEY
    }
    krx_url = "http://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd"
    
    krx_data = None
    try:
        # Simple timeout, we don't want to block the dashboard if KRX is down
        res = requests.get(krx_url, headers=headers, timeout=2)
        if res.status_code == 200:
            data = res.json()
            if "OutBlock_1" in data:
                krx_data = data["OutBlock_1"]
    except Exception as e:
        pass

    processed = []
    
    if krx_data and len(krx_data) > 0:
        # Sort by Trading Value (TRD_VAL)
        try:
            sorted_krx = sorted(krx_data, key=lambda x: float(x.get("TRD_VAL", 0)), reverse=True)[:10]
            for i, item in enumerate(sorted_krx):
                price = float(item.get("TDD_CLSPRC", 0))
                change_rate = float(item.get("FLUC_RT", 0))
                change_val = float(item.get("CMPPREVDD_PRC", 0))
                processed.append({
                    "rank": i + 1,
                    "symbol": item.get("ISU_SRT_CD", ""),
                    "name": item.get("ISU_ABBRV", ""),
                    "price": f"{int(price):,}",
                    "price_num": int(price),
                    "change_val": change_val,
                    "change_percent": f"{change_rate:+.2f}%",
                    "amount": float(item.get("TRD_VAL", 0))
                })
        except:
            pass
            
    # Fallback to Naver engine if KRX fails or returns nothing (e.g. wrong endpoint/key)
    if not processed:
        fallback = get_global_ranking("KOSPI", "trading_amount")
        for item in fallback[:10]:
            try:
                price_num = int(float(str(item.get("price", "0")).replace(",", "")))
            except:
                price_num = 0
                
            amount_val = 0
            try:
                amount_val = int(item.get("amount", 0))
            except:
                pass
                
            processed.append({
                "rank": item.get("rank", 0),
                "symbol": item.get("symbol", ""),
                "name": item.get("name", ""),
                "price": f"{price_num:,}",
                "price_num": price_num,
                "change_val": item.get("change_val", 0),
                "change_percent": item.get("change_percent", "0.00%"),
                "amount": amount_val
            })

    CACHE["data"] = processed
    CACHE["timestamp"] = now
    
    return processed
