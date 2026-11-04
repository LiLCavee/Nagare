# NAGARE — Architecture & Code Guide

Technical reference for maintainers. Companion to `NAGARE_FEATURES.md`.
Repo: `akuse-fixed` fork (GPL-3.0), rebranded **NAGARE** from `akuse-app/akuse`
(archived Feb 2026).

---

## 1. Stack

| Layer | Tech |
|---|---|
| Shell | Electron 26 (Chromium), NSIS packaging via electron-builder 24 |
| UI | React 18 + TypeScript, react-router (MemoryRouter), custom CSS (`src/styles/*.css`) |
| Build | electron-react-boilerplate (`.erb/configs/*`), webpack 5 (main + renderer legs), `cross-env` |
| Player | hls.js (HLS/adaptive), native `<video>`, custom controls |
| Backend API | AniList GraphQL (`https://graphql.anilist.co`) |
| Streams | 3 scrapers/APIs behind vendored `sofamaxxing.ts` |
| Persistence | `electron-store` → `config.json` in Electron userData |
| Extras | discord-rpc, electron-updater, react-hot-toast, AniSkip API |

## 2. Directory map

```
akuse/
├─ package.json            # productName NAGARE (top-level, drives app.name/exe/dir),
│                          # build.* (appId com.aleganza.akuse — DO NOT CHANGE),
│                          # protocols: akuse:// (AniList OAuth — DO NOT CHANGE)
├─ .erb/configs/           # webpack main/renderer/preload prod+dev configs
├─ release/
│  ├─ app/                 # staging app: package.json + native deps (discord-rpc,
│  │  ├─ package.json      #   register-scheme) installed for the packaged layout
│  │  └─ node_modules/     # (untracked — reinstall with `npm i` in release/app)
│  ├─ app/dist/            # webpack output: dist/main/main.js, dist/renderer/*
│  └─ build/               # electron-builder output: win-unpacked/, win-nagare-1.10.1.exe
├─ vendor/sofamaxxing.ts/  # VENDORED scraper lib (file: dependency, symlinked into
│  └─ dist/                #   node_modules) — patched: Paradise API, Heaven gate, Unity .co
├─ src/
│  ├─ main/main.ts         # Electron main: window, akuse:// protocol, migration, RPC, updater, IPC
│  ├─ constants/utils.ts   # EPISODES_INFO_URL, issue/sponsor URLs
│  ├─ modules/             # ALL business logic (no Electron/React deps where possible)
│  │  ├─ anilist/anilistApi.ts   # GraphQL queries/mutations (Bearer token from store)
│  │  ├─ providers/              # animeparadise.ts, animeheaven.ts, animeunity.ts,
│  │  │                          # api.ts (dispatcher), cache.ts, [aniplay/hianime = dead]
│  │  ├─ history.ts             # per-anime watch history in electron-store
│  │  ├─ aniskip.ts             # api.aniskip.com/v2/skip-times/{malId}/{ep}
│  │  ├─ subtitleStyle.ts       # injects video::cue CSS (size/color)
│  │  ├─ storeVariables.ts      # default store keys (setDefaultStoreVariables)
│  │  ├─ clientData.ts          # AniList OAuth clientId/secret/redirect (akuse://index)
│  │  ├─ requests.ts            # makeRequest/getOptions HTTP helpers
│  │  ├─ packaging/isAppImage.ts, os.ts, utils.ts
│  └─ renderer/
│     ├─ App.tsx            # root: contexts, tab routes, data fetching, release-notification poller
│     ├─ MainNavbar.tsx     # bottom pill nav: Discover / Library / Schedule / Search / Settings
│     ├─ tabs/              # Tab1 Discover · Tab2 Library · Tab3 Search · Tab4 Settings · Tab5 Schedule
│     ├─ components/        # AnimeEntry, AnimeSection, Slideshow, Select, modals (AnimeModal,
│     │  └─ player/         #  AuthCodeModal, AutoUpdate, Donate, User…)
│     │     ├─ VideoPlayer.tsx   # orchestration: source load, resume, skip, history, hls
│     │     ├─ BottomControls.tsx # transport, time, manual +N skip
│     │     ├─ TopControls.tsx    # quality/audio forwarding
│     │     └─ VideoSettings.tsx  # gear dropdown: quality, volume, speed, audio track,
│     │                          #  subtitle language/size/color, skip times
│     └─ styles/            # components.css, style.css, animations.css, responsive.css
```

