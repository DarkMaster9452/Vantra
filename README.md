# VANTRA
![image alt](https://github.com/balusikf/Vantra/blob/main/Screenshot%202026-05-05%20185215.png?raw=true)
> **This project is currently on hold and may or may not be continued in the future. It was a personal learning experience and is not in a fully finished state.**

VANTRA is a personal, private streaming platform built in the style of Netflix. Designed for personal use and a small group of friends. Entirely non-commercial and built **for educational purposes only**. No content is hosted or uploaded anywhere.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Full-stack React framework |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Supabase** | Database, authentication, file storage |
| **TMDB API** | Movie and TV show metadata |
| **AniList API** | Anime metadata (GraphQL) |
| **Vercel** *(planned)* | Hosting and deployment |

---

## How It Works

VANTRA fetches metadata from TMDB and AniList and displays it in a Netflix-style interface. Streaming is handled through embed providers (MultiEmbed, VidLink, AutoEmbed), which accept a TMDB or MAL ID and return a video player inside an iframe. No video content is stored or uploaded.

Access is restricted via an email whitelist in Supabase. Only pre-approved addresses can register. User data (watchlist, watch history, profile) is stored in a PostgreSQL database with Row Level Security enabled.

---

## Features

- Email whitelist authentication
- Browse and search movies, TV shows, and anime
- Detail pages with cast, trailer, photos, and episode lists
- Video player with multi-provider switching
- Watchlist and watch history (per user, persistent)
- Profile page with avatar upload and display name
![image alt](https://github.com/balusikf/Vantra/blob/main/Screenshot%202026-05-06%20172305.png?raw=true)
---

## What Was Not Finished

- Custom video player (Vidstack) with direct `.m3u8` stream links
- Subtitle support (CZ / EN) via OpenSubtitles
- Consumet / Anify API integration
- Video quality selection
- "Continue Watching" section
- PWA and TV Mode support
- Vercel deployment

---

## What I Learned

- **Next.js App Router** - server vs client components, dynamic routing with `[id]`
- **TypeScript** - typed props, API responses, and interfaces in a real project
- **Supabase** - PostgreSQL setup, Row Level Security, auth flows, storage
- **REST and GraphQL APIs** - TMDB REST API, AniList GraphQL, building proxy routes to avoid CORS
- **Component architecture** - reusable React components and state management
- **Tailwind CSS and Framer Motion** - responsive design and animations
- **Git and GitHub** - version control, keeping secrets out of repositories

### How Streaming Sites Actually Work

One of the most valuable things this project taught was understanding how informal streaming websites operate under the hood.

**The metadata layer** is straightforward. Sites like TMDB and AniList provide free APIs with everything you need: titles, descriptions, posters, ratings, cast, trailers, and episode lists. Any streaming site you have ever used is almost certainly pulling from these same sources.

**The actual video content** is a different story. There are a few approaches:

**Embed providers** are what VANTRA uses. Sites like MultiEmbed accept a TMDB ID in the URL and return a working video player inside an iframe. You never touch the actual video file. It is simple but limited - no control over the player UI, quality, or subtitles.

**Scraping and direct stream links** is how more advanced sites work. Tools like Consumet or Anify are open-source APIs that scrape video sources from streaming websites and extract direct `.m3u8` stream links. With those links you can use a custom player like Vidstack and have full control over quality, subtitles, and UI.

**The scraping problem** is that it is inherently unstable. Providers change their structure, add obfuscation, or shut down. That is why public Consumet instances get taken down frequently. It is a constant cat-and-mouse game.

**HLS and `.m3u8` files** - video streams online are rarely a single file. HTTP Live Streaming (HLS) splits video into small chunks served via a `.m3u8` playlist file. The player reads the playlist and requests chunks one by one. This is how Netflix, YouTube, and every modern streaming service delivers video.

**CORS and proxy routes** - browsers block direct requests to third-party APIs from frontend code. This is why VANTRA has its own `/api/anilist`, `/api/tmdb`, and `/api/stream` routes acting as server-side proxies. This is a pattern used by virtually every web app that talks to external APIs.

---

## Disclaimer

VANTRA is a personal, non-commercial project built for educational purposes only. It does not host, upload, store, or distribute any copyrighted media. Not intended for public use or distribution.

---

## Credits

Built with the assistance of **[Claude](https://claude.ai)** (by Anthropic) due to limited experience with TypeScript and full-stack development at the time. Claude helped with architecture, debugging, writing components, and explaining concepts throughout the process. Without that collaboration, this project would not have reached the state it is in.

---

*Made with curiosity, frustration, and a lot of Stack Overflow.*
