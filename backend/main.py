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

# Initialize FastAPI
app = FastAPI(
    title="AI Stock Analyst API",
    version="v3.6.40-STABLE",
    description="최적의 안정성과 속도를 위해 모든 군더더기를 제거한 원상 복구 버전"
)

# [CORS Policy]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[Request] {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[Response] {request.method} {request.url.path} -> {response.status_code}")
    return response

# [Route Registration]
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.include_router(system_router, prefix="/api/system", tags=["System"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(market_router, prefix="/api/market", tags=["Market"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(community_router, prefix="/api", tags=["Community"])
app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(signals_router, prefix="/api", tags=["Signals"])
app.include_router(alerts_router, prefix="/api", tags=["Alerts"])
app.include_router(sockets_router, tags=["WebSocket"])

@app.on_event("startup")
async def startup_event():
    """서버 생존(Port Binding)을 최우선으로 하여 가장 쾌적하게 기동합니다."""
    print(f"\n[Startup] Nuclear Stability Mode active on PID: {os.getpid()}")
    
    # 1. 필수 DB 초기화 (비동기 처리로 부팅 속도 극대화)
    try:
        from db_manager import init_db
        await asyncio.to_thread(init_db)
    except: pass

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
            from price_alerts import price_alert_monitor, create_price_alerts_tables
            await asyncio.to_thread(create_price_alerts_tables)
            asyncio.create_task(price_alert_monitor.start())
        except: pass

        # 3. 전광판 지수 상시 정찰대 (15초마다 미리 수집하여 0초 응답 달성)
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

    asyncio.create_task(gradual_background_startup())

@app.get("/")
def read_root():
    return {"status": "success", "message": "Resilient API is Online."}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": time.time()}

if __name__ == "__main__":
    import uvicorn
    # Railway 등 배포 환경에서는 PORT 환경변수를 사용해야 함
    port = int(os.environ.get("PORT", 8000))
    # 운영 환경에서는 reload=False 권장
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
