"""
대표이사 전용 '글로벌 리스크 레이더'

- 해외·국내 주요 뉴스(Google News RSS)에서 전쟁·수출규제·원자재·금리·환율·AI 투자 같은 '사건'을 감지합니다.
- 사건이 어느 업종에 악재/호재인지 규칙표(EVENT_RULES)로 판단하고, 담당 본부(팀)의 리스크 보고로 분류합니다.
- 대표님이 등록한 관심종목(대표 계정의 watchlist)과 대조해 해당되는 종목만 골라냅니다.
- 관심종목 보유 종목에 악재성 DART 공시가 새로 뜨면 그것도 함께 감지합니다.
- 푸시 알림은 '대표 계정(ALLOWED_CEO_EMAILS)의 기기'로만 보냅니다. 일반 회원에게는 절대 보내지 않습니다.

※ 키워드 기반 1차 감지입니다(AI 해석이 아님). 투자 권유가 아닌 참고 정보입니다.
"""
import os
import re
import json
import hashlib
import logging
import concurrent.futures
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
REPORT_PATH = os.path.join(DATA_DIR, "ceo_risk_radar_latest.json")
STATE_PATH = os.path.join(DATA_DIR, "ceo_risk_radar_state.json")

HEADERS = {"User-Agent": "Mozilla/5.0"}
NEWS_MAX_AGE_HOURS = 30
MIN_HEADLINES = 2          # 같은 사건이 서로 다른 기사 2건 이상일 때만 '감지'로 인정 (오탐 방지)
MAX_WATCH_SYMBOLS = 20
DAILY_PUSH_CAP = 8
DEFAULT_CEO_EMAILS = {"rnfjr@gmail.com", "rnfjrlakdmf@gmail.com"}

# ─────────────────────────────────────────────────────────
# 담당 본부(팀)
# ─────────────────────────────────────────────────────────
TEAMS: Dict[str, Dict[str, str]] = {
    "risk_cro": {"id": "risk_cro", "name": "최서연", "role": "상무 (CRO)", "dept": "리스크관리본부", "avatar": "🛡️"},
    "global_dir": {"id": "global_dir", "name": "이준호", "role": "이사", "dept": "글로벌·파생본부", "avatar": "🌎"},
    "quant_dir": {"id": "quant_dir", "name": "김도현", "role": "상무", "dept": "퀀트·수급본부", "avatar": "📈"},
    "research_vp": {"id": "research_vp", "name": "박진우", "role": "부사장", "dept": "리서치센터", "avatar": "👨‍💼"},
}

# ─────────────────────────────────────────────────────────
# 업종 분류 규칙 (종목명 키워드 → 없으면 사업 설명 키워드)
# ─────────────────────────────────────────────────────────
SECTOR_LABELS = {
    "semiconductor": "반도체",
    "auto": "자동차·부품",
    "battery": "2차전지",
    "airline": "항공·해운",
    "energy_utility": "전력·가스 공기업",
    "power_equipment": "전력기기·원전",
    "bio": "바이오·제약",
    "cosmetics": "화장품·K-뷰티",
    "defense": "방산",
    "shipbuilding": "조선",
    "finance": "금융",
    "tech_us": "미국 빅테크",
}

SECTOR_RULES = [
    ("semiconductor",
     ["삼성전자", "하이닉스", "한미반도체", "리노공업", "이오테크닉스", "주성엔지니어링", "원익", "hpsp", "유진테크", "db하이텍", "엔비디아", "반도체"],
     ["반도체", "hbm", "웨이퍼", "디램", "낸드", "파운드리", "메모리"]),
    ("auto",
     ["현대차", "기아", "현대모비스", "현대글로비스", "현대위아", "한온시스템", "hl만도", "만도", "넥센타이어", "한국타이어", "금호타이어", "자동차"],
     ["완성차", "자동차 부품", "자동차"]),
    ("battery",
     ["lg에너지", "삼성sdi", "에코프로", "포스코퓨처엠", "엘앤에프", "엔켐", "sk이노베이션", "솔브레인", "배터리", "2차전지"],
     ["2차전지", "이차전지", "배터리", "양극재", "음극재", "전해액", "리튬"]),
    ("airline",
     ["대한항공", "아시아나", "진에어", "제주항공", "티웨이", "에어부산", "에어프레미아", "한진칼", "항공", "팬오션", "해운"],
     ["항공", "해운", "여객", "화물운송"]),
    ("energy_utility",
     ["한국전력", "한전", "지역난방", "가스공사", "한국가스", "삼천리", "도시가스"],
     ["전력 판매", "도시가스", "천연가스 도입"]),
    ("power_equipment",
     ["두산에너빌리티", "효성중공업", "hd현대일렉트릭", "현대일렉트릭", "일진전기", "제룡전기", "산일전기", "ls electric", "ls일렉트릭", "엘에스일렉트릭", "대한전선", "ls전선", "가온전선", "한전kps", "한전기술", "비에이치아이", "보성파워텍", "변압기"],
     ["변압기", "전력기기", "원전", "발전설비", "초고압", "전선"]),
    ("bio",
     ["한미약품", "알테오젠", "삼성바이오", "셀트리온", "유한양행", "리가켐", "에이비엘", "삼천당", "휴젤", "대웅", "녹십자", "종근당", "동아에스티", "바이오", "제약", "파마", "신약"],
     ["신약", "임상", "바이오", "의약품"]),
    ("cosmetics",
     ["에스엠씨지", "아모레", "코스맥스", "한국콜마", "에이피알", "클리오", "실리콘투", "lg생활건강", "연우", "펌텍", "코스메카", "화장품", "뷰티"],
     ["화장품", "뷰티"]),
    ("defense",
     ["한화에어로", "현대로템", "lig넥스원", "한국항공우주", "풍산", "빅텍", "스페코", "방산"],
     ["방산", "유도무기", "전차", "자주포", "군수"]),
    ("shipbuilding",
     ["삼성중공업", "한국조선해양", "hd현대중공업", "현대중공업", "현대미포", "한화오션", "대우조선", "조선"],
     ["선박", "해양플랜트", "lng선"]),
    ("finance",
     ["kb금융", "신한지주", "하나금융", "우리금융", "기업은행", "메리츠", "삼성화재", "db손해", "한국금융", "미래에셋", "nh투자", "키움", "삼성생명", "금융", "은행", "증권", "보험"],
     ["금융지주", "은행업"]),
]

