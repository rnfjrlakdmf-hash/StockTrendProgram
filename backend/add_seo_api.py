
import os
path = 'c:/Users/rnfjr/StockTrendProgram/backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_api = '''
@app.get("/api/seo_posts/{slug}")
def get_seo_post(slug: str):
    from firebase_config import initialize_firebase
    from firebase_admin import firestore
    initialize_firebase()
    db = firestore.client()
    doc_ref = db.collection("seo_posts").document(slug)
    doc = doc_ref.get()
    if doc.exists:
        data = doc.to_dict()
        created_at = data.get("createdAt")
        if hasattr(created_at, "isoformat"):
            created_at_str = created_at.isoformat()
        else:
            created_at_str = str(created_at)
        data["createdAt"] = created_at_str
        return {"status": "ok", "post": data}
    else:
        return {"status": "error", "message": "Post not found"}
'''

if '/api/seo_posts/{slug}' not in content:
    with open(path, 'a', encoding='utf-8') as f:
        f.write(new_api)
    print('Added SEO post API route')
