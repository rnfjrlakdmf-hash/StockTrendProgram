import firebase_admin
from firebase_admin import credentials, firestore
import os

def check_duplicates():
    cred_path = "firebase-adminsdk.json"
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    db = firestore.client()
    ref = db.collection("theory_posts")
    
    docs = ref.where("slug", ">=", "qa-seo-").where("slug", "<", "qa-seo-" + "\uf8ff").stream()
    
    seen_titles = {}
    duplicates = []
    
    for doc in docs:
        data = doc.to_dict()
        title = data.get("title", "")
        # Normalize title a bit
        norm_title = title.split("!")[0] if "!" in title else title
        norm_title = norm_title.split(" 완벽 정리")[0]
        
        if norm_title in seen_titles:
            duplicates.append((doc.id, title))
        else:
            seen_titles[norm_title] = doc.id
            
    print(f"Found {len(duplicates)} duplicates:")
    for d in duplicates:
        print(f"Duplicate ID: {d[0]}, Title: {d[1]}")
        # Automatically delete the duplicate
        print(f"Deleting duplicate {d[0]}...")
        ref.document(d[0]).delete()

if __name__ == "__main__":
    check_duplicates()
