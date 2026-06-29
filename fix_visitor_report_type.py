import os
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase if not already initialized
try:
    firebase_admin.get_app()
except ValueError:
    # We need the credentials file. Let's assume it's in backend/firebase_key.json
    key_path = os.path.join("backend", "firebase-adminsdk.json")
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    else:
        print("Firebase key not found.")
        exit(1)

db = firestore.client()

def fix_past_reports():
    print("Searching for past visitor reports...")
    # Get alerts where title starts with "📊 [STOCK AI] 일일 방문자"
    # Actually, Firestore doesn't support startsWith easily without bounds, so we'll just fetch recent alerts and filter
    docs = db.collection("alerts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()
    
    updated_count = 0
    for doc in docs:
        data = doc.to_dict()
        title = data.get("title", "")
        if "일일 방문자 및 시스템 운영 보고서" in title:
            current_type = data.get("type")
            if current_type != "admin_report":
                print(f"Updating doc {doc.id} (Current type: {current_type}) to admin_report")
                db.collection("alerts").document(doc.id).update({
                    "type": "admin_report"
                })
                updated_count += 1
                
    print(f"Update complete! {updated_count} documents updated.")

if __name__ == "__main__":
    fix_past_reports()
