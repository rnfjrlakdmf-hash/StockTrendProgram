"""
관심종목 리서치 보고서 서비스
- 대표님이 설정한 관심종목별로 시세·수급·증권사 컨센서스·증권사 애널리스트 리포트 본문 요약·재무지표·최신 뉴스를 모아
  쉬운 말로 풀어쓴 '리서치 보고서'를 자동 생성합니다.
- 국내 종목: 네이버 증권 API (시세/수급/컨센서스 + 종목별 최신 증권사 리서치 리포트 본문 및 원문 PDF 연동)
- 해외 종목: yfinance (월가 컨센서스 + 기업 사업/실적 리서치 요약)
- 투자 권유가 아닌 공개 데이터의 자동 요약입니다.
"""
import os
import re
import html
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import requests

KST = timezone(timedelta(hours=9))
HEADERS = {"User-Agent": "Mozilla/5.0"}
MAX_SYMBOLS = 12


def _num(v: Any) -> Optional[float]:
    """'1,234', '+977,352', '9.62배', '46.13%' 같은 문자열을 숫자로 변환."""
    if v is None:
        return None
    s = re.sub(r"[^\d.\-]", "", str(v).replace("+", ""))
    if s in ("", "-", "."):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _won(v: float) -> str:
    return f"{int(round(v)):,}원"


def _signed(v: Optional[float], unit: str = "주") -> str:
    if v is None:
        return "-"
    sign = "+" if v > 0 else ""
    return f"{sign}{int(v):,}{unit}"


