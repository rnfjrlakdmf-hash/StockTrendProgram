import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('firebase-adminsdk.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

prefixes = ('mass-', 'seo-', 'theme-', 'qa-seo-')
docs = db.collection('theory_posts').stream()

count = 0
for doc in docs:
    data = doc.to_dict()
    slug = data.get('slug', '')
    if any(slug.startswith(p) for p in prefixes):
        # 1. Write to seo_posts
        db.collection('seo_posts').document(doc.id).set(data)
        
        # 2. Delete from theory_posts
        db.collection('theory_posts').document(doc.id).delete()
        print(f"Moved {slug} to seo_posts")
        count += 1

print(f"Successfully moved {count} SEO posts from theory_posts to seo_posts.")
