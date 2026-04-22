"""
Price Alert Monitor (가격 알림 모니터)
실시간 가격 모니터링 및 조건 알림
"""

import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import yfinance as yf
from db_manager import get_db_connection

class PriceAlertMonitor:
    """
    실시간 가격 모니터링 및 알림 시스템
    자동 매매 없이 알림만 발송
    """
    
    def __init__(self):
        self.active_alerts = {}  # {user_id: [alerts]}
        self.running = False
        self.check_interval = 10  # 10초마다 체크
    
    async def start(self):
        """모니터링 시작"""
        print("[PriceAlert] Monitor started")
        self.running = True
        
        while self.running:
            try:
                await self.check_all_alerts()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                print(f"[PriceAlert] Error in monitoring loop: {e}")
                await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """모니터링 중지"""
        self.running = False
        print("[PriceAlert] Monitor stopped")
    
    async def check_all_alerts(self):
        """모든 활성 알림 체크"""
        # DB에서 활성 알림 가져오기
        alerts = self.get_active_alerts_from_db()
        
        # 심볼별로 그룹화 (API 호출 최소화)
        symbols_to_check = {}
        for alert in alerts:
            symbol = alert['symbol']
            if symbol not in symbols_to_check:
                symbols_to_check[symbol] = []
            symbols_to_check[symbol].append(alert)
        
        # 각 심볼의 현재 가격 조회 및 알림 체크 (Parallel)
        async def check_single_symbol(symbol, alerts):
            try:
                current_price = await self.get_current_price(symbol)
                if current_price:
                    for alert in alerts:
                        await self.check_alert(alert, current_price)
            except Exception as e:
                print(f"[PriceAlert] Error checking {symbol}: {e}")

        tasks = [check_single_symbol(s, a) for s, a in symbols_to_check.items()]
        if tasks:
            await asyncio.gather(*tasks)
    
    async def get_current_price(self, symbol: str) -> Optional[float]:
        """현재 가격 조회 (Offloaded to thread)"""
        def _get_price():
            try:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period="1d", interval="1m")
                if not data.empty:
                    return float(data['Close'].iloc[-1])
                return None
            except Exception as e:
                print(f"[PriceAlert] Price fetch error for {symbol}: {e}")
                return None

        return await asyncio.to_thread(_get_price)
    
    async def check_alert(self, alert: Dict, current_price: float):
        """단일 알림 조건 체크"""
        alert_id = alert['id']
        alert_type = alert['type']
        buy_price = alert['buy_price']
        threshold = alert['threshold']
        
        triggered = False
        message = ""
        
        # 손절 조건 체크
        if alert_type == 'stop_loss':
            loss_pct = ((current_price - buy_price) / buy_price) * 100
            if loss_pct <= -threshold:
                triggered = True
                message = f"🚨 손절 조건 도달! {alert['symbol']}이(가) {abs(loss_pct):.2f}% 하락했습니다."
        
        # 익절 조건 체크
        elif alert_type == 'take_profit':
            profit_pct = ((current_price - buy_price) / buy_price) * 100
            if profit_pct >= threshold:
                triggered = True
                message = f"🎉 익절 조건 도달! {alert['symbol']}이(가) {profit_pct:.2f}% 상승했습니다."
        
        # 목표가 도달 체크
        elif alert_type == 'target_price':
            target_price = alert['target_price']
            if current_price >= target_price:
                triggered = True
                message = f"Target price reached! {alert['symbol']} reached {current_price:,.0f}."
        
        # 알림 발송
        if triggered:
            await self.send_alert(alert, current_price, message)
            self.deactivate_alert(alert_id)
    
    async def send_alert(self, alert: Dict, current_price: float, message: str):
        """알림 발송 (앱 내 + 푸시)"""
        user_id = alert['user_id']
        
        # 알림 데이터 구성
        notification = {
            "user_id": user_id,
            "symbol": alert['symbol'],
            "type": alert['type'],
            "message": message,
            "current_price": current_price,
            "buy_price": alert['buy_price'],
            "threshold": alert['threshold'],
            "triggered_at": datetime.now().isoformat()
        }
        
        # 1. 알림 히스토리 저장
        self.save_alert_history(notification)
        
        # 2. 앱 내 알림 (WebSocket)
        await self.broadcast_notification(notification)
        
        # 3. 푸시 알림 발송 (NEW!)
        await self.send_push_alert(user_id, alert, current_price, message)
        
        print(f"[PriceAlert] Alert sent to {user_id}: {message}")
    
    async def send_push_alert(self, user_id: str, alert: Dict, current_price: float, message: str):
        """푸시 알림 발송"""
        try:
            from firebase_config import send_price_alert_notification
            from db_manager import get_user_fcm_tokens
            
            # FCM 토큰 가져오기
            tokens_data = get_user_fcm_tokens(user_id)
            
            if not tokens_data:
                print(f"[PriceAlert] No FCM tokens for user {user_id}")
                return
            
            # 변동률 계산
            if alert['buy_price']:
                change_pct = ((current_price - alert['buy_price']) / alert['buy_price']) * 100
            else:
                change_pct = 0
            
            # 모든 기기에 발송
            tokens = [t['token'] for t in tokens_data]
            result = send_price_alert_notification(
                tokens=tokens,
                symbol=alert['symbol'],
                alert_type=alert['type'],
                current_price=current_price,
                change_pct=change_pct,
                message=message
            )
            
            if result.get('success'):
                print(f"[PriceAlert] Push sent to {result.get('success_count', 0)} devices")
            else:
                print(f"[PriceAlert] Push failed: {result.get('error')}")
                
        except Exception as e:
            print(f"[PriceAlert] Push notification error: {e}")
    
    async def broadcast_notification(self, notification: Dict):
        """실시간 알림 브로드캐스트"""
        # WebSocket을 통해 클라이언트에 알림 전송
        # 실제 구현은 main.py의 ConnectionManager 사용
        pass
    
    def get_active_alerts_from_db(self) -> List[Dict]:
        """DB에서 활성 알림 가져오기"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, user_id, symbol, type, buy_price, threshold, target_price, quantity
            FROM price_alerts
            WHERE active = 1
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        alerts = []
        for row in rows:
            alerts.append({
                "id": row[0],
                "user_id": row[1],
                "symbol": row[2],
                "type": row[3],
                "buy_price": row[4],
                "threshold": row[5],
                "target_price": row[6],
                "quantity": row[7]
            })
        
        return alerts
    
    def deactivate_alert(self, alert_id: int):
        """알림 비활성화 (1회성)"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE price_alerts
            SET active = 0, triggered_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), alert_id))
        
        conn.commit()
        conn.close()
        
        print(f"[PriceAlert] Alert {alert_id} deactivated")
    
    def save_alert_history(self, notification: Dict):
        """알림 히스토리 저장"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO alert_history (
                user_id, symbol, type, message, 
                current_price, buy_price, threshold, triggered_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            notification['user_id'],
            notification['symbol'],
            notification['type'],
            notification['message'],
            notification['current_price'],
            notification['buy_price'],
            notification['threshold'],
            notification['triggered_at']
        ))
        
        conn.commit()
        conn.close()


# ============================================================
# 데이터베이스 헬퍼 함수
# ============================================================

def create_price_alerts_tables():
    """가격 알림 테이블 생성"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 알림 규칙 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            type TEXT NOT NULL,  -- 'stop_loss', 'take_profit', 'target_price'
            buy_price REAL,
            threshold REAL,  -- 퍼센트 (손절/익절용)
            target_price REAL,  -- 목표가 (절대값)
            quantity INTEGER,
            active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            triggered_at TIMESTAMP
        )
    """)
    
    # 알림 히스토리 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            current_price REAL,
            buy_price REAL,
            threshold REAL,
            triggered_at TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("[PriceAlert] Tables created")


def save_price_alert(
    user_id: str,
    symbol: str,
    alert_type: str,
    buy_price: float = None,
    threshold: float = None,
    target_price: float = None,
    quantity: int = None
) -> int:
    """가격 알림 저장"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO price_alerts (
            user_id, symbol, type, buy_price, threshold, target_price, quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, symbol, alert_type, buy_price, threshold, target_price, quantity))
    
    alert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return alert_id