## 3. Process model

**Main (`src/main/main.ts`)**
- Creates BrowserWindow (custom frameless UI), registers `akuse://`
  (`setAsDefaultProtocolClient`) + second-instance/open-url → OAuth `handleLogin`.
- **UserData migration** (runs before `new Store()`): if `config.json` doesn't
  exist in the new userData dir (`%APPDATA%\NAGARE`, from top-level
  `productName`), copies everything from legacy `akuse`/`akuse-beta` dirs.
- Discord RPC, electron-updater (`autoDownload=false`), IPC channels
  (`update-section`, `auto-update`, `console-log`), issue/sponsor links.

**Renderer**
- Single React app, `MemoryRouter` with routes `/`, `/tab2`…`/tab5`.
  Tabs stay mounted; visibility via CSS classes (`show-tab`).
- Contexts: `AuthContext` (logged || hasHistory), `ViewerIdContext`.
- Global store access: `electron-store` (`STORE.get/set`) used directly in
  components; defaults registered by `setDefaultStoreVariables()` on App render.

## 4. Data flow — key paths

### AniList API (`src/modules/anilist/anilistApi.ts`)
- Single GraphQL endpoint, `MEDIA_DATA` fragment shared by queries.
- Auth: `Authorization: Bearer <STORE access_token>` when present;
  `makeRequest(METHOD, GRAPH_QL_URL, headers, getOptions(query, variables))`.
- Important functions:
  - `getViewerId/getViewerInfo/getViewerList(s)` — profile & lists
  - `getTrendingAnime/getMostPopularAnime` — home shelves
  - `getAiredAnime(viewerId, amount, timeOffset, airingAt, page)` — airing
    schedules in window `(airingAt-timeOffset, airingAt]`; **works with future
    timestamps**, used by both Recently Aired (past) and This Week (future,
    one call per day-end, parallelized in Tab5)
  - `getMyWatchingIds(userId)` — MediaListCollection (CURRENT/REPEATING/
    PLANNING) ids for notification targeting
  - `getNextReleases`, `updateAnimeProgress`, `updateAnimeFromList`
- OAuth: `clientData.ts` (clientId 18449, redirect `akuse://index`).
  Deep-link failure → paste-code fallback in `AuthCodeModal`.

### Providers (`src/modules/providers/`)
- `api.ts` dispatches on store key `provider` (`ANIMEPARADISE|ANIMEHEAVEN|ANIMEUNITY`).
- AnimeParadise: `api.animeparadise.moe` — `/search?q=`, `/anime/{link}`,
  `/anime/{_id}/episode`, `GET /ep/{uid}?origin={_id}` (**origin param is
  mandatory**), stream via `stream.animeparadise.moe/m3u8?url=`, captions `/captions?url=`.
- AnimeHeaven: `/gate.php` + `Cookie key={hash}` → MP4 mirrors.
- AnimeUnity: `.co` domain (old domain CF-banned from datacenters).
- All through vendored `sofamaxxing.ts` (patched dist committed).

### Player pipeline (`VideoPlayer.tsx`)
1. Episode selected → provider `getSource…` → `{url, headers}` → hls.js attach
   (or direct MP4 for Heaven).
2. Resume: `getAnimeHistory(mediaId).history[ep]` → seek on metadata;
   `timeupdate` → `updateCurrentProgress`; complete at 85%.
3. Skip: AniSkip lookup by `media.idMal` + episode → `SkipEvent {op|ed|recap}`
   → "Skip Intro/Outro" button (5s debounce); manual +N via `key_press_skip`.
