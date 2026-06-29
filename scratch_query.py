import sqlite3
import json

try:
    conn = sqlite3.connect('/home/ubuntu/StockTrendProgram/backend/stock_data.db')
    alerts = conn.execute('SELECT * FROM alert_history ORDER BY id DESC LIMIT 10').fetchall()
    for row in alerts:
        print(row)
except Exception as e:
    print(e)
