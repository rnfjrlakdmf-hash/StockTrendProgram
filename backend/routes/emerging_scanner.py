# -*- coding: utf-8 -*-
from fastapi import APIRouter
import logging
import time
from datetime import datetime
import pytz
from cachetools import TTLCache

router = APIRouter()
logger = logging.getLogger(__name__)

# 5분 캐시 (미국 시장 데이터 과도한 호출 방지 및 초고속 응답)
EMERGING_CACHE = TTLCache(maxsize=10, ttl=300)

EMERGING_UNIVERSE = {
    # 1. 우주항공 & 위성
    "ASTS": {
        "nameKo": "AST 스페이스모바일",
        "nameEn": "AST SpaceMobile",
        "exchange": "NASDAQ",
        "category": "space",
        "categoryLabel": "우주항공 & 위성",
        "icon": "🚀",
        "oneLiner": "스마트폰에 인공위성이 바로 연결되는 우주 셀룰러 광대역 통신망 구축",
        "highlight": "지상 기지국 없는 오지에서도 스마트폰 통신 연결",
        "tags": ["#우주인터넷", "#AT&T·버라이즌제휴", "#블루버드위성"]
    },
    "RKLB": {
        "nameKo": "로켓랩",
        "nameEn": "Rocket Lab USA",
        "exchange": "NASDAQ",
        "category": "space",
        "categoryLabel": "우주항공 & 위성",
        "icon": "🛸",
        "oneLiner": "스페이스X의 대항마로 꼽히는 민간 소형 우주 로켓 발사체 및 위성 제조 1위",
        "highlight": "상업용 소형 위성 발사 시장 독보적 점유율",
        "tags": ["#로켓발사체", "#일렉트론", "#NASA수주"]
    },
    "LUNR": {
        "nameKo": "인튜이티브 머신스",
        "nameEn": "Intuitive Machines",
        "exchange": "NASDAQ",
        "category": "space",
        "categoryLabel": "우주항공 & 위성",
        "icon": "🌕",
        "oneLiner": "민간 기업 최초로 달 표면 착륙에 성공한 NASA 아르테미스 프로젝트 핵심 파트너",
        "highlight": "미국 정부 달 착륙선 및 우주 통신망 계약 수주",
        "tags": ["#달탐사", "#NASA파트너", "#우주화물"]
    },
    "PL": {
        "nameKo": "플래닛 랩스",
        "nameEn": "Planet Labs PBC",
        "exchange": "NYSE",
        "category": "space",
        "categoryLabel": "우주항공 & 위성",
        "icon": "🛰️",
        "oneLiner": "200개 이상의 소형 군집 위성으로 지구 전역을 매일 촬영하는 우주 빅데이터 선도 기업",
        "highlight": "농업·국방·기후 분석용 일일 위성 영상 독점 데이터",
        "tags": ["#지구관측", "#군집위성", "#위성데이터AI"]
    },
    "RDW": {
        "nameKo": "레드와이어",
        "nameEn": "Redwire Space",
        "exchange": "NYSE",
        "category": "space",
        "categoryLabel": "우주항공 & 위성",
        "icon": "🛰️",
        "oneLiner": "우주 정거장 3D 바이오 프린팅과 차세대 궤도 인프라 부품을 제조하는 우주 인프라 기업",
        "highlight": "NASA 우주정거장 및 민간 궤도 인프라 독점 수주",
        "tags": ["#우주인프라", "#우주바이오", "#우주태양광"]
    },

    # 2. 양자컴퓨터
    "IONQ": {
        "nameKo": "아이온큐",
        "nameEn": "IonQ, Inc.",
        "exchange": "NYSE",
        "category": "quantum",
        "categoryLabel": "양자컴퓨팅",
        "icon": "⚛️",
        "oneLiner": "세계 최초 상용 클라우드 이온트랩 방식 양자컴퓨터 선도 기업",
        "highlight": "아마존·구글·마이크로소프트 클라우드 전반에 양자 시스템 탑재",
        "tags": ["#양자컴퓨터", "#AWS·MS제휴", "#슈퍼컴퓨팅"]
    },
    "RGTI": {
        "nameKo": "리게티 컴퓨팅",
        "nameEn": "Rigetti Computing",
        "exchange": "NASDAQ",
        "category": "quantum",
        "categoryLabel": "양자컴퓨팅",
        "icon": "🔬",
        "oneLiner": "초전도 기반 다중 큐비트 양자 프로세서 및 하이브리드 양자-클라우드 개발",
        "highlight": "양자 프로세서 칩을 자체 팹에서 직접 생산하는 풀스택 기업",
        "tags": ["#초전도양자", "#칩직접제조", "#양자알고리즘"]
    },
    "QUBT": {
        "nameKo": "퀀텀 컴퓨팅",
        "nameEn": "Quantum Computing Inc.",
        "exchange": "NASDAQ",
        "category": "quantum",
        "categoryLabel": "양자컴퓨팅",
        "icon": "🔮",
        "oneLiner": "상온에서 작동하는 나노 광자 기반 양자 프로세서 및 사이버 보안 솔루션 개발",
        "highlight": "냉각 장치 없이 상온에서 구동되는 초소형 양자 칩 기술",
        "tags": ["#상온양자컴", "#양자포토닉스", "#양자보안"]
    },

    # 3. UAM 플라잉카 & 차세대 로봇/드론
    "JOBY": {
        "nameKo": "조비 에비에이션",
        "nameEn": "Joby Aviation",
        "exchange": "NYSE",
        "category": "uam",
        "categoryLabel": "UAM & 드론",
        "icon": "🚁",
        "oneLiner": "도심을 비행하는 전기 수직이착륙(eVTOL) 친환경 에어택시 상용화 선도 기업",
        "highlight": "도요타 및 우버와 제휴하여 세계 최초 에어택시 노선 개설 추진",
        "tags": ["#도심항공", "#도요타5억불투자", "#FAA인증순항"]
    },
    "ACHR": {
        "nameKo": "아처 에비에이션",
        "nameEn": "Archer Aviation",
        "exchange": "NYSE",
        "category": "uam",
        "categoryLabel": "UAM & 드론",
        "icon": "🛩️",
        "oneLiner": "스텔란티스 및 유나이티드항공과 협력하는 차세대 도심형 전기 항공 모빌리티",
        "highlight": "글로벌 완성차 및 대형 항공사와의 대규모 선주문 확보",
        "tags": ["#에어택시", "#유나이티드항공", "#스텔란티스양산"]
    },
    "RCAT": {
        "nameKo": "레드 캣 홀딩스",
        "nameEn": "Red Cat Holdings",
        "exchange": "NASDAQ",
        "category": "uam",
        "categoryLabel": "UAM & 드론",
        "icon": "🦅",
        "oneLiner": "미 국방부 및 나토(NATO)에 군용 소형 정찰 드론과 AI 자율비행 소프트웨어 공급",
        "highlight": "미 육군 차세대 단거리 정찰 드론 프로그램 최종 경쟁",
        "tags": ["#군용드론", "#미국방부수주", "#AI자율비행"]
    },
    "SERV": {
        "nameKo": "서브 로보틱스",
        "nameEn": "Serve Robotics",
        "exchange": "NASDAQ",
        "category": "uam",
        "categoryLabel": "UAM & 드론",
        "icon": "🤖",
        "oneLiner": "우버이츠 및 앤비디아와 제휴하여 도심 보도를 자율주행하는 라스트마일 배달 로봇 선도",
        "highlight": "엔비디아 전략적 투자 및 우버 2,000대 로봇 상용 배치 계약",
        "tags": ["#배달로봇", "#엔비디아투자", "#라스트마일"]
    },

    # 4. 차세대 AI & 빅데이터
    "PLTR": {
        "nameKo": "팔란티어",
        "nameEn": "Palantir Technologies",
        "exchange": "NYSE",
        "category": "ai",
        "categoryLabel": "차세대 AI",
        "icon": "🤖",
        "oneLiner": "정부 정보기관 및 글로벌 기업을 위한 AI 구동 엔터프라이즈 데이터 플랫폼",
        "highlight": "S&P 500 편입 및 생성형 AI 플랫폼(AIP) 폭발적 채택",
        "tags": ["#AI운영체제", "#미국방부채택", "#S&P500편입"]
    },
    "SMCI": {
        "nameKo": "슈퍼마이크로컴퓨터",
        "nameEn": "Super Micro Computer",
        "exchange": "NASDAQ",
        "category": "ai",
        "categoryLabel": "차세대 AI",
        "icon": "🖥️",
        "oneLiner": "엔비디아 GPU를 탑재하는 고성능 액체냉각 AI 서버 랙 인프라 세계 1위",
        "highlight": "생성형 AI 데이터센터 증설에 필수적인 액체 냉각 솔루션",
        "tags": ["#AI데이터센터", "#액체냉각서버", "#엔비디아파트너"]
    },
    "AI": {
        "nameKo": "C3.ai",
        "nameEn": "C3.ai, Inc.",
        "exchange": "NYSE",
        "category": "ai",
        "categoryLabel": "차세대 AI",
        "icon": "⚡",
        "oneLiner": "석유, 화학, 방산, 금융 산업에 맞춤형 엔터프라이즈 생성형 AI 애플리케이션 공급",
        "highlight": "포춘 500대 기업 및 미 공군 대상 대규모 엔터프라이즈 계약",
        "tags": ["#기업용생성형AI", "#산업용AI", "#빅데이터분석"]
    },
    "SOUN": {
        "nameKo": "사운드하운드 AI",
        "nameEn": "SoundHound AI",
        "exchange": "NASDAQ",
        "category": "ai",
        "categoryLabel": "차세대 AI",
        "icon": "🎙️",
        "oneLiner": "현대차, 스텔란티스, 레스토랑 드라이브스루에 탑재되는 음성 대화형 생성 AI 선도",
        "highlight": "엔비디아의 지분 투자 및 글로벌 완성차 탑재 확대",
        "tags": ["#음성인식AI", "#엔비디아투자", "#차량용AI"]
    },
    "BBAI": {
        "nameKo": "빅베어 AI",
        "nameEn": "BigBear.ai",
        "exchange": "NYSE",
        "category": "ai",
        "categoryLabel": "차세대 AI",
        "icon": "🐻",
        "oneLiner": "미 국방부 및 공항 보안 검색대에 비전 AI와 공급망 의사결정 인텔리전스 제공",
        "highlight": "미 육군 글로벌 군수 공급망 AI 시스템 단독 계약 수주",
        "tags": ["#국방AI", "#비전보안", "#공항안면인식"]
    },

    # 5. 차세대 소형 원전(SMR) & 에너지
    "OKLO": {
        "nameKo": "오클로",
        "nameEn": "Oklo Inc.",
        "exchange": "NYSE",
        "category": "energy",
        "categoryLabel": "차세대 원전(SMR)",
        "icon": "⚛️",
        "oneLiner": "샘 알트만 오픈AI CEO가 투자한 고속 중성자 기반 차세대 소형 모듈 원전(SMR) 개발",
        "highlight": "AI 데이터센터의 막대한 전력 수요를 충당할 청정 원전 솔루션",
        "tags": ["#샘알트만투자", "#데이터센터전력", "#차세대SMR"]
    },
    "SMR": {
        "nameKo": "뉴스케일 파워",
        "nameEn": "NuScale Power",
        "exchange": "NYSE",
        "category": "energy",
        "categoryLabel": "차세대 원전(SMR)",
        "icon": "🏭",
        "oneLiner": "미국 원자력규제위원회(NRC)의 유일한 표준 설계 승인을 획득한 상용 SMR 선도 기업",
        "highlight": "미국 정부 NRC 인허가를 통과한 최초이자 유일한 SMR 기술",
        "tags": ["#NRC승인원전", "#소형원자로", "#빅테크전력"]
    },
    "NNE": {
        "nameKo": "나노 뉴클리어 에너지",
        "nameEn": "Nano Nuclear Energy",
        "exchange": "NASDAQ",
        "category": "energy",
        "categoryLabel": "차세대 원전(SMR)",
        "icon": "🔋",
        "oneLiner": "트럭이나 컨테이너로 이동 가능한 휴대용 초소형 마이크로 원자로 개발",
        "highlight": "군사 기지, 재난 지역, 오지 전력 공급용 이동형 마이크로 원전",
        "tags": ["#이동형원전", "#마이크로원자로", "#초소형원자력"]
    },

    # 6. 혁신 핀테크 & 가상자산
    "SOFI": {
        "nameKo": "소파이 테크놀로지스",
        "nameEn": "SoFi Technologies",
        "exchange": "NASDAQ",
        "category": "fintech",
        "categoryLabel": "혁신 핀테크",
        "icon": "💳",
        "oneLiner": "학자금 대출부터 예금, 주식, 가상자산까지 모바일 앱 하나로 끝내는 미국 대표 네오뱅크",
        "highlight": "미국 2030 세대 필수 올인원 금융 플랫폼으로 급성장",
        "tags": ["#디지털금융", "#네오뱅크", "#흑자전환달성"]
    },
    "COIN": {
        "nameKo": "코인베이스",
        "nameEn": "Coinbase Global",
        "exchange": "NASDAQ",
        "category": "fintech",
        "categoryLabel": "혁신 핀테크",
        "icon": "🪙",
        "oneLiner": "미국 최초로 나스닥에 직상장된 최대 제도권 암호화폐 거래소 및 기관 수탁사",
        "highlight": "비트코인 및 이더리움 현물 ETF 대다수의 공식 커스터디 수탁 파트너",
        "tags": ["#비트코인ETF수탁", "#가상자산거래소", "#제도권금융"]
    },
    "HOOD": {
        "nameKo": "로빈후드",
        "nameEn": "Robinhood Markets",
        "exchange": "NASDAQ",
        "category": "fintech",
        "categoryLabel": "혁신 핀테크",
        "icon": "🏹",
        "oneLiner": "미국 개인 투자자들의 주식·코인 거래 수수료 무료화를 이끈 대표 모바일 투자 플랫폼",
        "highlight": "미국 리테일 투자자 수수료 혁신 및 가상자산 24시간 거래 주도",
        "tags": ["#서학개미플랫폼", "#무수수료투자", "#가상자산확대"]
    },
    "UPST": {
        "nameKo": "업스타트 홀딩스",
        "nameEn": "Upstart Holdings",
        "exchange": "NASDAQ",
        "category": "fintech",
        "categoryLabel": "혁신 핀테크",
        "icon": "📈",
        "oneLiner": "전통 신용점수 대신 AI 머신러닝 알고리즘으로 대출 한도와 금리를 산정하는 대출 테크",
        "highlight": "은행 파트너십 확대로 금리 인하기 대출 수수료 폭발 기대",
        "tags": ["#AI신용평가", "#금리인하수혜", "#AI대출플랫폼"]
    },

    # 7. 유전자 가위 & 신약 바이오
    "CRSP": {
        "nameKo": "크리스퍼 테라퓨틱스",
        "nameEn": "CRISPR Therapeutics",
        "exchange": "NASDAQ",
        "category": "bio",
        "categoryLabel": "유전자 바이오",
        "icon": "🧬",
        "oneLiner": "노벨 화학상 수상 3세대 유전자 가위(CRISPR-Cas9) 기술로 난치병 치료제 개발",
        "highlight": "세계 최초 미국 FDA 승인 유전자 가위 치료제(카스게비) 상용화",
        "tags": ["#유전자가위", "#FDA최초승인", "#희귀병완치도전"]
    },
    "VKTX": {
        "nameKo": "바이킹 테라퓨틱스",
        "nameEn": "Viking Therapeutics",
        "exchange": "NASDAQ",
        "category": "bio",
        "categoryLabel": "유전자 바이오",
        "icon": "💊",
        "oneLiner": "일라이릴리·노보노디스크의 뒤를 잇는 차세대 경구용/주사제 비만 치료제 개발",
        "highlight": "임상 2상에서 14% 이상 체중 감량 효과 입증으로 글로벌 빅파마 인수 타겟",
        "tags": ["#차세대비만약", "#임상대박", "#M&A기대감"]
    }
}


