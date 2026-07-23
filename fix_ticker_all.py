import sqlite3

db_path = "/home/ubuntu/StockTrendProgram/backend/stock_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for table in tables:
    table_name = table[0]
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    if 'symbol' in columns or 'ticker' in columns or 'stock_code' in columns or 'code' in columns:
        print(f"Table {table_name} has symbol-like columns: {columns}")
        
        for col in ['symbol', 'ticker', 'stock_code', 'code']:
            if col in columns:
                try:
                    cursor.execute(f"UPDATE {table_name} SET {col}='457190' WHERE {col}='457610'")
                    if cursor.rowcount > 0:
                        print(f"UPDATED {cursor.rowcount} rows in {table_name}.{col}!")
                except Exception as e:
                    print(f"Error updating {table_name}.{col}: {e}")

conn.commit()
conn.close()
