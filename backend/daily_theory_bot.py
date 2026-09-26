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
    "그랜빌의 8법칙 - 이동평균선과 주가의 위치별 4대 매수·4대 매도 급소",
    "역헤드 앤 숄더(Inverse H&S) 강력한 바닥권 상승 반전 패턴",
    "쌍봉(Double Top) 천장 패턴 이탈 시 폭락 회피 전략",
    "원형 바닥형(Rounding Bottom) 긴 횡보 후 대상승 초입 잡기",
    "이동평균선 수렴 후 확산 - 에너지 응축 후 대시세 분출 시그널",
    "캔들 꼬리 길이로 판단하는 매도세와 매수세의 힘겨루기",
    "체결강도와 호가 잔량 비율로 장중 세력의 진짜 매수 의도 간파하기",
    "상승 잉태형(Harami) 캔들 패턴 - 하락세 둔화와 반전 암시",
    "다크 클라우드 커버(흑운형) - 고점에서의 치명적 하락 경고",
    "피어싱 라인(관통형) - 급락 후 나타나는 V자 반등 시그널",
    "이브닝 스타(석별형) - 화려한 상승장의 씁쓸한 종착역",
    "볼린저밴드 밴드폭(Bandwidth) 축소 후 폭발 변동성 예측",
    "스토캐스틱 다이버전스 - 가격은 오르는데 지표는 꺾일 때",
    "외국인과 기관 매집 단가 추정하는 차트 분석 기법",
    "장중 틱차트 3분봉 5분봉 단타 매매 완벽 가이드",
    "손절선 하향 돌파(휩소) 후 V자 반등(개미털기) 패턴 대응",
    "전고점 돌파 매매 시 가짜 돌파(Bull Trap) 구분하는 법",
    "매집봉(윗꼬리 대량거래 양봉) 포착과 세력 평단가 계산법",
    "종가베팅(오후 3시 10분 매수)으로 다음날 갭상승 수익 내는 차트 공식",
    "시가베팅(장 초반 9시~9시 15분) 거래대금 폭발 돌파 타점 잡기",
    "장대양봉 중심선(50% 라인) 지지 확인 후 안전하게 눌림목 매수하는 법",
    "240일선(1년 장기 추세선) 돌파로 대세 상승 초입 종목 발굴하기",
    "볼린저밴드 하단 W자 쌍바닥 패턴으로 폭락장 반등 급소 잡기",
    "RSI 히든 다이버전스(Hidden Divergence)로 상승 추세 지속 신호 포착하기",
    "MACD 제로라인(0선) 돌파와 히스토그램 확장으로 대시세 초입 잡기",
    "거래량 없는 음봉(건조한 조정)과 거래량 터진 음봉(세력 이탈) 완벽 구분법",
    "피보나치 확장(Fibonacci Extension) 1.618 배율로 신고가 목표주가 계산하기",
    "일목균형표 선행스팬1·2 양운(구름대) 지지선 스윙 매매 기법",
    "박스권 상단 3차 돌파 법칙 - 세 번 두드린 저항선이 뚫릴 때 폭등하는 이유",
    "하락 추세선 돌파 후 리테스트(지지 확인) 타점 - 가장 안전한 변곡점 매매",
    "주봉·월봉 멀티 타임프레임 분석 - 큰 파동 속에서 일봉 타점 정밀 조준하기",
    "신고가 돌파 후 첫 번째 10일선 조정(첫 눌림목) 공략 공식",
    "와이코프 이론(Wyckoff Method) - 거대 자본의 매집(Accumulation)과 분산 4단계 해부",
    "돈치안 채널(Donchian Channel)과 전설의 터틀 트레이딩 돌파 기법",
    "켈트너 채널(Keltner Channel)을 활용한 변동성 돌파와 추세 추종",
    "슈퍼트렌드(Supertrend) 지표로 매수·매도 스위칭 타이밍 자동 포착하기",
    "하모닉 패턴 입문 - 가틀리(Gartley)와 배트(Bat) 비율로 정밀 반전 구간 예측",
    "아룬(Aroon) 지표(Aroon Up·Down)로 새로운 추세의 탄생과 소멸 읽기",
    "엘더 레이(Elder-Ray) 지수 - 황소(Bull)의 힘과 곰(Bear)의 힘 수치 비교법",
    "샹들리에 엑시트(Chandelier Exit)로 최고점 대비 수익 보존 익절선 설정하기",
    "윌리엄스 프랙탈(Williams Fractal) 화살표로 단기 스윙 고점·저점 확정하기",
    "보텍스 지표(Vortex Indicator) 교차로 소용돌이 장세 속 진짜 방향 찾기",
    "매스 인덱스(Mass Index) 벌지(Bulge) 신호로 과열 추세의 방향 전환 미리 알기",
    "얼티밋 오실레이터(Ultimate Oscillator) 3중 주기로 단기 속임수 신호 제거하기",
    "샹드 모멘텀 오실레이터(CMO)로 순수 상승·하락 탄력 강도 측정하기",
    "마켓 프로파일(Market Profile)과 POC(최대 거래 집중 가격) 핵심 원리",
    "앤드류스 피치포크(Andrews Pitchfork) 삼지창 중앙선 회귀 법칙",
    "선형회귀 채널(Linear Regression) 중심선과 표준편차 과열 구간 공략",
    "렌코 차트(Renko Chart) - 시간과 잔파동을 지우고 순수 가격 추세만 보는 법",
    "삼선전환도(Three Line Break) - 직전 3개 칸을 깰 때만 매매하는 추세 비법",
    "포인트 앤 피겨(P&F) 차트 X·O 기호로 세력 목표치 계산하기",
    "코폭 곡선(Coppock Curve) - 대폭락장 이후 평생의 대바닥을 알려주는 장기 지표",
    "ADL(등락주선) 시장 폭(Market Breadth) 분석으로 지수 착시 현상 간파하기",
    "맥클렐란 오실레이터(McClellan Oscillator)로 증시 전체의 단기 호흡 읽기",
    "암스 인덱스(TRIN) 수치로 패닉셀(투매) 극단적 바닥 타이밍 포착하기",
    "상대 회전 그래프(RRG) 4분면(선도·약화·후행·개선)으로 주도 업종 갈아타기",
    "노스(KST, Know Sure Thing) 4중 가중 모멘텀 지표로 중장기 변곡점 잡기",
    "RVI(Relative Vigor Index, 상대활력지수)로 시가 대비 종가 에너지 측정하기",
    "간 팬(Gann Fan) 45도 생명 각도선으로 시공간 추세 기울기 진단하기",
    "지그재그(ZigZag) 필터로 의미 없는 잔파동 걸러내고 핵심 파동만 긋기"
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
    "달러 인덱스(DXY)와 신흥국 증시의 연관성 이해하기",
    "ISA(개인종합자산관리계좌)로 배당·매매 세금 아끼는 절세 비법",
    "미국주식 양도소득세 250만원 기본공제와 연말 손익통산 절세 기술",
    "유상증자 vs 무상증자 공시 완벽 비교 - 호재와 악재 3초 판별법",
    "전환사채(CB)와 신주인수권부사채(BW) 오버행 물량 폭탄 피하는 법",
    "자본잠식과 관리종목·상장폐지 위험 기업을 재무제표로 미리 거르는 법",
    "FOMC 점도표(Dot Plot)와 파월 의장 성명서로 금리 방향 예측하기",
    "장단기 금리차 역전(10년물-2년물)이 주식 시장에 주는 경고 시그널",
    "컨센서스(증권사 전망치)와 어닝 모멘텀으로 실적장세 주도주 찾기",
    "주주환원율과 밸류업(Value-up) 프로그램 수혜 저PBR 우량주 고르는 법",
    "보호예수 해제(락업 해제) 일정 확인으로 기관 물량 폭탄 피하는 법"
]

