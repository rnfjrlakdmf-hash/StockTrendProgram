import os
import re
import sys
import json
import asyncio
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

DATA_DIR = os.path.join(BACKEND_DIR, "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

REPORT_FILE = os.path.join(DATA_DIR, "whale_weekend_report.json")

def get_net_volume_for_stock(code: str, investor: str = 'foreign') -> str:
    url = f"https://m.stock.naver.com/api/stock/{code}/trend?pageSize=2"
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=3)
        if r.status_code == 200:
            rows = r.json()
            if rows and isinstance(rows, list):
                target = rows[0]
                quant = target.get('foreignerPureBuyQuant') if investor == 'foreign' else target.get('organPureBuyQuant')
                if quant:
                    return f"{quant}주"
    except Exception:
        pass
    return ""

def fetch_whale_top10():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Referer": "https://stock.naver.com/"
    }
    
    url = "https://stock.naver.com/api/domestic/home/marketaggregate/aggregateInvestorRanking"
    
    payload = {
        "sections": {
            "foreignTop": {
                "tradeType": "KRX",
                "marketType": "KOSPI",
                "krxMarketType": "KOSPI",
                "startIdx": 0,
                "pageSize": 10
            },
            "orgTop": {
                "tradeType": "KRX",
                "marketType": "KOSPI",
                "krxMarketType": "KOSPI",
                "startIdx": 0,
                "pageSize": 10
            }
        }
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        if res.status_code != 200:
            print(f"[WhaleReport] Modern API error: {res.status_code}")
            return [], []
            
        data = res.json().get("data", {})
        raw_foreign = data.get("foreignTop", {}).get("buy", [])
        raw_org = data.get("orgTop", {}).get("buy", [])
        
        foreign_top10 = []
        for item in raw_foreign[:10]:
            name = item.get("itemname", "").strip()
            code = item.get("itemcode", "").strip()
            vol = get_net_volume_for_stock(code, 'foreign')
            amount_str = vol if vol else f"{item.get('dailyTradeVolume', 0):,}주"
            if name:
                foreign_top10.append({"stock": name, "amount": amount_str, "code": code})
                
        inst_top10 = []
        for item in raw_org[:10]:
            name = item.get("itemname", "").strip()
            code = item.get("itemcode", "").strip()
            vol = get_net_volume_for_stock(code, 'org')
            amount_str = vol if vol else f"{item.get('dailyTradeVolume', 0):,}주"
            if name:
                inst_top10.append({"stock": name, "amount": amount_str, "code": code})
                
        return foreign_top10, inst_top10
    except Exception as e:
        print(f"[WhaleReport] Modern API fetch error: {e}")
        return [], []

def _generate_whale_report_sync():
    from ai_analysis import generate_with_retry, API_KEY, safe_json_loads
    
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    foreign_top10, inst_top10 = fetch_whale_top10()
    if not foreign_top10:
        foreign_top10 = [{"stock": "데이터 수집 중", "amount": "0주"}]
    if not inst_top10:
        inst_top10 = [{"stock": "데이터 수집 중", "amount": "0주"}]
        
    foreign_str = ", ".join([f"{item['stock']} ({item['amount']})" for item in foreign_top10])
    inst_str = ", ".join([f"{item['stock']} ({item['amount']})" for item in inst_top10])
    
    print(f"[WhaleReport] Foreign: {foreign_str}")
    print(f"[WhaleReport] Inst: {inst_str}")
    
    if not API_KEY:
        print("[WhaleReport] No Gemini API Key")
        return None
        
    prompt = f"""당신은 국내외 메이저 헤지펀드와 슈퍼개미들을 위한 주간 수급 인텔리전스 수석 애널리스트입니다.
주말에만 열람 가능한 프리미엄 [주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이 리포트]를 작성해야 합니다.

[현재 시간] {now.strftime('%Y-%m-%d %H:%M KST')}

[이번 주 금요일 마감 기준 수급 데이터 (순매수 수량)]
- 외국인 순매수 TOP 10: {foreign_str}
- 기관 순매수 TOP 10: {inst_str}

[작성 지침 및 자본시장법 준수]
1. 절대로 '매수 추천', '목표가 달성 시 매도' 등 직접적인 매매 권유 표현을 쓰지 마세요. 객관적 수급 팩트와 시장 통계로 작성하세요.
2. 실제 제공된 실제 종목명을 기반으로 분석하세요.
3. 다음 3대 고래 수급 섹션을 반드시 완성하세요:
   - whale_sectors: 한 주간 고래 자금이 가장 집중된 상위 3대 주도 섹터(예: AI반도체, 방산/우주, 전력인프라/변압기 등)와 핵심 대장주, 자금 유입 배경
   - hidden_whales: 주가는 크게 과열되지 않았으나 외인·기관이 조용히 수량을 축적한 '은밀한 고래 매집주 3선'
    - foreign_analysis: 위에 제공된 외국인 순매수 TOP 10 종목 1위부터 10위까지 10개 전체를 누락 없이 각각 1줄 이유와 함께 작성
   - inst_analysis: 위에 제공된 기관 순매수 TOP 10 종목 1위부터 10위까지 10개 전체를 누락 없이 각각 1줄 이유와 함께 작성
   - monday_strategy: 다음 주 월요일 시초가 및 주간 대응 로드맵 (수급 핵심, 눌림목 지표 점검, 리스크 관리 3단계)

[출력 형식 JSON]
{{
  "title": "주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이",
  "subtitle": "한 주간 시장을 뒤흔든 슈퍼 고래들의 집중 매집 섹터와 은밀한 매집주를 해부합니다.",
  "whale_sectors": [
    {{"sector": "주도 섹터명", "leader": "대표 종목", "intensity": "초강력", "flow_reason": "거대 자금 유입 배경 1~2문장"}}
  ],
  "hidden_whales": [
    {{"stock": "종목명", "amount": "123,456주", "pattern": "주가 횡보 속 메이저 3일 연속 매집", "catalyst": "실적 및 밸류체인 모멘텀"}}
  ],
  "foreign_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "inst_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "monday_strategy": "• 📌 주간 수급 총평: 외국인과 기관의 자금이 반도체와 방산 등 실적 가시성이 높은 대형 수출주로 압축 유입되었습니다.\n• 🎯 월요일 시초가 체크포인트: 주말 간 발표된 글로벌 지표(환율, 필라델피아 반도체 지수)를 확인하고, 갭상승 추격보다는 20일선 지지 라인 안착 여부를 우선 확인하세요.\n• 🛡️ 리스크 관리 (종목 압축): 단기 변동성 확대를 방어하기 위해 수급 연속성이 확인된 주도 섹터 중심으로 포트폴리오를 점검하는 것이 유리합니다.",
  "generated_at": "{now.isoformat()}"
}}
"""
    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        report_data = safe_json_loads(text)
        if not report_data or not isinstance(report_data, dict):
            raise ValueError(f"Invalid JSON returned: {text[:100]}...")
        report_data["generated_at"] = now.isoformat()

        # 외국인 순매수 TOP 10 (10개 완전 보장)
        fa_dict = {item.get("stock"): item for item in report_data.get("foreign_analysis", []) if isinstance(item, dict) and item.get("stock")}
        full_foreign = []
        for f_item in foreign_top10:
            stk = f_item.get("stock")
            if stk in fa_dict:
                obj = fa_dict[stk]
                if not obj.get("amount") or obj.get("amount") == "0주":
                    obj["amount"] = f_item.get("amount")
                full_foreign.append(obj)
            else:
                full_foreign.append({
                    "stock": stk,
                    "amount": f_item.get("amount"),
                    "reason": "글로벌 패시브 및 업종 대표주 중심의 외국인 수급 유입."
                })
        report_data["foreign_analysis"] = full_foreign[:10]

        # 기관 순매수 TOP 10 (10개 완전 보장)
        ia_dict = {item.get("stock"): item for item in report_data.get("inst_analysis", []) if isinstance(item, dict) and item.get("stock")}
        full_inst = []
        for i_item in inst_top10:
            stk = i_item.get("stock")
            if stk in ia_dict:
                obj = ia_dict[stk]
                if not obj.get("amount") or obj.get("amount") == "0주":
                    obj["amount"] = i_item.get("amount")
                full_inst.append(obj)
            else:
                full_inst.append({
                    "stock": stk,
                    "amount": i_item.get("amount"),
                    "reason": "기관 펀드 리밸런싱 및 분할 매집세 유입."
                })
        report_data["inst_analysis"] = full_inst[:10]
        
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
        print("[WhaleReport] Saved successfully.")
        return report_data
    except Exception as e:
        print(f"[WhaleReport] Generation error: {e}")
        return None

async def generate_whale_weekend_report():
    return await asyncio.to_thread(_generate_whale_report_sync)

def get_latest_whale_report():
    if os.path.exists(REPORT_FILE):
        try:
            with open(REPORT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return None
    return None


def _compact_shares(raw_amt: str) -> str:
    if not raw_amt:
        return ""
    s = str(raw_amt).strip()
    m = re.search(r'([+\-]?)\s*([\d,]+)\s*주?', s)
    if not m:
        return s
    sign = m.group(1) or "+"
    try:
        n = int(m.group(2).replace(",", ""))
    except Exception:
        return s
    if n >= 10000:
        man = n / 10000.0
        val_str = f"{man:.1f}만주" if man < 100 else f"{int(round(man)):,}만주"
        return f"{sign}{val_str}"
    return f"{sign}{n:,}주"


def build_whale_vip_alert_payload(report_data: dict = None) -> tuple:
    """
    주말 슈퍼 고래(Whale) 수급 심층 엑스레이(whale_weekend_report.json) 실제 데이터를 바탕으로
    VIP 프리미엄 리포트 알림(제목, 본문, data)을 생성합니다.
    """
    if report_data is None:
        report_data = get_latest_whale_report()

    title = "🐋 [VIP 주말 특집 ②] 슈퍼 고래 수급 심층 엑스레이"

    if not report_data or not isinstance(report_data, dict):
        body = (
            "🏆 [고래 집중 3대 섹터] 한 주간 외국인·기관 거대 자본이 집중 유입된 주도 산업군 맵\n"
            "💎 [은밀한 매집주 TOP 3] 주가 횡보 구간에서 큰손이 조용히 수량을 축적한 핵심 3종목\n"
            "🌐 [외인·기관 TOP 10] 한국거래소(KRX) 주간 순매수 상위 10종목 전수 해부 및 수급 배경\n"
            "🎯 [월요일 시초가 로드맵] 09:00~09:30 프로그램 수급 점검 및 눌림목 분할 접근 전략 수록\n"
            "💡 [VIP 열람 혜택] 주말 한정 특별 공개 · 전문에서 전체 매집 명단과 대응 전략 확인"
        )
        return title, body, {"type": "weekend_whale", "url": "/weekend-whale"}

    whale_sectors = report_data.get("whale_sectors") or []
    hidden_whales = report_data.get("hidden_whales") or []
    foreign_list = report_data.get("foreign_analysis") or []
    inst_list = report_data.get("inst_analysis") or []

    # 1) 고래 집중 3대 섹터
    sec_parts = []
    for ws in whale_sectors[:3]:
        s_name = str(ws.get("sector") or "").strip()
        leaders = str(ws.get("leader") or "").strip()
        leader_short = "·".join([x.strip() for x in re.split(r'[,·]', leaders) if x.strip()][:2])
        if s_name:
            sec_parts.append(f"{s_name}({leader_short})" if leader_short else s_name)
    sec_line = " · ".join(sec_parts) if sec_parts else "AI반도체 · 전력인프라 · 바이오"

    # 2) 은밀한 고래 매집주 TOP 3
    hw_parts = []
    for hw in hidden_whales[:3]:
        stk = str(hw.get("stock") or "").strip()
        amt = _compact_shares(hw.get("amount") or "")
        if stk:
            hw_parts.append(f"{stk}({amt})" if amt else stk)
    hw_line = " · ".join(hw_parts) if hw_parts else "외인·기관 연속 저점 축적 핵심 3선 수록"

    # 3) 외국인 순매수 TOP 3 (ETF 제외 우선, 부족하면 포함)
    f_non_etf = [x for x in foreign_list if not any(k in str(x.get("stock", "")) for k in ["KODEX", "TIGER", "ACE", "RISE", "SOL"])]
    f_pick = (f_non_etf[:3] if len(f_non_etf) >= 3 else foreign_list[:3])
    f_line = " · ".join([f"{x.get('stock')}({_compact_shares(x.get('amount', ''))})" for x in f_pick if x.get("stock")]) or "외국인 주간 순매수 TOP 10 전수 분석"

    # 4) 기관 순매수 TOP 3 (ETF 제외 우선)
    i_non_etf = [x for x in inst_list if not any(k in str(x.get("stock", "")) for k in ["KODEX", "TIGER", "ACE", "RISE", "SOL"])]
    i_pick = (i_non_etf[:3] if len(i_non_etf) >= 3 else inst_list[:3])
    i_line = " · ".join([f"{x.get('stock')}({_compact_shares(x.get('amount', ''))})" for x in i_pick if x.get("stock")]) or "기관 주간 순매수 TOP 10 전수 분석"

    # 5) 월요일 전략 요약
    strat_raw = str(report_data.get("monday_strategy") or "").strip()
    strat_first = ""
    for ln in strat_raw.splitlines():
        cln = re.sub(r'^[•\-\*\d\.\s📌🎯🛡️]+', '', ln).strip()
        if len(cln) >= 12:
            strat_first = cln[:86] + ("…" if len(cln) > 86 else "")
            break
    if not strat_first:
        strat_first = "월요일 장 초반(09:00~09:30) 갭상승 추격 대신 외인·기관 프로그램 수급 확인 후 분할 접근"

    lines = [
        f"🏆 [고래 집중 3대 섹터] {sec_line}",
        f"💎 [은밀한 매집주 TOP 3] {hw_line}",
        f"🌐 [외국인 순매수 TOP 3] {f_line}",
        f"🏛️ [기관 순매수 TOP 3] {i_line}",
        f"🎯 [월요일 시초가 전략] {strat_first}",
        "💡 [VIP 열람 혜택] 외인·기관 TOP 10 전체 명단 · 종목별 매집 배경 · 월요일 로드맵 전문 수록",
    ]
    return title, "\n".join(lines), {"type": "weekend_whale", "url": "/weekend-whale"}


if __name__ == "__main__":
    _generate_whale_report_sync()
