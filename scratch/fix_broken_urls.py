import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('.')
from firebase_config import initialize_firebase
from firebase_admin import firestore

initialize_firebase()
db = firestore.client()

docs = db.collection('alerts').where('url', 'in', ['/market', '/discovery/ipo']).stream()

count = 0
for doc in docs:
    db.collection('alerts').document(doc.id).update({"url": "/discovery"})
    count += 1

print(f"Fixed {count} broken URLs in Firestore alerts.")
