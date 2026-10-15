package com.tamld.tuneflow;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String PREFS_NAME = "tuneflow_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_PAIRING_CODE = "pairing_code";
    private static final String LOCAL_ASSET_FALLBACK = "file:///android_asset/public/index.html";
    private static final int SCAN_QR_REQUEST_CODE = 9001;

    private WebView webView;
    private boolean isTv;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide action bar for full immersive music experience
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        isTv = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_TYPE_MASK)
                == Configuration.UI_MODE_TYPE_TELEVISION;

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

        // Handle deep-link QR pairing if launched via tuneflow://pair?url=...
        handlePairingIntent(getIntent());

        String savedUrl = getSavedServerUrl();
        if (savedUrl != null && !savedUrl.isEmpty()) {
            loadConfiguredServer(savedUrl);
        } else {
            webView.loadUrl(isTv ? LOCAL_ASSET_FALLBACK + "?mode=tv" : LOCAL_ASSET_FALLBACK);
            showServerSetupDialog();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (handlePairingIntent(intent)) {
            String savedUrl = getSavedServerUrl();
            if (savedUrl != null && !savedUrl.isEmpty()) {
                loadConfiguredServer(savedUrl);
            }
        }
    }

    private boolean handlePairingIntent(Intent intent) {
        if (intent == null || intent.getData() == null) {
            return false;
        }
        Uri data = intent.getData();
        if ("tuneflow".equalsIgnoreCase(data.getScheme()) && "pair".equalsIgnoreCase(data.getHost())) {
            String urlParam = data.getQueryParameter("url");
            String codeParam = data.getQueryParameter("code");
            if (urlParam != null && !urlParam.trim().isEmpty()) {
                saveServerConfiguration(urlParam.trim(), codeParam);
                Toast.makeText(this, "Đã ghép nối máy chủ TuneFlow thành công!", Toast.LENGTH_SHORT).show();
                return true;
            }
        }
        return false;
    }

    private String getSavedServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        return prefs.getString(KEY_SERVER_URL, "");
    }

    private void saveServerConfiguration(String rawUrl, String pairingCode) {
        String normalized = normalizeServerUrl(rawUrl);
        SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
        editor.putString(KEY_SERVER_URL, normalized);
        if (pairingCode != null && !pairingCode.trim().isEmpty()) {
            editor.putString(KEY_PAIRING_CODE, pairingCode.trim());
        }
        editor.apply();
    }

    public static String normalizeServerUrl(String rawUrl) {
        if (rawUrl == null) {
            return "";
        }
        String trimmed = rawUrl.trim();
        if (trimmed.startsWith("tuneflow://pair")) {
            Uri uri = Uri.parse(trimmed);
            String extracted = uri.getQueryParameter("url");
            if (extracted != null && !extracted.isEmpty()) {
                trimmed = extracted.trim();
            }
        }
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            trimmed = "http://" + trimmed;
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private void loadConfiguredServer(String baseUrl) {
        String targetUrl = isTv ? baseUrl + "/?mode=tv" : baseUrl + "/";
        webView.loadUrl(targetUrl);
    }

    /**
     * Elderly-friendly server setup dialog:
     * - Mobile form factor: prominent "Quét mã ghép nối" (Scan Pairing QR) zero-typing button + manual fallback.
     * - TV form factor: D-Pad accessible manual entry (triggered on first run or via Remote MENU key).
     */
    private void showServerSetupDialog() {
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        container.setPadding(pad, pad / 2, pad, pad / 2);

        final EditText urlInput = new EditText(this);
        urlInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        urlInput.setHint("http://192.168.1.100:3000");
        String current = getSavedServerUrl();
        if (current != null && !current.isEmpty()) {
            urlInput.setText(current);
        }
        container.addView(urlInput);

        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle("Kết nối máy chủ TuneFlow")
                .setMessage(isTv
                        ? "Nhập địa chỉ máy chủ LAN TuneFlow (nhấn phím MENU trên điều khiển để mở lại bất kỳ lúc nào):"
                        : "Bấm \"Quét mã ghép nối\" để tự động kết nối không cần gõ chữ, hoặc nhập địa chỉ máy chủ bên dưới:")
                .setView(container)
                .setPositiveButton("Lưu & Kết nối", (dialog, which) -> {
                    String entered = urlInput.getText().toString().trim();
                    if (!entered.isEmpty()) {
                        saveServerConfiguration(entered, null);
                        loadConfiguredServer(getSavedServerUrl());
                    }
                })
                .setNegativeButton("Dùng chế độ cục bộ", (dialog, which) -> dialog.dismiss());

        if (!isTv) {
            builder.setNeutralButton("Quét mã ghép nối", (dialog, which) -> launchQrScanner());
        }

        builder.show();
    }

    /**
     * Launch zero-typing QR scanner intent (ZXing / ML Kit / system barcode scanner compatible).
     */
    private void launchQrScanner() {
        try {
            Intent scanIntent = new Intent("com.google.zxing.client.android.SCAN");
            scanIntent.putExtra("SCAN_MODE", "QR_CODE_MODE");
            scanIntent.putExtra("PROMPT_MESSAGE", "Đưa camera vào mã QR ghép nối trên màn hình TuneFlow");
            startActivityForResult(scanIntent, SCAN_QR_REQUEST_CODE);
        } catch (ActivityNotFoundException e) {
            Intent cameraIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("zxing://scan/?ret=tuneflow%3A%2F%2Fpair%3Furl%3D%7BCODE%7D"));
            try {
                startActivity(cameraIntent);
            } catch (ActivityNotFoundException ex) {
                Toast.makeText(
                        this,
                        "Thiết bị chưa có trình quét QR. Vui lòng dùng Camera quét mã QR trên màn hình máy chủ hoặc nhập địa chỉ thủ công.",
                        Toast.LENGTH_LONG
                ).show();
                showServerSetupDialog();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SCAN_QR_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            String contents = data.getStringExtra("SCAN_RESULT");
            if (contents != null && !contents.trim().isEmpty()) {
                String pairingCode = null;
                if (contents.startsWith("tuneflow://pair")) {
                    Uri uri = Uri.parse(contents);
                    pairingCode = uri.getQueryParameter("code");
                }
                saveServerConfiguration(contents, pairingCode);
                String savedUrl = getSavedServerUrl();
                if (!savedUrl.isEmpty()) {
                    Toast.makeText(this, "Đã ghép nối tự động: " + savedUrl, Toast.LENGTH_SHORT).show();
                    loadConfiguredServer(savedUrl);
                }
            }
        }
    }

    @Override
    public boolean onKeyLongPress(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_MENU) {
            showServerSetupDialog();
            return true;
        }
        return super.onKeyLongPress(keyCode, event);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Open manual server configuration dialog on TV MENU key
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showServerSetupDialog();
            return true;
        }
        // Forward TV Remote D-Pad Back event
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
