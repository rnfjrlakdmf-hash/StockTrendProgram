import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from firebase_admin import firestore, credentials, initialize_app

initialize_app(credentials.Certificate('backend/firebase-adminsdk.json'))
db = firestore.client()

# Fetch all system_alert
docs = db.collection('alerts').where('type', '==', 'system_alert').stream()

batch = db.batch()
count = 0

for doc in docs:
    data = doc.to_dict()
    title = data.get('title', '')
    body = data.get('body', '')
    
    new_type = None
    
    if '내부자 거래 포착' in body or '내부자 거래 포착' in title:
        new_type = 'insider_trading'
    elif '슈퍼개미 포착' in body or '대량보유상황보고서' in body:
        new_type = 'large_holding'
    elif '공시 팩트 알림' in body:
        new_type = 'disclosure_alert'
    elif '세력 포착' in title:
        new_type = 'whale_alert'

    if new_type:
        batch.update(doc.reference, {'type': new_type})
        count += 1
        
        # Commit in batches of 500
        if count % 500 == 0:
            batch.commit()
            print(f"Committed {count} updates...")
            batch = db.batch()

if count % 500 != 0:
    batch.commit()
    print(f"Committed final {count % 500} updates...")

print(f"Total updated: {count}")
