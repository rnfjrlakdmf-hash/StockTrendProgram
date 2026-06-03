import os
import json
import uuid
import yfinance as yf
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from ai_analysis import generate_with_retry

# 환경 변수 로드
load_dotenv()

# Firebase 초기화 (한 번만 실행되도록 처리)
def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK 초기화 성공 (Service Account Key 사용)")
            else:
                firebase_admin.initialize_app()
                print("Firebase Admin SDK 초기화 성공 (기본 자격 증명 사용)")
        except Exception as e:
            print(f"Firebase 초기화 에러: {e}")
            print("자체 블로그 포스팅을 위해 Firebase Service Account Key가 필요합니다.")

def fetch_index_data(ticker_symbol):
    try:
        t = yf.Ticker(ticker_symbol)
        hist = t.history(period="2d")
        if len(hist) < 2:
            return "데이터 없음"
        
        close_price = hist['Close'].iloc[-1]
        prev_close = hist['Close'].iloc[-2]
        change_pct = ((close_price - prev_close) / prev_close) * 100
        
        sign = "+" if change_pct > 0 else ""
        return f"{close_price:,.2f} ({sign}{change_pct:.2f}%)"
    except Exception as e:
        print(f"Index fetch error for {ticker_symbol}: {e}")
        return "데이터 확인 불가"

def get_market_summary():
    """
    실제 시장 데이터를 yfinance로 수집하고, Gemini AI를 호출하여 시황(국내/해외)을 생성합니다.
    (유사투자자문업 법적 준수 사항 엄격 적용)
    """
    print("시장 데이터(국내/미국 지수) 수집 중...")
    kospi = fetch_index_data("^KS11")
    kosdaq = fetch_index_data("^KQ11")
    sp500 = fetch_index_data("^GSPC")
    nasdaq = fetch_index_data("^IXIC")
    
    print(f"KOSPI: {kospi}, KOSDAQ: {kosdaq}, S&P500: {sp500}, NASDAQ: {nasdaq}")

    # KST (한국 시간) 기준
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    date_id = today_dt.strftime("%Y%m%d")
    
    title = f"[마켓 뷰] {today_str} 국내 및 글로벌 증시 핵심 요약"
    
    prompt = f"""
    당신은 객관적인 금융 데이터 분석가입니다. 아래 제공된 지수 데이터를 바탕으로,
    오늘의 '국내 증시'와 '미국 증시' 시황 요약글을 작성해주세요. 
    (데이터가 부족하더라도 일반적인 시장의 분위기를 객관적으로 유추하여 작성할 것)

    [시장 데이터]
    - 코스피 (KOSPI): {kospi}
    - 코스닥 (KOSDAQ): {kosdaq}
    - S&P 500: {sp500}
    - 나스닥 (NASDAQ): {nasdaq}

    [⚠️ 매우 중요: 유사투자자문업 법적 준수 사항 ⚠️]
    1. 특정 종목(주식)에 대한 매수/매도 추천, 목표가, 손절가 제시는 절대 불법이므로 엄격히 금지합니다.
    2. "추천", "매수", "수익 보장", "무조건 오릅니다" 등의 자극적인 투자 유도 단어를 절대 사용하지 마세요.
    3. 대신 "시장 관심 집중", "외국인/기관 수급 유입", "강세 흐름", "섹터 부각" 등의 객관적이고 건조한 단어를 사용하세요.
    4. 글의 최하단에는 반드시 다음 면책 조항(Disclaimer)을 포함하세요:
       "본 리포트는 시장 데이터를 바탕으로 단순 요약한 정보 제공 목적의 글입니다. 어떠한 경우에도 주식의 매수/매도를 추천하지 않으며, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다."

    [출력 형식: HTML]
    - Next.js 프론트엔드 (Tailwind CSS)에 렌더링하기 좋은 형태로 만들어주세요.
    - <div>, <h2>, <h3>, <ul>, <li>, <p>, <strong> 태그를 적절히 사용하세요.
    - 테일윈드 클래스는 'text-gray-300', 'text-blue-400', 'font-bold' 등을 적절히 섞어주세요.
    - 전체를 묶는 최상위 태그는 <div class="prose prose-invert max-w-none space-y-6"> 입니다. 인사말은 "안녕하세요! 주식 분석기 관리자입니다." 로 통일하세요.
    - 제목(h2)은 "🚀 {today_str} 국내/글로벌 증시 마감 요약" 으로 해주세요.

    JSON이나 Markdown 코드블록(```html)을 제외하고, 순수한 HTML 텍스트 문자열만 반환하세요.
    """

    print("Gemini AI 시황 분석 중 (안전장치 적용)...")
    try:
        # JSON 모드 끄고 HTML 텍스트 받기
        response = generate_with_retry(prompt, json_mode=False, timeout=60)
        content = response.text
        
        # 만약 AI가 ```html 등의 마크다운을 붙였다면 제거
        content = content.replace("```html", "").replace("```", "").strip()
        print("Gemini AI 시황 분석 완료!")
    except Exception as e:
        print(f"Gemini API 호출 에러: {e}")
        # 실패 시 Fallback 메시지 (법적 조항 포함)
        content = f"""
        <div class="prose prose-invert max-w-none space-y-6">
            <h2 class="text-2xl font-bold text-white pb-2">🚀 {today_str} 증시 마감 요약</h2>
            <p class="text-gray-300">현재 데이터 수집 지연으로 인해 상세 시황을 불러오지 못했습니다.</p>
            <p class="text-gray-400 text-sm mt-8 border-t border-gray-700 pt-4">본 리포트는 시장 데이터를 바탕으로 단순 요약한 정보 제공 목적의 글입니다. 어떠한 경우에도 주식의 매수/매도를 추천하지 않으며, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.</p>
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
    
    # 시간까지 포함해서 고유 ID 생성 (하루에 여러 번 테스트할 수도 있으므로)
    # 실제 운영 시에는 date_id 만 쓰거나 중복 덮어쓰기
    timestamp = datetime.now().strftime("%H%M%S")
    slug = f"{date_id}-{timestamp}-market-view"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "관리자",
        "tags": ["시황", "국내증시", "미국증시", "마켓뷰"],
        "viewCount": 0
    }
    
    try:
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
