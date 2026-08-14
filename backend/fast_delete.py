import sys
import os

try:
    from firebase_config import initialize_firebase, get_db
    from datetime import datetime, timedelta
    import pytz
    
    initialize_firebase()
    db = get_db()
    
    kst = pytz.timezone('Asia/Seoul')
    three_days_ago = datetime.now(kst) - timedelta(days=3)
    print(f"Deleting alerts before: {three_days_ago}")
    
    if db:
        alerts_ref = db.collection('alerts')
        deleted_count = 0
        
        while True:
            query = alerts_ref.where('timestamp', '<', three_days_ago).limit(500)
            docs = query.get()
            
            if not docs:
                break
                
            batch = db.batch()
            for doc in docs:
                batch.delete(doc.reference)
                
            batch.commit()
            deleted_count += len(docs)
            print(f"Deleted {deleted_count} docs so far...")
            
        print(f"Total deleted from Firestore: {deleted_count}")
except Exception as e:
    print(f"Error: {e}")
