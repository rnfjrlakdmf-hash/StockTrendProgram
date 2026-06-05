import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK 초기화 성공 (Service Account Key 사용)")
        else:
            firebase_admin.initialize_app()
            print("Firebase Admin SDK 초기화 성공 (기본 자격 증명 사용)")

def delete_all_posts():
    init_firebase()
    db = firestore.client()
    docs = db.collection("blog_posts").stream()
    
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
        
    print(f"✅ 기존 블로그 포스트 {count}개를 모두 삭제하여 초기화했습니다!")

if __name__ == "__main__":
    delete_all_posts()
