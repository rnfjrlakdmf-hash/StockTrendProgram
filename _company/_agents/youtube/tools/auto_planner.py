#!/usr/bin/env python3
"""Auto Planner ??runs trend_sniper.py on a fixed interval for a chosen
duration (e.g. overnight). Reads its config from auto_planner.json."""
import os, json, time, datetime, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "auto_planner.json")
SNIPER_PATH = os.path.join(HERE, "trend_sniper.py")

def load_config():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"???¤ì • ?Œì¼???½ì„ ???†ì–´?? {CONFIG_PATH}\n{e}")
        sys.exit(1)

def main():
    cfg = load_config()
    interval_h = float(cfg.get("INTERVAL_HOURS", 2))
    total_h = float(cfg.get("TOTAL_RUN_HOURS", 8))
    print(f"\n?? [?¤í†  ?Œë˜?? {total_h}?œê°„ ?™ì•ˆ {interval_h}?œê°„ë§ˆë‹¤ ?¸ë Œ??ë¶„ì„ ?¤í–‰")
    if not os.path.exists(SNIPER_PATH):
        print(f"??trend_sniper.pyë¥?ì°¾ì„ ???†ì–´?? {SNIPER_PATH}")
        sys.exit(1)
    start = time.time()
    loop = 0
    while True:
        if time.time() - start > total_h * 3600:
            print("\n?€ï¸?ëª©í‘œ ê°€???œê°„??ì±„ì› ?´ìš”. ì¢…ë£Œ?©ë‹ˆ??")
            break
        loop += 1
        ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"\n[{ts}] ?¤– {loop}?Œì°¨ ?¸ë Œ???¤ë‚˜?´í•‘")
        try:
            subprocess.run([sys.executable, SNIPER_PATH], check=False)
        except Exception as e:
            print(f"???¤í–‰ ?¤íŒ¨: {e}")
        print(f"???¤ìŒ ?¤í–‰: {interval_h}?œê°„ ??)
        time.sleep(interval_h * 3600)

if __name__ == "__main__":
    main()
