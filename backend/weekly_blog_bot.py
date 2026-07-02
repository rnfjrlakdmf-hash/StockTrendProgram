import os
import random
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import requests

from ai_analysis import generate_with_retry
from korea_data import get_top_trending_themes

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        # 스크립트 위치 기준으로 절대 경로 설정
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", os.path.join(script_dir, "firebase-adminsdk.json"))
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
            "content": f"📊 **[주간 증시 결산 업로드]**\n자세히 보기: {url}",
            "embeds": [
                {
                    "title": title,
                    "description": f"{description}\n\n**{tag_str}**",
                    "url": url,
                    "color": 3447003, # 블루 계열
                    "footer": {
                        "text": "StockTrendProgram 리서치 센터"
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        res = requests.post(webhook_url, json=payload)
        if res.status_code in [200, 204]:
            print("[Discord] 주간 결산 디스코드 자동 발행 성공!")
    except Exception as e:
        print(f"[Discord] 에러 발생: {e}")

def generate_weekly_post():
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    
    # 테마 동향 가져오기
    themes = get_top_trending_themes(limit=10)
    theme_context = "이번 주 시장 주도 테마 데이터:\n"
    if themes:
        for idx, t in enumerate(themes):
            theme_context += f"{idx+1}. {t.get('name', '')} (상승률: {t.get('change_rate', '0')}%, 주도주: {', '.join([s.get('name', '') for s in t.get('top_stocks', [])[:3]])})\n"
    else:
        theme_context += "테마 데이터를 불러올 수 없습니다.\n"

    print(f"[Weekly Bot] 주간 요약 데이터 수집 완료")
    
    prompt = f"""
    당신은 월스트리트 출신의 20년 차 주식 전문 애널리스트이자 마켓 뷰 수석 전략가입니다.
    오늘은 한 주간의 시장 흐름을 정리하는 "주간 증시 결산" 포스팅을 작성해야 합니다.

    [제공된 이번 주 주도 테마 데이터]
    {theme_context}

    [중요: 작성 기준일]
    오늘 날짜는 {today_str} 입니다.

    [⚠️ 매우 중요: 유사투자자문업 법적 준수 사항 및 작성 규칙 ⚠️]
    1. 특정 종목(주식)에 대한 매수/매도 추천, 목표가, 손절가 제시는 절대 불법이므로 엄격히 금지합니다.
    2. "추천", "매수하세요", "수익 보장", "무조건 오릅니다" 등의 자극적인 투자 유도 단어를 절대 사용하지 마세요.
    3. 오직 "객관적 사실", "과거 발생한 시장 데이터", "테마별 수급 현황"만을 요약 정리해서 전달하세요.
    4. 글 최하단에는 반드시 다음 면책 조항(Disclaimer)을 똑같이 포함하세요:
       "⚠️ **면책 조항 (Disclaimer)**<br>본 리포트는 객관적인 시장 데이터를 바탕으로 단순 요약한 정보 제공 목적의 글입니다. 어떠한 경우에도 주식의 매수/매도를 추천하지 않으며, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다."

    [출력 포맷 및 작성 가이드]
    1. 첫 줄에 반드시 사람들이 네이버나 구글에 검색할 만한 롱테일 키워드를 포함한 SEO 최적화된 매력적인 제목을 `<title-seo>여기에 작성</title-seo>` 형태로 출력하세요. (예: "삼성전자 주가 전망 및 {today_str} 주간 증시 결산 AI 요약: 이번 주 시장을 뜨겁게 달군 핵심 테마는?") 제목과 본문에는 검색 노출이 잘 되는 인기 종목 이름(예: 삼성전자, 에코프로, SK하이닉스 등)을 자연스럽게 1~2개 포함하세요.
    2. 전체 래퍼는 `<div class="prose prose-lg prose-invert max-w-none space-y-8 leading-loose">` 로 감싸주세요.
    3. 본문 제목: `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">📊 [여기에 제목 삽입]</h2>`
    4. 일반 단락: `<p class="text-gray-300 text-lg">`
    5. 소제목: `<h3 class="text-2xl font-bold text-indigo-400 mt-10 mb-4 border-l-4 border-indigo-500 pl-4">`
    6. 강조: `<strong class="text-white bg-indigo-900/30 px-1 rounded">`
    7. 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"{today_str} 주간 증시 결산 리포트"
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        tags = ["주간증시결산", "주식시장요약", "테마주", "국내증시", "수급분석"]
        return title, content, tags
    except Exception as e:
        print(f"Gemini API 에러: {e}")
        return None, None, None

def post_weekly_blog():
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 초기화 실패")
        return
        
    title, content, tags = generate_weekly_post()
    if not content:
        return
        
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    slug = f"weekly-summary-{timestamp}"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "마켓 뷰 수석 전략가",
        "tags": tags,
        "viewCount": random.randint(300, 700) # 주간 리포트 뷰 부스팅
    }
    
    try:
        doc_ref = db.collection("blog_posts").document(slug)
        doc_ref.set(post_data)
        
        post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
        print(f"[SUCCESS] 주간 증시 결산 포스팅 완료! (ID: {slug})")
        print(f"URL: {post_url}")
        
        post_to_discord(title, content, post_url, tags)
        
    except Exception as e:
        print(f"Firestore 저장 에러: {e}")

if __name__ == "__main__":
    print("주간 증시 결산 자동 포스팅 봇 시작...")
    post_weekly_blog()
