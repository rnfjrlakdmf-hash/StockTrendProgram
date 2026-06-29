import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('.')
from firebase_config import initialize_firebase
from firebase_admin import auth
import sqlite3

initialize_firebase()

email_to_delete = "rnfjr@gmail.com"

try:
    user = auth.get_user_by_email(email_to_delete)
    uid = user.uid
    print(f"Found user in Firebase: {uid}")
    
    # 1. Delete from Firebase Auth
    auth.delete_user(uid)
    print(f"Successfully deleted {email_to_delete} from Firebase Auth.")
    
    # 2. Delete from SQLite DB
    conn = sqlite3.connect('stock_trend.db')
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM users WHERE id = ?", (uid,))
    cursor.execute("DELETE FROM fcm_tokens WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM fcm_token_history WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM alert_history WHERE user_id = ?", (uid,))
    cursor.execute("DELETE FROM points WHERE user_id = ?", (uid,))
    
    conn.commit()
    conn.close()
    print(f"Successfully deleted {uid} related data from SQLite DB.")
    
except auth.UserNotFoundError:
    print(f"User {email_to_delete} not found in Firebase Auth.")
except Exception as e:
    print(f"Error occurred: {e}")
