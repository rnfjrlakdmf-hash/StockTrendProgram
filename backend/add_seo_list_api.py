path = 'c:/Users/rnfjr/StockTrendProgram/backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_api = '''
@app.get("/api/seo_posts")
def get_seo_posts_list(page: int = 1, limit: int = 10):
    import firebase_admin
    from firebase_admin import firestore
    from google.cloud.firestore_v1 import Query
    from firebase_config import initialize_firebase

    initialize_firebase()
    if not firebase_admin._apps:
        return {"status": "error", "message": "Firebase not initialized", "posts": [], "total": 0, "totalPages": 0}

    try:
        db = firestore.client()
        collRef = db.collection("seo_posts")

        count_query = collRef.count()
        count_result = count_query.get()
        total = count_result[0][0].value if count_result else 0
        totalPages = max(1, -(-total // limit))

        q = collRef.order_by("createdAt", direction=Query.DESCENDING).limit(page * limit)
        docs = list(q.stream())

        start = (page - 1) * limit
        paged_docs = docs[start:start + limit]

        posts = []
        for doc in paged_docs:
            data = doc.to_dict()
            created_at = data.get("createdAt")
            if hasattr(created_at, "isoformat"):
                created_at_str = created_at.isoformat()
            else:
                created_at_str = str(created_at)
            posts.append({
                "id": doc.id,
                "title": data.get("title", "제목 없음"),
                "content": (data.get("content", ""))[:500],
                "createdAt": created_at_str,
                "tags": data.get("tags", []),
                "slug": data.get("slug", doc.id),
                "viewCount": data.get("viewCount", 0),
                "author": data.get("author", "AI 애널리스트"),
            })

        return {"status": "ok", "posts": posts, "total": total, "totalPages": totalPages}
    except Exception as e:
        print(f"[SEO Posts API] Error: {e}")
        return {"status": "error", "message": str(e), "posts": [], "total": 0, "totalPages": 0}
'''

if 'def get_seo_posts_list' not in content:
    with open(path, 'a', encoding='utf-8') as f:
        f.write(new_api)
    print('Added SEO posts list API route')
