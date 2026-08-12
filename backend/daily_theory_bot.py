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

# 주제 카테고리 분류 (프롬프트 최적화용)
CHART_TOPICS = [
    "이동평균선(Moving Average) 골든크로스/데드크로스 실전 매매",
    "RSI(상대강도지수) 다이버전스를 활용한 과매수·과매도 타점 잡기",
    "볼린저 밴드(Bollinger Bands) 스퀴즈와 상단 돌파 매매",
    "MACD 오실레이터 교차를 활용한 추세 전환 포착",
    "일목균형표 구름대 돌파와 후행스팬을 이용한 지지·저항",
    "스토캐스틱(Stochastic) %K, %D 교차 단기 파동 매매 기법",
    "쌍바닥(Double Bottom) 짝궁뎅이 패턴의 실전 매수 타점",
    "헤드 앤 숄더(Head and Shoulders) 패턴 넥라인 이탈 시그널",
    "적삼병과 흑삼병 캔들 패턴 - 강력한 추세 전환의 징조",
    "거래량(Volume) 분석의 핵심 - 세력의 매집과 이탈 읽기",
    "망치형(Hammer)과 역망치형 캔들이 바닥권에서 가지는 의미",
    "갭(Gap) 상승과 갭 하락 - 돌파 갭과 소멸 갭 메우기 전략",
    "피보나치 되돌림(Fibonacci Retracement) 황금비율 눌림목 타점",
    "OBV(On Balance Volume) 지표와 주가 다이버전스 분석",
    "매물대 차트 분석 - 첩첩산중 악성 매물대 돌파 확인",
    "5일선, 20일선(생명선), 60일선(수급선) 이평선 100% 활용법",
    "이동평균선 정배열과 역배열 - 추세 추종 스윙 매매 전략",
    "20일선 눌림목 매매 - N자형 반등 타점 잡는 실전 기법",
    "캔들차트 기초 - 양봉, 음봉, 꼬리의 의미 완벽 해석",
    "장대양봉과 장대음봉 - 강력한 추세 출발과 종료 신호",
    "도지(Doji) 캔들과 십자성 패턴 - 상승/하락 추세 전환 시그널",
    "샛별형(Morning Star) 캔들 패턴의 완벽한 반전 신호",
    "장악형(Engulfing) 캔들 - 가장 강력한 상승/하락 반전 패턴",
    "삼각수렴(Triangle) 돌파 매매 - 상승/하락/대칭 삼각형",
    "컵 앤 핸들(Cup & Handle) 윌리엄 오닐의 급등 패턴",
    "상승 채널(Channel) 박스권 상하단 핑퐁 스윙 매매 기법",
    "CCI(상품채널지수)로 과매수/과매도 사이클 고점 저점 찾기",
    "ATR(평균진폭)으로 일간 변동성을 측정하고 손절 기준 잡기",
    "VWAP(거래량가중평균가격) 기관 평단가 추정 트레이딩",
    "엘리어트 파동이론 - 5파 상승 3파 하락 파동 카운팅 원리",
    "엔벨로프(Envelope) 하단 이탈 시 바닥권 급등주 포착 기법",
    "다바스 박스이론(Darvas Box) 신고가 돌파 트레이딩",
    "이격도(Disparity)를 활용한 20일선 괴리율 과열 침체 진단",
    "TRIX 지표를 이용한 장기 추세 변곡점 찾는 법",
    "소나(Sonar) 지표 크로스로 추세의 강도 예측하기",
    "헤이킨 아시(Heikin Ashi) 캔들 차트로 노이즈 제거하고 추세 타기",
    "그물망 차트(이평선 밀집) 돌파 폭등 시그널 포착 전략",
    "깃발형(Flag)과 페넌트형 패턴 - 급등 중 쉬어가는 돌파 매매",
    "RSI와 MACD 결합 이중 보조지표 크로스체크 타점 잡기",
    "거래량 회전율 급증과 주가 변동성 폭발의 상관관계 분석",
    "디마크(DeMark) 지표를 활용한 단기 트레이딩 지지 저항선 설정",
    "피봇 포인트(Pivot Point) 당일 단타 중심선 매매 기법",
    "파라볼릭 SAR 지표를 활용한 추세 추종 트레일링 스탑 설정",
    "DMI와 ADX 지표로 상승/하락 추세 강도 수치로 확인하기",
    "윌리엄스 %R 지표로 단기 과매수 과매도 스캘핑 타점 잡기",
    "MFI(머니플로우인덱스) 거래량 동반 자금 유입 유출 감지",
    "하이킨 아시 차트를 활용한 역추세 매매 피하기",
    "갭 런어웨이(Runaway Gap) 급등주 따라잡기 매매",
    "역헤드 앤 숄더(Inverse H&S) 강력한 바닥권 상승 반전 패턴",
    "쌍봉(Double Top) 천장 패턴 이탈 시 폭락 회피 전략",
    "원형 바닥형(Rounding Bottom) 긴 횡보 후 대상승 초입 잡기",
    "이동평균선 수렴 후 확산 - 에너지 응축 후 대시세 분출 시그널",
    "캔들 꼬리 길이로 판단하는 매도세와 매수세의 힘겨루기",
    "갭(Gap) 메우기 이론 - 주가는 왜 빈 공간을 채우려 하는가?",
    "상승 잉태형(Harami) 캔들 패턴 - 하락세 둔화와 반전 암시",
    "다크 클라우드 커버(흑운형) - 고점에서의 치명적 하락 경고",
    "피어싱 라인(관통형) - 급락 후 나타나는 V자 반등 시그널",
    "이브닝 스타(석별형) - 화려한 상승장의 씁쓸한 종착역",
    "볼린저밴드 밴드폭(Bandwidth) 축소 후 폭발 변동성 예측",
    "스토캐스틱 다이버전스 - 가격은 오르는데 지표는 꺾일 때",
    "외국인과 기관 매집 단가 추정하는 차트 분석 기법",
    "장중 틱차트 3분봉 5분봉 단타 매매 완벽 가이드",
    "손절선 하향 돌파(휩소) 후 V자 반등(개미털기) 패턴 대응",
    "전고점 돌파 매매 시 가짜 돌파(Bull Trap) 구분하는 법"
]

