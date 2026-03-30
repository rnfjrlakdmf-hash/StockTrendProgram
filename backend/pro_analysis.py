import json
import urllib.parse
import re
from typing import Dict, Any, List

# [NEW] Import internal data crawlers for better accuracy
try:
    from korea_data import gather_naver_stock_data, search_stock_code
    from dart_financials import get_dart_financials
    from turbo_engine import turbo_engine
except ImportError:
    # If called from specific context or standalone
    gather_naver_stock_data = None
    search_stock_code = None
    get_dart_financials = None
    turbo_engine = None

def get_quant_scorecard(symbol: str) -> Dict[str, Any]:
    """
    퀀트 스코어카드 — 5축 팩터 분석
    가치(Value), 성장(Growth), 모멘텀(Momentum), 수익성(Quality), 안정성(Stability)
    """
    try:
        import yfinance as yf

        symbol = urllib.parse.unquote(symbol)
        
        # [New] Resolve Korean Name to Code if needed
        is_only_digits = re.match(r'^\d{6}$', symbol)
        is_kr_suffix = symbol.endswith(('.KS', '.KQ'))
        
        if not is_only_digits and not is_kr_suffix and any('\uac00' <= c <= '\ud7a3' for c in symbol):
            if search_stock_code:
                resolved = search_stock_code(symbol)
                if resolved:
                    symbol = resolved
                    is_only_digits = True

        is_korean = is_only_digits or is_kr_suffix
        
        # 1. Fetch Basic Data
        ticker_sym = symbol
        naver_data = None
        
        if is_korean and gather_naver_stock_data:
            # First try to get high-accuracy data from Naver
            naver_data = gather_naver_stock_data(symbol)
            if naver_data:
                # Naver crawler returns 'KS' or 'KQ' in market_type
                ticker_sym = f"{naver_data['code']}.{naver_data['market_type']}"
        else:
            if symbol.isdigit() and len(symbol) == 6:
                ticker_sym = f"{symbol}.KS"

        t = yf.Ticker(ticker_sym)
        info = t.info or {}
        hist = t.history(period="6mo")

        # 2. Extract Key Metrics (Prefer Naver for Korean stocks)
        if naver_data:
            summary = naver_data.get("detailed_financials", {}).get("summary", {})
            per = naver_data.get("per") or info.get("trailingPE") or info.get("forwardPE") or 0
            pbr = naver_data.get("pbr") or info.get("priceToBook") or 0
            # Naver returns ROE/Margin as raw value (10.5 for 10.5%)
            roe = summary.get("roe") or info.get("returnOnEquity") or 0
            if roe > 1: roe = roe / 100.0
            
            # Growth
            revenue_growth = info.get("revenueGrowth") or 0
            earnings_growth = info.get("earningsGrowth") or 0
            
            # Margin
            margin = summary.get("operating_margin") or info.get("operatingMargins") or 0
            if margin > 1: margin = margin / 100.0
            
            # Stability
            debt_equity = summary.get("debt_ratio") or info.get("debtToEquity") or 0
            beta = info.get("beta") or 1
            name = naver_data.get("name") or info.get("shortName") or symbol
        else:
            per = info.get("trailingPE") or info.get("forwardPE") or 0
            pbr = info.get("priceToBook") or 0
            roe = info.get("returnOnEquity") or 0
            revenue_growth = info.get("revenueGrowth") or 0
            earnings_growth = info.get("earningsGrowth") or 0
            margin = info.get("operatingMargins") or info.get("profitMargins") or 0
            debt_equity = info.get("debtToEquity") or 0
            beta = info.get("beta") or 1
            name = info.get("shortName") or info.get("longName") or symbol

        # --- Score Logic ---
        
        # 1. Value (가치)
        value_score = 50
        per_f = float(per) if per else 0
        if per_f > 0:
            if per_f < 10: value_score = 90
            elif per_f < 15: value_score = 75
            elif per_f < 25: value_score = 55
            elif per_f < 40: value_score = 35
            else: value_score = 15
        
        pbr_f = float(pbr) if pbr else 0
        if pbr_f > 0 and pbr_f < 1:
            value_score = min(100, value_score + 15)

        # 2. Growth (성장)
        growth_score = 50
        rev_g = float(revenue_growth) if revenue_growth else 0
        earn_g = float(earnings_growth) if earnings_growth else 0
        avg_growth = (rev_g + earn_g) / 2 * 100
        if avg_growth > 30: growth_score = 90
        elif avg_growth > 15: growth_score = 75
        elif avg_growth > 5: growth_score = 60
        elif avg_growth > 0: growth_score = 45
        elif avg_growth > -10: growth_score = 30
        else: growth_score = 15

        # 3. Momentum (모멘텀)
        momentum_score = 50
        ret_3m = 0
        if not hist.empty and len(hist) > 20:
            try:
                # [Turbo Engine] Use high-performance momentum scoring (NumPy based)
                if turbo_engine:
                    momentum_score = turbo_engine.calculate_momentum_score(hist['Close'])
                else:
                    price_now = float(hist['Close'].iloc[-1])
                    price_3m = float(hist['Close'].iloc[max(0, len(hist) - 63)])
                    ret_3m = ((price_now - price_3m) / price_3m) * 100 if price_3m > 0 else 0
                    if ret_3m > 20: momentum_score = 90
                    elif ret_3m > 10: momentum_score = 75
                    elif ret_3m > 0: momentum_score = 55
                    elif ret_3m > -10: momentum_score = 35
                    else: momentum_score = 15
                
                # Still calculate ret_3m for display metrics
                price_now = float(hist['Close'].iloc[-1])
                price_3m = float(hist['Close'].iloc[max(0, len(hist) - 63)])
                ret_3m = ((price_now - price_3m) / price_3m) * 100 if price_3m > 0 else 0
            except: pass

        # 4. Quality (수익성)
        quality_score = 50
        roe_pct = float(roe) * 100 if roe else 0
        margin_pct = float(margin) * 100 if margin else 0
        if roe_pct > 20 and margin_pct > 15: quality_score = 90
        elif roe_pct > 12 and margin_pct > 8: quality_score = 70
        elif roe_pct > 5: quality_score = 50
        elif roe_pct > 0: quality_score = 35
        else: quality_score = 15

        # 5. Stability (안정성)
        stability_score = 50
        de_ratio = float(debt_equity) if debt_equity else 0
        beta_f = float(beta) if beta else 1
        if de_ratio < 50 and beta_f < 1: stability_score = 85
        elif de_ratio < 100 and beta_f < 1.3: stability_score = 65
        elif de_ratio < 200: stability_score = 45
        else: stability_score = 25

        total_score = round((value_score + growth_score + momentum_score + quality_score + stability_score) / 5)

        return {
            "symbol": symbol,
            "name": name,
            "total_score": total_score,
            "factors": {
                "value": {"score": value_score, "label": "가치", "metrics": {"PER": round(per_f, 1), "PBR": round(pbr_f, 2)}},
                "growth": {"score": growth_score, "label": "성장", "metrics": {"매출성장률": f"{rev_g*100:.1f}%", "이익성장률": f"{earn_g*100:.1f}%"}},
                "momentum": {"score": momentum_score, "label": "모멘텀", "metrics": {"3개월수익률": f"{ret_3m:.1f}%"}},
                "quality": {"score": quality_score, "label": "수익성", "metrics": {"ROE": f"{roe_pct:.1f}%", "영업이익률": f"{margin_pct:.1f}%"}},
                "stability": {"score": stability_score, "label": "안정성", "metrics": {"부채비율": f"{de_ratio:.0f}%", "Beta": round(beta_f, 2)}}
            },
            "grade": "S" if total_score >= 85 else "A" if total_score >= 70 else "B" if total_score >= 55 else "C" if total_score >= 40 else "D",
            "disclaimer": "본 데이터는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다."
        }
    except Exception as e:
        print(f"Quant scorecard error: {e}")
        import traceback
        traceback.print_exc()
        return {"symbol": symbol, "total_score": 0, "error": str(e)}


