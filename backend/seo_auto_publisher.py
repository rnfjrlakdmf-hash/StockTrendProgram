# -*- coding: utf-8 -*-
"""
구글(Google)·네이버(Naver)·빙(Bing) 100% 무인 자동 SEO 발행 및 색인 알림 엔진
- 대표님이 신경 쓰지 않아도 매일 오늘의 결재 기안서(증권사 목표주가 리포트·수급·글로벌 시황)를
  검색엔진 친화적 마켓 브리핑 아티클(/blog/[slug])로 자동 발행하고,
- IndexNow API를 통해 검색엔진 로봇에게 새 URL과 종목 페이지들을 즉시 색인 요청합니다.
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
    """
    if not urls:
        return {"status": "skipped", "count": 0}

    unique_urls = list(dict.fromkeys(urls))[:100]
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


def auto_publish_daily_seo_from_approvals(auto_approvals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    하루 1회 이상 자동으로 오늘의 전자결재 기안서(국내 리포트 종목 + 미국 빅테크 + 선물·환율)를
    Firestore `blog_posts`에 정식 SEO 아티클로 발행하고 검색엔진에 즉시 핑을 전송합니다.
    """
    now = datetime.now()
    today_str = now.strftime("%Y%m%d")
    date_display = now.strftime("%Y년 %m월 %d일")

    state = _load_seo_state()
    if state.get("last_published_date") == today_str:
        return {"status": "already_published_today", "date": today_str}

    if not auto_approvals:
        return {"status": "no_approvals"}

    kr_docs = [d for d in auto_approvals if d.get("category_type") == "kr_stock"]
    us_docs = [d for d in auto_approvals if d.get("category_type") == "us_stock"]
    fut_docs = [d for d in auto_approvals if d.get("category_type") == "futures"]

    kr_names = [d.get("stock_name", "") for d in kr_docs if d.get("stock_name")]
    us_names = [d.get("stock_name", "") for d in us_docs if d.get("stock_name")]

    top_doc = kr_docs[0] if kr_docs else auto_approvals[0]
    top_name = top_doc.get("stock_name", "주요 특징주")
    top_upside = top_doc.get("upside_pct", "")

    slug = f"{today_str}-daily-research-target-price-report"
    title = f"[{date_display} 증권사 리포트 요약] {', '.join(kr_names[:4])} 목표주가 전망 및 외국인·기관 수급 총정리"

    # 풍부한 검색엔진 최적화(SEO) HTML 본문 구성
    sections = []
    sections.append(
        f"<p><strong>{date_display} 스마트 투자 비서 AI 증권사 리서치센터</strong>에서 오늘 발간된 국내 증권사 애널리스트 종목 리포트 목표주가 컨센서스와 외국인·기관 수급, 미국 빅테크 및 글로벌 선물·환율 핵심 지표를 종합 정리해 드립니다.</p>"
    )

    if kr_docs:
        sections.append("<h2>1. 오늘의 국내 증권사 목표주가 리포트 포착 종목</h2>")
        for doc in kr_docs:
            s_name = doc.get("stock_name", "")
            s_code = doc.get("stock_code", "")
            c_price = doc.get("current_price", "-")
            t_price = doc.get("target_price", "-")
            upside = doc.get("upside_pct", "-")
            headline = doc.get("easy_headline", "")
            r_op = doc.get("research_opinion", "")
            q_op = doc.get("quant_opinion", "")
            rk_op = doc.get("risk_opinion", "")
            stock_link = f'<a href="/stock/{s_code}">{s_name}({s_code}) 상세 수급·재무 보러가기</a>' if s_code else s_name

            sections.append(
                f"<h3>📌 {s_name} ({s_code}) — 현재가 {c_price} / 목표주가 {t_price} (상승여력 {upside})</h3>"
                f"<p>{headline}</p>"
                f"<ul>"
                f"<li><strong>리서치 핵심 분석:</strong> {r_op}</li>"
                f"<li><strong>외국인·기관 수급 진단:</strong> {q_op}</li>"
                f"<li><strong>투자 시 유의사항(리스크):</strong> {rk_op}</li>"
                f"<li><strong>실시간 차트 및 재무제표:</strong> {stock_link}</li>"
                f"</ul>"
            )

    if us_docs:
        sections.append("<h2>2. 미국 빅테크 AI 주도주 및 글로벌 수급 동향</h2>")
        for doc in us_docs:
            s_name = doc.get("stock_name", "")
            s_code = doc.get("stock_code", "")
            c_price = doc.get("current_price", "-")
            t_price = doc.get("target_price", "-")
            upside = doc.get("upside_pct", "-")
            headline = doc.get("easy_headline", "")
            sections.append(
                f"<h3>🌎 {s_name} — 현재가 {c_price} / 월가 목표주가 {t_price} ({upside})</h3>"
                f"<p>{headline}</p>"
            )

    if fut_docs:
        sections.append("<h2>3. 글로벌 선물 지수 (나스닥100 · S&amp;P500 · 금 · 원유) 브리핑</h2><ul>")
        for doc in fut_docs:
            sections.append(
                f"<li><strong>{doc.get('stock_name', '')}:</strong> 현재 시세 {doc.get('current_price', '-')} — {doc.get('easy_headline', '')}</li>"
            )
        sections.append("</ul>")

    sections.append(
        "<hr/><p>※ 본 브리핑은 금융감독원 전자공시(DART), 한국거래소(KRX), 네이버 금융 증권사 컨센서스 데이터를 기반으로 자동 요약된 참고 자료이며 특정 종목의 매수·매도 권유가 아닙니다.</p>"
    )

    html_content = "\n".join(sections)
    tags = ["증권사리포트", "목표주가", "외국인수급", "기관순매수", "미국주식"] + [n.split("(")[0].strip() for n in (kr_names[:4] + us_names[:2]) if n]

    # Firestore blog_posts 저장
    try:
        import firebase_admin
        from firebase_admin import firestore
        from firebase_config import initialize_firebase

        initialize_firebase()
        if firebase_admin._apps:
            db = firestore.client()
            doc_ref = db.collection("blog_posts").document(slug)
            doc_ref.set({
                "id": slug,
                "slug": slug,
                "title": title,
                "content": html_content,
                "tags": tags[:10],
                "author": "스마트 투자 비서 리서치센터",
                "createdAt": now.isoformat(),
                "viewCount": 12,
            }, merge=True)
    except Exception as e:
        logger.warning(f"[SEO Auto] Firestore blog_posts write skipped/failed: {e}")

    # 검색엔진 색인 요청할 핵심 URL 리스트 구성
    urls_to_ping = [
        f"{SITE_URL}/",
        f"{SITE_URL}/ceo-office",
        f"{SITE_URL}/blog/{slug}",
        f"{SITE_URL}/blog",
        f"{SITE_URL}/research",
        f"{SITE_URL}/directory",
        f"{SITE_URL}/sitemap.xml",
        f"{SITE_URL}/rss.xml",
    ]
    for d in (kr_docs + us_docs):
        code = str(d.get("stock_code") or "").strip()
        if code and code != "SYSTEM" and "=" not in code:
            urls_to_ping.append(f"{SITE_URL}/stock/{code}")

    ping_res = ping_search_engines(urls_to_ping)

    state["last_published_date"] = today_str
    state["last_ping_time"] = int(time.time())
    state["ping_count"] = int(state.get("ping_count", 0)) + 1
    slugs = state.get("published_slugs", [])
    if slug not in slugs:
        slugs.append(slug)
    state["published_slugs"] = slugs[-60:]
    _save_seo_state(state)

    return {
        "status": "published",
        "slug": slug,
        "title": title,
        "ping": ping_res,
    }


def trigger_auto_seo_in_background(auto_approvals: List[Dict[str, Any]]) -> None:
    """
    응답 지연(0ms)을 위해 백그라운드 데몬 스레드에서 하루 1회 자동 발행 및 색인 핑 실행
    """
    state = _load_seo_state()
    today_str = datetime.now().strftime("%Y%m%d")
    if state.get("last_published_date") == today_str:
        return

    def _worker():
        try:
            auto_publish_daily_seo_from_approvals(auto_approvals)
        except Exception as e:
            logger.warning(f"[SEO Auto Background] Error: {e}")

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