GENERAL_TOPICS = [
    "주식이란 무엇인가? 초보자가 꼭 알아야 할 주식 기초 개념",
    "코스피와 코스닥의 차이점과 시장 구조 완벽 이해",
    "주식 계좌 개설부터 첫 매수까지 - MTS HTS 주식 입문 가이드",
    "주가는 왜 오르고 내리는가? 수요와 공급의 원리 쉽게 이해하기",
    "시가총액이란? 대형주 중형주 소형주 구분 방법과 투자 전략",
    "호가창(호가 창구) 읽는 법 - 매도 매수 주문 쌓이는 원리 이해",
    "시장가 주문 vs 지정가 주문 - 언제 어떤 주문 방법을 쓸까?",
    "상한가 하한가 서킷브레이커 사이드카란 무엇인가?",
    "동시호가 장전 시간외 장후 시간외 거래 완벽 이해",
    "주식 매매 세금 총정리 - 거래세 양도소득세 배당소득세",
    "PER(주가수익비율)이란? 저평가 주식 찾는 핵심 지표 활용법",
    "PBR(주가순자산비율)이란? 자산가치 기반 저평가주 발굴 방법",
    "EPS(주당순이익)와 BPS(주당순자산)로 실질 가치 계산하기",
    "ROE(자기자본이익률)와 ROA(총자산이익률) 기업 경쟁력 비교",
    "배당주 투자 완전 정복 - 배당수익률 배당성향 배당락일 이해",
    "배당성장주 투자 전략 - 매년 배당이 늘어나는 기업에 투자하기",
    "재무제표 읽는 법 ① - 손익계산서로 기업 수익성 파악하기",
    "재무제표 읽는 법 ② - 대차대조표로 기업 재무 건전성 파악하기",
    "재무제표 읽는 법 ③ - 현금흐름표로 실제 돈의 흐름 파악하기",
    "영업이익률 순이익률 EBITDA - 기업 수익성 지표 완전 정복",
    "부채비율 유동비율 당좌비율로 기업 재무 안정성 체크하기",
    "어닝 서프라이즈와 어닝 쇼크 - 실적 발표가 주가에 미치는 영향",
    "PEG 비율이란? 성장성까지 반영한 정확한 저평가 지표",
    "EV/EBITDA란? 기업 인수합병(M&A) 밸류에이션 방법",
    "DCF(현금흐름할인법)로 주식 적정 가치를 직접 계산하는 방법",
    "가치투자 vs 성장투자 - 워렌 버핏과 피터 린치의 철학 비교",
    "모멘텀 투자 전략 - 오르는 주식에 올라타는 추세 추종 매매",
    "역발상 투자 - 시장이 외면한 저평가 기업을 찾아 대박 내기",
    "분할 매수 전략 - 하락장에서 평균 단가를 낮추는 스마트 매매",
    "분할 매도 전략 - 목표가 도달 시 수익을 단계별 확정하는 방법",
    "달러 코스트 애버리징(DCA) - 정기 적립식 투자의 장점 단점",
    "포트폴리오 분산 투자 - 리스크 줄이면서 수익 극대화하는 법",
    "코어-새틀라이트 전략 - 안정적 핵심 자산에 위성 투자 더하기",
    "손절매(Stop Loss) 중요성과 리스크 대비 수익비율(RRR) 설정",
    "물타기 vs 불타기 - 언제 추가 매수하고 언제 피해야 하는가?",
    "테마주 투자 전략 - 뉴스 정책 수혜주를 빠르게 잡는 방법",
    "IPO(공모주 투자) 완전 정복 - 청약부터 상장일 전략까지",
    "턴어라운드 투자 - 실적 개선 기업에 선제 투자하는 방법",
    "52주 신고가 돌파 전략 - 강한 모멘텀 종목 골라내는 기법",
    "ETF란 무엇인가? 개별 주식 vs ETF 투자의 차이점과 장단점",
    "코스피200 ETF 코스닥150 ETF - 지수 추종 ETF 완전 정복",
    "미국 ETF 투자 가이드 - SPY QQQ VTI 차이와 선택법",
    "채권 ETF 금 ETF 원자재 ETF로 자산 배분 전략 세우기",
    "레버리지 ETF 인버스 ETF - 2배 3배 상품 위험성과 활용법",
    "테마형 ETF 투자 - AI 반도체 2차전지 바이오 섹터 ETF",
    "ETF 투자 시 확인해야 할 핵심 지표 - 순자산 괴리율 추적오차",
    "적립식 ETF 투자 전략 - 매달 일정 금액 투자로 자산 불리는 법",
    "외국인 기관 개인 수급 분석 - 누가 사고 파는지 파악하는 법",
    "공매도(Short Selling) 원리와 공매도 과열 종목 대응 전략",
    "대차잔고와 신용잔고비율로 시장의 숨겨진 위험 감지하기",
    "프로그램 매매 차익거래 비차익거래가 주가에 미치는 영향",
    "선물 옵션 만기일(네 마녀의 날)이 주가에 미치는 영향",
    "금리와 주식의 관계 - 금리가 오르면 왜 주가가 내리는가?",
    "환율(원달러 환율)과 주식의 관계 - 환율 오르면 어떻게 되나?",
    "인플레이션과 주식 투자 - 물가 상승기에 살아남는 포트폴리오",
    "경기 침체(리세션) 신호를 미리 파악하는 5가지 경제 지표",
    "미국 연준(Fed) 금리 결정이 한국 증시에 미치는 영향 완전 분석",
    "VIX(공포지수)로 시장의 공포와 탐욕을 수치로 읽는 방법",
    "섹터 로테이션 전략 - 경기 사이클에 따라 강세 업종 선점하기",
    "달러 인덱스(DXY)와 신흥국 증시의 연관성 이해하기"
]