US_TICKER_SECTORS = {
    "NVDA": ["semiconductor", "tech_us"], "AMD": ["semiconductor"], "AVGO": ["semiconductor"],
    "TSM": ["semiconductor"], "MU": ["semiconductor"], "INTC": ["semiconductor"], "ASML": ["semiconductor"],
    "SOXX": ["semiconductor"], "SOXL": ["semiconductor"],
    "TSLA": ["auto", "battery"],
    "AAPL": ["tech_us"], "MSFT": ["tech_us"], "GOOGL": ["tech_us"], "GOOG": ["tech_us"],
    "AMZN": ["tech_us"], "META": ["tech_us"], "PLTR": ["tech_us"], "NFLX": ["tech_us"], "ORCL": ["tech_us"],
    "QQQ": ["tech_us"], "TQQQ": ["tech_us"],
    "LLY": ["bio"], "PFE": ["bio"], "MRNA": ["bio"],
}
US_NAMES = {
    "NVDA": "엔비디아", "TSLA": "테슬라", "AAPL": "애플", "MSFT": "마이크로소프트", "GOOGL": "구글",
    "AMZN": "아마존", "META": "메타", "PLTR": "팔란티어", "AMD": "AMD", "AVGO": "브로드컴",
    "TSM": "TSMC", "MU": "마이크론", "INTC": "인텔", "QQQ": "QQQ", "SOXX": "SOXX",
}

# ─────────────────────────────────────────────────────────
# 사건 규칙표: groups(그룹마다 키워드 1개 이상 포함) / exclude / impacts
# ─────────────────────────────────────────────────────────
GENERIC_RISK_GUIDE = "신규 추격매수는 보류하고 -3.5% 방어선과 20·50일선 지지 여부를 먼저 확인하세요."
GENERIC_BENEFIT_GUIDE = "수혜가 기대되지만 이미 주가에 반영됐을 수 있으니 추격매수는 피하고 분할로 접근하세요."

