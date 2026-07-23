import sqlite3

def update_db():
    conn = sqlite3.connect('stock_app.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET last_login_at = created_at WHERE last_login_at IS NULL")
    conn.commit()
    print(f"Updated {cursor.rowcount} users.")
    conn.close()

if __name__ == "__main__":
    update_db()
