import asyncio
import logging
import json
import os
from datetime import datetime
from kind_scraper import KindScraper
from db_manager import get_all_fcm_tokens
from firebase_config import send_multicast_notification

# Configure logging
logger = logging.getLogger(__name__)

# State File to track processed disclosures
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disclosure_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
    return {"processed_ids": []}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")

async def check_and_notify_disclosures():
    """
    Periodic task to check for new disclosures and send notifications.
    """
    logger.info("Running Disclosure Check...")
    
    scraper = KindScraper(headless=True)
    try:
        # 1. Scrape "Latest" (using "보호예수" as keyword for now, or maybe scrape ALL and filter?)
        # The scraper takes a keyword. 
        # Strategy: 
        #   - Check "보호예수" (Lock-up)
        #   - Check "전환사채" (CB) 
        #   - Check "신주인수권" (BW)
        # For efficiency, maybe just check one by one.
        
        keywords = ["보호예수", "전환사채", "신주인수권"]
        new_findings = []
        
        state = load_state()
        processed_ids = set(state.get("processed_ids", []))
        
        for kw in keywords:
            try:
                logger.info(f"Scraping keyword: {kw}")
                results = scraper.scrape_latest_disclosures(kw)
                
                for item in results:
                    # Item structure: {'no': ..., 'time': ..., 'corp_name': ..., 'title': ...}
                    # Use 'no' as unique ID
                    doc_id = str(item.get('no'))
                    
                    if doc_id and doc_id not in processed_ids:
                        # New Item Found!
                        item['keyword'] = kw
                        new_findings.append(item)
                        processed_ids.add(doc_id)
                        
                # Small delay between keywords
                await asyncio.sleep(5) 
                
            except Exception as e:
                logger.error(f"Error scraping {kw}: {e}")

        # 2. Send Notifications
        if new_findings:
            logger.info(f"Found {len(new_findings)} new disclosures.")
            
            tokens = get_all_fcm_tokens()
            if not tokens:
                logger.warning("No FCM tokens found. Skipping notification.")
            else:
                for item in new_findings:
                    # Construct Message
                    # Title: 🚨 [보호예수] 삼성전자
                    # Body: 의무보호예수 해제 공시가 등록되었습니다.
                    
                    category = item.get('keyword', '공시')
                    corp = item.get('corp_name', 'Unknown')
                    title_text = item.get('title', '')
                    
                    noti_title = f"🚨 [{category}] {corp}"
                    noti_body = f"{title_text}\n\n악재성 공시가 감지되었습니다. 리스크를 확인하세요."
                    
                    # Data payload for app navigation
                    data_payload = {
                        "type": "DISCLOSURE_ALERT",
                        "symbol": corp, # We might not have code, just name
                        "url": "/discovery" # Go to discovery or news
                    }
                    
                    logger.info(f"Sending alert: {noti_title}")
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    
                    # Prevent spamming? (Maybe group them?)
                    # For now, send individual.
                    await asyncio.sleep(1)

            # 3. Update State
            # Limit processed_ids size to prevent infinite growth (keep last 1000)
            if len(processed_ids) > 1000:
                # Convert to list, sort reverse (assuming larger ID is newer), keep top 1000
                # But ID is string 'no'. Let's trust they are somewhat sequential or just keep recent.
                # Just keep list slice.
                processed_list = list(processed_ids)[-1000:]
            else:
                processed_list = list(processed_ids)
                
            save_state({"processed_ids": processed_list})
            
        else:
            logger.info("No new disclosures found.")

    except Exception as e:
        logger.error(f"Scheduler Error: {e}")
    finally:
        scraper._close_driver()

async def disclosure_scheduler_loop():
    """
    Background loop to run the check every X minutes.
    """
    logger.info("Disclosure Scheduler Started.")
    
    # Run once on startup (optional, maybe skip to avoid restart-spam)
    # await check_and_notify_disclosures()
    
    while True:
        try:
            # Interval: 30 minutes (1800 seconds)
            # For testing: 5 minutes? Let's go with 30m for production safety.
            await asyncio.sleep(1800) 
            await check_and_notify_disclosures()
        except asyncio.CancelledError:
            logger.info("Scheduler Cancelled.")
            break
        except Exception as e:
            logger.error(f"Scheduler Loop Crash: {e}")
            await asyncio.sleep(60) # Retry after 1 min
