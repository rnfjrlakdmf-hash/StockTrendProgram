"""
Firebase Cloud Messaging Configuration
FCM 푸시 알림 설정 및 발송
"""

import firebase_admin
from firebase_admin import credentials, messaging
import os
from typing import Dict, List, Optional

# Firebase Admin SDK 초기화 상태
_firebase_initialized = False


import json

def initialize_firebase():
    """Firebase Admin SDK 초기화"""
    global _firebase_initialized
    
    if _firebase_initialized:
        return
    
    if firebase_admin._apps:
        _firebase_initialized = True
        return
    
    # 1. Try Environment Variable (Production)
    env_creds = os.environ.get('FIREBASE_CREDENTIALS')
    if env_creds:
        try:
            cred_dict = json.loads(env_creds)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("[Firebase] Admin SDK initialized via Environment Variable")
            return
        except Exception as e:
            print(f"[Firebase] Failed to load credentials from Env Var: {e}")

    # 2. Try Local File (Development)
    cred_path = os.path.join(os.path.dirname(__file__), 'firebase-adminsdk.json')
    
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("[Firebase] Admin SDK initialized successfully from file")
        except Exception as e:
            print(f"[Firebase] Initialization failed from file: {e}")
    else:
        print("[Firebase] Warning: firebase-adminsdk.json not found and FIREBASE_CREDENTIALS not set")
        print("[Firebase] Push notifications will not work")



def sanitize_notification_text(title: str, body: str):
    """
    모바일 화면에 맞춰 알림 글씨가 잘리지 않고 예쁘게 나오도록 자동 정돈 및 요약
    """
    # 1. 제목 다듬기 (최대 26글자 제한하여 잘림 방지)
    max_title_len = 26
    clean_title = title.strip() if title else "알림"
    if len(clean_title) > max_title_len:
        clean_title = clean_title[:max_title_len - 2] + ".."

    # 2. 본문 다듬기 (줄 단위로 분석하여 모바일 가독성 최적화)
    if not body:
        return clean_title, ""
        
    lines = body.strip().split("\n")
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 한 줄이 너무 길면 38자 내외로 자름
        if len(line) > 38:
            line = line[:36] + ".."
        cleaned_lines.append(line)
        
    # 모바일 알림창 크기에 맞추어 최대 5줄까지만 허용 (나머지는 생략)
    max_lines = 5
    if len(cleaned_lines) > max_lines:
        cleaned_lines = cleaned_lines[:max_lines - 1] + ["💬 상세 내용은 앱에서 확인하세요!"]
        
    clean_body = "\n".join(cleaned_lines)
    return clean_title, clean_body


def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None
) -> Dict:
    """
    FCM 푸시 알림 발송
    """
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}
    
    # 모바일 글씨 잘림 방지를 위한 자동 정돈 적용
    title, body = sanitize_notification_text(title, body)
    
    try:
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        # Android 설정
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts',
                priority='high',
                default_vibrate_timings=True
            )
        )
        
        # iOS 설정
        apns_config = messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                    badge=1,
                    alert=messaging.ApsAlert(
                        title=title,
                        body=body
                    )
                )
            )
        )
        
        # Web 설정
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon.png',
                badge='/badge.png',
                vibrate=[200, 100, 200],
                require_interaction=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=data.get('url', 'https://stock-trend-program.vercel.app') if data else 'https://stock-trend-program.vercel.app'
            )
        )
        
        # 메시지 생성
        message = messaging.Message(
            notification=notification,
            data=data or {},
            token=token,
            android=android_config,
            apns=apns_config,
            webpush=webpush_config
        )
        
        # 발송
        response = messaging.send(message)
        print(f"[Firebase] Push sent successfully: {response}")
        return {"success": True, "response": response}
    
    except messaging.UnregisteredError:
        print(f"[Firebase] Token is invalid or unregistered")
        return {"success": False, "error": "Invalid token"}
    
    except Exception as e:
        print(f"[Firebase] Push failed: {e}")
        return {"success": False, "error": str(e)}


def send_multicast_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None
) -> Dict:
    """
    여러 기기에 동시 발송
    """
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}
    
    if not tokens:
        return {"success": False, "error": "No tokens provided"}
        
    # 모바일 글씨 잘림 방지를 위한 자동 정돈 적용
    title, body = sanitize_notification_text(title, body)
    
    try:
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        # Android 설정
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts'
            )
        )
        
        # iOS 설정
        apns_config = messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                    badge=1
                )
            )
        )
        
        # Web 설정
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon.png',
                badge='/badge.png'
            )
        )
        
        # 개별 발송 (SDK 버전 호환성 최대화)
        success_count = 0
        failure_count = 0
        
        for idx, token in enumerate(tokens):
            try:
                msg = messaging.Message(
                    notification=notification,
                    data=data or {},
                    token=token,
                    android=android_config,
                    apns=apns_config,
                    webpush=webpush_config
                )
                messaging.send(msg)
                success_count += 1
            except Exception as token_err:
                failure_count += 1
                print(f"[Firebase] Failed to send to token {idx}: {token_err}")
        
        print(f"[Firebase] Sent: {success_count}/{len(tokens)} successful")
        
        return {
            "success": True,
            "success_count": success_count,
            "failure_count": failure_count
        }
    
    except Exception as e:
        print(f"[Firebase] Multicast failed: {e}")
        return {"success": False, "error": str(e)}


def send_price_alert_notification(
    tokens: List[str],
    symbol: str,
    alert_type: str,
    current_price: float,
    change_pct: float,
    message: str
) -> Dict:
    """
    가격 알림 전용 푸시 발송
    """
    # 알림 타입별 이모지
    emoji_map = {
        'stop_loss': '🚨',
        'take_profit': '🎉',
        'target_price': '🎯'
    }
    
    emoji = emoji_map.get(alert_type, '🔔')
    title = f"{emoji} 가격 알림!"
    
    # 추가 데이터
    data = {
        "type": "price_alert",
        "symbol": symbol,
        "alert_type": alert_type,
        "current_price": str(current_price),
        "change_pct": str(change_pct),
        "url": f"/discovery?symbol={symbol}"
    }
    
    return send_multicast_notification(tokens, title, message, data)
    



