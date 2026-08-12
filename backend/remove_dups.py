import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase-adminsdk.json")
        firebase_admin.initialize_app(cred)

init_firebase()
db = firestore.client()

def remove_duplicates():
    # Fetch all theory posts
    docs = db.collection("theory_posts").order_by("createdAt", direction=firestore.Query.DESCENDING).stream()
    
    seen_keywords = set()
    to_delete = []
    
    for doc in docs:
        data = doc.to_dict()
        title = data.get("title", "").lower()
        
        # Check if it contains ETF, ETN, PER, PBR, ROE
        is_dup = False
        
        if "per" in title or "pbr" in title or "roe" in title:
            if "per_pbr_roe" in seen_keywords:
                is_dup = True
            else:
                seen_keywords.add("per_pbr_roe")
                
        if "etf" in title or "etn" in title:
            if "etf_etn" in seen_keywords:
                is_dup = True
            else:
                seen_keywords.add("etf_etn")
                
        if is_dup:
            print(f"Deleting duplicate: {title}")
            to_delete.append(doc.id)
            
    for doc_id in to_delete:
        db.collection("theory_posts").document(doc_id).delete()
        print(f"Deleted {doc_id}")

if __name__ == "__main__":
    remove_duplicates()
