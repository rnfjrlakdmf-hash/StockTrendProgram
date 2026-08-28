# security_middleware.py
# Enterprise CyberShield 24/7 Web Application Firewall (WAF) & Intrusion Prevention (IPS)

import time
import urllib.parse
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# 1. 악성 스캐너 및 해킹 봇 User-Agent 패턴
MALICIOUS_USER_AGENTS = [
    "sqlmap", "nikto", "masscan", "nmap", "zgrab", "censys", 
    "gobuster", "dirbuster", "wpscan", "havij", "acunetix",
    "nessus", "openvas", "shodan"
]

# 2. 취약점 탐색 빈발 경로 (Honeypot Traps)
MALICIOUS_PATHS = [
    "/.env", "/wp-admin", "/phpmyadmin", "/.git", "/wp-login", 
    "/.aws", "/config.php", "/admin.php", "/backup.zip", "/xmlrpc.php",
    "/actuator", "/swagger-ui", "/api-docs", "/.ds_store", "/setup.cgi",
    "/boaform", "/webfig", "/server-status", "/solr", "/jenkins"
]

# 3. SQL Injection / XSS / LFI / RCE 악성 페이로드 패턴
MALICIOUS_PAYLOADS = [
    "union select", "union all select", "order by 100", 
    "select * from", "drop table", "insert into",
    "script>", "<svg", "onerror=", "onload=", "javascript:", 
    "document.cookie", "eval(", "exec(", "base64_decode",
    "../", "..\\", "/etc/passwd", "/etc/shadow", "c:\\windows"
]

# 메모리 기반 침입 차단 및 레이트 리밋 캐시
BLOCKED_IPS = {}            # { ip: unblock_timestamp }
NOTIFIED_IPS = {}           # { ip: last_notified_timestamp }
RATE_LIMIT_BUCKETS = defaultdict(list) # { ip: [timestamp1, timestamp2, ...] }

# 설정 값
MAX_REQUESTS_PER_10S = 80   # 10초당 최대 80회 요청 허용 (일반 브라우징 충분, 디도스/크롤러 즉시 차단)
JAIL_TIME_SECONDS = 300     # 공격 감지 시 5분(300초)간 접속 원천 차단

class SecurityWatchdogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "Unknown"
        now = time.time()
        
        # -------------------------------------------------------------
        # 1. 격리(Jail)된 악성 IP 차단 검사
        # -------------------------------------------------------------
        if client_ip in BLOCKED_IPS:
            if now < BLOCKED_IPS[client_ip]:
                return JSONResponse(
                    status_code=403, 
                    content={"status": "error", "message": "CyberShield: Access Denied due to security violations."}
                )
            else:
                del BLOCKED_IPS[client_ip]

        path = request.url.path.lower()
        query_string = urllib.parse.unquote(request.url.query).lower()
        user_agent = request.headers.get("user-agent", "").lower()

        # -------------------------------------------------------------
        # 2. 악성 봇 / 스캐너 User-Agent 검사
        # -------------------------------------------------------------
        for bad_agent in MALICIOUS_USER_AGENTS:
            if bad_agent in user_agent:
                self.block_ip(client_ip, f"Malicious Scanner Tool Detected ({bad_agent})")
                return JSONResponse(status_code=403, content={"status": "error", "message": "Security Alert."})

        # -------------------------------------------------------------
        # 3. 경로 스캐닝 검사 (취약점 찌르기)
        # -------------------------------------------------------------
        for bad_path in MALICIOUS_PATHS:
            if bad_path in path:
                self.block_ip(client_ip, f"Unauthorized Path Scanning ({path})")
                return JSONResponse(status_code=403, content={"status": "error", "message": "Access Forbidden."})

        # -------------------------------------------------------------
        # 4. 파라미터 기반 인젝션 검사 (SQLi, XSS, LFI)
        # -------------------------------------------------------------
        if query_string:
            for bad_payload in MALICIOUS_PAYLOADS:
                if bad_payload in query_string:
                    self.block_ip(client_ip, f"Injection Attempt in Query ({query_string[:60]})")
                    return JSONResponse(status_code=403, content={"status": "error", "message": "Attack Signature Blocked."})

        # -------------------------------------------------------------
        # 5. Anti-DDoS & Rate Limiting (10초 슬라이딩 윈도우)
        # -------------------------------------------------------------
        # 로컬호스트 루프백 제외
        if client_ip not in ["127.0.0.1", "localhost", "::1"]:
            bucket = RATE_LIMIT_BUCKETS[client_ip]
            # 10초 이전 기록 청소
            RATE_LIMIT_BUCKETS[client_ip] = [t for t in bucket if now - t < 10.0]
            RATE_LIMIT_BUCKETS[client_ip].append(now)
            
            if len(RATE_LIMIT_BUCKETS[client_ip]) > MAX_REQUESTS_PER_10S:
                self.block_ip(client_ip, f"Rate Limit Exceeded ({len(RATE_LIMIT_BUCKETS[client_ip])} reqs/10s)")
                return JSONResponse(
                    status_code=429, 
                    content={"status": "error", "message": "Too many requests. Please slow down."}
                )

        # -------------------------------------------------------------
        # 6. 정상 요청 통과 및 7중 보안 헤더 주입
        # -------------------------------------------------------------
        response = await call_next(request)
        
        # 엔터프라이즈 보안 헤더 적용
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-CyberShield-Defense"] = "Active 24/7"
        
        return response

    def block_ip(self, ip: str, reason: str):
        """악성 IP 격리 및 관리자 알림 발송"""
        now = time.time()
        BLOCKED_IPS[ip] = now + JAIL_TIME_SECONDS
        
        # 시스템 DB 로그에 보안 이벤트 기록
        try:
            from db_manager import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_logs (level, source, message)
                VALUES ('SECURITY', 'CyberShield', ?)
            """, (f"IP [{ip}] Blocked for {JAIL_TIME_SECONDS}s. Reason: {reason}",))
            conn.commit()
            conn.close()
        except Exception:
            pass

        print(f"[CyberShield-24/7] 🚨 BLOCKED IP: {ip} | Reason: {reason}")
        
        # 관리자 알림 (동일 IP는 30분에 1회만 알림 발송하여 알림 폭탄 방지)
        last_notified = NOTIFIED_IPS.get(ip, 0)
        if now - last_notified > 1800:
            NOTIFIED_IPS[ip] = now
            try:
                from system_watchdog import send_admin_alert
                send_admin_alert("🛡️ CyberShield 사이트 방화벽", f"악성 침입 시도 차단 및 IP 격리 완료!\n- IP: {ip}\n- 사유: {reason}\n- 조치: 5분간 접속 원천 차단")
            except Exception:
                pass
