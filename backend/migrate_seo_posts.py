import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('firebase-adminsdk.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Fetch all from blog_posts where slug starts with mass-, seo-, or theme-
prefixes = ('mass-', 'seo-', 'theme-', 'qa-seo-')
docs = db.collection('blog_posts').stream()

count = 0
for doc in docs:
    data = doc.to_dict()
    slug = data.get('slug', '')
    if any(slug.startswith(p) for p in prefixes):
        # 1. Write to theory_posts
        db.collection('theory_posts').document(doc.id).set(data)
        
        # 2. Delete from blog_posts
        db.collection('blog_posts').document(doc.id).delete()
        print(f"Moved {slug} to theory_posts")
        count += 1

print(f"Successfully moved {count} SEO posts.")
