import os
import csv
import json
import requests
import datetime
from turbo_engine import turbo_cache

API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', 'HK1VAU72F2P32MBL')
CACHE_FILE = os.path.join(os.path.dirname(__file__), 'us_ipo_cache.json')
CACHE_EXPIRY_HOURS = 6

def _is_cache_valid():
    if not os.path.exists(CACHE_FILE):
        return False
    modified_time = datetime.datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
    if datetime.datetime.now() - modified_time > datetime.timedelta(hours=CACHE_EXPIRY_HOURS):
        return False
    return True

@turbo_cache(ttl_seconds=1800)
def get_us_ipo_data():
    """
    Fetch comprehensive US IPO data from official NASDAQ Calendar API & Alpha Vantage.
    """
    if _is_cache_valid():
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data and len(data) > 0:
                    return data
        except Exception as e:
            print(f"[US_IPO] Cache read error: {e}")

    results = []
    seen_symbols = set()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
    }

    # 1. StockAnalysis Upcoming IPOs (High-priority confirmed upcoming listings)
    try:
        from bs4 import BeautifulSoup
        sa_url = "https://stockanalysis.com/ipos/calendar/"
        r = requests.get(sa_url, headers=headers, timeout=8)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            table = soup.find('table')
            if table:
                for tr in table.find_all('tr')[1:]:
                    cols = [td.text.strip() for td in tr.find_all('td')]
                    if len(cols) >= 5:
                        raw_date, sym, name, exchange, price_range = cols[0], cols[1], cols[2], cols[3], cols[4]
                        if not sym or sym in seen_symbols: continue
                        seen_symbols.add(sym)

                        date_str = raw_date
                        try:
                            dt_obj = datetime.datetime.strptime(raw_date, "%b %d, %Y")
                            date_str = dt_obj.strftime("%Y-%m-%d")
                        except:
                            pass

                        shares = cols[5] if len(cols) > 5 else "-"
                        results.append({
                            "symbol": sym,
                            "corp": name,
                            "type": f"US {exchange}",
                            "price": "미정",
                            "band": price_range,
                            "date": date_str,
                            "detail": f"발행규모: {shares}주 (상장 예정)",
                            "currency": "USD",
                            "status": "upcoming",
                            "is_completed": False
                        })
    except Exception as e:
        print(f"[US_IPO] StockAnalysis fetch error: {e}")

    # 2. Official NASDAQ IPO Calendar (Current Month & Next Month)
    now = datetime.datetime.now()
    months = [now.strftime('%Y-%m')]
    next_m = (now.replace(day=28) + datetime.timedelta(days=4)).strftime('%Y-%m')
    months.append(next_m)

    for ym in months:
        url = f"https://api.nasdaq.com/api/ipo/calendar?date={ym}"
        try:
            r = requests.get(url, headers=headers, timeout=8)
            if r.status_code == 200:
                d = r.json().get('data', {})

                # (1) Upcoming IPOs
                up = d.get('upcoming', {}).get('rows', []) or []
                for row in up:
                    sym = row.get('proposedTickerSymbol') or row.get('symbol')
                    if not sym or sym in seen_symbols: continue
                    seen_symbols.add(sym)

                    exp_date = row.get('expectedPriceDate') or ym
                    if "/" in exp_date:
                        parts = exp_date.split("/")
                        if len(parts) == 3:
                            exp_date = f"{parts[2]}-{int(parts[0]):02d}-{int(parts[1]):02d}"

                    price = row.get('proposedSharePrice') or ""
                    results.append({
                        "symbol": sym,
                        "corp": row.get('companyName') or sym,
                        "type": f"US {row.get('proposedExchange') or 'NASDAQ'}",
                        "price": f"${price}" if price else "미정",
                        "band": f"${price}" if price else "",
                        "date": exp_date,
                        "detail": f"발행예정: {row.get('sharesOffered') or '-'}주",
                        "currency": "USD",
                        "status": "upcoming",
                        "is_completed": False
                    })

                # (2) SEC Filed IPOs (Pending approval / roadshow)
                filed = d.get('filed', {}).get('rows', []) or []
                for row in filed:
                    sym = row.get('proposedTickerSymbol') or row.get('symbol')
                    if not sym or sym in seen_symbols: continue
                    seen_symbols.add(sym)

                    f_date = row.get('filedDate', '')
                    if "/" in f_date:
                        parts = f_date.split("/")
                        if len(parts) == 3:
                            f_date = f"{parts[2]}-{int(parts[0]):02d}-{int(parts[1]):02d}"

                    dollar_val = row.get('dollarValueOfSharesOffered') or ""
                    results.append({
                        "symbol": sym,
                        "corp": row.get('companyName') or sym,
                        "type": "US IPO (SEC 제출)",
                        "price": "미정",
                        "band": "",
                        "date": f_date,
                        "detail": f"신청규모: {dollar_val}" if dollar_val else "SEC 증권신고서 제출 완료 (심사중)",
                        "currency": "USD",
                        "status": "filed",
                        "is_completed": False
                    })

                # (3) Recently Priced IPOs
                priced = d.get('priced', {}).get('rows', []) or []
                for row in priced:
                    sym = row.get('proposedTickerSymbol') or row.get('symbol')
                    if not sym or sym in seen_symbols: continue
                    seen_symbols.add(sym)

                    p_date = row.get('pricedDate', '')
                    if "/" in p_date:
                        parts = p_date.split("/")
                        if len(parts) == 3:
                            p_date = f"{parts[2]}-{int(parts[0]):02d}-{int(parts[1]):02d}"

                    price = row.get('proposedSharePrice') or ""
                    dollar_val = row.get('dollarValueOfSharesOffered') or ""
                    shares = row.get('sharesOffered') or ""
                    detail_str = f"공모규모: {dollar_val}" if dollar_val else f"발행주식: {shares}주"

                    results.append({
                        "symbol": sym,
                        "corp": row.get('companyName') or sym,
                        "type": f"US {row.get('proposedExchange') or 'US Market'}",
                        "price": f"${price}" if price else "확정",
                        "band": f"${price}" if price else "",
                        "date": p_date,
                        "detail": detail_str,
                        "currency": "USD",
                        "status": "priced",
                        "is_completed": True
                    })
        except Exception as e:
            print(f"[US_IPO] NASDAQ fetch error for {ym}: {e}")

    # 3. Alpha Vantage Fallback / Addition
    if len(results) < 5:
        try:
            av_url = f"https://www.alphavantage.co/query?function=IPO_CALENDAR&apikey={API_KEY}"
            res = requests.get(av_url, timeout=8)
            if res.status_code == 200:
                reader = csv.DictReader(res.text.strip().splitlines())
                for row in reader:
                    sym = row.get('symbol')
                    if not sym or sym in seen_symbols: continue
                    seen_symbols.add(sym)

                    price_low = row.get('priceRangeLow', '')
                    price_high = row.get('priceRangeHigh', '')
                    band = f"${price_low} ~ ${price_high}" if price_low and price_high else f"${price_low}" if price_low else ""

                    results.append({
                        "symbol": sym,
                        "corp": row.get('name') or sym,
                        "type": f"US {row.get('exchange', 'Exchange')}",
                        "price": "미정",
                        "band": band,
                        "date": row.get('ipoDate'),
                        "detail": "Alpha Vantage 제공 (상장 예정)",
                        "currency": row.get('currency', 'USD'),
                        "status": "upcoming",
                        "is_completed": False
                    })
        except Exception as e:
            print(f"[US_IPO] Alpha Vantage fetch error: {e}")

    # Save to Cache
    if results:
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"[US_IPO] Cached {len(results)} US IPOs successfully")
        except Exception as e:
            print(f"[US_IPO] Cache write error: {e}")
        return results

    # Fallback to old cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass

    return []
