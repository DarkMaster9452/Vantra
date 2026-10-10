package sk.vantra.tv;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends Activity {

    // Reklamné / popup siete – ich požiadavky sa vôbec nenačítajú
    private static final String[] AD_HOSTS = {
            "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
            "google-analytics.com", "googletagmanager.com", "googletagservices.com",
            "popads.net", "popcash.net", "propellerads.com", "propellerclick.com", "onclickads.net",
            "onclickalgo.com", "onclckads.com", "adsterra.com", "adsterratools.com", "exoclick.com",
            "exosrv.com", "juicyads.com", "trafficjunky.net", "hilltopads.net", "a-ads.com", "adcash.com",
            "ad-maven.com", "admaven.com", "clickadu.com", "monetag.com", "galaksion.com", "mgid.com",
            "taboola.com", "outbrain.com", "revcontent.com", "bidvertiser.com", "highperformanceformat.com",
            "profitabledisplaynetwork.com", "effectivegatecpm.com", "highcpmgate.com", "displayvertising.com",
            "realsrv.com", "tsyndicate.com", "adnxs.com", "rubiconproject.com", "pubmatic.com",
            "criteo.com", "criteo.net", "amazon-adsystem.com", "histats.com", "whos.amung.us",
            "mc.yandex.ru", "dtscout.com", "pushnami.com", "richpush.co", "zeroredirect1.com",
            "adsco.re", "adskeeper.com", "yllix.com", "popmyads.com", "clickaine.com", "aclib.net",
            "acscdn.com", "lijit.com", "33across.com", "inpagepush.com", "pushub.net", "vidoomy.com",
    };

    private WebView webView;
    private FrameLayout rootLayout;
    private View fullscreenVideoView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private String appHost;
    private String bridgeScript = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // TV sa počas pozerania nesmie uspať
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        appHost = Uri.parse(BuildConfig.APP_URL).getHost();
        bridgeScript = readAsset("bridge.js");

        rootLayout = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF000000);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(rootLayout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // Popupy z reklám: window.open nikdy neotvorí nové okno (onCreateWindow nižšie)
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        // Web podľa tohto spozná TV režim (vlastná klávesnica, ovládanie prehrávača)
        settings.setUserAgentString(settings.getUserAgentString() + " VantraTV/1.1");

        // Session cookie musí prežiť reštart appky
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Bridge skript do všetkých rámcov vrátane cross-origin iframov prehrávačov
        boolean documentStartSupported = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        if (documentStartSupported && !bridgeScript.isEmpty()) {
            WebViewCompat.addDocumentStartJavaScript(webView, bridgeScript, Collections.singleton("*"));
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                // intent://, market:// a podobné z reklám nikdy neotvárať
                if (scheme == null || !(scheme.equals("http") || scheme.equals("https"))) return true;
                // Celá appka zostáva na Vantre – reklamy nesmú presmerovať hlavnú stránku
                if (request.isForMainFrame()) {
                    String host = url.getHost();
                    return host == null || !host.equals(appHost);
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (host != null && isAdHost(host)) {
                    return new WebResourceResponse("text/plain", "utf-8",
                            new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Staršie WebView bez document-start skriptov: aspoň hlavný rámec
                if (!documentStartSupported && !bridgeScript.isEmpty()) {
                    view.evaluateJavascript(bridgeScript, null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            // Fullscreen video z iframe prehrávačov
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
                exitFullscreen();
            }

            // Nové okná (popup reklamy) sa nikdy nevytvoria
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                return false;
            }

            // JS dialógy povolíme len samotnej Vantre (napr. potvrdenie zmazania účtu)
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (isAppUrl(url)) return false;
                result.cancel();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (isAppUrl(url)) return false;
                result.cancel();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                if (isAppUrl(url)) return false;
                result.cancel();
                return true;
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private boolean isAppUrl(String url) {
        if (url == null) return false;
        String host = Uri.parse(url).getHost();
        return host != null && host.equals(appHost);
    }

    private static boolean isAdHost(String host) {
        for (String ad : AD_HOSTS) {
            if (host.equals(ad) || host.endsWith("." + ad)) return true;
        }
        return false;
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            byte[] buffer = new byte[in.available()];
            int read = 0;
            while (read < buffer.length) {
                int n = in.read(buffer, read, buffer.length - read);
                if (n < 0) break;
                read += n;
            }
            return new String(buffer, 0, read, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private void exitFullscreen() {
        if (fullscreenVideoView == null) return;
        rootLayout.removeView(fullscreenVideoView);
        fullscreenVideoView = null;
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
        webView.setVisibility(View.VISIBLE);
        webView.requestFocus();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (fullscreenVideoView != null) {
            exitFullscreen();
            return;
        }
        // Najprv dostane šancu stránka (zavrieť overlay, klávesnicu, menu
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
