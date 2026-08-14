import os
import re
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

def remove_all_duplicates():
    # Fetch all theory posts, oldest first
    docs = db.collection("theory_posts").order_by("createdAt", direction=firestore.Query.ASCENDING).stream()
    
    seen_full_titles = []
    to_delete = []
    
    for doc in docs:
        data = doc.to_dict()
        title = data.get("title", "")
        orig = data.get("originalTopic", "")
        
        # Extract keywords from title and orig
        eng_kws = re.findall(r'[A-Za-z]{2,}', title.upper())
        if orig:
            eng_kws += re.findall(r'[A-Za-z]{2,}', orig.upper())
            
        kor_kws = []
        if orig:
            key = orig.split('(')[0].split('란')[0].split('이란')[0].strip()
            if len(key) >= 2 and not re.match(r'^[A-Za-z]+$', key):
                kor_kws.append(key)
        
        # If no orig, try to get from title
        if not kor_kws:
            key = title.split('(')[0].split('란')[0].split('이란')[0].strip()
            if len(key) >= 2 and not re.match(r'^[A-Za-z]+$', key):
                kor_kws.append(key)
                
        candidate_kws = set(eng_kws + kor_kws)
        
        is_dup = False
        for kw in candidate_kws:
            if len(kw) >= 2:
                for past_title in seen_full_titles:
                    if kw.upper() in past_title.upper():
                        is_dup = True
                        print(f"Duplicate found: '{title}' because of keyword '{kw}' matching past title '{past_title}'")
                        break
            if is_dup:
                break
                
        if is_dup:
            to_delete.append(doc.id)
        else:
            seen_full_titles.append(title)
            if orig:
                seen_full_titles.append(orig)
            
    print(f"Found {len(to_delete)} total duplicates to delete.")
    for doc_id in to_delete:
        db.collection("theory_posts").document(doc_id).delete()
        print(f"Deleted {doc_id}")

if __name__ == "__main__":
    remove_all_duplicates()
