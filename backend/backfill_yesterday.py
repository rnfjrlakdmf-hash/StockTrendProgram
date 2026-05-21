import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def run_backfill():
    print("--- Starting backfill for 2026-04-20 ---")
    try:
        from utils.global_briefing import generate_market_wide_briefing
        
        # 어제(4/20)의 대표적인 시간대들을 소급 생성합니다.
        target_hours = ["09:00:00", "15:00:00"] # 장 시작 및 장 마감 시점
        for h in target_hours:
            # 2026-04-20 KST -> UTC (9시간 차이)
            # 09:00 KST = 00:00 UTC
            # 15:00 KST = 06:00 UTC
            k_dt = datetime.strptime(f"2026-04-20 {h}", "%Y-%m-%d %H:%M:%S")
            u_dt = k_dt - timedelta(hours=9)
            target_utc = u_dt.strftime("%Y-%m-%d %H:%M:%S")
            
            print(f"Generating briefing for KST 2026-04-20 {h} (UTC {target_utc})...")
            await generate_market_wide_briefing(target_time=target_utc)
            await asyncio.sleep(2) # API 부하 방지
            
        print("SUCCESS: Backfill for 2026-04-20 completed.")
    except Exception as e:
        print(f"FAILURE: Backfill failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_backfill())
