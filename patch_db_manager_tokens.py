import os

file_path = "backend/db_manager.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_func = """
def get_all_fcm_tokens_with_user(require_whale_alert=False) -> list:
    \"\"\"모든 사용자의 유효한 FCM 토큰을 user_id와 함께 반환 (limit check용)\"\"\"
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if require_whale_alert:
            cursor.execute("SELECT DISTINCT user_id, token FROM fcm_tokens WHERE pref_whale_alert = 1")
        else:
            cursor.execute("SELECT DISTINCT user_id, token FROM fcm_tokens")
        return cursor.fetchall()
    except Exception as e:
        print(f"[DB] Get all FCM tokens with user error: {e}")
        return []
    finally:
        conn.close()
"""

if "get_all_fcm_tokens_with_user" not in content:
    content = content.replace("def get_fcm_tokens_for_ipo", new_func + "\ndef get_fcm_tokens_for_ipo")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched db_manager.py")
