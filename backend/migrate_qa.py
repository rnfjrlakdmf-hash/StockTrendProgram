import firebase_admin
from firebase_admin import credentials, firestore
import os

def migrate():
    # Firebase credentials are on EC2 in /home/ubuntu/StockTrendProgram/backend/firebase-adminsdk.json
    cred_path = "firebase-adminsdk.json"
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    db = firestore.client()
    blog_ref = db.collection("blog_posts")
    theory_ref = db.collection("theory_posts")
    
    docs = blog_ref.where("slug", ">=", "qa-seo-").where("slug", "<", "qa-seo-" + "\uf8ff").stream()
    migrated_count = 0
    
    for doc in docs:
        data = doc.to_dict()
        print(f"Migrating: {data.get('title')}")
        
        # 1. Copy to theory_posts
        theory_ref.document(doc.id).set(data)
        
        # 2. Delete from blog_posts
        blog_ref.document(doc.id).delete()
        
        migrated_count += 1
            
    print(f"Migration complete. Moved {migrated_count} posts from blog_posts to theory_posts.")

if __name__ == "__main__":
    migrate()