THEORY_TOPICS = CHART_TOPICS + GENERAL_TOPICS

# 차트 관련 주제인지 판별 (프롬프트 최적화)
def is_chart_topic(topic: str) -> bool:
    chart_keywords = ["이동평균선", "RSI", "볼린저", "MACD", "캔들", "차트", "패턴", "지지", "저항",
                      "거래량", "OBV", "피보나치", "갭", "채널", "삼각", "헤드앤숄더", "VWAP",
                      "스토캐스틱", "일목균형표", "CCI", "ATR", "골든크로스", "데드크로스",
                      "쌍바닥", "쌍봉", "엘리어트", "파라볼릭", "도지", "망치형", "잉걸불",
                      "체결강도", "그랜빌", "매집봉", "종가베팅", "시가베팅", "240일선", "멀티타임프레임"]
    return any(kw in topic for kw in chart_keywords)

def get_topic_today(db=None) -> str:
    """
    Firestore의 모든 과거 발행 강의(단 1건도 빠짐없이 전체 스캔)를 조회하여
    지금까지 나왔던 주식/차트 스터디 주제와 단 1%도 겹치지 않는 새로운 주제를 선택합니다.
    """
    import re as _re
    used_titles = set()
    used_full_titles = []
    used_norm_titles = []

    def _norm(s: str) -> str:
        return _re.sub(r'[\s\W_]+', '', s.upper()).replace('하이킨아시', '헤이킨아시')

    if db:
        try:
            docs = db.collection("theory_posts").stream()
            for doc in docs:
                data = doc.to_dict() or {}
                for field in ("originalTopic", "title"):
                    val = (data.get(field) or "").strip()
                    if val:
                        used_titles.add(val)
                        used_full_titles.append(val)
                        used_norm_titles.append(_norm(val))
        except Exception as e:
            print(f"[Theory Bot] 발행 이력 조회 실패: {e}")

    STOPWORDS = {
        "주식", "주가", "주가에", "투자", "매매", "전략", "기법", "활용법", "완벽", "이해", "이해하기",
        "총정리", "분석", "차트", "가이드", "방법", "원리", "초보자", "초보자가", "미치", "미치는", "영향",
        "실전", "패턴", "지표", "하는", "무엇인가", "무엇인가요", "완전", "정복", "시장", "기업", "비율",
        "타점", "잡기", "찾기", "읽는", "보는", "법", "왜", "언제", "어떻게", "거래", "매수", "매도",
        "통한", "활용한", "이용한", "기반", "핵심", "기초", "개념", "차이점", "특징", "관계", "침체",
        "상승", "하락", "돌파", "추세", "전환", "시그널", "신호", "포착", "대응", "가치", "수익", "수익성",
        "비교", "종목", "재무제표", "무엇인", "신고", "단기", "장기", "평균", "계산", "확인", "피하는"
    }

    def extract_concept_keywords(topic: str) -> tuple:
        eng_kws = []
        kor_kws = []
        for eng in _re.findall(r'[A-Za-z]{2,}', topic.upper()):
            if eng not in {"VS", "AND", "THE", "IN", "ON", "TO", "OF", "STOP", "LOSS", "STAR", "BOX", "LINE", "GAP", "TOP"}:
                eng_kws.append(eng)
        main_part = _re.split(r'\s*-\s*|\s*\?\s*', topic)[0]
        for tok in _re.findall(r'[가-힣]{2,}', main_part):
            clean_tok = _re.sub(r'(이란|란|으로|로|에서|의|과|와|을|를|이|가|은|는)$', '', tok)
            if len(clean_tok) >= 2 and clean_tok not in STOPWORDS:
                kor_kws.append(_norm(clean_tok))
        for tok in _re.findall(r'[가-힣]{3,}', topic):
            clean_tok = _re.sub(r'(이란|란|으로|로|에서|의|과|와|을|를|이|가|은|는)$', '', tok)
            if len(clean_tok) >= 3 and clean_tok not in STOPWORDS:
                kor_kws.append(_norm(clean_tok))
        return list(dict.fromkeys(eng_kws)), list(dict.fromkeys(kor_kws))

    def is_topic_used(topic: str) -> bool:
        if topic in used_titles or _norm(topic) in used_norm_titles:
            return True

        eng_kws, kor_kws = extract_concept_keywords(topic)
        # 영문 약어는 독립 단어로 일치할 때만 중복 처리 (예: EV가 Evening에 매칭되는 현상 방지)
        for ekw in eng_kws:
            pat = _re.compile(r'(?<![A-Za-z])' + _re.escape(ekw) + r'(?![A-Za-z])', _re.IGNORECASE)
            for past_raw in used_full_titles:
                if pat.search(past_raw):
                    return True
        # 한글 핵심 개념어 매칭
        for kkw in kor_kws:
            for past_norm in used_norm_titles:
                if kkw in past_norm:
                    return True
        return False

    available_chart = [t for t in CHART_TOPICS if not is_topic_used(t)]
    available_general = [t for t in GENERAL_TOPICS if not is_topic_used(t)]

    print(f"[Theory Bot] 전체 누적 발행 글 {len(used_full_titles)//2}건 전수 대조 완료 | 앞으로 겹치지 않는 미출제 주제: 차트 {len(available_chart)}개, 일반 {len(available_general)}개 (총 {len(available_chart)+len(available_general)}개 대기 중)")

    if not available_chart and available_general:
        available_chart = available_general
    elif not available_general and available_chart:
        available_general = available_chart

    if not available_chart and not available_general:
        print("[Theory Bot] 기본 커리큘럼 완료 - 과거 글과 겹치지 않는 신규 주제를 AI로 생성합니다.")
        try:
            past_list_str = ", ".join(list(used_titles)[:150])
            new_topic_prompt = (
                f"다음은 지금까지 발행된 주식 스터디 주제 목록입니다: [{past_list_str}]\n"
                "위 목록에 나온 주제나 개념과 단 하나도 겹치지 않는, 주식 초보자에게 꼭 필요한 새로운 실전 차트 패턴 또는 주식 투자 핵심 개념 주제를 딱 1줄(40자 이내)로만 출력하세요."
            )
            resp = generate_with_retry(new_topic_prompt, json_mode=False, timeout=30)
            new_topic = resp.text.strip().split("\n")[0].replace('"', '').replace("'", "").strip()
            if new_topic:
                return new_topic
        except Exception as e:
            print(f"[Theory Bot] AI 신규 주제 생성 오류: {e}")

    rand = random.Random()
    if rand.random() < 0.7:
        selected = rand.choice(available_chart)
        print(f"[Theory Bot] 미출제 차트 주제 선택: {selected}")
    else:
        selected = rand.choice(available_general)
        print(f"[Theory Bot] 미출제 일반 주제 선택: {selected}")

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

