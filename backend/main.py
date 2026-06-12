import sys
try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

import os
import time
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Dict, Optional

# [Routers Import]
from auth import router as auth_router
from routes.market import router as market_router
from routes.analysis import router as analysis_router
from routes.community import router as community_router
from routes.user import router as user_router
from routes.system import router as system_router
from routes.sockets import router as sockets_router
from routes.signals import router as signals_router
from routes.alerts import router as alerts_router
from routes.seo import router as seo_router

# Initialize FastAPI
app = FastAPI(
    title="AI Stock Analyst API",
    version="v3.6.40-STABLE",
    description="최적의 안정성과 속도를 위해 모든 군더더기를 제거한 원상 복구 버전"
)

# [Strict CORS Policy for Security]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://stock-trend-program.vercel.app",
        "https://stocktrendprogram-production.up.railway.app",
        "https://stock-trend-program.co.kr",
        "https://www.stock-trend-program.co.kr"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# [Security Watchdog Middleware]
from security_middleware import SecurityWatchdogMiddleware
app.add_middleware(SecurityWatchdogMiddleware)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[Request] {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[Response] {request.method} {request.url.path} -> {response.status_code}")
    return response

# [Route Registration]
# [Vercel-Fix] Redirect uploads to /tmp if in read-only environment
if os.environ.get("VERCEL"):
    UPLOADS_DIR = "/tmp/uploads"
else:
    UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
from routes.marketing import router as marketing_router
from routes.master import router as master_router

app.include_router(system_router, prefix="/api/system", tags=["System"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(market_router, prefix="/api/market", tags=["Market"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(community_router, prefix="/api", tags=["Community"])
app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(signals_router, prefix="/api", tags=["Signals"])
app.include_router(alerts_router, prefix="/api", tags=["Alerts"])
app.include_router(marketing_router, prefix="/api/marketing", tags=["Marketing"])
app.include_router(master_router, prefix="/api/master", tags=["Master"])
app.include_router(seo_router, prefix="/api", tags=["SEO"])


import traceback
from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Global Exception: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": str(exc), "traceback": traceback.format_exc()}
    )

# [Backward Compatibility] Support old ETF detail path to fix 404 while frontend redeploys
@app.get("/api/etf-detail/{symbol}", tags=["Compatibility"])
async def legacy_etf_detail(symbol: str):
    from etf_detail import get_etf_detail
    return get_etf_detail(symbol)
from routes.debug import router as debug_router
app.include_router(debug_router, prefix="/api")
from routes.debug_notify import router as debug_notify_router
app.include_router(debug_notify_router, prefix="/api")
app.include_router(sockets_router, tags=["WebSocket"])

@app.on_event("startup")
async def startup_event():
    """서버 생존(Port Binding)을 최우선으로 하여 가장 쾌적하게 기동합니다."""
    print(f"\n[Startup] Nuclear Stability Mode active on PID: {os.getpid()}")
    
    # 1. 필수 DB 초기화 (비동기 처리로 부팅 속도 극대화)
    try:
        from db_manager import init_db
        from utils.briefing_store import init_briefing_table
        await asyncio.to_thread(init_db)
        await asyncio.to_thread(init_briefing_table)
    except Exception as e:
        print(f"[Startup] DB Init Warning: {e}")

    # 2. 배경 서비스는 서버가 완전히 안정화되고 입구가 열린 40초 뒤에 아주 천천히 깨웁니다.
    async def gradual_background_startup():
        await asyncio.sleep(40)
        print("[Background] Starting secondary services...")
        try:
            from background_indexer import background_indexer
            asyncio.create_task(background_indexer.run_forever())
        except: pass
        
        await asyncio.sleep(5)
        try:
            print("[Background] Starting price alerts & batch news...")
            from price_alerts import price_alert_monitor, create_price_alerts_tables
            await asyncio.to_thread(create_price_alerts_tables)
            asyncio.create_task(price_alert_monitor.start())
            print("[Background] price_alert_monitor task created.")
        except Exception as e:
            print(f"[Background] Error starting price alerts: {e}")
            traceback.print_exc()

        try:
            # ✅ [v7.0.0] 1만명 규모 배치 뉴스 시스템 (공식 네이버 Open API)
            # 기존: 이용자별 × 종목별 → API 폭주 (비효율)
            # 개선: 종목별 1회 수집 → 이용자별 분류 발송 (API 최소화)
            print("[Background] Starting batch news system...")
            from batch_news_system import batch_news_system
            asyncio.create_task(batch_news_system.start(interval_minutes=5))
            print("[Background] batch_news_system task created. (5 min interval)")
        except Exception as e:
            print(f"[Background] Error starting batch news system: {e}")
            traceback.print_exc()

        try:
            print("[Background] Starting auto price alerts...")
            from auto_price_alerts import auto_price_monitor
            asyncio.create_task(auto_price_monitor.start())
            print("[Background] auto_price_monitor task created.")
        except Exception as e:
            print(f"[Background] Error starting auto price alerts: {e}")
            traceback.print_exc()

        try:
            # [BugFix] alerts.json 기반 사용자 설정 알림 체크 루프 (60초마다)
            async def check_alerts_loop():
                print("[AlertsLoop] JSON-based alert checker started (60s interval)")
                await asyncio.sleep(30)  # 서버 안정화 후 시작
                while True:
                    try:
                        from alerts import check_alerts
                        triggered = await asyncio.to_thread(check_alerts)
                        if triggered:
                            print(f"[AlertsLoop] {len(triggered)} alert(s) triggered and sent!")
                    except Exception as e:
                        print(f"[AlertsLoop] Error: {e}")
                    await asyncio.sleep(60)
            asyncio.create_task(check_alerts_loop())
            print("[Background] check_alerts_loop task created.")
        except Exception as e:
            print(f"[Background] Error starting check_alerts_loop: {e}")
            traceback.print_exc()

        try:
            # [Auto-Heal Scraper] 매일 1회 (혹은 12시간마다) KIND 크롤러 헬스체크
            async def auto_heal_loop():
                print("[AutoHealLoop] KIND Scraper health checker started")
                await asyncio.sleep(60) # 서버 안정화 후 시작
                while True:
                    try:
                        from auto_heal_scraper import run_health_check_and_heal
                        await asyncio.to_thread(run_health_check_and_heal)
                    except Exception as e:
                        print(f"[AutoHealLoop] Error: {e}")
                    # 12시간(43200초) 대기
                    await asyncio.sleep(43200)
            asyncio.create_task(auto_heal_loop())
            print("[Background] auto_heal_loop task created.")
        except Exception as e:
            print(f"[Background] Error starting auto_heal_loop: {e}")
            traceback.print_exc()

        # 4. 장마감 결산 리포트 서비스 시작 (KST 15:40 / 06:10)
        try:
            from scheduler_service import start_scheduler
            start_scheduler()
        except: pass

        # 5. 공시 및 시간별 브리핑 스케줄러 시작
        try:
            from scheduler import disclosure_scheduler_loop, hourly_briefing_scheduler_loop, auto_blog_scheduler_loop, watchdog_scheduler_loop, seo_blog_scheduler_loop
            asyncio.create_task(disclosure_scheduler_loop())
            asyncio.create_task(hourly_briefing_scheduler_loop())
            asyncio.create_task(auto_blog_scheduler_loop())
            asyncio.create_task(seo_blog_scheduler_loop())
            asyncio.create_task(watchdog_scheduler_loop())
        except: pass

        # 6. 전광판 지수 상시 정찰대 (15초마다 미리 수집하여 0초 응답 달성)
        async def market_ticker_warmer():
            from stock_data import get_market_data
            print("[Turbo] Market Ticker Warmer Service Started.")
            while True:
                try:
                    await asyncio.to_thread(get_market_data)
                except: pass
                await asyncio.sleep(15) 
        
        asyncio.create_task(market_ticker_warmer())

        print("[Background] All services active.")

        # 4. [v5.4.0] 개선된 글로벌 랭킹 캐시 워밍업 (Safe Sequential Mode)
        async def ranking_cache_warmer():
            # 소켓 레벨의 타임아웃을 3.0초로 설정하여 외부 통신 무한 대기 방지 (데드락 예방 핵심)
            import socket
            socket.setdefaulttimeout(3.0)
            
            print("[Turbo] Global Ranking Cache Warmer Started in Safe Mode.")
            from rank_data import get_global_ranking, get_naver_ranking, crawl_naver_movers, get_etf_ranking
            from korea_data import get_market_insights_data
            
            combos = [
                ("KOSPI", "trading_volume"),
                ("KOSPI", "trading_amount"),
                ("KOSPI", "popular_search"),
                ("USA",   "trading_volume"),
            ]
            
            while True:
                start_time = time.time()
                try:
                    # [Safety Fix] 스레드 폭주 및 데드락을 방지하기 위해 병렬(gather) 실행 대신
                    # 0.5초의 텀을 두고 하나씩 안전하게 캐시를 갱신합니다. (1vCPU 최적화)
                    for market, cat in combos:
                        await asyncio.to_thread(get_global_ranking, market, cat)
                        await asyncio.sleep(0.5)
                    
                    # ETF 랭킹 워밍업
                    await asyncio.to_thread(get_etf_ranking, "KR")
                    await asyncio.sleep(0.5)
                    await asyncio.to_thread(get_etf_ranking, "US")
                    await asyncio.sleep(0.5)
                    
                    # 국내 인사이트 요약 데이터
                    await asyncio.to_thread(get_market_insights_data)
                    await asyncio.sleep(0.5)
                    
                    # 거래 상위 랭킹 및 변동주 크롤러 기동
                    await asyncio.to_thread(get_naver_ranking, "krx", "quant")
                    await asyncio.sleep(0.5)
                    await asyncio.to_thread(crawl_naver_movers)
                    
                    duration = time.time() - start_time
                    print(f"[Turbo] Cache Warm-up Completed in {duration:.1f}s.")
                except Exception as e:
                    print(f"[Turbo] Cache Warmer Critical Error: {e}")
                
                # 다음 주기까지 대기 (주기 2분 유지)
                await asyncio.sleep(max(30, 120 - (time.time() - start_time)))

        # [v6.5.0] Safe Mode로 개선되어 활성화
        asyncio.create_task(ranking_cache_warmer())

    asyncio.create_task(gradual_background_startup())

@app.get("/")
def read_root():
    return {"status": "success", "message": "Resilient API is Online."}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/api/blog/{blog_id}/view")
def increment_blog_view(blog_id: str):
    """
    [v6.5.0 Fix] Frontend sends POST to /api/blog/{id}/view but next.config.ts rewrites ALL /api requests to backend.
    Therefore, the backend must handle this to increment the Firestore view count.
    """
    import firebase_admin
    from firebase_admin import firestore
    
    if not firebase_admin._apps:
        return {"status": "error", "message": "Firebase not initialized"}
        
    try:
        db = firestore.client()
        doc_ref = db.collection("blog_posts").document(blog_id)
        doc_ref.update({"viewCount": firestore.Increment(1)})
        return {"success": True, "message": "View count updated"}
    except Exception as e:
        print(f"[Blog View] Error updating view count for {blog_id}: {e}")
        return {"success": False, "message": str(e)}

@app.get("/api/admin/news-stats")
def news_api_stats():
    """배치 뉴스 시스템 API 호출 통계 (관리자용)"""
    try:
        from batch_news_system import batch_news_system
        stats = batch_news_system.get_api_stats()
        return {"status": "ok", "stats": stats}
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    # Railway 등 배포 환경에서는 PORT 환경변수를 사용해야 함
    port = int(os.environ.get("PORT", 8000))
    # 운영 환경에서는 reload=False 권장
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
