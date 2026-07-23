import sqlite3

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT cache_type, cache_key, result_json FROM ai_general_cache WHERE result_json LIKE '%457610%'")
    rows = cursor.fetchall()
    for row in rows:
        t, k, data = row
        new_data = data.replace('457610', '457190')
        cursor.execute("UPDATE ai_general_cache SET result_json=? WHERE cache_type=? AND cache_key=?", (new_data, t, k))
        print(f"Updated ai_general_cache for {t}:{k}")
except Exception as e:
    print(e)

conn.commit()
conn.close()
