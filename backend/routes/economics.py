import threading
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

ADMIN_EMAILS = {"rnfjr@gmail.com", "rnfjrlakdmf@gmail.com"}
_generate_lock = threading.Lock()


class GenerateEconomicsRequest(BaseModel):
    category: Optional[str] = None
    custom_topic: Optional[str] = None
    admin_email: Optional[str] = None
    send_push: bool = False


def _serialize_created_at(val):
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if val is None:
        return ""
    return str(val)


@router.get("/economics/posts")
def get_economics_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(60, ge=1, le=200),
    category: Optional[str] = None,
):
    """
    Firestore economics_posts 컬렉션에서 매일 1일 1경제학 강의 목록과
    6대 분야 커리큘럼 진행 통계를 반환합니다.
    """
    import firebase_admin
    from firebase_admin import firestore
    from firebase_config import initialize_firebase
    from daily_economics_bot import ECONOMICS_CATEGORIES, ECONOMICS_CURRICULUM

    initialize_firebase()
    if not firebase_admin._apps:
        return {
            "status": "error",
            "message": "Firebase not initialized",
            "posts": [],
            "total": 0,
            "totalPages": 1,
            "categories": ECONOMICS_CATEGORIES,
            "curriculumTotal": len(ECONOMICS_CURRICULUM),
        }

    try:
        db = firestore.client()
        docs = list(db.collection("economics_posts").stream())

        all_posts = []
        cat_published_counts = {c["id"]: 0 for c in ECONOMICS_CATEGORIES}

        for doc in docs:
            data = doc.to_dict() or {}
            cat_id = data.get("category", "micro")
            if cat_id in cat_published_counts:
                cat_published_counts[cat_id] += 1

            created_str = _serialize_created_at(data.get("createdAt"))
            day_num = int(data.get("dayNumber", 0) or 0)
            slug = data.get("slug", doc.id)

            all_posts.append({
                "id": doc.id,
                "slug": slug,
                "dayNumber": day_num,
                "title": data.get("title", "오늘의 경제학 강의"),
                "oneLineDef": data.get("oneLineDef", ""),
                "summary": data.get("summary", ""),
                "content": (data.get("content", "") or "")[:450],
                "category": cat_id,
                "categoryLabel": data.get("categoryLabel", "생활 & 미시경제"),
                "categoryEmoji": data.get("categoryEmoji", "🎓"),
                "difficulty": data.get("difficulty", "입문"),
                "tags": data.get("tags", []),
                "originalTopic": data.get("originalTopic", ""),
                "author": data.get("author", "StockTrend 경제학 1타 선생님"),
                "createdAt": created_str,
                "createdDateKst": data.get("createdDateKst", ""),
                "viewCount": data.get("viewCount", 0),
                "quizCount": len(data.get("quiz", []) or []),
            })

        # 최신순 정렬 (dayNumber 내림차순 -> createdAt 내림차순)
        all_posts.sort(
            key=lambda x: (x.get("dayNumber", 0), x.get("createdAt", ""), x.get("slug", "")),
            reverse=True,
        )

        # 카테고리 필터
        if category and category != "all":
            filtered = [p for p in all_posts if p.get("category") == category]
        else:
            filtered = all_posts

        total = len(filtered)
        total_pages = max(1, -(-total // limit))
        start = (page - 1) * limit
        paged = filtered[start : start + limit]

        # 분야별 커리큘럼 통계
        cat_totals = {c["id"]: 0 for c in ECONOMICS_CATEGORIES}
        for item in ECONOMICS_CURRICULUM:
            cid = item["category"]
            if cid in cat_totals:
                cat_totals[cid] += 1

        categories_with_stats = []
        for c in ECONOMICS_CATEGORIES:
            cid = c["id"]
            categories_with_stats.append({
                **c,
                "publishedCount": cat_published_counts.get(cid, 0),
                "totalPlanned": cat_totals.get(cid, 30),
            })

        return {
            "status": "ok",
            "posts": paged,
            "total": total,
            "totalAllPosts": len(all_posts),
            "totalPages": total_pages,
            "curriculumTotal": len(ECONOMICS_CURRICULUM),
            "categories": categories_with_stats,
        }
    except Exception as e:
        print(f"[Economics API] 목록 조회 에러: {e}")
        return {
            "status": "error",
            "message": str(e),
            "posts": [],
            "total": 0,
            "totalPages": 1,
        }


@router.get("/economics/posts/{slug}")
def get_economics_post(slug: str):
    """
    특정 슬러그의 1일 1경제학 강의 상세 전문 + 퀴즈 + 이전/다음 강의를 반환합니다.
    """
    import firebase_admin
    from firebase_admin import firestore
    from firebase_config import initialize_firebase

    initialize_firebase()
    if not firebase_admin._apps:
        return {"status": "error", "message": "Firebase not initialized"}

    try:
        db = firestore.client()
        coll = db.collection("economics_posts")

        doc = coll.document(slug).get()
        if not doc.exists:
            matches = list(coll.where("slug", "==", slug).limit(1).stream())
            doc = matches[0] if matches else None

        if not doc or not doc.exists:
            return {"status": "error", "message": "Economics post not found"}

        data = doc.to_dict() or {}
        post = {
            "id": doc.id,
            "slug": data.get("slug", doc.id),
            "dayNumber": int(data.get("dayNumber", 0) or 0),
            "title": data.get("title", "오늘의 경제학 강의"),
            "oneLineDef": data.get("oneLineDef", ""),
            "summary": data.get("summary", ""),
            "content": data.get("content", ""),
            "quiz": data.get("quiz", []) or [],
            "category": data.get("category", "micro"),
            "categoryLabel": data.get("categoryLabel", "생활 & 미시경제"),
            "categoryEmoji": data.get("categoryEmoji", "🎓"),
            "difficulty": data.get("difficulty", "입문"),
            "tags": data.get("tags", []),
            "originalTopic": data.get("originalTopic", ""),
            "author": data.get("author", "StockTrend 경제학 1타 선생님"),
            "createdAt": _serialize_created_at(data.get("createdAt")),
            "createdDateKst": data.get("createdDateKst", ""),
            "viewCount": data.get("viewCount", 0),
        }

        # 이전/다음 강의 및 추천 관련 강의 조회
        all_docs = list(coll.stream())
        summaries = []
        for d in all_docs:
            dd = d.to_dict() or {}
            summaries.append({
                "slug": dd.get("slug", d.id),
                "dayNumber": int(dd.get("dayNumber", 0) or 0),
                "title": dd.get("title", ""),
                "oneLineDef": dd.get("oneLineDef", ""),
                "category": dd.get("category", "micro"),
                "categoryLabel": dd.get("categoryLabel", ""),
                "categoryEmoji": dd.get("categoryEmoji", "🎓"),
                "createdAt": _serialize_created_at(dd.get("createdAt")),
            })
        summaries.sort(key=lambda x: (x["dayNumber"], x["createdAt"], x["slug"]))

        prev_post = None
        next_post = None
        cur_idx = -1
        for idx, item in enumerate(summaries):
            if item["slug"] == post["slug"]:
                cur_idx = idx
                break
        if cur_idx > 0:
            prev_post = summaries[cur_idx - 1]
        if 0 <= cur_idx < len(summaries) - 1:
            next_post = summaries[cur_idx + 1]

        # 관련 강의 (같은 분야 우선, 그 외 최신순 최대 3개)
        others = [s for s in summaries if s["slug"] != post["slug"]]
        same_cat = [s for s in others if s["category"] == post["category"]]
        diff_cat = [s for s in others if s["category"] != post["category"]]
        related = (same_cat[::-1] + diff_cat[::-1])[:3]

        return {
            "status": "ok",
            "post": post,
            "prevPost": prev_post,
            "nextPost": next_post,
            "relatedPosts": related,
        }
    except Exception as e:
        print(f"[Economics API] 상세 조회 에러: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/economics/posts/{slug}/view")
def increment_economics_view(slug: str):
    """
    경제학 강의 조회수 +1 증가
    """
    import firebase_admin
    from firebase_admin import firestore
    from firebase_config import initialize_firebase

    initialize_firebase()
    if not firebase_admin._apps:
        return {"success": False}
    try:
        db = firestore.client()
        ref = db.collection("economics_posts").document(slug)
        if ref.get().exists:
            ref.update({"viewCount": firestore.Increment(1)})
            return {"success": True}
        return {"success": False}
    except Exception as e:
        print(f"[Economics View] 에러: {e}")
        return {"success": False}


@router.get("/economics/curriculum")
def get_economics_curriculum():
    """
    180일 6대 분야 경제학 전체 커리큘럼 로드맵과 각 주제의 발행 상태를 반환합니다.
    """
    import firebase_admin
    from firebase_admin import firestore
    from firebase_config import initialize_firebase
    from daily_economics_bot import (
        ECONOMICS_CATEGORIES,
        ECONOMICS_CURRICULUM,
        get_existing_economics_history,
        is_economics_topic_used,
        _norm_text,
    )

    initialize_firebase()
    db = firestore.client() if firebase_admin._apps else None
    history = get_existing_economics_history(db=db)

    grouped = []
    for cat in ECONOMICS_CATEGORIES:
        cid = cat["id"]
        items = []
        cat_items = [x for x in ECONOMICS_CURRICULUM if x["category"] == cid]
        for idx, item in enumerate(cat_items, start=1):
            topic = item["topic"]
            pub_info = history["published_map"].get(_norm_text(topic))
            published = pub_info is not None or is_economics_topic_used(topic, history)
            items.append({
                "order": idx,
                "topic": topic,
                "difficulty": item["difficulty"],
                "published": published,
                "slug": pub_info["slug"] if pub_info else None,
                "dayNumber": pub_info["dayNumber"] if pub_info else None,
                "publishedTitle": pub_info["title"] if pub_info else None,
            })

        grouped.append({
            **cat,
            "totalCount": len(items),
            "publishedCount": sum(1 for x in items if x["published"]),
            "items": items,
        })

    return {
        "status": "ok",
        "totalPlanned": len(ECONOMICS_CURRICULUM),
        "totalPublished": history["total_posts"],
        "curriculum": grouped,
    }


@router.post("/economics/generate-now")
def generate_economics_now(req: GenerateEconomicsRequest):
    """
    대표님(관리자) 전용: 오늘 이미 공부한 뒤 '하나 더 공부하기'를 원할 때
    겹치지 않는 새로운 경제학 강의를 즉시 생성하여 Firestore에 저장합니다.
    """
    email = (req.admin_email or "").strip().lower()
    if email not in ADMIN_EMAILS:
        return {
            "status": "error",
            "message": "관리자(대표님) 계정으로 로그인 후 이용하실 수 있는 즉시 강의 생성 기능입니다.",
        }

    if not _generate_lock.acquire(blocking=False):
        return {
            "status": "error",
            "message": "현재 새로운 경제학 강의를 작성 중입니다. 10~20초 후 잠시만 기다려 주세요!",
        }

    try:
        from daily_economics_bot import post_daily_economics

        result = post_daily_economics(
            force=True,
            preferred_category=req.category if req.category and req.category != "auto" else None,
            custom_topic=req.custom_topic,
            allow_multiple_same_day=True,
            send_push=req.send_push,
        )
        return result
    except Exception as e:
        print(f"[Economics API] 즉시 생성 오류: {e}")
        return {"status": "error", "message": f"강의 생성 중 오류가 발생했습니다: {str(e)}"}
    finally:
        _generate_lock.release()
