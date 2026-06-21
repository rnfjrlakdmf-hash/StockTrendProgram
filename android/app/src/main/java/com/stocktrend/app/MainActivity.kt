package com.Stock

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            // FCM SDK (and your app) can post notifications.
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        createNotificationChannels()
        askNotificationPermission()

        setContent {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        setupWebView(this)
                        loadUrl("https://stock-trend-program.co.kr")
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(webView: WebView) {
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            // 1. News Channel
            val newsChannel = NotificationChannel(
                "channel_news",
                "뉴스 속보",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "주요 뉴스 속보 알림"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200, 100, 200)
                setSound(Uri.parse("android.resource://$packageName/raw/sound_news"), audioAttributes)
            }

            // 2. Price Channel
            val priceChannel = NotificationChannel(
                "channel_price",
                "가격 변동 알림",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "목표가 도달, 급등/급락 알림"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
                setSound(Uri.parse("android.resource://$packageName/raw/sound_price"), audioAttributes)
            }

            // 3. Disclosure Channel
            val discChannel = NotificationChannel(
                "channel_disclosure",
                "공시 알림",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "주요 공시 발생 알림"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 150, 100, 150, 100, 150)
                setSound(Uri.parse("android.resource://$packageName/raw/sound_disclosure"), audioAttributes)
            }

            notificationManager.createNotificationChannel(newsChannel)
            notificationManager.createNotificationChannel(priceChannel)
            notificationManager.createNotificationChannel(discChannel)
        }
    }
}
