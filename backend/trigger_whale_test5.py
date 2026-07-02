import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_manager import get_all_fcm_tokens_with_user
from firebase_config import send_push_notification

def run_test():
    tokens = []
    for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=False):
        if tok:
            tokens.append(tok)
            
    print(f"Total tokens found: {len(tokens)}")
    
    if not tokens:
        return
        
    title = "[Test] Connection Verified"
    body = "System is working perfectly for user script!"
    
    for tok in tokens:
        try:
            send_push_notification(tok, title, body)
            print(f"Sent to {tok[:10]}...")
        except Exception as e:
            print(f"Failed to {tok[:10]}: {e}")

if __name__ == "__main__":
    run_test()
