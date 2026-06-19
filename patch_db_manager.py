import os

file_path = "backend/db_manager.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

migration_code = """
    # [Migration] Add Referral System Columns
    try:
        cursor.execute("SELECT referral_code FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding referral columns)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE")
            cursor.execute("ALTER TABLE users ADD COLUMN referred_by TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN is_unlimited_alerts BOOLEAN DEFAULT 0")
            cursor.execute("ALTER TABLE users ADD COLUMN daily_alert_count INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE users ADD COLUMN last_alert_date TEXT")
        except Exception as e:
            print(f"Migration Warning (Referral): {e}")

    # [Migration] Add User Rankings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_rankings (
            user_id TEXT PRIMARY KEY,
            nickname TEXT,
            score REAL DEFAULT 0,
            rank INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
"""

if "referral_code FROM users" not in content:
    content = content.replace(
        "    # Watchlist Table (User Specific)",
        migration_code + "\n    # Watchlist Table (User Specific)"
    )
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched db_manager.py")
else:
    print("db_manager.py already patched")
