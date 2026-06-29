package com.stocktrend.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Google 로그인 WebView 차단 우회 (User-Agent에서 'wv' 제거)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            String userAgent = settings.getUserAgentString();
            userAgent = userAgent.replace("; wv", "");
            settings.setUserAgentString(userAgent);
        }
    }
}