THEORY_TOPICS = CHART_TOPICS + GENERAL_TOPICS

# 차트 관련 주제인지 판별 (프롬프트 최적화)
def is_chart_topic(topic: str) -> bool:
    chart_keywords = ["이동평균선", "RSI", "볼린저", "MACD", "캔들", "차트", "패턴", "지지", "저항",
                      "거래량", "OBV", "피보나치", "갭", "채널", "삼각", "헤드앤숄더", "VWAP",
                      "스토캐스틱", "일목균형표", "CCI", "ATR", "골든크로스", "데드크로스",
                      "쌍바닥", "쌍봉", "엘리어트", "파라볼릭", "도지", "망치형", "잉걸불"]
    return any(kw in topic for kw in chart_keywords)

def get_topic_today(db=None) -> str:
    """
    Firestore에서 최근 200개 발행된 강의 주제를 조회하여 겹치지 않는 주제를 선택합니다.
    - 강력한 서브스트링 체크를 통해 PER, PBR, ROE 등이 한 글에 묶여 나왔을 때도 완벽하게 중복을 방지합니다.
    - 차트 주제를 70% 확률로 우선 선택합니다.
    """
    import re as _re
    used_titles = set()
    used_full_titles = [] # For strict substring matching

    if db:
        try:
            # 최근 200개 발행 글 조회
            docs = db.collection("theory_posts").order_by(
                "createdAt", direction=firestore.Query.DESCENDING
            ).limit(200).stream()
            for doc in docs:
                data = doc.to_dict()
                orig = data.get("originalTopic", "")
                if orig:
                    used_titles.add(orig.strip())
                    used_full_titles.append(orig.strip())
                title = data.get("title", "")
                if title:
                    used_titles.add(title.strip())
                    used_full_titles.append(title.strip())
        except Exception as e:
            print(f"[Theory Bot] 발행 이력 조회 실패 (폴백 사용): {e}")

    def is_topic_used(topic: str) -> bool:
        """정확 일치 + 강력한 키워드 포함 매칭으로 중복 판별"""
        if topic in used_titles:
            return True
            
        # 후보 주제에서 핵심 영문 키워드 추출 (예: PER, MACD, ETF)
        eng_kws = _re.findall(r'[A-Za-z]{2,}', topic.upper())
        
        # 후보 주제에서 한글 핵심 단어 추출 (첫 단어 중심)
        kor_kws = []
        key = topic.split('(')[0].split('란')[0].split('이란')[0].strip()
        if len(key) >= 2 and not _re.match(r'^[A-Za-z]+$', key):
            kor_kws.append(key)
            
        candidate_kws = set(eng_kws + kor_kws)
        
        # 추출된 핵심 키워드가 과거 발행된 제목 '어디에든' 포함되어 있으면 중복으로 간주
        for kw in candidate_kws:
            if len(kw) >= 2:
                for past_title in used_full_titles:
                    # 영문은 대소문자 무시 비교
                    if kw.upper() in past_title.upper():
                        print(f"[Theory Bot] 강력한 중복 방지 - 키워드 '{kw}'가 과거 글 '{past_title[:20]}...'에 포함됨.")
                        return True
                        
        return False

    # 사용되지 않은 주제 후보 필터링
    available_chart = [t for t in CHART_TOPICS if not is_topic_used(t)]
    available_general = [t for t in GENERAL_TOPICS if not is_topic_used(t)]

    print(f"[Theory Bot] 사용 가능: 차트 {len(available_chart)}/{len(CHART_TOPICS)}개, 일반 {len(available_general)}/{len(GENERAL_TOPICS)}개")

    # 한쪽이 소진되면 남은 쪽으로 모두 할당하여 중복 방지
    if not available_chart and available_general:
        print("[Theory Bot] 차트 주제 소진 - 남은 일반 주제에서 선택합니다.")
        available_chart = available_general
    elif not available_general and available_chart:
        print("[Theory Bot] 일반 주제 소진 - 남은 차트 주제에서 선택합니다.")
        available_general = available_chart
        
    # 둘 다 소진되었을 때만 전체 목록에서 재선택 (90일 보장 이후)
    if not available_chart and not available_general:
        print("[Theory Bot] 모든 주제 소진 - 전체 목록에서 재선택")
        available_chart = CHART_TOPICS
        available_general = GENERAL_TOPICS

    # 진짜 랜덤 선택 (날짜 시드 제거 → 재시도 시 다른 주제 가능)
    rand = random.Random()

    # 차트 70%, 일반 30% 가중치 선택
    if rand.random() < 0.7:
        selected = rand.choice(available_chart)
        print(f"[Theory Bot] 차트 주제 선택 (70%): {selected[:40]}...")
    else:
        selected = rand.choice(available_general)
        print(f"[Theory Bot] 일반 주제 선택 (30%): {selected[:40]}...")

    return selected

if __name__ == '__main__' and False:  # placeholder to keep original main block
    THEORY_TOPICS = CHART_TOPICS + GENERAL_TOPICS

