import os
import sys
import uuid
import yfinance as yf
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import requests

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from ai_analysis import generate_with_retry
from stock_data import fetch_google_news
from holiday_checker import exit_if_holiday

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK 초기화 성공")
            else:
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"Firebase 초기화 에러: {e}")

def get_compliance_prompt():
    return """
    [⚠️ 매우 중요: 작성 규칙 ⚠️]
    1. 이 글은 특정 종목(주식)에 대한 매수/매도 추천을 하지 않습니다.
    2. "추천", "매수", "수익 보장", "목표가", "손절가" 등의 자극적인 단어나 특정 가격을 제시하는 행위를 절대 금지합니다. 오직 "수급 유입", "모멘텀 부각", "기술적 반등" 같은 객관적 서술만 사용하세요.
    3. 'AI', '인공지능' 단어 금지. 전문 애널리스트가 작성한 묵직한 톤 유지.
    4. 당신이 작성하는 글 중간중간에 해당 주식의 이름이 들어갈 때는 반드시 다음과 같이 HTML 링크로 감싸세요:
       예시: <a href="https://stock-trend-program.co.kr/stock/{TICKER}" class="font-bold text-blue-400 hover:underline">{STOCK_NAME}</a>
       이것은 SEO를 위한 내부 거미줄 링킹(Internal Linking)입니다. 글 전체에서 최소 3~5번 자연스럽게 링크가 등장하도록 하세요.
    5. 마지막에 면책 조항을 포함:
       "본 리포트는 객관적 데이터를 바탕으로 한 정보 제공 목적이며, 투자의 최종 책임은 본인에게 있습니다."
    
    출력은 반드시 <div>...</div> 로 감싸진 깔끔한 HTML이어야 합니다. <h2>, <p>, <ul> 태그를 적절히 사용하세요.
    """

def get_trending_stocks():
    return [
        {"name": "삼성전자", "ticker": "005930"},
        {"name": "SK하이닉스", "ticker": "000660"},
        {"name": "에코프로", "ticker": "086520"}
    ]

def ping_search_engines(url):
    try:
        requests.get(f"https://www.google.com/ping?sitemap=https://stock-trend-program.co.kr/sitemap.xml", timeout=5)
    except:
        pass

def main():
    print("🚀 Auto Blog Bot V2 (Trend Targeted) Started")
    if exit_if_holiday():
        return

    init_firebase()
    db = firestore.client()

    kst = timezone(timedelta(hours=9))
    now = datetime.now(kst)
    date_str = now.strftime("%Y%m%d-%H%M%S")
    display_date = now.strftime("%Y년 %m월 %d일")

    trending_stocks = get_trending_stocks()

    for stock in trending_stocks:
        name = stock['name']
        ticker = stock['ticker']
        print(f"\\n[{name}] 포스팅 생성 중...")

        # 1. 뉴스 데이터 가져오기
        news = fetch_google_news(f"{name} 특징주 OR 주가 OR 전망", max_results=3)
        news_text = "\\n".join([f"- {n['title']} ({n['source']})" for n in news]) if news else "최신 뉴스 없음"

        # 2. 프롬프트 생성
        prompt = f"""
        당신은 주식 시장 전문 전략가입니다.
        오늘({display_date}) 시장에서 가장 뜨거운 관심을 받고 있는 종목인 '{name}'에 대한 심층 분석 리포트를 작성하세요.

        [최신 뉴스 요약]
        {news_text}

        [작성 지침]
        {get_compliance_prompt().replace('{STOCK_NAME}', name).replace('{TICKER}', ticker)}
        
        글 제목은 반드시 [급등주 분석] 또는 [특징주 리포트] 로 시작하여 사람들의 클릭을 유도할 수 있게 60자 이내로 매력적으로 지어주세요.
        출력은 다음 JSON 형식으로만 응답하세요:
        {{
            "title": "글 제목",
            "content": "HTML 형태의 본문 (<div>...</div>)"
        }}
        """

        # 3. AI 글 작성
        try:
            import json
            response_text = generate_with_retry(prompt, model_name="gemini-1.5-pro", temperature=0.7)
            clean_text = response_text.replace("```json", "").replace("```html", "").replace("```", "").strip()
            result = json.loads(clean_text)
            title = result['title']
            content = result['content']
            
            cta_html = f"""
            <div class="mt-8 mb-4 p-6 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl text-center shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
                <div class="inline-block bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-3 animate-pulse">HOT</div>
                <h3 class="text-xl font-bold text-white mb-2">🔥 내일 {name} 주가, 오를까 내릴까?</h3>
                <p class="text-indigo-200 text-sm mb-5">AI의 확률 분석을 확인하고, 다른 개미 투자자들의 생각에 투표해보세요!</p>
                <a href="https://stock-trend-program.co.kr/game" class="inline-block bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/30 transition-colors">
                    AI 주가 예측 게임 참여하기 🚀
                </a>
            </div>
            """
            
            if "</div>" in content:
                content = content.rsplit("</div>", 1)[0] + cta_html + "</div>"
            else:
                content += cta_html

        except Exception as e:
            print(f"AI 생성 또는 파싱 실패 ({name}): {e}")
            continue

        # 4. DB 저장
        doc_id = f"{date_str}-{ticker}-targeted"
        doc_ref = db.collection("blog_posts").document(doc_id)
        
        post_data = {
            "title": title,
            "content": content,
            "author": "마켓 뷰 전략가",
            "createdAt": now.isoformat(),
            "category": "특징주 분석",
            "tags": [name, "주가전망", "특징주"],
            "views": 0
        }
        
        doc_ref.set(post_data)
        print(f"[SUCCESS] {name} 포스팅 완료! ID: {doc_id}")
        
        # 5. 검색엔진 핑
        post_url = f"https://stock-trend-program.co.kr/blog/{doc_id}"
        ping_search_engines(post_url)
        print(f"Ping 전송: {post_url}")

if __name__ == "__main__":
    main()
