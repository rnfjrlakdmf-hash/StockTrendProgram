import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('.')
from firebase_config import initialize_firebase
from firebase_admin import firestore

initialize_firebase()
db = firestore.client()

# Fetch all news_alerts that are marked as global
docs = db.collection('alerts').where('type', 'in', ['news_alert', 'news_naver', 'news_google']).where('is_global', '==', True).stream()

count = 0
for doc in docs:
    db.collection('alerts').document(doc.id).update({"is_global": False})
    count += 1

print(f"Fixed {count} news alerts that were mistakenly set to global.")
