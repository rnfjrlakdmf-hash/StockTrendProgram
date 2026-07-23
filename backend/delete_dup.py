import firebase_admin
from firebase_admin import credentials, firestore
import os

os.environ['FIREBASE_SERVICE_ACCOUNT_KEY'] = 'C:/Users/rnfjr/StockTrendProgram/backend/firebase-adminsdk.json'
cred = credentials.Certificate(os.environ['FIREBASE_SERVICE_ACCOUNT_KEY'])
firebase_admin.initialize_app(cred)
db = firestore.client()

slug_to_delete = "20260722-230025-us-market-view"
print(f"Deleting {slug_to_delete}")
db.collection('blog_posts').document(slug_to_delete).delete()
print("Deleted.")
