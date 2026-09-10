package com.tamld.tuneflow;

import android.annotation.SuppressLint;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide action bar for full immersive music experience
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Check if running on TV or Mobile
        boolean isTv = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION;
        String startUrl = isTv ? "https://coral-shoe-leaf-alternatively.trycloudflare.com/?mode=tv" : "https://coral-shoe-leaf-alternatively.trycloudflare.com/";

        webView.loadUrl(startUrl);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Forward TV Remote D-Pad Back event
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
