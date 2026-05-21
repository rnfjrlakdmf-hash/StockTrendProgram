
import sqlite3
import os

DB_FILE = "stock_app.db"

def check_schema():
    if not os.path.exists(DB_FILE):
        print("DB file not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    print("--- Users Table Info ---")
    try:
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
    except Exception as e:
        print(e)
        
    conn.close()

if __name__ == "__main__":
    check_schema()