EVENT_RULES: List[Dict[str, Any]] = [
    {
        "id": "war_escalation", "label": "전쟁·무력충돌 격화", "icon": "💥", "team": "risk_cro",
        "groups": [["전쟁 격화", "전쟁 확산", "전쟁 장기화", "전면전", "공습", "침공", "미사일 발사", "미사일 공격", "확전", "군사 충돌", "무력 충돌", "교전", "airstrike", "invasion"]],
        "exclude": ["휴전", "종전", "평화", "ceasefire", "전쟁 수준", "전쟁터", "전쟁 같은", "게임", "드라마"],
        "easy": "전쟁이 커지면 기름값과 환율이 뛰고, 연료비 부담이 큰 업종은 불리하며 방산은 수주 기대가 커집니다.",
        "impacts": [
            {"sectors": ["airline", "energy_utility"], "direction": "risk", "why": "유가·환율이 오르면 연료비와 수입 원가가 늘어납니다."},
            {"sectors": ["defense"], "direction": "benefit", "why": "무기 수요와 수주 기대가 커집니다."},
        ],
    },
    {
        "id": "ceasefire", "label": "휴전·종전 협상 진전", "icon": "🕊️", "team": "global_dir",
        "groups": [["휴전", "종전", "평화 협상", "평화협정", "ceasefire", "peace deal"]],
        "exclude": ["휴전 무산", "협상 결렬", "협상 불발"],
        "easy": "전쟁이 끝나가면 기름값이 안정되고 항공·전력은 숨통이 트이지만, 방산은 차익실현 매물이 나오기 쉽습니다.",
        "impacts": [
            {"sectors": ["defense"], "direction": "risk", "why": "전쟁 종료 기대가 커지면 방산주에 차익실현 매물이 나옵니다."},
            {"sectors": ["airline", "energy_utility"], "direction": "benefit", "why": "유가 안정으로 연료비 부담이 줄어듭니다."},
        ],
    },
    {
        "id": "oil_spike", "label": "국제유가 급등", "icon": "🛢️", "team": "risk_cro",
        "groups": [["유가 급등", "유가 폭등", "유가 상승", "국제유가 상승", "원유 가격 급등", "유가 100달러", "oil surge", "oil prices jump", "oil prices rise"]],
        "exclude": [],
        "easy": "기름값이 오르면 항공·발전 회사의 연료비가 늘어 이익이 줄어듭니다.",
        "impacts": [{"sectors": ["airline", "energy_utility"], "direction": "risk", "why": "연료비가 늘어 영업이익이 줄어듭니다."}],
    },
    {
        "id": "oil_drop", "label": "국제유가 급락", "icon": "⛽", "team": "global_dir",
        "groups": [["유가 급락", "유가 하락", "국제유가 하락", "oil prices fall", "oil plunge", "oil slump"]],
        "exclude": [],
        "easy": "기름값이 떨어지면 항공·발전 회사의 비용이 줄지만, 조선(해양플랜트) 발주 기대는 약해질 수 있습니다.",
        "impacts": [
            {"sectors": ["airline", "energy_utility"], "direction": "benefit", "why": "연료비가 줄어 이익 개선 기대가 커집니다."},
            {"sectors": ["shipbuilding"], "direction": "risk", "why": "유가가 낮으면 해양플랜트 발주가 늦어질 수 있습니다."},
        ],
    },
    {
        "id": "export_control", "label": "수출통제·제재 강화", "icon": "🚫", "team": "global_dir",
        "groups": [["수출통제", "수출 통제", "수출규제", "수출 규제", "수출 금지", "제재 강화", "블랙리스트", "entity list", "export control"]],
        "exclude": [],
        "easy": "수출이 막히면 해외 매출이 줄 수 있어 반도체·2차전지·자동차가 가장 먼저 흔들립니다.",
        "impacts": [{"sectors": ["semiconductor", "battery", "auto"], "direction": "risk", "why": "해외 수출길이 막히면 매출과 수주가 줄 수 있습니다."}],
    },
    {
        "id": "tariff", "label": "관세 부과·인상", "icon": "🛃", "team": "global_dir",
        "groups": [["관세 부과", "관세 인상", "보편관세", "관세 폭탄", "상호관세", "고율 관세", "관세 압박", "tariff"]],
        "exclude": ["관세 철회", "관세 면제", "관세 유예"],
        "easy": "관세가 붙으면 수출 제품 가격이 비싸져 팔기 어려워지고 마진이 줄어듭니다.",
        "impacts": [{"sectors": ["auto", "semiconductor", "cosmetics", "battery", "shipbuilding"], "direction": "risk", "why": "수출품 가격경쟁력이 떨어지고 마진이 줄어듭니다."}],
    },
    {
        "id": "raw_material", "label": "원자재 수출 제한·독점", "icon": "⛏️", "team": "global_dir",
        "groups": [["희토류", "리튬", "니켈", "코발트", "흑연", "갈륨", "게르마늄", "안티몬", "구리", "광물"],
                   ["수출 제한", "수출 통제", "수출통제", "독점", "금지", "공급 차질", "수출 중단", "무기화", "급등"]],
        "exclude": [],
        "easy": "중국 등이 핵심 광물을 막거나 독점하면 배터리·반도체·자동차 부품 원가가 오르고 생산이 막힐 수 있습니다.",
        "impacts": [{"sectors": ["battery", "semiconductor", "auto", "power_equipment"], "direction": "risk", "why": "핵심 원자재 값이 오르거나 공급이 끊길 수 있습니다."}],
    },
    {
        "id": "semi_investment", "label": "반도체·AI 공장 신설·증설 투자", "icon": "🏭", "team": "research_vp",
        "groups": [["반도체", "팹", "파운드리", "데이터센터", "hbm", "ai 칩"],
                   ["공장 설립", "공장 건설", "신규 공장", "투자 발표", "증설", "착공", "설립"]],
        "exclude": [],
        "easy": "새 반도체 공장이 생기면 장비·소재·전력설비 회사는 주문이 늘지만, 경쟁 메모리 회사는 공급과잉 걱정이 생길 수 있어요.",
        "impacts": [{"sectors": ["semiconductor", "power_equipment"], "direction": "benefit", "why": "장비·소재·전력설비 주문 증가 기대(경쟁 메모리사는 공급과잉 우려 가능)."}],
    },
    {
        "id": "ai_slowdown", "label": "AI 투자 둔화·반도체지수 급락", "icon": "📉", "team": "research_vp",
        "groups": [["ai 거품", "ai 투자 축소", "ai 투자 둔화", "데이터센터 투자 축소", "설비투자 축소", "엔비디아 급락", "반도체지수 급락", "ai 수요 둔화", "필라델피아반도체"]],
        "exclude": [],
        "easy": "미국 AI 투자가 줄면 AI 칩을 쓰는 서버 주문이 줄어, 메모리·전력설비·빅테크 주가가 같이 흔들립니다.",
        "impacts": [{"sectors": ["semiconductor", "power_equipment", "tech_us"], "direction": "risk", "why": "AI 서버 투자 감소 우려로 외국인 매도가 나오기 쉽습니다."}],
    },
    {
        "id": "ai_boom", "label": "AI 투자 확대·반도체 호황", "icon": "🚀", "team": "research_vp",
        "groups": [["엔비디아 호실적", "엔비디아 사상", "ai 투자 확대", "데이터센터 투자 확대", "hbm 수요", "ai 수요 폭발", "반도체지수 급등", "반도체 호황"]],
        "exclude": [],
        "easy": "AI 투자가 늘면 메모리·전력설비·빅테크가 함께 수혜를 받습니다.",
        "impacts": [{"sectors": ["semiconductor", "power_equipment", "tech_us"], "direction": "benefit", "why": "AI 서버 주문 증가 기대가 커집니다."}],
    },
    {
        "id": "fx_surge", "label": "원/달러 환율 급등(원화 약세)", "icon": "💱", "team": "quant_dir",
        "groups": [["환율 급등", "원화 약세", "원/달러 급등", "달러 강세", "환율 상승", "환율 폭등"]],
        "exclude": [],
        "easy": "환율이 오르면 외국인이 한국 주식을 팔기 쉽고, 달러로 연료·원료를 사는 회사는 비용이 늘지만 수출 기업은 유리합니다.",
        "impacts": [
            {"sectors": ["airline", "energy_utility", "finance", "bio"], "direction": "risk", "why": "외국인 이탈과 달러 비용 증가 부담이 있습니다."},
            {"sectors": ["auto"], "direction": "benefit", "why": "달러로 번 돈이 원화로 더 많이 바뀌어 수출 이익이 늘어납니다."},
        ],
    },
    {
        "id": "fx_drop", "label": "원/달러 환율 급락(원화 강세)", "icon": "💵", "team": "quant_dir",
        "groups": [["환율 급락", "원화 강세", "원/달러 급락", "달러 약세", "환율 하락"]],
        "exclude": [],
        "easy": "환율이 떨어지면 외국인 자금은 들어오기 쉽지만, 수출로 번 달러의 원화 가치가 줄어 자동차 같은 수출주는 불리합니다.",
        "impacts": [
            {"sectors": ["auto"], "direction": "risk", "why": "수출로 번 달러가 원화로 바뀔 때 이익이 줄어듭니다."},
            {"sectors": ["airline", "energy_utility", "finance"], "direction": "benefit", "why": "달러 비용 부담이 줄고 외국인 자금 유입 기대가 커집니다."},
        ],
    },
    {
        "id": "rate_up", "label": "금리 상승·인하 지연", "icon": "🏦", "team": "quant_dir",
        "groups": [["금리 인상", "국채금리 급등", "금리 상승", "고금리 장기화", "인하 지연", "인하 무산", "인하 불투명", "매파"]],
        "exclude": [],
        "easy": "금리가 오르면 미래 성장을 기대하는 바이오·미국 빅테크의 주가 가치가 깎입니다.",
        "impacts": [{"sectors": ["bio", "tech_us"], "direction": "risk", "why": "금리가 오르면 성장주의 미래가치 평가가 낮아집니다."}],
    },
    {
        "id": "rate_cut", "label": "금리 인하", "icon": "📉", "team": "quant_dir",
        "groups": [["금리 인하", "기준금리 인하", "금리 하락", "연준 인하"]],
        "exclude": ["인하 지연", "인하 무산", "인하 불투명", "인하 기대 후퇴"],
        "easy": "금리가 내리면 바이오·빅테크 같은 성장주에는 호재, 은행의 이자 수익에는 부담입니다.",
        "impacts": [
            {"sectors": ["bio", "tech_us"], "direction": "benefit", "why": "금리가 내리면 성장주 평가가 올라갑니다."},
            {"sectors": ["finance"], "direction": "risk", "why": "대출 이자 마진이 줄 수 있습니다."},
        ],
    },
    {
        "id": "ev_policy_negative", "label": "전기차 보조금 축소·수요 둔화", "icon": "🔋", "team": "global_dir",
        "groups": [["전기차 보조금 폐지", "전기차 보조금 축소", "ira 폐지", "ira 축소", "전기차 수요 둔화", "전기차 캐즘", "세액공제 폐지", "전기차 판매 부진"]],
        "exclude": [],
        "easy": "미국 전기차 지원금이 줄면 전기차가 덜 팔려 배터리 주문과 납품 단가가 같이 줄어듭니다.",
        "impacts": [{"sectors": ["battery", "auto"], "direction": "risk", "why": "전기차 판매와 배터리 주문이 줄 수 있습니다."}],
    },
    {
        "id": "bio_negative", "label": "FDA 허가 보류·임상 실패", "icon": "🧬", "team": "research_vp",
        "groups": [["fda", "임상"], ["허가 보류", "승인 거절", "crl", "임상 실패", "임상 중단", "승인 지연"]],
        "exclude": [],
        "easy": "신약 허가가 막히면 기술수출·로열티 기대가 꺾여 바이오 주가가 크게 흔들립니다.",
        "impacts": [{"sectors": ["bio"], "direction": "risk", "why": "신약 가치 평가가 낮아집니다."}],
    },
    {
        "id": "bio_positive", "label": "FDA 승인·기술수출 호재", "icon": "💊", "team": "research_vp",
        "groups": [["fda", "임상 3상", "기술수출", "기술이전"], ["승인", "허가", "성공", "계약 체결", "수출 계약"]],
        "exclude": ["보류", "거절", "실패", "지연"],
        "easy": "신약 허가나 기술수출 계약이 나오면 바이오 주가에 큰 호재입니다.",
        "impacts": [{"sectors": ["bio"], "direction": "benefit", "why": "신약 가치가 올라가고 계약금·로열티 기대가 커집니다."}],
    },
    {
        "id": "ship_order", "label": "조선 대규모 수주·발주", "icon": "🚢", "team": "research_vp",
        "groups": [["조선", "lng선", "선박", "해양플랜트"], ["수주", "발주"]],
        "exclude": ["취소", "감소", "부진"],
        "easy": "선박 주문이 늘면 조선사의 앞으로 몇 년치 일감이 확보됩니다.",
        "impacts": [{"sectors": ["shipbuilding"], "direction": "benefit", "why": "수주 잔고가 늘어납니다."}],
    },
    {
        "id": "power_positive", "label": "원전·전력망 투자·수주", "icon": "⚡", "team": "research_vp",
        "groups": [["원전", "smr", "변압기", "전력망"], ["수주", "계약", "투자 확대", "건설 재개"]],
        "exclude": ["취소", "지연", "반덤핑"],
        "easy": "원전·전력망 투자가 늘면 변압기·발전설비 회사 주문이 늘어납니다.",
        "impacts": [{"sectors": ["power_equipment"], "direction": "benefit", "why": "수주와 실적 기대가 커집니다."}],
    },
    {
        "id": "power_negative", "label": "원전·변압기 취소·지연·규제", "icon": "🔌", "team": "global_dir",
        "groups": [["원전", "smr", "변압기", "전력망"], ["취소", "지연", "반덤핑", "관세"]],
        "exclude": [],
        "easy": "원전·변압기 계약이 늦어지거나 관세가 붙으면 수주 기대가 꺾입니다.",
        "impacts": [{"sectors": ["power_equipment"], "direction": "risk", "why": "수주 일정이 밀리거나 마진이 줄 수 있습니다."}],
    },
    {
        "id": "market_selloff", "label": "증시 급락·외국인 대량 매도", "icon": "🔻", "team": "quant_dir",
        "groups": [["코스피 급락", "코스피 폭락", "코스피 사상 최대 하락", "외국인 순매도", "외국인 대량 매도", "서킷브레이커", "사이드카", "블랙먼데이", "패닉셀"]],
        "exclude": ["전쟁 수준", "인도네시아", "베트남", "중국 증시", "일본 증시"],
        "easy": "시장 전체가 흔들리면 좋은 회사도 같이 떨어지기 쉽습니다. 모든 관심종목이 영향권입니다.",
        "impacts": [{"sectors": ["all"], "direction": "risk", "why": "시장 전체 매도세에 동반 하락할 수 있습니다."}],
    },
]


