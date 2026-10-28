# VANTRA – Android TV aplikácia

Jednoduchý WebView obal okolo nasadenej Vantry. Po nainštalovaní sa na televízore
zobrazí ako normálna aplikácia s ikonou v launcheri.

## Ako získať APK

1. Na GitHube otvor **Actions → Build Android TV APK → Run workflow**.
2. Do poľa `app_url` zadaj URL svojej nasadenej Vantry (napr. `https://vantra.vercel.app`).
   Musí to byť finálna adresa (bez presmerovania na inú doménu) – appka z bezpečnosti
   nepustí hlavnú stránku na žiadnu inú doménu.
3. Po dobehnutí buildu si zo stránky workflow runu stiahni artefakt **vantra-tv-apk**
   (je to zip, vo vnútri je `app-debug.apk`).

Lokálny build (ak máš Android SDK): `gradle -p android-tv assembleDebug -PvantraUrl="https://tvoja-url"`

## Inštalácia z USB na Android TV / Google TV

1. Skopíruj `app-debug.apk` na USB kľúč (FAT32/exFAT).
2. Na televízore povoľ inštaláciu z neznámych zdrojov:
   **Nastavenia → Aplikácie → Zabezpečenie a obmedzenia → Neznáme zdroje**
   a zapni ich pre svoj súborový manažér.
3. Nainštaluj si súborový manažér, ak žiadny nemáš (napr. *FX File Explorer*
   alebo *File Commander* z Google Play).
4. Pripoj USB, otvor ho v súborovom manažéri, klikni na `app-debug.apk` → Inštalovať.
5. VANTRA sa objaví medzi aplikáciami.

> Funguje na Android TV, Google TV a Fire TV. Samsung (Tizen) a LG (webOS)
> televízory APK nepodporujú – tam otvor Vantru v prehliadači TV s `?tv=1` na konci
> adresy (zapne TV režim), alebo pripoj Google TV Streamer / Chromecast s Google TV /
> Fire TV Stick a nainštaluj APK naň.

## Novinky vo verzii 1.4 (versionCode 5)

- Ovládanie hlasitosti sa v prehrávačoch nezobrazuje nikdy (ani pred skrytím ich UI).
- „Ďalšia epizóda“ ponúka len už odvysielané epizódy.
- Ten istý bridge funguje aj v PC prehliadači cez userscript (pozri hlavné README).

## Novinky vo verzii 1.3 (versionCode 4)

- Prehrávač má jedinú lištu – Vantru. UI embed prehrávača (VidLink…) sa po
  načítaní videa úplne skryje: žiadne stredové play, žiadna hlasitosť, žiadne
  „Control player“. Ostane len obraz.
- Všetky tlačidlá sú na lište a dá sa na ne prejsť šípkami: Späť, časová os,
  Play/Pauza, −10 s, +10 s, Titulky, Server, Ďalšia epizóda, Reload.
- **Titulky** z prehrávača (napr. VidLink) sa vyberajú priamo vo Vantre a kreslí ich
  Vantra. Slovenské sa zapnú samé, ak ich prehrávač má; voľba sa pamätá.
- Virtuálny kurzor je preč – titulky aj server sú na lište.

## Novinky vo verzii 1.2 (versionCode 3)

- WebView nikdy neotvorí systémovú klávesnicu (ani „napíš cez telefón“ na Google TV) –
  všetko sa píše vlastnou klávesnicou Vantry.
- Nové logo v launcheri a na banneri.
- User-Agent `VantraTV/1.2` – web podľa neho zapne TV režim.

Po zmene treba APK znova zbuildiť (Actions → Build Android TV APK) a nainštalovať.
Každý build z Actions je podpísaný iným debug kľúčom, preto starú VANTRU najprv
odinštaluj (inak TV hlási „Aplikácia nebola nainštalovaná“) a potom sa znova prihlás.

## Ovládanie

- **Šípky** = pohyb po stránke (ako Netflix / Disney+), **OK** = klik, **Späť** = o krok späť.
  Riadky si pamätajú, kde si skončil; po otvorení stránky je focus rovno na hlavnom tlačidle.
- **Textové polia** (login, vyhľadávanie, profil, admin): OK otvorí vlastnú on-screen
  klávesnicu – systémová TV klávesnica ani „napíš cez telefón“ sa nikdy neotvorí.

### Prehrávač

| Tlačidlo | Akcia |
|---|---|
| OK | play / pauza (ak prehrávač ešte nebeží, spustí ho) |
| ◀ / ▶ | posun −10 s / +10 s (držanie zrýchľuje) |
| ▲ / ▼ | ukáže lištu; potom šípky chodia po tlačidlách a OK ich stlačí |
| Play/Pause, ⏩, ⏪, ⏭ | fungujú vždy |
| Späť | zavrie panel, inak ukončí prehrávanie |

- **Lišta**: hore Späť, dole časová os (◀ / ▶ posúva) a tlačidlá Play/Pauza, −10 s, +10 s,
  Titulky, Server, Ďalšia epizóda, Reload. UI samotného prehrávača je skryté.
- **Hlasitosť** sa v prehrávači nenastavuje vôbec – je zamknutá na 100 % a nedá sa zmeniť
  ani stlmiť; hlasitosť sa rieši ovládačom TV.
- **Titulky**: zoznam berie Vantra z prehrávača (stopy videa aj titulky z jeho API).
  Ak server titulky neponúka, skús iný server.
- **Reklamy**: popupy (`window.open`), presmerovania, `intent://` odkazy a známe reklamné
  siete sú zablokované; klik do prehrávača ide cez Vantru, takže neodpáli „neviditeľnú“ reklamu.
- Po skončení epizódy sa po 10 s spustí ďalšia (dá sa zrušiť).
- **V prehliadači** (bez appky) sa do cudzieho prehrávača zasahovať nedá: Vantra má len
  hornú lištu (Späť, Server, Ďalšia epizóda, Reload) a keď sa schová, ovládač patrí
  rovno prehrávaču.

Ako to funguje: appka vkladá `app/src/main/assets/bridge.js` do každého rámca vrátane
cross-origin iframov embed prehrávačov (`WebViewCompat.addDocumentStartJavaScript`).
Potrebuje aktuálny Android System WebView (Google Play ho aktualizuje automaticky).
