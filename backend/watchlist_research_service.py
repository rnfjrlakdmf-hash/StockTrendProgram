"""
관심종목 리서치 보고서 서비스
- 대표님이 설정한 관심종목별로 시세·수급·증권사 컨센서스·재무지표·최신 뉴스를 모아
  쉬운 말로 풀어쓴 '리서치 보고서'를 자동 생성합니다.
- 국내 종목: 네이버 증권 API / 해외 종목: yfinance
- 투자 권유가 아닌 공개 데이터의 자동 요약입니다.
"""
import os
import re
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

    totals = {x.get("key"): x.get("value") for x in integ.get("totalInfos", [])}
    high52 = _num(totals.get("52주 최고"))
    low52 = _num(totals.get("52주 최저"))
    per = _num(totals.get("PER"))
    eps = _num(totals.get("EPS"))
    est_per = _num(totals.get("추정PER"))
    market_cap = totals.get("시총")

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
    foreign_ratio = deals[0].get("foreignerHoldRatio") if deals else None

    # 증권사 컨센서스
    cons = integ.get("consensusInfo") or {}
    target_mean = _num(cons.get("priceTargetMean"))
    recomm = _num(cons.get("recommMean"))
    upside = round((target_mean - price) / price * 100, 1) if target_mean else None

    # 최신 뉴스
    news = []
    try:
        nj = requests.get(f"https://m.stock.naver.com/api/news/stock/{code}?pageSize=4&page=1", headers=HEADERS, timeout=6).json()
        for cluster in nj[:1]:
            for it in cluster.get("items", [])[:4]:
                oid, aid = it.get("officeId"), it.get("articleId")
                news.append({
                    "title": it.get("titleFull") or it.get("title"),
                    "press": it.get("officeName"),
                    "datetime": it.get("datetime"),
                    "url": f"https://n.news.naver.com/mnews/article/{oid}/{aid}" if oid and aid else None,
                })
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
        "per": per, "eps": eps, "est_per": est_per,
        "high52": high52, "low52": low52, "range_pos": range_pos,
        "flow": {
            "foreign_today": f_today, "organ_today": o_today, "individual_today": i_today,
            "foreign_3d": f_sum3, "organ_3d": o_sum3,
            "foreign_hold_ratio": foreign_ratio,
            "unit": "주",
        },
        "consensus": {
            "target_mean": target_mean,
            "target_mean_str": _won(target_mean) if target_mean else None,
            "upside_pct": upside,
            "recomm_mean": recomm,
            "base_date": cons.get("createDate"),
        },
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
        for n in (t.news or [])[:4]:
            c = n.get("content", n)
            news.append({
                "title": c.get("title"),
                "press": (c.get("provider") or {}).get("displayName") if isinstance(c.get("provider"), dict) else None,
                "datetime": c.get("pubDate"),
                "url": ((c.get("canonicalUrl") or {}).get("url") if isinstance(c.get("canonicalUrl"), dict) else None) or n.get("link"),
            })
    except Exception as e:
        print(f"[WatchlistResearch] US news error {ticker}: {e}")

    rk = (info.get("recommendationKey") or "").lower()
    recomm_map = {"strong_buy": 5.0, "buy": 4.0, "hold": 3.0, "underperform": 2.0, "sell": 1.0}
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
        "high52": high52, "low52": low52, "range_pos": range_pos,
        "flow": None,
        "consensus": {
            "target_mean": target_mean,
            "target_mean_str": f"${target_mean:,.2f}" if target_mean else None,
            "upside_pct": upside,
            "recomm_mean": recomm_map.get(rk),
            "base_date": None,
        },
        "news": news,
    }


def _build_opinion(r: Dict[str, Any]) -> Dict[str, Any]:
    """수집 데이터를 점수화해 '쉬운 말' 의견을 만든다 (투자 권유 아님)."""
    pts, good, warn = 0, [], []
    fl = r.get("flow")
    if fl:
        f_t, o_t = fl["foreign_today"], fl["organ_today"]
        if f_t is not None and o_t is not None:
            if f_t > 0 and o_t > 0:
                pts += 2; good.append("오늘 외국인과 기관이 함께 순매수했습니다")
            elif f_t > 0 or o_t > 0:
                pts += 1; good.append("외국인 또는 기관 한쪽이 순매수했습니다")
            else:
                pts -= 1; warn.append("오늘 외국인과 기관이 모두 순매도했습니다")
        if fl["foreign_3d"] is not None and fl["foreign_3d"] < 0 and fl["organ_3d"] is not None and fl["organ_3d"] < 0:
            warn.append("최근 3거래일 합계로도 외국인·기관 모두 팔고 있습니다")

    up = r["consensus"]["upside_pct"]
    if up is not None:
        if up >= 15:
            pts += 1; good.append(f"증권사 평균 목표가가 현재가보다 {up}% 높습니다")
        elif up < 0:
            pts -= 1; warn.append(f"현재가가 증권사 평균 목표가보다 {abs(up)}% 높습니다")

    rm = r["consensus"]["recomm_mean"]
    if rm is not None:
        if rm >= 4:
            pts += 1; good.append("증권사 투자의견이 '매수' 우세입니다")
        elif rm < 3:
            pts -= 1; warn.append("증권사 투자의견이 '매도·중립' 쪽입니다")

    per = r.get("per")
    if per is not None and 0 < per < 12:
        pts += 1; good.append(f"PER {per:.1f}배로 이익 대비 주가가 낮은 편입니다")
    elif per is not None and per > 40:
        pts -= 1; warn.append(f"PER {per:.1f}배로 이익 대비 주가가 높은 편입니다")

    rp = r.get("range_pos")
    if rp is not None:
        if rp <= 30:
            good.append(f"52주 가격 범위의 아래쪽({rp}%)에 있어 부담이 적은 구간입니다")
        elif rp >= 90:
            warn.append(f"52주 가격 범위의 꼭대기 근처({rp}%)라 단기 과열에 주의가 필요합니다")

    chg = r["change_pct"]
    if chg <= -3:
        warn.append(f"오늘 {chg}% 크게 하락했습니다 (변동성 주의)")
    elif chg >= 3:
        good.append(f"오늘 {chg}% 강세입니다")

    if pts >= 3:
        label, color = "긍정적", "emerald"
    elif pts >= 1:
        label, color = "대체로 무난", "blue"
    elif pts == 0:
        label, color = "중립", "slate"
    else:
        label, color = "주의 필요", "rose"
    return {"label": label, "color": color, "score": pts, "good": good, "warn": warn}


def _headline(r: Dict[str, Any], op: Dict[str, Any]) -> str:
    chg = r["change_pct"]
    move = f"{'+' if chg > 0 else ''}{chg}%"
    return f"현재가 {r['price_str']} ({move}) · 종합 의견: {op['label']}"


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
            results = list(ex.map(work, symbols))
        reports = [r for r in results if r]

    return {
        "status": "success",
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "requested_count": len(symbols),
        "count": len(reports),
        "reports": reports,
        "disclaimer": "공개된 시세·수급·컨센서스·뉴스를 자동으로 요약한 참고 자료이며, 투자 권유가 아닙니다. 최종 판단과 책임은 투자자 본인에게 있습니다.",
    }
