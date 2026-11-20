import os
import re
import json
import random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore
import requests

from ai_analysis import generate_with_retry

load_dotenv()

KST = timezone(timedelta(hours=9))


def init_firebase():
    if not firebase_admin._apps:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_KEY",
            os.path.join(script_dir, "firebase-adminsdk.json"),
        )
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"[Economics Bot] Firebase 초기화 에러: {e}")


# ──────────────────────────────────────────────────────────────────────
# 6대 경제학 핵심 분야 메타데이터
# ──────────────────────────────────────────────────────────────────────
ECONOMICS_CATEGORIES = [
    {
        "id": "micro",
        "label": "생활 & 미시경제",
        "emoji": "🛒",
        "shortDesc": "내 일상·가격·소비·기업 선택의 원리",
    },
    {
        "id": "macro",
        "label": "거시경제 & 경기순환",
        "emoji": "🌍",
        "shortDesc": "물가·GDP·실업·호황과 불황의 큰 그림",
    },
    {
        "id": "money",
        "label": "화폐·금리·중앙은행",
        "emoji": "🏦",
        "shortDesc": "돈의 탄생·기준금리·연준·채권과 대출",
    },
    {
        "id": "global",
        "label": "환율·무역·국제경제",
        "emoji": "💱",
        "shortDesc": "달러·엔화·관세·글로벌 자금 흐름",
    },
    {
        "id": "behavior",
        "label": "행동경제 & 돈의 심리",
        "emoji": "🧠",
        "shortDesc": "인간이 돈 앞에서 흔들리는 심리 함정",
    },
    {
        "id": "history",
        "label": "경제사·거장 & 현대경제",
        "emoji": "📜",
        "shortDesc": "역사적 위기·위대한 경제학자·최신 트렌드",
    },
]

CATEGORY_MAP = {c["id"]: c for c in ECONOMICS_CATEGORIES}


