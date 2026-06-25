import requests
import traceback
from datetime import datetime
import pytz

def run_system_health_check():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    errors = []
    
    # 1. API Health Endpoint Check
    try:
        res = requests.get('http://127.0.0.1:8000/api/health', timeout=5)
        if res.status_code != 200:
            errors.append(f"❌ API 서버 응답 오류 (Status: {res.status_code})")
    except Exception as e:
        errors.append(f"❌ API 서버 연결 실패: {str(e)}")
        
    # 2. Database Connection Check
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
    except Exception as e:
        errors.append(f"❌ 데이터베이스 연결 실패: {str(e)}")
        
    # 3. Firebase Connection Check
    try:
        import firebase_admin
        from firebase_config import initialize_firebase
        initialize_firebase()
        if not firebase_admin._apps:
            errors.append("❌ Firebase 초기화 실패 (앱 없음)")
    except Exception as e:
        errors.append(f"❌ Firebase 연결 실패: {str(e)}")
        
    # 4. External Connection (Naver Finance) Check
    try:
        res = requests.get('https://finance.naver.com/', timeout=5)
        if res.status_code != 200:
            errors.append(f"❌ 네이버 금융 접근 오류 (Status: {res.status_code})")
    except Exception as e:
        errors.append(f"❌ 네이버 금융 접근 실패: {str(e)}")
        
    # --- Prepare Alert ---
    is_healthy = len(errors) == 0
    
    if is_healthy:
        title = "✅ [STOCK AI] 일일 시스템 헬스체크 통과"
        body = f"[{today_str}] 모든 시스템(API, DB, Firebase, 외부망)이 정상적으로 동작 중입니다."
    else:
        title = "🚨 [STOCK AI] 시스템 헬스체크 오류 발생!"
        body = f"[{today_str}] 시스템 점검 중 다음 오류가 발견되었습니다:\n\n" + "\n".join(errors)
    try:
        print(f"[HealthCheck] {title}".encode('utf-8').decode('cp949', 'ignore'))
    except:
        print("[HealthCheck] Finished checking.")
    
    # --- Send Alert to Admins ---
    try:
        from firebase_config import send_multicast_notification
        from db_manager import get_db_connection as get_db
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT f.token 
            FROM fcm_tokens f
            LEFT JOIN users u ON f.user_id = u.id
            WHERE LOWER(u.email) IN ('rnfjrlakdmf@gmail.com', 'rnfjr@gmail.com')
               OR f.user_id IN ('110418985320259217419', 'rnfjrlakdmf@gmail.com')
        """)
        tokens = [row[0] for row in cursor.fetchall() if row[0]]
        
        cursor.execute("""
            SELECT u.id
            FROM users u
            WHERE LOWER(u.email) IN ('rnfjrlakdmf@gmail.com', 'rnfjr@gmail.com')
        """)
        admin_uids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if tokens:
            send_multicast_notification(
                tokens=tokens,
                title=title,
                body=body,
                data={"url": "/", "is_global": "false", "type": "admin_report"},
                target_users=admin_uids
            )
            print(f"[HealthCheck] Sent admin report to {len(tokens)} tokens.")
        else:
            print("[HealthCheck] No admin tokens found to send report.")
    except Exception as e:
        print(f"[HealthCheck] Failed to send alert: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    run_system_health_check()
