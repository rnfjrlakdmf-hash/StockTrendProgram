import os
import time
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

# [Routers Import] - Modular v4.0
from auth import router as auth_router
from routes.market import router as market_router
from routes.analysis import router as analysis_router
from routes.community import router as community_router
from routes.user import router as user_router
from routes.system import router as system_router
from routes.sockets import router as sockets_router

# Initialize FastAPI with metadata
app = FastAPI(
    title="AI Stock Analyst API",
    version="v3.6.17-ULTRA",
    description="모듈화 및 아키텍처 최적화가 완료된 차세대 인텔리전스 백엔드"
)

# [CORS Hardening]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific domains
    allow_credentials=False, # [Fix] '*' origins cannot be used with allow_credentials=True
    allow_methods=["*"],
    allow_headers=["*"],
)

# [Route Registration]
app.include_router(system_router, prefix="/api", tags=["System"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(market_router, prefix="/api", tags=["Market"])
app.include_router(analysis_router, prefix="/api", tags=["Analysis"])
app.include_router(community_router, prefix="/api", tags=["Community"])
app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(sockets_router, tags=["WebSocket"])

# [Background Services - Non-blocking]
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 무거운 초기화 작업을 백그라운드 태스크로 분리하여 즉각적인 포트 바인딩 보장"""
    print(f"\n[Startup] Nuclear Fix 4.0 (ULTRA) Engine active on PID: {os.getpid()}")
    
    # 1. 지연 로딩 및 백그라운드 인덱싱 시작
    async def run_indexing_warmer():
        try:
            from background_indexer import background_indexer
            print("[Startup] Starting background indexer in separate task...")
            asyncio.create_task(background_indexer.run_forever())
        except Exception as e:
            print(f"[Startup Error] Indexer failed: {e}")

    # 2. 가격 알림 모니터링 시작
    async def run_price_alerts():
        try:
            from price_alerts import price_alert_monitor, create_price_alerts_tables
            print("[Startup] Initializing price alert system...")
            create_price_alerts_tables()
            price_alert_monitor.start()
        except Exception as e:
            print(f"[Startup Error] Price alert init failed: {e}")

    # 모든 무거운 작업을 비동기 태스크로 즉시 던짐 (Main Thread 해제)
    asyncio.create_task(run_indexing_warmer())
    asyncio.create_task(run_price_alerts())
    
    print("[Startup] Port mapping is now available. Zero-Wait response active.\n")

@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "AI Stock Analyst API Backend (Modular v4.0) is running.",
        "version": "v3.6.17-ULTRA"
    }

if __name__ == "__main__":
    import uvicorn
    # uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=False)
    # Railway/Local environment will handle uvicorn execution.
    pass