# ──────────────────────────────────────────
Dummy = [
    "주식이란 무엇인가? 초보자가 꼭 알아야 할 주식 기초 개념 완전 정복",
    "주식 시장의 구조: 코스피와 코스닥의 차이점과 특징 완벽 이해",
    "주식 계좌 개설부터 첫 매수까지 - 주식 입문 완전 가이드",
    "주가(주식 가격)는 왜 오르고 내리는가? 수요와 공급의 원리",
    "시가총액이란? 대형주·중형주·소형주 구분 방법과 투자 전략",
    "배당주란 무엇인가? 배당금 받는 방법과 배당 투자 전략",
    "PER(주가수익비율)이란? 저평가 주식 찾는 핵심 지표 활용법",
    "PBR(주가순자산비율)이란? 자산가치 기반 저평가주 발굴 방법",
    "EPS(주당순이익)와 ROE(자기자본이익률)로 우량주 선별하는 법",
    "공시(전자공시시스템)를 100% 활용하는 법 - 기업 정보 먼저 보는 투자자",
    
    # ── 2단계: 캔들차트 기초 ──
    "캔들차트(봉차트)란 무엇인가? 양봉·음봉·도지 완벽 해석",
    "장대양봉과 장대음봉 - 강력한 추세 출발 신호 읽는 법",
    "망치형(Hammer)과 교수형(Hanging Man) 캔들이 바닥·상투에서 가지는 의미",
    "도지(Doji) 캔들 패턴의 종류와 추세 전환 시그널 읽기",
    "적삼병과 흑삼병 캔들 패턴으로 보는 강력한 추세 전환 신호",
    "샛별형(Morning Star)과 석별형(Evening Star) 패턴의 반전 신호",
    "잉걸불형(Engulfing Pattern) 캔들 - 가장 강력한 반전 패턴",
    "피어싱형과 흑운형 캔들 패턴 - 중요한 단기 반전 시그널",
    "십자형(Star) 캔들 패턴의 변형과 해석 방법",
    "위꼬리·아래꼬리 긴 캔들의 의미와 매매 활용법",
    
    # ── 3단계: 이동평균선 ──
    "이동평균선(Moving Average)의 종류와 골든크로스/데드크로스 실전 매매법",
    "5일선·20일선·60일선·120일선 각각의 역할과 투자 의미",
    "이동평균선 정배열·역배열 구분과 트렌드 추종 매매 전략",
    "눌림목 매매 전략 - 20일선에서 매수 타점 잡는 실전 기법",
    "지수이동평균(EMA)과 단순이동평균(SMA)의 차이와 활용법",
    "골든크로스 발생 후 추가 확인이 필요한 이유와 함정 피하기",
    
    # ── 4단계: 차트 패턴 ──
    "지지(Support)와 저항(Resistance) 라인 긋는 법과 매물대 분석",
    "쌍바닥(Double Bottom)과 쌍봉(Double Top) 패턴의 실전 매매",
    "헤드 앤 숄더(Head and Shoulders) 패턴과 넥라인 돌파 시그널",
    "역헤드 앤 숄더(Inverse H&S) - 강력한 상승 반전 패턴 공략법",
    "삼각수렴(Triangle) 패턴 - 상승·하락·대칭 삼각형 구분과 매매",
    "상승 쐐기형(Rising Wedge)과 하락 쐐기형(Falling Wedge) 패턴",
    "직사각형(Rectangle) 패턴과 박스권 돌파 매매 전략",
    "컵 앤 핸들(Cup & Handle) 패턴 - 장기 상승의 전형적인 신호",
    "갭(Gap) 상승과 갭 하락의 원리와 메우기(Fill the Gap) 전략",
    "상승 채널(Channel)과 하락 채널 내에서의 스윙 매매 기법",
    
    # ── 5단계: 보조지표 ──
    "RSI(상대강도지수) 지표를 활용한 과매수·과매도 타점 잡기",
    "볼린저 밴드(Bollinger Bands) 중심선과 상·하단선 돌파 매매 전략",
    "MACD 지표의 원리와 다이버전스(Divergence)를 활용한 추세 전환 포착",
    "스토캐스틱(Stochastic)을 이용한 단기 파동 매매 기법",
    "일목균형표의 구름대와 기준선·전환선을 이용한 지지와 저항",
    "OBV(On Balance Volume) 지표를 통한 세력의 매집과 이탈 분석",
    "피보나치 되돌림(Fibonacci Retracement)을 활용한 눌림목 타점 찾기",
    "거래량(Volume) 분석의 핵심 - 주가와 거래량의 다이버전스 현상",
    "CCI(상품채널지수)로 사이클 고점과 저점 찾는 방법",
    "DMI와 ADX 지표로 추세 강도를 측정하는 실전 매매 기법",
    "ATR(평균진폭)으로 변동성을 측정하고 손절 기준 설정하기",
    "파라볼릭 SAR(Parabolic SAR)로 추세 추종 매매하는 방법",
    "윌리엄스 %R 지표로 단기 과매수·과매도 구간 포착하기",
    "MFI(머니플로우인덱스)로 자금 유입·유출을 감지하는 기법",
    "VWAP(거래량가중평균가격)으로 기관의 평단가를 추정하는 방법",
    
    # ── 6단계: 수급·세력 분석 ──
    "외국인·기관·개인의 수급 분석 - 누가 사고 파는지 파악하는 법",
    "프로그램 매매란? 차익거래와 비차익거래가 주가에 미치는 영향",
    "공매도(Short Selling)의 원리와 공매도 과열 종목 대응 전략",
    "대차잔고와 대주잔고로 공매도 세력의 움직임 파악하는 법",
    "신용잔고비율과 반대매매 - 급락의 숨겨진 원인 파헤치기",
    "세력주 포착법 - 거래량 폭발과 이상 급등주 분석 방법",
    "투자자별 매매동향(코스피·코스닥)으로 스마트머니 추종하기",
    
    # ── 7단계: 매매 전략 ──
    "추세 추종 매매 전략 - 오르는 주식에 올라타는 모멘텀 투자",
    "역추세 매매 전략 - 과매도 구간에서 반등을 노리는 반전 투자",
    "스윙 트레이딩이란? 2~10일 단위 단기 수익 극대화 전략",
    "데이트레이딩(단타)의 기초 - 당일 매수·매도 기술과 주의사항",
    "분할 매수 전략 - 하락장에서도 평균 단가를 낮추는 스마트 매매",
    "손절매(Stop Loss)의 중요성과 리스크 대비 수익비율(RRR) 설정",
    "포트폴리오 분산 투자 전략 - 리스크를 줄이면서 수익 극대화",
    "달러 코스트 애버리징(DCA) - 정기 적립식 투자의 장점과 단점",
    "테마주 투자 전략 - 뉴스와 정책 수혜주를 빠르게 잡는 방법",
    "턴어라운드(Turnaround) 투자 - 실적 개선 기업에 선제 투자하기",
    
    # ── 8단계: 재무제표 기초 ──
    "재무제표 읽는 법 기초 - 손익계산서·대차대조표·현금흐름표",
    "매출액·영업이익·순이익의 차이와 주가에 미치는 영향",
    "영업이익률과 순이익률로 기업의 수익성 평가하기",
    "부채비율과 유동비율로 기업의 재무 안정성 파악하기",
    "영업현금흐름이 중요한 이유 - 이익이 있어도 망하는 기업의 비밀",
    "어닝 서프라이즈와 어닝 쇼크가 주가에 미치는 즉각적인 영향",
    "ROE·ROA·ROIC의 차이와 기업 투자 효율성 비교 분석법",
    
    # ── 9단계: 실전 심화 ──
    "52주 신고가·신저가 전략 - 돌파 매매와 저가 매수의 적절한 선택",
    "상한가·하한가가 발생하는 이유와 다음 날 대응 전략",
    "IPO(공모주 투자) 완전 정복 - 청약부터 상장일 매도 전략까지",
    "주식 분할·합병·무상증자·유상증자가 주가에 미치는 영향 분석",
    "자사주 매입과 소각이 주가에 미치는 영향과 투자 신호 해석",
    "인플레이션·금리·환율이 주식시장에 미치는 거시경제 영향",
    "코스피·코스닥 지수 선물을 이용한 시장 방향성 예측법",
    "VIX(공포지수)와 한국판 VKOSPI로 시장 공포 수준 읽기",
    "섹터 로테이션 전략 - 경기 사이클별 강세 업종 미리 파악하기",
    "글로벌 매크로 투자 - 미국 연준(Fed) 정책이 한국 증시에 미치는 영향",
    
    # ── 10단계: 심리·원칙 ──
    "투자 심리학 - 탐욕과 공포를 이기는 멘탈 관리 방법",
    "버핏의 가치투자 10가지 원칙 - 위대한 기업을 찾는 법",
    "피터 린치의 투자 철학 - 일상에서 10루타 주식 발굴하기",
    "손실회피 편향이란? 주식에서 가장 많이 하는 실수 7가지",
    "주식 일기 쓰는 법 - 매매 기록으로 나만의 투자 원칙 만들기",
    "초보자가 반드시 피해야 할 투자 금기사항 10가지",
    "장기투자 vs 단기매매 - 나에게 맞는 투자 방식 선택하는 법",
]