# ─────────────────────────────────────────────────────────
# 대표 계정 / 관심종목 / 기기 토큰
# ─────────────────────────────────────────────────────────
def _ceo_emails() -> set:
    try:
        from routes.market import ALLOWED_CEO_EMAILS  # 인증에 쓰는 목록과 항상 같은 값을 사용
        return {str(e).strip().lower() for e in ALLOWED_CEO_EMAILS}
    except Exception:
        return set(DEFAULT_CEO_EMAILS)


def _db():
    from db_manager import get_db_connection
    return get_db_connection()


def get_ceo_user_ids() -> List[str]:
    emails = sorted(_ceo_emails())
    if not emails:
        return []
    try:
        conn = _db()
        cur = conn.cursor()
        marks = ",".join("?" for _ in emails)
        cur.execute(f"SELECT id FROM users WHERE lower(email) IN ({marks})", emails)
        ids = [str(r[0]) for r in cur.fetchall() if r and r[0]]
        conn.close()
        return ids
    except Exception as e:
        logger.error(f"[RiskRadar] CEO user id lookup failed: {e}")
        return []


def get_ceo_watchlist_symbols(user_ids: Optional[List[str]] = None) -> List[str]:
    ids = user_ids if user_ids is not None else get_ceo_user_ids()
    if not ids:
        return []
    try:
        conn = _db()
        cur = conn.cursor()
        marks = ",".join("?" for _ in ids)
        cur.execute(f"SELECT symbol FROM watchlist WHERE user_id IN ({marks})", ids)
        rows = [str(r[0]).strip() for r in cur.fetchall() if r and r[0]]
        conn.close()
    except Exception as e:
        logger.error(f"[RiskRadar] watchlist lookup failed: {e}")
        return []
    seen, out = set(), []
    for s in rows:
        clean = re.sub(r"\.(KS|KQ|O)$", "", s.upper()).strip()
        if clean and clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out[:MAX_WATCH_SYMBOLS]


