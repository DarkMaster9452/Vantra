# VANTRA – Android TV aplikácia

Jednoduchý WebView obal okolo nasadenej Vantry. Po nainštalovaní sa na televízore
zobrazí ako normálna aplikácia s ikonou v launcheri.

## Ako získať APK

1. Na GitHube otvor **Actions → Build Android TV APK → Run workflow**.
2. Do poľa `app_url` zadaj URL svojej nasadenej Vantry (napr. `https://vantra.vercel.app`).
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
> televízory APK nepodporujú – tam otvor Vantru v prehliadači.

## Ovládanie

- Šípky na ovládači = pohyb po stránke, OK = klik, Späť = o krok späť v appke.
- Fullscreen video z prehrávača funguje (tlačidlo fullscreen v prehrávači).
