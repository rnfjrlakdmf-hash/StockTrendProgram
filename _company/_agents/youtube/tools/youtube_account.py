#!/usr/bin/env python3
"""YouTube Account / Channels ??shared config for every YouTube tool.

This script doesn't fetch anything by itself. It's listed in the agent panel
so you can click ?™ï¸ once and fill in your API key, channel, watched
channels, etc. ??and every other tool will read from here.

Running it just prints a sanity-check report so you can confirm the values
are loaded correctly (without leaking the full API key)."""
import os, json, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "youtube_account.json")

def load():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    cfg = load()
    api = (cfg.get("YOUTUBE_API_KEY") or "").strip()
    masked = (api[:4] + "?? + api[-3:]) if len(api) >= 8 else ("(ë¹?ê°?" if not api else "(ì§§ìŒ)")
    print("?€?€?€ YouTube ê³„ì • / ì±„ë„ ?¤ì • ?€?€?€")
    print(f"  API ??           : {masked}")
    print(f"  ??ì±„ë„ ?¸ë“¤       : {cfg.get('MY_CHANNEL_HANDLE') or '(?†ìŒ)'}")
    print(f"  ??ì±„ë„ ID        : {cfg.get('MY_CHANNEL_ID') or '(?†ìŒ)'}")
    watched = cfg.get('WATCHED_CHANNELS') or []
    print(f"  ê°ì‹œ ì±„ë„ ({len(watched)}ê°? : {', '.join(watched) if watched else '(?†ìŒ)'}")
    competitors = cfg.get('COMPETITOR_CHANNELS') or []
    print(f"  ê²½ìŸ ì±„ë„ ({len(competitors)}ê°?: {', '.join(competitors) if competitors else '(?†ìŒ)'}")
    tg_bot = (cfg.get('TELEGRAM_BOT_TOKEN') or '').strip()
    tg_chat = (cfg.get('TELEGRAM_CHAT_ID') or '').strip()
    if tg_bot and tg_chat:
        print(f"  ?”ë ˆê·¸ë¨          : ?°ê²°??(chat {tg_chat})")
    else:
        print(f"  ?”ë ˆê·¸ë¨          : ë¯¸ì„¤??(ë³´ê³  ?Œë¦¼ ë¹„í™œ??")
    print(f"  Ollama URL        : {cfg.get('OLLAMA_URL') or 'http://127.0.0.1:11434'}")
    print(f"  ë¶„ì„ ëª¨ë¸          : {cfg.get('MODEL') or '(?ë™ ? íƒ)'}")
    if not api:
        print("\n? ï¸  API ?¤ê? ë¹„ì–´?ˆì–´?? ?¤ë¥¸ ?„êµ¬?¤ì´ ?™ì‘?˜ì? ?ŠìŠµ?ˆë‹¤.")
        print("   ë°œê¸‰: https://console.cloud.google.com/ ??YouTube Data API v3")
        sys.exit(1)
    print("\n??ê³µìœ  ?¤ì • ë¡œë“œ OK. ?¤ë¥¸ ?„êµ¬?¤ì´ ??ê°’ì„ ?ë™?¼ë¡œ ?¬ìš©?©ë‹ˆ??")

if __name__ == "__main__":
    main()
