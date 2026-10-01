"""
🐳 SEC EDGAR 기반 미국 고래 알림 모듈
────────────────────────────────────────
SEC EDGAR Full-Text Search API (무료, API 키 불필요)를 사용하여
Form 4 (임원 내부자 거래) 및 13F-HR (기관 대규모 포지션) 공시를 실시간으로 조회합니다.

EDGAR API: https://efts.sec.gov/LATEST/search-index
"""

import requests
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import traceback

# 중복 발송 방지 상태 파일
STATE_FILE = os.path.join(os.path.dirname(__file__), "sec_whale_state.json")

EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_SUBMISSIONS_URL = "https://data.sec.gov/submissions"

HEADERS = {
    "User-Agent": "StockTrendProgram contact@stocktrend.co.kr",  # SEC 정책상 User-Agent 필수
    "Accept-Encoding": "gzip, deflate",
}


def _load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_state(state: dict):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[SEC Whale] Failed to save state: {e}")


def _edgar_search(form_type: str, date_from: str, date_to: str) -> List[Dict]:
    """
    SEC EDGAR Full-Text Search로 특정 폼 타입의 최신 제출물 조회
    - form_type: "4" or "13F-HR"
    - date_from/to: "YYYY-MM-DD"
    """
    try:
        params = {
            "q": f'"{form_type}"',
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": date_to,
            "forms": form_type,
            "_source": "file_date,period_of_report,entity_name,file_num,form_type,period_of_report",
        }
        res = requests.get(
            "https://efts.sec.gov/LATEST/search-index",
            params=params,
            headers=HEADERS,
            timeout=15,
        )
        if res.status_code == 200:
            data = res.json()
            hits = data.get("hits", {}).get("hits", [])
            results = []
            for hit in hits:
                src = hit.get("_source", {})
                results.append({
                    "accession_no": hit.get("_id", ""),
                    "entity_name": src.get("entity_name", "Unknown"),
                    "form_type": src.get("form_type", form_type),
                    "file_date": src.get("file_date", ""),
                    "period": src.get("period_of_report", ""),
                    "link": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type={form_type}&dateb=&owner=include&count=10",
                })
            return results
        else:
            print(f"[SEC Whale] EDGAR search HTTP error: {res.status_code}")
            return []
    except Exception as e:
        print(f"[SEC Whale] EDGAR search exception: {e}")
        return []


