#!/usr/bin/env python3
"""Channel Full Analysis ??comprehensive overview of your YouTube channel.

Input: just YOUTUBE_API_KEY + MY_CHANNEL_ID/HANDLE from youtube_account.json.
No additional config needed. Output: full report with stats, patterns, and
data-driven recommendations.
"""
import os, json, sys, time, datetime, statistics, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = os.path.join(HERE, "youtube_account.json")
REPORT  = os.path.join(HERE, "channel_full_analysis_report.md")

def _load(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def _resolve_channel_id(youtube, handle, channel_id):
    if channel_id:
        return channel_id
    if not handle:
        return None
    h = handle.lstrip("@")
    try:
        r = youtube.search().list(part="snippet", q=h, type="channel", maxResults=1).execute()
        items = r.get("items", [])
        if items:
            return items[0]["snippet"]["channelId"]
    except Exception as e:
        print(f"? ï¸  ì±„ë„ ID ì¡°íšŒ ?¤íŒ¨: {e}")
    return None

def _parse_iso_duration(d):
    """ISO 8601 duration (PT4M30S) ??seconds."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    if not m: return 0
    h, mi, s = m.groups()
    return int(h or 0) * 3600 + int(mi or 0) * 60 + int(s or 0)

def _fmt_duration(sec):
    if sec < 60: return f"{sec}s"
    if sec < 3600: return f"{sec//60}m {sec%60}s"
    return f"{sec//3600}h {(sec%3600)//60}m"

def _resolve_telegram(account):
    """Same fallback chain as my_videos_check.py."""
    import json as _json
    token = (account.get("TELEGRAM_BOT_TOKEN") or "").strip()
    chat  = (account.get("TELEGRAM_CHAT_ID") or "").strip()
    if token and chat:
        return token, chat
    brain_root = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
    sec_json = os.path.join(brain_root, "_agents", "secretary", "tools", "telegram_setup.json")
    if (not token or not chat) and os.path.exists(sec_json):
        try:
            with open(sec_json, "r", encoding="utf-8") as f:
                cfg = _json.load(f)
            if not token: token = (cfg.get("TELEGRAM_BOT_TOKEN") or "").strip()
            if not chat:  chat  = (cfg.get("TELEGRAM_CHAT_ID") or "").strip()
        except Exception:
            pass
    return token, chat

def _push_telegram(account, text):
    token, chat = _resolve_telegram(account)
    if not token or not chat:
        return
    try:
        import requests
        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat, "text": text, "parse_mode": "Markdown"},
            timeout=10,
        )
        print("?“¨ ?”ë ˆê·¸ë¨?¼ë¡œ ë³´ê³  ?„ì†¡")
    except Exception as e:
        print(f"? ï¸  ?”ë ˆê·¸ë¨ ?„ì†¡ ?¤íŒ¨: {e}")

def main():
    if not os.path.exists(ACCOUNT):
        print("??youtube_account.json???†ì–´?? ?¸ë? ?°ê²° ?¨ë„?ì„œ YouTube API ?¤ì? ì±„ë„ ID ?…ë ¥?´ì£¼?¸ìš”.")
        sys.exit(1)
    acct = _load(ACCOUNT)
    api_key = (acct.get("YOUTUBE_API_KEY") or "").strip()
    handle  = (acct.get("MY_CHANNEL_HANDLE") or "").strip()
    chan_id = (acct.get("MY_CHANNEL_ID") or "").strip()
    if not api_key:
        print("??YOUTUBE_API_KEYê°€ ë¹„ì–´?ˆì–´?? ?¸ë? ?°ê²° ?¨ë„ ??YouTube Data API ì¹´ë“œ???…ë ¥?´ì£¼?¸ìš”.")
        sys.exit(1)
    if not (handle or chan_id):
        print("??MY_CHANNEL_HANDLE ?ëŠ” MY_CHANNEL_ID ?„ìš”. ?¸ë? ?°ê²° ?¨ë„ ??ì±„ë„ ID ?…ë ¥?´ì£¼?¸ìš”.")
        sys.exit(1)

    try:
        from googleapiclient.discovery import build
    except ImportError:
        print("??google-api-python-client ë¯¸ì„¤ì¹?")
        print("   ?°ë??ì—????ì¤? pip3 install google-api-python-client requests")
        sys.exit(1)
    youtube = build("youtube", "v3", developerKey=api_key)

    cid = _resolve_channel_id(youtube, handle, chan_id)
    if not cid:
        print("??ì±„ë„ IDë¥?ì°¾ì? ëª»í–ˆ?´ìš”. ?¸ë? ?°ê²° ?¨ë„??ì±„ë„ ID ?•ì¸.")
        sys.exit(1)

    print(f"?“ˆ [ì±„ë„ ?„ì „ ë¶„ì„] ì±„ë„ {handle or cid} ë¶„ì„ ì¤?..")
    print()

    # 1. ì±„ë„ ë©”í?
    ch = youtube.channels().list(part="snippet,statistics,brandingSettings", id=cid).execute()
    if not ch.get("items"):
        print("??ì±„ë„ ?°ì´?°ë? ê°€?¸ì˜¤ì§€ ëª»í–ˆ?´ìš”. API ?¤Â·í• ?¹ëŸ‰ ?•ì¸.")
        sys.exit(1)
    c = ch["items"][0]
    sn = c.get("snippet", {})
    st = c.get("statistics", {})
    title = sn.get("title", "(?´ë¦„ ?†ìŒ)")
    subs = int(st.get("subscriberCount", 0))
    total_views = int(st.get("viewCount", 0))
    video_count = int(st.get("videoCount", 0))
    pub_at = sn.get("publishedAt", "")[:10]

    print("?€?€?€ 1. ì±„ë„ ê°œìš” ?€?€?€")
    print(f"  ì±„ë„: {title}")
    print(f"  ?¸ë“¤: {sn.get('customUrl', handle or '(?†ìŒ)')}")
    print(f"  êµ¬ë…?? {subs:,}ëª?)
    print(f"  ì´?ì¡°íšŒ?? {total_views:,}??)
    print(f"  ?…ë¡œ???ìƒ: {video_count}ê°?)
    print(f"  ì±„ë„ ê°€?? {pub_at}")
    avg_per_video = total_views // max(1, video_count)
    print(f"  ?ìƒ???‰ê·  ì¡°íšŒ: {avg_per_video:,}??)
    print()

    # 2. ìµœê·¼ 30???ìƒ ë¶„ì„ (uploads playlist ?¬ìš© ??searchë³´ë‹¤ quota ?ˆì•½)
    uploads = c.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads") if "contentDetails" in c else None
    if not uploads:
        # contentDetails ?†ìœ¼ë©?searchë¡??´ë°±
        cd = youtube.channels().list(part="contentDetails", id=cid).execute()
        if cd.get("items"):
            uploads = cd["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
    recent_video_ids = []
    if uploads:
        next_token = None
        while len(recent_video_ids) < 50:
            args = {"part": "snippet,contentDetails", "playlistId": uploads, "maxResults": 50}
            if next_token: args["pageToken"] = next_token
            pi = youtube.playlistItems().list(**args).execute()
            for item in pi.get("items", []):
                pub = item["snippet"]["publishedAt"]
                pub_dt = datetime.datetime.fromisoformat(pub.replace("Z", "+00:00"))
                if pub_dt < cutoff:
                    break
                recent_video_ids.append(item["contentDetails"]["videoId"])
            next_token = pi.get("nextPageToken")
            if not next_token: break
            if recent_video_ids and datetime.datetime.fromisoformat(pi["items"][-1]["snippet"]["publishedAt"].replace("Z", "+00:00")) < cutoff:
                break

    if not recent_video_ids:
        print("? ï¸  ìµœê·¼ 30???™ì•ˆ ?…ë¡œ?œí•œ ?ìƒ???†ì–´?? ?ìƒ ?…ë¡œ?????¤ì‹œ ë¶„ì„?´ì£¼?¸ìš”.")
        sys.exit(0)

    # 3. ?ìƒë³??µê³„ (50ê°œì”© ?˜ëˆ ??
    all_vids = []
    for i in range(0, len(recent_video_ids), 50):
        chunk = recent_video_ids[i:i+50]
        st_resp = youtube.videos().list(part="snippet,statistics,contentDetails", id=",".join(chunk)).execute()
        for v in st_resp.get("items", []):
            stats = v.get("statistics", {})
            sn_v = v.get("snippet", {})
            cd_v = v.get("contentDetails", {})
            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))
            duration_sec = _parse_iso_duration(cd_v.get("duration", ""))
            pub = sn_v.get("publishedAt", "")
            pub_dt = datetime.datetime.fromisoformat(pub.replace("Z", "+00:00"))
            all_vids.append({
                "id": v["id"],
                "title": sn_v.get("title", ""),
                "views": views,
                "likes": likes,
                "comments": comments,
                "duration_sec": duration_sec,
                "pub_dt": pub_dt,
                "engagement_rate": (likes + comments) / views if views > 0 else 0,
            })

    all_vids.sort(key=lambda x: x["views"], reverse=True)
    views_list = [v["views"] for v in all_vids]
    median_views = statistics.median(views_list) if views_list else 0
    mean_views = statistics.mean(views_list) if views_list else 0

    print("?€?€?€ 2. ìµœê·¼ 30???…ë¡œ???¨í„´ ?€?€?€")
    print(f"  ?…ë¡œ???Ÿìˆ˜: {len(all_vids)}ê°?(?”í‰ê·?{len(all_vids):.1f}ê°?")
    weekday_counts = Counter(v["pub_dt"].strftime("%A") for v in all_vids)
    weekday_kr = {"Monday":"??,"Tuesday":"??,"Wednesday":"??,"Thursday":"ëª?,"Friday":"ê¸?,"Saturday":"??,"Sunday":"??}
    top_day = weekday_counts.most_common(1)
    if top_day:
        print(f"  ì£¼ë¡œ ?…ë¡œ?œí•œ ?”ì¼: {weekday_kr.get(top_day[0][0], top_day[0][0])}?”ì¼ ({top_day[0][1]}??")
    avg_duration = sum(v["duration_sec"] for v in all_vids) / len(all_vids)
    print(f"  ?‰ê·  ?ìƒ ê¸¸ì´: {_fmt_duration(int(avg_duration))}")
    print()

    print("?€?€?€ 3. ?±ê³¼ ?µê³„ ?€?€?€")
    print(f"  ì¤‘ê°„ê°?ì¡°íšŒ?? {int(median_views):,}??)
    print(f"  ?‰ê·  ì¡°íšŒ?? {int(mean_views):,}??)
    avg_eng = sum(v["engagement_rate"] for v in all_vids) / len(all_vids) * 100 if all_vids else 0
    print(f"  ?‰ê·  ì°¸ì—¬??(ì¢‹ì•„???“ê?)/ì¡°íšŒ: {avg_eng:.2f}%")
    print()

    # ?¡ìƒ / ë¶€ì§?ë¶„ë¥˜
    hot = [v for v in all_vids if v["views"] >= median_views * 1.5]
    cold = [v for v in all_vids if v["views"] < median_views * 0.5]

    print("?€?€?€ 4. ?”¥ ?¡ìƒ ?ìƒ (ì¤‘ê°„ê°?Ã— 1.5 ?´ìƒ) ?€?€?€")
    if not hot:
        print("  (?†ìŒ ??ëª¨ë“  ?ìƒ???‰ê·  ê·¼ì²˜)")
    else:
        for v in hot[:5]:
            print(f"  ?”¥ {v['views']:>8,}??Â· ì°¸ì—¬ {v['engagement_rate']*100:.2f}% Â· {_fmt_duration(v['duration_sec'])} Â· {v['title'][:50]}")
    print()

    print("?€?€?€ 5. ?¥¶ ë¶€ì§??ìƒ (ì¤‘ê°„ê°?Ã— 0.5 ë¯¸ë§Œ) ?€?€?€")
    if not cold:
        print("  (?†ìŒ ??ëª¨ë“  ?ìƒ???‰ê·  ê·¼ì²˜)")
    else:
        for v in cold[:5]:
            print(f"  ?¥¶ {v['views']:>8,}??Â· ì°¸ì—¬ {v['engagement_rate']*100:.2f}% Â· {_fmt_duration(v['duration_sec'])} Â· {v['title'][:50]}")
    print()

    # 6. ?¨í„´ ë¹„êµ ???¡ìƒ vs ë¶€ì§„ì˜ ì°¨ì´
    print("?€?€?€ 6. ?¡ìƒ vs ë¶€ì§????¨í„´ ë¹„êµ ?€?€?€")
    if hot and cold:
        hot_avg_dur = sum(v["duration_sec"] for v in hot) / len(hot)
        cold_avg_dur = sum(v["duration_sec"] for v in cold) / len(cold)
        hot_avg_title = sum(len(v["title"]) for v in hot) / len(hot)
        cold_avg_title = sum(len(v["title"]) for v in cold) / len(cold)
        print(f"  ?¡ìƒ ?ìƒ ?‰ê·  ê¸¸ì´: {_fmt_duration(int(hot_avg_dur))}")
        print(f"  ë¶€ì§??ìƒ ?‰ê·  ê¸¸ì´: {_fmt_duration(int(cold_avg_dur))}")
        if abs(hot_avg_dur - cold_avg_dur) > 60:
            longer = "?¡ìƒ" if hot_avg_dur > cold_avg_dur else "ë¶€ì§?
            print(f"  ??{longer} ?ìƒ???‰ê·  {abs(int(hot_avg_dur - cold_avg_dur))}ì´???ê¸¸ì–´??)
        print(f"  ?¡ìƒ ?ìƒ ?‰ê·  ?œëª© ê¸¸ì´: {hot_avg_title:.0f}??)
        print(f"  ë¶€ì§??ìƒ ?‰ê·  ?œëª© ê¸¸ì´: {cold_avg_title:.0f}??)
    else:
        print("  (?¡ìƒ ?ëŠ” ë¶€ì§??°ì´??ë¶€ì¡????ìƒ?????“ì´ë©??¤ì‹œ ë¶„ì„)")
    print()

    # 7. ?ë™ ì¶”ì²œ (LLM ?†ì´ ?°ì´?°ë§Œ?¼ë¡œ)
    print("?€?€?€ 7. ?§­ ?¤ìŒ ?¡ì…˜ ì¶”ì²œ (?°ì´??ê¸°ë°˜) ?€?€?€")
    actions = []
    if hot:
        actions.append(f"?”¥ ?¡ìƒ??{len(hot)}ê°??ìƒ???œëª©Â·?„í¬ ?¨í„´???¤ìŒ ?ìƒ???ìš© ??ê°€???????„í¬??\"{hot[0]['title'][:50]}\"")
    if cold:
        actions.append(f"?¥¶ ë¶€ì§„í•œ {len(cold)}ê°œëŠ” ?¸ë„¤??A/B ?ŒìŠ¤???ëŠ” ?œëª© ë¦¬ë„¤?´ë° ?„ë³´")
    if avg_eng < 2.0:
        actions.append(f"?’— ?‰ê·  ì°¸ì—¬??{avg_eng:.2f}% ???ìƒ ?ì— ëª…í™•??CTA(ì¢‹ì•„?”Â·êµ¬?? ì¶”ê? ì¶”ì²œ (ë³´í†µ 3% ?´ìƒ??ê±´ê°•??")
    elif avg_eng > 5.0:
        actions.append(f"?’— ì°¸ì—¬??{avg_eng:.2f}% ??ë§¤ìš° ì¢‹ìŒ. ?œì²­?ì? ê°•í•œ ?°ê²° êµ¬ì¶•?? ?í’ˆÂ·ë©¤ë²„???„ì… ê³ ë ¤ ?œì ")
    if len(all_vids) < 4:
        actions.append("?“… ??4ê°?ë¯¸ë§Œ ?…ë¡œ?????Œê³ ë¦¬ì¦˜ ?¸ì¶œ ?„í•´ ìµœì†Œ ì£?1??ê¶Œì¥")
    elif len(all_vids) > 12:
        actions.append("?“… ??12ê°??´ìƒ ?…ë¡œ?????‘ì? ì¶©ë¶„, ?ìƒë³??ˆì§ˆÂ·?„í¬??ì§‘ì¤‘ ì¶”ì²œ")
    if not actions:
        actions.append("??ì±„ë„ ?íƒœ ?ˆì •?????„ì¬ ?¨í„´ ? ì??˜ë©° ?œì²­???“ê??ì„œ ?¤ìŒ ì½˜í…ì¸??„ì´?”ì–´ ?˜ì§‘")
    for a in actions:
        print(f"  ??{a}")
    print()

    # 8. ë³´ê³ ??.md ?€??    summary_lines = [
        f"# ?“ˆ ì±„ë„ ?„ì „ ë¶„ì„ ??{time.strftime('%Y-%m-%d %H:%M')}",
        f"ì±„ë„: **{title}** Â· êµ¬ë…??**{subs:,}** Â· ?ìƒ **{video_count}**ê°?,
        "",
        "## ìµœê·¼ 30???µê³„",
        f"- ?…ë¡œ?? {len(all_vids)}ê°?,
        f"- ì¡°íšŒ??ì¤‘ê°„ê°? **{int(median_views):,}**",
        f"- ?‰ê·  ì°¸ì—¬?? **{avg_eng:.2f}%**",
        f"- ?‰ê·  ?ìƒ ê¸¸ì´: **{_fmt_duration(int(avg_duration))}**",
        "",
        f"## ?”¥ ?¡ìƒ ?ìƒ ({len(hot)}ê°?",
    ]
    for v in hot[:5]:
        summary_lines.append(f"- {v['views']:,}??Â· {v['title']}")
    summary_lines.append(f"\n## ?¥¶ ë¶€ì§??ìƒ ({len(cold)}ê°?")
    for v in cold[:5]:
        summary_lines.append(f"- {v['views']:,}??Â· {v['title']}")
    summary_lines.append("\n## ?§­ ?¤ìŒ ?¡ì…˜ (?ë™ ì¶”ì²œ)")
    for a in actions:
        summary_lines.append(f"- {a}")

    summary = "\n".join(summary_lines)
    with open(REPORT, "a", encoding="utf-8") as f:
        f.write("\n\n" + summary + "\n\n---\n")
    print(f"??ë³´ê³ ?? {REPORT}")
    _push_telegram(acct, summary)

if __name__ == "__main__":
    main()
