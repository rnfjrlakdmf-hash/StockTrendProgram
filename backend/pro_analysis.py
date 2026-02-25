"""
Pro Analysis Module — 전문가 분석 도구
퀀트 스코어카드, 재무 건전성 스캐너, 동종업계 비교
"""

import json
import urllib.parse
from typing import Dict, Any, List


def get_quant_scorecard(symbol: str) -> Dict[str, Any]:
    """
    퀀트 스코어카드 — 5축 팩터 분석
    가치(Value), 성장(Growth), 모멘텀(Momentum), 수익성(Quality), 안정성(Stability)
    """
    try:
        import yfinance as yf

        symbol = urllib.parse.unquote(symbol)
        ticker_sym = symbol
        if symbol.isdigit() and len(symbol) == 6:
            ticker_sym = f"{symbol}.KS"

        t = yf.Ticker(ticker_sym)
        info = t.info or {}
        hist = t.history(period="6mo")

        # 1. Value (가치)
        per = info.get("trailingPE") or info.get("forwardPE") or 0
        pbr = info.get("priceToBook") or 0
        value_score = 50
        if per > 0:
            if per < 10: value_score = 90
            elif per < 15: value_score = 75
            elif per < 25: value_score = 55
            elif per < 40: value_score = 35
            else: value_score = 15
        if pbr > 0 and pbr < 1:
            value_score = min(100, value_score + 15)

        # 2. Growth (성장)
        revenue_growth = info.get("revenueGrowth") or 0
        earnings_growth = info.get("earningsGrowth") or 0
        growth_score = 50
        avg_growth = (revenue_growth + earnings_growth) / 2 * 100
        if avg_growth > 30: growth_score = 90
        elif avg_growth > 15: growth_score = 75
        elif avg_growth > 5: growth_score = 60
        elif avg_growth > 0: growth_score = 45
        elif avg_growth > -10: growth_score = 30
        else: growth_score = 15

        # 3. Momentum (모멘텀)
        momentum_score = 50
        if not hist.empty and len(hist) > 20:
            price_now = hist['Close'].iloc[-1]
            price_3m = hist['Close'].iloc[max(0, len(hist) - 63)]
            ret_3m = ((price_now - price_3m) / price_3m) * 100
            if ret_3m > 20: momentum_score = 90
            elif ret_3m > 10: momentum_score = 75
            elif ret_3m > 0: momentum_score = 55
            elif ret_3m > -10: momentum_score = 35
            else: momentum_score = 15

        # 4. Quality (수익성)
        roe = info.get("returnOnEquity") or 0
        margin = info.get("operatingMargins") or info.get("profitMargins") or 0
        quality_score = 50
        roe_pct = roe * 100
        margin_pct = margin * 100
        if roe_pct > 20 and margin_pct > 15: quality_score = 90
        elif roe_pct > 12 and margin_pct > 8: quality_score = 70
        elif roe_pct > 5: quality_score = 50
        elif roe_pct > 0: quality_score = 35
        else: quality_score = 15

        # 5. Stability (안정성)
        stability_score = 50
        debt_equity = info.get("debtToEquity") or 0
        beta = info.get("beta") or 1
        if debt_equity < 50 and beta < 1: stability_score = 85
        elif debt_equity < 100 and beta < 1.3: stability_score = 65
        elif debt_equity < 200: stability_score = 45
        else: stability_score = 25

        total_score = round((value_score + growth_score + momentum_score + quality_score + stability_score) / 5)

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "total_score": total_score,
            "factors": {
                "value": {"score": value_score, "label": "가치", "metrics": {"PER": round(per, 1), "PBR": round(pbr, 2)}},
                "growth": {"score": growth_score, "label": "성장", "metrics": {"매출성장률": f"{revenue_growth*100:.1f}%", "이익성장률": f"{earnings_growth*100:.1f}%"}},
                "momentum": {"score": momentum_score, "label": "모멘텀", "metrics": {"beta": round(beta, 2)}},
                "quality": {"score": quality_score, "label": "수익성", "metrics": {"ROE": f"{roe_pct:.1f}%", "영업이익률": f"{margin_pct:.1f}%"}},
                "stability": {"score": stability_score, "label": "안정성", "metrics": {"부채비율": f"{debt_equity:.0f}%", "Beta": round(beta, 2)}}
            },
            "grade": "S" if total_score >= 85 else "A" if total_score >= 70 else "B" if total_score >= 55 else "C" if total_score >= 40 else "D",
            "disclaimer": "본 데이터는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }
    except Exception as e:
        print(f"Quant scorecard error: {e}")
        return {"symbol": symbol, "total_score": 0, "error": str(e)}


