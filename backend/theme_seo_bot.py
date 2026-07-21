import os
import sys
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import random
import time
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

from korea_data import get_top_trending_themes
from ai_analysis import generate_with_retry
from google_indexer import publish_urls_to_google
from holiday_checker import exit_if_holiday

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

def get_compliance_prompt(theme_name):
    return f"""
    [⚠️ 작성 규칙]
    1. 특정 종목 매수/매도 추천 절대 금지.
    2. "수익 보장", "무조건 상승" 등 자극적 단어 금지. 객관적 분석 톤 유지.
    3. 글 마지막에 "본 리포트는 객관적 데이터를 바탕으로 한 정보 제공 목적이며, 투자의 최종 책임은 본인에게 있습니다." 문구 삽입.
    4. <div>, <h2>, <p> 태그를 이용해 깔끔하게 작성하세요.
    5. 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    6. 절대로 `<!DOCTYPE>`, `<html>`, `<body>`, `<head>`, `<style>` 태그를 포함하지 마세요.
    """

def generate_theme_post(theme):
    theme_name = theme.get('name')
    rate = theme.get('percent')
    
    print(f"[{theme_name}] 테마 데이터 수집 및 글 작성 중...")
    
    kst = timezone(timedelta(hours=9))
    today_str = datetime.now(kst).strftime("%Y년 %m월 %d일")
    
    prompt = f"""
    당신은 SEO 전문 카피라이터이자 주식 애널리스트입니다.
    오늘({today_str}) 주식 시장에서 전일 대비 {rate}의 등락률을 보이며 시장의 핵심 트렌드로 떠오른 '{theme_name} 관련주(대장주)'에 대한 정보성 포스팅을 작성하세요.

    [작성 가이드]
    1. 첫 줄에 무조건 클릭을 유발하는 SEO 최적화 제목을 `<title-seo>여기에 제목</title-seo>` 형태로 출력하세요.
       (예: "2026년 {theme_name} 관련주 대장주 총정리 및 향후 전망")
    2. 본문 제목은 `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
    3. 본문은 1) 이 테마가 뜨는 이유, 2) 대표적인 대장주 3~5개 소개 및 특징, 3) 향후 투자 전망 3가지 파트로 나눠서 깊이 있게 작성하세요.
    4. [거미줄 내부 링크] 본문 내용 중에 사이트 내부로 연결되는 유도 링크를 삽입하세요. 단, 링크(href) 주소는 반드시 다음 중 하나만 사용해야 합니다 (절대 임의의 링크를 만들지 마세요): `/discovery` (특징주 분석), `/theory` (주식 강의), `/theme` (테마주 분석), `/premium` (프리미엄 리포트).
       (예: `<a href="https://stock-trend-program.co.kr/discovery" class="text-blue-400 hover:underline">오늘의 실시간 특징주 분석 보러가기</a>`)
    5. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 {theme_name} 관련 자주 묻는 질문 (FAQ)</h3>` 제목과 함께, 투자자들이 궁금해할 만한 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
    
    {get_compliance_prompt(theme_name)}
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60, models_to_try=["gemini-2.5-flash-lite"])
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"{theme_name} 관련주 총정리"
        import re
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        tags = [theme_name, "테마주", "대장주", "주식전망", "관련주"]
        return title, content, tags, theme_name
    except Exception as e:
        print(f"Gemini API 에러 ({theme_name}): {e}")
        return None, None, None, None

def main():
    print("🔥 오늘의 테마주 싹쓸이 봇 (Theme SEO Bot) 가동 시작...")
    if exit_if_holiday("KOR"):
        return
        
    init_firebase()
    db = firestore.client()
    
    themes = get_top_trending_themes(limit=1)
    if not themes:
        print("포착된 테마가 없습니다.")
        return
        
    print(f"총 {len(themes)}개 테마 포착 완료. 글 생성 시작!")
    
    published_urls = []
    
    for i, theme in enumerate(themes):
        title, content, tags, name = generate_theme_post(theme)
        if not content:
            continue
            
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = f"theme-{name}-{timestamp}-{i}"
        
        post_data = {
            "title": title,
            "content": content,
            "slug": slug,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "author": "AI 테마 분석기",
            "tags": tags,
            "viewCount": random.randint(100, 300)
        }
        
        try:
            db.collection("blog_posts").document(slug).set(post_data)
            post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
            published_urls.append(post_url)
            print(f"[SUCCESS] {name} 테마주 포스팅 완료! ({post_url})")
            
        except Exception as e:
            print(f"Firestore 저장 에러 ({name}): {e}")
            
    if published_urls:
        print(f"총 {len(published_urls)}개 포스트 Google Indexing API 핑 전송 중...")
        try:
            publish_urls_to_google(published_urls)
        except Exception as e:
            print(f"Google Indexing API 실패: {e}")

if __name__ == "__main__":
    main()
