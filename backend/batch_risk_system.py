import time
import datetime
from db_manager import get_db_connection, get_watchlist, get_user_fcm_tokens
from firebase_config import send_multicast_notification
from risk_analyzer import analyze_risk
from stock_data import get_korean_stock_name

def run_risk_alert_job():
    """
    모든 사용자의 관심 종목(Watchlist)을 취합하여 위험 스코어를 계산하고,
    위험/주의 단계인 경우 해당 사용자에게 FCM 푸시 알림을 발송합니다.
    """
    print(f"[{datetime.datetime.now()}] [Risk Alert] 관심종목 위험도 분석 시작...")
    
    conn = get_db_connection()
    if not conn:
        print("[Risk Alert] DB Connection failed.")
        return
        
    try:
        # 모든 관심종목 데이터 가져오기 (uid, list of symbols)
        users = {}
        c = conn.cursor()
        c.execute("SELECT uid, symbol FROM watchlist")
        rows = c.fetchall()
        for row in rows:
            uid, symbol = row
            if uid not in users:
                users[uid] = []
            users[uid].append(symbol)
            
        # 중복 방지용: symbol 당 한 번만 위험도 계산
        unique_symbols = set()
        for symbols in users.values():
            unique_symbols.update(symbols)
            
        risk_cache = {}
        for symbol in unique_symbols:
            # 국내 종목만 대상으로 함 (6자리 숫자)
            clean_symbol = symbol.split('.')[0]
            if clean_symbol.isdigit() and len(clean_symbol) == 6:
                risk_data = analyze_risk(clean_symbol)
                risk_cache[symbol] = risk_data
                time.sleep(0.5) # 과도한 요청 방지
                
        # 각 사용자별로 알림 발송
        for uid, symbols in users.items():
            tokens_data = get_user_fcm_tokens(uid)
            if not tokens_data:
                continue
                
            user_tokens = [t["token"] for t in tokens_data if t.get("token") and t.get("pref_alerts", True)]
            if not user_tokens:
                continue
                
            for symbol in symbols:
                risk_data = risk_cache.get(symbol)
                if not risk_data:
                    continue
                    
                overall_status = risk_data.get("overallStatus", "안전")
                if "위험" in overall_status or "주의" in overall_status:
                    kr_name = get_korean_stock_name(symbol.split('.')[0])
                    title = f"🚨 [위험 감지] 관심종목 '{kr_name}'"
                    body = risk_data.get("aiComment", "")
                    
                    data_payload = {
                        "type": "RISK_ALERT",
                        "symbol": symbol,
                        "url": f"/stock/{symbol.split('.')[0]}"
                    }
                    
                    print(f"[Risk Alert] Sending alert to {uid} for {kr_name}: {overall_status}")
                    send_multicast_notification(
                        title=title,
                        body=body,
                        tokens=user_tokens,
                        data=data_payload,
                        target_users=[uid]
                    )
                    time.sleep(0.2)
                    
    except Exception as e:
        print(f"[Risk Alert] Error during job execution: {e}")
    finally:
        conn.close()
        print(f"[{datetime.datetime.now()}] [Risk Alert] 작업 완료.")

if __name__ == "__main__":
    run_risk_alert_job()
