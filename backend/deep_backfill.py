import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def run_deep_backfill():
    print("--- Starting DEEP backfill (4/15 - 4/19) ---")
    try:
        from utils.global_briefing import generate_market_wide_briefing
        
        # 4월 15일부터 19일까지의 날짜 리스트
        dates = ["2026-04-15", "2026-04-16", "2026-04-17", "2026-04-18", "2026-04-19"]
        # 매일 장 시작(09:00)과 장 마감(15:00) 시점의 기록을 생성합니다.
        target_hours = ["09:00:00", "15:00:00"]
        
        for d_str in dates:
            for h in target_hours:
                # KST to UTC conversion (KST - 9h)
                k_dt = datetime.strptime(f"{d_str} {h}", "%Y-%m-%d %H:%M:%S")
                u_dt = k_dt - timedelta(hours=9)
                target_utc = u_dt.strftime("%Y-%m-%d %H:%M:%S")
                
                print(f"Generating for KST {d_str} {h} (UTC {target_utc})...")
                await generate_market_wide_briefing(target_time=target_utc)
                await asyncio.sleep(5) # AI Quota 및 부하 방지
            
        print("SUCCESS: 1-week deep backfill completed.")
    except Exception as e:
        print(f"FAILURE: Deep backfill failed: {e}")

if __name__ == "__main__":
    # Ensure UTF-8 printing on Windows
    # (이미 PYTHONUTF8=1 환경에서 실행될 것이지만 코드에서도 보장)
    asyncio.run(run_deep_backfill())
