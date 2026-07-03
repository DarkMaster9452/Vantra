package sk.vantra.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {

    private WebView webView;
    private FrameLayout rootLayout;
    private View fullscreenVideoView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        rootLayout = new FrameLayout(this);
        webView = new WebView(this);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Session cookie musí prežiť reštart appky
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Všetko sa otvára vnútri appky (vrátane embed prehrávačov)
                return false;
            }
        });

        // Fullscreen video z iframe prehrávačov
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenVideoView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenVideoView = view;
                fullscreenCallback = callback;
                webView.setVisibility(View.GONE);
                rootLayout.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            }

            @Override
            public void onHideCustomView() {
                if (fullscreenVideoView == null) return;
                rootLayout.removeView(fullscreenVideoView);
                fullscreenVideoView = null;
                fullscreenCallback.onCustomViewHidden();
                fullscreenCallback = null;
                webView.setVisibility(View.VISIBLE);
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (fullscreenVideoView != null && fullscreenCallback != null) {
            rootLayout.removeView(fullscreenVideoView);
            fullscreenVideoView = null;
            fullscreenCallback.onCustomViewHidden();
            fullscreenCallback = null;
            webView.setVisibility(View.VISIBLE);
            return;
        }
        // Najprv dostane šancu stránka (zavrieť search overlay, zobraziť menu
        // prehrávača...) – až keď Back nespracuje, ideme v histórii späť.
        webView.evaluateJavascript(
                "(function(){try{return window.__vantraHandleBack?window.__vantraHandleBack():'unhandled'}catch(e){return 'unhandled'}})()",
                value -> {
                    if ("\"handled\"".equals(value)) return;
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        finish();
                    }
                });
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }
}