@router.get("/us-emerging-live")
def get_us_emerging_live():
    """
    미국 신생 혁신 기업 실시간 발굴 & 데일리 동적 스캐너
    - 나스닥/NYSE 유망 신생 기업 풀을 실시간 배치 스캔
    - 당일 등락률, 거래량 폭증 배수, 모멘텀 점수로 실시간 랭킹 정렬
    - 5분 캐시 적용으로 초고속 응답 보장
    """
    cache_key = "us_emerging_live_v1"
    if cache_key in EMERGING_CACHE:
        return EMERGING_CACHE[cache_key]

    import yfinance as yf
    tickers = list(EMERGING_UNIVERSE.keys())

    kst = pytz.timezone('Asia/Seoul')
    now_kst = datetime.now(kst).strftime("%Y-%m-%d %H:%M:%S")

    items = []

    try:
        # yfinance 배치 다운로드 (최근 5일 일봉 데이터)
        df = yf.download(tickers, period="5d", interval="1d", group_by="ticker", progress=False)

        for ticker, meta in EMERGING_UNIVERSE.items():
            try:
                sub = df[ticker] if ticker in df else None
                if sub is not None and len(sub) >= 2:
                    latest = sub.iloc[-1]
                    prev = sub.iloc[-2]

                    price = float(latest['Close'])
                    prev_close = float(prev['Close'])
                    change_pct = ((price - prev_close) / prev_close) * 100 if prev_close > 0 else 0.0

                    vol = float(latest['Volume'])
                    prev_vol = float(prev['Volume']) if float(prev['Volume']) > 0 else 1.0
                    vol_ratio = vol / prev_vol

                    # 당일 핫 시그널 배지 자동 생성
                    if change_pct >= 8.0:
                        hot_badge = f"🔥 당일 급등 (+{change_pct:.1f}%)"
                        badge_type = "surge"
                    elif vol_ratio >= 1.5 and change_pct > 0:
                        hot_badge = f"⚡ 거래량 {vol_ratio:.1f}배 폭증"
                        badge_type = "volume"
                    elif change_pct >= 3.0:
                        hot_badge = f"🚀 상승 탄력 (+{change_pct:.1f}%)"
                        badge_type = "momentum"
                    elif change_pct <= -5.0:
                        hot_badge = "💎 가치 반등 눌림목"
                        badge_type = "dip"
                    else:
                        hot_badge = "✨ 미래 혁신 유망주"
                        badge_type = "normal"

                    # 모멘텀 가중치 점수 (등락률 + 거래량 배수)
                    momentum_score = (change_pct * 1.5) + (min(vol_ratio, 3.0) * 8.0)

                    items.append({
                        "ticker": ticker,
                        "nameKo": meta["nameKo"],
                        "nameEn": meta["nameEn"],
                        "exchange": meta["exchange"],
                        "category": meta["category"],
                        "categoryLabel": meta["categoryLabel"],
                        "icon": meta["icon"],
                        "oneLiner": meta["oneLiner"],
                        "highlight": meta["highlight"],
                        "tags": meta["tags"],
                        "price": round(price, 2),
                        "prev_close": round(prev_close, 2),
                        "change_pct": round(change_pct, 2),
                        "vol_ratio": round(vol_ratio, 1),
                        "hot_badge": hot_badge,
                        "badge_type": badge_type,
                        "momentum_score": round(momentum_score, 1)
                    })
            except Exception as e:
                logger.error(f"[EmergingScanner] Error parsing {ticker}: {e}")

        # 모멘텀 점수 높은 순(오늘 가장 강하게 튀어오르는 순)으로 랭킹 정렬
        items.sort(key=lambda x: x["momentum_score"], reverse=True)

    except Exception as e:
        logger.error(f"[EmergingScanner] Batch fetch error: {e}")

    # 데이터가 없거나 에러 시 기본 정적 유니버스로 폴백
    if not items:
        for ticker, meta in EMERGING_UNIVERSE.items():
            items.append({
                "ticker": ticker,
                "nameKo": meta["nameKo"],
                "nameEn": meta["nameEn"],
                "exchange": meta["exchange"],
                "category": meta["category"],
                "categoryLabel": meta["categoryLabel"],
                "icon": meta["icon"],
                "oneLiner": meta["oneLiner"],
                "highlight": meta["highlight"],
                "tags": meta["tags"],
                "price": 0.0,
                "prev_close": 0.0,
                "change_pct": 0.0,
                "vol_ratio": 1.0,
                "hot_badge": "✨ 미래 혁신 유망주",
                "badge_type": "normal",
                "momentum_score": 0.0
            })

    result = {
        "status": "success",
        "count": len(items),
        "updated_at": now_kst,
        "data": items
    }

    EMERGING_CACHE[cache_key] = result
    return result
