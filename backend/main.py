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
from routes.referral import router as referral_router
from routes.ranking import router as ranking_router
from routes.user import router as user_router
from routes.system import router as system_router
from routes.sockets import router as sockets_router
from routes.signals import router as signals_router
from routes.alerts import router as alerts_router
from routes.seo import router as seo_router
from routes.weekend import router as weekend_router

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
app.include_router(referral_router, prefix="/api/referral", tags=["Referral"])
app.include_router(ranking_router, prefix="/api/ranking", tags=["Ranking"])
app.include_router(weekend_router, tags=["Weekend"])
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
    import concurrent.futures
    loop = asyncio.get_running_loop()
    loop.set_default_executor(concurrent.futures.ThreadPoolExecutor(max_workers=50))
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
            # Auto Price Alert Monitor
            from auto_price_alerts import AutoPriceMonitor
            auto_price_monitor = AutoPriceMonitor()
            asyncio.create_task(auto_price_monitor.start())
            print("[Background] auto_price_monitor task created.")
            
            # After Hours Alert Monitor
            from after_hours_alerts import after_hours_alert_loop
            asyncio.create_task(after_hours_alert_loop())
            print("[Background] after_hours_alert_loop task created.")
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

        try:
            # [Theme Precacher] 인기 테마 10개를 3시간마다 사전 캐싱하여 응답 속도 최적화
            async def theme_precache_loop():
                print("[ThemePrecacheLoop] Popular theme precacher started")
                await asyncio.sleep(90) # 서버 안정화 후 시작
                
                popular_themes = [
                    "온디바이스AI", "비만치료제", "전력기기", "자율주행", "K-푸드", 
                    "화장품", "로봇", "원전", "HBM", "CXL", "유리기판", 
                    "전고체배터리", "우주항공", "데이터센터", "양자암호", 
                    "핵융합", "저PBR", "가상화폐", "신재생에너지", "비대면진료", 
                    "웹툰", "방위산업", "미용기기", "인공지능", "반도체"
                ]
                
                while True:
                    try:
                        from db_manager import get_cached_theme
                        from ai_analysis import analyze_theme
                        
                        for theme in popular_themes:
                            cached = await asyncio.to_thread(get_cached_theme, theme)
                            if not cached:
                                print(f"[ThemePrecacheLoop] Precaching uncached/expired theme: {theme}")
                                # analyze_theme 내부에 save_theme_cache 로직이 있어 자동 캐싱됨
                                await asyncio.to_thread(analyze_theme, theme)
                                # 연속적인 API 호출로 인한 Rate Limit 방지용 대기
                                await asyncio.sleep(10)
                            else:
                                print(f"[ThemePrecacheLoop] Theme '{theme}' is already cached.")
                                
                    except Exception as e:
                        print(f"[ThemePrecacheLoop] Error: {e}")
                        
                    # 3시간(10800초) 대기 후 다시 확인 (DB 캐시 수명이 3시간이므로)
                    await asyncio.sleep(10800)
                    
            asyncio.create_task(theme_precache_loop())
            print("[Background] theme_precache_loop task created.")
        except Exception as e:
            print(f"[Background] Error starting theme_precache_loop: {e}")
            traceback.print_exc()

        try:
            # [Signal Precacher] 최근 글로벌 마켓 시그널 상위 20개 브리핑 사전 캐싱 (타임아웃 방지)
            async def signal_precache_loop():
                print("[SignalPrecacheLoop] Global market signal precacher started")
                await asyncio.sleep(120) # 서버 안정화 후 시작
                
                while True:
                    try:
                        from db_manager import get_recent_signals
                        from turbo_engine import turbo_engine
                        from routes.signals import get_signal_briefing
                        
                        # 최근 시그널 20개 가져오기
                        signals = await asyncio.to_thread(get_recent_signals, 20)
                        
                        # 중복되지 않는 symbol 목록 추출
                        symbols = list(set([s.get("symbol") for s in signals if s.get("symbol")]))
                        
                        for sym in symbols:
                            cache_key = f"signal_briefing_{sym}"
                            cached = turbo_engine.get_cache(cache_key)
                            
                            if not cached:
                                print(f"[SignalPrecacheLoop] Precaching uncached signal briefing: {sym}")
                                # get_signal_briefing 내부에 AI 분석 및 캐싱 로직이 포함됨
                                await asyncio.to_thread(get_signal_briefing, sym)
                                # AI 분석이 무겁기 때문에 종목 간 15초 대기
                                await asyncio.sleep(15)
                                
                    except Exception as e:
                        print(f"[SignalPrecacheLoop] Error: {e}")
                        
                    # 1시간 대기 후 재스캔
                    await asyncio.sleep(3600)
                    
            asyncio.create_task(signal_precache_loop())
            print("[Background] signal_precache_loop task created.")
        except Exception as e:
            print(f"[Background] Error starting signal_precache_loop: {e}")
            traceback.print_exc()

        # 4. 장마감 결산 리포트 서비스 시작 (KST 15:40 / 06:10)
        try:
            from scheduler_service import start_scheduler
            start_scheduler()
        except: pass

        # 5. 공시 및 시간별 브리핑 스케줄러 시작
        try:
            from scheduler import disclosure_scheduler_loop, hourly_briefing_scheduler_loop, auto_blog_scheduler_loop, watchdog_scheduler_loop, seo_blog_scheduler_loop, google_indexer_scheduler_loop, dividend_alerts_scheduler_loop, weekly_blog_bot_scheduler_loop, weekend_report_scheduler_loop
            from ranking_calculator import ranking_calculator_loop
            
            asyncio.create_task(disclosure_scheduler_loop())
            asyncio.create_task(hourly_briefing_scheduler_loop())
            asyncio.create_task(auto_blog_scheduler_loop())
            asyncio.create_task(seo_blog_scheduler_loop())
            asyncio.create_task(watchdog_scheduler_loop())
            asyncio.create_task(google_indexer_scheduler_loop())
            asyncio.create_task(dividend_alerts_scheduler_loop())
            asyncio.create_task(weekly_blog_bot_scheduler_loop())
            asyncio.create_task(ranking_calculator_loop())
            asyncio.create_task(weekend_report_scheduler_loop())
        except Exception as e:
            print(f"Error starting schedulers: {e}")

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
async def health_check():
    return {"status": "ok", "version": "v1.0.0"}

