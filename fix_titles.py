import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
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
    if '2026년 06월 22일' in title and data.get('author') == '관리자':
        # Change 6월 22일 to match the slug or created date
        slug = data.get('slug', '')
        if '20260621' in slug:
            new_title = title.replace('06월 22일', '06월 21일')
        elif '20260620' in slug:
            new_title = title.replace('06월 22일', '06월 20일')
        elif '20260619' in slug:
            new_title = title.replace('06월 22일', '06월 19일')
        else:
            continue
        print(f"Updating: {title} -> {new_title}")
        doc.reference.update({'title': new_title})

print("Done")
