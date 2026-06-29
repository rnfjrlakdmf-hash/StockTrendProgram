import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

with open('backend/firebase-adminsdk.json') as f:
    cred_dict = json.load(f)
cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)

db = firestore.client()
docs = db.collection('blog_posts').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(10).stream()

for doc in docs:
    data = doc.to_dict()
    title = data.get('title', '')
    if '06월 20일' in title or '06월 21일' in title:
        print(f"Deleting: {title}")
        doc.reference.delete()

print("Done")
