import asyncio
import time
import logging
from stock_data import GLOBAL_KOREAN_NAMES

class BackgroundIndexer:
    def __init__(self):
        self.is_running = False
        self.last_run = 0
        self.status = "INITIALIZING"
        self.indexed_count = 0

    async def run_forever(self):
        print("[BackgroundIndexer] Starting global stock indexing service...")
        self.is_running = True
        self.status = "RUNNING"
        
        while self.is_running:
            try:
                # In a real scenario, this would crawl or update a database.
                # For now, it ensures the mapping is warm and system is ready.
                self.last_run = time.time()
                self.indexed_count = len(GLOBAL_KOREAN_NAMES)
                
                # Sleep for a while before next scan (e.g., 1 hour)
                await asyncio.sleep(3600) 
            except Exception as e:
                print(f"[BackgroundIndexer] Error: {e}")
                await asyncio.sleep(60)

    def get_status(self):
        return {
            "status": self.status,
            "last_run": self.last_run,
            "indexed_stocks": self.indexed_count
        }

background_indexer = BackgroundIndexer()
