import time
import urllib.parse
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from system_watchdog import send_admin_alert

# 영구 차단된 해커 IP 목록 보관용 (메모리)
BLACKLISTED_IPS = set()

# 해커들이 취약점을 찾기 위해 찌르는 단골 경로 패턴들
MALICIOUS_PATHS = [
    "/.env", "/wp-admin", "/phpmyadmin", "/.git", "/wp-login", 
    "/.aws", "/config.php", "/admin.php", "/backup.zip"
]

# SQL 인젝션 / XSS 기초 방어 패턴
MALICIOUS_PAYLOADS = [
    "union select", "script>", "base64_", "eval(", "exec("
]

class SecurityWatchdogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "Unknown"
        path = request.url.path.lower()
        query_string = urllib.parse.unquote(request.url.query).lower()

        # 1. 블랙리스트 검사 (가장 먼저)
        if client_ip in BLACKLISTED_IPS:
            return JSONResponse(
                status_code=403, 
                content={"status": "rejected", "message": "Your IP has been permanently banned due to malicious activity."}
            )

        # 2. 경로 스캐닝 검사 (취약점 찌르기)
        for bad_path in MALICIOUS_PATHS:
            if bad_path in path:
                self.trigger_ban(client_ip, f"Malicious Path Scanning ({path})")
                return JSONResponse(status_code=403, content={"status": "error", "message": "Forbidden Action."})

        # 3. 쿼리 파라미터 기반 인젝션 검사 (SQLi, XSS)
        if query_string:
            for bad_payload in MALICIOUS_PAYLOADS:
                if bad_payload in query_string:
                    self.trigger_ban(client_ip, f"Injection Attempt in Query ({query_string})")
                    return JSONResponse(status_code=403, content={"status": "error", "message": "Forbidden Action."})

        # 정상적인 요청은 통과시킴
        response = await call_next(request)
        
        # 보안 헤더 강제 주입 (이중 삼중 방어망)
        response.headers["X-Content-Type-Options"] = "nosniff"          # 브라우저가 MIME 타입 추측 못하게 함
        response.headers["X-Frame-Options"] = "DENY"                    # 클릭재킹 방지 (우리 사이트를 다른 곳에서 iFrame으로 못 열게 함)
        response.headers["X-XSS-Protection"] = "1; mode=block"          # 구형 브라우저 XSS 방어
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains" # HTTPS 강제
        
        return response

    def trigger_ban(self, ip: str, reason: str):
        """해킹 시도 발견 시 IP 차단 및 관리자에게 푸시 발송 (최초 1회만 발송)"""
        if ip not in BLACKLISTED_IPS:
            BLACKLISTED_IPS.add(ip)
            alert_msg = f"해킹 시도 차단됨!\nIP: {ip}\n원인: {reason}"
            print(f"[Security-Watchdog] 🚨 BAN: {alert_msg}")
            # system_watchdog 모듈 재사용하여 관리자에게 긴급 알림 전송
            send_admin_alert("보안 봇 (Security Firewall)", alert_msg)