def get_ceo_fcm_tokens(user_ids: List[str]) -> List[str]:
    if not user_ids:
        return []
    try:
        conn = _db()
        cur = conn.cursor()
        marks = ",".join("?" for _ in user_ids)
        cur.execute(f"SELECT DISTINCT token FROM fcm_tokens WHERE user_id IN ({marks})", user_ids)
        toks = [r[0] for r in cur.fetchall() if r and r[0]]
        conn.close()
        return toks
    except Exception as e:
        logger.error(f"[RiskRadar] token lookup failed: {e}")
        return []


# ─────────────────────────────────────────────────────────
# 종목 설명(이름·업종)
# ─────────────────────────────────────────────────────────
_NAME_CACHE: Dict[str, str] = {}
_BIZ_CACHE: Dict[str, str] = {}
_REVERSE_MAP: Optional[Dict[str, str]] = None


def _reverse_stock_map() -> Dict[str, str]:
    global _REVERSE_MAP
    if _REVERSE_MAP is None:
        _REVERSE_MAP = {}
        try:
            from stock_names import STOCK_MAP
            for nm, code in STOCK_MAP.items():
                c = str(code).split(".")[0]
                if re.fullmatch(r"\d{6}", c) and re.search(r"[가-힣]", str(nm)):
                    cur = _REVERSE_MAP.get(c)
                    if cur is None or len(str(nm)) < len(cur):
                        _REVERSE_MAP[c] = str(nm)
        except Exception:
            pass
    return _REVERSE_MAP


