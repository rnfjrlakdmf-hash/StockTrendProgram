import requests
import traceback
from datetime import datetime
import pytz

def run_system_health_check():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    errors = []
    
    # 1. API Health Endpoint Check & Response Time
    api_time = 0
    try:
        t0 = datetime.now()
        res = requests.get('http://127.0.0.1:8000/api/health', timeout=5)
        api_time = (datetime.now() - t0).total_seconds() * 1000
        if res.status_code != 200:
            errors.append(f"❌ API 서버 응답 오류 (Status: {res.status_code})")
    except Exception as e:
        errors.append(f"❌ API 서버 연결 실패: {str(e)}")
        
    # 2. Database Connection & Basic Stats
    db_stats = "통계 수집 실패"
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM fcm_tokens")
        token_count = cursor.fetchone()[0]
        
        # Check today's error logs
        cursor.execute("SELECT COUNT(*) FROM system_logs WHERE level='ERROR' AND created_at >= date('now')")
        error_count = cursor.fetchone()[0]
        
        db_stats = f"총 가입자 수: {user_count}명 / 알림 설정 기기: {token_count}대"
        if error_count > 0:
            db_stats += f"\n- ⚠️ 금일 시스템 에러 로그: {error_count}건 감지!"
        else:
            db_stats += f"\n- 🟢 금일 시스템 에러 로그: 0건 (안정적)"
            
        conn.close()
    except Exception as e:
        errors.append(f"❌ 데이터베이스 연결 실패: {str(e)}")
        
    # 3. Environment & API Keys
    import os
    env_status = []
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    dart_key = os.environ.get("DART_API_KEY", "")
    kis_key = os.environ.get("KIS_APP_KEY", "")
    
    if gemini_key: env_status.append("✅ AI 분석 엔진 (Gemini)")
    else: env_status.append("❌ AI 분석 엔진 (키 누락)")
    
    if dart_key: env_status.append("✅ DART 전자공시 연동")
    else: env_status.append("❌ DART 전자공시 연동 (키 누락)")
    
    if kis_key: env_status.append("✅ 한국투자증권 실시간 연동")
    else: env_status.append("⚠️ 한국투자증권 연동 (미설정)")
        
    # 4. Firebase Connection Check
    try:
        import firebase_admin
        from firebase_config import initialize_firebase
        initialize_firebase()
        if not firebase_admin._apps:
            errors.append("❌ Firebase 초기화 실패 (앱 없음)")
    except Exception as e:
        errors.append(f"❌ Firebase 연결 실패: {str(e)}")
        
    # 5. External Connection (Naver Finance) Check
    naver_time = 0
    try:
        t0 = datetime.now()
        res = requests.get('https://finance.naver.com/', timeout=5)
        naver_time = (datetime.now() - t0).total_seconds() * 1000
        if res.status_code != 200:
            errors.append(f"❌ 네이버 금융 접근 오류 (Status: {res.status_code})")
    except Exception as e:
        errors.append(f"❌ 네이버 금융 접근 실패: {str(e)}")
        
    # --- Prepare Alert ---
    is_healthy = len(errors) == 0
    
    if is_healthy:
        title = "✅ [STOCK AI] 일일 헬스체크 리포트"
        body = f"[{today_str}] 전체 시스템 정상 동작 중입니다.\n\n"
        body += f"📈 [가입자 현황]\n- {db_stats}\n\n"
        body += f"⚡ [서버 응답 속도]\n- 메인 API 서버: {api_time:.1f}ms\n- 네이버 금융: {naver_time:.1f}ms\n\n"
        body += f"🔌 [외부 연동 상태]\n" + "\n".join(f"- {s}" for s in env_status)
    else:
        title = "🚨 [STOCK AI] 헬스체크 경고!"
        body = f"[{today_str}] 시스템 점검 중 오류가 발견되었습니다:\n\n" + "\n".join(errors)
        
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
