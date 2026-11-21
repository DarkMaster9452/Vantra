package sk.vantra.tv;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/**
 * Blokovanie reklám podľa domény. Požiadavky na reklamné domény (aj ich
 * subdomény) WebView vôbec nenačíta.
 *
 * Dva zoznamy:
 *  - vstavaný (BUILTIN) – funguje hneď pri štarte appky
 *  - veľký zoznam z assets/adhosts.txt (HaGeZi Multi PRO + Pop-Up Ads, cca
 *    250 000 domén), stiahnutý pri builde APK skriptom
 *    android-tv/scripts/fetch-adhosts.sh. Je zoradený (LC_ALL=C sort -u),
 *    v pamäti zostane ako jedno pole bajtov a hľadá sa v ňom binárne.
 *
 * ALLOW sa nezablokuje nikdy (Vantra, embed prehrávače, TMDB, Plex), aj keby
 * ho niektorý zoznam omylom obsahoval.
 */
final class AdBlocker {

    // Reklamné / popup siete, ktoré embed prehrávače používajú najčastejšie
    private static final String[] BUILTIN = {
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
            // falošné „Confirm you're not a robot“ okná s QR kódom
            "qr-captcha.com",
    };

    // Embed prehrávače z /api/stream a služby, bez ktorých Vantra nefunguje
    private static final String[] ALLOW = {
            "vidlink.pro", "vidfast.pro", "videasy.net", "multiembed.mov", "embed.su", "vidsrc.xyz",
            "autoembed.cc", "vidnest.fun", "tmdb.org", "themoviedb.org", "anilist.co", "plex.direct",
            "plex.tv",
    };

    private final String appHost;
    private volatile byte[] data = new byte[0];
    private volatile int[] offsets = new int[0];

    AdBlocker(String appHost) {
        this.appHost = appHost == null ? "" : appHost.toLowerCase(Locale.ROOT);
    }

    /** Počet domén vo veľkom zozname (0 = zatiaľ nenačítaný / chýba). */
    int size() {
        return offsets.length;
    }

    /** Načíta zoradený zoznam domén (jedna na riadok). Volať mimo UI vlákna. */
    void load(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 22);
        byte[] buffer = new byte[1 << 16];
        int n;
        while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
        byte[] bytes = out.toByteArray();

        int lines = 1;
        for (byte b : bytes) {
            if (b == '\n') lines++;
        }
        int[] starts = new int[lines];
        int count = 0;
        int start = 0;
        for (int i = 0; i <= bytes.length; i++) {
            if (i == bytes.length || bytes[i] == '\n') {
                if (i > start) starts[count++] = start;
                start = i + 1;
            }
        }
        int[] trimmed = new int[count];
        System.arraycopy(starts, 0, trimmed, 0, count);

        // Binárne hľadanie potrebuje zoradený zoznam – inak ho radšej nepoužiť
        for (int i = 1; i < count; i++) {
            if (compareLines(bytes, trimmed[i - 1], trimmed[i]) >= 0) {
                throw new IOException("adhosts.txt is not sorted at line " + i);
            }
        }
        data = bytes;
        offsets = trimmed;
    }

    boolean isBlocked(String host) {
        if (host == null || host.isEmpty()) return false;
        host = host.toLowerCase(Locale.ROOT);
        // Povolená doména vyhráva, okrem jej konkrétnych reklamných subdomén
        // v zozname (napr. pixel.embed.su sa zablokuje, embed.su nie)
        int allowed = matches(host, appHost) ? appHost.length() : 0;
        for (String domain : ALLOW) {
            if (matches(host, domain)) allowed = Math.max(allowed, domain.length());
        }
        for (String ad : BUILTIN) {
            if (matches(host, ad) && ad.length() > allowed) return true;
        }
        // Doména a všetky jej nadradené domény (a.b.ads.com → b.ads.com → ads.com)
        byte[] bytes = data;
        int[] starts = offsets;
        if (starts.length == 0) return false;
        String candidate = host;
        while (candidate.indexOf('.') > 0 && candidate.length() > allowed) {
            if (contains(bytes, starts, candidate)) return true;
            candidate = candidate.substring(candidate.indexOf('.') + 1);
        }
        return false;
    }

    private static boolean matches(String host, String domain) {
        return !domain.isEmpty() && (host.equals(domain) || host.endsWith("." + domain));
    }

    private static boolean contains(byte[] bytes, int[] starts, String key) {
        int lo = 0;
        int hi = starts.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            int cmp = compare(bytes, starts[mid], key);
            if (cmp == 0) return true;
            if (cmp < 0) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }

    /** Riadok od pozície start (po '\n') porovnaný s key, bajt po bajte bez znamienka. */
    private static int compare(byte[] bytes, int start, String key) {
        int i = start;
        int k = 0;
        while (true) {
            boolean lineEnd = i >= bytes.length || bytes[i] == '\n';
            boolean keyEnd = k >= key.length();
            if (lineEnd || keyEnd) return lineEnd && keyEnd ? 0 : lineEnd ? -1 : 1;
            int a = bytes[i] & 0xFF;
            int b = key.charAt(k) & 0xFF;
            if (a != b) return a - b;
            i++;
            k++;
        }
    }

    private static int compareLines(byte[] bytes, int a, int b) {
        while (true) {
            boolean endA = a >= bytes.length || bytes[a] == '\n';
            boolean endB = b >= bytes.length || bytes[b] == '\n';
            if (endA || endB) return endA && endB ? 0 : endA ? -1 : 1;
            int x = bytes[a] & 0xFF;
            int y = bytes[b] & 0xFF;
            if (x != y) return x - y;
            a++;
            b++;
        }
    }
}