def _edgar_filings_search(form_type: str, days_back: int = 1) -> List[Dict]:
    """
    SEC EDGAR Recent Filings Atom RSS를 사용하여 최신 공시 실시간 조회
    (실시간 초 단위 최신 공시 반영 및 EFTS 폴백 지원)
    """
    results = []
    seen_accs = set()

    # 1. SEC 공식 실시간 getcurrent RSS 스트림 조회 (초 단위 실시간)
    try:
        owner_param = "only" if form_type == "4" else "include"
        rss_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type={form_type}&company=&dateb=&owner={owner_param}&count=50&output=atom"
        res = requests.get(rss_url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall("atom:entry", ns)
            for e in entries:
                eid = e.findtext("atom:id", default="", namespaces=ns)
                acc_num = eid.split("=")[-1] if "=" in eid else eid
                if not acc_num or acc_num in seen_accs:
                    continue
                seen_accs.add(acc_num)
                
                title_text = e.findtext("atom:title", default="", namespaces=ns)
                link_el = e.find("atom:link", ns)
                sec_link = link_el.attrib.get("href") if link_el is not None else ""
                if not sec_link:
                    continue
                    
                base_dir = sec_link.rsplit("/", 1)[0] + "/"
                xml_url = ""
                try:
                    r_dir = requests.get(f"{base_dir}index.json", headers=HEADERS, timeout=4)
                    if r_dir.status_code == 200:
                        dir_items = r_dir.json().get("directory", {}).get("item", [])
                        xml_file = next((it["name"] for it in dir_items if it.get("name", "").endswith(".xml")), None)
                        if xml_file:
                            xml_url = f"{base_dir}{xml_file}"
                except Exception:
                    pass

                entity = "Unknown"
                if " - " in title_text:
                    after_dash = title_text.split(" - ", 1)[1]
                    entity = after_dash.split("(")[0].strip()

                results.append({
                    "accession_no": acc_num,
                    "entity_name": entity,
                    "ticker": "",
                    "form_type": form_type,
                    "file_date": e.findtext("atom:updated", default="", namespaces=ns)[:10],
                    "period": "",
                    "link": sec_link,
                    "xml_url": xml_url,
                })
                if len(results) >= 30:
                    break
            if results:
                return results
    except Exception as rss_e:
        print(f"[SEC Whale] RSS live stream error: {rss_e}")

    # 2. 폴백: EFTS Full-Text Search
    try:
        today = datetime.utcnow()
        date_from = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        date_to = today.strftime("%Y-%m-%d")

        url = "https://efts.sec.gov/LATEST/search-index"
        params = {
            "q": "",
            "forms": form_type,
            "dateRange": "custom",
            "startdt": date_from,
            "enddt": date_to,
        }
        res = requests.get(url, params=params, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            print(f"[SEC Whale] HTTP {res.status_code} for form {form_type}")
            return []

        data = res.json()
        hits = data.get("hits", {}).get("hits", [])
        for hit in hits[:50]:  # 최대 50건만
            src = hit.get("_source", {})
            raw_id = hit.get("_id", "")
            
            acc_num = raw_id.split(":")[0] if raw_id else ""
            acc_no_dashes = acc_num.replace("-", "")
            
            xml_url = ""
            ciks = src.get("ciks", [])
            issuer_cik = None
            try:
                issuer_cik = ciks[1] if len(ciks) > 1 else (ciks[0] if ciks else None)
                cik_int = str(int(ciks[0])) if ciks else str(int(acc_num.split("-")[0]))
                sec_link = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_no_dashes}/{acc_num}-index.htm"
                xml_filename = raw_id.split(":")[1] if ":" in raw_id else ""
                if xml_filename:
                    xml_url = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_no_dashes}/{xml_filename}"
            except:
                sec_link = f"https://www.sec.gov/Archives/edgar/data/0/{acc_no_dashes}/"

            display_names = src.get("display_names", [])
            if "entity_name" in src and src.get("entity_name"):
                entity = src.get("entity_name")
            elif display_names:
                entity = display_names[-1].split("(CIK")[0].strip()
            else:
                entity = "Unknown"
                
            ticker = src.get("tickers", "")
            if isinstance(ticker, list):
                ticker = ticker[0] if ticker else ""
            elif not isinstance(ticker, str):
                ticker = ""
                
            if not ticker and issuer_cik:
                try:
                    from sec_api_client import get_ticker_by_cik
                    ticker = get_ticker_by_cik(issuer_cik) or ""
                except Exception:
                    pass

            results.append({
                "accession_no": acc_num,
                "entity_name": entity,
                "ticker": ticker,
                "form_type": src.get("form_type", form_type),
                "file_date": src.get("file_date", ""),
                "period": src.get("period_of_report", ""),
                "link": sec_link,
                "xml_url": xml_url,
                "ciks": ciks,
                "issuer_cik": issuer_cik,
            })
        return results
    except Exception as e:
        print(f"[SEC Whale] Filing search error: {e}")
        traceback.print_exc()
        return []