def get_user_alerts(user_id: str, active_only: bool = True) -> List[Dict]:
    """사용자의 알림 목록 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, symbol, type, buy_price, threshold, target_price, 
               quantity, active, created_at, triggered_at
        FROM price_alerts
        WHERE user_id = ?
    """
    
    if active_only:
        query += " AND active = 1"
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    alerts = []
    for row in rows:
        alerts.append({
            "id": row[0],
            "symbol": row[1],
            "type": row[2],
            "buy_price": row[3],
            "threshold": row[4],
            "target_price": row[5],
            "quantity": row[6],
            "active": bool(row[7]),
            "created_at": row[8],
            "triggered_at": row[9]
        })
    
    return alerts


def delete_price_alert(user_id: str, alert_id: int) -> bool:
    """알림 삭제"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM price_alerts
        WHERE id = ? AND user_id = ?
    """, (alert_id, user_id))
    
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return deleted


def get_alert_history(user_id: str, limit: int = 50) -> List[Dict]:
    """알림 히스토리 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, symbol, type, message, current_price, 
               buy_price, threshold, triggered_at
        FROM alert_history
        WHERE user_id = ?
        ORDER BY triggered_at DESC
        LIMIT ?
    """, (user_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "symbol": row[1],
            "type": row[2],
            "message": row[3],
            "current_price": row[4],
            "buy_price": row[5],
            "threshold": row[6],
            "triggered_at": row[7]
        })
    
    return history


# 글로벌 모니터 인스턴스
price_alert_monitor = PriceAlertMonitor()
