package com.Stock

import android.annotation.SuppressLint
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Here you would normally send the token to your backend
        println("New FCM Token: $token")
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Wake the screen up
        wakeScreen()

        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "알림"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: ""
        val type = remoteMessage.data["type"] ?: "news_naver"

        // Map type to channel ID
        val channelId = when (type) {
            "price_alert", "market_alert", "coin_alert" -> "channel_price"
            "disclosure_alert", "dart_disclosure" -> "channel_disclosure"
            else -> "channel_news" // default
        }

        // Map type to custom sound
        val soundResId = when (channelId) {
            "channel_price" -> R.raw.sound_price
            "channel_disclosure" -> R.raw.sound_disclosure
            else -> R.raw.sound_news
        }
        val soundUri = Uri.parse("android.resource://$packageName/$soundResId")

        // Create an Intent to launch the app
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Create the notification
        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Using a default icon for now
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX) // Max priority for Heads-Up
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true) // Force wake screen & popup

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    @SuppressLint("WakelockTimeout")
    private fun wakeScreen() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "StockTrendApp::PushWakeLock"
        )
        wakeLock.acquire(3000) // Wake for 3 seconds
    }
}
