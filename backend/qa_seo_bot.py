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
    "CB(전환사채)와 BW(신주인수권부사채) 호재 악재 구분",
    "스팩(SPAC) 주식 투자 방법과 원금 보장",
    "금리 인상과 인하가 주식 시장에 미치는 영향",
    "자사주 매입과 배당의 차이점 - 주주 환원 정책",
    "액면분할과 액면병합이 주가와 기업 가치에 미치는 실제 영향",
    "인덱스 펀드와 액티브 펀드의 승률 비교",
    "환노출(UH)과 환헤지(H) ETF 상품 선택 가이드",
    "증거금률과 미수금 - 레버리지 투자의 양날의 검",
    "옵션 만기일과 쿼드러플 위칭데이 주가 변동성 대비",
    "관리종목 지정 사유와 상장폐지 피하는 5가지 팁",
    "무상감자와 유상증자가 주가에 미치는 치명적 영향",
    "미국 배당주 배당소득세 15% 원천징수와 종합소득세",
    "워런 버핏의 가치투자 철학 10가지 원칙",
    "피터 린치의 텐배거(10루타) 주식 발굴 비법",
    "나심 탈레브의 블랙스완 이론과 포트폴리오 방어",
    "주식 투자 심리학 - 손실회피 편향 극복하기",
    "분할 매수와 분할 매도 - 리스크 관리의 정석",
    "달러 코스트 애버리징(DCA) 정기 적립식 투자법",
    "포트폴리오 분산 투자 - 60/40 자산 배분 전략",
    "코어-새틀라이트 전략 - 안정적 수익과 알파 수익 창출",
    "손절매(Stop Loss) 기준 설정과 원칙 지키기",
    "물타기와 불타기 - 올바른 추가 매수 타이밍",
    "테마주 투자 전략 - 뉴스 수혜주 선점 기법",
    "턴어라운드(Turnaround) 투자 - 실적 개선 기업 찾기",
    "52주 신고가 및 신저가 종목 돌파 매매 전략",
    "외국인, 기관, 개인 수급 분석 - 스마트 머니 추종하기",
    "대차잔고와 대주잔고로 공매도 세력 파악하는 법",
    "신용잔고비율이 주가에 미치는 영향과 반대매매 공포",
    "세력주 포착법 - 거래량 폭발과 매집 흔적 찾기",
    "프로그램 매매 차익거래와 비차익거래 완벽 이해",
    "선물/옵션 만기일(네 마녀의 날) 증시 영향",
    "금리와 주가의 상관관계 - 고금리 시대 투자법",
    "환율(원달러)이 국내 수출주와 수입주에 미치는 영향",
    "인플레이션 방어주 - 물가 상승기에 강한 주식들",
    "경기 침체(리세션) 신호를 알려주는 장단기 금리차",
    "미국 연준(Fed) FOMC 점도표 읽는 법과 증시 영향",
    "VIX(공포지수)를 활용한 역발상 투자 전략",
    "섹터 로테이션 전략 - 경기 사이클별 주도주 찾기",
    "미국 국채 10년물 금리가 기술주에 미치는 영향",
    "반도체 밸류체인 완전 정복 - 팹리스, 파운드리, 소부장",
    "2차전지 배터리 산업 구조와 양극재/음극재 이해",
    "바이오/제약주 투자 - 임상 1상, 2상, 3상의 의미",
    "플랫폼/인터넷 기업 밸류에이션 - MAU, ARPU 지표",
    "건설/부동산 주식과 정부 정책 및 금리의 관계",
    "금융주(은행, 보험) 투자 - NIM과 예대마진 이해",
    "방위산업/우주항공 테마주 - 글로벌 지정학 리스크 수혜",
    "DART 전자공시시스템 100% 활용 실전 팁",
    "유상증자(주주배정, 제3자배정) 공시 해석과 주가 방향",
    "사업보고서 읽는 법 - 재무제표와 주석 숨은 의미",
    "대주주 및 임원 지분 변동 공시가 의미하는 바",
    "자사주 매입 및 소각 공시 - 강력한 주가 상승 촉매",
    "단기과열종목 지정 예고 및 해제 시 주가 흐름",
    "주식 배당주 투자 시 주의할 배당 함정(Dividend Trap)",
    "ETF 분배금(배당금) 받는 방법과 TR(토탈리턴) ETF 차이",
    "미국 채권 ETF 종류(TLT, SHY)와 금리 인하 수혜",
    "커버드콜 ETF 원리와 장단점 - 고배당의 진실",
    "레버리지 2X, 3X ETF 투자의 양날의 검과 복리 효과",
    "인버스 ETF로 하락장에서 수익 내는 방법",
    "리츠(REITs) 투자를 통한 부동산 간접 투자와 배당",
    "BDI(발틱운임지수)와 해운주 주가의 상관관계",
    "국제 유가(WTI) 변동이 정유주와 항공주에 미치는 영향",
    "구리 가격(닥터 코퍼)으로 글로벌 경기 예측하기",
    "금(Gold) 가격 상승 원리와 금 관련주 투자법",
    "비트코인 등 가상화폐 테마주와 블록체인 관련주",
    "미국 주식 서머타임 적용과 거래 시간 변경",
    "다우존스, 나스닥, S&P 500 지수의 차이점",
    "코스피 200 지수 편입 및 편출이 주가에 미치는 영향",
    "MSCI 리밸런싱 지수 편입에 따른 외국인 패시브 자금 유입",
    "보호예수(락업) 해제일이 주가 폭락을 부르는 이유",
    "우선주와 보통주의 차이점 - 괴리율을 활용한 투자법",
    "스톡옵션 행사와 오버행 이슈가 주가에 미치는 악영향",
    "배당 성장주 투자 - 오랜 기간 배당을 늘려온 배당 귀족주",
    "주식 스플릿(액면분할) 직후 주가가 단기 급락하는 이유",
    "기업 분할(인적분할 vs 물적분할)이 소액주주에게 미치는 영향",
    "공개매수(Tender Offer)의 뜻과 주가 급등 원리",
    "상장폐지 실질심사 대상과 정리매매 기간 주의사항",
    "자본잠식의 뜻과 관리종목 편입 위험 피하는 법",
    "주식 담보대출 반대매매 원리와 하락장 대응 전략",
    "증권사 리포트 제대로 읽는 법과 매수 의견의 진실",
    "주식시장 동시호가 제도 완벽 이해와 허수 주문 판별법"
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
    4. [거미줄 내부 링크] 본문 내용 중에 사이트 내부로 연결되는 유도 링크를 삽입하세요. 단, 링크(href) 주소는 반드시 다음 중 하나만 사용해야 합니다 (절대 임의의 링크를 만들지 마세요): `/discovery` (특징주 분석), `/theory` (주식 강의), `/theme` (테마주 분석), `/premium` (프리미엄 리포트).
       (예: `<a href="https://stock-trend-program.co.kr/theory" class="text-blue-400 hover:underline">더 많은 주식 기초 이론 보러가기</a>`)
    5. [검색결과 면적 장악] 본문 마지막에 무조건 `<h3 class="text-2xl font-bold mt-8 mb-4">💡 {topic} 관련 추가 Q&A</h3>` 제목과 함께, 이 주제에 대해 사람들이 흔히 착각하거나 더 궁금해할 질문과 답변(Q&A) 3세트를 구체적으로 작성하세요.
    
    [⚠️ 필수 준수 사항]
    - 특정 종목 매수/매도 추천 금지
    - 순수한 HTML 텍스트만 반환하고 markdown 틱(```html)은 제외하세요.
    - <div>, <h2>, <p> 태그를 이용해 깔끔하게 작성하세요.
    - `<!DOCTYPE>`, `<html>`, `<body>`, `<head>`, `<style>` 태그 절대 금지.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=60, models_to_try=["gemini-3.5-flash-lite"])
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
    
    # 중복 방지 로직: 이미 작성된 주제 필터링
    existing_docs = db.collection("theory_posts").where("slug", ">=", "qa-seo-").where("slug", "<", "qa-seo-" + "\uf8ff").stream()
    published_topics = set()
    for doc in existing_docs:
        data = doc.to_dict()
        title = data.get("title", "")
        # 제목이 "{topic} 완벽 정리" 형식으로 저장됨을 활용하여 원본 topic 유추
        # 또는 단순히 QA_TOPICS 내의 주제가 제목에 포함되어 있는지 확인
        for topic in QA_TOPICS:
            if topic in title:
                published_topics.add(topic)

    available_topics = [t for t in QA_TOPICS if t not in published_topics]
    
    if len(available_topics) < 1:
        print(f"작성 가능한 새로운 주제가 부족합니다. (남은 주제: {len(available_topics)}개). 초기화하거나 스킵합니다.")
        # 만약 전부 작성했다면 다시 전체 풀에서 시작 (또는 종료)
        available_topics = QA_TOPICS
        
    # 1개의 주제를 랜덤으로 선택 (90일 중복 방지 위해 1개씩만 발행)
    selected_topics = random.sample(available_topics, 1)
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
            db.collection("theory_posts").document(slug).set(post_data)
            post_url = f"https://stock-trend-program.co.kr/theory/{slug}"
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