def generate_theory_post(db=None, force_topic=None):
    topic = force_topic or get_topic_today(db=db)
    use_chart = is_chart_topic(topic)
    
    visual_section = """
    2. 📊 [필수 시각화 1] 고해상도 다크모드 SVG 실전 차트 & 구조 모식도 (반드시 포함!):
       초보자가 글만 읽고 지루해하지 않도록, 반드시 본문 중간에 **실제 HTS 스타일의 다크모드 SVG 차트(캔들차트 + 이동평균선 + 거래량 막대 + 핵심 타점 하이라이트)** 또는 **직관적인 컬러 단계별 비교 SVG 차트**를 직접 그려서 삽입하세요.

       ✅ SVG 차트 제작 필수 조건:
       - ⚠️ 짤림 방지 필수: `viewBox="0 0 840 440"` 크기를 사용하고, 사방 최소 55px 여백을 확보하여 어떤 글씨나 도형도 잘리지 않게 하세요.
       - 배경은 고급스러운 다크 네이비(`rect width="840" height="440" fill="#0b1120" rx="16"`), 격자선(`stroke="#1e293b" stroke-dasharray="4 4"`)을 넣으세요.
       - **차트/패턴/매매 주제는 물론 일반 경제/세금/이론 주제라도** 주가 흐름 예시(상승/하락/배당락/돌파 구간 등 15개 이상의 양봉 `#ef4444` / 음봉 `#3b82f6` 캔들과 꼬리 `line`, 5일선 `#fbbf24` / 20일선 `#38bdf8` `polyline`)와 하단 거래량 바를 함께 그려서 초보자가 실제 주가 차트에서 어떻게 나타나는지 눈으로 보게 하세요!
       - 핵심 포인트 구간에는 반투명 하이라이트 박스(`rect fill="#fbbf24" opacity="0.14" stroke="#f59e0b" rx="8"`)와 큼직한 한글 설명 라벨(`🟢 핵심 체크 구간`, `🔺 매수/진입 급소`, `🔻 주의/이탈 구간`)을 표시하세요.
       - 우측 상단에 깔끔한 범례(양봉/음봉/핵심선)를 배치하세요.

       SVG 차트 감싸기 HTML 구조:
       <div class="overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/30 p-5 md:p-7 my-10 shadow-2xl">
         <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
           <span class="text-blue-400 font-black text-base md:text-lg">📊 한눈에 보는 실전 차트 & 핵심 타점 시뮬레이션</span>
           <span class="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold">초보자 시각 가이드</span>
         </div>
         <svg viewBox="0 0 840 440" class="w-full h-auto font-sans">
           <!-- 여기에 격자선, 캔들/곡선, 하이라이트 박스, 한글 주석 화살표를 정교하게 작성 -->
         </svg>
         <p class="text-gray-400 text-sm mt-3 text-center">▲ 위 차트의 노란색 하이라이트 구간과 화살표 포인트를 본문 설명과 함께 비교해 보세요.</p>
       </div>

    3. 📈 [필수 시각화 2] 초보자 눈높이 수치 비교 가로 막대 그래프 (Tailwind CSS 게이지 바 필수 포함!):
       어려운 숫자·비율·세율·수익률·위험도 차이를 초보자가 1초 만에 직관적으로 비교할 수 있도록 **최소 3~4개 항목의 컬러 가로 막대 그래프(Progress Bar) 카드**를 반드시 삽입하세요.
       구조 예시:
       <div class="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 my-10 shadow-xl">
         <h4 class="text-xl font-black text-white mb-6 flex items-center gap-2">📈 핵심 수치 & 체감 효과 한눈에 비교하기</h4>
         <div class="space-y-5">
           <div>
             <div class="flex justify-between text-sm md:text-base font-bold mb-2">
               <span class="text-gray-200">구분 항목 1 (쉬운 설명 포함)</span>
               <span class="text-emerald-400 font-black">수치 / 특징 요약</span>
             </div>
             <div class="w-full bg-slate-800 h-5 rounded-full overflow-hidden p-0.5">
               <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style="width: 85%"></div>
             </div>
           </div>
           <!-- 3~4개 비교 바 반복 (emerald, blue, amber, rose 색상 활용) -->
         </div>
       </div>
    """

    prompt = f"""
    당신은 주식 투자를 처음 시작하는 초보자들에게 어려운 주식·차트·세금·경제 원리를 세상에서 가장 쉽고 친절하고 명쾌하게 알려주는 대한민국 1타 주식 강사입니다.
    오늘의 강의 주제는 '{topic}' 입니다.

    [강의 제작 핵심 원칙]
    1. **초등학생도 이해하는 일상 비유**: 전문 용어가 나오면 반드시 괄호 안에 쉬운 뜻풀이와 일상생활 비유(예: 마트 할인, 아파트 전세, 건강검진 등)를 함께 적어주세요.
    2. **시각 자료 2종 필수 탑재**: 위에서 제시한 **① 다크모드 SVG 실전 차트/다이어그램**과 **② 컬러 가로 막대 비교 그래프**를 본문 안에 반드시 모두 포함하세요.
    3. **실제 돈(1,000만 원) 계산 시뮬레이션**: 추상적인 설명 대신 "만약 내가 1,000만 원으로 삼성전자/미국주식을 매매했다면 실제로 얼마가 남고 어떻게 계산될까?"를 구체적인 숫자로 비교해 주세요.
    4. **풍성하고 깊이 있는 분량**: 최소 2,200자 이상의 탄탄하고 디테일한 구성으로 작성하세요.

    아래 6단계 구성으로 강의 본문(HTML)을 작성해주세요:

    - **상단 [30초 핵심 3줄 요약 박스]**: 바쁜 직장인·초보자가 30초 만에 오늘 배울 핵심 결론 3가지를 파악할 수 있는 요약 카드
    - **1단계 🎯 왜 이걸 모르면 내 계좌가 손해를 볼까? (공감 사례 & 일상 비유)**
    - **2단계 📊 실전 차트 & 시각화로 한눈에 이해하기** ({visual_section}의 SVG 차트 + 가로 막대 그래프 모두 포함!)
    - **3단계 💰 실전 1,000만 원 시뮬레이션 (실제 숫자 예시로 완벽 정복)**
    - **4단계 🚨 초보자가 가장 많이 당하는 함정 TOP 3 & 1타 강사의 해결책**
    - **5단계 ✅ 매매 버튼 누르기 전 3초 실전 체크리스트 박스**

    또한 문서 맨 첫 줄에 아래 2개의 메타 태그를 정확히 포함해주세요:
    <title-seo>검색 엔진용 22자 이내 핵심 제목</title-seo>
    <summary-push>푸시 알림 및 알림센터 카드에 보여줄 핵심 요약 2문장 (초보자가 가장 궁금해할 핵심 숫자와 꿀팁 포함, 줄바꿈 없이 90자 이내)</summary-push>

    **HTML 포맷팅 규칙** (모바일 및 PC 가독성 최우선):
    1. 전체 내용은 순수 HTML 태그로만 구성하세요 (Markdown 기호 `**`, `###`, ```html 절대 사용 금지).
    2. 큰 제목: <h2 class="text-2xl md:text-3xl font-black text-white pb-3 border-b-2 border-blue-500/40 mb-8 mt-14">
    3. 소제목: <h3 class="text-xl md:text-2xl font-extrabold text-blue-400 mt-10 mb-5 border-l-4 border-blue-500 pl-4 bg-blue-900/15 py-2 rounded-r-xl">
    4. 일반 문단: <p class="text-gray-100 text-base md:text-lg leading-relaxed mb-6 font-normal tracking-wide break-keep">
    5. 중요 단어 강조: <strong class="text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold border-b border-amber-400/50 break-keep">
    6. 목록(리스트): <ul class="list-none space-y-4 mb-8"> + <li class="flex items-start gap-3 text-gray-100 text-base md:text-lg leading-relaxed"><span class="text-blue-400 font-black text-xl mt-0.5 shrink-0">✔</span><span class="flex-1 break-keep">내용</span></li>
    7. 30초 핵심 요약 박스: <div class="bg-gradient-to-br from-blue-950/80 to-indigo-950/60 border border-blue-500/40 rounded-3xl p-6 md:p-8 my-8 shadow-xl"><p class="text-blue-300 font-black text-lg mb-3">⚡ 바쁜 초보자를 위한 30초 핵심 3줄 요약</p>...</div>
    8. 경고/함정 박스: <div class="bg-red-950/40 border-l-4 border-red-500 rounded-2xl p-6 my-8 shadow-lg"><p class="text-red-200 text-base md:text-lg font-bold leading-relaxed mb-0">⚠️ 내용</p></div>
    9. 실전 꿀팁 박스: <div class="bg-emerald-950/40 border-l-4 border-emerald-500 rounded-2xl p-6 my-8 shadow-lg"><p class="text-emerald-200 text-base md:text-lg font-bold leading-relaxed mb-0">💡 내용</p></div>
    10. SEO 내부 링크: 본문 문맥에 맞춰 <a href="/discovery" class="text-blue-300 font-bold underline underline-offset-4">AI 종목 발굴</a>, <a href="/signals" class="text-blue-300 font-bold underline underline-offset-4">실시간 수급 시그널</a>, <a href="/calendar" class="text-blue-300 font-bold underline underline-offset-4">증시 캘린더</a> 링크를 자연스럽게 2회 이상 포함하세요.
    11. 법적 준수: 특정 종목 매수/매도 권유 금지. 마지막에 <p class="text-gray-500 text-sm mt-10">본 자료는 교육 목적으로 제공되며, 투자의 최종 책임은 투자자 본인에게 있습니다.</p> 추가.
    """
    
    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=110)
        content = response.text.replace("```html", "").replace("```", "").strip()
        
        # 제목 추출
        seo_match = re.search(r'<title-seo>(.*?)</title-seo>', content, re.DOTALL)
        if seo_match:
            title = seo_match.group(1).strip()
            content = re.sub(r'<title-seo>.*?</title-seo>\s*', '', content, flags=re.DOTALL).strip()
        else:
            first_word = topic.split('(')[0].split()[0] if topic else "주식"
            prefix = "[오늘의 차트 스터디]" if use_chart else "[주식 1타 강의]"
            title = f"{prefix} {first_word} 완벽 가이드"

        # 푸시 요약 추출
        push_summary = ""
        sum_match = re.search(r'<summary-push>(.*?)</summary-push>', content, re.DOTALL)
        if sum_match:
            push_summary = sum_match.group(1).strip()
            content = re.sub(r'<summary-push>.*?</summary-push>\s*', '', content, flags=re.DOTALL).strip()
            
        # 태그 생성 (주제별 맞춤)
        words = re.findall(r'[가-힣A-Za-z]+', topic)
        base_tags = ["주식초보", "주식1타강사", "차트그래프교육"]
        if use_chart:
            base_tags += ["차트분석", "실전매매타점"]
        else:
            base_tags += ["투자필수상식", "실전계산예시"]
        tags = base_tags + ([words[0]] if words else [])
        
        return title, content, tags, topic, push_summary
    except Exception as e:
        print(f"Gemini API 에러: {e}")
        return None, None, None, None, ""

