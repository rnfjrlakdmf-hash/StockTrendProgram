import firebase_admin
from firebase_admin import credentials, firestore
import os

def delete_today():
    cred_path = "firebase-adminsdk.json"
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    db = firestore.client()
    ref = db.collection("theory_posts")
    
    # Delete posts created today
    docs = ref.where("slug", ">=", "qa-seo-20260723-").where("slug", "<", "qa-seo-20260723-" + "\uf8ff").stream()
    
    count = 0
    for doc in docs:
        print(f"Deleting ID: {doc.id}")
        ref.document(doc.id).delete()
        count += 1
        
    print(f"Deleted {count} QA posts from today.")

if __name__ == "__main__":
    delete_today()