def generate_theory_post(db=None):
    topic = get_topic_today(db=db)
    use_chart = is_chart_topic(topic)
    
    if use_chart:
        visual_section = """
    2. 📊 실전 차트 시각화 (SVG 캔들차트 필수 포함):
       차트 주제이므로 반드시 아름다운 다크모드 SVG 캔들차트를 그려서 삽입하세요.
       
       ✅ SVG 차트 제작 필수 조건:
       - ⚠️ 짤림 방지 필수: 그림이나 글씨(특히 x축, y축 라벨)가 화면에서 잘리지 않도록 viewBox 여백을 상하좌우 최소 50px 이상 넉넉하게 확보하세요.
       - 텍스트나 도형이 전체 SVG 크기(820x420 등)의 경계 밖으로 나가지 않도록 x, y 좌표를 신중히 계산하세요.
       - 최소 15~20개 캔들로 구성된 현실감 있는 주가 흐름을 표현하세요.
       - 양봉(fill="#ef4444" 빨간색)과 음봉(fill="#3b82f6" 파란색)을 혼합하여 실제 HTS처럼 표현하세요.
       - 각 캔들에 위아래 꼬리(wick)를 반드시 포함하세요 (line 태그 활용).
       - 설명 중인 핵심 패턴 구간에는 반드시 형광 노란색 반투명 박스(rect fill="#fbbf24" opacity="0.15")로 하이라이트 처리하세요.
       - 매수 포인트에는 초록 삼각형 화살표(▲)와 'BUY' 텍스트, 매도 포인트에는 빨간 화살표(▼)와 'SELL' 텍스트를 넉넉한 위치에 명시하세요.
       - 이동평균선(5일: #f59e0b 노란선, 20일: #60a5fa 파란선)을 polyline으로 표현하세요.
       - x축(날짜), y축(가격) 라벨을 반드시 포함하되 끝부분이 잘리지 않도록 텍스트 앵커(text-anchor)를 고려하세요. 눈금선(grid)은 회색으로 그리세요.
       - 차트 우상단 여백에 범례(legend)를 작게 표시하세요 (양봉/음봉/5일선/20일선).

       캔들차트 SVG 구조 예시:
       <div class="overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 my-8 shadow-2xl">
       <p class="text-gray-400 text-sm mb-3 text-center">📊 [패턴명] 실전 예시 차트</p>
       <svg viewBox="0 0 820 420" class="w-full h-auto font-sans">
           <rect width="820" height="420" fill="#0f172a" rx="12"/>
           <!-- y축 눈금선 (fill="#1e293b") -->
           <!-- x축/y축 라벨 (fill="#64748b", font-size="11") 외곽 여백 주의! -->
           <!-- 캔들 몸통(rect)과 꼬리(line), 이평선(polyline) -->
           <!-- 하이라이트 박스, BUY/SELL 화살표 및 텍스트 -->
           <!-- 범례 -->
       </svg>
       </div>

    3. 📖 단계별 설명 (초보자도 이해할 수 있게):
       ① 이 패턴/지표가 뭔지 한 줄 정의
       ② 차트에서 어떻게 생겼는지 특징 묘사 (위 SVG와 연결해서 설명)
       ③ 왜 이 패턴이 발생하는지 심리적 원인 (매도세 소진, 매수 세력 진입 등)
       ④ 실전 매수 타이밍과 매도 타이밍을 구체적으로 설명
       ⑤ 이 패턴과 함께 확인해야 할 보조지표(거래량, RSI 등)도 반드시 언급

    4. ⚠️ 실전 꿀팁 & 함정 주의:
       - 초보자가 가장 자주 당하는 '가짜 시그널(속임수 패턴)' 사례 설명
       - 이 패턴을 신뢰할 수 있는 조건 vs 신뢰하면 안 되는 조건
       - 손절 기준선 설정 방법"""
    else:
        visual_section = """
    2. 시각화 자료 (안전한 SVG 다이어그램/막대그래프): 텍스트로만 설명하면 초보자가 이해하기 어려우므로, 핵심 개념(비율, 흐름, 구조 등)을 설명할 때 **SVG를 활용한 직관적인 모식도(다이어그램)나 가로 막대 그래프**를 반드시 그려서 삽입하세요.

       ⚠️ SVG 다이어그램 필수 규칙 (반드시 지켜야 함):
       - ⚠️ 짤림 방지 필수: 어떤 글씨나 도형도 SVG 화면 밖으로 잘리지 않도록 viewBox의 width/height를 실제 도형들이 차지하는 공간보다 사방으로 50px 이상 넉넉하게 설정하세요.
       - 각 rect(사각형) 박스의 너비와 높이는 내부 텍스트가 절대 넘치지 않도록 충분히 크게 설정하세요 (한 줄당 최소 30px, 줄 수에 맞게 높이 계산).
       - 텍스트가 2줄 이상일 경우, 반드시 <tspan dy="28"> 등을 이용해 줄 바꿈하고, 박스 높이도 그에 맞게 넉넉히 키우세요.
       - 텍스트는 반드시 박스(rect) 내부 중앙에 위치시키세요. (text x=박스 중앙, y=박스 중앙)
       - 텍스트 글씨는 font-size 최대 16px 이하로 유지해서 박스 안에 여유 있게 들어오도록 하세요.
       - 절대로 텍스트가 박스 경계선을 넘거나 다른 도형/글씨와 겹치면 안 됩니다.

       - 다이어그램 SVG 디자인 예시 템플릿:
         <div class="overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 my-8 shadow-2xl flex justify-center w-full">
         <svg viewBox="0 0 800 400" class="w-full max-w-[700px] h-auto font-sans">
             <!-- 배경 -->
             <rect width="800" height="400" fill="#111827" rx="16"/>
             <!-- 화살표, 원(circle), 사각형(rect) 등 도형과 짧은 텍스트(text-anchor="middle", fill="#e5e7eb")를 사용하여 개념의 흐름, 비교, 구조를 아름답게 도식화하세요. 텍스트는 반드시 rect 안에 여유 있게 들어오도록 박스를 충분히 크게 만드세요 -->
         </svg>
         </div>
       - 또는 수치 비교 시 Tailwind CSS 가로 막대 그래프 적극 활용:
         <div class="mb-6"><p class="text-gray-100 font-bold mb-2">상승장 수익률 비교 (레버리지 2X)</p><div class="flex items-center gap-4"><div class="w-full bg-gray-800 h-8 rounded-xl overflow-hidden"><div class="bg-red-500 h-8" style="width: 80%"></div></div><span class="text-red-400 font-bold w-16">+80%</span></div></div>
    3. 본론: 이 개념이 실제 투자에서 어떻게 활용되는지, 투자 시 팁을 핵심 포인트로 정리.
    4. 실전 꿀팁 & 주의사항: 초보자가 가장 많이 실수하는 것과 바로 써먹을 수 있는 실전 팁."""

    # 차트 주제일 경우 전문적이고 디테일한 프롬프트, 일반 주제는 기존 프롬프트
    if use_chart:
        prompt = f"""
    당신은 국내 최고 수준의 주식 차트 분석 전문가이자, 초보 투자자들이 가장 좋아하는 1타 강사입니다.
    오늘의 강의 주제는 '{topic}' 입니다.

    [강의 제작 철학]
    - 어려운 개념도 '비유'와 '실제 차트 예시'로 누구나 이해할 수 있게 가르칩니다.
    - 이론만 나열하지 않고, 실전에서 어떻게 쓰는지 구체적인 매수/매도 시점과 함께 설명합니다.
    - 초보자가 자주 빠지는 '함정(가짜 시그널)'을 꼭 짚어줍니다.
    - A4 4~5장 분량, 최소 1,500자 이상의 매우 길고 상세한 강의를 작성합니다. (내용이 짧으면 안 됩니다)

    아래 구성으로 강의 콘텐츠를 작성해주세요:

    1. 🎯 도입부 (왜 이걸 알아야 하나?):
       - 이 패턴/지표를 모르고 투자하면 어떤 손해를 보는지 실감나는 사례로 시작
       - "저도 처음엔 이걸 몰라서..." 처럼 공감가는 스토리텔링
       - 이 강의를 다 읽으면 뭘 할 수 있는지 명확히 예고

    {visual_section}

    5. 📌 실전 체크리스트:
       이 강의를 읽고 나서 실제 종목 차트에서 확인해야 할 체크포인트를 번호로 정리
       (예: ① 캔들 3개 연속 확인 ② 거래량이 전일 대비 1.5배 이상인지 ③ RSI가 30 이하인지 등)

    6. SEO 메타데이터: 문서 제일 상단에 <title-seo>검색 엔진용 20자 이내 핵심 제목</title-seo>를 포함해주세요.

    **HTML 포맷팅 규칙** (반드시 준수):
    1. 전체 내용은 HTML 태그로 구성 (Markdown 절대 금지)
    2. 큰 제목: <h2 class="text-4xl font-black text-white pb-3 border-b-2 border-gray-600 mb-10">
    3. 소제목: <h3 class="text-3xl font-extrabold text-blue-400 mt-14 mb-6 border-l-8 border-blue-500 pl-5 bg-blue-900/10 py-2 rounded-r-xl">
    4. 일반 텍스트: <p class="text-gray-100 text-xl leading-loose mb-8 font-medium tracking-wide">
    5. 중요 강조: <strong class="text-white bg-blue-600/40 px-2 py-0.5 rounded shadow-sm font-bold border-b-2 border-blue-400 break-keep">
    6. 목록: <ul class="list-none space-y-5 mb-8"> + <li class="flex items-start gap-3 text-gray-100 text-xl leading-loose font-medium"><span class="text-blue-400 font-black text-2xl mt-0.5 shrink-0">✓</span><span class="flex-1">내용</span></li>
    7. 핵심 요약 박스: <div class="bg-blue-900/30 border-l-4 border-r-4 border-blue-500 rounded-2xl p-8 my-10 shadow-lg"><p class="text-blue-100 text-xl font-bold leading-loose mb-0">내용</p></div>
    8. 경고 박스: <div class="bg-red-900/30 border-l-4 border-r-4 border-red-500 rounded-2xl p-8 my-10 shadow-lg"><p class="text-red-100 text-xl font-bold leading-loose mb-0">⚠️ 내용</p></div>
    9. 꿀팁 박스: <div class="bg-green-900/30 border-l-4 border-r-4 border-green-500 rounded-2xl p-8 my-10 shadow-lg"><p class="text-green-100 text-xl font-bold leading-loose mb-0">💡 내용</p></div>
    10. 체크리스트 박스: <div class="bg-gray-800/60 border border-gray-600 rounded-2xl p-8 my-10"><p class="text-yellow-300 text-2xl font-black mb-4">✅ 실전 체크리스트</p>...<p class="text-gray-100 text-xl">내용</p></div>
    11. SEO 내부 링크: 종목명 링크 외에도, 우리 사이트의 핵심 기능 링크를 글 중간중간에 최소 2회 이상 아주 자연스럽게 삽입하세요.
        - 링크 예시: <a href="/discovery" class="text-blue-300 font-bold hover:text-blue-200 underline decoration-blue-500/50 underline-offset-4">AI 종목 발굴</a>, <a href="/theme" class="...">실시간 테마 분석</a>, <a href="/ranking" class="...">AI 실시간 랭킹</a>, <a href="/calendar" class="...">주요 증시 캘린더</a>
    12. 법적 준수: 특정 종목 매수/매도 추천 절대 금지. 마지막에 <p class="text-gray-500 text-sm mt-10">본 자료는 교육 목적으로 제공되며, 투자의 최종 책임은 투자자 본인에게 있습니다.</p>
    13. 절대 금지: <!DOCTYPE>, <html>, <head>, <style>, <body> 태그. 오직 본문 HTML만 반환.

    순수한 HTML만 반환하고 마크다운 틱(```html)은 사용하지 마세요.
    """
    else:
        prompt = f"""
    당신은 주식 투자를 처음 시작하는 초보자들에게 주식·경제·투자 이론을 아주 쉽고 친절하게, 재미있게 알려주는 1타 강사입니다.
    오늘의 강의 주제는 '{topic}' 입니다.

    아래의 가이드라인에 따라 강의 콘텐츠를 작성해주세요 (A4 4~5장 분량, 최소 1,500자 이상, 상세한 예시와 설명을 아주 충실하게 덧붙여서 길게 작성):
    1. 도입부: 왜 이것을 알아야 하는지, 모르면 어떤 손해를 보는지 초보자 눈높이에서 흥미롭게 설명. 실제 사례나 비유를 들어주세요.
    {visual_section}
    5. SEO 메타데이터: 문서 제일 상단에 <title-seo>검색 엔진용 20자 이내 핵심 제목</title-seo>를 포함해주세요.
    
    **HTML 포맷팅 규칙** (반드시 준수, 모바일 가독성 최우선):
    1. 전체 내용은 HTML 태그로 구성하세요 (Markdown 사용 절대 금지).
    2. 큰 제목: <h2 class="text-4xl font-black text-white pb-3 border-b-2 border-gray-600 mb-10">
    3. 소제목: <h3 class="text-3xl font-extrabold text-blue-400 mt-14 mb-6 border-l-8 border-blue-500 pl-5 bg-blue-900/10 py-2 rounded-r-xl">
    4. 일반 텍스트: <p class="text-gray-100 text-xl leading-loose mb-8 font-medium tracking-wide">
    5. 중요 강조: <strong class="text-white bg-blue-600/40 px-2 py-0.5 rounded shadow-sm font-bold border-b-2 border-blue-400 break-keep"> (단어가 쪼개지지 않고 줄바꿈 되도록 break-keep 필수)
    6. 시각화: 주제에 따라 위 가이드라인(visual_section)에 명시된 예쁘고 안전한 SVG 차트(캔들차트)나 CSS 가로 막대 그래프를 적극 활용하세요. 단, 글씨가 겹치는 SVG 표(Table)나 복잡한 레이아웃은 절대 생성 금지.
    7. 목록(리스트): <ul class="list-none space-y-5 mb-8"> + <li class="flex items-start gap-3 text-gray-100 text-xl leading-loose font-medium"><span class="text-blue-400 font-black text-2xl mt-0.5 shrink-0">✓</span><span class="flex-1">내용</span></li>
    8. 핵심 요약 박스: <div class="bg-blue-900/30 border-l-4 border-r-4 border-blue-500 rounded-2xl p-8 my-10 shadow-lg"><p class="text-blue-100 text-xl font-bold leading-loose mb-0">내용</p></div>
    9. 경고/주의 박스: <div class="bg-red-900/30 border-l-4 border-r-4 border-red-500 rounded-2xl p-8 my-10 shadow-lg"><p class="text-red-100 text-xl font-bold leading-loose mb-0">⚠️ 내용</p></div>
    10. **SEO 내부 링크**: 종목명(예: <a href="/stock/005930" class="text-blue-300 font-bold hover:text-blue-200 underline decoration-blue-500/50 underline-offset-4">삼성전자</a>) 외에도, 사이트 주요 기능에 대한 내부 링크를 글 내용과 문맥에 맞춰 **최소 2회 이상** 자연스럽게 삽입하세요.
        - 예: "관련 종목을 찾고 싶다면 👉 <a href="/discovery" class="...">AI 종목 발굴</a>을 활용해보세요", 혹은 <a href="/theme" class="...">실시간 테마 분석</a>, <a href="/ranking" class="...">AI 실시간 랭킹</a>, <a href="/calendar" class="...">증시 캘린더</a>
    11. **법적 준수 (유사투자자문업 위반 방지)**: **절대로 특정 종목에 대한 매수/매도 추천, 목표가 제시, 종목 리딩, '지금 사야 한다'는 등의 직접적인 투자 권유를 하지 마세요.** 오직 객관적 사실, 차트/경제 이론, 일반적인 지식을 전달하는 '학술적이고 교육적인' 톤앤매너를 철저히 유지해야 합니다. 본문 마지막에는 항상 "본 자료는 교육 목적으로 제공되며, 투자의 최종 책임은 투자자 본인에게 있습니다."라는 문구를 조그맣게(<p class="text-gray-500 text-sm mt-10">) 추가하세요.
    12. **절대 금지**: <!DOCTYPE>, <html>, <head>, <style>, <body> 태그, CSS 코드 텍스트. 오직 본문 내용(태그)만 반환.
    
    순수한 HTML만 반환하고 마크다운 틱(```html)은 사용하지 마세요.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=90)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        # 제목 생성
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content).strip()
        else:
            first_word = topic.split('(')[0].split()[0] if topic else "주식"
            prefix = "[오늘의 차트 스터디]" if use_chart else "[주식 1타 강의]"
            title = f"{prefix} {first_word} 완벽 가이드"
            
        # 태그 생성 (주제별 맞춤)
        words = re.findall(r'[가-힣A-Za-z]+', topic)
        base_tags = ["주식초보", "주식공부", "주식이론"]
        if use_chart:
            base_tags += ["차트분석", "기술적분석"]
        else:
            base_tags += ["투자전략", "주식기초"]
        tags = base_tags + ([words[0]] if words else [])
        
        return title, content, tags, topic
    except Exception as e:
        print(f"Gemini API 에러: {e}")
        return None, None, None, None

def post_daily_theory():
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 초기화 실패")
        return False

    # [중복 방지] 오늘 이미 발행된 글이 있으면 중단
    kst_check = timezone(timedelta(hours=9))
    today_slug = f"theory-{datetime.now(kst_check).strftime('%Y%m%d')}"
    try:
        existing_doc = db.collection("theory_posts").document(today_slug).get()
        if existing_doc.exists:
            existing_title = existing_doc.to_dict().get("title", "(제목 없음)")
            print(f"[Theory Bot] 오늘({today_slug}) 이미 발행된 강의가 있습니다: '{existing_title}' - 중복 발행 방지로 건너뜁니다.")
            return True  # 성공으로 처리하여 재시도 루프 방지
    except Exception as e:
        print(f"[Theory Bot] 중복 체크 중 오류: {e}")
        
    print("오늘의 주식 이론/차트 스터디 콘텐츠 생성 중...")
    title, content, tags, topic = generate_theory_post(db=db)
    if not content:
        print("콘텐츠 생성 실패.")
        return False
        
    kst = timezone(timedelta(hours=9))
    timestamp = datetime.now(kst).strftime("%Y%m%d")
    slug = f"theory-{timestamp}"
    
    post_data = {
        "title": title,
        "content": content,
        "slug": slug,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "StockTrend 차트 마스터",
        "tags": tags,
        "originalTopic": topic,
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
        
        # 텔레그램 발송 (telegram_service 내부에서 FCM 푸시와 알림 센터 등록까지 모두 자동으로 처리함)
        try:
            from telegram_service import send_telegram_teaser
            teaser_msg = f"📚 <b>[주식 1타 강사] 오늘의 스터디 업로드!</b>\n\n주식 초보 탈출을 위한 필수 이론!\n오늘의 주제: <b>{clean_title}</b>\n\n👉 <a href='{new_url}'>무료 강의 보러가기</a>"
            send_telegram_teaser(teaser_msg)
            print("[Telegram & FCM] 스터디 알림 통합 발송 완료")
        except Exception as e:
            print(f"[Telegram & FCM] 발송 실패: {e}")
        
        # Google Indexing API 실시간 핑
        try:
            from google_indexer import publish_urls_to_google
            print("Requesting Google Indexing API...")
            publish_urls_to_google([new_url])
        except Exception as e:
            print(f"Google Indexing API 실패: {e}")
            
        return True
            
    except Exception as e:
        print(f"Firestore 저장 에러: {e}")
        return False

if __name__ == "__main__":
    post_daily_theory()
