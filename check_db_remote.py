import sqlite3
import os

db_path = '/home/ubuntu/StockTrendProgram/backend/stock_app.db'
print("DB file exists:", os.path.exists(db_path))
if os.path.exists(db_path):
    print("DB file size:", os.path.getsize(db_path))

conn = sqlite3.connect(db_path)
c = conn.cursor()

# 1. tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", c.fetchall())

# 2. watchlist
try:
    c.execute("SELECT user_id, symbol FROM watchlist")
    print("Watchlist:", c.fetchall())
except Exception as e:
    print("Watchlist error:", e)

# 3. fcm_tokens
try:
    c.execute("SELECT user_id, token, pref_news, pref_price FROM fcm_tokens")
    print("FCM Tokens:", c.fetchall())
except Exception as e:
    print("FCM Tokens error:", e)

# 4. news_sent_log
try:
    c.execute("SELECT symbol, article_id, title, sent_at FROM news_sent_log ORDER BY sent_at DESC LIMIT 5")
    print("Recent news sent logs:")
    for row in c.fetchall():
        print(row)
except Exception as e:
    print("news_sent_log error:", e)

conn.close()
