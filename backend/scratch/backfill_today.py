import asyncio
import sys
import os
from datetime import datetime, timedelta
import pytz

# backend 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.global_briefing import generate_market_wide_briefing

async def backfill_today():
    kst = pytz.timezone('Asia/Seoul')
    now_kst = datetime.now(kst)
    today_date = now_kst.strftime("%Y-%m-%d")
    
    print(f"[Backfill-Today] Starting recovery for {today_date}...")
    
    # 00시부터 현재 시각(시간 단위)까지 루프
    # 현재가 14:48이면 0시~14시까지 생성
    current_hour = now_kst.hour
    
    for h in range(current_hour + 1):
        target_dt = kst.localize(datetime(now_kst.year, now_kst.month, now_kst.day, h, 0, 0))
        target_iso = target_dt.isoformat()
        
        print(f"[Backfill-Today] Generating briefing for {target_iso}...")
        try:
            # global_briefing.py의 generate_market_wide_briefing은 target_time이 있으면 해당 시점으로 저장함
            result = await generate_market_wide_briefing(target_time=target_iso)
            if result:
                print(f"[Backfill-Today] Successfully generated {h:02}:00 briefing.")
            else:
                print(f"[Backfill-Today] Failed to generate {h:02}:00 briefing.")
        except Exception as e:
            print(f"[Backfill-Today] Error at hour {h}: {e}")
            
    print("[Backfill-Today] Backfilling completed for today.")

if __name__ == "__main__":
    asyncio.run(backfill_today())
