// Verzia Vantry – odvodená z histórie GitHub mergov.
// Pravidlo: pôvodný projekt = 1.0.0, každý zmergnutý PR do main = +1 minor.
// Pri každom novom PR pridaj záznam NAVRCH zoznamu (verzia o 1 vyššia).

export interface Release {
  version: string
  date: string
  /** Číslo PR na GitHube (pôvodná verzia ho nemá) */
  pr?: number
  title: string
  changes: string[]
}

export const REPO_URL = 'https://github.com/DarkMaster9452/Vantra'

export const RELEASES: Release[] = [
  {
    version: '1.8.0',
    date: '2026-10-11',
    pr: 9,
    title: 'Moderný dizajn a verzia aplikácie',
    changes: [
      'Nový moderný vzhľad celej appky – sklenené panely, Geist písmo, nové karty a tlačidlá',
      'Filtre kategórií v prehliadaní, skeleton načítavanie namiesto textu',
      'Verzia aplikácie a história zmien v profile (účet)',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-11',
    pr: 8,
    title: 'Ovládanie ovládačom ako Netflix',
    changes: [
      'Navigácia ovládačom na každý prvok, pamäť pozície v riadkoch',
      'Nový prehrávač: OK pauza, šípky posun, ďalšia epizóda, výber zdroja',
      'Blokovanie reklám a popupov, hlasitosť v streamoch zamknutá na 100 %',
      'Vlastná on-screen klávesnica pre všetky textové polia',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-03',
    pr: 6,
    title: 'Plex knižnica',
    changes: ['Prehrávanie z vlastnej Plex knižnice', 'Vlastný video prehrávač', 'Oprava rozloženia domovskej stránky'],
  },
  {
    version: '1.5.0',
    date: '2026-07-03',
    pr: 5,
    title: 'Nová domovská stránka',
    changes: ['Logo titulu v hero banneri, View All odkazy', 'Riadok Top Rated TV', 'Spoľahlivejšie poradie streamov'],
  },
  {
    version: '1.4.0',
    date: '2026-07-03',
    pr: 4,
    title: 'TV vyhľadávanie',
    changes: ['Vyhľadávanie s TV klávesnicou a návrhmi', 'Viac stream providerov', 'Prehrávanie priamo z kariet'],
  },
  {
    version: '1.3.0',
    date: '2026-07-02',
    pr: 3,
    title: 'Profily a PIN',
    changes: ['Výber profilu „Kto pozerá?“', 'Prihlásenie PIN-om na TV'],
  },
  {
    version: '1.2.0',
    date: '2026-07-02',
    pr: 2,
    title: 'TV navigácia a správa účtov',
    changes: ['Ovládanie šípkami na TV', 'Admin: vytváranie a správa účtov'],
  },
  {
    version: '1.1.0',
    date: '2026-07-02',
    pr: 1,
    title: 'Neon databáza a Android TV appka',
    changes: ['Presun z Supabase na Neon Postgres', 'Android TV aplikácia'],
  },
  {
    version: '1.0.0',
    date: '2026-04-28',
    title: 'Prvá verzia',
    changes: ['Katalóg filmov, seriálov a anime', 'Watchlist, história a profil'],
  },
]

export const APP_VERSION = RELEASES[0].version

/** Commit a čas buildu (dopĺňa next.config.ts pri builde) */
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || ''
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || ''
