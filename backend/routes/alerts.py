from fastapi import APIRouter, Header, Query, HTTPException
from typing import Optional, List, Dict
from price_alerts import get_user_alerts, save_price_alert, delete_price_alert, get_alert_history

router = APIRouter()

@router.get("/alerts")
def read_alerts(x_user_id: Optional[str] = Header(None)):
    """사용자의 활성 알림 목록 조회"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
    
    alerts = get_user_alerts(x_user_id)
    return {"status": "success", "data": alerts}

@router.post("/alerts")
def create_alert(data: Dict, x_user_id: Optional[str] = Header(None)):
    """새로운 가격 알림 등록"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
    
    try:
        # [BugFix] 프론트엔드가 'alert_type' 또는 'type' 두 가지로 보낼 수 있음
        alert_type = data.get('type') or data.get('alert_type')
        if not alert_type:
            return {"status": "error", "message": "알림 타입이 없습니다."}
        
        alert_id = save_price_alert(
            user_id=x_user_id,
            symbol=data['symbol'],
            alert_type=alert_type,
            buy_price=data.get('buy_price'),
            threshold=data.get('threshold'),
            target_price=data.get('target_price'),
            quantity=data.get('quantity')
        )
        return {"status": "success", "data": {"id": alert_id}}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.delete("/alerts/{alert_id}")
def remove_alert(alert_id: int, x_user_id: Optional[str] = Header(None)):
    """알림 삭제"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
    
    success = delete_price_alert(x_user_id, alert_id)
    if success:
        return {"status": "success"}
    return {"status": "error", "message": "알림을 찾을 수 없거나 삭제에 실패했습니다."}

@router.get("/alerts/history")
def read_alert_history(limit: int = 50, x_user_id: Optional[str] = Header(None)):
    """알림 히스토리 조회"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
    
    history = get_alert_history(x_user_id, limit)
    return {"status": "success", "data": history}