@app.get("/api/live_events/latest")
async def get_latest_live_event():
    try:
        from firebase_admin import firestore
        db = firestore.client()
        docs = db.collection("live_events").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            if data.get('timestamp'):
                data['timestamp'] = int(data['timestamp'].timestamp() * 1000)
            return {"status": "success", "data": data}
        return {"status": "success", "data": None}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/api/blog/posts")
def get_blog_posts(page: int = 1, limit: int = 10):
    """
    Firestore blog_posts 콜렉션에서 블로그 포스트 목록을 페이지별로 반환
    Next.js 서버사이드에서 직접 Firestore 연결 실패 문제 해결
    """
    import firebase_admin
    from firebase_admin import firestore
    from google.cloud.firestore_v1 import Query

    if not firebase_admin._apps:
        return {"status": "error", "message": "Firebase not initialized", "posts": [], "total": 0, "totalPages": 0}

    try:
        db = firestore.client()
        collRef = db.collection("blog_posts")

        # 전체 카운트
        all_docs = list(collRef.stream())
        total = len(all_docs)
        totalPages = max(1, -(-total // limit))

        # 최신순 정렬 후 해당 페이지 슬라이싱
        q = collRef.order_by("createdAt", direction=Query.DESCENDING).limit(page * limit)
        docs = list(q.stream())

        start = (page - 1) * limit
        paged_docs = docs[start:start + limit]

        posts = []
        for doc in paged_docs:
            data = doc.to_dict()
            created_at = data.get("createdAt")
            if hasattr(created_at, "isoformat"):
                created_at_str = created_at.isoformat()
            else:
                created_at_str = str(created_at)
            posts.append({
                "id": doc.id,
                "title": data.get("title", "제목 없음"),
                "content": (data.get("content", ""))[:500],
                "createdAt": created_at_str,
                "tags": data.get("tags", []),
                "slug": data.get("slug", doc.id),
                "viewCount": data.get("viewCount", 0),
                "author": data.get("author", "관리자"),
            })

        return {"status": "ok", "posts": posts, "total": total, "totalPages": totalPages}
    except Exception as e:
        print(f"[Blog API] Error: {e}")
        return {"status": "error", "message": str(e), "posts": [], "total": 0, "totalPages": 0}

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
