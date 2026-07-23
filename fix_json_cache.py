import sqlite3

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# general_cache
try:
    cursor.execute("SELECT type, key, data_json FROM general_cache WHERE data_json LIKE '%457610%'")
    rows = cursor.fetchall()
    for row in rows:
        t, k, data = row
        new_data = data.replace('457610', '457190')
        cursor.execute("UPDATE general_cache SET data_json=? WHERE type=? AND key=?", (new_data, t, k))
        print(f"Updated general_cache for {t}:{k}")
except Exception as e:
    print(e)

conn.commit()
conn.close()
