# -*- coding: utf-8 -*-
from fastapi import APIRouter
import urllib.request
import json
import re
import logging
from cachetools import TTLCache, cached

router = APIRouter()
logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://m.stock.naver.com/'
}

def clean_ticker(ticker: str) -> str:
    cleaned = ticker.split('.')[0]
    return re.sub(r'[^0-9a-zA-Z]', '', cleaned)

@cached(cache=TTLCache(maxsize=1000, ttl=300))
def fetch_5step_report_data(ticker: str):
    ticker = clean_ticker(ticker)
    
    # 1. Naver Integration API
    url_int = f'https://m.stock.naver.com/api/stock/{ticker}/integration'
    req_int = urllib.request.Request(url_int, headers=HEADERS)
    try:
        data_int = json.loads(urllib.request.urlopen(req_int, timeout=5).read().decode('utf-8'))
    except Exception as e:
        logger.error(f'Error fetching integration for {ticker}: {e}')
        data_int = {}

    stock_name = data_int.get('stockName', ticker)
    total_infos = {item.get('code'): item.get('value') for item in data_int.get('totalInfos', [])}

    high52_str = total_infos.get('highPriceOf52Weeks', '0').replace(',', '')
    low52_str = total_infos.get('lowPriceOf52Weeks', '0').replace(',', '')
    high52 = int(high52_str) if high52_str.isdigit() else 0
    low52 = int(low52_str) if low52_str.isdigit() else 0

    per_str = total_infos.get('per', '0').replace('배', '').replace(',', '').strip()
    pbr_str = total_infos.get('pbr', '0').replace('배', '').replace(',', '').strip()
    foreign_rate = total_infos.get('foreignRate', '0%')

    try: per = float(per_str)
    except: per = 0.0
    try: pbr = float(pbr_str)
    except: pbr = 0.0

    # Sector & Peers
    peers = []
    for p in (data_int.get('industryCompareInfo') or [])[:4]:
        is_rising = p.get('compareToPreviousPrice', {}).get('name') == 'RISING'
        fluc = p.get('fluctuationsRatio', '0')
        change_str = f"+{fluc}%" if is_rising else f"{fluc}%"
        peers.append({
            'ticker': p.get('itemCode'),
            'name': p.get('stockName'),
            'price': p.get('closePrice'),
            'change': change_str
        })

    # 2. Price API (20 days)
    url_price = f'https://m.stock.naver.com/api/stock/{ticker}/price?pageSize=25'
    req_price = urllib.request.Request(url_price, headers=HEADERS)
    try:
        prices = json.loads(urllib.request.urlopen(req_price, timeout=5).read().decode('utf-8'))
    except Exception as e:
        logger.error(f'Error fetching price for {ticker}: {e}')
        prices = []

    current_price = int(prices[0]['closePrice'].replace(',', '')) if prices else 0
    prev_close = int(prices[1]['closePrice'].replace(',', '')) if len(prices) > 1 else current_price

    vols = [int(p['accumulatedTradingVolume']) for p in prices if 'accumulatedTradingVolume' in p]
    vol_5d = sum(vols[:5]) / min(5, len(vols)) if vols else 0
    vol_20d = sum(vols[:20]) / min(20, len(vols)) if vols else 0
    vol_ratio = round(((vol_5d - vol_20d) / vol_20d * 100), 1) if vol_20d > 0 else 0

    close_prices = [int(p['closePrice'].replace(',', '')) for p in prices]
    ma5 = sum(close_prices[:5]) / min(5, len(close_prices)) if close_prices else 0
    ma20 = sum(close_prices[:20]) / min(20, len(close_prices)) if len(close_prices) >= 20 else ma5

    high52_drop = round(((current_price - high52) / high52 * 100), 1) if high52 > 0 else 0
    low52_rise = round(((current_price - low52) / low52 * 100), 1) if low52 > 0 else 0

    is_bull_align = ma5 >= ma20
    align_status = '정배열 상승 추세' if is_bull_align else '역배열 (바닥 다지기 및 반등 모색)'

    # 3. Trend API (20 days)
    url_trend = f'https://m.stock.naver.com/api/stock/{ticker}/trend?pageSize=20'
    req_trend = urllib.request.Request(url_trend, headers=HEADERS)
    try:
        trends = json.loads(urllib.request.urlopen(req_trend, timeout=5).read().decode('utf-8'))
    except Exception as e:
        logger.error(f'Error fetching trend for {ticker}: {e}')
        trends = []

    def parse_net(val_str):
        if not val_str: return 0
        clean = val_str.replace(',', '').replace('+', '')
        try: return int(clean)
        except: return 0

    foreign_sum_20d = sum(parse_net(t.get('foreignerPureBuyQuant')) for t in trends)
    inst_sum_20d = sum(parse_net(t.get('organPureBuyQuant')) for t in trends)
    retail_sum_20d = sum(parse_net(t.get('individualPureBuyQuant')) for t in trends)

    # 4. News API
    url_news = f'https://m.stock.naver.com/api/news/stock/{ticker}?pageSize=3'
    req_news = urllib.request.Request(url_news, headers=HEADERS)
    news_items = []
    try:
        news_res = json.loads(urllib.request.urlopen(req_news, timeout=5).read().decode('utf-8'))
        if isinstance(news_res, list) and len(news_res) > 0 and 'items' in news_res[0]:
            for n in news_res[0]['items'][:3]:
                raw_title = n.get('titleFull') or n.get('title') or ''
                clean_title = re.sub(r'&[a-zA-Z]+;', ' ', raw_title).strip()
                news_items.append({
                    'title': clean_title,
                    'office': n.get('officeName', '언론사'),
                    'date': n.get('datetime', '')[:8],
                    'url': n.get('mobileNewsUrl', '')
                })
    except Exception as e:
        logger.error(f'Error fetching news for {ticker}: {e}')

    # 5. Calculate Smart Insights & Scores
    # Step 1: Fundamental Score (out of 10)
    fund_score = 6
    if per > 0 and per < 20: fund_score += 2
    elif per >= 20 and per < 40: fund_score += 1
    if pbr > 0 and pbr < 2.0: fund_score += 1
    if high52_drop < -40: fund_score += 1
    fund_score = min(10, max(1, fund_score))
    grade = 'S' if fund_score >= 9 else ('A' if fund_score >= 8 else ('B+' if fund_score >= 6 else 'B'))

    step1_insight = f"재무 건전성 점수 {fund_score}점 ({grade}등급). PER {per}배, PBR {pbr}배 수준으로 안정적 펀더멘털을 유지하고 있으며 밸류에이션 매력 유효"

    # Step 2: Material Insight
    step2_status = '진행 중 (모멘텀 유효)'
    step2_insight = "최근 주요 이슈 및 언론 보도 모멘텀이 현재진행형 상태 · 단기 뉴스 파급력 및 공시 세부 조건 점검 권장"

    # Step 3: Theme Insight
    step3_cycle = '성장·확산 국면' if is_bull_align else '바닥 다지기 및 순환매 대기'
    step3_insight = f"테마 사이클상 현재 위치는 '{step3_cycle}' · 동종업계 피어 종목과의 수급 동조화 및 주도 섹터 흐름 주목"

    # Step 4: Supply Verdict & Insight
    if foreign_sum_20d > 0 and inst_sum_20d > 0:
        verdict = '외인·기관 쌍끌이 스마트머니 매집'
        step4_insight = f"최근 20거래일 외인(+{foreign_sum_20d:,}주)과 기관(+{inst_sum_20d:,}주)의 쌍끌이 순매수 유입으로 강력한 수급 지지 기반 형성"
    elif foreign_sum_20d < 0 and inst_sum_20d > 0:
        verdict = '기관 순매수 방어 vs 외인 차익실현'
        step4_insight = f"최근 20거래일 외국인의 차익실현 매물({foreign_sum_20d:,}주)을 기관의 저점 순매수(+{inst_sum_20d:,}주)가 견고하게 방어 중"
    elif foreign_sum_20d > 0 and inst_sum_20d < 0:
        verdict = '외국인 주도 순매수 유입'
        step4_insight = f"최근 20거래일 외국인이 {foreign_sum_20d:,}주를 순매수하며 글로벌 자금 유입 주도 중"
    else:
        verdict = '메이저 양매도 출회 (개인 순매수 의존)'
        step4_insight = f"최근 20거래일 외인과 기관의 동반 매도세가 관측되어 개인 수급이 주가를 지지 중 · 단기 보수적 접근 권장"

    # Step 5: Technical Insight
    if high52_drop <= -40 and vol_ratio > 20:
        step5_status = '저점 돌파 및 바닥 탈출 시도'
        step5_insight = f"52주 최고가 대비 {high52_drop}% 낙폭 과대 구간에서 5일 거래량이 20일 평균 대비 +{vol_ratio}% 급증하며 강력한 바닥 탈출 시도 중"
    elif is_bull_align:
        step5_status = '정배열 상승 추세 지속'
        step5_insight = f"단기 이평선이 중기 이평선 상단에 위치한 정배열 구간 · 5일 거래량 비율({vol_ratio}%)을 동반한 안정적 추세 추종 국면"
    else:
        step5_status = '역배열 하방 지지력 테스트'
        step5_insight = f"52주 최고가 대비 {high52_drop}% 조정 이후 저점 지지선 확인 중 · 거래량 회복 및 이평선 골든크로스 전환 여부 관찰 필요"

    # Risk Assessment
    short_risk = "최근 수급 주체의 변동성 및 단기 지수 조정에 따른 흔들림 주의" if foreign_sum_20d < 0 else "단기 급등에 따른 차익 실현 매물 출회 가능성"
    mid_risk = "글로벌 거시경제 변동성 및 업황 사이클 둔화 시 밸류에이션 멀티플 제한"
    counter_arg = "업종 내 독보적 기술력과 시장 점유율을 바탕으로 한 실적 턴어라운드 및 밸류에이션 리레이팅 잠재력"

    # Calculate CVD & OBV
    cvd_strength = 100.0
    if len(prices) > 0:
        p0 = prices[0]
        h0 = int(p0.get('highPrice', '0').replace(',', ''))
        l0 = int(p0.get('lowPrice', '0').replace(',', ''))
        c0 = current_price
        clv = ((c0 - l0) - (h0 - c0)) / (h0 - l0) if h0 > l0 else 0.0
        cvd_strength = round(max(65.0, min(220.0, 100.0 + (clv * 35.0) + (max(-20.0, min(60.0, vol_ratio)) * 0.2))), 1)

    cvd_is_bullish = cvd_strength >= 100.0
    cvd_label = f"CVD {cvd_strength}% (매수 우위)" if cvd_is_bullish else f"CVD {cvd_strength}% (매도 우위)"

    obv_history = []
    acc_obv = 0
    if len(prices) >= 5:
        rev_prices = list(reversed(prices[:15]))
        for idx_p in range(1, len(rev_prices)):
            p_prev = int(rev_prices[idx_p-1]['closePrice'].replace(',', ''))
            p_curr = int(rev_prices[idx_p]['closePrice'].replace(',', ''))
            v_amt = int(rev_prices[idx_p].get('accumulatedTradingVolume', 0))
            if p_curr > p_prev: acc_obv += v_amt
            elif p_curr < p_prev: acc_obv -= v_amt
            obv_history.append(acc_obv)

    if obv_history and obv_history[-1] >= obv_history[0]:
        obv_trend = "우상향 지속"
        obv_label = "OBV 우상향 (누적 매집)"
        obv_is_bullish = True
    elif obv_history and len(obv_history) >= 3 and obv_history[-1] > obv_history[-3]:
        obv_trend = "지지 반등"
        obv_label = "OBV 지지선 반등"
        obv_is_bullish = True
    else:
        obv_trend = "수급 숨고르기"
        obv_label = "OBV 중립 횡보"
        obv_is_bullish = False

    return {
        'status': 'success',
        'ticker': ticker,
        'stockName': stock_name,
        'currentPrice': current_price,
        'prevClose': prev_close,
        'step1': {
            'market': 'KOSPI' if len(ticker) == 6 and ticker.startswith(('0', '1', '2')) else 'KOSDAQ',
            'per': per,
            'pbr': pbr,
            'foreignRate': foreign_rate,
            'score': fund_score,
            'grade': grade,
            'insight': step1_insight
        },
        'step2': {
            'news': news_items,
            'status': step2_status,
            'insight': step2_insight
        },
        'step3': {
            'peers': peers,
            'cycle': step3_cycle,
            'insight': step3_insight
        },
        'step4': {
            'foreignSum20d': foreign_sum_20d,
            'instSum20d': inst_sum_20d,
            'retailSum20d': retail_sum_20d,
            'foreignRate': foreign_rate,
            'verdict': verdict,
            'insight': step4_insight,
            'cvd': {
                'strength': cvd_strength,
                'label': cvd_label,
                'isBullish': cvd_is_bullish
            },
            'obv': {
                'trend': obv_trend,
                'label': obv_label,
                'isBullish': obv_is_bullish
            }
        },
        'step5': {
            'high52': high52,
            'low52': low52,
            'high52Drop': high52_drop,
            'low52Rise': low52_rise,
            'vol5d': round(vol_5d),
            'vol20d': round(vol_20d),
            'volRatio': vol_ratio,
            'maAlignment': align_status,
            'status': step5_status,
            'insight': step5_insight
        },
        'risk': {
            'shortTermRisk': short_risk,
            'midTermRisk': mid_risk,
            'counterArgument': counter_arg
        }
    }

@router.get('/stock/step-report/{ticker}')
def get_step_report(ticker: str):
    try:
        return fetch_5step_report_data(ticker)
    except Exception as e:
        logger.error(f'Step report error: {e}')
        return {'status': 'error', 'message': str(e)}
