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

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
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

def post_to_discord(title, url, tags):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        return
        
    try:
        tag_str = " ".join([f"#{t}" for t in tags])
        
        payload = {
            "username": "주식 기초 선생님",
            "content": f"📈 **[오늘의 주식 이론]**\n새로운 차트 스터디가 업로드 되었습니다!\n자세히 보기: {url}\n\n**{tag_str}**",
            "embeds": [
                {
                    "title": title,
                    "url": url,
                    "color": 15158332,
                    "footer": {
                        "text": "StockTrendProgram 초보자 스터디룸"
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        requests.post(webhook_url, json=payload)
    except Exception as e:
        print(f"Discord 발송 에러: {e}")

THEORY_TOPICS = [
    "이동평균선(Moving Average)의 종류와 골든크로스/데드크로스 실전 매매법",
    "RSI(상대강도지수) 지표를 활용한 과매수/과매도 타점 잡기",
    "볼린저 밴드(Bollinger Bands) 중심선과 상/하단선 돌파 매매 전략",
    "MACD 지표의 원리와 다이버전스(Divergence)를 활용한 추세 전환 포착",
    "일목균형표의 구름대와 기준선/전환선을 이용한 지지와 저항",
    "스토캐스틱(Stochastic)을 이용한 단기 파동 매매 기법",
    "쌍바닥(Double Bottom)과 쌍봉(Double Top) 캔들 패턴의 이해",
    "헤드 앤 숄더(Head and Shoulders) 패턴과 넥라인 돌파 시그널",
    "적삼병과 흑삼병 캔들 패턴으로 보는 강력한 추세 전환 신호",
    "거래량(Volume) 분석의 핵심: 주가와 거래량의 다이버전스 현상",
    "망치형(Hammer)과 교수형(Hanging Man) 캔들이 바닥/상투에서 가지는 의미",
    "갭(Gap) 상승과 갭 하락의 원리와 메우기(Fill the Gap) 전략",
    "피보나치 되돌림(Fibonacci Retracement)을 활용한 눌림목 타점 찾기",
    "OBV(On Balance Volume) 지표를 통한 세력의 매집과 이탈 분석",
    "지지(Support)와 저항(Resistance) 라인 긋는 법과 매물대 분석",
]

def generate_theory_post():
    topic = THEORY_TOPICS[datetime.now().timetuple().tm_yday % len(THEORY_TOPICS)]
    
    prompt = f"""
    당신은 주식 투자를 처음 시작하는 초보자들에게 기술적 분석(차트 보는 법)과 주식 이론을 아주 쉽고 친절하게 알려주는 1타 강사입니다.
    오늘의 교육 주제는 '{topic}' 입니다.

    아래의 가이드라인에 따라 교육 콘텐츠를 작성해주세요:
    1. 도입부: 왜 이 지표(또는 패턴)를 알아야 하는지 초보자 눈높이에서 쉽게 설명.
    2. SVG 차트: 개념을 시각적으로 가장 잘 보여줄 수 있는 아주 깔끔하고 예쁜 SVG 그래픽 차트를 직접 코드로 작성하여 삽입해주세요.
       - 크기는 viewBox="0 0 800 400" 정도로 설정하고 어두운 배경(bg-black/40이나 #1e1e24 등)에 잘 어울리는 색상(형광 파랑, 빨강, 초록 등)을 사용하세요.
       - 차트 안에 축(X, Y), 주요 선명(예: 20일선, 60일선), 진입/청산 타점 표시, 설명 텍스트를 포함해 전문적으로 보이게 만드세요.
       - SVG 코드는 반드시 본문 안에 직접 삽입하세요 (<svg>...</svg>).
    3. 본론: 차트를 보는 방법과 실전에서 매수/매도 타이밍을 잡는 방법을 3가지 포인트로 정리.
    4. 주의할 점 (리스크 관리): 이 지표의 맹점이나 속임수에 당하지 않는 팁.
    5. SEO 메타데이터: 문서 제일 상단에 <title-seo>검색 엔진용 15자 내외 제목</title-seo>를 포함해주세요.
    
    **HTML 포맷팅 규칙**:
    1. 전체 내용은 HTML 태그로 구성하세요 (Markdown 사용 금지).
    2. 큰 제목: `<h2 class="text-3xl font-black text-white pb-2 border-b border-gray-700 mb-8">`
    3. 소제목: `<h3 class="text-2xl font-bold text-blue-400 mt-10 mb-4 border-l-4 border-blue-500 pl-4">`
    4. 일반 텍스트: `<p class="text-gray-300 text-lg leading-relaxed mb-6">`
    5. 중요 강조: `<strong class="text-white bg-blue-900/30 px-1 rounded">`
    6. SVG 차트를 감싸는 박스: `<div class="my-10 p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-center w-full overflow-x-auto"> SVG코드 </div>`
    7. **SEO 내부 링크**: 설명 중 '삼성전자', 'SK하이닉스' 등 한국 주식 종목명이 등장하면 반드시 해당 종목을 <a> 태그로 감싸서 링크를 걸어주세요. 예: `<a href="/stock/005930" class="text-blue-400 font-bold hover:underline">삼성전자</a>`. (종목 코드를 정확히 아는 경우에만)
    8. **주의사항**: 절대로 `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>` 태그를 포함하지 마세요. CSS 코드를 텍스트로 적지 마세요. 오직 본문에 들어갈 내용물(태그)만 반환하세요.
    
    순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=90)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        title = f"[오늘의 차트 스터디] {topic.split('(')[0].split()[0]} 완벽 가이드"
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
            
        words = re.findall(r'[가-힣A-Za-z]+', topic)
        tags = ["주식초보", "차트공부", "주식이론", words[0], "기술적분석"]
        
        return title, content, tags
    except Exception as e:
        print(f"Gemini API 에러: {e}")
        return None, None, None

def post_daily_theory():
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 초기화 실패")
        return
        
    print("오늘의 주식 이론/차트 스터디 콘텐츠 생성 중...")
    title, content, tags = generate_theory_post()
    if not content:
        print("콘텐츠 생성 실패.")
        return
        
    timestamp = datetime.now().strftime("%Y%m%d")
    slug = f"theory-{timestamp}"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "StockTrend 차트 마스터",
        "tags": tags,
        "viewCount": random.randint(100, 300)
    }
    
    try:
        doc_ref = db.collection("theory_posts").document(slug)
        doc_ref.set(post_data)
        
        print(f"[SUCCESS] 글 작성 완료! (ID: {slug})")
        new_url = f"https://stock-trend-program.co.kr/theory/{slug}"
        print(f"URL: {new_url}")
        
        # User requested no discord notifications
        # post_to_discord(title, new_url, tags)
        
        clean_title = title.replace('[오늘의 차트 스터디]', '').strip()
        
        # 텔레그램 발송
        try:
            from telegram_service import send_telegram_teaser
            teaser_msg = f"📚 <b>[주식 1타 강사] 오늘의 차트 스터디 업로드!</b>\n\n주식 초보 탈출을 위한 필수 이론!\n오늘의 주제: <b>{clean_title}</b>\n\n👉 <a href='{new_url}'>무료 강의 보러가기</a>"
            send_telegram_teaser(teaser_msg)
            print("[Telegram] 스터디 알림 발송 완료")
        except Exception as e:
            print(f"[Telegram] 발송 실패: {e}")
            
        # 앱 푸시 알림 발송
        try:
            from firebase_config import send_multicast_notification
            from db_manager import get_all_fcm_tokens
            tokens = get_all_fcm_tokens()
            if tokens:
                push_title = "📚 오늘의 주식 스터디"
                push_body = f"{clean_title} - 초보 탈출 1타 강의가 업로드 되었습니다!"
                push_data = {
                    "type": "theory",
                    "url": f"/theory/{slug}"
                }
                send_multicast_notification(tokens, push_title, push_body, push_data)
                print(f"[FCM] 스터디 푸시 알림 {len(tokens)}명 발송 완료")
        except Exception as e:
            print(f"[FCM] 발송 실패: {e}")
        
        # Google Indexing API 실시간 핑
        try:
            from google_indexer import publish_urls_to_google
            print("Requesting Google Indexing API...")
            publish_urls_to_google([new_url])
        except Exception as e:
            print(f"Google Indexing API 실패: {e}")
            
    except Exception as e:
        print(f"Firestore 저장 에러: {e}")

if __name__ == "__main__":
    post_daily_theory()
