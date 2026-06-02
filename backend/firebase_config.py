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


def is_night_time_kst() -> bool:
    """한국 표준시(KST) 기준 야간(21:00 ~ 08:00) 여부 확인"""
    from datetime import datetime
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    return now.hour >= 21 or now.hour < 8


def sanitize_notification_text(title: str, body: str):
    """
    모바일 및 스마트워치(애플워치/갤럭시워치) 화면에서 글씨가 잘리지 않고 
    0.1초 만에 핵심 내용을 인지할 수 있도록 타이틀과 본문을 극도로 정교하게 요약하고 다듬습니다.
    스마트폰 및 스마트워치의 기본 확장 기능(Expandable Notification)을 해치지 않기 위해
    서버측 강제 자르기 한계를 대폭 완화하여 사용자가 전체 텍스트를 감상할 수 있게 합니다.
    """
    clean_title = title.strip() if title else "알림"
    clean_body = body.strip() if body else ""
    
    # 1. 스마트워치 및 모바일 공통 타이틀 슬림화
    if "장시작" in clean_title:
        market_name = "국내" if "국내" in clean_title else "미국" if "미국" in clean_title else ""
        clean_title = f"☀️ 장시작: {market_name}" if market_name else "☀️ 장시작 알림"
        
    elif "장마감" in clean_title:
        market_name = "국내" if "국내" in clean_title else "미국" if "미국" in clean_title else ""
        emoji = "📈" if "📈" in clean_title else "📉" if "📉" in clean_title else ""
        clean_title = f"🌕 장마감: {market_name} {emoji}".strip()
        
    elif "마켓 밸런스 브리핑" in clean_title:
        stock_part = clean_title.replace("⚖️", "").replace("AI", "").replace("마켓 밸런스 브리핑", "").strip()
        clean_title = f"⚖️ AI 브리핑: {stock_part}" if stock_part else "⚖️ AI 브리핑"

    # 일반 모바일 제목 길이 제한 완화 (충분히 한눈에 들어오도록 40자까지 허용)
    max_title_len = 40
    if len(clean_title) > max_title_len:
        clean_title = clean_title[:max_title_len - 2] + ".."

    # 2. 본문 다듬기 (스마트폰의 확장형 알림 지원을 위해 강제 자르기 길이 완화)
    if not clean_body:
        return clean_title, ""
        
    lines = clean_body.split("\n")
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 뉴스 제목 및 속보의 전체 전달을 위해 한 줄 최대 길이를 150자로 대폭 완화 (워치/폰 확장 시 전체 감상 가능)
        if len(line) > 150:
            line = line[:147] + ".."
        cleaned_lines.append(line)
        
    # 스마트워치와 모바일 배너 알림 한도에 맞추어 최대 15줄까지만 허용 (기존 5줄에서 대폭 늘려 수익률과 종목이 보이게 함)
    max_lines = 15
    if len(cleaned_lines) > max_lines:
        cleaned_lines = cleaned_lines[:max_lines - 1] + ["💬 상세 내용은 앱에서 확인!"]
        
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

    # [Korea Compliance] 한국 정보통신망법 야간(21:00 ~ 08:00) 광고성 알림 발송 제한
    # 단, 가격 변동 알림(급등/급락/신고가/손절/익절/목표가)은 실시간 투자 정보로서 24시간 허용
    PRICE_ALERT_KEYWORDS = ["admin", "관리자", "analytics", "보고서",
                            "급등", "급락", "신고가", "목표", "손절", "익절",
                            "가격", "도달", "auto_price", "포착", "경신",
                            "[test]", "connection verified"]
    is_price_or_admin = any(k in title.lower() for k in PRICE_ALERT_KEYWORDS)
    if is_night_time_kst() and not is_price_or_admin:
        print(f"[Firebase-NightBlock] Skipped sending notification during night time: {title}")
        return {"success": False, "error": "Night time restriction (21:00 - 08:00) active"}
    
    # 모바일 및 워치용 글씨 잘림 방지를 위한 자동 정돈 적용
    title, body = sanitize_notification_text(title, body)
    
    try:
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        click_url = (data or {}).get('url', 'https://stock-trend-program.co.kr')
        alert_type = (data or {}).get('type', '')
        symbol = (data or {}).get('symbol', '')
        
        # [Fix] 동일 알림 중복 수신 방지를 위한 Native Tag 생성
        if alert_type == 'disclosure_alert':
            fcm_tag = f"disc-{symbol}" if symbol else 'disc-alert'
        elif alert_type == 'news_alert' or alert_type == 'news_naver' or alert_type == 'news_google':
            fcm_tag = f"news-{symbol}" if symbol else 'news-alert'
        else:
            fcm_tag = f"stock-alert-{symbol}" if symbol else 'stock-alert'
        
        if alert_type in ['news_alert', 'news_naver', 'news_google', 'disclosure_alert']:
            import urllib.parse
            target_url = (data or {}).get('news_url', '') if alert_type != 'disclosure_alert' else (data or {}).get('dart_url', '')
            notif_title = title.split('\n')[0] if title else ''
            
            # 테스트 알림 호환성을 위해 target_url이 없으면 임시 구글 링크라도 넣음
            if not target_url: target_url = 'https://news.google.com'
                
            params = {'url': target_url}
            if symbol: params['symbol'] = symbol
            if notif_title: params['title'] = notif_title
            click_url = f"/news-redirect?{urllib.parse.urlencode(params)}"

        if click_url and not click_url.startswith('http'):
            click_url = f'https://stock-trend-program.co.kr{click_url}'
            
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon.png',
                badge='/badge.png',
                vibrate=[200, 100, 200],
                tag=fcm_tag,
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        # Android 설정
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts',
                priority='high',
                default_vibrate_timings=True,
                tag=fcm_tag
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
        print(f"[Firebase] Token is invalid or unregistered. Deleting from DB.")
        try:
            from db_manager import delete_fcm_token
            delete_fcm_token(token)
        except Exception as e:
            print(f"[Firebase] Failed to delete invalid token from DB: {e}")
        return {"success": False, "error": "Invalid token"}
    
    except Exception as e:
        print(f"[Firebase] Push failed: {e}")
        # check if it is related to invalid/unregistered token
        err_str = str(e).lower()
        if "unregistered" in err_str or "notregistered" in err_str or "invalid" in err_str:
            try:
                from db_manager import delete_fcm_token
                delete_fcm_token(token)
            except Exception as delete_err:
                print(f"[Firebase] Failed to delete token on catch-all: {delete_err}")
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

    # 중복 토큰 제거 (동일 기기 중복 발송 방지)
    if tokens:
        tokens = list(set(tokens))

    # [Korea Compliance] 한국 정보통신망법 야간(21:00 ~ 08:00) 광고성 알림 발송 제한
    # 단, 가격 변동 알림은 실시간 투자 정보로서 24시간 허용
    PRICE_ALERT_KEYWORDS = ["admin", "관리자", "analytics", "보고서",
                            "급등", "급락", "신고가", "목표", "손절", "익절",
                            "가격", "도달", "auto_price", "포착", "경신",
                            "[test]", "connection verified"]
    is_price_or_admin = any(k in title.lower() for k in PRICE_ALERT_KEYWORDS)
    if is_night_time_kst() and not is_price_or_admin:
        print(f"[Firebase-NightBlock] Skipped multicast notification during night time: {title}")
        return {"success": False, "error": "Night time restriction (21:00 - 08:00) active"}
    
    if not tokens:
        return {"success": False, "error": "No tokens provided"}
        
    # 모바일 및 워치용 글씨 잘림 방지를 위한 자동 정돈 적용
    title, body = sanitize_notification_text(title, body)
    
    try:
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        click_url = (data or {}).get('url', 'https://stock-trend-program.co.kr')
        alert_type = (data or {}).get('type', '')
        symbol = (data or {}).get('symbol', '')
        
        # [Fix] 동일 알림 중복 수신 방지를 위한 Native Tag 생성
        if alert_type == 'disclosure_alert':
            fcm_tag = f"disc-{symbol}" if symbol else 'disc-alert'
        elif alert_type == 'news_alert' or alert_type == 'news_naver' or alert_type == 'news_google':
            fcm_tag = f"news-{symbol}" if symbol else 'news-alert'
        else:
            fcm_tag = f"stock-alert-{symbol}" if symbol else 'stock-alert'
        
        # [Fix] 네이티브 WebPush 클릭 시에도 뉴스 속보 및 공시는 경유 페이지로 가도록 강제 처리
        if alert_type in ['news_alert', 'news_naver', 'news_google', 'disclosure_alert']:
            import urllib.parse
            target_url = (data or {}).get('news_url', '') if alert_type != 'disclosure_alert' else (data or {}).get('dart_url', '')
            notif_title = title.split('\n')[0] if title else ''
            
            if target_url:
                params = {'url': target_url}
                if symbol: params['symbol'] = symbol
                if notif_title: params['title'] = notif_title
                click_url = f"/news-redirect?{urllib.parse.urlencode(params)}"

        if click_url and not click_url.startswith('http'):
            click_url = f'https://stock-trend-program.co.kr{click_url}'
            
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon.png',
                badge='/badge.png',
                tag=fcm_tag,
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        # Android 설정 (네이티브 앱용 태그 추가)
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts',
                tag=fcm_tag
            )
        )
        
        # APNs 설정 (iOS)
        apns_config = messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound='default', badge=1)
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
            except messaging.UnregisteredError:
                failure_count += 1
                print(f"[Firebase] Token {idx} is unregistered. Deleting from DB.")
                try:
                    from db_manager import delete_fcm_token
                    delete_fcm_token(token)
                except Exception as e:
                    print(f"[Firebase] Failed to delete unregistered token from DB: {e}")
            except Exception as token_err:
                failure_count += 1
                print(f"[Firebase] Failed to send to token {idx}: {token_err}")
                err_str = str(token_err).lower()
                if "unregistered" in err_str or "notregistered" in err_str or "invalid" in err_str:
                    try:
                        from db_manager import delete_fcm_token
                        delete_fcm_token(token)
                    except Exception as e:
                        print(f"[Firebase] Failed to delete token on catch-all: {e}")
        
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
    가격 알림 전용 푸시 발송 (스마트워치 완벽 대응 버전)
    """
    # 알림 타입별 이모지 및 타입명
    alert_info = {
        'stop_loss': ('🚨', '손절'),
        'take_profit': ('🎉', '익절'),
        'target_price': ('🎯', '목표')
    }
    
    emoji, type_name = alert_info.get(alert_type, ('🔔', '가격'))
    
    # 0.1초 만에 알 수 있도록 종목명을 타이틀에 포함!
    try:
        from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
        stock_name = get_korean_stock_name(symbol) or GLOBAL_KOREAN_NAMES.get(symbol, symbol)
    except:
        stock_name = symbol
        
    title = f"{emoji} {type_name}: {stock_name}"
    
    # 본문의 가독성 극대화를 위해 현재가와 변동률을 본문 맨 앞줄에 배치!
    change_sign = "+" if change_pct > 0 else ""
    body_message = f"📉 {current_price:,.0f}원 ({change_sign}{change_pct:.2f}%)\n{message}"
    
    # 추가 데이터
    data = {
        "type": "price_alert",
        "symbol": symbol,
        "alert_type": alert_type,
        "current_price": str(current_price),
        "change_pct": str(change_pct),
        "url": f"/discovery?q={symbol}"
    }
    



