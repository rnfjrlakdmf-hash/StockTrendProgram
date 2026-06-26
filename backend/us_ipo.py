import os
import csv
import json
import requests
import datetime
from turbo_engine import turbo_cache

API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', 'HK1VAU72F2P32MBL')
CACHE_FILE = os.path.join(os.path.dirname(__file__), 'us_ipo_cache.json')
CACHE_EXPIRY_HOURS = 12

def _is_cache_valid():
    if not os.path.exists(CACHE_FILE):
        return False
    modified_time = datetime.datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
    if datetime.datetime.now() - modified_time > datetime.timedelta(hours=CACHE_EXPIRY_HOURS):
        return False
    return True

@turbo_cache(ttl_seconds=3600)
def get_us_ipo_data():
    """
    Fetch US IPO data from Alpha Vantage with file-based caching to prevent API limits.
    """
    if _is_cache_valid():
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[US_IPO] Cache read error: {e}")

    # Fetch from API if cache is invalid
    url = f"https://www.alphavantage.co/query?function=IPO_CALENDAR&apikey={API_KEY}"
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        
        # Parse CSV
        reader = csv.DictReader(res.text.strip().splitlines())
        results = []
        
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='en', target='ko')
        
        for row in reader:
            if not row.get('symbol'):
                continue
            
            eng_name = row.get('name', '')
            try:
                kor_name = translator.translate(eng_name)
                final_name = f"{kor_name} ({eng_name})" if kor_name else eng_name
            except:
                final_name = eng_name
            
            # Formatting to match the Korean IPO structure for easy frontend integration
            # DART structure: corp, type, price, band, date, is_completed
            price_low = row.get('priceRangeLow', '')
            price_high = row.get('priceRangeHigh', '')
            band = ""
            if price_low and price_high:
                band = f"${price_low} ~ ${price_high}"
            elif price_low:
                band = f"${price_low}"
                
            results.append({
                "symbol": row.get('symbol'),
                "corp": final_name,
                "type": f"US {row.get('exchange', 'Exchange')}",
                "price": "", # Exact fixed price usually unknown until day of listing
                "band": band,
                "date": row.get('ipoDate'),
                "currency": row.get('currency', 'USD'),
                "is_completed": False
            })
            
        # Save to cache
        if results:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"[US_IPO] Fetched and cached {len(results)} US IPOs")
            
        return results

    except Exception as e:
        print(f"[US_IPO] API fetch error: {e}")
        # Fallback to old cache if exists
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return []
