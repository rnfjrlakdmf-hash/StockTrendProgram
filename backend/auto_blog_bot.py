import os
import sys
import uuid
import yfinance as yf
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from ai_analysis import generate_with_retry
from stock_data import fetch_google_news
from holiday_checker import exit_if_holiday

# 환경 변수 로드
load_dotenv()

# Firebase 초기화
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

def get_compliance_prompt():
    """유사투자자문업 법적 준수 사항 공통 프롬프트"""
    return """
    [⚠️ 매우 중요: 유사투자자문업 법적 준수 사항 및 작성 규칙 ⚠️]
    1. 특정 종목(주식)에 대한 매수/매도 추천, 목표가, 손절가 제시는 절대 불법이므로 엄격히 금지합니다.
    2. "추천", "매수", "수익 보장", "무조건 오릅니다" 등의 자극적인 투자 유도 단어를 절대 사용하지 마세요.
    3. 대신 "시장 관심 집중", "외국인/기관 수급 유입", "강세 흐름", "섹터 부각" 등의 객관적이고 전문적인 단어를 사용하세요.
    4. 글 내용 중에 'AI', '인공지능', '봇', '알고리즘' 등의 단어를 절대 사용하지 마세요. 마치 진짜 인간 전문가가 직접 통찰력을 발휘해 작성한 것처럼 묵직하고 신뢰감 있는 톤(전문가 포스)으로 작성하세요.
    5. 글의 최하단에는 반드시 다음 면책 조항(Disclaimer)을 포함하세요:
       "본 리포트는 객관적인 시장 데이터를 바탕으로 단순 요약한 정보 제공 목적의 글입니다. 어떠한 경우에도 주식의 매수/매도를 추천하지 않으며, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다."

    [출력 형식: HTML]
    - Next.js 프론트엔드 (Tailwind CSS)에 렌더링하기 좋은 형태로 만들어주세요.
    - <div>, <h2>, <h3>, <ul>, <li>, <p>, <strong> 태그를 적절히 사용하세요.
    - 테일윈드 클래스는 'text-gray-300', 'text-blue-400', 'font-bold' 등을 적절히 섞어주세요.
    - 전체를 묶는 최상위 태그는 <div class="prose prose-invert max-w-none space-y-6"> 입니다. 인사말은 "안녕하세요! 마켓 뷰 수석 전략가(관리자)입니다." 로 통일하세요.
    JSON이나 Markdown 코드블록(```html)을 제외하고, 순수한 HTML 텍스트 문자열만 반환하세요.
    """