def post_daily_theory(force=False):
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("Firestore 초기화 실패")
        return False

    # [중복 방지] 오늘 이미 발행된 글이 있으면 중단 (force=True일 때는 강제 재생성)
    kst_check = timezone(timedelta(hours=9))
    today_slug = f"theory-{datetime.now(kst_check).strftime('%Y%m%d')}"
    yesterday_slug = f"theory-{(datetime.now(kst_check) - timedelta(days=1)).strftime('%Y%m%d')}"
    if not force:
        try:
            existing_doc = db.collection("theory_posts").document(today_slug).get()
            if existing_doc.exists:
                existing_title = existing_doc.to_dict().get("title", "(제목 없음)")
                print(f"[Theory Bot] 오늘({today_slug}) 이미 발행된 강의가 있습니다: '{existing_title}' - 중복 발행 방지로 건너뜁니다.")
                return True  # 성공으로 처리하여 재시도 루프 방지
        except Exception as e:
            print(f"[Theory Bot] 중복 체크 중 오류: {e}")
        
    print("오늘의 주식 이론/차트 스터디 콘텐츠 생성 중...")
    force_topic = "주식 매매 세금 총정리 (증권거래세, 양도소득세, 배당소득세)" if force else None
    title, content, tags, topic, push_summary = generate_theory_post(db=db, force_topic=force_topic)
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
        "summary": push_summary,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "author": "StockTrend 차트 마스터",
        "tags": tags,
        "originalTopic": topic,
        "viewCount": random.randint(100, 300)
    }
    
    try:
        doc_ref = db.collection("theory_posts").document(slug)
        doc_ref.set(post_data)
        if force:
            prev_data = dict(post_data)
            prev_data["slug"] = yesterday_slug
            db.collection("theory_posts").document(yesterday_slug).set(prev_data)
            print(f"[SUCCESS] 이전 카드 호환용({yesterday_slug}) 동시 업데이트 완료!")
        
        print(f"[SUCCESS] 글 작성 완료! (ID: {slug}, SVG 포함 여부: {'<svg' in content})")
        new_url = f"https://stock-trend-program.co.kr/theory/{slug}"
        print(f"URL: {new_url}")
        
        clean_title = title.replace('[오늘의 차트 스터디]', '').replace('[주식 1타 강의]', '').strip()
        summary_line = push_summary if push_summary else "초보자도 30초 만에 이해하는 핵심 원리와 1,000만 원 실전 시뮬레이션 예시 완벽 정리"
        
        # 텔레그램 발송 (telegram_service 내부에서 FCM 푸시와 알림 센터 등록까지 모두 자동으로 처리함)
        try:
            from telegram_service import send_telegram_teaser
            teaser_msg = (
                f"📚 <b>[주식 1타 강사] {clean_title}</b>\n\n"
                f"📌 핵심 요약: {summary_line}\n"
                f"📊 수록 자료: <b>실전 차트 그림 · 비교 막대그래프 · 1,000만원 계산 예시</b>\n\n"
                f"👉 <a href='{new_url}'>차트·그래프 포함 강의 보러가기</a>"
            )
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
    import sys
    if "--check-topics" in sys.argv:
        init_firebase()
        db = firestore.client()
        selected = get_topic_today(db=db)
        print(f"[검증 완료] 다음 자동 선정 후보 예시: {selected}")
    else:
        post_daily_theory(force=("--force" in sys.argv))