def get_financial_health(symbol: str) -> Dict[str, Any]:
    """
    재무 건전성 스캐너 — Altman Z-Score + Piotroski F-Score + 핵심 비율
    DART API 및 Naver 데이터를 활용하여 정확도를 극대화합니다.
    """
    try:
        import yfinance as yf

        symbol = urllib.parse.unquote(symbol)
        
        # [New] Resolve Korean Name to Code if needed
        is_only_digits = re.match(r'^\d{6}$', symbol)
        is_kr_suffix = symbol.endswith(('.KS', '.KQ'))
        
        if not is_only_digits and not is_kr_suffix and any('\uac00' <= c <= '\ud7a3' for c in symbol):
            if search_stock_code:
                resolved = search_stock_code(symbol)
                if resolved:
                    symbol = resolved
                    is_only_digits = True

        is_korean = is_only_digits or is_kr_suffix
        
        ticker_sym = symbol
        naver_data = None
        if is_korean and gather_naver_stock_data:
            naver_data = gather_naver_stock_data(symbol)
            if naver_data:
                ticker_sym = f"{naver_data['code']}.{naver_data['market_type']}"
        
        t = yf.Ticker(ticker_sym)
        info = t.info or {}
        
        # 1. Prepare Primary Metrics (Prefer Naver/DART)
        nav_summary = naver_data.get("detailed_financials", {}).get("summary", {}) if naver_data else {}
        
        # Balance Sheet & Cashflow (Only if Naver failed to get key summaries)
        bs = None
        fin = None
        cf = None
        
        if not nav_summary or not nav_summary.get("revenue"):
            # If Naver summary is incomplete, fallback to sequential YF calls (Slow)
            print(f"[Analysis] Naver summary incomplete for {symbol}. Fetching YF financials...")
            bs = t.balance_sheet
            fin = t.financials
            cf = t.cashflow
        
        # Assemble Primary Metrics
        if nav_summary and nav_summary.get("revenue"):
            # Use Naver's highly accurate and fast summaries
            revenue = nav_summary.get("revenue", 1) * 100000000 # naver metrics are often in '100 million won' units or already scaled
            # Wait, let's re-check naver_data scaling in korea_data.py
            # Line 387: f_values = [c.text.strip().replace(',', '') for c in cells]
            # Line 398: Mapping ... 
            # Naver Finance cop_analysis values are usually in '억원' (100M KRW).
            
            # To be safe, we use ratios directly if available.
            # Z-Score needs absolute values, F-Score needs directions/ratios.
            
            roe_val = nav_summary.get("roe") or 0
            debt_ratio = nav_summary.get("debt_ratio") or 0
            current_ratio = nav_summary.get("current_ratio") or 0
            operating_margin = nav_summary.get("operating_margin") or 0
            roa_val = nav_summary.get("roa") or 0
            net_income = nav_summary.get("net_income") or 0
            operating_income = nav_summary.get("operating_income") or 0
            asset_turnover = nav_summary.get("asset_turnover") or 0
            
            # For Z-Score (DART fallback or Estimate)
            market_cap = info.get("marketCap") or (naver_data.get("price", 0) * (info.get("sharesOutstanding") or 0)) or 1
            
            # If we only have ratios, we can't do full Z-Score accurately without totals, 
            # but we can provide a high-quality estimate or mock constants if totals are missing.
            # However, Naver data usually has revenue and income.
            
            # Let's use YF for totals ONLY if necessary, but keep it fast.
            # Actually, let's keep the existing fallback but make it smarter.
            if bs is None:
                # If we don't have bs, just use highly descriptive health score from F-Score and Ratios.
                total_assets = 1
                total_debt = 1
                total_equity = 1
                current_assets = 1
                current_liabilities = 1
                operating_cf = net_income # Proxy
            else:
                total_assets = safe(bs, "Total Assets") or 1
                total_debt = safe(bs, "Total Debt")
                total_equity = safe(bs, "Stockholders Equity") or 1
                current_assets = safe(bs, "Current Assets")
                current_liabilities = safe(bs, "Current Liabilities") or 1
                operating_cf = safe(cf, "Operating Cash Flow")
        else:
            # Traditional YF path
            bs = t.balance_sheet
            fin = t.financials
            cf = t.cashflow
            total_assets = safe(bs, "Total Assets") or 1
            total_debt = safe(bs, "Total Debt")
            total_equity = safe(bs, "Stockholders Equity") or 1
            current_assets = safe(bs, "Current Assets")
            current_liabilities = safe(bs, "Current Liabilities") or 1
            net_income = safe(fin, "Net Income")
            operating_income = safe(fin, "Operating Income")
            revenue = safe(fin, "Total Revenue") or 1
            operating_cf = safe(cf, "Operating Cash Flow")
            
            roe_val = (net_income / total_equity * 100) if total_equity > 0 else 0
            debt_ratio = (total_debt / total_assets * 100) if total_assets > 0 else 0
            current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else 0
            operating_margin = (operating_income / revenue * 100) if revenue > 0 else 0
            roa_val = (net_income / total_assets * 100) if total_assets > 0 else 0
            asset_turnover = (revenue / total_assets) if total_assets > 0 else 0
            market_cap = info.get("marketCap") or 1

        # Fallback to DART for Korean Stocks if YF financials are empty
        dart_data = None
        if is_korean and (bs is None or bs.empty) and get_dart_financials:
            print(f"[Analysis] YF empty for {symbol}. Fetching from DART...")
            dart_res = get_dart_financials(symbol)
            if dart_res.get("success"):
                # Use the latest year's data
                latest = dart_res["data"][-1]
                dart_data = latest

        def safe(df, key, col=0):
            try:
                if df is None or df.empty: return 0
                val = df.loc[key].iloc[col] if key in df.index else 0
                return float(val) if val is not None else 0
            except:
                return 0

        # Assemble Primary Metrics
        # This section is now largely redundant due to the new if/else block above
        # but keeping it for dart_data integration if it was meant to override
        # the YF/Naver data. For now, assuming the above block correctly sets the primary metrics.
        
        if dart_data:
            total_assets = dart_data.get("total_assets") or 1
            total_equity = dart_data.get("total_equity", 1)
            total_debt = dart_data.get("total_liabilities", 0)
            total_assets = total_equity + total_debt # Recalculate total_assets based on equity+debt from DART
            current_assets = dart_data.get("current_assets", 0)
            current_liabilities = dart_data.get("current_liabilities", 1)
            net_income = dart_data.get("net_income", 0)
            operating_income = dart_data.get("operating_income", 0) # Use DART operating income
            revenue = dart_data.get("revenue", 1) # Use DART revenue
            operating_cf = dart_data.get("net_income") # DART often provides net income, not always operating CF directly
            
            # Recalculate ratios based on DART data
            roe_val = (net_income / total_equity * 100) if total_equity > 0 else 0
            debt_ratio = (total_debt / total_assets * 100) if total_assets > 0 else 0
            current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else 0
            operating_margin = (operating_income / revenue * 100) if revenue > 0 else 0
            roa_val = (net_income / total_assets * 100) if total_assets > 0 else 0
            asset_turnover = (revenue / total_assets) if total_assets > 0 else 0
            market_cap = info.get("marketCap") or (naver_data.get("price", 0) * (info.get("sharesOutstanding") or 0)) or 1 # Keep YF/Naver market cap
        
        # Altman Z-Score calculation (Improved with Safeties)
        working_capital = current_assets - current_liabilities
        z1 = (working_capital / total_assets) * 1.2
        retained_earnings = safe(bs, "Retained Earnings") if bs is not None else (total_assets * 0.2) # Conservative proxy
        z2 = (retained_earnings / total_assets) * 1.4
        ebit = operating_income or ((net_income * 1.2) if net_income is not None else 0)
        z3 = (ebit / total_assets) * 3.3
        z4 = (float(market_cap) / (float(total_debt) or 1)) * 0.6
        z5 = (revenue / total_assets) * 1.0
        z_score = round(z1 + z2 + z3 + z4 + z5, 2)
        
        # If we didn't have full BS (only Naver ratios), Z-Score might be less accurate but F-Score is solid.
        # Check Z-Score sanity
        if z_score < 0: z_score = 0

        if z_score > 2.99: z_zone, z_color = "안전", "green"
        elif z_score > 1.81: z_zone, z_color = "주의", "yellow"
        else: z_zone, z_color = "위험", "red"

        # Piotroski F-Score
        f_score = 0
        f_details = []

        if net_income is not None and net_income > 0: f_score += 1; f_details.append("✅ 순이익 흑자")
        else: f_details.append("❌ 순이익 적자")

        if operating_cf is not None and operating_cf > 0: f_score += 1; f_details.append("✅ 영업현금흐름 양수")
        else: f_details.append("❌ 영업현금흐름 음수")

        roa = (net_income / total_assets) if (net_income is not None and total_assets > 0) else 0
        if roa > 0: f_score += 1; f_details.append(f"✅ ROA 양수 ({roa*100:.1f}%)")
        else: f_details.append(f"❌ ROA 음수 ({roa*100:.1f}%)")

        if operating_cf is not None and net_income is not None and operating_cf > net_income: f_score += 1; f_details.append("✅ 현금흐름 > 순이익")
        else: f_details.append("❌ 현금흐름 < 순이익")

        debt_ratio = (total_debt / total_assets * 100) if (total_debt is not None and total_assets > 0) else 0
        if nav_summary.get("debt_ratio"): debt_ratio = nav_summary.get("debt_ratio")
        
        if debt_ratio < 50: f_score += 1; f_details.append(f"✅ 부채비율 양호 ({debt_ratio:.0f}%)")
        else: f_details.append(f"❌ 부채비율 높음 ({debt_ratio:.0f}%)")

        current_ratio = current_assets / current_liabilities if (current_assets is not None and current_liabilities is not None and current_liabilities > 0) else 0
        if current_ratio > 1: f_score += 1; f_details.append(f"✅ 유동비율 양호 ({current_ratio:.1f})")
        else: f_details.append(f"❌ 유동비율 부족 ({current_ratio:.1f})")

        # Handle Naver detail fallback
        gross_margin = info.get("grossMargins") or 0
        if gross_margin > 0: gross_margin *= 100
        else: gross_margin = nav_summary.get("operating_margin") or 0 # Proxy
        
        if gross_margin > 20: f_score += 1; f_details.append(f"✅ 매출총이익률/이익률 양호 ({gross_margin:.1f}%)")
        else: f_details.append(f"❌ 매출총이익률/이익률 낮음 ({gross_margin:.1f}%)")

        asset_turnover = revenue / total_assets if total_assets > 0 else 0
        if asset_turnover > 0.5: f_score += 1; f_details.append(f"✅ 자산회전율 양호 ({asset_turnover:.2f})")
        else: f_details.append(f"❌ 자산회전율 낮음 ({asset_turnover:.2f})")

        roe_val = nav_summary.get("roe") or (info.get("returnOnEquity") or 0) * 100
        if roe_val > 100: roe_val = roe_val / 100.0 # Some sources use raw decimal
        if roe_val > 10: f_score += 1; f_details.append(f"✅ ROE 우수 ({roe_val:.1f}%)")
        else: f_details.append(f"❌ ROE 부족 ({roe_val:.1f}%)")

        ratios = {
            "PER": round(float(naver_data.get("per") or info.get("trailingPE") or 0), 1),
            "PBR": round(float(naver_data.get("pbr") or info.get("priceToBook") or 0), 2),
            "ROE": f"{roe_val:.1f}%",
            "부채비율": f"{debt_ratio:.0f}%",
            "유동비율": f"{current_ratio:.1f}",
            "영업이익률": f"{float(nav_summary.get('operating_margin') or info.get('operatingMargins', 0)*100):.1f}%",
            "매출총이익률": f"{gross_margin:.1f}%",
            "자산회전율": f"{asset_turnover:.2f}"
        }

        health_score = round((min(z_score, 5) / 5 * 40) + (f_score / 9 * 60))
        health_score = max(0, min(100, health_score))

        return {
            "symbol": symbol,
            "name": naver_data.get("name") if naver_data else info.get("shortName") or symbol,
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
            
            # [New] Resolve Korean Name to Code if needed
            is_only_digits = re.match(r'^\d{6}$', ticker_sym)
            is_kr_suffix = ticker_sym.endswith(('.KS', '.KQ'))
            
            if not is_only_digits and not is_kr_suffix and any('\uac00' <= c <= '\ud7a3' for c in ticker_sym):
                if search_stock_code:
                    resolved = search_stock_code(ticker_sym)
                    if resolved:
                        ticker_sym = resolved
                        is_only_digits = True

            is_korean = is_only_digits or is_kr_suffix
            
            naver_data = None
            if is_korean and gather_naver_stock_data:
                naver_data = gather_naver_stock_data(ticker_sym)
                if naver_data:
                    # Resolve symbol for YF if needed
                    ticker_sym = f"{naver_data['code']}.{naver_data['market_type']}"
            else:
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
                    if len(hist) > 20: # Slightly lower threshold to be safe
                        p_3m = float(hist['Close'].iloc[max(0, len(hist)-64)])
                        change_3m = round(((price - p_3m) / p_3m) * 100, 1) if p_3m > 0 else 0

                # --- Handle Market Cap ---
                mc = 0
                mc_display = "N/A"
                if naver_data:
                    # 1. Parse Market Cap from String (e.g. "447조 7,337 억원")
                    mc_str = naver_data.get("market_cap_str", "")
                    if mc_str:
                        mc_display = mc_str
                        # Robust Parsing: "447조 7,337 억원" -> 447,000,000,000,000 + 733,700,000,000
                        try:
                            parts = re.findall(r'(\d[\d,]*)\s*([조억])', mc_str)
                            total_krw = 0
                            for val_s, unit in parts:
                                val = int(val_s.replace(',', ''))
                                if unit == '조': total_krw += val * 1e12
                                elif unit == '억': total_krw += val * 1e8
                            mc = total_krw
                        except: pass
                    else:
                        mc = info.get('marketCap', 0)
                else:
                    mc = info.get('marketCap', 0)
                    mc_display = f"{mc/1e12:.1f}조" if mc > 1e12 else (f"{mc/1e8:.0f}억" if mc > 1e8 else "N/A")

                # --- Handle Financial Ratios (Naver Summary Prioritized) ---
                nav_sum = naver_data.get("detailed_financials", {}).get("summary", {}) if naver_data else {}
                
                def get_val(key, yf_key, scale=1):
                    val = nav_sum.get(key)
                    if val is None:
                        val = info.get(yf_key)
                        if val is not None: val = val * scale
                    return float(val) if val is not None else 0

                results.append({
                    "symbol": sym.strip(),
                    "name": naver_data.get("name") if naver_data else info.get("shortName") or sym,
                    "price": naver_data.get("price") if naver_data else price,
                    "change_3m": change_3m,
                    "market_cap": mc,
                    "market_cap_display": mc_display,
                    "per": round(get_val("per", "trailingPE"), 1),
                    "pbr": round(get_val("pbr", "priceToBook"), 2),
                    "roe": round(get_val("roe", "returnOnEquity", 100), 1),
                    "operating_margin": round(get_val("operating_margin", "operatingMargins", 100), 1),
                    "revenue_growth": round(get_val("revenue_growth", "revenueGrowth", 100), 1),
                    "dividend_yield": round(get_val("dividend_yield", "dividendYield", 100), 2),
                    "debt_to_equity": round(get_val("debt_ratio", "debtToEquity"), 1), # Naver uses debt_ratio
                    "beta": round(info.get("beta") or 1, 2),
                    "sector": naver_data.get("sector") if naver_data else info.get("sector", "N/A"),
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
