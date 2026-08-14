
import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'StockTrendProgram', 'backend'))
from firebase_config import db
from firebase_admin import firestore

alerts = db.collection('alerts').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10).stream()

result = []
for a in alerts:
    d = a.to_dict()
    d['id'] = a.id
    if 'timestamp' in d:
        d['timestamp'] = str(d['timestamp'])
    result.append(d)
    
print(json.dumps(result, indent=2, ensure_ascii=False))
