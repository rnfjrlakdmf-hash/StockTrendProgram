import firebase_admin
from firebase_admin import credentials, firestore
import os, json

cred_path = os.path.join(os.path.dirname(os.path.abspath('backend/firebase_config.py')), 'firebase-adminsdk.json')
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    env_creds = os.environ.get('FIREBASE_CREDENTIALS')
    cred_dict = json.loads(env_creds)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)

db = firestore.client()
alerts = db.collection('alerts').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1000).stream()

count = 0
for doc in alerts:
    data = doc.to_dict()
    if data.get('type') == 'news_alert':
        count += 1
        print(f"Old news_alert: {data.get('title')}")
        
        # We should fix them here too!
        update_data = {'type': 'disclosure_alert'}
        if 'news_url' in data:
            update_data['dart_url'] = data['news_url']
            update_data['news_url'] = firestore.DELETE_FIELD
        
        doc.reference.update(update_data)
        
print(f"Found and updated {count} news_alerts.")
