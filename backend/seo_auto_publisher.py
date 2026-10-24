# -*- coding: utf-8 -*-
"""
구글(Google)·네이버(Naver)·빙(Bing) 100% 무인 자동 SEO 색인 알림 엔진
- 대표이사 집무실(/ceo-office)의 기밀 결재 기안서는 외부에 절대 유출하지 않고 대표님만 열람할 수 있도록 철저히 보호합니다.
- 대신 일반 방문자용 공개 페이지(메인 대시보드, 전 종목 디렉토리, 공개 테마 페이지, 공개 종목 시세 페이지, 투자 가이드 46선)만
  IndexNow API를 통해 검색엔진 로봇에게 자동 색인 요청하여 자연 검색 유입을 극대화합니다.
"""
import os
import json
import time
import threading
import logging
from datetime import datetime
from typing import List, Dict, Any

import requests

logger = logging.getLogger(__name__)

SITE_HOST = "stock-trend-program.co.kr"
SITE_URL = f"https://{SITE_HOST}"
INDEXNOW_KEY = "d1a5029178414151d0fd99a83053ce16"

STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo_auto_state.json")

PUBLIC_SEO_TICKERS = [
    "005930", "000660", "034020", "010140", "042660", "329180", "003490", "012450",
    "373220", "006400", "051910", "035420", "035720", "005380", "000270", "207940",
    "068270", "028300", "042700", "055550", "105560", "NVDA", "TSLA", "AAPL",
    "MSFT", "GOOGL", "AMZN", "META", "AVGO", "AMD", "PLTR",
]


def _load_seo_state() -> Dict[str, Any]:
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_published_date": "", "last_ping_time": 0, "published_slugs": [], "ping_count": 0}


def _save_seo_state(state: Dict[str, Any]) -> None:
    try:
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[SEO Auto] Failed to save state: {e}")


def ping_search_engines(urls: List[str]) -> Dict[str, Any]:
    """
    IndexNow 프로토콜(네이버·빙·구글 호환 서치엔진 즉시 색인 알림) 호출
    ※ /ceo-office 등 대표님 전용 보안 경로는 절대 포함하지 않습니다.
    """
    safe_urls = [u for u in urls if "/ceo-office" not in u and "/admin" not in u]
    if not safe_urls:
        return {"status": "skipped", "count": 0}

    unique_urls = list(dict.fromkeys(safe_urls))[:100]
    payload = {
        "host": SITE_HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "urlList": unique_urls,
    }
    results = {}
    endpoints = [
        ("IndexNow Global", "https://api.indexnow.org/indexnow"),
        ("Naver SearchAdvisor IndexNow", "https://searchadvisor.naver.com/indexnow"),
        ("Bing IndexNow", "https://www.bing.com/indexnow"),
    ]
    for name, ep in endpoints:
        try:
            r = requests.post(
                ep,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                timeout=5,
            )
            results[name] = r.status_code
        except Exception as e:
            results[name] = str(e)

    return {"status": "ok", "submitted_urls": len(unique_urls), "results": results}


def auto_publish_daily_seo_from_approvals(auto_approvals: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    [대표님 기밀 보호 적용]
    - 대표이사 집무실의 기안서 원문은 외부 블로그에 절대 발행하지 않으며, 혹시 이전에 생성된 기안서 요약글이 있다면 즉시 삭제합니다.
    - 오직 일반 공개 페이지(/, /directory, /research, /guide/*, /stock/*)만 검색엔진에 색인 핑을 전송합니다.
    """
    now = datetime.now()
    today_str = now.strftime("%Y%m%d")

    # 이전에 생성되었을 수 있는 기안서 요약 블로그 글 삭제 (기안서 기밀 유지)
    try:
        import firebase_admin
        from firebase_admin import firestore
        from firebase_config import initialize_firebase

        initialize_firebase()
        if firebase_admin._apps:
            db = firestore.client()
            old_slug = f"{today_str}-daily-research-target-price-report"
            db.collection("blog_posts").document(old_slug).delete()
    except Exception:
        pass

    state = _load_seo_state()
    if state.get("last_published_date") == today_str:
        return {"status": "already_pinged_today", "date": today_str}

    # 공개 페이지 URL만 검색엔진에 색인 요청 (/ceo-office 절대 제외)
    urls_to_ping = [
        f"{SITE_URL}/",
        f"{SITE_URL}/directory",
        f"{SITE_URL}/research",
        f"{SITE_URL}/theme",
        f"{SITE_URL}/guide",
        f"{SITE_URL}/blog",
        f"{SITE_URL}/theory",
        f"{SITE_URL}/signals",
        f"{SITE_URL}/discovery",
        f"{SITE_URL}/sitemap.xml",
        f"{SITE_URL}/rss.xml",
    ]
    for ticker in PUBLIC_SEO_TICKERS:
        urls_to_ping.append(f"{SITE_URL}/stock/{ticker}")

    ping_res = ping_search_engines(urls_to_ping)

    state["last_published_date"] = today_str
    state["last_ping_time"] = int(time.time())
    state["ping_count"] = int(state.get("ping_count", 0)) + 1
    state["published_slugs"] = []
    _save_seo_state(state)

    return {
        "status": "public_pages_pinged_only",
        "ceo_office_privacy": "STRICT_CEO_ONLY",
        "ping": ping_res,
    }


def trigger_auto_seo_in_background(auto_approvals: List[Dict[str, Any]] = None) -> None:
    state = _load_seo_state()
    today_str = datetime.now().strftime("%Y%m%d")
    if state.get("last_published_date") == today_str:
        return

    def _worker():
        try:
            auto_publish_daily_seo_from_approvals()
        except Exception as e:
            logger.warning(f"[SEO Auto Background] Error: {e}")

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
