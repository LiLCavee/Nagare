# Akuse — Revived Build (v1.10.1-fixed)

**TL;DR:** `akuse-1.10.1-fixed.exe` — install this on Windows. The archived Akuse app was
cloned, its dead sources rewired, and a fresh Windows installer was built from source.

## Why the original app was broken

The dev's own README (repo archived Feb 25, 2026): *"Almost all sources are broken."*
Diagnosis performed on Nov 1, 2026:

| Problem | Detail |
|---|---|
| **AniPlay sources (Yuki/Maze/Pahe — the default!)** | `aniplaynow.live` domain is parked/dead (ParkLogic parking page) |
| **HiAnime provider** | hianime.to shut down permanently on Mar 13, 2026; backup API (`sofamaxxing.vercel.app`) now requires a private API key |
| **Gogoanime provider** | depends on `@consumet/extensions` from GitHub — repo was **DMCA-takedown'd**, so the app couldn't even be installed/built anymore |
| **AnimeParadise scraper** | site rebuilt on a new Next.js frontend + hidden JSON API; old HTML selectors returned nothing |
| **AnimeHeaven scraper** | episode links now go through a cookie "gate" (`gate.php` + `key=` cookie); old `episode.php` endpoint 404s |
| **AnimeUnity scraper** | domain moved `.so` → `.co` |
| **Missing `src/modules/clientData.ts`** | gitignored file with the app's AniList OAuth config — recovered from the official 1.10.1 release build |

## What was changed

1. **Vendored `sofamaxxing.ts`** into `vendor/sofamaxxing.ts` (local, patched copy):
   - **AnimeParadise rewritten** against the site's live JSON API
     (`api.animeparadise.moe`: `/search`, `/anime/{link}`, `/anime/{id}/episode`,
     `/ep/{uid}?origin={id}` → HLS master on `stream.animeparadise.moe/m3u8?url=…`, VTT subtitles)
   - **AnimeHeaven rewritten**: parses new `gatea()` episode anchors, fetches sources via
     `gate.php` with `key=<hash>` cookie → direct MP4 URLs
   - **AnimeUnity** domain fixed (`.co`)
   - **AnimeToast** episode-tab selection fixed (legacy "Voe" tab gone)
   - Removed the two providers that required the DMCA'd `@consumet/extensions` package
   - Replaced consumet *types* with local structural equivalents
2. **Akuse app changes:**
   - removed `@consumet/extensions` dependency (app installs/builds again)
   - `sofamaxxing.ts` now points to the vendored, patched copy
   - provider list trimmed to working sources: **AnimeParadise** (default), **AnimeHeaven**, **AnimeUnity**
   - old flags (Yuki/Maze/Pahe/HiAnime/Gogoanime) auto-migrate to AnimeParadise
   - recreated `src/modules/clientData.ts` (AniList OAuth client from the official build)
3. **Built & verified:**
   - `npm run build` (webpack main+renderer) — clean
   - `npm run package:win` — NSIS installer produced
   - providers tested end-to-end from Node: search → episode list → **real video bytes**
   - app booted under Xvfb + CDP: home page loads live AniList data (screenshot in workspace)

## Test results (2026-11-01)

```
AnimeParadise: search=16 eps=293 sources=4 subs=4 ✅ (HLS segment bytes verified)
AnimeHeaven:   search=3  eps=74  sources=4        ✅ (MP4 range bytes verified)
AnimeUnity:    Cloudflare ASN block in datacenter ⚠️ — likely works from residential IPs
AniPlay/Yuki:  dead (parked domain) — removed
HiAnime:       dead (site shut down Mar 2026) — removed
Gogoanime:     dead + dependency DMCA'd — removed
```

## How to use

1. Run `akuse-1.10.1-fixed.exe` (SmartScreen → More info → Run anyway; unsigned OSS build)
2. Browse/search works out of the box — default source is **AnimeParadise**
3. Settings → Source to switch between AnimeParadise / AnimeHeaven / AnimeUnity
4. AniList login works (same OAuth client as the official app)

## Notes / caveats

- Streaming sources are third-party sites; they change. If one breaks, the vendored
  provider in `vendor/sofamaxxing.ts/src/providers/` is the file to patch (then `npm run package:win`).
- AnimeUnity may only work from residential IPs (site blocks datacenter ASNs).
- The two console quirks at startup (Discord RPC connect error, hls.js `media` promise)
  exist identically in the official build — harmless.

## Source

- https://github.com/akuse-app/akuse (archived, GPL-3.0)
- Fixes built on 2026-11-01; full patched source lives in `akuse/` in the workspace.


## NAGARE rebrand + quality-of-life round (this round)

- **Rebrand** — product name, window title, and Windows installer artifact are
  now **NAGARE** (`win-nagare-<version>.exe`). The Electron `appId`,
  single-instance id, and `akuse://` protocol stay unchanged because AniList's
  registered OAuth redirect for this app depends on them.
- **Schedule calendar** — the Schedule tab now shows a **This Week** section
  (day-by-day upcoming releases, AniList airing schedule) above Recently Aired.
- **Episode release notifications** — optional desktop notifications when a
  new episode airs for shows in your local history / AniList watching list
  (Settings → Episode Release Notifications; on by default).
- **Subtitle styling** — player settings gained Subtitle Size and Subtitle
  Color selectors.
- **Audio track switching** — streams with multiple audio tracks now expose an
  Audio Track selector in player settings.
- **Quality: Auto option** — the quality selector now includes Auto
  (adaptive) alongside the fixed levels.