def parse_form4_xml(xml_url: str) -> dict:
    try:
        res = requests.get(xml_url, headers=HEADERS, timeout=10)
        if res.status_code != 200:
            return {}
            
        root = ET.fromstring(res.text)
        
        # 티커 및 발행사 사명 추출
        sym_el = root.find('.//issuerTradingSymbol')
        iss_el = root.find('.//issuerName')
        ticker = sym_el.text.strip().upper() if (sym_el is not None and sym_el.text) else ""
        if ticker in ["NONE", "N/A", "0"]:
            ticker = ""
        issuer_name = iss_el.text.strip() if (iss_el is not None and iss_el.text) else ""

        owner = root.find('.//rptOwnerName')
        owner_name = owner.text if owner is not None else '내부자'
        
        is_director = root.find('.//isDirector')
        is_officer = root.find('.//isOfficer')
        officer_title = root.find('.//officerTitle')
        
        title_str = ''
        if officer_title is not None and officer_title.text:
            title_str = officer_title.text
        elif is_director is not None and is_director.text == 'true':
            title_str = '이사(Director)'
            
        total_shares = 0
        total_value = 0
        trans_type = '거래'
        
        for tx in root.findall('.//nonDerivativeTransaction') + root.findall('.//derivativeTransaction'):
            shares_el = tx.find('.//transactionShares/value')
            price_el = tx.find('.//transactionPricePerShare/value')
            acq_disp_el = tx.find('.//transactionAcquiredDisposedCode/value')
            
            if shares_el is not None and acq_disp_el is not None:
                shares = float(shares_el.text or 0)
                price = float(price_el.text or 0) if price_el is not None else 0
                code = acq_disp_el.text
                
                total_shares += shares
                total_value += shares * price
                
                if code == 'A':
                    trans_type = '매수(취득)'
                elif code == 'D':
                    trans_type = '매도(처분)'
                    
        def format_currency(val, fx_rate=1380.0):
            if not val or val <= 0:
                return "0원"
            krw = val * fx_rate
            if krw >= 100_000_000_000:
                krw_str = f"약 {krw / 100_000_000_000:.1f}천억원"
            elif krw >= 100_000_000:
                krw_str = f"약 {krw / 100_000_000:.1f}억원"
            elif krw >= 10_000:
                krw_str = f"약 {krw / 10_000:,.0f}만원"
            else:
                krw_str = f"약 {krw:,.0f}원"
                
            if val >= 1_000_000_000:
                usd_kor = f"{val / 100_000_000:.1f}억 달러"
            elif val >= 10_000:
                val_man = val / 10_000
                val_man_str = f"{val_man:,.0f}" if val_man == int(val_man) else f"{val_man:,.1f}"
                usd_kor = f"{val_man_str}만 달러"
            else:
                usd_kor = f"{int(val):,}달러"
                
            return f"{krw_str} ({usd_kor})" 
                
        return {
            'ticker': ticker,
            'issuer_name': issuer_name,
            'owner_name': owner_name,
            'title': title_str,
            'trans_type': trans_type,
            'total_shares': int(total_shares),
            'total_value': format_currency(total_value) if total_value > 0 else '$0',
            'has_value': total_value > 0
        }
    except Exception as e:
        print(f'[SEC Whale] XML Parse Error: {e}')
        return {}


