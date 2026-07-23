import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

try:
    docs = db.collection("alerts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(50).stream()
    count = 0
    for doc in docs:
        print(f"{doc.id} => {doc.to_dict()}")
        count += 1
    print(f"Total: {count}")
except Exception as e:
    print(f"Error: {e}")
