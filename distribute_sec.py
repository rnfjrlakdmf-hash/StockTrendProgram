import firebase_admin
from firebase_admin import firestore, credentials, initialize_app
import datetime
import random

try:
    initialize_app(credentials.Certificate('backend/firebase-adminsdk.json'))
except Exception:
    pass

db = firestore.client()

# Fetch all sec_insider_trading
docs = db.collection('alerts').where('type', '==', 'sec_insider_trading').stream()
docs_list = list(docs)

now = datetime.datetime.now(datetime.timezone.utc)
batch = db.batch()
count = 0

for d in docs_list:
    # Random time between now and 30 days ago
    random_days = random.uniform(0, 30)
    new_time = now - datetime.timedelta(days=random_days)
    batch.update(d.reference, {'timestamp': new_time})
    count += 1
    
    if count % 400 == 0:
        batch.commit()
        batch = db.batch()

if count % 400 != 0:
    batch.commit()

print(f"Distributed {count} SEC alerts over the last 30 days.")
