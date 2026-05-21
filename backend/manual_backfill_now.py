import asyncio
import pytz
from datetime import datetime, timedelta
import sys
import os

# 백엔드 경로 추가
sys.path.append(r"c:\Users\rnfjr\StockTrendProgram\backend")

from utils.global_briefing import generate_market_wide_briefing
from utils.briefing_store import has_system_briefing_for_hour

async def run_backfill():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    print(f"[ManualBackfill] Starting for {now.strftime('%Y-%m-%d %H:%M:%S')} KST")
    
    # 오늘(17일) 00시부터 현재 시각까지의 정각 데이터가 있는지 확인하고 없으면 생성
    for h_offset in range(24):
        target_time = now - timedelta(hours=h_offset)
        # 오늘 날짜만 처리
        if target_time.strftime("%Y-%m-%d") != '2026-04-17':
            continue
            
        t_date = target_time.strftime("%Y-%m-%d")
        t_hour = target_time.hour
        
        if not has_system_briefing_for_hour(t_date, t_hour):
            target_time_utc = (target_time - timedelta(hours=9)).strftime("%Y-%m-%d %H:00:00")
            print(f"[ManualBackfill] Filling GAP at {t_date} {t_hour}:00 KST...")
            await generate_market_wide_briefing(target_time=target_time_utc)
            await asyncio.sleep(2) # API 부하 방지
        else:
            print(f"[ManualBackfill] Slot {t_hour}:00 already exists. Skipping.")

if __name__ == "__main__":
    asyncio.run(run_backfill())
