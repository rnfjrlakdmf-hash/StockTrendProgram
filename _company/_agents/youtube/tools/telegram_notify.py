#!/usr/bin/env python3
"""Telegram Notify ??small wrapper that sends a message to your Telegram bot.

Two modes:
  1. No CLI arg ??sends a connectivity test ("???”ë ˆê·¸ë¨ ?°ê²° ?•ìƒ").
  2. With CLI arg(s) ??sends those as the message body. Other tools can call
     this script to push their summaries.

telegram_v3 ??Secretary's tools/telegram_setup.json is the canonical
UI-managed home (input via Skills ?™ï¸). Falls back to legacy config.md
and finally to youtube_account.json so older setups keep working."""
import os, json, sys, time, re

HERE = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = os.path.join(HERE, "youtube_account.json")
# tools/ ??youtube/ ??_agents/ ??brain root
BRAIN_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SECRETARY_TOOL_JSON = os.path.join(BRAIN_ROOT, "_agents", "secretary", "tools", "telegram_setup.json")
SECRETARY_CFG = os.path.join(BRAIN_ROOT, "_agents", "secretary", "config.md")

def _resolve_telegram():
    """Secretary tool JSON > Secretary legacy md > youtube_account.json."""
    token, chat = "", ""
    if os.path.exists(SECRETARY_TOOL_JSON):
        try:
            with open(SECRETARY_TOOL_JSON, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            token = (cfg.get("TELEGRAM_BOT_TOKEN") or "").strip()
            chat  = (cfg.get("TELEGRAM_CHAT_ID") or "").strip()
        except Exception:
            pass
    if (not token or not chat) and os.path.exists(SECRETARY_CFG):
        try:
            with open(SECRETARY_CFG, "r", encoding="utf-8") as f:
                txt = f.read()
            if not token:
                m = re.search(r"TELEGRAM_BOT_TOKEN\s*[:ï¼?]\s*([A-Za-z0-9:_\-]+)", txt)
                if m: token = m.group(1).strip()
            if not chat:
                m = re.search(r"TELEGRAM_CHAT_ID\s*[:ï¼?]\s*(-?\d+)", txt)
                if m: chat = m.group(1).strip()
        except Exception:
            pass
    if (not token or not chat) and os.path.exists(ACCOUNT):
        try:
            with open(ACCOUNT, "r", encoding="utf-8") as f:
                acct = json.load(f)
            if not token: token = (acct.get("TELEGRAM_BOT_TOKEN") or "").strip()
            if not chat:  chat  = (acct.get("TELEGRAM_CHAT_ID") or "").strip()
        except Exception:
            pass
    return token, chat

def main():
    token, chat = _resolve_telegram()
    if not token or not chat:
        print("??TELEGRAM_BOT_TOKEN ?ëŠ” TELEGRAM_CHAT_IDë¥?ëª?ì°¾ì•˜?´ìš”.")
        print("   ê¶Œì¥: ë¹„ì„œ(Secretary) ?´ë¦­ ??Skills ???“¨ ?”ë ˆê·¸ë¨ ?°ê²° ?™ï¸ ???¼ì— ?…ë ¥")
        print("   ë´?ë§Œë“¤ê¸? Telegram ??@BotFather ??/newbot")
        print("   chat_id: ë´‡ì— ë©”ì‹œì§€ 1????https://api.telegram.org/bot<TOKEN>/getUpdates ?ì„œ chat.id ?•ì¸")
        sys.exit(1)

    if len(sys.argv) > 1:
        body = " ".join(sys.argv[1:])
    else:
        body = f"???”ë ˆê·¸ë¨ ?°ê²° ?•ìƒ ??{time.strftime('%Y-%m-%d %H:%M:%S')}\n\në¹„ì„œ(Secretary) ?ëŠ” YouTube ?„êµ¬ê°€ ??ì±„ë„ë¡?ë³´ê³ ë¥?ë³´ë‚¼ ???ˆìŠµ?ˆë‹¤."

    try:
        import requests
    except ImportError:
        print("??pip install requests")
        sys.exit(1)
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat, "text": body, "parse_mode": "Markdown"},
            timeout=15,
        )
        r.raise_for_status()
        print(f"???„ì†¡ OK ({len(body)}??")
    except Exception as e:
        print(f"???„ì†¡ ?¤íŒ¨: {e}")
        if "Bad Request" in str(e):
            print("   chat_idê°€ ?•í™•?œì?, ë´‡ê³¼ ??ë²ˆì´?¼ë„ ?€?”ë? ?œì‘?ˆëŠ”ì§€ ?•ì¸?˜ì„¸??")
        sys.exit(1)

if __name__ == "__main__":
    main()
