import sqlite3
import os
from datetime import datetime

DB_FILE = "stock_app.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # AI 점수 히스토리 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            price REAL,
            score INTEGER,
            supply_score INTEGER,
            financial_score INTEGER,
            news_score INTEGER,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 관심 종목(Watchlist) 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            symbol TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Sentiment Battle (User Votes) Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sentiment_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            vote_type TEXT NOT NULL, -- 'UP' or 'DOWN'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_analysis_result(data):
    """
    AI 분석 결과를 DB에 저장합니다.
    data format matches the return of analyze_stock
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        symbol = data['symbol']
        price = data.get('price', 0)
        # Handle '75,000' string format if necessary, assuming float/int here or cleaning needed
        if isinstance(price, str):
            price = float(price.replace(',', '').replace('$', ''))
            
        score = data.get('score', 0)
        metrics = data.get('metrics', {})
        
        cursor.execute('''
            INSERT INTO score_history (symbol, price, score, supply_score, financial_score, news_score, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            symbol, 
            price, 
            score, 
            metrics.get('supplyDemand', 0), 
            metrics.get('financials', 0), 
            metrics.get('news', 0), 
            data.get('analysis_summary', '')
        ))
        
        conn.commit()
    except Exception as e:
        print(f"DB Save Error: {e}")
    finally:
        conn.close()

def get_score_history(symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT created_at, score, price, supply_score, financial_score, news_score
        FROM score_history
        WHERE symbol = ?
        ORDER BY created_at ASC
        LIMIT 50
    ''', (symbol,))
    
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "date": row[0],
            "score": row[1],
            "price": row[2],
            "supply": row[3],
            "financial": row[4],
            "news": row[5]
        })
        
    return history

def add_watchlist(symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", (symbol,))
        conn.commit()
        return True
    except:
        return False
    finally:
        conn.close()

def remove_watchlist(symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol,))
        conn.commit()
    finally:
        conn.close()

def get_watchlist():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT symbol FROM watchlist")
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]

# Initialize on module load (or call explicitly)
# Initialize on module load (or call explicitly)
init_db()

def cast_vote(symbol, vote_type):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sentiment_votes (symbol, vote_type) VALUES (?, ?)", (symbol, vote_type))
    conn.commit()
    conn.close()

def get_vote_stats(symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Get total counts
    cursor.execute("SELECT vote_type, COUNT(*) FROM sentiment_votes WHERE symbol = ? GROUP BY vote_type", (symbol,))
    rows = cursor.fetchall()
    
    stats = {"UP": 0, "DOWN": 0}
    for row in rows:
        stats[row[0]] = row[1]
    
    total = stats["UP"] + stats["DOWN"]
    if total > 0:
        stats["UP_PERCENT"] = int((stats["UP"] / total) * 100)
        stats["DOWN_PERCENT"] = int((stats["DOWN"] / total) * 100)
    else:
        stats["UP_PERCENT"] = 50
        stats["DOWN_PERCENT"] = 50
        
    conn.close()
    return stats
