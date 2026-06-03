import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# 환경 변수 로드
load_dotenv()

# Firebase 초기화 (한 번만 실행되도록 처리)
def init_firebase():
    if not firebase_admin._apps:
        # 서비스 어카운트 키 경로 (.env에서 읽거나 기본 경로 사용)
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
        
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK 초기화 성공 (Service Account Key 사용)")
            else:
                # 키 파일이 없다면 기본 자격 증명 시도 (GCP 환경용)
                firebase_admin.initialize_app()
                print("Firebase Admin SDK 초기화 성공 (기본 자격 증명 사용)")
        except Exception as e:
            print(f"Firebase 초기화 에러: {e}")
            print("자체 블로그 포스팅을 위해 Firebase Service Account Key가 필요합니다.")

def get_market_summary():
    """
    AI 시황 데이터를 생성하는 함수 (예시)
    """
    # KST (한국 시간) 기준
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    date_id = today_dt.strftime("%Y%m%d")
    
    title = f"[AI 마켓 뷰] {today_str} 국내/미국 증시 주도 테마 및 핵심 요약"
    
    # Next.js 프론트엔드에서 렌더링하기 좋은 HTML 형식으로 작성합니다.
    content = f"""
    <div class="prose prose-invert max-w-none space-y-6">
        <h2 class="text-2xl font-bold text-white border-b border-gray-700 pb-2">🚀 {today_str} 증시 마감 요약</h2>
        <p class="text-gray-300 text-lg">안녕하세요! AI 주식 분석기 <strong class="text-blue-400">StockTrendProgram</strong>입니다.<br/>오늘 시장을 주도했던 핵심 테마와 특징주를 완벽하게 요약해 드립니다.</p>
        
        <h3 class="text-xl font-bold text-orange-400 mt-8 mb-4 flex items-center gap-2">🔥 오늘의 주도 테마</h3>
        <ul class="space-y-4 text-gray-300 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
            <li class="flex flex-col gap-1">
                <span class="text-lg font-bold text-white">1. 비만치료제 (초강세)</span>
                <span class="pl-4 border-l-2 border-gray-700">- 대장주가 20% 이상 급등하며 시장 자금을 모두 흡수했습니다.</span>
                <span class="pl-4 border-l-2 border-gray-700">- 단기 과열 구간에 진입했으므로 신규 진입은 주의가 필요합니다.</span>
            </li>
            <li class="flex flex-col gap-1 mt-4">
                <span class="text-lg font-bold text-white">2. 온디바이스 AI (숨고르기)</span>
                <span class="pl-4 border-l-2 border-gray-700">- 전일 급등에 따른 차익 매물이 출회되며 조정을 받았습니다.</span>
                <span class="pl-4 border-l-2 border-gray-700">- 하지만 중장기 모멘텀은 여전히 살아있습니다.</span>
            </li>
        </ul>

        <h3 class="text-xl font-bold text-blue-400 mt-8 mb-4 flex items-center gap-2">💡 AI 인사이트</h3>
        <ul class="space-y-2 text-gray-300 list-disc pl-5">
            <li>코스피는 외인 매도세로 약보합 마감했으나, 특정 테마로의 쏠림 현상이 극심했습니다.</li>
            <li>내일 장에서는 <strong class="text-yellow-400">전력기기 및 반도체 소부장</strong> 섹터로의 수급 이동을 주시해야 합니다.</li>
        </ul>

        <div class="mt-12 bg-gradient-to-r from-blue-900/40 to-blue-600/10 p-6 rounded-2xl border border-blue-500/30 text-center">
            <p class="text-lg font-bold text-white mb-2">더 상세한 종목별 AI 분석과 목표가가 궁금하신가요?</p>
            <p class="text-blue-300 mb-6">지금 바로 종목 검색창에 보유 종목을 검색해 보세요!</p>
            <a href="/" class="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors">AI 종목 검색 바로가기</a>
        </div>
    </div>
    """

    return date_id, title, content

def post_to_firestore():
    init_firebase()
    
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 클라이언트를 가져오지 못했습니다. 키 설정을 확인해주세요.")
        return False

    date_id, title, content = get_market_summary()
    
    # URL에 쓸 친화적인 slug 생성 (예: 20260603-market-view)
    slug = f"{date_id}-market-view"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "AI 퀀트봇",
        "tags": ["시황", "테마주", "AI분석", "특징주"],
        "viewCount": 0
    }
    
    try:
        # blog_posts 컬렉션에 slug를 문서 ID로 사용하여 저장 (중복 방지)
        doc_ref = db.collection("blog_posts").document(slug)
        doc_ref.set(post_data)
        
        print(f"[SUCCESS] 블로그 포스팅 완료! (ID: {slug})")
        print(f"URL: https://stock-trend-program.co.kr/blog/{slug}")
        return True
    except Exception as e:
        print(f"Firestore 저장 중 에러 발생: {e}")
        return False

if __name__ == "__main__":
    print("AI 자체 블로그 포스팅 봇 시작...")
    post_to_firestore()
