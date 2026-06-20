import os

content = """

def send_topic_push(
    topic: str,
    title: str,
    body: str,
    link: str = "/"
) -> dict:
    \"\"\"
    주제(Topic) 기반 푸시 알림 발송 (전체 알림 등에 사용)
    \"\"\"
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}
        
    try:
        from firebase_admin import messaging
        import urllib.parse
        
        # URL 처리
        if link and not link.startswith('http'):
            click_url = f'https://stock-trend-program.co.kr{link}'
        else:
            click_url = link
            
        title, body = sanitize_notification_text(title, body)
        
        # [고우선순위 설정] 핸드폰 꺼져있을때 깨우기
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts'
            )
        )
        
        apns_config = messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound='default', content_available=True, badge=1)
            )
        )
        
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon.png',
                badge='/badge.png',
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            topic=topic,
            android=android_config,
            apns=apns_config,
            webpush=webpush_config
        )
        
        response = messaging.send(message)
        print(f"[Firebase] Successfully sent message to topic '{topic}': {response}")
        return {"success": True, "message_id": response}
    except Exception as e:
        print(f"[Firebase] Error sending topic message: {e}")
        return {"success": False, "error": str(e)}
"""

with open(r"c:\Users\rnfjr\StockTrendProgram\backend\firebase_config.py", "a", encoding="utf-8") as f:
    f.write(content)
print("Appended send_topic_push!")
