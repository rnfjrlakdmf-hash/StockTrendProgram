import sqlite3

def diag():
    conn = sqlite3.connect("stock_app.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print("DB Tables:", tables)
    
    # 모든 유저 정보 조회
    cursor.execute("SELECT id, email, created_at FROM users")
    users = cursor.fetchall()
    print("=== All Users ===")
    for u in users:
        print(f"ID: {u[0]} | Email: {u[1]} | Created: {u[2]}")

    if "fcm_tokens" in tables:
        cursor.execute("""
            SELECT u.email, f.token, f.created_at, f.user_id
            FROM fcm_tokens f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        """)
        rows = cursor.fetchall()
        print("\n=== FCM Tokens (Latest first) ===")
        print(f"Total registered tokens: {len(rows)}")
        for r in rows:
            email = r[0] or "Guest/Unknown"
            token_preview = r[1][:25] + "..." if r[1] else "None"
            created = r[2]
            user_id = r[3]
            print(f"Email: {email} (UID: {user_id}) | Token: {token_preview} | Created: {created}")
    else:
        print("fcm_tokens table missing.")
    conn.close()

if __name__ == "__main__":
    diag()
