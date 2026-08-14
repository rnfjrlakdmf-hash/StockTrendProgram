import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from firebase_admin import firestore, credentials, initialize_app

initialize_app(credentials.Certificate('backend/firebase-adminsdk.json'))
db = firestore.client()
docs = db.collection('alerts').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).stream()

known = ['crypto_bull', 'whale_accumulation', 'whale_alert', 'disclosure_alert', 'large_holding', 'disclosure', 'insider_trading', 'sec_insider_trading', 'sec_13f', 'ipo_alert', 'admin_report', 'news_alert', 'news_naver', 'news_google', 'news']

for d in docs:
    dtype = d.get('type')
    if dtype not in known:
        print(f"Type: {dtype}, Title: {d.get('title')}")