def _kr_name(code: str) -> str:
    if code in _NAME_CACHE:
        return _NAME_CACHE[code]
    name = None
    try:  # 정식 종목명을 우선 사용 ('삼전' 같은 별명 방지)
        j = requests.get(f"https://m.stock.naver.com/api/stock/{code}/basic", headers=HEADERS, timeout=5).json()
        name = j.get("stockName")
    except Exception:
        name = None
    if not name:
        name = _reverse_stock_map().get(code)
    _NAME_CACHE[code] = name or code
    return _NAME_CACHE[code]


def _kr_biz_text(code: str) -> str:
    if code in _BIZ_CACHE:
        return _BIZ_CACHE[code]
    text = ""
    try:
        j = requests.get(f"https://m.stock.naver.com/api/stock/{code}/finance/annual", headers=HEADERS, timeout=5).json()
        corp = j.get("corporationSummary", {}) or {}
        text = " ".join(str(corp.get(f"comment{i}") or "") for i in range(1, 6))
    except Exception:
        pass
    _BIZ_CACHE[code] = text.lower()
    return _BIZ_CACHE[code]


def classify_sectors(name: str, code: str, biz_text: str = "") -> List[str]:
    if code in US_TICKER_SECTORS:
        return list(US_TICKER_SECTORS[code])
    nm = f"{name}".lower()
    found = [key for key, name_kws, _ in SECTOR_RULES if any(k in nm for k in name_kws)]
    if not found and biz_text:
        found = [key for key, _, biz_kws in SECTOR_RULES if any(k in biz_text for k in biz_kws)]
    return found[:2]


def describe_stock(symbol: str) -> Dict[str, Any]:
    code = symbol.upper()
    if re.fullmatch(r"\d{6}", code):
        name = _kr_name(code)
        sectors = classify_sectors(name, code)
        if not sectors:
            sectors = classify_sectors(name, code, _kr_biz_text(code))
    else:
        name = US_NAMES.get(code, code)
        sectors = classify_sectors(name, code)
    return {"symbol": code, "name": name, "sectors": sectors}


# ─────────────────────────────────────────────────────────
# 뉴스 수집 (Google News RSS, API 키 불필요)
# ─────────────────────────────────────────────────────────
NEWS_QUERIES = [
    "전쟁 증시", "휴전 종전 협상", "국제유가", "원달러 환율", "수출통제 반도체", "관세 부과",
    "희토류 수출 통제", "엔비디아 AI 반도체", "반도체 공장 투자", "전기차 보조금", "연준 금리 국채금리",
    "FDA 승인 바이오", "원전 변압기 수주", "조선 수주", "코스피 외국인 매도",
    "war oil prices", "export controls chips",
]