def check_sec_form4_alerts():
    """
    🐳 SEC Form 4 임원/내부자 거래 알림
    - 최근 1일 제출된 Form 4 중 새로운 것만 발송
    """
    try:
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens_with_user
    except ImportError as e:
        print(f"[SEC Whale Form4] Import error: {e}")
        return

    state = _load_state()
    # [버그 수정] set() 대신 dict.fromkeys()를 사용하여 삽입 순서를 100% 보존 (기존 set 슬라이싱으로 인한 무작위 삭제·재발송 폭탄 원천 차단)
    sent_form4 = dict.fromkeys(state.get("sent_form4", []))

    filings = _edgar_filings_search("4", days_back=1)
    if not filings:
        print("[SEC Whale Form4] No Form 4 filings found")
        return

    # [미국장/SEC 운영시간 엄격 체크] 한국 낮/오후 시간대(08:30 ~ 18:59 KST)는 미국 SEC EDGAR 접수 마감 및 미국 본장 휴장 시간이므로
    # 절대 푸시 알림을 발송하지 않고 조용히 읽음 처리(베이스라인 등록)만 수행!
    import pytz
    kst_now = datetime.now(pytz.timezone("Asia/Seoul"))
    is_us_active_hours = (kst_now.hour >= 19) or (kst_now.hour < 8) or (kst_now.hour == 8 and kst_now.minute <= 30)

    filing_accs = [f.get("accession_no", "") for f in filings if f.get("accession_no", "")]
    # 베이스라인 방어: 현재 피드의 공시 중 이미 처리된 내역이 단 1건도 없거나, 한국 주간 시간대(08:30~18:59 KST)인 경우 전부 조용히 읽음 처리만 하고 종료!
    if (filing_accs and not any(acc in sent_form4 for acc in filing_accs)) or (not is_us_active_hours):
        for acc in filing_accs:
            sent_form4[acc] = None
        state["sent_form4"] = list(sent_form4.keys())[-1500:]
        _save_state(state)
        print(f"[SEC Whale Form4] Silent baseline sync ({len(filing_accs)} filings, is_us_active_hours={is_us_active_hours})")
        return

    new_count = 0
    for filing in filings:
        accession = filing.get("accession_no", "")
        if not accession or accession in sent_form4:
            continue

        xml_url = filing.get("xml_url")
        parsed = {}
        if xml_url:
            parsed = parse_form4_xml(xml_url)

        ticker = parsed.get("ticker") or filing.get("ticker", "")
        entity_name = parsed.get("issuer_name") or filing.get("entity_name", "Unknown")

        if not ticker:
            # CIK 역조회 폴백
            issuer_cik = filing.get("issuer_cik")
            if issuer_cik:
                try:
                    from sec_api_client import get_ticker_by_cik
                    ticker = get_ticker_by_cik(issuer_cik) or ""
                except Exception:
                    pass

        if not ticker:
            # 티커를 끝내 찾을 수 없는 경우에만 스킵
            sent_form4[accession] = None
            continue

        # 주식 수량이 0인 행정성 단순 보고는 투자 가치가 낮으므로 스킵하고 실제 매수/매도 수량이 있는 알짜 거래 우선 전송
        if not parsed or parsed.get("total_shares", 0) <= 0:
            sent_form4[accession] = None
            continue

        # 발송 전 먼저 읽음 처리하여 중복·폭탄 발송 원천 차단
        sent_form4[accession] = None
        state["sent_form4"] = list(sent_form4.keys())[-1500:]
        _save_state(state)

        # 1회 주기(1분)당 최대 2건까지 발송하여 우루루 폭탄 알림 방지 + 적절한 실시간성 확보
        if new_count >= 2:
            continue

        display_name = f"{ticker} ({entity_name})" if ticker else entity_name

        from market_tag_helper import get_stock_market_tag
        market_tag = get_stock_market_tag(ticker) if ticker else "[미국]"
        
        clean_name = entity_name.replace("Inc.", "").replace("Corp.", "").replace("Co.", "").replace("Trust", "").strip()
        if len(clean_name) > 16:
            clean_name = clean_name[:14] + ".."

        try:
            from routes.seo import US_STOCK_KOREAN_NAMES
            clean_tkr = ticker.upper().split('.')[0] if ticker else ""
            kor_name = US_STOCK_KOREAN_NAMES.get(clean_tkr)
        except Exception:
            kor_name = None
        short_display = f"{kor_name}({ticker})" if (kor_name and ticker) else (f"{ticker} ({clean_name})" if ticker else clean_name)

        trans_short = parsed['trans_type'][:2]
        title = f"🚨 [SEC 내부자 {trans_short}] {market_tag} {short_display}"
        
        owner_short = parsed['owner_name']
        if len(owner_short) > 20:
            owner_short = owner_short[:18] + ".."
        val_str = f" ({parsed['total_value']})" if parsed['has_value'] else ""
        p1 = f"▪️ 📊 수급: {owner_short} | {parsed['trans_type']} {parsed['total_shares']:,}주{val_str}"
        
        if "매수" in parsed["trans_type"]:
            p2 = "▪️ 💡 해석: 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
        elif "매도" in parsed["trans_type"]:
            p2 = "▪️ 💡 해석: 임원 지분 매도에 따른 차익실현 · 단기 주가 고점 부담 점검 권장"
        else:
            p2 = "▪️ 💡 해석: 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
            
        body = f"{p1}\n{p2}"

        print(f"[SEC Whale Form4] New filing: {title}")

        try:
            initialize_firebase()
            user_tokens = get_all_fcm_tokens_with_user(require_insider_alert=True)
            if user_tokens:
                target_uids = [u[0] for u in user_tokens]
                tokens = [u[1] for u in user_tokens]
                push_data = {
                    "type": "sec_insider_trading",
                    "symbol": ticker or entity_name,
                    "url": f"/discovery?q={ticker}" if ticker else filing.get("link", "/discovery"),
                    "market": "US",
                    "is_global": "true",
                }
                result = send_multicast_notification(tokens, title, body, push_data, target_users=None)
                print(f"[SEC Whale Form4] Sent to {len(tokens)} tokens. Result: {result}")
                new_count += 1
            else:
                print("[SEC Whale Form4] No tokens subscribed")
        except Exception as e:
            print(f"[SEC Whale Form4] Send error: {e}")

    state["sent_form4"] = list(sent_form4.keys())[-1500:]
    _save_state(state)
    print(f"[SEC Whale Form4] Done. New alerts sent: {new_count}")