def get_financial_health(symbol: str) -> Dict[str, Any]:
    """
    재무 건전성 스캐너 — Altman Z-Score + Piotroski F-Score + 핵심 비율
    """
    try:
        import yfinance as yf

        symbol = urllib.parse.unquote(symbol)
        ticker_sym = symbol
        if symbol.isdigit() and len(symbol) == 6:
            ticker_sym = f"{symbol}.KS"

        t = yf.Ticker(ticker_sym)
        info = t.info or {}
        bs = t.balance_sheet
        fin = t.financials
        cf = t.cashflow

        def safe(df, key, col=0):
            try:
                return float(df.loc[key].iloc[col]) if key in df.index else 0
            except:
                return 0

        total_assets = safe(bs, "Total Assets") or 1
        total_debt = safe(bs, "Total Debt")
        total_equity = safe(bs, "Stockholders Equity") or 1
        current_assets = safe(bs, "Current Assets")
        current_liabilities = safe(bs, "Current Liabilities") or 1
        net_income = safe(fin, "Net Income")
        operating_income = safe(fin, "Operating Income")
        revenue = safe(fin, "Total Revenue") or 1
        operating_cf = safe(cf, "Operating Cash Flow") if cf is not None and not cf.empty else 0
        market_cap = info.get("marketCap") or 0

        # Altman Z-Score
        working_capital = current_assets - current_liabilities
        retained_earnings = safe(bs, "Retained Earnings")
        ebit = operating_income

        z1 = (working_capital / total_assets) * 1.2
        z2 = (retained_earnings / total_assets) * 1.4
        z3 = (ebit / total_assets) * 3.3
        z4 = (market_cap / (total_debt or 1)) * 0.6
        z5 = (revenue / total_assets) * 1.0
        z_score = round(z1 + z2 + z3 + z4 + z5, 2)

        if z_score > 2.99: z_zone, z_color = "안전", "green"
        elif z_score > 1.81: z_zone, z_color = "주의", "yellow"
        else: z_zone, z_color = "위험", "red"

        # Piotroski F-Score
        f_score = 0
        f_details = []

        if net_income > 0: f_score += 1; f_details.append("✅ 순이익 흑자")
        else: f_details.append("❌ 순이익 적자")

        if operating_cf > 0: f_score += 1; f_details.append("✅ 영업현금흐름 양수")
        else: f_details.append("❌ 영업현금흐름 음수")

        roa = net_income / total_assets
        if roa > 0: f_score += 1; f_details.append(f"✅ ROA 양수 ({roa*100:.1f}%)")
        else: f_details.append(f"❌ ROA 음수 ({roa*100:.1f}%)")

        if operating_cf > net_income: f_score += 1; f_details.append("✅ 현금흐름 > 순이익")
        else: f_details.append("❌ 현금흐름 < 순이익")

        debt_ratio = total_debt / total_assets * 100
        if debt_ratio < 50: f_score += 1; f_details.append(f"✅ 부채비율 양호 ({debt_ratio:.0f}%)")
        else: f_details.append(f"❌ 부채비율 높음 ({debt_ratio:.0f}%)")

        current_ratio = current_assets / current_liabilities
        if current_ratio > 1: f_score += 1; f_details.append(f"✅ 유동비율 양호 ({current_ratio:.1f})")
        else: f_details.append(f"❌ 유동비율 부족 ({current_ratio:.1f})")

        gross_margin = info.get("grossMargins", 0) * 100
        if gross_margin > 20: f_score += 1; f_details.append(f"✅ 매출총이익률 양호 ({gross_margin:.1f}%)")
        else: f_details.append(f"❌ 매출총이익률 낮음 ({gross_margin:.1f}%)")

        asset_turnover = revenue / total_assets
        if asset_turnover > 0.5: f_score += 1; f_details.append(f"✅ 자산회전율 양호 ({asset_turnover:.2f})")
        else: f_details.append(f"❌ 자산회전율 낮음 ({asset_turnover:.2f})")

        roe = (info.get("returnOnEquity") or 0) * 100
        if roe > 10: f_score += 1; f_details.append(f"✅ ROE 우수 ({roe:.1f}%)")
        else: f_details.append(f"❌ ROE 부족 ({roe:.1f}%)")

        ratios = {
            "PER": round(info.get("trailingPE") or 0, 1),
            "PBR": round(info.get("priceToBook") or 0, 2),
            "ROE": f"{roe:.1f}%",
            "부채비율": f"{debt_ratio:.0f}%",
            "유동비율": f"{current_ratio:.1f}",
            "영업이익률": f"{(info.get('operatingMargins', 0)*100):.1f}%",
            "매출총이익률": f"{gross_margin:.1f}%",
            "자산회전율": f"{asset_turnover:.2f}"
        }

        health_score = round((min(z_score, 5) / 5 * 40) + (f_score / 9 * 60))
        health_score = max(0, min(100, health_score))

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "health_score": health_score,
            "grade": "S" if health_score >= 85 else "A" if health_score >= 70 else "B" if health_score >= 55 else "C" if health_score >= 40 else "D",
            "z_score": {"value": z_score, "zone": z_zone, "color": z_color},
            "f_score": {"value": f_score, "max": 9, "details": f_details},
            "ratios": ratios,
            "disclaimer": "본 데이터는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }
    except Exception as e:
        print(f"Financial health error: {e}")
        return {"symbol": symbol, "health_score": 0, "error": str(e)}