def _fetch_rss(query: str) -> List[Dict[str, Any]]:
    url = f"https://news.google.com/rss/search?q={quote(query + ' when:1d')}&hl=ko&gl=KR&ceid=KR:ko"
    items: List[Dict[str, Any]] = []
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code != 200:
            return items
        root = ET.fromstring(res.content)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=NEWS_MAX_AGE_HOURS)
        for it in root.findall("./channel/item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            src_el = it.find("source")
            source = (src_el.text or "").strip() if src_el is not None else ""
            if source and title.endswith(f" - {source}"):
                title = title[: -len(f" - {source}")].strip()
            published = None
            try:
                published = parsedate_to_datetime(it.findtext("pubDate") or "")
            except Exception:
                pass
            if published and published.tzinfo and published < cutoff:
                continue
            if title:
                items.append({
                    "title": title, "url": link, "source": source,
                    "published": published.astimezone(KST).strftime("%m.%d %H:%M") if published else "",
                })
    except Exception as e:
        logger.warning(f"[RiskRadar] RSS fetch failed ({query}): {e}")
    return items


def fetch_headlines() -> List[Dict[str, Any]]:
    seen, out = set(), []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for items in ex.map(_fetch_rss, NEWS_QUERIES):
            for it in items:
                key = re.sub(r"\s+", "", it["title"])[:40]
                if key not in seen:
                    seen.add(key)
                    out.append(it)
    return out


# ─────────────────────────────────────────────────────────
# 사건 감지 & 관심종목 대조
# ─────────────────────────────────────────────────────────
def _matches(rule: Dict[str, Any], title_lower: str) -> bool:
    if any(x in title_lower for x in rule.get("exclude", [])):
        return False
    return all(any(k in title_lower for k in group) for group in rule["groups"])


def detect_events(headlines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    events = []
    for rule in EVENT_RULES:
        hits = [h for h in headlines if _matches(rule, h["title"].lower())]
        if len(hits) >= MIN_HEADLINES:
            events.append({"rule": rule, "hits": hits})
    return events


def _impact_for_stocks(rule: Dict[str, Any], stocks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    out: Dict[str, List[Dict[str, Any]]] = {"risk": [], "benefit": []}
    for st in stocks:
        for imp in rule["impacts"]:
            if "all" in imp["sectors"]:
                matched = ["전체 시장"]
            else:
                matched = [SECTOR_LABELS[s] for s in st["sectors"] if s in imp["sectors"]]
            if matched:
                out[imp["direction"]].append({
                    "symbol": st["symbol"], "name": st["name"],
                    "sector": matched[0], "why": imp["why"],
                })
                break
    return out


def build_event_cards(events: List[Dict[str, Any]], stocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    today = datetime.now(KST).strftime("%Y-%m-%d")
    cards = []
    for ev in events:
        rule, hits = ev["rule"], ev["hits"]
        impact = _impact_for_stocks(rule, stocks)
        cards.append({
            "key": f"{rule['id']}:{today}",
            "kind": "global_event",
            "event_id": rule["id"],
            "label": rule["label"],
            "icon": rule["icon"],
            "team": TEAMS[rule["team"]],
            "severity": "high" if len(hits) >= 4 else "medium",
            "headline_count": len(hits),
            "easy": rule["easy"],
            "risk_stocks": impact["risk"],
            "benefit_stocks": impact["benefit"],
            "affects_watchlist": bool(impact["risk"] or impact["benefit"]),
            "evidence": [{"title": h["title"], "url": h["url"], "source": h["source"], "published": h["published"]} for h in hits[:4]],
            "guide_risk": GENERIC_RISK_GUIDE,
            "guide_benefit": GENERIC_BENEFIT_GUIDE,
        })
    cards.sort(key=lambda c: (not c["affects_watchlist"], bool(not c["risk_stocks"]), c["severity"] != "high"))
    return cards


def build_dart_cards(stocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """관심종목에 최근 3일 내 악재성 DART 공시가 올라왔는지 확인."""
    cards = []
    try:
        from watchlist_research_service import _fetch_dart_disclosures
    except Exception as e:
        logger.warning(f"[RiskRadar] DART helper import failed: {e}")
        return cards
    cutoff = (datetime.now(KST) - timedelta(days=3)).strftime("%Y.%m.%d")
    for st in stocks:
        if not re.fullmatch(r"\d{6}", st["symbol"]):
            continue
        for d in _fetch_dart_disclosures(st["symbol"], max_items=5):
            if d.get("tone") != "negative" or (d.get("date") or "") < cutoff:
                continue
            cards.append({
                "key": f"dart:{d.get('rcept_no') or d.get('title')}",
                "kind": "dart_negative",
                "event_id": "dart_negative",
                "label": f"{st['name']} 악재성 공시",
                "icon": "📢",
                "team": TEAMS["risk_cro"],
                "severity": "high",
                "headline_count": 1,
                "easy": d.get("easy_meaning") or "회사 악재성 공시입니다.",
                "risk_stocks": [{"symbol": st["symbol"], "name": st["name"], "sector": "기업 공시", "why": f"[{d.get('date')}] {d.get('title')}"}],
                "benefit_stocks": [],
                "affects_watchlist": True,
                "evidence": [{"title": d.get("title"), "url": d.get("url"), "source": "금융감독원 DART", "published": d.get("date")}],
                "guide_risk": GENERIC_RISK_GUIDE,
                "guide_benefit": GENERIC_BENEFIT_GUIDE,
            })
    return cards


# ─────────────────────────────────────────────────────────
# 저장 / 푸시(대표 계정 전용)
# ─────────────────────────────────────────────────────────
def _load_json(path: str, default: Any) -> Any:
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[RiskRadar] read failed {path}: {e}")
    return default


def _save_json(path: str, data: Any) -> None:
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[RiskRadar] save failed {path}: {e}")


def get_latest_report() -> Dict[str, Any]:
    return _load_json(REPORT_PATH, {
        "generated_at": None, "watchlist": [], "events": [], "watch_event_count": 0,
        "note": "아직 점검 기록이 없습니다. '지금 점검'을 눌러 주세요.",
    })


def _push_to_ceo_only(new_cards: List[Dict[str, Any]], ceo_ids: List[str]) -> int:
    """대표 계정의 기기로만 발송. 대표 기기를 못 찾으면 보내지 않고 끝냅니다(전체 발송 대체 없음)."""
    tokens = get_ceo_fcm_tokens(ceo_ids)
    if not tokens or not ceo_ids:
        logger.warning("[RiskRadar] CEO device token not found. Push skipped (never broadcast).")
        return 0
    try:
        from firebase_config import send_multicast_notification
    except Exception as e:
        logger.error(f"[RiskRadar] firebase import failed: {e}")
        return 0

    top = new_cards[0]
    risk_names = sorted({s["name"] for c in new_cards for s in c["risk_stocks"]})
    benefit_names = sorted({s["name"] for c in new_cards for s in c["benefit_stocks"]})
    team = top["team"]
    title = f"🚨 [대표님 전용 리스크 레이더] {top['icon']} {top['label']} 감지"
    lines = [f"{team['avatar']} {team['name']} {team['role']}: {top['easy']}"]
    if risk_names:
        lines.append("⚠️ 관심종목 위험: " + ", ".join(risk_names[:5]))
    if benefit_names:
        lines.append("🟢 관심종목 수혜: " + ", ".join(benefit_names[:5]))
    if len(new_cards) > 1:
        lines.append(f"외 {len(new_cards) - 1}건 더 — 집무실에서 확인하세요.")
    body = "\n".join(lines)

    try:
        resp = send_multicast_notification(
            tokens, title, body,
            data={"type": "ceo_risk_radar", "url": "/ceo-office", "click_action": "/ceo-office", "is_global": "false"},
            target_users=ceo_ids,
        )
        return int(resp.get("success_count", 0) or 0)
    except Exception as e:
        logger.error(f"[RiskRadar] push failed: {e}")
        return 0


def run_radar_scan(push: bool = True, symbols_override: Optional[List[str]] = None) -> Dict[str, Any]:
    now = datetime.now(KST)
    ceo_ids = get_ceo_user_ids()
    symbols = symbols_override if symbols_override is not None else get_ceo_watchlist_symbols(ceo_ids)
    stocks = [describe_stock(s) for s in symbols[:MAX_WATCH_SYMBOLS]]

    headlines = fetch_headlines()
    cards = build_event_cards(detect_events(headlines), stocks) + build_dart_cards(stocks)
    cards.sort(key=lambda c: (not c["affects_watchlist"], c["severity"] != "high"))
    watch_cards = [c for c in cards if c["affects_watchlist"]]

    report = {
        "generated_at": now.strftime("%Y-%m-%d %H:%M KST"),
        "headline_scanned": len(headlines),
        "watchlist": stocks,
        "events": cards,
        "watch_event_count": len(watch_cards),
        "pushed": 0,
        "note": None if stocks else "대표 계정의 관심종목을 찾지 못했습니다. 관심종목을 등록하면 자동으로 대조합니다.",
    }

    if push and watch_cards:
        state = _load_json(STATE_PATH, {"sent": {}, "push_day": "", "push_count": 0})
        today = now.strftime("%Y-%m-%d")
        if state.get("push_day") != today:
            state["push_day"], state["push_count"] = today, 0
        cutoff = (now - timedelta(days=3)).timestamp()
        state["sent"] = {k: v for k, v in state.get("sent", {}).items() if v >= cutoff}
        fresh = [c for c in watch_cards if c["key"] not in state["sent"]]
        if fresh and state["push_count"] < DAILY_PUSH_CAP:
            report["pushed"] = _push_to_ceo_only(fresh, ceo_ids)
            if report["pushed"]:
                state["push_count"] += 1
            for c in fresh:
                state["sent"][c["key"]] = now.timestamp()
        _save_json(STATE_PATH, state)

    _save_json(REPORT_PATH, report)
    logger.info(f"[RiskRadar] scan done: headlines={len(headlines)} events={len(cards)} watch={len(watch_cards)} pushed={report['pushed']}")
    return report
