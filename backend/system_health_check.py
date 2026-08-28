# system_health_check.py
# Enterprise-Grade Site Security, System Health & Self-Healing Sentinel

import os
import sys
import time
import requests
import traceback
import subprocess
import shutil
from datetime import datetime
import pytz

def get_disk_usage():
    """디스크 용량 점검 (루트 드라이브)"""
    try:
        total, used, free = shutil.disk_usage("/")
        used_pct = (used / total) * 100
        free_gb = free / (1024 ** 3)
        return used_pct, free_gb
    except Exception:
        return 0, 0

def check_database_integrity():
    """데이터베이스 무결성 및 통계 점검"""
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. 무결성 체크
        cursor.execute("PRAGMA quick_check;")
        quick_check = cursor.fetchone()[0]
        if quick_check != "ok":
            conn.close()
            return False, f"DB 무결성 오류 ({quick_check})", 0, 0, 0
            
        # 2. 통계 수집
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM fcm_tokens")
        token_count = cursor.fetchone()[0]
        
        # 3. 금일 에러 로그
        cursor.execute("SELECT COUNT(*) FROM system_logs WHERE level='ERROR' AND created_at >= date('now')")
        error_count = cursor.fetchone()[0]
        
        conn.close()
        return True, "정상", user_count, token_count, error_count
    except Exception as e:
        return False, str(e), 0, 0, 0

def run_system_health_check():
    """전방위 사이트 보안 및 시스템 헬스체크 실행"""
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    issues = []
    diagnostics = []
    
    # -------------------------------------------------------------
    # 1. FastAPI 백엔드 헬스체크 (3회 적응형 재시도 & 자가 치유)
    # -------------------------------------------------------------
    api_time = 0
    api_success = False
    api_err_detail = ""
    
    for attempt in range(1, 4):
        try:
            t0 = time.time()
            res = requests.get('http://127.0.0.1:8000/api/health', timeout=10)
            api_time = (time.time() - t0) * 1000
            if res.status_code == 200:
                api_success = True
                break
            else:
                api_err_detail = f"HTTP 상태 코드 {res.status_code}"
        except requests.exceptions.Timeout:
            api_err_detail = f"응답 시간 초과 (10초 타임아웃, 시도 {attempt}/3)"
        except requests.exceptions.ConnectionError:
            api_err_detail = f"포트 8000 연결 거부 (시도 {attempt}/3)"
        except Exception as e:
            api_err_detail = str(e)
        time.sleep(1.5)
        
    if not api_success:
        # 자가 치유(Self-Healing) 시도
        try:
            print("[HealthSentinel] API Down detected. Attempting self-healing restart...")
            subprocess.run(["sudo", "systemctl", "restart", "stocktrend-backend"], check=False, timeout=10)
            time.sleep(3)
            # 재확인
            res_heal = requests.get('http://127.0.0.1:8000/api/health', timeout=10)
            if res_heal.status_code == 200:
                diagnostics.append("🛠️ [자가 치유 성공] API 서버 일시 지연 발생 후 자동 재시작을 통해 정상 회복 완료")
                api_success = True
            else:
                issues.append(f"❌ API 서버 응답 불가: {api_err_detail} (자동 복구 실패)")
        except Exception as heal_err:
            issues.append(f"❌ API 서버 응답 불가: {api_err_detail} (자가치유 오류: {heal_err})")
    else:
        diagnostics.append(f"⚡ [API 서버] 정상 응답 ({api_time:.1f}ms)")

    # -------------------------------------------------------------
    # 2. Next.js 프론트엔드 웹 서버 점검
    # -------------------------------------------------------------
    fe_success = False
    fe_time = 0
    try:
        t0 = time.time()
        res_fe = requests.get('http://127.0.0.1:3000/discovery', timeout=8)
        fe_time = (time.time() - t0) * 1000
        if res_fe.status_code in [200, 307, 308]:
            fe_success = True
            diagnostics.append(f"🌐 [웹 프론트엔드] 정상 가동 ({fe_time:.1f}ms)")
        else:
            issues.append(f"⚠️ 프론트엔드 웹 응답 비정상 (Status: {res_fe.status_code})")
    except Exception as fe_err:
        issues.append(f"❌ 프론트엔드 웹 연결 오류: {str(fe_err)}")

    # -------------------------------------------------------------
    # 3. 데이터베이스 & 무결성 점검
    # -------------------------------------------------------------
    db_ok, db_msg, user_count, token_count, error_count = check_database_integrity()
    if db_ok:
        diagnostics.append(f"💾 [데이터베이스] 무결성 정상 · 가입자 {user_count}명 / 활성 기기 {token_count}대")
        if error_count > 0:
            diagnostics.append(f"⚠️ [시스템 에러 로그] 금일 에러 로그 {error_count}건 감지")
    else:
        issues.append(f"❌ 데이터베이스 이상: {db_msg}")

    # -------------------------------------------------------------
    # 4. 서버 리소스 & 디스크 공간 보안 감시
    # -------------------------------------------------------------
    disk_used_pct, disk_free_gb = get_disk_usage()
    if disk_used_pct > 88:
        issues.append(f"⚠️ [디스크 경보] 디스크 사용량 {disk_used_pct:.1f}% (잔여 {disk_free_gb:.1f}GB)")
    else:
        diagnostics.append(f"💽 [서버 디스크] 여유 ({disk_used_pct:.1f}% 사용 중, {disk_free_gb:.1f}GB 잔여)")

    # -------------------------------------------------------------
    # 5. 핵심 외부 금융 API 연동 상태
    # -------------------------------------------------------------
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    dart_key = os.environ.get("DART_API_KEY", "")
    
    api_keys_ok = bool(gemini_key and dart_key)
    if api_keys_ok:
        diagnostics.append("🔑 [인증 키] Gemini AI & DART 전자공시 정상 탑재")
    else:
        missing = []
        if not gemini_key: missing.append("Gemini AI")
        if not dart_key: missing.append("DART")
        issues.append(f"⚠️ [API 키 누락] {', '.join(missing)}")

    # -------------------------------------------------------------
    # 6. 리포트 생성 & 관리자 전송
    # -------------------------------------------------------------
    is_healthy = len(issues) == 0
    
    if is_healthy:
        title = "🛡️ [STOCK AI] 24/7 사이트 보안 & 헬스체크"
        body = (
            f"[{today_str}] 전체 시스템 보안 및 서비스가 매우 안정적으로 정상 가동 중입니다.\n\n"
            f"📊 [서비스 모니터링]\n" + "\n".join(f"- {d}" for d in diagnostics)
        )
    else:
        title = "🚨 [STOCK AI] 사이트 관제 시스템 경고!"
        body = (
            f"[{today_str}] 시스템 점검 중 다음 이상 징후가 감지되었습니다:\n\n"
            f"📌 [발견된 문제점]\n" + "\n".join(f"- {i}" for i in issues) + "\n\n"
            f"📊 [현재 진단 현황]\n" + "\n".join(f"- {d}" for d in diagnostics)
        )
        
    try:
        print(f"[HealthSentinel] {title}")
        print(body)
    except Exception:
        pass
        
    # Send only when there are actual issues OR requested
    if not is_healthy:
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
                    target_users=admin_uids,
                    skip_db_save=True
                )
                print(f"[HealthSentinel] Sent alert to {len(tokens)} admin tokens.")
        except Exception as e:
            print(f"[HealthSentinel] Failed to send admin push: {e}")

if __name__ == '__main__':
    run_system_health_check()
