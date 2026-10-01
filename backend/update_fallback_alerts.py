import sys
import os
sys.path.append(os.path.join(r"c:\Users\rnfjr\StockTrendProgram\backend"))
sys.stdout.reconfigure(encoding='utf-8')

import firebase_admin
from firebase_admin import firestore
from firebase_config import initialize_firebase
from dart_api_client import dart_api_client
from scheduler import format_super_ant_alert, format_insider_alert
from market_tag_helper import get_stock_market_tag

initialize_firebase()
db = firestore.client()

# Fetch recent 200 alerts from Firestore
docs = db.collection("alerts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(200).stream()

updated_count = 0
for doc in docs:
    d = doc.to_dict()
    doc_id = doc.id
    title = d.get("title", "")
    body = d.get("body", "")
    rcept_no = d.get("rcept_no")
    symbol = d.get("symbol")

    # Check if this alert is a fallback super ant or insider alert
    is_fallback_ant = ("슈퍼개미" in title or "대량보유" in title) and ("대량보유 지분 변동 발생" in body or "지분 보유상황 변동이 발생" in body)
    is_fallback_insider = ("내부자" in title or "임원" in title) and ("자사주 보유 변동" in body or "주식 보유상황(매수/매도) 변동이 발생" in body)
    is_fallback_treasury = ("자사주" in title or "자사주" in body) and ("회사가 자기 주식 직접 매수" in body and "약" not in body and "취득 예정" not in body)

    if is_fallback_treasury and rcept_no:
        t_det = dart_api_client.get_treasury_stock_details(str(rcept_no))
        if t_det and (t_det.get("amount_str") or t_det.get("plan_shares", 0) > 0):
            amt_info = f" {t_det['amount_str']}" if t_det.get('amount_str') else ""
            stk_info = f" ({t_det['plan_shares']:,}주 취득 예정)" if t_det.get('plan_shares', 0) > 0 else ""
            new_body = body.replace(
                "자사주 매입 결정 공시! 회사가 자기 주식 직접 매수",
                f"자사주 매입 결정 공시!{amt_info}{stk_info} 회사가 자기 주식 직접 매수"
            )
            db.collection("alerts").document(doc_id).update({"body": new_body})
            print(f"Updated treasury alert for {doc_id}: {new_body}")
            updated_count += 1
            continue

    if (is_fallback_ant or is_fallback_insider) and rcept_no and symbol:
        print(f"\nFound fallback alert to update: {doc_id} | {title}")
        clean_code = str(symbol).strip().split('.')[0]
        market_tag = get_stock_market_tag(clean_code)
        
        # Try to resolve corp_name from title
        # title e.g.: 🚨 [슈퍼개미 포착] [코스닥] 웰킵스하이텍
        corp_name = title.split(']')[-1].strip()
        
        # rcept_dt from rcept_no (first 8 digits)
        rcept_dt = str(rcept_no)[:8] if len(str(rcept_no)) >= 8 else ""

        if is_fallback_ant:
            new_title, new_body = format_super_ant_alert(market_tag, corp_name, clean_code, str(rcept_no), "", rcept_dt)
        else:
            new_title, new_body = format_insider_alert(market_tag, corp_name, clean_code, str(rcept_no), "", rcept_dt)

        if "대량보유 지분 변동 발생" not in new_body and "자사주 보유 변동" not in new_body:
            print(f"Updating {doc_id}:")
            print("  New Title:", new_title)
            print("  New Body:\n" + new_body)
            db.collection("alerts").document(doc_id).update({
                "title": new_title,
                "body": new_body
            })
            updated_count += 1
        else:
            print(f"Could not extract rich data for {rcept_no}, kept original.")


print(f"\nDone! Total updated alerts in Firestore: {updated_count}")