def generate_market_post(market_type):
    exit_if_holiday(market_type, "Auto Blog Bot")
    
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    date_id = today_dt.strftime("%Y%m%d")
    
    if market_type == "kor":
        print("[KOR] 국내 증시 데이터 수집 시작...")
        kospi = fetch_index_data("^KS11")
        kosdaq = fetch_index_data("^KQ11")
        
        try:
            news_items = fetch_google_news("국내 증시 특징주 테마", period="1d")
            news_text = "\n".join([f"- {n['title']}" for n in news_items[:15]]) if news_items else "특이 테마 뉴스 없음"
        except:
            news_text = "뉴스 데이터 수집 실패"
            
        title = f"[국내 마켓 뷰] {today_str} 코스피/코스닥 마감 및 주도 테마 분석"
        prompt = f"""
        당신은 여의도 증권가의 20년 차 수석 투자 전략가(전문가)입니다. 아래 제공된 국내 지수 데이터와 주요 뉴스 헤드라인을 바탕으로,
        오늘의 '국내 증시(코스피/코스닥)' 마감 시황 요약글을 묵직하고 신뢰감 있는 전문가의 톤으로 작성해주세요.

        [국내 시장 데이터]
        - 코스피 (KOSPI): {kospi}
        - 코스닥 (KOSDAQ): {kosdaq}

        [오늘의 핵심 테마/특징주 뉴스 헤드라인]
        {news_text}

        위 헤드라인들을 반드시 참고하여, 오늘 국내 시장을 주도했던 핵심 테마와 상승/하락의 주요 원인을 '전문가의 시각'으로 분석해서 글 내용에 풍성하게 포함해 주세요.
        제목(h2)은 "🚀 {today_str} 국내 증시 마감 요약" 으로 해주세요.
        {get_compliance_prompt()}
        """
        tags = ["국내증시", "시황", "코스피", "코스닥", "마켓뷰"]

    elif market_type == "us":
        print("[US] 미국 증시 데이터 수집 시작...")
        sp500 = fetch_index_data("^GSPC")
        nasdaq = fetch_index_data("^IXIC")
        
        try:
            news_items = fetch_google_news("미국 증시 나스닥 특징주 테마", period="1d")
            news_text = "\n".join([f"- {n['title']}" for n in news_items[:15]]) if news_items else "특이 테마 뉴스 없음"
        except:
            news_text = "뉴스 데이터 수집 실패"
            
        title = f"[글로벌 마켓 뷰] {today_str} 미 증시 마감 및 핵심 테마 분석"
        prompt = f"""
        당신은 월스트리트 출신의 20년 차 글로벌 수석 투자 전략가(전문가)입니다. 아래 제공된 미국 지수 데이터와 주요 뉴스 헤드라인을 바탕으로,
        간밤의 '미국 증시(S&P 500, 나스닥)' 마감 시황 요약글을 묵직하고 신뢰감 있는 전문가의 톤으로 작성해주세요.

        [미국 시장 데이터]
        - S&P 500: {sp500}
        - 나스닥 (NASDAQ): {nasdaq}

        [오늘의 핵심 테마/특징주 뉴스 헤드라인]
        {news_text}

        위 헤드라인들을 반드시 참고하여, 간밤 미국 시장을 주도했던 핵심 테마와 상승/하락의 주요 원인을 '전문가의 시각'으로 분석해서 글 내용에 풍성하게 포함해 주세요.
        제목(h2)은 "🚀 {today_str} 미국 증시 마감 요약" 으로 해주세요.
        {get_compliance_prompt()}
        """
        tags = ["미국증시", "시황", "나스닥", "S&P500", "마켓뷰"]
    else:
        raise ValueError("Invalid market type. Use 'kor' or 'us'.")

    print(f"[{market_type.upper()}] Gemini AI 시황 분석 중...")
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60)
        content = response.text.replace("```html", "").replace("```", "").strip()
        print("Gemini AI 시황 분석 완료!")
    except Exception as e:
        print(f"Gemini API 호출 에러: {e}")
        content = f"""
        <div class="prose prose-invert max-w-none space-y-6">
            <h2 class="text-2xl font-bold text-white pb-2">🚀 {today_str} 증시 마감 요약</h2>
            <p class="text-gray-300">현재 데이터 수집 지연으로 인해 상세 시황을 불러오지 못했습니다.</p>
            <p class="text-gray-400 text-sm mt-8 border-t border-gray-700 pt-4">본 리포트는 객관적인 시장 데이터를 바탕으로 단순 요약한 정보 제공 목적의 글입니다. 어떠한 경우에도 주식의 매수/매도를 추천하지 않으며, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.</p>
        </div>
        """
        
    return date_id, title, content, tags

def post_to_firestore(market_type):
    init_firebase()
    
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 클라이언트를 가져오지 못했습니다. 키 설정을 확인해주세요.")
        return False

    date_id, title, content, tags = generate_market_post(market_type)
    
    timestamp = datetime.now().strftime("%H%M%S")
    slug = f"{date_id}-{timestamp}-{market_type}-market-view"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "관리자",
        "tags": tags,
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
    if len(sys.argv) < 2:
        print("사용법: python auto_blog_bot.py [kor|us]")
        print("예시: python auto_blog_bot.py kor")
        sys.exit(1)
        
    market = sys.argv[1].lower()
    if market not in ["kor", "us"]:
        print("오류: 인자는 'kor' 또는 'us'만 가능합니다.")
        sys.exit(1)
        
    print(f"AI 전문가 시황 포스팅 봇 시작... (모드: {market.upper()})")
    post_to_firestore(market)
