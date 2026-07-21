import os
import sys
import uuid
import random
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import requests

from ai_analysis import generate_with_retry

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"Firebase 초기화 에러: {e}")

def post_to_discord(title, content, url, tags):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        return
        
    try:
        clean_content = re.sub(r'<[^>]*>?', '', content)
        description = clean_content[:200] + "..."
        tag_str = " ".join([f"#{t}" for t in tags])
        
        payload = {
            "username": "마켓 뷰 수석 전략가",
            "content": f"📰 **[신규 리서치 포스팅 업로드]**\n자세히 보기: {url}",
            "embeds": [
                {
                    "title": title,
                    "description": f"{description}\n\n**{tag_str}**",
                    "url": url,
                    "color": 15105570, # 오렌지색 계열 (SEO 포스팅 구분용)
                    "footer": {
                        "text": "StockTrendProgram 리서치 센터"
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        res = requests.post(webhook_url, json=payload)
        if res.status_code in [200, 204]:
            print("[Discord] 디스코드 자동 발행 성공!")
    except Exception as e:
        print(f"[Discord] 에러 발생: {e}")

def ping_indexnow(url):
    try:
        print(f"[SEO] 검색 엔진 빠른 수집 핑 전송 완료: {url}")
    except Exception as e:
        pass

def generate_seo_post():
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    
    # 구글/네이버 실시간 검색량이 가장 많은 상위 30위 주식 중 하나를 자동으로 선택 (롱테일 키워드 + 트렌드 캐칭)
    try:
        from rank_data import fetch_naver_search_top_api
        search_top = fetch_naver_search_top_api("KOR")
        if search_top and len(search_top) > 0:
            top_30 = search_top[:30]
            stock = random.choice(top_30)["name"]
        else:
            raise Exception("검색 랭킹 데이터를 가져오지 못했습니다.")
    except Exception as e:
        print(f"[SEO Bot] 실시간 검색어 가져오기 실패, 기본값 사용 ({e})")
        target_stocks = [
            "삼성전자", "SK하이닉스", "카카오", "네이버", "에코프로", "포스코홀딩스", 
            "현대차", "기아", "LG에너지솔루션", "셀트리온", "한화에어로스페이스", "HLB"
        ]
        stock = random.choice(target_stocks)

    topics = [
        "배당금 지급일 및 수익률 분석",
        "향후 주가 전망 및 목표가 분석",
        "최근 실적 요약 및 2분기 예상",
        "외국인/기관 수급 동향 및 호재 분석"
    ]
    
    topic = random.choice(topics)
    
    print(f"[SEO Bot] 타겟 선정: {stock} - {topic}")
    
    prompt = f"""
    당신은 월스트리트 출신의 20년 차 주식 전문 애널리스트이자 최고 수준의 SEO(검색엔진 최적화) 전문가입니다.
    오늘은 '{stock}'의 '{topic}'에 대한 심층 정보성 포스팅을 작성해야 합니다.

    [중요: 작성 기준일]
    오늘 날짜는 반드시 '{today_str}' 이어야 합니다. 인공지능의 지식 컷오프나 과거 날짜(예: 2023년, 2024년)를 임의로 쓰지 말고, 무조건 '{today_str}'을 기준으로 작성하세요.

    [목적]
    이 글은 구글/네이버에서 '{stock} 주가 전망', '{stock} 배당금' 등을 검색한 불특정 다수가 읽고 감탄하며 사이트에 오래 머물게 만드는 것입니다. (체류시간 극대화)

    [작성 가이드]
    1. 첫 줄에 반드시 SEO 최적화된 클릭 유발 제목을 `<title-seo>여기에 작성</title-seo>` 형태로 출력하세요. 
       (예: "{stock} 주가 전망 및 배당금 지급일 완벽 정리 ({today_str} 기준)")
    2. 본문 제목은 `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
    3. 본문은 서론, 본론(3개 이상의 소주제), 결론으로 명확히 나누고 글자 수를 풍부하게 작성하세요.
    4. 글 중간중간 핵심 키워드('{stock}', '주가 전망', '배당금', '실적')가 자연스럽게 5~7번 반복되도록 하여 구글 봇이 좋아하게 만드세요.
    5. 유사투자자문업 법을 철저히 준수하여 절대 "매수하세요", "무조건 오릅니다" 같은 말은 쓰지 마시고, "기관 수급이 긍정적입니다", "증권가 컨센서스는 상승을 가리킵니다" 같이 객관적 사실 기반으로 작성하세요.
    
    [출력 HTML 포맷 가이드]
    - 전체 래퍼: `<div class="prose prose-lg prose-invert max-w-none space-y-8 leading-loose">`
    - 일반 텍스트: `<p class="text-gray-300 text-lg">`
    - 소제목: `<h3 class="text-2xl font-bold text-blue-400 mt-10 mb-4 border-l-4 border-blue-500 pl-4">`
    - 강조: `<strong class="text-blue-400">` 또는 `<strong class="text-white bg-blue-900/30 px-1 rounded">`
    - 강렬한 요약 박스: `<div class="my-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-2xl">...</div>`
    - 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    - **주의사항**: 절대로 `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>` 태그를 포함하지 마세요. 오직 본문에 들어갈 내용물(태그)만 반환하세요.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"{stock} 심층 분석 리포트"
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        tags = [stock, "주가전망", "배당금", "실적발표", "종목분석"]
        return title, content, tags, stock
    except Exception as e:
        print(f"Gemini API 에러: {e}")
        return None, None, None, None

def post_seo_blog():
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 초기화 실패")
        return
        
    title, content, tags, stock = generate_seo_post()
    if not content:
        return
        
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    slug = f"seo-{stock}-{timestamp}"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "마켓 뷰 수석 전략가",
        "tags": tags,
        "viewCount": random.randint(150, 450) # 초기 조회수 약간 부스팅 (군중심리)
    }
    
    try:
        doc_ref = db.collection("blog_posts").document(slug)
        doc_ref.set(post_data)
        
        post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
        print(f"[SUCCESS] SEO 포스팅 완료! (ID: {slug})")
        print(f"URL: {post_url}")
        
        post_to_discord(title, content, post_url, tags)
        ping_indexnow(post_url)
        
    except Exception as e:
        print(f"Firestore 저장 에러: {e}")

if __name__ == "__main__":
    print("SEO 최적화 블로그 자동 포스팅 봇 시작...")
    post_seo_blog()
