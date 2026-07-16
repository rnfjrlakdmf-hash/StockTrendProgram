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

import requests
from bs4 import BeautifulSoup
from fx_api import get_alpha_vantage_fx

def fetch_index_data(ticker_symbol):
    try:
        # 네이버 금융에서 실시간 지수 가져오기 (KOSPI/KOSDAQ)
        if ticker_symbol == "^KS11":
            url = "https://finance.naver.com/sise/sise_index.naver?code=KOSPI"
        elif ticker_symbol == "^KQ11":
            url = "https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ"
        else:
            # 미국 지수는 기존 yfinance 방식
            t = yf.Ticker(ticker_symbol)
            hist = t.history(period="2d")
            if len(hist) < 2:
                return "데이터 없음"
            close_price = hist['Close'].iloc[-1]
            prev_close = hist['Close'].iloc[-2]
            change_pct = ((close_price - prev_close) / prev_close) * 100
            sign = "+" if change_pct > 0 else ""
            return f"{close_price:,.2f} ({sign}{change_pct:.2f}%)"
            
        res = requests.get(url)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')
        
        now_value = soup.select_one('#now_value').text.strip()
        change_val_str = soup.select_one('#change_value_and_rate').text.strip()
        
        # change_val_str = "12.34 하락 (-1.23%)" 같은 형태
        # 부호 결정을 위해 텍스트 파싱
        if "상승" in change_val_str or "+" in change_val_str:
            sign = "+"
            color_class = "text-red-500" # 한국은 상승이 빨강
        elif "하락" in change_val_str or "-" in change_val_str:
            sign = "-"
            color_class = "text-blue-500"
        else:
            sign = ""
            color_class = "text-gray-300"
            
        # 괄호 안의 퍼센트 추출
        import re
        pct_match = re.search(r'\((.*?)\)', change_val_str)
        pct = pct_match.group(1) if pct_match else "0.00%"
        
        return f"<span class='{color_class} font-bold'>{now_value} ({sign}{pct})</span>"
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

    [출력 형식 및 구조 (반드시 아래 양식을 지켜주세요!)]
    - 가독성을 높이기 위해 텍스트 크기를 키웁니다. 전체를 묶는 최상위 태그는 <div class="prose prose-lg prose-invert max-w-none space-y-6"> 입니다.
    - 첫 줄은 반드시 `<p class="text-gray-300 text-lg">안녕하세요! 마켓 뷰 수석 전략가(관리자)입니다.</p>` 로 시작하세요.
    - 지수 마감 요약(개요)과 일반 본문은 모두 `<p class="text-gray-300 text-lg">...</p>` 태그로 작성하세요. (글자 크기 text-lg 필수)
    - 지수별 세부 분석은 `<h3 class="text-2xl font-bold text-blue-400 mt-6">지수명 마감 분석: <span class="지수데이터그대로삽입">지수데이터</span></h3>` 형태의 제목을 사용하세요. (지수 데이터 색상 보존, 폰트는 text-2xl로 크게)
    - 테마 분석 섹션의 제목은 `<h3 class="text-2xl font-bold text-blue-400 mt-8 mb-4">오늘의 핵심 테마 및 특징주 분석</h3>` 로 하세요.
    - 각 테마별 항목은 `<div>` 또는 `<p class="text-gray-300 text-lg">`로 묶고, 소제목은 `<strong class="text-blue-400 text-xl block mt-4 mb-1">테마 이름:</strong>` 로 파란색을 사용하여 크게 강조하세요.
    - 본문 안에서 긍정적인 내용, 강세 섹터, 중요한 이유는 `<strong class="text-blue-400 text-lg">` 로 파란색 색상을 입혀서 한눈에 들어오도록 강조하세요.
    - 테일윈드 클래스를 적절히 사용하세요. JSON이나 Markdown 코드블록(```html)을 제외하고, 순수한 HTML 텍스트 문자열만 반환하세요.
    """

def generate_market_post(market_type):
    exit_if_holiday(market_type, "Auto Blog Bot")
    
    kst = timezone(timedelta(hours=9))
    today_dt = datetime.now(kst)
    today_str = today_dt.strftime("%Y년 %m월 %d일")
    time_str = today_dt.strftime("%H시 %M분")
    full_date_str = f"{today_str} {time_str} 기준"
    date_id = today_dt.strftime("%Y%m%d")
    
    if market_type == "kor":
        print("[KOR] 국내 증시 데이터 수집 시작...")
        kospi = fetch_index_data("^KS11")
        kosdaq = fetch_index_data("^KQ11")
        fx_dict = get_alpha_vantage_fx()
        fx_rate = f"{fx_dict['price']}원"
        
        try:
            news_items = fetch_google_news("국내 증시 특징주 테마", period="1d")
            news_text = "\n".join([f"- {n['title']}" for n in news_items[:15]]) if news_items else "특이 테마 뉴스 없음"
        except:
            news_text = "뉴스 데이터 수집 실패"
            
        title = f"[국내 마켓 뷰] {today_str} 코스피/코스닥 마감 및 주도 테마 분석"
        prompt = f"""
        당신은 여의도 증권가의 20년 차 수석 투자 전략가(전문가)입니다. 아래 제공된 국내 지수 데이터와 주요 뉴스 헤드라인을 바탕으로,
        오늘의 '국내 증시(코스피/코스닥)' 마감 시황 요약글을 묵직하고 신뢰감 있는 전문가의 톤으로 작성해주세요.

        [중요: 작성 기준일]
        오늘 날짜는 반드시 '{today_str}' 이어야 합니다. 인공지능의 지식 컷오프나 과거 날짜를 임의로 쓰지 말고, 무조건 '{today_str}'을 기준으로 작성하세요.

        [국내 시장 데이터]
        - 코스피 (KOSPI): {kospi}
        - 코스닥 (KOSDAQ): {kosdaq}
        - 원/달러 환율: {fx_rate}

        [오늘의 핵심 테마/특징주 뉴스 헤드라인]
        {news_text}

        작성 가이드:
        1. 맨 첫 줄에 반드시 사람들이 네이버나 구글에 검색할 만한 롱테일 키워드를 포함한 SEO 최적화된 제목(예: "삼성전자 주가 급등 원인 및 {today_str} 국내 증시 시황 AI 요약 (포스코홀딩스 전망 포함)")을 <title-seo>여기에 작성</title-seo> 형태로 출력하세요. 제목과 본문에는 검색 노출이 잘 되는 인기 종목 이름(예: 삼성전자, 에코프로, SK하이닉스 등)을 자연스럽게 1~2개 포함하세요.
        2. 본문 첫 제목은 `<h2 class="text-2xl font-bold text-white pb-2 border-b border-gray-700 mb-6">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
        3. "코스피 (KOSPI) 마감 분석: {kospi}" 와 "코스닥 (KOSDAQ) 마감 분석: {kosdaq}" 라는 명확한 섹션 구분을 두고 분석을 적으세요. 또한, 원/달러 환율({fx_rate}) 변동이 증시나 테마에 미쳤을 영향도 살짝 언급해 전문성을 높이세요.
        4. 핵심 테마 분석은 뉴스 헤드라인을 바탕으로 최소 2~3개의 소주제로 나누어 깊이 있게 설명하세요.
        5. [거미줄 내부 링크] 본문 내용 중에 자연스럽게 사이트 내부로 연결되는 유도 링크를 최소 2개 이상 삽입하세요. (예: `<a href="/discovery" class="text-blue-400 hover:underline">오늘의 실시간 특징주 분석 보러가기</a>`)
        6. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 오늘의 증시 관련 자주 묻는 질문 (FAQ)</h3>` 제목과 함께, 투자자들이 궁금해할 만한 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
        
        **HTML 포맷팅 규칙 및 주의사항**:
        1. 전체 내용은 HTML 태그로 구성하세요 (Markdown 사용 금지). 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
        2. 절대로 `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>` 태그를 포함하지 마세요. 오직 본문에 들어갈 내용물(태그)만 반환하세요.
        
        {get_compliance_prompt()}
        """
        tags = ["국내증시", "시황", "코스피", "코스닥", "마켓뷰"]

    elif market_type == "us":
        print("[US] 미국 증시 데이터 수집 시작...")
        sp500 = fetch_index_data("^GSPC")
        nasdaq = fetch_index_data("^IXIC")
        fx_dict = get_alpha_vantage_fx()
        fx_rate = f"{fx_dict['price']}원"
        
        try:
            news_items = fetch_google_news("미국 증시 나스닥 특징주 테마", period="1d")
            news_text = "\n".join([f"- {n['title']}" for n in news_items[:15]]) if news_items else "특이 테마 뉴스 없음"
        except:
            news_text = "뉴스 데이터 수집 실패"
            
        title = f"[글로벌 마켓 뷰] {today_str} 미 증시 마감 및 핵심 테마 분석"
        prompt = f"""
        당신은 월스트리트 출신의 20년 차 글로벌 수석 투자 전략가(전문가)입니다. 아래 제공된 미국 지수 데이터와 주요 뉴스 헤드라인을 바탕으로,
        간밤의 '미국 증시(S&P 500, 나스닥)' 마감 시황 요약글을 묵직하고 신뢰감 있는 전문가의 톤으로 작성해주세요.

        [중요: 작성 기준일]
        오늘 날짜는 반드시 '{today_str}' 이어야 합니다. 인공지능의 지식 컷오프나 과거 날짜를 임의로 쓰지 말고, 무조건 '{today_str}'을 기준으로 작성하세요.

        [미국 시장 데이터]
        - S&P 500: {sp500}
        - 나스닥 (NASDAQ): {nasdaq}
        - 원/달러 환율: {fx_rate}

        [오늘의 핵심 테마/특징주 뉴스 헤드라인]
        {news_text}

        작성 가이드:
        1. 맨 첫 줄에 반드시 SEO 최적화된 매력적인 제목을 `<title-seo>여기에 작성</title-seo>` 형태로 출력하세요.
        2. 본문 첫 제목은 `<h2 class="text-2xl font-bold text-white pb-2 border-b border-gray-700 mb-6">🚀 [SEO제목 그대로 삽입]</h2>` 로 작성하세요.
        3. "S&P 500 마감 분석: {sp500}" 와 "나스닥 마감 분석: {nasdaq}" 섹션을 나누고, 최근 미국 국채 금리 동향이 증시에 미치는 영향을 전문가 시선으로 한 줄 추가하세요.
        4. 뉴스 헤드라인을 바탕으로 뉴욕 증시 특징주와 글로벌 이슈를 3가지 소주제로 깊이 있게 정리하세요.
        5. [거미줄 내부 링크] 본문 내용 중에 자연스럽게 사이트 내부로 연결되는 유도 링크를 최소 2개 이상 삽입하세요. (예: `<a href="/discovery" class="text-blue-400 hover:underline">오늘의 실시간 특징주 분석 보러가기</a>`)
        6. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 미국 증시 관련 자주 묻는 질문 (FAQ)</h3>` 제목과 함께, 투자자들이 궁금해할 만한 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
        
        **HTML 포맷팅 규칙 및 주의사항**:
        1. 전체 내용은 HTML 태그로 구성하세요 (Markdown 사용 금지). 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
        2. 절대로 `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>` 태그를 포함하지 마세요. 오직 본문에 들어갈 내용물(태그)만 반환하세요.
        
        {get_compliance_prompt()}
        """
        tags = ["미국증시", "시황", "나스닥", "S&P500", "마켓뷰"]
    else:
        raise ValueError("Invalid market type. Use 'kor' or 'us'.")

    print(f"[{market_type.upper()}] Gemini AI 시황 분석 중...")
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        # [SEO] 동적 제목 추출
        import re
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            # 제목 태그 본문에서 제거
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        print(f"Gemini AI 시황 분석 완료! (제목: {title})")
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

def post_to_discord(title, content, url, tags):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        print("[Discord] 웹훅 URL이 설정되어 있지 않습니다.")
        return
        
    try:
        import re
        clean_content = re.sub(r'<[^>]*>?', '', content)
        description = clean_content[:200] + "..."
        
        tag_str = " ".join([f"#{t}" for t in tags])
        
        payload = {
            "username": "AI 마켓 뷰",
            "content": f"📰 **[새로운 시황 브리핑 업로드]**\n자세히 보기: {url}",
            "embeds": [
                {
                    "title": title,
                    "description": f"{description}\n\n**{tag_str}**",
                    "url": url,
                    "color": 3447003, # 파란색 계열
                    "footer": {
                        "text": "StockTrendProgram AI 리포트 자동 발행"
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        res = requests.post(webhook_url, json=payload)
        if res.status_code in [200, 204]:
            print("[Discord] 디스코드 자동 발행 성공!")
        else:
            print(f"[Discord] 발행 실패: {res.status_code} {res.text}")
    except Exception as e:
        print(f"[Discord] 에러 발생: {e}")

def ping_indexnow(url):
    try:
        from google_indexer import publish_urls_to_google
        publish_urls_to_google([url])
        print(f"[SEO] Google Indexing API 핑 전송 완료: {url}")
    except Exception as e:
        print(f"[SEO] 핑 에러: {e}")

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
        
        # --- 푸시 알림 발송 로직 시작 ---
        try:
            from firebase_config import send_multicast_notification
            
            # Firestore에서 fcm_tokens 모두 가져오기
            tokens_ref = db.collection("fcm_tokens").stream()
            tokens = []
            for doc_snap in tokens_ref:
                t = doc_snap.to_dict().get("token")
                if t:
                    tokens.append(t)
            
            if tokens:
                push_title = f"📢 [시황 요약] {title}"
                # 본문은 간단하게 요약 (HTML 태그 제거)
                import re
                clean_body = re.sub(r'<[^>]*>?', '', content)
                push_body = clean_body[:100] + "..."
                
                print(f"[푸시 발송] {len(tokens)}명에게 알림 발송 중...")
                send_multicast_notification(
                    tokens=tokens,
                    title=push_title,
                    body=push_body,
                    data={"url": f"/blog/{slug}", "type": "blog_alert"}
                )
        except Exception as push_err:
            print(f"[푸시 발송 에러]: {push_err}")
        # --- 푸시 알림 발송 로직 끝 ---
        
        # --- 디스코드 자동 발행 로직 ---
        post_url = f"https://stock-trend-program.co.kr/blog/{slug}"
        post_to_discord(title, content, post_url, tags)
        
        # --- SEO 핑 로직 ---
        ping_indexnow(post_url)
        
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
