import os
import time
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional

# [Routers Import]
from auth import router as auth_router
from routes.market import router as market_router
from routes.analysis import router as analysis_router
from routes.community import router as community_router
from routes.user import router as user_router
from routes.system import router as system_router
from routes.sockets import router as sockets_router

# Initialize FastAPI
app = FastAPI(
    title="AI Stock Analyst API",
    version="v3.6.21-PREMIUM-STABLE",
    description="24/7 무인 가동 및 정밀 데이터 소급 로우가 탑재된 프리미엄 안정화 백엔드"
)

# [CORS Hardening]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stock-trend-program.vercel.app",
        "https://stock-trend-program-git-main-rnfjrlakdmf-hash.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
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

@app.on_event("startup")
async def startup_event():
    """서버 안정성을 위해 무거운 작업들을 전체 가동 20초 후로 지연 실행하며, 24/7 생존 로직을 가동합니다."""
    print(f"\n[Startup] v3.6.32-DB-HOTFIX Engine active on PID: {os.getpid()}")
    
    # [Hotfix] Ensure DB schemas exist since we removed stock_app.db from git
    # Using to_thread to prevent blocking the event loop during initial DB connection
    try:
        from db_manager import init_db
        from utils.briefing_store import init_briefing_table
        await asyncio.to_thread(init_db)
        await asyncio.to_thread(init_briefing_table)
        print("[Startup] Database schemas successfully initialized.")
    except Exception as e:
        print(f"[Startup Error] DB Init: {e}")

    async def delayed_startup_sequence():
        # 1. 서버가 외부에 먼저 응답할 수 있도록 20초 대기
        await asyncio.sleep(20)
        print("[Delayed-Startup] Starting background services...")
        
        # 1.1 배경 인덱서 로드
        try:
            from background_indexer import background_indexer
            asyncio.create_task(background_indexer.run_forever())
            print("[Delayed-Startup] Background indexer active.")
        except Exception as e:
            print(f"[Startup Error] Indexer: {e}")

        # 1.2 가격 알림 모니터링 로드
        try:
            from price_alerts import price_alert_monitor, create_price_alerts_tables
            create_price_alerts_tables() # Re-check tables
            asyncio.create_task(price_alert_monitor.start())
            print("[Delayed-Startup] Price alert system active.")
        except Exception as e:
            print(f"[Startup Error] Price Alerts: {e}")
            
        # 1.3 스케줄러 루프 활성화
        try:
            from scheduler import hourly_briefing_scheduler_loop
            asyncio.create_task(hourly_briefing_scheduler_loop())
            print("[Delayed-Startup] Hourly scheduler active.")
        except Exception as e:
            print(f"[Startup Error] Scheduler: {e}")

        # 1.4 [24/7 생존 로직] Self-Ping
        async def self_ping_loop(url: str):
            """서버가 잠들지 않도록 24시간 심장박동 신호를 보냅니다 (v3.6.31-ULTRA-STABLE-FINAL 무인 가동 보장)"""
            import aiohttp
            import logging
            logger = logging.getLogger("uvicorn")
            logger.info(f"[Self-Ping] Heartbeat initializing for: {url}")
            while True:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{url}/health") as resp:
                            if resp.status == 200:
                                logger.info(f"[Self-Ping] Heartbeat OK - 24/7 Autonomous Market Tracker is ACTIVE (v3.6.31)")
                            else:
                                logger.warning(f"[Self-Ping] Abnormal response: {resp.status}")
                except Exception as e:
                    logger.error(f"[Self-Ping] Heartbeat missed: {e}")
                await asyncio.sleep(600)  # 10분마다 생존 신호 전송

        asyncio.create_task(self_ping_loop("https://stocktrendprogram-production.up.railway.app/api"))

    # 지연 실행 태스크 시작
    asyncio.create_task(delayed_startup_sequence())
    print("[Startup] Fast-Port-Binding enabled. v3.6.28-NUCLEAR-FIX API is ready for requests.\n")

@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "AI Stock Analyst API (Premium v3.6.28-NUCLEAR-FIX) is running.",
        "version": "v3.6.28-NUCLEAR-FIX"
    }

if __name__ == "__main__":
    import uvicorn
    # uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=False)
    pass
