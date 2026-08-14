import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from firebase_admin import firestore, credentials, initialize_app

initialize_app(credentials.Certificate('backend/firebase-adminsdk.json'))
db = firestore.client()

docs = db.collection('alerts').where('type', '==', 'disclosure_alert').stream()

batch = db.batch()
count = 0

for doc in docs:
    data = doc.to_dict()
    if 'SEC 공시' in data.get('title', ''):
        batch.update(doc.reference, {'type': 'sec_disclosure'})
        count += 1
        if count % 500 == 0:
            batch.commit()
            print(f"Committed {count} updates...")
            batch = db.batch()

if count % 500 != 0:
    batch.commit()

print(f"Total SEC alerts updated: {count}")