def parse_13f_filing(filing: dict) -> dict:
    """
    13F-HR 공시 제출물의 infotable.xml을 다운로드하여 주요 보유 종목 TOP3 및 총 AUM 파싱
    """
    try:
        from bs4 import BeautifulSoup
        acc_num = filing.get("accession_no", "")
        if not acc_num:
            return {}
            
        acc_no_dashes = acc_num.replace("-", "")
        cik_int = str(int(acc_num.split("-")[0])) if "-" in acc_num else "0"
        dir_url = f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_no_dashes}/"
        
        # 1. Directory index 조회하여 infotable.xml 파일명 찾기
        r_dir = requests.get(f"{dir_url}index.json", headers=HEADERS, timeout=5)
        if r_dir.status_code != 200:
            return {}
            
        dir_files = r_dir.json().get("directory", {}).get("item", [])
        info_file = next((f.get("name") for f in dir_files if "infotable" in f.get("name", "").lower() or (f.get("name", "").endswith(".xml") and "header" not in f.get("name", "").lower() and "primary" not in f.get("name", "").lower())), None)
        
        if not info_file:
            info_file = next((f.get("name") for f in dir_files if f.get("name", "").endswith(".xml") and "header" not in f.get("name", "").lower()), None)
            
        if not info_file:
            return {}
            
        # 2. infotable.xml 다운로드 및 파싱
        r_info = requests.get(f"{dir_url}{info_file}", headers=HEADERS, timeout=7)
        if r_info.status_code != 200:
            return {}
            
        soup = BeautifulSoup(r_info.content, "xml")
        holdings = []
        total_val = 0
        
        for item in soup.find_all(["infoTable", "ns1:infoTable"]):
            issuer = item.find(["nameOfIssuer", "ns1:nameOfIssuer"])
            name = issuer.text.strip() if issuer else "Unknown"
            
            val_el = item.find(["value", "ns1:value"])
            try:
                val = float(val_el.text or 0) if val_el else 0
            except:
                val = 0
            # 13F SEC standard: values under 5,000,000 are in thousands ($1,000s)
            val_usd = val if val > 5_000_000 else (val * 1000)
            
            shares_el = item.find(["sshPrnamt", "ns1:sshPrnamt"])
            try:
                shares = int(float(shares_el.text or 0)) if shares_el else 0
            except:
                shares = 0
                
            if val_usd > 0:
                total_val += val_usd
                holdings.append({"name": name, "value_usd": val_usd, "shares": shares})
                
        if not holdings:
            return {}
            
        holdings.sort(key=lambda x: x["value_usd"], reverse=True)
        
        # 3. Currency Format
        def _fmt_usd_krw(val, fx_rate=1380.0):
            if not val or val <= 0: return "0원"
            krw = val * fx_rate
            if krw >= 100_000_000_000:
                krw_str = f"약 {krw / 100_000_000_000:.1f}천억원"
            elif krw >= 100_000_000:
                krw_str = f"약 {krw / 100_000_000:.1f}억원"
            elif krw >= 10_000:
                krw_str = f"약 {krw / 10_000:,.0f}만원"
            else:
                krw_str = f"약 {krw:,.0f}원"
                
            if val >= 1_000_000_000:
                usd_kor = f"{val / 100_000_000:.1f}억 달러"
            elif val >= 10_000:
                val_man = val / 10_000
                val_man_str = f"{val_man:,.0f}" if val_man == int(val_man) else f"{val_man:,.1f}"
                usd_kor = f"{val_man_str}만 달러"
            else:
                usd_kor = f"{int(val):,}달러"
                
            return f"{krw_str} ({usd_kor})"
            
        top_strs = []
        for h in holdings[:3]:
            pct = (h["value_usd"] / total_val * 100) if total_val > 0 else 0
            clean_name = h["name"].title().replace(" Inc", "").replace(" Corp", "").replace(" Co", "").replace(" Ltd", "").strip()
            top_strs.append(f"{clean_name} {pct:.0f}%")
            
        return {
            "has_detail": True,
            "total_val_usd": total_val,
            "total_aum_str": _fmt_usd_krw(total_val),
            "holdings_count": len(holdings),
            "top_holding_summary": ", ".join(top_strs)
        }
    except Exception as e:
        print(f"[SEC Whale 13F] XML parse error: {e}")
        return {}