def get_peer_comparison(symbols: List[str]) -> Dict[str, Any]:
    """
    동종업계 비교 분석 — 최대 5개 종목 핵심 지표 나란히 비교
    """
    try:
        import yfinance as yf

        results = []
        for sym in symbols[:5]:
            ticker_sym = sym.strip()
            if ticker_sym.isdigit() and len(ticker_sym) == 6:
                ticker_sym = f"{ticker_sym}.KS"

            try:
                t = yf.Ticker(ticker_sym)
                info = t.info or {}
                hist = t.history(period="3mo")

                price = 0
                change_3m = 0
                if not hist.empty:
                    price = round(float(hist['Close'].iloc[-1]), 2)
                    if len(hist) > 60:
                        p_3m = float(hist['Close'].iloc[-63])
                        change_3m = round(((price - p_3m) / p_3m) * 100, 1)

                mc = info.get('marketCap', 0)
                results.append({
                    "symbol": sym.strip(),
                    "name": info.get("shortName") or info.get("longName") or sym,
                    "price": price,
                    "change_3m": change_3m,
                    "market_cap": mc,
                    "market_cap_display": f"{mc/1e12:.1f}조" if mc > 1e12 else f"{mc/1e8:.0f}억" if mc > 0 else "N/A",
                    "per": round(info.get("trailingPE") or info.get("forwardPE") or 0, 1),
                    "pbr": round(info.get("priceToBook") or 0, 2),
                    "roe": round((info.get("returnOnEquity") or 0) * 100, 1),
                    "operating_margin": round((info.get("operatingMargins") or 0) * 100, 1),
                    "revenue_growth": round((info.get("revenueGrowth") or 0) * 100, 1),
                    "dividend_yield": round((info.get("dividendYield") or 0) * 100, 2),
                    "debt_to_equity": round(info.get("debtToEquity") or 0, 0),
                    "beta": round(info.get("beta") or 0, 2),
                    "sector": info.get("sector", "N/A"),
                })
            except Exception as e:
                print(f"Peer compare error for {sym}: {e}")
                results.append({"symbol": sym, "name": sym, "error": str(e)})

        return {
            "data": results,
            "metrics_labels": {
                "per": "PER (배)", "pbr": "PBR (배)", "roe": "ROE (%)",
                "operating_margin": "영업이익률 (%)", "revenue_growth": "매출성장률 (%)",
                "dividend_yield": "배당수익률 (%)", "debt_to_equity": "부채비율 (%)",
                "beta": "베타", "change_3m": "3개월 수익률 (%)"
            },
            "disclaimer": "본 데이터는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }
    except Exception as e:
        print(f"Peer comparison error: {e}")
        return {"data": [], "error": str(e)}
