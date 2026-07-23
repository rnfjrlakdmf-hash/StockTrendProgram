import sqlite3
import json

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check themes_stocks
cursor.execute("SELECT * FROM themes_stocks WHERE symbol='457610'")
rows = cursor.fetchall()
print("themes_stocks:", rows)

if rows:
    cursor.execute("UPDATE themes_stocks SET symbol='457190' WHERE symbol='457610'")
    print("Updated themes_stocks")

# Check other potential tables like stock_info?
# Actually, just search all tables that might have it
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for table in tables:
    table_name = table[0]
    try:
        cursor.execute(f"UPDATE {table_name} SET symbol='457190' WHERE symbol='457610'")
        if cursor.rowcount > 0:
            print(f"Updated {cursor.rowcount} rows in {table_name} (symbol column)")
    except Exception:
        pass

conn.commit()
conn.close()