4. Subtitles: tracks from source; style applied by `applySubtitleStyle()`
   (reads `subtitle_size`/`subtitle_color`, writes `<style id="nagare-subtitle-style">`
   targeting `video::cue`).
5. Quality/audio: `hls.levels` → Select (`handleQualityChange` sets
   `currentLevel`, `-1` = Auto); `hls.audioTracks` → Audio Track Select
   (`currentAudioGroupIndex`).

### Schedule (Tab5) & notifications (App.tsx)
- **This Week:** 7 parallel `getAiredAnime` calls (window = each day-end,
  86400s), grouped client-side, rendered as day sections of `AnimeEntry`.
  Guarded by `weekAnime` null-check (fetch once).
- **Notifications poller:** `useEffect([viewerId])` — 45s delay then 10-min
  interval; builds id-set = local history (`getHistoryEntries()`) ∪
  `getMyWatchingIds`; fetches window `(now-15min, now+24h]`; for each schedule
  in-window and not in `notified_airings` store key → `new Notification()`;
  store trimmed to 400 keys. Disabled when `release_notifications === false`.

## 5. Persistence (electron-store keys)

| Key | Purpose |
|---|---|
| `access_token`, `logged`, `viewer…` | AniList session |
| `provider`, `dubbed`, `adult_content` | source & playback prefs |
| `history` | `{entries: {mediaId → {history: {ep: {time,timestamp,duration,data}}, data}}}` |
| `release_notifications` | notification toggle (default true) |
| `subtitle_size`, `subtitle_color`, `subtitle_language` | subtitle prefs |
| `intro_skip_time`, `key_press_skip`, `autoplay_next`, `show_duration`, `episodes_per_page`, `light_mode`, `rich_presence`… | misc |
| `notified_airings` | dedupe ledger for release notifications (max 400) |

## 6. Build & release

```bash
npm install                       # root deps (+ postinstall: native deps, dll)
(cd release/app && npm install)   # staging deps (discord-rpc, register-scheme)
npm run build                     # = build:main + build:renderer (concurrent!)
npx electron-builder build --win --publish never   # → release/build/win-nagare-1.10.1.exe
```

- **Pitfall 1:** the concurrent `npm run build` is RAM-hungry; renderer leg
  can exit 1/2 with no error — rerun `npm run build:renderer` alone until exit 0.
- **Pitfall 2:** `release/app/package.json` + `vendor/` are git-tracked and
  required at build time (webpack config requires `release/app/package.json`;
  `node_modules/sofamaxxing.ts` is a symlink into `vendor/`). Never delete them.
- **Pitfall 3:** `npx electron .` crashes (TS dev entry) — dev run is
  `npm start`; packaged smoke test is `xvfb-run -a npx electron release/app`
  with `--remote-debugging-port=PORT --remote-allow-origins=*` for CDP.
- Version bump: `package.json version`. Artifact name pattern
  `${os}-nagare-${version}.${ext}`.

## 7. Hard constraints (do not break)

1. **`akuse://` scheme + `appId com.aleganza.akuse`** — AniList OAuth
   redirect (`clientData.redirectUri = akuse://index`, client 18449) is
   registered upstream. Rebranding the *scheme* silently kills login.
2. **`@consumet/extensions` must never be reinstalled** (DMCA) — everything
   runs through vendored `sofamaxxing.ts`.
3. **AnimeParadise `/ep/{uid}` requires `?origin={_id}`** or it 404s.
4. Protocol registration happens in `main.ts` (`setAsDefaultProtocolClient`,
   called twice: after ready + second-instance handler) — keep both.
5. Renderer uses `ipcRenderer` directly (no preload contextIsolation
   pattern) — consistent with the original app; changing it is a security
   refactor, not a quick edit.

## 8. Git state

- Branch `main`, remotes: `upstream` (original akuse), user publishes fork.
- Key commits: `c62a8fc` revive/fix-login · `fe1fc78` feature round ·
  `e4d2134` complete NAGARE rebrand + migration + toggle.
- `AKUSE_FIXES.md` (repo root) documents the original repair log.
