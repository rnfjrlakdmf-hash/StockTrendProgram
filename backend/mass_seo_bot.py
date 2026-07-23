import os
import sys
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import random
import time
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

from korea_data import fetch_naver_ranking_data
from stock_data import fetch_google_news
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

def get_surging_stocks(limit=5):
    print("국내 증시 실시간 인기 검색 종목 탐색 중...")
    try:
        # 네이버페이 증권 실시간 인기 검색 종목 1~5위
        search_top = fetch_naver_ranking_data('KOR', 'searchTop')
        
        # 필터링 없이 그대로 최상위 인기 종목 반환
        return search_top[:limit]
    except Exception as e:
        print(f"인기 종목 탐색 실패: {e}")
        return []

def get_compliance_prompt(stock_name, ticker):
    return f"""
    [⚠️ 작성 규칙]
    1. 특정 종목 매수/매도 추천 절대 금지.
    2. "수익 보장", "무조건 상승" 등 자극적 단어 금지. 객관적 분석 톤 유지.
    3. 글 중간중간에 '{stock_name}' 단어가 나올 때 1~2번은 꼭 아래 HTML 태그로 감싸서 링크를 걸어주세요:
       <a href="https://stock-trend-program.co.kr/stock/{ticker}" class="font-bold text-blue-400 hover:underline">{stock_name}</a>
    4. 글 마지막에 "본 리포트는 객관적 데이터를 바탕으로 한 정보 제공 목적이며, 투자의 최종 책임은 본인에게 있습니다." 문구 삽입.
    
    **HTML 포맷팅 규칙 및 주의사항**:
    1. <div>, <h2>, <p> 태그를 이용해 깔끔하게 작성하세요.
    2. 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    3. 절대로 `<!DOCTYPE>`, `<html>`, `<body>`, `<head>`, `<style>` 태그를 포함하지 마세요.
    """

def generate_seo_post(stock):
    name = stock.get('itemname')
    ticker = stock.get('itemcode')
    
    print(f"[{name}] 데이터 수집 및 글 작성 중...")
    
    # 구글 뉴스 크롤링
    news = fetch_google_news(f"{name} 특징주 OR 주가 OR 실적", period='1d')
    news = news[:3] if news else []
    news_text = "\n".join([f"- {n['title']}" for n in news]) if news else "최신 주요 뉴스 없음"
    
    kst = timezone(timedelta(hours=9))
    today_str = datetime.now(kst).strftime("%Y년 %m월 %d일")
    
    prompt = f"""
    당신은 SEO 전문 카피라이터이자 주식 애널리스트입니다.
    오늘({today_str}) 실시간 인기 검색어로 시장의 뜨거운 관심을 받고 있는 '{name}'에 대한 정보성 포스팅을 작성하세요.

    [최신 뉴스 요약]
    {news_text}

    [작성 가이드]
    1. 첫 줄에 무조건 클릭을 유발하는 SEO 최적화 제목을 `<title-seo>여기에 제목</title-seo>` 형태로 출력하세요.
       (예: "{name} 주가 급등 이유 및 3분기 실적 전망 완벽 분석")
    2. 본문 제목은 `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
    3. 본문은 뉴스 요약, 수급/차트 관점, 향후 전망 3가지 파트로 나눠서 깊이 있게 작성하세요.
    4. [거미줄 내부 링크] 본문 내용 중에 사이트 내부로 연결되는 유도 링크를 삽입하세요. 단, 링크(href) 주소는 반드시 다음 중 하나만 사용해야 합니다 (절대 임의의 링크를 만들지 마세요): `/discovery` (특징주 분석), `/theory` (주식 강의), `/theme` (테마주 분석), `/premium` (프리미엄 리포트).
       (예: `<a href="https://stock-trend-program.co.kr/discovery" class="text-blue-400 hover:underline">오늘의 실시간 특징주 분석 보러가기</a>`)
    5. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 {name} 관련 자주 묻는 질문 (FAQ)</h3>` 제목과 함께, 투자자들이 궁금해할 만한 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
    
    {get_compliance_prompt(name, ticker)}
    """
    
    try:
        # 모델은 초고속/가성비인 gemini-3.5-flash-lite 사용
        response = generate_with_retry(prompt, json_mode=False, timeout=60, models_to_try=["gemini-3.5-flash-lite"])
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"{name} 주가 분석 리포트"
        import re
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        tags = [name, "주가전망", "특징주", "급등주", "종목분석"]
        return title, content, tags, name
    except Exception as e:
        print(f"Gemini API 에러 ({name}): {e}")
        return None, None, None, None

def main():
    print("🚀 초대량 롱테일 키워드 SEO 공장 (Mass SEO Bot) 가동 시작...")
    if exit_if_holiday("KOR"):
        return
        
    init_firebase()
    db = firestore.client()
    
    stocks = get_surging_stocks(limit=5)
    if not stocks:
        print("포착된 급등주가 없습니다.")
        return
        
    print(f"총 {len(stocks)}개 종목 포착 완료. 대량 생성 시작!")
    
    published_urls = []
    
    for i, stock in enumerate(stocks):
        title, content, tags, name = generate_seo_post(stock)
        if not content:
            continue
            
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = f"mass-{name}-{timestamp}-{i}"
        
        post_data = {
            "title": title,
            "content": content,
            "slug": slug,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "author": "AI 트렌드 분석기",
            "tags": tags,
            "viewCount": random.randint(50, 150)
        }
        
        try:
            db.collection("blog_posts").document(slug).set(post_data)
            post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
            published_urls.append(post_url)
            print(f"[SUCCESS] {i+1}/{len(stocks)} - {name} 포스팅 완료! ({post_url})")
            
        except Exception as e:
            print(f"Firestore 저장 에러 ({name}): {e}")
            
        # 구글 API 속도 제한 방지
        time.sleep(2)
        
    # 모든 글 작성 후 일괄 Indexing 핑
    if published_urls:
        print(f"총 {len(published_urls)}개 포스트 Google Indexing API 핑 전송 중...")
        try:
            publish_urls_to_google(published_urls)
        except Exception as e:
            print(f"Google Indexing API 실패: {e}")

if __name__ == "__main__":
    main()
