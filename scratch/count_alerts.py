import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('.')
from firebase_config import initialize_firebase
from firebase_admin import firestore

initialize_firebase()
db = firestore.client()
# Get count of alerts
count = db.collection('alerts').count().get()
print(f"Total alerts in DB: {count[0][0].value}")

# Get count of news alerts
news_count = db.collection('alerts').where('type', '==', 'news_alert').count().get()
print(f"Total news alerts: {news_count[0][0].value}")

# Get counts by type
types = {}
docs = db.collection('alerts').stream()
for d in docs:
    t = d.to_dict().get('type', 'unknown')
    types[t] = types.get(t, 0) + 1

for t, c in types.items():
    print(f"{t}: {c}")