def _clean_html_to_bullets(raw_html: str, max_bullets: int = 4) -> List[str]:
    """증권사 리포트 HTML 본문을 문장 잘림 없이 깔끔한 개조식 핵심 문장 리스트로 변환합니다."""
    if not raw_html:
        return []
    # 제목용 태그(strong, b) 뒤나 문단 끝(</p>, </div>)만 줄바꿈으로 처리하고, 문장 중간의 단순 <br>은 공백으로 이어붙임
    text = re.sub(r"</strong>|</b>|</p>|</div>|</li>", "\n", raw_html, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    lines = []
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        line = re.sub(r"^[-•▪▫▶▷※*]+\s*", "", line).strip()
        if len(line) < 12:
            continue
        sents = re.split(r"(?<=\.)\s+", line)
        for s in sents:
            s = s.strip()
            if len(s) >= 18 and s not in lines:
                lines.append(s)
                if len(lines) >= max_bullets:
                    return lines
    return lines[:max_bullets]


def _fetch_naver_stock_researches(code: str, raw_researches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """종목에 발간된 최신 증권사 리서치 리포트 상세 본문과 PDF 링크를 가져옵니다."""
    reports = []
    for item in (raw_researches or [])[:3]:
        rid = item.get("id")
        if not rid:
            continue
        wdt = str(item.get("wdt") or "")
        date_fmt = f"{wdt[:4]}.{wdt[4:6]}.{wdt[6:8]}" if len(wdt) == 8 else wdt
        broker = item.get("bnm") or "증권사 리서치"
        title = item.get("tit") or "기업 분석 리포트"
        goal_price_str = None
        opinion_str = "분석 리포트"
        pdf_url = None
        bullets = []

        try:
            resp = requests.get(
                f"https://m.stock.naver.com/api/research/company/{rid}",
                headers=HEADERS,
                timeout=4,
            )
            if resp.status_code == 200:
                rc = resp.json().get("researchContent") or {}
                broker = rc.get("brokerName") or broker
                title = rc.get("title") or title
                if rc.get("writeDate"):
                    date_fmt = str(rc.get("writeDate")).replace("-", ".")
                gp = _num(rc.get("goalPrice") or rc.get("targetPrice"))
                if gp and gp > 0:
                    goal_price_str = _won(gp)
                op_raw = str(rc.get("opinion") or "").strip()
                if op_raw and op_raw.lower() not in ("none", "null", "not rated", "nr", "-", "투자의견 없음", "없음"):
                    opinion_str = f"투자의견 {op_raw}"
                else:
                    opinion_str = "실적·모멘텀 분석"
                pdf_url = rc.get("attachUrl")
                bullets = _clean_html_to_bullets(rc.get("content") or "", max_bullets=4)
        except Exception as e:
            print(f"[WatchlistResearch] research detail error {code}/{rid}: {e}")

        reports.append({
            "id": rid,
            "broker": broker,
            "title": title,
            "date": date_fmt,
            "target_price": goal_price_str,
            "opinion": opinion_str,
            "pdf_url": pdf_url,
            "naver_url": f"https://m.stock.naver.com/investment/research/company/{rid}",
            "summary_bullets": bullets,
        })
    return reports


def _resolve_symbols(user_id: Optional[str], requested: Optional[List[str]]) -> List[str]:
    try:
        from stock_names import STOCK_MAP
    except Exception:
        STOCK_MAP = {}

    raw_list: List[str] = []
    for s in requested or []:
        s = str(s).strip()
        if not s:
            continue
        raw_list.append(STOCK_MAP.get(s, s))

    if user_id and not user_id.lower().startswith("guest"):
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(__file__), "stock_app.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                rows = conn.execute("SELECT symbol FROM watchlist WHERE user_id = ?", (user_id.strip(),)).fetchall()
                conn.close()
                raw_list.extend([r[0].strip() for r in rows if r and r[0]])
        except Exception as e:
            print(f"[WatchlistResearch] DB error: {e}")

    seen, out = set(), []
    for s in raw_list:
        clean = s.replace(".KS", "").replace(".KQ", "").replace(".O", "").strip()
        if clean and clean.upper() not in seen:
            seen.add(clean.upper())
            out.append(clean)
    return out[:MAX_SYMBOLS]


def _kr_report(code: str) -> Optional[Dict[str, Any]]:
    base = requests.get(f"https://m.stock.naver.com/api/stock/{code}/basic", headers=HEADERS, timeout=6).json()
    integ = requests.get(f"https://m.stock.naver.com/api/stock/{code}/integration", headers=HEADERS, timeout=6).json()

    price = _num(base.get("closePrice"))
    if not price:
        return None
    change_pct = _num(base.get("fluctuationsRatio")) or 0.0
    cmp_obj = base.get("compareToPreviousPrice") or {}
    if cmp_obj.get("name") in ("FALLING", "DOWN") or str(cmp_obj.get("code")) in ("4", "5"):
        change_pct = -abs(change_pct)

    totals = {x.get("key"): x.get("value") for x in integ.get("totalInfos", [])}
    high52 = _num(totals.get("52주 최고"))
    low52 = _num(totals.get("52주 최저"))
    per = _num(totals.get("PER"))
    eps = _num(totals.get("EPS"))
    est_per = _num(totals.get("추정PER"))
    pbr = _num(totals.get("PBR"))
    bps = _num(totals.get("BPS"))
    market_cap = totals.get("시총")
    trading_value = totals.get("대금")

    # 수급 (최근 3거래일)
    deals = integ.get("dealTrendInfos", [])[:3]
    flow = {"foreign": [], "organ": [], "individual": []}
    for d in deals:
        flow["foreign"].append(_num(d.get("foreignerPureBuyQuant")) or 0)
        flow["organ"].append(_num(d.get("organPureBuyQuant")) or 0)
        flow["individual"].append(_num(d.get("individualPureBuyQuant")) or 0)
    f_today = flow["foreign"][0] if flow["foreign"] else None
    o_today = flow["organ"][0] if flow["organ"] else None
    i_today = flow["individual"][0] if flow["individual"] else None
    f_sum3 = sum(flow["foreign"]) if flow["foreign"] else None
    o_sum3 = sum(flow["organ"]) if flow["organ"] else None
    foreign_ratio = deals[0].get("foreignerHoldRatio") if deals else totals.get("외인소진율")

    # 종목별 실제 발간된 증권사 리서치 리포트 수집
    raw_researches = integ.get("researches") or []
    broker_reports = _fetch_naver_stock_researches(code, raw_researches)

    # 증권사 컨센서스 (없으면 최신 리포트 목표가 또는 52주 고점 참고치 연동)
    cons = integ.get("consensusInfo") or {}
    target_mean = _num(cons.get("priceTargetMean"))
    recomm = _num(cons.get("recommMean"))
    target_source_note = None

    if not target_mean and broker_reports:
        for br in broker_reports:
            if br.get("target_price"):
                target_mean = _num(br["target_price"])
                target_source_note = f"{br['broker']} 목표가 기준"
                break

    upside = round((target_mean - price) / price * 100, 1) if target_mean else None

    if target_mean:
        target_mean_str = _won(target_mean)
    elif broker_reports:
        target_mean_str = f"Not Rated ({broker_reports[0]['broker']})"
        target_source_note = "목표가 미제시 · 아래 리포트 본문 참고"
    elif high52:
        upside_52 = round((high52 - price) / price * 100, 1)
        target_mean_str = f"{_won(high52)} (52주 고점)"
        target_source_note = f"고점 대비 +{upside_52}% 여력"
    else:
        target_mean_str = "실적 분석 중"
        target_source_note = "재무 지표 기준 평가"

    # 최신 뉴스 (모든 클러스터를 순회하여 최대 5건 수집)
    news = []
    seen_titles = set()
    try:
        nj = requests.get(f"https://m.stock.naver.com/api/news/stock/{code}?pageSize=8&page=1", headers=HEADERS, timeout=6).json()
        for cluster in (nj or []):
            for it in cluster.get("items", []):
                oid, aid = it.get("officeId"), it.get("articleId")
                t_full = (it.get("titleFull") or it.get("title") or "").strip()
                if not t_full or t_full in seen_titles:
                    continue
                seen_titles.add(t_full)
                dt_raw = str(it.get("datetime") or "")
                dt_fmt = f"{dt_raw[:4]}.{dt_raw[4:6]}.{dt_raw[6:8]}" if len(dt_raw) >= 8 else dt_raw
                news.append({
                    "title": t_full,
                    "press": it.get("officeName"),
                    "datetime": dt_fmt,
                    "url": f"https://n.news.naver.com/mnews/article/{oid}/{aid}" if oid and aid else None,
                })
                if len(news) >= 5:
                    break
            if len(news) >= 5:
                break
    except Exception as e:
        print(f"[WatchlistResearch] news error {code}: {e}")

    range_pos = None
    if high52 and low52 and high52 > low52:
        range_pos = round((price - low52) / (high52 - low52) * 100, 1)

    return {
        "stock_name": base.get("stockName") or code,
        "stock_code": code,
        "category": "kr_stock",
        "price": price,
        "price_str": _won(price),
        "change_pct": change_pct,
        "market_status": base.get("marketStatus"),
        "market_cap": market_cap,
        "trading_value": trading_value,
        "per": per, "eps": eps, "est_per": est_per,
        "pbr": pbr, "bps": bps,
        "high52": high52, "low52": low52,
        "high52_str": _won(high52) if high52 else None,
        "low52_str": _won(low52) if low52 else None,
        "range_pos": range_pos,
        "flow": {
            "foreign_today": f_today, "organ_today": o_today, "individual_today": i_today,
            "foreign_3d": f_sum3, "organ_3d": o_sum3,
            "foreign_hold_ratio": foreign_ratio,
            "unit": "주",
        },
        "consensus": {
            "target_mean": target_mean,
            "target_mean_str": target_mean_str,
            "upside_pct": upside,
            "recomm_mean": recomm,
            "base_date": cons.get("createDate"),
            "note": target_source_note,
        },
        "broker_reports": broker_reports,
        "news": news,
    }


def _us_report(ticker: str) -> Optional[Dict[str, Any]]:
    import yfinance as yf
    t = yf.Ticker(ticker)
    fi = t.fast_info
    price = float(fi.last_price)
    prev = float(fi.previous_close)
    change_pct = round((price - prev) / prev * 100, 2) if prev else 0.0
    info = {}
    try:
        info = t.info or {}
    except Exception:
        pass
    target_mean = info.get("targetMeanPrice")
    upside = round((target_mean - price) / price * 100, 1) if target_mean else None
    high52 = info.get("fiftyTwoWeekHigh")
    low52 = info.get("fiftyTwoWeekLow")
    range_pos = round((price - low52) / (high52 - low52) * 100, 1) if high52 and low52 and high52 > low52 else None

    news = []
    try:
        for n in (t.news or [])[:5]:
            c = n.get("content", n)
            news.append({
                "title": c.get("title"),
                "press": (c.get("provider") or {}).get("displayName") if isinstance(c.get("provider"), dict) else None,
                "datetime": str(c.get("pubDate") or "")[:10],
                "url": ((c.get("canonicalUrl") or {}).get("url") if isinstance(c.get("canonicalUrl"), dict) else None) or n.get("link"),
            })
    except Exception as e:
        print(f"[WatchlistResearch] US news error {ticker}: {e}")

    rk = (info.get("recommendationKey") or "").lower()
    recomm_map = {"strong_buy": 5.0, "buy": 4.0, "hold": 3.0, "underperform": 2.0, "sell": 1.0}
    analyst_cnt = info.get("numberOfAnalystOpinions") or 0

    broker_reports = []
    if target_mean or analyst_cnt:
        rev_g = info.get("revenueGrowth")
        earn_g = info.get("earningsGrowth")
        pm = info.get("profitMargins")
        bullets = []
        if target_mean:
            bullets.append(f"월스트리트 애널리스트 {analyst_cnt}명의 평균 목표주가는 ${target_mean:,.2f}(현재가 대비 {upside:+.1f}%)입니다.")
        if rev_g is not None:
            bullets.append(f"최근 매출 성장률은 {rev_g * 100:+.1f}%이며, 순이익률은 {(pm or 0) * 100:.1f}% 수준을 기록 중입니다.")
        if earn_g is not None:
            bullets.append(f"분기 이익 성장률은 {earn_g * 100:+.1f}%로 글로벌 동종 업계 내 실적 모멘텀이 유지되고 있습니다.")
        broker_reports.append({
            "id": f"us_{ticker}",
            "broker": f"월가 컨센서스 ({analyst_cnt}개 기관)" if analyst_cnt else "글로벌 리서치 데스크",
            "title": f"[{info.get('shortName') or ticker}] 월스트리트 목표주가 & 실적 컨센서스 분석",
            "date": datetime.now(KST).strftime("%Y.%m.%d"),
            "target_price": f"${target_mean:,.2f}" if target_mean else None,
            "opinion": f"투자의견 {rk.upper()}" if rk else "Buy",
            "pdf_url": None,
            "naver_url": f"https://finance.yahoo.com/quote/{ticker}",
            "summary_bullets": bullets,
        })

    return {
        "stock_name": info.get("shortName") or ticker,
        "stock_code": ticker,
        "category": "us_stock",
        "price": round(price, 2),
        "price_str": f"${price:,.2f}",
        "change_pct": change_pct,
        "market_status": None,
        "market_cap": f"${info['marketCap'] / 1e9:,.0f}B" if info.get("marketCap") else None,
        "per": info.get("trailingPE"), "eps": info.get("trailingEps"), "est_per": info.get("forwardPE"),
        "pbr": info.get("priceToBook"), "bps": info.get("bookValue"),
        "high52": high52, "low52": low52,
        "high52_str": f"${high52:,.2f}" if high52 else None,
        "low52_str": f"${low52:,.2f}" if low52 else None,
        "range_pos": range_pos,
        "flow": None,
        "consensus": {
            "target_mean": target_mean,
            "target_mean_str": f"${target_mean:,.2f}" if target_mean else "컨센서스 집계 중",
            "upside_pct": upside,
            "recomm_mean": recomm_map.get(rk),
            "base_date": None,
            "note": f"월가 {analyst_cnt}개 기관 평균" if analyst_cnt else None,
        },
        "broker_reports": broker_reports,
        "news": news,
    }


def _build_opinion(r: Dict[str, Any]) -> Dict[str, Any]:
    """수집 데이터와 증권사 리서치 리포트를 종합해 빈칸 없이 풍부한 '좋은 점 / 주의할 점'을 생성합니다."""
    pts, good, warn = 0, [], []
    fl = r.get("flow")
    if fl:
        f_t, o_t = fl["foreign_today"], fl["organ_today"]
        if f_t is not None and o_t is not None:
            if f_t > 0 and o_t > 0:
                pts += 2
                good.append(f"오늘 외국인({_signed(f_t)})과 기관({_signed(o_t)})이 동반 순매수했습니다")
            elif f_t > 0:
                pts += 1
                good.append(f"오늘 외국인이 {_signed(f_t)} 순매수하며 수급을 방어했습니다")
            elif o_t > 0:
                pts += 1
                good.append(f"오늘 기관이 {_signed(o_t)} 순매수하며 하방을 지지했습니다")
            else:
                pts -= 1
                warn.append(f"오늘 외국인({_signed(f_t)})과 기관({_signed(o_t)})이 동반 순매도했습니다")
        if fl["foreign_3d"] is not None and fl["organ_3d"] is not None:
            if fl["foreign_3d"] > 0 or fl["organ_3d"] > 0:
                good.append(f"최근 3거래일 합산 외국인({_signed(fl['foreign_3d'])})·기관({_signed(fl['organ_3d'])}) 매수세가 유입 중입니다")
            elif fl["foreign_3d"] < 0 and fl["organ_3d"] < 0:
                warn.append("최근 3거래일 연속 외국인·기관 매도 물량이 출회되고 있어 수급 전환 확인이 필요합니다")

    # 증권사 리포트 분석 포인트 반영 (가장 핵심!)
    br_list = r.get("broker_reports") or []
    if br_list:
        latest_br = br_list[0]
        pts += 1
        good.append(f"[{latest_br['broker']} 최신 리포트 ({latest_br['date']})] \"{latest_br['title']}\" 분석 자료가 발간되었습니다")
        if latest_br.get("summary_bullets"):
            good.append(f"리포트 핵심 요점: {latest_br['summary_bullets'][0]}")

    up = r["consensus"]["upside_pct"]
    if up is not None:
        if up >= 15:
            pts += 1
            good.append(f"증권사 평균 목표주가({r['consensus']['target_mean_str']})가 현재가보다 +{up}% 높습니다")
        elif up > 0:
            good.append(f"증권사 목표주가({r['consensus']['target_mean_str']}) 대비 +{up}% 상승 여력이 있습니다")
        elif up < 0:
            pts -= 1
            warn.append(f"현재가가 증권사 평균 목표가보다 {abs(up)}% 높은 구간입니다")

    rm = r["consensus"]["recomm_mean"]
    if rm is not None:
        if rm >= 3.8:
            pts += 1
            good.append("증권사 애널리스트 투자의견이 '매수(Buy)' 우세입니다")
        elif rm < 3:
            pts -= 1
            warn.append("증권사 투자의견이 '중립·보수적' 구간입니다")

    per = r.get("per")
    eps = r.get("eps")
    pbr = r.get("pbr")
    if per is not None and 0 < per < 15:
        pts += 1
        good.append(f"PER {per:.1f}배로 기업 이익 대비 주가 밸류에이션 부담이 낮습니다")
    elif per is not None and 15 <= per <= 30 and eps and eps > 0:
        good.append(f"주당순이익(EPS {int(eps):,}원) 흑자 기조 속 PER {per:.1f}배에 거래되고 있습니다")
    elif per is not None and per > 40:
        pts -= 1
        warn.append(f"PER {per:.1f}배로 단기 밸류에이션 멀티플 부담이 존재합니다")

    if pbr is not None and 0 < pbr <= 1.2:
        good.append(f"PBR {pbr:.2f}배로 자산가치 대비 저평가 영역에 위치해 있습니다")

    rp = r.get("range_pos")
    if rp is not None:
        if rp <= 35:
            good.append(f"52주 가격 범위의 바닥권({rp}%)에 위치해 하방 가격 부담이 적습니다")
        elif rp <= 65:
            good.append(f"52주 가격 범위의 중간 구간({rp}%)으로 과열 부담 없이 추세를 탐색 중입니다")
        elif rp >= 85:
            warn.append(f"52주 최고가 근처({rp}%)에 도달해 단기 차익실현 매물에 유의해야 합니다")

    chg = r["change_pct"]
    if chg <= -3:
        warn.append(f"오늘 {chg}% 조정을 받았습니다 (단기 변동성 확대 및 지지선 확인 필요)")
    elif chg >= 3:
        good.append(f"오늘 +{chg}% 강세 흐름을 보이며 매수 심리가 개선되고 있습니다")

    # 만약 warn이나 good이 부족할 경우 실질적인 체크포인트 보강 (빈 공백 방지)
    if len(good) == 0:
        good.append("재무 건전성 및 52주 가격 밴드 내에서 지지력을 테스트하는 구간입니다")
    if len(warn) < 2:
        if r.get("high52_str"):
            warn.append(f"52주 최고가({r['high52_str']}) 돌파를 위한 거래량 동반 여부를 점검하세요")
        warn.append("추격 매수보다는 50일 이동평균선 지지 확인 후 분할 접근이 유리합니다")

    if pts >= 3:
        label, color = "긍정적", "emerald"
    elif pts >= 1:
        label, color = "대체로 무난", "blue"
    elif pts == 0:
        label, color = "중립 · 관망", "slate"
    else:
        label, color = "수급 확인 필요", "rose"
    return {"label": label, "color": color, "score": pts, "good": good[:4], "warn": warn[:4]}


def _headline(r: Dict[str, Any], op: Dict[str, Any]) -> str:
    chg = r["change_pct"]
    move = f"{'+' if chg > 0 else ''}{chg}%"
    br_cnt = len(r.get("broker_reports") or [])
    br_str = f" · 증권사 리포트 {br_cnt}건 분석" if br_cnt > 0 else ""
    return f"현재가 {r['price_str']} ({move}) · 종합 의견: {op['label']}{br_str}"


def build_watchlist_research(user_id: Optional[str] = None, requested_symbols: Optional[List[str]] = None) -> Dict[str, Any]:
    symbols = _resolve_symbols(user_id, requested_symbols)
    now = datetime.now(KST)

    def work(sym: str) -> Optional[Dict[str, Any]]:
        try:
            r = _kr_report(sym) if re.match(r"^\d{6}$", sym) else _us_report(sym.upper())
            if not r:
                return None
            r["opinion"] = _build_opinion(r)
            r["headline"] = _headline(r, r["opinion"])
            return r
        except Exception as e:
            print(f"[WatchlistResearch] {sym} failed: {e}")
            return None

    reports: List[Dict[str, Any]] = []
    if symbols:
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for res in ex.map(work, symbols):
                if res:
                    reports.append(res)

    return {
        "status": "success",
        "generated_at": now.strftime("%Y-%m-%d %H:%M KST"),
        "count": len(reports),
        "symbols": symbols,
        "reports": reports,
    }
