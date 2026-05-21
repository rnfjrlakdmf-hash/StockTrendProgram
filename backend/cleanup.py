import sqlite3
import os

path = os.path.join(os.getcwd(), 'backend', 'stock_app.db')
if os.path.exists(path):
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM morning_briefings")
    conn.commit()
    conn.close()
    print("DONE_CLEANUP")
else:
    print("DB_NOT_FOUND")
