# NAGARE (流) — Feature List

**Version:** 1.10.1 · **Installer:** `win-nagare-1.10.1.exe` · **License:** GPL-3.0 · **Platform:** Windows (x64)

NAGARE is a free, open-source anime streaming & player desktop app (Electron).
It is the maintained, rebranded continuation of the archived `akuse` project,
rewired to working sources with a substantial feature upgrade.

---

## 1. Branding & Identity

- Product name **NAGARE (流)** everywhere: window title, installer, Start Menu
  shortcut, installed folder, app executable (`NAGARE.exe`), settings footer
  ("NAGARE v1.10.1"), update dialogs, Discord Rich Presence.
- First-launch **data migration**: settings, login token, and watch history are
  automatically copied from the old `akuse` AppData folder.
- Under the hood the `akuse://` protocol scheme and app-id are intentionally
  kept — AniList's registered OAuth redirect depends on them. Nothing visible
  uses them.

## 2. Streaming Sources (Providers)

Selectable in **Settings → General → language/source** (default AnimeParadise):

| Provider | Type | Notes |
|---|---|---|
| 🇺🇸 **AnimeParadise** | JSON API | Primary source; search, episode lists, HLS streams + captions + AniSkip data |
| 🇺🇸 **AnimeHeaven** | Cookie-gate scraping | MP4 mirrors (direct file streams) |
| 🇮🇹 **AnimeUnity** | Italian domain (`.co`) | Working domain after old one died |
| 🌐 **AniFam** | Direct API (`anifam.net`) | Backend of the official AniFam app: relayed HLS (hotlink headers injected in main process), sub/dub track switching, validated fallback streams |

- Dead sources (Gogoanime, old HiAnime, aniplay) were removed.
- The scraping library (`sofamaxxing.ts`) is **vendored** into the repo (the
  original `@consumet/extensions` was DMCA'd) and patched per-provider.
- Provider results are cached (`modules/providers/cache.ts`).

## 3. AniList Integration

- **Login** via AniList OAuth (`akuse://` deep link) with a **paste-code
  fallback** modal if the deep link doesn't fire.
- **Discover (home):** hero slideshow, Trending Now, Most Popular,
  Continue Watching, Because-you-watched recommendations.
- **Library:** your AniList lists (Planning/Current/Completed…).
- **Search:** titles with adult-content filter (AniList `displayAdultContent`).
- **Auto progress sync:** watched episodes are pushed to your AniList list
  (toggle in Settings → Sync & Storage).
- Works **logged-out** too — local history drives the home shelves.

## 4. Player

- **HLS** streaming (hls.js) with adaptive **Quality picker** incl. **Auto**.
- **Audio track switching** on multi-audio streams (sub/dub, languages).
- **Resume:** playback position saved per-episode; "Continue Watching"
  restores it; entries complete at 85%.
- **Skip Intro / Outro:** automatic button driven by **AniSkip** data
  (per MAL id + episode), plus a manual **+N seconds** intro skip (60–95s, default 85).
- **Subtitle styling:** size (S–XL) and color (5 colors) applied via
  `video::cue` CSS; subtitle language selection with memory.
- Playback speed (0.25×–2×), volume, arrow-key skip (1–5s, default 5),
  autoplay next episode, dubbed/subbed toggle (per source), episodes-per-page,
  show duration vs remaining time.
- Discord **Rich Presence** while watching.

## 5. Schedule & Notifications

- **Schedule tab — "This Week":** day-by-day calendar (Sun→Sat) of upcoming
  episodes from AniList's airing schedule, above the classic infinite-scroll
  "Recently Aired" feed.
- **Episode release notifications:** desktop notifications when a new episode
  airs for shows on your AniList list **or** in your local history
  (checked 45s after launch, then every 10 minutes; deduplicated;
  Settings → General toggle, on by default).

## 6. Settings (Settings tab)

- **General:** show 18+ content, episode release notifications.
- **Player:** source language, watch dubbed, autoplay, intro-skip duration,
  arrow-key skip amount.
- **Appearance:** show duration instead of remaining time, episodes per page.
- **Sync & Storage:** auto-update AniList progress, clear local history.
- Light mode (skips heavy home-screen fetches; via store flag).
- Version footer: **NAGARE v1.10.1** + OS info.

## 7. Platform / Distribution

- **Open source:** full GPL-3.0 history (877+ commits) in git; bundle ready
  for GitHub publishing (`PUSH_GUIDE.md` in the workspace).
- **Auto-update** plumbing (electron-update) with in-app update modal.
- NSIS installer: per-machine, user-selectable install directory, uninstall
  cleanly removes app data if chosen.
- No accounts, no ads, no telemetry.

---

### What NAGARE does NOT have (yet)

- Chromecast/AirPlay casting — deferred.
- Mobile / TV / console apps — deferred.
- Offline downloads — deferred (would need ffmpeg).
- Native watch-party — not present (Crunchyroll doesn't have one natively either).
