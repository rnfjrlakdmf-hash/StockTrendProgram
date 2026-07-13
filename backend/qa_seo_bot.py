import os
import sys
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import random
import time
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

from ai_analysis import generate_with_retry
from google_indexer import publish_urls_to_google

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

# 주식 기초 Q&A 질문 리스트 (롱테일 키워드 풀)
QA_TOPICS = [
    "주식 배당금 기준일과 지급일 확인하는 방법",
    "해외주식 양도소득세 250만원 공제 및 계산법",
    "공매도 뜻과 개인투자자 대처 방법",
    "ETF와 ETN의 차이점 및 투자 장단점",
    "주식 미수거래와 신용매수의 위험성 및 반대매매",
    "시간외 단일가 거래 방법과 체결 시간",
    "배당락일 뜻과 주가 하락 이유",
    "미국주식 프리마켓 애프터마켓 거래시간",
    "서킷브레이커와 사이드카 발동 조건",
    "주식 호가창 보는 법과 매물대 분석",
    "PER, PBR, ROE 주식 용어 쉽게 이해하기",
    "증자(유상증자, 무상증자)가 주가에 미치는 영향",
    "감자와 상장폐지 전조증상 및 피하는 법",
    "주식 거래수수료 및 증권거래세 계산법",
    "연금저축펀드와 IRP를 통한 절세 방법",
    "주식 예수금과 D+2 결제일의 의미",
    "투자경고종목, 관리종목 지정 이유와 해제 조건",
    "CB(전환사채)와 BW(신주인수권부사채)가 호재인가 악재인가",
    "스팩(SPAC) 주식 투자 방법과 원금 보장",
    "금리 인상과 인하가 주식 시장에 미치는 영향"
]

def generate_qa_post(topic):
    print(f"[{topic}] 주식 기초 Q&A 글 작성 중...")
    
    kst = timezone(timedelta(hours=9))
    today_str = datetime.now(kst).strftime("%Y년 %m월 %d일")
    
    prompt = f"""
    당신은 SEO 전문 카피라이터이자 주식 교육 전문가입니다.
    오늘({today_str}) 주식 초보자들이 가장 많이 검색하는 질문 중 하나인 '{topic}'에 대해 알기 쉽게 설명해주는 정보성 포스팅을 작성하세요.

    [작성 가이드]
    1. 첫 줄에 무조건 클릭을 유발하는 SEO 최적화 제목을 `<title-seo>여기에 제목</title-seo>` 형태로 출력하세요.
       (예: "{topic} 완벽 정리! 초보자도 이해하기 쉬운 핵심 가이드")
    2. 본문 제목은 `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
    3. 본문은 1) 개념 설명(무엇인가요?), 2) 실제 사례나 계산법, 3) 투자 시 주의사항 3가지 파트로 나눠서 깊이 있고 친절하게 작성하세요.
    4. [거미줄 내부 링크] 본문 내용 중에 자연스럽게 사이트 내부로 연결되는 유도 링크를 최소 2개 이상 삽입하세요.
       (예: `<a href="https://stock-trend-program.co.kr/theory" class="text-blue-400 hover:underline">더 많은 주식 기초 이론 보러가기</a>`)
    5. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 {topic} 관련 추가 Q&A</h3>` 제목과 함께, 이 주제에 대해 사람들이 흔히 착각하거나 더 궁금해할 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
    
    [⚠️ 필수 준수 사항]
    - 특정 종목 매수/매도 추천 금지
    - 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    - <div>, <h2>, <p> 태그를 이용해 깔끔하게 작성하세요.
    - `<!DOCTYPE>`, `<html>`, `<body>`, `<head>`, `<style>` 태그 절대 금지.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60, models_to_try=["gemini-2.5-flash-lite"])
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"{topic} 완벽 정리"
        import re
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        tags = ["주식기초", "주식공부", "주식용어", "투자방법"]
        # 토픽명에서 띄어쓰기 첫 단어도 태그로 추가
        tags.append(topic.split(' ')[0])
        return title, content, tags, topic
    except Exception as e:
        print(f"Gemini API 에러 ({topic}): {e}")
        return None, None, None, None

def main():
    print("💡 주식 기초 Q&A 롱테일 봇 (QA SEO Bot) 가동 시작...")
        
    init_firebase()
    db = firestore.client()
    
    # 2개의 주제를 랜덤으로 선택
    selected_topics = random.sample(QA_TOPICS, 2)
    print(f"선정된 Q&A 주제: {selected_topics}")
    
    published_urls = []
    
    for i, topic in enumerate(selected_topics):
        title, content, tags, name = generate_qa_post(topic)
        if not content:
            continue
            
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = f"qa-seo-{timestamp}-{i}"
        
        post_data = {
            "title": title,
            "content": content,
            "slug": slug,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "author": "주식 1타 강사 AI",
            "tags": tags,
            "viewCount": random.randint(200, 500)
        }
        
        try:
            db.collection("blog_posts").document(slug).set(post_data)
            post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
            published_urls.append(post_url)
            print(f"[SUCCESS] Q&A 포스팅 완료! ({post_url})")
            
        except Exception as e:
            print(f"Firestore 저장 에러: {e}")
            
    if published_urls:
        print(f"총 {len(published_urls)}개 포스트 Google Indexing API 핑 전송 중...")
        try:
            publish_urls_to_google(published_urls)
        except Exception as e:
            print(f"Google Indexing API 실패: {e}")

if __name__ == "__main__":
    main()
