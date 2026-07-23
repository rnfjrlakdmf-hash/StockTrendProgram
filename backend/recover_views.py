import os
import firebase_admin
from firebase_admin import credentials, firestore

def main():
    try:
        import firebase_config
        firebase_config.initialize_firebase()
        print("Firebase initialized via config.")
    except Exception as e:
        print("Error initializing firebase:", e)
        return
            
    db = firestore.client()
    
    # Data extracted from user's Vercel screenshot
    # Document ID -> Total Views (Pageviews)
    recovery_data = {
        "20260605-074012-kor-market-view": 7,
        "20260604-073130-kor-market-view": 5,
        "20260604-160051-kor-market-view": 5,
        "20260604-005415-kor-market-view": 2,
        "20260610-220120-us-market-view": 3,
        "20260604-002131-market-view": 1,
        "20260604-003416-market-view": 1,
        "20260604-004123-market-view": 1,
        "20260604-market-view": 5,
        "20260605-052649-kor-market-view": 3,
        "20260605-061813-kor-market-view": 5,
        "20260605-062240-kor-market-view": 2,
        "20260605-063250-kor-market-view": 2,
        "20260605-072743-kor-market-view": 3,
        "20260608-070121-kor-market-view": 1,
        "20260609-070142-kor-market-view": 2,
        "20260609-220104-us-market-view": 1,
        "20260610-070122-kor-market-view": 1,
        "20260611-071357-kor-market-view": 1,
        "20260611-220043-us-market-view": 1
    }
    
    success_count = 0
    for doc_id, views in recovery_data.items():
        doc_ref = db.collection("blog_posts").document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            current_views = doc.to_dict().get("viewCount", 0)
            if current_views < views:
                print(f"Updating {doc_id}: {current_views} -> {views}")
                doc_ref.update({"viewCount": views})
                success_count += 1
            else:
                print(f"Skipping {doc_id}: already has {current_views} views.")
        else:
            print(f"Document {doc_id} not found in DB. Trying with URL encoding fix...")
            
    print(f"Successfully recovered views for {success_count} posts!")

if __name__ == "__main__":
    main()
