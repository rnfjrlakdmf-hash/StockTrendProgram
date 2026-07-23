import firebase_admin
from firebase_admin import credentials, firestore
import os

def list_qa():
    cred_path = "firebase-adminsdk.json"
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    db = firestore.client()
    ref = db.collection("theory_posts")
    
    docs = ref.where("slug", ">=", "qa-seo-").where("slug", "<", "qa-seo-" + "\uf8ff").stream()
    
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}, Title: {data.get('title')}, Date: {data.get('createdAt')}")

if __name__ == "__main__":
    list_qa()
