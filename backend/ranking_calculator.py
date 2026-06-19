import asyncio
from db_manager import get_db_connection
from datetime import datetime

async def ranking_calculator_loop():
    print("[RankingCalculator] Started")
    while True:
        try:
            kst_now = datetime.now()
            # Calculate ranking twice a day (e.g. 06:00 and 18:00)
            # Actually, to make it more real-time and fun, let's calculate every 1 hour
            await calculate_rankings()
        except Exception as e:
            print(f"[RankingCalculator] Error: {e}")
            
        await asyncio.sleep(3600)  # run every 1 hour

async def calculate_rankings():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all users with watchlists
    cursor.execute('''
        SELECT user_id, symbol, added_price, quantity 
        FROM watchlist 
        WHERE added_price > 0 AND user_id != 'guest'
    ''')
    rows = cursor.fetchall()
    
    if not rows:
        conn.close()
        return
        
    user_portfolio = {}
    symbols_needed = set()
    
    for row in rows:
        uid, sym, price, qty = row
        if uid not in user_portfolio:
            user_portfolio[uid] = []
        user_portfolio[uid].append({'symbol': sym, 'added_price': price})
        symbols_needed.add(sym)
        
    # Batch fetch current prices using stock_data or korea_data
    from korea_data import get_naver_stock_info
    
    current_prices = {}
    for sym in symbols_needed:
        # Keep it simple for Korean stocks
        clean_sym = sym.split('.')[0]
        if len(clean_sym) == 6 and clean_sym[0].isdigit():
            info = await asyncio.to_thread(get_naver_stock_info, sym)
            if info and info.get("price"):
                current_prices[sym] = float(str(info["price"]).replace(",", "").replace("원", ""))
        else:
            # Maybe yfinance for US
            import yfinance as yf
            try:
                tk = await asyncio.to_thread(yf.Ticker, sym)
                hist = await asyncio.to_thread(tk.history, period="1d")
                if not hist.empty:
                    current_prices[sym] = hist['Close'].iloc[-1]
            except:
                pass
                
        await asyncio.sleep(0.1) # Be gentle with APIs
        
    user_scores = []
    
    for uid, portfolio in user_portfolio.items():
        total_pct = 0
        valid_items = 0
        for item in portfolio:
            sym = item['symbol']
            add_p = item['added_price']
            if sym in current_prices and add_p > 0:
                cur_p = current_prices[sym]
                pct = ((cur_p - add_p) / add_p) * 100
                total_pct += pct
                valid_items += 1
                
        if valid_items > 0:
            avg_return = total_pct / valid_items
            user_scores.append((uid, avg_return))
            
    # Sort by score desc
    user_scores.sort(key=lambda x: x[1], reverse=True)
    
    cursor.execute("DELETE FROM user_rankings")
    
    insert_data = []
    for i, (uid, score) in enumerate(user_scores):
        rank = i + 1
        # Get nickname from a conceptual profile, or just use masked ID
        nickname = f"고수_{uid[:5]}" 
        insert_data.append((uid, nickname, score, rank))
        
    cursor.executemany("INSERT INTO user_rankings (user_id, nickname, score, rank) VALUES (?, ?, ?, ?)", insert_data)
    conn.commit()
    conn.close()
    
    print(f"[RankingCalculator] Calculated ranks for {len(user_scores)} users.")
