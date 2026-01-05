import json
import os
import yfinance as yf
from datetime import datetime

ALERTS_FILE = "alerts.json"

def load_alerts():
    if not os.path.exists(ALERTS_FILE):
        return []
    try:
        with open(ALERTS_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_alerts(alerts):
    with open(ALERTS_FILE, "w") as f:
        json.dump(alerts, f, indent=4)

def add_alert(symbol, target_price, condition):
    """
    condition: 'above' (>=) or 'below' (<=)
    """
    alerts = load_alerts()
    alert = {
        "id": int(datetime.now().timestamp()), # Simple ID
        "symbol": symbol.upper(),
        "target_price": float(target_price),
        "condition": condition,
        "created_at": datetime.now().isoformat(),
        "status": "active" # active, triggered
    }
    alerts.append(alert)
    save_alerts(alerts)
    return alert

def get_alerts():
    return load_alerts()

def delete_alert(alert_id):
    alerts = load_alerts()
    alerts = [a for a in alerts if a["id"] != alert_id]
    save_alerts(alerts)
    return True

def check_alerts():
    """
    활성화된 알림을 확인하고 조건이 맞으면 triggered 상태로 변경 및 반환
    """
    alerts = load_alerts()
    active_alerts = [a for a in alerts if a["status"] == "active"]
    
    if not active_alerts:
        return []

    triggered = []
    
    # 1. 시세 일괄 조회 (최적화)
    symbols = list(set(a["symbol"] for a in active_alerts))
    # yfinance 배지 다운로드? 개별이 나을 수도 있음(속도 이슈). 여기선 개별로 빠르게 체크.
    
    updated = False
    
    for alert in alerts:
        if alert["status"] != "active":
            continue
            
        try:
            # 실시간 가격 조회 (빠른 응답을 위해 1분봉이나 fast_info 사용 권장)
            ticker = yf.Ticker(alert["symbol"])
            # fast_info가 최신 버전 yfinance에서 빠를 수 있음
            current_price = ticker.fast_info.last_price
            
            # 가격 못 가져오면 패스
            if not current_price:
                continue
                
            condition_met = False
            if alert["condition"] == "above" and current_price >= alert["target_price"]:
                condition_met = True
            elif alert["condition"] == "below" and current_price <= alert["target_price"]:
                condition_met = True
                
            if condition_met:
                alert["status"] = "triggered"
                alert["triggered_at"] = datetime.now().isoformat()
                alert["triggered_price"] = current_price
                triggered.append(alert)
                updated = True
                
        except Exception as e:
            print(f"Alert check failed for {alert['symbol']}: {e}")
            
    if updated:
        save_alerts(alerts)
        
    return triggered