# ──────────────────────────────────────────────────────────────────────
# 180일+ 비중복 초보자 경제학 체계적 커리큘럼 (6개 분야 × 30개 = 180개)
# 각 분야는 쉬운 입문 개념 → 실전 응용 순서로 정교하게 배열되어 있습니다.
# ──────────────────────────────────────────────────────────────────────
ECONOMICS_CURRICULUM = [
    # ═══════════════════════════════════════════════
    # 1. 생활 & 미시경제 (micro) - 30개
    # ═══════════════════════════════════════════════
    {"category": "micro", "difficulty": "입문", "topic": "수요와 공급의 법칙 - 왜 배추값과 인기 콘서트 티켓값은 갑자기 뛸까?"},
    {"category": "micro", "difficulty": "입문", "topic": "기회비용(Opportunity Cost) - 치킨을 먹으면 포기해야 하는 진짜 비용의 비밀"},
    {"category": "micro", "difficulty": "입문", "topic": "한계효용 체감의 법칙 - 첫 번째 붕어빵이 세 번째보다 훨씬 맛있는 이유"},
    {"category": "micro", "difficulty": "입문", "topic": "매몰비용(Sunk Cost) - 이미 써버린 돈에 미련을 두면 더 크게 손해 보는 이유"},
    {"category": "micro", "difficulty": "입문", "topic": "가격탄력성 - 소금값은 올라도 사는데, 카페 커피값이 오르면 안 가는 이유"},
    {"category": "micro", "difficulty": "입문", "topic": "대체재와 보완재 - 콜라값이 오르면 사이다가 잘 팔리고 햄버거는 덜 팔리는 원리"},
    {"category": "micro", "difficulty": "입문", "topic": "규모의 경제 - 대기업이 동네 가게보다 물건을 싸게 만들 수 있는 구조적 비밀"},
    {"category": "micro", "difficulty": "입문", "topic": "인센티브의 힘 - 사람은 왜 칭찬보다 보상(인센티브)에 따라 움직일까?"},
    {"category": "micro", "difficulty": "기초", "topic": "죄수의 딜레마 - 서로 협력하면 좋은데 왜 치킨집끼리 출혈 경쟁을 할까?"},
    {"category": "micro", "difficulty": "기초", "topic": "정보의 비대칭성과 레몬시장 - 중고차 시장에 유독 고장 난 차가 많은 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "외부효과(Externality) - 공장 매연과 예방접종이 시장 가격에 빠진 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "공공재와 무임승차자 문제 - 가로등과 국방 서비스를 민간 기업이 못 만드는 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "공유지의 비극 - 주인 없는 풀밭과 어장이 순식간에 황폐해지는 경제학 원리"},
    {"category": "micro", "difficulty": "기초", "topic": "독점·과점·카르텔 - 통신 3사와 정유사가 가격을 비슷하게 유지하는 구조"},
    {"category": "micro", "difficulty": "기초", "topic": "가격차별(Price Discrimination) - 똑같은 영화와 비행기 좌석 가격이 사람마다 다른 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "베블런 효과(과시소비) - 명품 가방은 가격을 올릴수록 왜 더 줄 서서 살까?"},
    {"category": "micro", "difficulty": "기초", "topic": "밴드왜건 효과와 스놉 효과 - 남들 따라 사는 심리와 남들과 달라지고 싶은 심리"},
    {"category": "micro", "difficulty": "기초", "topic": "립스틱 효과 - 경기가 어려울수록 소소한 사치품 매출이 오히려 오르는 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "기펜재(Giffen Good) - 가격이 올랐는데 오히려 더 많이 팔리는 이상한 필수품"},
    {"category": "micro", "difficulty": "기초", "topic": "소비자 잉여와 생산자 잉여 - 중고거래에서 산 사람과 판 사람 모두 웃는 이유"},
    {"category": "micro", "difficulty": "기초", "topic": "고정비와 변동비 - 손님이 없어도 나가는 월세와 손님이 올수록 드는 재료비"},
    {"category": "micro", "difficulty": "기초", "topic": "손익분기점(BEP) - 카페 사장님이 하루에 아메리카노 몇 잔을 팔아야 본전일까?"},
    {"category": "micro", "difficulty": "기초", "topic": "한계비용과 평균비용 - 비행기 출발 직전 땡처리 항공권이 헐값인 경제적 이유"},
    {"category": "micro", "difficulty": "실전", "topic": "네트워크 효과 - 카카오톡과 인스타그램이 후발주자에게 절대 안 밀리는 이유"},
    {"category": "micro", "difficulty": "실전", "topic": "락인(Lock-in) 효과 - 아이폰을 한 번 쓰면 갤럭시로 갈아타기 힘든 전환 비용의 비밀"},
    {"category": "micro", "difficulty": "실전", "topic": "최저임금의 경제학 - 임금이 오르면 소비가 늘까, 아니면 일자리가 줄어들까?"},
    {"category": "micro", "difficulty": "실전", "topic": "파레토 최적과 파레토 법칙(80:20) - 효율성과 형평성 사이의 영원한 숙제"},
    {"category": "micro", "difficulty": "실전", "topic": "코즈의 정리 - 층간소음과 환경오염을 정부 개입 없이 협상으로 해결하는 조건"},
    {"category": "micro", "difficulty": "실전", "topic": "지대추구행위(Rent-seeking) - 혁신 대신 규제와 면허로 돈을 버는 비효율 구조"},
    {"category": "micro", "difficulty": "실전", "topic": "롱테일(Long Tail) 법칙 - 넷플릭스와 쿠팡이 비인기 상품으로 돈을 쓸어 담는 법"},

    # ═══════════════════════════════════════════════
    # 2. 거시경제 & 경기순환 (macro) - 30개
    # ═══════════════════════════════════════════════
    {"category": "macro", "difficulty": "입문", "topic": "GDP(국내총생산) 쉽게 이해하기 - 한 나라의 경제 성적표는 어떻게 매겨질까?"},
    {"category": "macro", "difficulty": "입문", "topic": "인플레이션과 디플레이션 - 물가가 오르는 게 무서울까, 내리는 게 더 무서울까?"},
    {"category": "macro", "difficulty": "입문", "topic": "스태그플레이션 - 경기는 최악인데 물가만 치솟는 가장 끔찍한 경제 상황"},
    {"category": "macro", "difficulty": "입문", "topic": "소비자물가지수(CPI)와 근원물가 - 뉴스 물가보다 내 장바구니 물가가 더 비싼 이유"},
    {"category": "macro", "difficulty": "입문", "topic": "명목GDP vs 실질GDP - 물가 상승 착시를 빼고 진짜 경제 성장을 보는 법"},
    {"category": "macro", "difficulty": "입문", "topic": "GDP와 GNP·GNI의 차이 - 손흥민이 영국에서 번 돈은 한국 GDP에 들어갈까?"},
    {"category": "macro", "difficulty": "입문", "topic": "경기순환 4단계(회복·호황·후퇴·침체) - 경제는 왜 계절처럼 오르내릴까?"},
    {"category": "macro", "difficulty": "입문", "topic": "실업률의 진짜 의미 - 구직을 포기한 사람은 왜 실업률 통계에서 빠질까?"},
    {"category": "macro", "difficulty": "기초", "topic": "생산자물가지수(PPI) - 공장 출고가가 오르면 몇 달 뒤 마트 가격이 뛰는 이유"},
    {"category": "macro", "difficulty": "기초", "topic": "개인소비지출(PCE) 물가지수 - 미국 연준이 CPI보다 PCE를 더 중시하는 이유"},
    {"category": "macro", "difficulty": "기초", "topic": "경기선행·동행·후행지수 - 다가올 불황과 호황을 미리 알려주는 경제 신호등"},
    {"category": "macro", "difficulty": "기초", "topic": "경기침체(리세션)와 회복 모양(V·U·L·K자) - 양극화 회복 K자형이 무서운 이유"},
    {"category": "macro", "difficulty": "기초", "topic": "기저효과(Base Effect) - 작년 성적이 너무 나쁘면 올해가 좋아 보이는 통계 착시"},
    {"category": "macro", "difficulty": "기초", "topic": "재정정책과 추가경정예산(추경) - 경기가 얼어붙을 때 정부가 지갑을 여는 원리"},
    {"category": "macro", "difficulty": "기초", "topic": "승수효과(Multiplier Effect) - 정부가 1조 원을 풀면 왜 경제 전체에 3조 원 효과가 날까?"},
    {"category": "macro", "difficulty": "기초", "topic": "구축효과(Crowding-out) - 정부가 빚을 너무 많이 내면 오히려 민간 기업이 힘든 이유"},
    {"category": "macro", "difficulty": "기초", "topic": "필립스 곡선 - 물가를 잡으려면 왜 실업자가 늘어나는 고통을 감수해야 할까?"},
    {"category": "macro", "difficulty": "기초", "topic": "낙수효과 vs 분수효과 - 대기업 지원과 서민 지원 중 무엇이 경제를 더 살릴까?"},
    {"category": "macro", "difficulty": "기초", "topic": "유동성 함정 - 금리를 0%까지 내려도 사람들이 돈을 안 쓰는 일본식 침체의 늪"},
    {"category": "macro", "difficulty": "기초", "topic": "잠재성장률 - 한국 경제의 기초 체력이 점점 낮아지고 있다는 경고의 뜻"},
    {"category": "macro", "difficulty": "기초", "topic": "지니계수와 로렌츠 곡선 - 빈부격차를 0과 1 사이의 숫자로 측정하는 법"},
    {"category": "macro", "difficulty": "기초", "topic": "엥겔의 법칙 - 소득이 오를수록 전체 지출에서 식비 비중이 줄어드는 이유"},
    {"category": "macro", "difficulty": "실전", "topic": "총수요(AD)와 총공급(AS) - 전쟁으로 유가가 뛰면 물가와 경제가 동시에 흔들리는 이유"},
    {"category": "macro", "difficulty": "실전", "topic": "오쿤의 법칙 - 경제성장률이 떨어질 때 실업률이 얼마나 치솟는지 계산하는 공식"},
    {"category": "macro", "difficulty": "실전", "topic": "래퍼 곡선(Laffer Curve) - 세율을 너무 높이면 오히려 나라 세금이 덜 걷히는 이유"},
    {"category": "macro", "difficulty": "실전", "topic": "직접세와 간접세 - 월급쟁이 소득세와 편의점 부가가치세 10%의 숨은 차이"},
    {"category": "macro", "difficulty": "실전", "topic": "국가부채와 국채 - 나라가 빚을 지는 방식과 파산하지 않는 선진국의 조건"},
    {"category": "macro", "difficulty": "실전", "topic": "중진국 함정 - 빠르게 성장하던 개발도상국이 선진국 문턱에서 멈추는 이유"},
    {"category": "macro", "difficulty": "실전", "topic": "인구절벽과 고령화 경제학 - 출산율 0.7명 시대가 내 연금과 집값에 미치는 영향"},
    {"category": "macro", "difficulty": "실전", "topic": "슈링크플레이션과 스킴플레이션 - 가격은 그대로인데 과자 양과 품질이 줄어드는 현상"},

    # ═══════════════════════════════════════════════
    # 3. 화폐·금리·중앙은행 (money) - 30개
    # ═══════════════════════════════════════════════
    {"category": "money", "difficulty": "입문", "topic": "기준금리란 무엇인가? - 한국은행이 금리를 0.25% 올릴 때 내 대출과 예금에 생기는 일"},
    {"category": "money", "difficulty": "입문", "topic": "복리의 마법과 72의 법칙 - 내 돈이 2배로 불어나는 시간을 3초 만에 계산하는 법"},
    {"category": "money", "difficulty": "입문", "topic": "화폐의 3가지 기능 - 종이 쪼가리에 불과한 5만 원권을 모두가 믿고 쓰는 이유"},
    {"category": "money", "difficulty": "입문", "topic": "돈은 어떻게 복사될까? - 은행의 신용창조와 지급준비율의 놀라운 원리"},
    {"category": "money", "difficulty": "입문", "topic": "단리 vs 복리, 그리고 예금과 적금의 진짜 이자 차이 1분 만에 깨닫기"},
    {"category": "money", "difficulty": "입문", "topic": "명목금리 vs 실질금리(피셔 방정식) - 은행 이자 3%를 받아도 사실상 손해일 수 있는 이유"},
    {"category": "money", "difficulty": "입문", "topic": "미국 연준(Fed)과 FOMC - 왜 전 세계가 미국 중앙은행 의장 입만 쳐다볼까?"},
    {"category": "money", "difficulty": "입문", "topic": "매파(Hawk) vs 비둘기파(Dove) - 경제 뉴스에 새 이름이 자꾸 등장하는 이유"},
    {"category": "money", "difficulty": "기초", "topic": "채권 가격과 금리는 왜 시소처럼 반대로 움직일까? - 초보자 필독 원리"},
    {"category": "money", "difficulty": "기초", "topic": "양적완화(QE)와 양적긴축(QT) - 중앙은행이 시중에 돈을 풀고 다시 거두어들이는 기술"},
    {"category": "money", "difficulty": "기초", "topic": "테이퍼링(Tapering) - 돈을 아예 끊는 게 아니라 수도꼭지를 서서히 잠그는 신호"},
    {"category": "money", "difficulty": "기초", "topic": "장단기 금리차 역전 - 10년 만기 국채 금리가 2년물보다 낮아지면 불황이 오는 이유"},
    {"category": "money", "difficulty": "기초", "topic": "예대마진과 코픽스(COFIX) - 은행들이 금리 상승기에 역대급 이익을 내는 구조"},
    {"category": "money", "difficulty": "기초", "topic": "예금자보호제도(5천만 원→1억 원)와 뱅크런 - 은행이 망할 때 내 돈을 지키는 법"},
    {"category": "money", "difficulty": "기초", "topic": "통화량 지표 M1·M2 - 시중에 현금이 얼마나 풀려있는지 숫자로 확인하는 법"},
    {"category": "money", "difficulty": "기초", "topic": "인플레이션 타겟팅 - 중앙은행들은 왜 물가 상승률 0%가 아니라 2%를 목표로 삼을까?"},
    {"category": "money", "difficulty": "기초", "topic": "LTV·DTI·DSR 대출 3총사 - 내 연봉으로 집 살 때 은행에서 최대 얼마까지 빌릴 수 있을까?"},
    {"category": "money", "difficulty": "기초", "topic": "원리금균등 vs 원금균등 vs 만기일시 - 대출 상환 방식에 따라 이자가 수천만 원 달라지는 이유"},
    {"category": "money", "difficulty": "기초", "topic": "CMA와 MMF 파킹통장 - 하루만 맡겨도 이자가 붙는 단기 금융상품의 비밀"},
    {"category": "money", "difficulty": "기초", "topic": "하이퍼인플레이션 - 빵 한 개 사려고 수레에 돈을 싣고 갔던 독일과 짐바브웨 이야기"},
    {"category": "money", "difficulty": "기초", "topic": "그레셤의 법칙 - 왜 나쁜 돈(악화)이 좋은 돈(양화)을 시장에서 몰아낼까?"},
    {"category": "money", "difficulty": "실전", "topic": "회사채와 신용등급(AAA~정크본드) - 수익률이 너무 높은 채권에 숨어있는 부도 위험"},
    {"category": "money", "difficulty": "실전", "topic": "공개시장운영과 RP(환매조건부채권) - 중앙은행이 매일 금리를 미세 조정하는 비결"},
    {"category": "money", "difficulty": "실전", "topic": "디레버리징(부채 축소) - 빚으로 쌓은 거품이 꺼질 때 경제가 겪는 고통과 회복"},
    {"category": "money", "difficulty": "실전", "topic": "마이너스 금리 - 은행에 돈을 맡기면 오히려 보관료를 내야 했던 유럽과 일본 이야기"},
    {"category": "money", "difficulty": "실전", "topic": "헬리콥터 머니 - 중앙은행이 국민 통장에 직접 돈을 꽂아주면 생기는 일"},
    {"category": "money", "difficulty": "실전", "topic": "그림자 금융(Shadow Banking) - 은행 규제를 피해 움직이는 거대 자금의 위험성"},
    {"category": "money", "difficulty": "실전", "topic": "CBDC(중앙은행 디지털화폐) - 현금이 사라진 세상에서 한국은행이 발행하는 디지털 원화"},
    {"category": "money", "difficulty": "실전", "topic": "스테이블코인(USDT·USDC) - 달러와 1:1로 연동되는 디지털 달러가 금융을 바꾸는 법"},
    {"category": "money", "difficulty": "실전", "topic": "리디노미네이션(화폐개혁) - 1,000원을 1원으로 바꾸면 물가와 부동산은 어떻게 될까?"},

    # ═══════════════════════════════════════════════
    # 4. 환율·무역·국제경제 (global) - 30개
    # ═══════════════════════════════════════════════
    {"category": "global", "difficulty": "입문", "topic": "환율의 기초 원리 - 원달러 환율이 1,200원에서 1,450원이 되면 좋은 걸까 나쁜 걸까?"},
    {"category": "global", "difficulty": "입문", "topic": "원화 강세 vs 원화 약세 - 환율이 오를 때 웃는 수출기업과 우는 해외여행객·수입기업"},
    {"category": "global", "difficulty": "입문", "topic": "빅맥 지수와 구매력평가설(PPP) - 전 세계 맥도날드 버거 가격으로 적정 환율 맞추기"},
    {"category": "global", "difficulty": "입문", "topic": "비교우위와 절대우위(리카도) - 모든 걸 잘하는 나라도 왜 다른 나라와 무역할까?"},
    {"category": "global", "difficulty": "입문", "topic": "무역수지와 경상수지 - 물건 팔아 번 돈과 여행·배당으로 나간 돈의 국가 가계부"},
    {"category": "global", "difficulty": "입문", "topic": "관세와 보호무역주의 - 미국이 수입품에 높은 관세를 매기면 결국 누가 돈을 낼까?"},
    {"category": "global", "difficulty": "입문", "topic": "자유무역협정(FTA) - 관세 장벽을 허물면 소비자는 웃고 국내 일부 산업은 긴장하는 이유"},
    {"category": "global", "difficulty": "입문", "topic": "기축통화 달러의 힘 - 미국이 빚을 아무리 많이 져도 쉽게 망하지 않는 초특권"},
    {"category": "global", "difficulty": "기초", "topic": "외환보유고와 통화스와프 - 국가 비상금 달러가 바닥나면 왜 외환위기가 터질까?"},
    {"category": "global", "difficulty": "기초", "topic": "엔캐리 트레이드(Yen Carry Trade) - 일본 엔화 금리가 오르면 왜 전 세계 증시가 흔들릴까?"},
    {"category": "global", "difficulty": "기초", "topic": "금본위제와 브레튼우즈 체제 - 달러가 원래는 금과 바꿔주는 교환권이었다는 사실"},
    {"category": "global", "difficulty": "기초", "topic": "플라자 합의(1985) - 미국이 일본 엔화 가치를 강제로 2배 끌어올린 역사적 사건"},
    {"category": "global", "difficulty": "기초", "topic": "달러 인덱스(DXY) - 원화 말고 전 세계 주요 6개 통화 대비 달러의 진짜 힘 읽기"},
    {"category": "global", "difficulty": "기초", "topic": "환헤지(H) vs 환노출(UH) - 미국 주식·ETF 살 때 환율 변동 위험을 막을까 말까?"},
    {"category": "global", "difficulty": "기초", "topic": "원유(WTI·브렌트유)와 OPEC+ - 산유국들이 석유 생산량을 줄이면 내 주유비와 물가가 뛰는 구조"},
    {"category": "global", "difficulty": "기초", "topic": "닥터 코퍼(구리 박사) - 구리 가격이 오르면 세계 경제가 좋아진다고 예측하는 이유"},
    {"category": "global", "difficulty": "기초", "topic": "발틱운임지수(BDI) - 바다 위 화물선 운임으로 글로벌 경기 회복을 미리 읽는 법"},
    {"category": "global", "difficulty": "기초", "topic": "해외직구와 관부가세 - 직구할 때 150달러(미국 200달러)를 넘기면 세금이 붙는 원리"},
    {"category": "global", "difficulty": "기초", "topic": "덤핑과 반덤핑 관세 - 외국 기업이 원가 이하로 싸게 팔아 시장을 장악하려는 전략"},
    {"category": "global", "difficulty": "기초", "topic": "글로벌 공급망과 리쇼어링·프렌드쇼어링 - 공장을 중국에서 미국·동맹국으로 옮기는 이유"},
    {"category": "global", "difficulty": "실전", "topic": "트리핀 딜레마 - 달러를 세계에 공급하면 미국 무역적자가 커지는 기축통화의 모순"},
    {"category": "global", "difficulty": "실전", "topic": "국제금융 트릴레마(불가능한 삼위일체) - 환율 안정·금리 독립·자본 자유 중 2개만 고르는 법"},
    {"category": "global", "difficulty": "실전", "topic": "달러 스마일 이론 - 미국 경제가 너무 좋아도, 전 세계가 공포에 빠져도 달러가 오르는 이유"},
    {"category": "global", "difficulty": "실전", "topic": "페트로달러(오일달러) - 석유를 달러로만 결제하게 만들어 달러 패권을 굳힌 비밀"},
    {"category": "global", "difficulty": "실전", "topic": "핫머니(Hot Money)와 자본유출 - 단기 투기자금이 신흥국에 들어왔다 빠져나갈 때의 충격"},
    {"category": "global", "difficulty": "실전", "topic": "J커브 효과 - 환율이 올라도 무역수지가 바로 흑자로 안 바뀌고 잠시 더 나빠지는 이유"},
    {"category": "global", "difficulty": "실전", "topic": "환율조작국(관찰대상국) 지정 기준 - 미국 재무부가 한국 환율 정책을 감시하는 3가지 조건"},
    {"category": "global", "difficulty": "실전", "topic": "브릭스(BRICS)와 탈달러화 - 중국·러시아 등이 달러 대신 금을 쓸어 담는 이유"},
    {"category": "global", "difficulty": "실전", "topic": "소버린 리스크와 CDS 프리미엄 - 한 나라의 국가부도 위험을 보험료로 측정하는 법"},
    {"category": "global", "difficulty": "실전", "topic": "유로존 단일통화의 명암 - 그리스 재정위기 때 독일이 구제금융을 두고 갈등한 이유"},

    # ═══════════════════════════════════════════════
    # 5. 행동경제 & 돈의 심리 (behavior) - 30개
    # ═══════════════════════════════════════════════
    {"category": "behavior", "difficulty": "입문", "topic": "손실회피 편향 - 10만 원 벌었을 때의 기쁨보다 10만 원 잃었을 때의 고통이 2배 큰 이유"},
    {"category": "behavior", "difficulty": "입문", "topic": "넛지(Nudge) 이론 - 강요하지 않고 부드러운 팔꿈치 톡으로 사람들의 선택을 바꾸는 기술"},
    {"category": "behavior", "difficulty": "입문", "topic": "앵커링(닻내림) 효과 - '원래 10만 원인데 5만 원 할인!' 문구에 지갑이 열리는 심리"},
    {"category": "behavior", "difficulty": "입문", "topic": "심적 회계(Mental Accounting) - 똑같은 10만 원인데 월급은 아끼고 보너스는 펑펑 쓰는 이유"},
    {"category": "behavior", "difficulty": "입문", "topic": "디코이(미끼) 효과 - 영화관 팝콘 중짜가 살짝 애매한 가격이라 대짜를 사게 되는 비밀"},
    {"category": "behavior", "difficulty": "입문", "topic": "프레이밍 효과 - '지방 10% 함유'보다 '90% 무지방' 요거트가 훨씬 잘 팔리는 이유"},
    {"category": "behavior", "difficulty": "입문", "topic": "보유효과(소유효과) - 내가 가진 중고 물건은 남들이 보는 가격보다 무조건 비싸 보이는 심리"},
    {"category": "behavior", "difficulty": "입문", "topic": "라테 효과(Latte Factor) - 매일 습관처럼 쓰는 커피 한 잔이 10년 뒤 수천만 원이 되는 원리"},
    {"category": "behavior", "difficulty": "기초", "topic": "확증편향 - 내가 산 주식에 좋은 뉴스만 골라 읽고 나쁜 뉴스는 무시하는 위험한 뇌"},
    {"category": "behavior", "difficulty": "기초", "topic": "현재편향과 쌍곡선 할인 - 내일 받을 11만 원보다 당장 오늘 받을 10만 원이 더 끌리는 이유"},
    {"category": "behavior", "difficulty": "기초", "topic": "디폴트(기본값) 효과 - 자동이체와 연금 자동가입만 켜둬도 저축률이 2배 오르는 이유"},
    {"category": "behavior", "difficulty": "기초", "topic": "선택의 역설(잼 실험) - 메뉴가 30가지인 식당보다 5가지인 식당에서 주문이 더 잘 되는 이유"},
    {"category": "behavior", "difficulty": "기초", "topic": "군중심리(허딩 효과)와 FOMO - 남들 다 돈 번다는 소리에 꼭대기에서 뛰어드는 이유"},
    {"category": "behavior", "difficulty": "기초", "topic": "매몰비용의 오류(콩코드 효과) - 재미없는 영화도 티켓값이 아까워 끝까지 보고 후회하는 심리"},
    {"category": "behavior", "difficulty": "기초", "topic": "화폐착각(Money Illusion) - 월급이 3% 올랐지만 물가가 5% 오르면 사실상 월급이 깎인 것"},
    {"category": "behavior", "difficulty": "기초", "topic": "파킨슨의 법칙 - 연봉이 올라도 왜 통장 잔고는 여전히 빠듯할까?"},
    {"category": "behavior", "difficulty": "기초", "topic": "처분효과(Disposition Effect) - 수익 난 주식은 빨리 팔고 손실 난 주식은 끝까지 버티는 습관"},
    {"category": "behavior", "difficulty": "기초", "topic": "도박사의 오류 - 동전 앞면이 5번 연속 나왔다고 다음엔 뒷면이 나올 거라는 착각"},
    {"category": "behavior", "difficulty": "기초", "topic": "과신 편향(Overconfidence) - 운 좋게 두 번 수익 낸 초보자가 스스로를 고수라 믿는 함정"},
    {"category": "behavior", "difficulty": "기초", "topic": "현상유지 편향 - 더 좋은 조건의 적금과 요금제가 있어도 귀찮아서 안 바꾸는 심리"},
    {"category": "behavior", "difficulty": "기초", "topic": "가용성 휴리스틱 - 비행기 사고 뉴스를 본 직후 자동차보다 비행기가 더 위험하다고 느끼는 착각"},
    {"category": "behavior", "difficulty": "기초", "topic": "후회 회피 편향 - 팔고 나서 오를까 봐 두려워 결정 자체를 미루다 기회를 놓치는 심리"},
    {"category": "behavior", "difficulty": "실전", "topic": "프로스펙트 이론(대니얼 카너먼) - 노벨 경제학상을 받은 인간 의사결정의 진짜 지도"},
    {"category": "behavior", "difficulty": "실전", "topic": "시스템1(빠른 직감)과 시스템2(느린 이성) - 충동구매를 막고 합리적 소비를 하는 뇌 사용법"},
    {"category": "behavior", "difficulty": "실전", "topic": "역선택과 도덕적 해이 - 보험에 가입한 뒤 사람들이 덜 조심하게 되는 정보 비대칭 문제"},
    {"category": "behavior", "difficulty": "실전", "topic": "시그널링(신호 발송) 이론 - 명문대 졸업장과 제품 무상보증 기간이 시장에 보내는 신호"},
    {"category": "behavior", "difficulty": "실전", "topic": "게임이론과 치킨게임 - 반도체 기업들이 적자를 보면서도 끝까지 증설 경쟁을 벌이는 이유"},
    {"category": "behavior", "difficulty": "실전", "topic": "최후통첩 게임 - 경제학 계산과 달리 사람은 왜 불공정한 공짜 돈은 거절할까?"},
    {"category": "behavior", "difficulty": "실전", "topic": "승자의 저주(Winner's Curse) - 경매나 기업 인수전에서 최고가로 낙찰받고 오히려 손해 보는 이유"},
    {"category": "behavior", "difficulty": "실전", "topic": "깨진 유리창의 경제학 - 사소한 낭비와 무질서 하나를 방치하면 큰 재정 위기로 번지는 원리"},

    # ═══════════════════════════════════════════════
    # 6. 경제사·거장 & 현대경제 (history) - 30개
    # ═══════════════════════════════════════════════
    {"category": "history", "difficulty": "입문", "topic": "애덤 스미스와 '보이지 않는 손' - 각자 자기 이익만 챙기는데 왜 세상이 잘 돌아갈까?"},
    {"category": "history", "difficulty": "입문", "topic": "국부론 핀 공장의 분업 원리 - 혼자 만들면 하루 1개, 나눠 만들면 4,800개가 되는 마법"},
    {"category": "history", "difficulty": "입문", "topic": "존 메이너드 케인스와 수정자본주의 - 불황일 때 정부가 나서서 땅이라도 파야 하는 이유"},
    {"category": "history", "difficulty": "입문", "topic": "1929년 미국 대공황과 뉴딜정책 - 역사상 최악의 경제 붕괴는 왜 일어났고 어떻게 극복했을까?"},
    {"category": "history", "difficulty": "입문", "topic": "1997년 대한민국 IMF 외환위기 - 금 모으기 운동을 하게 된 외환위기의 원인 5분 정리"},
    {"category": "history", "difficulty": "입문", "topic": "2008년 글로벌 금융위기 - 미국 집값 거품(서브프라임 모기지)이 전 세계를 무너뜨린 과정"},
    {"category": "history", "difficulty": "입문", "topic": "17세기 네덜란드 튤립 버블 - 꽃구근 한 알이 저택 한 채 가격까지 치솟았던 최초의 거품"},
    {"category": "history", "difficulty": "입문", "topic": "구독 경제(Subscription Economy) - 소유에서 구독으로! 기업들이 월정액에 목매는 이유"},
    {"category": "history", "difficulty": "기초", "topic": "프리드리히 하이에크와 신자유주의 - 정부의 개입을 줄이고 시장의 자유를 믿어야 하는 이유"},
    {"category": "history", "difficulty": "기초", "topic": "밀턴 프리드먼과 통화주의 - '인플레이션은 언제 어디서나 화폐적 현상이다'의 진짜 의미"},
    {"category": "history", "difficulty": "기초", "topic": "슘페터의 창조적 파괴 - 마차에서 자동차로, 필름에서 스마트폰으로 경제가 진화하는 원리"},
    {"category": "history", "difficulty": "기초", "topic": "1970년대 1·2차 오일쇼크 - 중동 전쟁 한 번에 전 세계 물가가 폭등했던 석유 위기"},
    {"category": "history", "difficulty": "기초", "topic": "일본의 잃어버린 30년 - 도쿄 땅값으로 미국 전체를 살 수 있었던 버블의 붕괴와 교훈"},
    {"category": "history", "difficulty": "기초", "topic": "2000년 닷컴 버블 - 회사 이름에 '.com'만 붙어도 주가가 폭등했다 사라진 IT 거품의 역사"},
    {"category": "history", "difficulty": "기초", "topic": "2020년 팬데믹 머니 프린팅 - 코로나 시기 역대급 돈 풀기가 자산 폭등과 인플레를 부른 과정"},
    {"category": "history", "difficulty": "기초", "topic": "플랫폼 경제와 양면시장 - 배달의민족·쿠팡·우버가 무료 혜택으로 생태계를 장악하는 전략"},
    {"category": "history", "difficulty": "기초", "topic": "공유 경제의 빛과 그림자 - 에어비앤비와 우버가 기존 산업과 충돌하며 바꾼 세상"},
    {"category": "history", "difficulty": "기초", "topic": "긱 이코노미(Gig Economy) - 평생직장 대신 프로젝트·배달·프리랜서로 일하는 노동 혁명"},
    {"category": "history", "difficulty": "기초", "topic": "대항해시대와 주식회사의 탄생 - 네덜란드 동인도회사가 인류 최초의 주식을 발행한 이유"},
    {"category": "history", "difficulty": "기초", "topic": "ESG 경영과 탄소배출권 - 이제 친환경과 지배구조가 기업의 돈벌이가 되는 시대"},
    {"category": "history", "difficulty": "기초", "topic": "AI와 생산성 혁명 - 인공지능이 인간의 일자리를 뺏을까, 아니면 새로운 부를 만들까?"},
    {"category": "history", "difficulty": "기초", "topic": "기본소득(UBI) 찬반 경제학 - 조건 없이 모든 국민에게 돈을 나눠주면 경제는 어떻게 될까?"},
    {"category": "history", "difficulty": "실전", "topic": "토마 피케티의 '21세기 자본(r > g)' - 월급 모으는 속도보다 자본이 불리는 속도가 빠른 이유"},
    {"category": "history", "difficulty": "실전", "topic": "칼 마르크스와 자본론의 시선 - 자본주의의 빛과 그림자를 비판적으로 바라본 거장"},
    {"category": "history", "difficulty": "실전", "topic": "멜서스 트랩(인구론) - 인구는 기하급수로 늘고 식량은 산술급수로 는다는 예언은 왜 빗나갔을까?"},
    {"category": "history", "difficulty": "실전", "topic": "현대화폐이론(MMT) - 자국 화폐를 찍을 수 있는 나라는 재정적자를 걱정 안 해도 될까?"},
    {"category": "history", "difficulty": "실전", "topic": "유니콘 기업과 벤처캐피탈(VC) - 적자가 수천억 원인데도 기업가치가 수조 원으로 평가받는 비밀"},
    {"category": "history", "difficulty": "실전", "topic": "순환경제(Circular Economy) - 버리고 새로 만드는 대신 재사용·리사이클링으로 돈을 버는 미래"},
    {"category": "history", "difficulty": "실전", "topic": "브렉시트(Brexit)의 경제학 - 영국이 유럽연합을 탈퇴한 뒤 무역·물가·파운드화에 벌어진 일"},
    {"category": "history", "difficulty": "실전", "topic": "실크로드에서 반도체 전쟁까지 - 세계 경제의 패권은 언제나 핵심 물자와 교역로를 따라 이동한다"},
]


def _norm_text(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", (s or "").upper())


def _extract_concept_keywords(topic: str) -> tuple:
    stopwords = {
        "경제", "경제학", "이유", "원리", "비밀", "방법", "쉽게", "이해", "이해하기", "완벽",
        "기초", "개념", "차이", "차이점", "구조", "시장", "기업", "가격", "돈", "효과",
        "법칙", "이론", "현상", "전략", "영향", "관계", "역사", "시대", "세계", "미국",
        "한국", "정부", "사람", "사람들", "우리", "내", "왜", "어떻게", "무엇인가", "무엇",
        "정리", "가이드", "실전", "초보자", "필독", "이야기", "과정", "문제", "위기", "심리",
    }
    eng_kws = []
    for eng in re.findall(r"[A-Za-z]{2,}", topic.upper()):
        if eng not in {"VS", "AND", "THE", "IN", "ON", "TO", "OF", "FOR", "IT", "AI"}:
            eng_kws.append(eng)

    main_part = re.split(r"\s*-\s*|\s*\?\s*", topic)[0]
    kor_kws = []
    for tok in re.findall(r"[가-힣]{2,}", main_part):
        clean_tok = re.sub(r"(이란|란|으로|로|에서|의|과|와|을|를|이|가|은|는|들)$", "", tok)
        if len(clean_tok) >= 2 and clean_tok not in stopwords:
            kor_kws.append(_norm_text(clean_tok))
    return list(dict.fromkeys(eng_kws)), list(dict.fromkeys(kor_kws))


def get_existing_economics_history(db=None):
    """
    Firestore economics_posts 전체 이력을 조회해 중복 체크용 세트와 통계 반환
    """
    used_topics = set()
    used_raw_titles = []
    used_norm_titles = []
    category_counts = {c["id"]: 0 for c in ECONOMICS_CATEGORIES}
    last_category = None
    total_posts = 0
    max_day_number = 0
    published_map = {}  # normalized topic -> {slug, dayNumber, title}

    if not db:
        return {
            "used_topics": used_topics,
            "used_raw_titles": used_raw_titles,
            "used_norm_titles": used_norm_titles,
            "category_counts": category_counts,
            "last_category": last_category,
            "total_posts": total_posts,
            "max_day_number": max_day_number,
            "published_map": published_map,
        }

    try:
        docs = list(db.collection("economics_posts").stream())
        # createdAt 기준 최신순 파악을 위해 정렬
        def _sort_key(d):
            data = d.to_dict() or {}
            day_num = int(data.get("dayNumber", 0) or 0)
            slug = str(data.get("slug", d.id))
            return (day_num, slug)

        docs.sort(key=_sort_key)
        total_posts = len(docs)

        for d in docs:
            data = d.to_dict() or {}
            day_num = int(data.get("dayNumber", 0) or 0)
            if day_num > max_day_number:
                max_day_number = day_num

            cat = data.get("category", "")
            if cat in category_counts:
                category_counts[cat] += 1
                last_category = cat

            orig = (data.get("originalTopic") or "").strip()
            title = (data.get("title") or "").strip()
            slug = data.get("slug", d.id)

            for val in (orig, title):
                if val:
                    used_topics.add(val)
                    used_raw_titles.append(val)
                    used_norm_titles.append(_norm_text(val))

            if orig:
                published_map[_norm_text(orig)] = {
                    "slug": slug,
                    "dayNumber": day_num,
                    "title": title,
                }
    except Exception as e:
        print(f"[Economics Bot] 과거 발행 이력 조회 실패: {e}")

    return {
        "used_topics": used_topics,
        "used_raw_titles": used_raw_titles,
        "used_norm_titles": used_norm_titles,
        "category_counts": category_counts,
        "last_category": last_category,
        "total_posts": total_posts,
        "max_day_number": max_day_number,
        "published_map": published_map,
    }


def is_economics_topic_used(topic: str, history: dict) -> bool:
    norm = _norm_text(topic)
    if topic in history["used_topics"] or norm in history["used_norm_titles"]:
        return True

    eng_kws, kor_kws = _extract_concept_keywords(topic)
    for ekw in eng_kws:
        pat = re.compile(r"(?<![A-Za-z])" + re.escape(ekw) + r"(?![A-Za-z])", re.IGNORECASE)
        for past_raw in history["used_raw_titles"]:
            if pat.search(past_raw):
                return True

    # 핵심 개념어가 2개 이상이면 과반수 일치, 1개면 해당 1개가 포함될 때 중복으로 간주
    if kor_kws:
        for past_norm in history["used_norm_titles"]:
            matched = sum(1 for kw in kor_kws if len(kw) >= 2 and kw in past_norm)
            threshold = 1 if len(kor_kws) <= 2 else 2
            if matched >= threshold:
                # 단, 메인 핵심 첫 키워드(예: 수요와공급, 기회비용 등 3글자 이상)가 정확히 일치할 때 확실히 차단
                if kor_kws[0] in past_norm and len(kor_kws[0]) >= 3:
                    return True
                if matched >= 2:
                    return True
    return False


def select_next_economics_topic(db=None, preferred_category: str = None, custom_topic: str = None) -> dict:
    """
    지금까지 발행된 모든 경제학 강의와 단 1개도 겹치지 않는 다음 주제를 선정합니다.
    - 6개 분야를 골고루 로테이션하여 매일 질리지 않고 체계적으로 학습할 수 있게 합니다.
    - 각 분야에서는 쉬운 입문 -> 기초 -> 실전 순서대로 미출제 주제를 우선 선택합니다.
    - 180개 커리큘럼을 모두 완주하면 AI가 과거 목록과 겹치지 않는 새로운 경제학 주제를 자동 생성합니다.
    """
    history = get_existing_economics_history(db=db)

    # 사용자가 직접 주제를 지정한 경우
    if custom_topic and custom_topic.strip():
        cat_id = preferred_category if preferred_category in CATEGORY_MAP else "micro"
        cat_info = CATEGORY_MAP[cat_id]
        return {
            "category": cat_id,
            "categoryLabel": cat_info["label"],
            "categoryEmoji": cat_info["emoji"],
            "difficulty": "맞춤",
            "topic": custom_topic.strip(),
            "nextDayNumber": max(history["max_day_number"], history["total_posts"]) + 1,
        }

    # 미출제 커리큘럼 필터링
    available_by_cat = {c["id"]: [] for c in ECONOMICS_CATEGORIES}
    for item in ECONOMICS_CURRICULUM:
        if not is_economics_topic_used(item["topic"], history):
            available_by_cat[item["category"]].append(item)

    total_available = sum(len(v) for v in available_by_cat.values())
    print(
        f"[Economics Bot] 누적 발행 {history['total_posts']}강 전수 대조 완료 | "
        f"남은 비중복 커리큘럼: {total_available}개 / {len(ECONOMICS_CURRICULUM)}개"
    )

    chosen_item = None

    # 1) 특정 분야 요청이 있고 해당 분야에 미출제 주제가 있으면 우선 선택 (앞쪽 쉬운 입문부터)
    if preferred_category and preferred_category in available_by_cat and available_by_cat[preferred_category]:
        chosen_item = available_by_cat[preferred_category][0]
    elif total_available > 0:
        # 2) 자동 분야 순환: 직전 분야 제외 + 지금까지 가장 적게 출제된 분야 우선
        cat_order = [c["id"] for c in ECONOMICS_CATEGORIES]
        candidates = [cid for cid in cat_order if available_by_cat[cid]]

        # 직전 분야가 아닌 것 중 발행 횟수가 가장 적은 분야 선택
        non_repeat = [cid for cid in candidates if cid != history["last_category"]]
        pool = non_repeat if non_repeat else candidates
        pool.sort(key=lambda cid: (history["category_counts"].get(cid, 0), cat_order.index(cid)))

        selected_cat = pool[0]
        # 해당 분야에서 입문 -> 기초 -> 실전 순서대로 첫 번째 미출제 주제 선택!
        chosen_item = available_by_cat[selected_cat][0]
    else:
        # 3) 180개 커리큘럼 전부 완주 시: AI가 과거 목록과 절대 겹치지 않는 신규 주제 생성!
        print("[Economics Bot] 180일 기본 커리큘럼 완주! AI로 신규 비중복 경제학 주제를 생성합니다.")
        past_list_str = ", ".join(list(history["used_topics"])[:180])
        target_cat_id = preferred_category if preferred_category in CATEGORY_MAP else random.choice(list(CATEGORY_MAP.keys()))
        target_cat_label = CATEGORY_MAP[target_cat_id]["label"]
        new_topic = f"생활 속 숨은 경제 원리 심화 #{history['total_posts'] + 1}"
        try:
            prompt = (
                f"다음은 지금까지 발행된 초보자 경제학 강의 목록입니다: [{past_list_str}]\n"
                f"위 목록에 나온 개념이나 주제와 단 하나도 겹치지 않는, '{target_cat_label}' 분야의 "
                f"초보자가 꼭 알면 좋은 흥미로운 경제학 주제를 '핵심개념명 - 초보자가 궁금해할 쉬운 부제' 형식으로 딱 1줄(45자 이내)만 출력하세요."
            )
            resp = generate_with_retry(prompt, json_mode=False, timeout=30)
            candidate_text = resp.text.strip().split("\n")[0].replace('"', "").replace("'", "").strip()
            if candidate_text and len(candidate_text) >= 6:
                new_topic = candidate_text
        except Exception as e:
            print(f"[Economics Bot] AI 신규 경제학 주제 생성 오류: {e}")

        chosen_item = {
            "category": target_cat_id,
            "difficulty": "심화",
            "topic": new_topic,
        }

    cat_info = CATEGORY_MAP.get(chosen_item["category"], ECONOMICS_CATEGORIES[0])
    return {
        "category": chosen_item["category"],
        "categoryLabel": cat_info["label"],
        "categoryEmoji": cat_info["emoji"],
        "difficulty": chosen_item.get("difficulty", "입문"),
        "topic": chosen_item["topic"],
        "nextDayNumber": max(history["max_day_number"], history["total_posts"]) + 1,
    }


def _parse_quiz_json(raw_str: str, fallback_topic: str) -> list:
    """
    AI 응답에서 추출한 퀴즈 JSON을 안전하게 파싱하고 검증합니다.
    """
    try:
        cleaned = raw_str.strip()
        cleaned = re.sub(r"^```json\s*", "", cleaned)
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        data = json.loads(cleaned)
        if isinstance(data, list) and len(data) >= 1:
            valid = []
            for q in data[:3]:
                if (
                    isinstance(q, dict)
                    and q.get("question")
                    and isinstance(q.get("options"), list)
                    and len(q["options"]) >= 2
                ):
                    ans_idx = int(q.get("answerIndex", 0))
                    if ans_idx < 0 or ans_idx >= len(q["options"]):
                        ans_idx = 0
                    valid.append({
                        "question": str(q["question"]).strip(),
                        "options": [str(o).strip() for o in q["options"][:4]],
                        "answerIndex": ans_idx,
                        "explanation": str(q.get("explanation", "오늘 강의의 핵심 원리를 다시 한번 확인해 보세요!")).strip(),
                    })
            if valid:
                return valid
    except Exception as e:
        print(f"[Economics Bot] 퀴즈 JSON 파싱 실패(폴백 사용): {e}")

    return [
        {
            "question": f"오늘 배운 '{fallback_topic.split('-')[0].strip()}' 개념을 일상이나 투자에 적용할 때 가장 올바른 태도는 무엇일까요?",
            "options": [
                "단순한 느낌이나 소문 대신 경제 원리와 인과관계를 먼저 확인한다",
                "경제 지표나 비용은 무시하고 남들이 하는 대로 무조건 따라 한다",
                "경제학은 전문가만 필요하므로 내 지갑과는 전혀 무관하다고 생각한다",
            ],
            "answerIndex": 0,
            "explanation": "경제학의 핵심은 한정된 자원과 돈으로 가장 현명한 선택을 내리는 것입니다. 오늘 배운 개념을 뉴스와 소비 생활에 한 번씩 대입해 보면 실력이 빠르게 늡니다!",
        }
    ]


def generate_economics_post(db=None, preferred_category: str = None, custom_topic: str = None):
    """
    초보자가 5분 만에 무릎을 탁 치며 이해하는 고품질 1일 1경제학 강의를 생성합니다.
    """
    selection = select_next_economics_topic(
        db=db,
        preferred_category=preferred_category,
        custom_topic=custom_topic,
    )
    topic = selection["topic"]
    category = selection["category"]
    category_label = selection["categoryLabel"]
    category_emoji = selection["categoryEmoji"]
    difficulty = selection["difficulty"]
    day_number = selection["nextDayNumber"]

    prompt = f"""
당신은 대한민국에서 경제학을 가장 쉽고 재미있고 명쾌하게 가르치는 '초보자 눈높이 1타 경제학 선생님'입니다.
경제학을 처음 공부하는 왕초보도 "아~ 경제학이 이렇게 재밌고 내 삶이랑 바로 연결되는구나!" 하고 감탄하도록 오늘의 강의를 작성해 주세요.

[오늘의 강의 정보]
- 회차: Day {day_number} (매일 1일 1경제학)
- 분야: {category_emoji} {category_label}
- 난이도: {difficulty}
- 오늘의 주제: '{topic}'

[필수 출력 메타 태그 - 반드시 문서 최상단에 정확히 포함!]
<title-seo>호기심을 자극하는 초보자 친화 제목 (32자 이내, 대괄호 말머리 없이 깔끔하게)</title-seo>
<one-line-def>초등학생도 3초 만에 이해하는 오늘 주제의 한 줄 핵심 정의 (55자 이내)</one-line-def>
<summary-push>알림과 카드 미리보기에 들어갈 친절한 핵심 요약 2문장 (95자 이내, 줄바꿈 없이)</summary-push>
<quiz-json>
[
  {{
    "question": "오늘 배운 핵심 개념을 일상 상황에 대입한 재미있는 복습 문제 1",
    "options": ["보기 1", "보기 2", "보기 3"],
    "answerIndex": 0,
    "explanation": "왜 정답인지 초보자 눈높이로 1~2문장 친절한 해설"
  }},
  {{
    "question": "실전 뉴스나 내 지갑·투자에 적용해 보는 복습 문제 2",
    "options": ["보기 1", "보기 2", "보기 3"],
    "answerIndex": 1,
    "explanation": "정답 해설 1~2문장"
  }}
]
</quiz-json>

[강의 본문 HTML 작성 원칙]
1. **어려운 학술 용어 금지(또는 무조건 괄호 풀이)**: 전문 용어가 나오면 반드시 바로 뒤에 괄호로 초등학생 수준의 쉬운 뜻풀이와 일상 비유(카페 커피, 치킨값, 동네 마트, 월세, 편의점 1+1 등)를 달아주세요.
2. **시각 자료 2종 필수 탑재**:
   ① **고해상도 다크모드 SVG 경제 도식도/그래프 (반드시 포함!)**:
      - `viewBox="0 0 840 420"`, 사방 55px 이상 여백 확보해 글자·도형 짤림 원천 방지!
      - 배경: `rect width="840" height="420" fill="#0b1120" rx="16"`
      - 오늘의 경제학 주제 원리를 한눈에 보여주는 직관적인 인포그래픽을 그리세요!
        (예: 수요·공급 교차 곡선, 금리↔채권 시소 그림, 돈의 순환 화살표 다이어그램, 시간 경과에 따른 복리/인플레이션 곡선, 심리의 함정 비교 도식 등)
      - 큼직하고 선명한 한글 라벨(`fill="#f8fafc"`, `font-size="14"`~`18"`), 화살표/강조 박스(`#f59e0b`, `#6366f1`, `#10b981`, `#ef4444`)를 깔끔하게 배치하세요.
      - 감싸는 HTML:
        <div class="overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 p-5 md:p-7 my-10 shadow-2xl">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <span class="text-amber-400 font-black text-base md:text-lg">🎨 그림으로 10초 만에 이해하는 경제 원리</span>
            <span class="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">초보자 시각 도식</span>
          </div>
          <svg viewBox="0 0 840 420" class="w-full h-auto font-sans">...</svg>
          <p class="text-gray-400 text-sm mt-3 text-center">▲ 위 그림의 흐름과 강조 포인트를 보며 본문 비유와 함께 이해해 보세요.</p>
        </div>

   ② **체감 수치 가로 막대 비교 그래프 (Tailwind CSS Progress Bar, 반드시 포함!)**:
      - 오늘 배운 개념이 실제 내 돈(예: 100만 원, 1,000만 원, 월급 300만 원 등)이나 상황에 따라 얼마나 큰 차이를 만드는지 3~4개 항목의 컬러 가로 막대그래프로 보여주세요.
      - 감싸는 HTML:
        <div class="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 my-10 shadow-xl">
          <h4 class="text-xl font-black text-white mb-6 flex items-center gap-2">📊 숫자로 체감하는 실제 차이 비교</h4>
          <div class="space-y-5">
            <div>
              <div class="flex justify-between text-sm md:text-base font-bold mb-2">
                <span class="text-gray-200">비교 항목 1</span>
                <span class="text-amber-400 font-black">핵심 수치 / 결과</span>
              </div>
              <div class="w-full bg-slate-800 h-5 rounded-full overflow-hidden p-0.5">
                <div class="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style="width: 85%"></div>
              </div>
            </div>
            <!-- 3~4개 항목 반복 (amber, indigo, emerald, rose 색상 활용) -->
          </div>
        </div>

3. **강의 6단계 목차 구성 (풍성하게 2,200자 이상 작성)**:
   - **상단 [⚡ 바쁜 초보자를 위한 30초 3줄 요약 박스]**
   - **1단계 💡 일상 속 비유로 1분 만에 깨닫기** (초보자가 바로 고개를 끄덕이는 친근한 스토리 & 비유)
   - **2단계 🎨 그림과 숫자로 보는 핵심 원리** (위 필수 SVG 도식도 + 가로 막대 비교 그래프 포함!)
   - **3단계 💰 내 지갑·월급·투자에 미치는 진짜 영향** (예금·대출·물가·주식·환율 등 실생활과 재테크에 어떻게 직결되는지 구체적 금액 예시)
   - **4단계 📰 경제 뉴스에서 이 단어가 나오면 이렇게 읽으세요!** (실제 뉴스 헤드라인 예시 3가지와 속뜻 해석)
   - **5단계 ⚠️ 초보자가 자주 헷갈리는 오해 TOP 2 & 선생님 한마디**

4. **HTML 포맷팅 규칙** (Markdown 기호 `**`, `###`, ```html 절대 금지! 순수 HTML만 출력):
   - 큰 제목: <h2 class="text-2xl md:text-3xl font-black text-white pb-3 border-b-2 border-amber-500/40 mb-8 mt-14">
   - 소제목: <h3 class="text-xl md:text-2xl font-extrabold text-amber-400 mt-10 mb-5 border-l-4 border-amber-500 pl-4 bg-amber-900/15 py-2 rounded-r-xl">
   - 일반 문단: <p class="text-gray-100 text-base md:text-lg leading-relaxed mb-6 font-normal tracking-wide break-keep">
   - 핵심 강조: <strong class="text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold border-b border-amber-400/50 break-keep">
   - 목록: <ul class="list-none space-y-4 mb-8"> + <li class="flex items-start gap-3 text-gray-100 text-base md:text-lg leading-relaxed"><span class="text-amber-400 font-black text-xl mt-0.5 shrink-0">✔</span><span class="flex-1 break-keep">내용</span></li>
   - 30초 요약 박스: <div class="bg-gradient-to-br from-indigo-950/80 to-slate-900/80 border border-indigo-400/40 rounded-3xl p-6 md:p-8 my-8 shadow-xl"><p class="text-amber-300 font-black text-lg mb-3">⚡ 30초 만에 끝내는 오늘의 핵심 3줄 요약</p>...</div>
   - 오해/주의 박스: <div class="bg-rose-950/40 border-l-4 border-rose-500 rounded-2xl p-6 my-8 shadow-lg"><p class="text-rose-200 text-base md:text-lg font-bold leading-relaxed mb-0">⚠️ 내용</p></div>
   - 실전 팁 박스: <div class="bg-emerald-950/40 border-l-4 border-emerald-500 rounded-2xl p-6 my-8 shadow-lg"><p class="text-emerald-200 text-base md:text-lg font-bold leading-relaxed mb-0">💡 내용</p></div>
   - 내부 링크 1~2개 자연스럽게 포함: <a href="/signals" class="text-amber-300 font-bold underline underline-offset-4">글로벌 마켓 시그널</a>, <a href="/theory" class="text-amber-300 font-bold underline underline-offset-4">1타 강사 차트 스터디</a>, <a href="/guide" class="text-amber-300 font-bold underline underline-offset-4">주식 용어 백과사전</a>
   - 특정 종목 매수·매도 권유 금지.
"""

    try:
        response = generate_with_retry(prompt, json_mode=False, timeout=120)
        raw_content = response.text.replace("```html", "").replace("```", "").strip()

        # 1. 제목 추출
        seo_match = re.search(r"<title-seo>(.*?)</title-seo>", raw_content, re.DOTALL)
        if seo_match:
            title = seo_match.group(1).strip()
            raw_content = re.sub(r"<title-seo>.*?</title-seo>\s*", "", raw_content, flags=re.DOTALL).strip()
        else:
            title = topic.split(" - ")[0].strip() + " 쉽게 완벽 이해하기"

        # 2. 한 줄 핵심 정의 추출
        one_line_def = ""
        def_match = re.search(r"<one-line-def>(.*?)</one-line-def>", raw_content, re.DOTALL)
        if def_match:
            one_line_def = def_match.group(1).strip()
            raw_content = re.sub(r"<one-line-def>.*?</one-line-def>\s*", "", raw_content, flags=re.DOTALL).strip()
        if not one_line_def:
            one_line_def = topic

        # 3. 푸시 요약 추출
        push_summary = ""
        sum_match = re.search(r"<summary-push>(.*?)</summary-push>", raw_content, re.DOTALL)
        if sum_match:
            push_summary = sum_match.group(1).strip()
            raw_content = re.sub(r"<summary-push>.*?</summary-push>\s*", "", raw_content, flags=re.DOTALL).strip()
        if not push_summary:
            push_summary = f"초보자도 5분 만에 이해하는 '{title}'! 일상 비유와 그림, 퀴즈로 완벽 정리해 드립니다."

        # 4. 퀴즈 JSON 추출
        quiz_list = []
        quiz_match = re.search(r"<quiz-json>(.*?)</quiz-json>", raw_content, re.DOTALL)
        if quiz_match:
            quiz_list = _parse_quiz_json(quiz_match.group(1), topic)
            raw_content = re.sub(r"<quiz-json>.*?</quiz-json>\s*", "", raw_content, flags=re.DOTALL).strip()
        else:
            quiz_list = _parse_quiz_json("", topic)

        # 태그 구성
        words = re.findall(r"[가-힣A-Za-z]+", topic.split("-")[0])
        tags = ["1일1경제학", category_label, f"난이도_{difficulty}"]
        for w in words[:2]:
            if len(w) >= 2 and w not in tags:
                tags.append(w)

        return {
            "title": title,
            "oneLineDef": one_line_def,
            "summary": push_summary,
            "content": raw_content,
            "quiz": quiz_list,
            "tags": tags,
            "originalTopic": topic,
            "category": category,
            "categoryLabel": category_label,
            "categoryEmoji": category_emoji,
            "difficulty": difficulty,
            "dayNumber": day_number,
        }
    except Exception as e:
        print(f"[Economics Bot] Gemini 콘텐츠 생성 에러: {e}")
        return None


def post_daily_economics(
    force: bool = False,
    preferred_category: str = None,
    custom_topic: str = None,
    allow_multiple_same_day: bool = False,
    send_push: bool = True,
):
    """
    매일 1일 1경제학 강의를 생성하여 Firestore 'economics_posts' 컬렉션에 저장하고
    알림(FCM/알림센터/텔레그램) 및 Google Indexing을 수행합니다.
    """
    init_firebase()
    try:
        db = firestore.client()
    except ValueError:
        print("[Economics Bot] Firestore 초기화 실패")
        return {"status": "error", "message": "Firestore 초기화 실패"}

    now_kst = datetime.now(KST)
    date_str = now_kst.strftime("%Y%m%d")
    base_slug = f"econ-{date_str}"

    # 하루 1회 자동 발행 중복 방지 (allow_multiple_same_day=True면 같은 날 추가 학습용으로 -2, -3 번호 부여)
    slug = base_slug
    if not force and not allow_multiple_same_day:
        try:
            existing_doc = db.collection("economics_posts").document(base_slug).get()
            if existing_doc.exists:
                existing_title = (existing_doc.to_dict() or {}).get("title", "")
                if existing_title:
                    print(
                        f"[Economics Bot] 오늘({base_slug}) 이미 발행된 경제학 강의가 있습니다: "
                        f"'{existing_title}' - 중복 발행 방지 스킵"
                    )
                    return {
                        "status": "already_exists",
                        "slug": base_slug,
                        "title": existing_title,
                    }
        except Exception as e:
            print(f"[Economics Bot] 중복 체크 오류: {e}")
    elif allow_multiple_same_day:
        # 오늘 이미 존재하면 -2, -3, ... 순번 부여
        idx = 1
        while db.collection("economics_posts").document(slug).get().exists:
            idx += 1
            slug = f"{base_slug}-{idx}"

    print(f"[Economics Bot] 1일 1경제학 신규 강의 생성 시작 (slug={slug}, category={preferred_category})...")
    generated = generate_economics_post(
        db=db,
        preferred_category=preferred_category,
        custom_topic=custom_topic,
    )
    if not generated or not generated.get("content"):
        print("[Economics Bot] 콘텐츠 생성 실패")
        return {"status": "error", "message": "AI 경제학 강의 생성에 실패했습니다."}

    post_data = {
        "title": generated["title"],
        "oneLineDef": generated["oneLineDef"],
        "summary": generated["summary"],
        "content": generated["content"],
        "quiz": generated["quiz"],
        "slug": slug,
        "dayNumber": generated["dayNumber"],
        "category": generated["category"],
        "categoryLabel": generated["categoryLabel"],
        "categoryEmoji": generated["categoryEmoji"],
        "difficulty": generated["difficulty"],
        "tags": generated["tags"],
        "originalTopic": generated["originalTopic"],
        "author": "StockTrend 경제학 1타 선생님",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdDateKst": now_kst.strftime("%Y-%m-%d"),
        "viewCount": random.randint(45, 130),
    }

    try:
        db.collection("economics_posts").document(slug).set(post_data)
        new_url = f"https://stock-trend-program.co.kr/economics/{slug}"
        print(
            f"[Economics Bot] [SUCCESS] Day {generated['dayNumber']} '{generated['title']}' "
            f"발행 완료! (slug={slug}, SVG={'<svg' in generated['content']}, 퀴즈={len(generated['quiz'])}문제)"
        )

        # FCM 푸시 & 알림센터 저장
        if send_push:
            try:
                from firebase_config import send_multicast_notification, save_alert_to_firestore
                from db_manager import get_all_fcm_tokens

                all_tokens = get_all_fcm_tokens()
                push_title = f"🎓 [1일 1경제학 Day {generated['dayNumber']}] {generated['title']}"
                push_body = f"💡 {generated['oneLineDef']}\n📌 {generated['summary']}"
                push_data = {
                    "type": "economics_alert",
                    "url": f"/economics/{slug}",
                    "economics_id": slug,
                }
                if all_tokens:
                    send_multicast_notification(all_tokens, push_title, push_body, push_data, skip_db_save=False)
                    print(f"[Economics FCM] {len(all_tokens)}명 푸시 발송 완료")
                else:
                    save_alert_to_firestore(
                        title=push_title,
                        body=push_body,
                        alert_type="economics_alert",
                        url=f"/economics/{slug}",
                    )
                    print("[Economics FCM] 알림센터 DB 단독 저장 완료")
            except Exception as push_err:
                print(f"[Economics FCM Error] {push_err}")

            # 텔레그램 채널 티저 발송 (실패해도 무관)
            try:
                from telegram_service import send_telegram_teaser

                teaser_msg = (
                    f"🎓 <b>[매일 1일 1경제학 · Day {generated['dayNumber']}]</b>\n"
                    f"<b>{generated['categoryEmoji']} {generated['title']}</b>\n\n"
                    f"💡 한 줄 정의: {generated['oneLineDef']}\n"
                    f"📌 {generated['summary']}\n"
                    f"📝 포함 자료: <b>원리 그림(SVG) · 체감 비교 그래프 · 복습 퀴즈 {len(generated['quiz'])}문제</b>\n\n"
                    f"👉 <a href='{new_url}'>오늘의 5분 경제학 공부하러 가기</a>"
                )
                send_telegram_teaser(teaser_msg, alert_type="economics_alert", skip_db_save=True)
            except Exception as tg_err:
                print(f"[Economics Telegram Error] {tg_err}")

        # Google Indexing API 실시간 핑
        try:
            from google_indexer import publish_urls_to_google

            publish_urls_to_google([new_url])
        except Exception as idx_err:
            print(f"[Economics Indexing Error] {idx_err}")

        return {
            "status": "ok",
            "slug": slug,
            "dayNumber": generated["dayNumber"],
            "title": generated["title"],
            "oneLineDef": generated["oneLineDef"],
            "category": generated["category"],
            "categoryLabel": generated["categoryLabel"],
            "categoryEmoji": generated["categoryEmoji"],
            "difficulty": generated["difficulty"],
            "url": f"/economics/{slug}",
        }
    except Exception as e:
        print(f"[Economics Bot] Firestore 저장 에러: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import sys

    if "--check" in sys.argv:
        init_firebase()
        db_client = firestore.client()
        nxt = select_next_economics_topic(db=db_client)
        print(f"[검증] 총 커리큘럼 수: {len(ECONOMICS_CURRICULUM)}개")
        print(f"[검증] 다음 예정 주제: Day {nxt['nextDayNumber']} [{nxt['categoryLabel']}] {nxt['topic']}")
    else:
        res = post_daily_economics(
            force=("--force" in sys.argv),
            allow_multiple_same_day=("--add" in sys.argv),
            send_push=("--no-push" not in sys.argv),
        )
        print("Result:", res)