def check_sec_13f_alerts():
    """
    🐳 SEC 13F-HR 기관 대규모 포지션 공개 알림
    - 최근 2일 제출된 13F-HR 중 새로운 것만 발송
    - 13F는 분기별 제출이라 건수가 적음 (분기마다 몰아서 제출)
    """
    try:
        from firebase_config import initialize_firebase, send_multicast_notification
        from db_manager import get_all_fcm_tokens_with_user
    except ImportError as e:
        print(f"[SEC Whale 13F] Import error: {e}")
        return

    state = _load_state()
    sent_13f = dict.fromkeys(state.get("sent_13f", []))

    filings = _edgar_filings_search("13F-HR", days_back=2)
    if not filings:
        print("[SEC Whale 13F] No 13F-HR filings found")
        return

    import pytz
    kst_now = datetime.now(pytz.timezone("Asia/Seoul"))
    is_us_active_hours = (kst_now.hour >= 19) or (kst_now.hour < 8) or (kst_now.hour == 8 and kst_now.minute <= 30)

    filing_accs = [f.get("accession_no", "") for f in filings if f.get("accession_no", "")]
    if (filing_accs and not any(acc in sent_13f for acc in filing_accs)) or (not is_us_active_hours):
        for acc in filing_accs:
            sent_13f[acc] = None
        state["sent_13f"] = list(sent_13f.keys())[-500:]
        _save_state(state)
        print(f"[SEC Whale 13F] Silent baseline sync ({len(filing_accs)} filings, is_us_active_hours={is_us_active_hours})")
        return

    new_count = 0
    for filing in filings[:10]:
        accession = filing.get("accession_no", "")
        if not accession or accession in sent_13f:
            continue

        sent_13f[accession] = None
        state["sent_13f"] = list(sent_13f.keys())[-500:]
        _save_state(state)

        if new_count >= 1:
            continue

        entity_name = filing.get("entity_name", "Unknown")
        ticker = filing.get("ticker", "")
        try:
            from routes.seo import US_STOCK_KOREAN_NAMES
            clean_tkr = ticker.upper().split('.')[0] if ticker else ""
            kor_name = US_STOCK_KOREAN_NAMES.get(clean_tkr)
        except Exception:
            kor_name = None
        display_name = f"{kor_name}({ticker})" if (kor_name and ticker) else (f"{ticker} ({entity_name})" if ticker else entity_name)

        period_str = filing.get("period", "")
        period_label = ""
        if period_str:
            try:
                from datetime import datetime as _dt
                _pd = _dt.strptime(period_str[:10], "%Y-%m-%d")
                period_label = f" ({_pd.year}년 {_pd.month}분기 기준)"
            except Exception:
                period_label = f" ({period_str[:10]})"
        title = f"🐳 [미국 기관 포지션 공개] {display_name}"
        parsed_13f = parse_13f_filing(filing)
        if parsed_13f and parsed_13f.get("has_detail"):
            aum_str = parsed_13f["total_aum_str"]
            top_holdings = parsed_13f["top_holding_summary"]
            count = parsed_13f["holdings_count"]
            line1 = f"▪️ 📊 포트폴리오: {aum_str} | 핵심비중: {top_holdings}"
            line2 = f"▪️ 💡 특징: 총 {count}개 종목 보유, 대형 우량 자산 위주 포트폴리오 운용"
            body = f"{line1}\n{line2}"
        else:
            line1 = f"▪️ 📊 수급: 대형 기관투자자의 분기별 보유 주식(13F) 포트폴리오 공개{period_label}"
            line2 = f"▪️ 💡 해석: 월가 슈퍼 고래 기관의 최신 지분 포지션 변동 확인"
            body = f"{line1}\n{line2}"

        print(f"[SEC Whale 13F] New filing: {title}")

        try:
            initialize_firebase()
            user_tokens = get_all_fcm_tokens_with_user(require_whale_alert=True)
            if user_tokens:
                target_uids = [u[0] for u in user_tokens]
                tokens = [u[1] for u in user_tokens]
                push_data = {
                    "type": "sec_13f",
                    "symbol": ticker or entity_name,
                    "url": filing.get("link", "/discovery"),
                    "market": "US",
                    "is_global": "true",
                }
                result = send_multicast_notification(tokens, title, body, push_data, target_users=target_uids)
                print(f"[SEC Whale 13F] Sent to {len(tokens)} tokens. Result: {result}")
                new_count += 1
            else:
                print("[SEC Whale 13F] No tokens subscribed")
        except Exception as e:
            print(f"[SEC Whale 13F] Send error: {e}")

    state["sent_13f"] = list(sent_13f.keys())[-500:]
    _save_state(state)
    print(f"[SEC Whale 13F] Done. New alerts sent: {new_count}")


if __name__ == "__main__":
    print("=== Testing SEC Form 4 ===")
    check_sec_form4_alerts()
    print("\n=== Testing SEC 13F ===")
    check_sec_13f_alerts()
