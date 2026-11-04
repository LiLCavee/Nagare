# NAGARE — Bug Fix Pass

**Date:** 2026-11-04 · **Scope:** 52 edits across 24 files + 1 new file
**Tree:** all fixes applied in-place under `nagare-fixed/` (full source dump, extracted from `NAGARE_SOURCE.md`)
**Verification:** all 68 TS/TSX files parse cleanly under TypeScript 5.2; grep sweep confirms zero leftover instances of every bug pattern below.

Apply by copying the changed files over your repo (or `diff -ru` this tree against it).

---

## Part 1 — Your original list

### 1. Auto-update / links pointed at upstream akuse ✅
`electron-updater` derives the release repo from `repository.url`, which still said `akuse-app/akuse` — `checkForUpdates()` could offer **upstream** releases over NAGARE.
- `package.json`: `repository.url`, `homepage`, `bugs.url` → `https://github.com/LiLCavee/Nagare`
- Discord "Download" buttons → `…/LiLCavee/Nagare/releases/latest` (`src/main/main.ts`, `src/renderer/components/player/VideoPlayer.tsx` ×2)
- `OPEN_NEW_ISSUE_URL` in `src/constants/utils.ts` → Nagare issues

> ⚠️ Updates only work once you **publish releases on `LiLCavee/Nagare`** (electron-builder writes `latest.yml` + the `win-nagare-*.exe` asset). `build.appId` and the `akuse://` protocol were intentionally **not** touched (AniList OAuth depends on them).

### 2. "Clear local history" didn't work ✅
- `src/modules/history.ts`: `setHistory()` no-op (`history = history`) → now assigns `history = newHistory` **and** writes the store, so the module cache can't resurrect old entries.
- `src/renderer/tabs/Tab4.tsx`: clear button now goes through `setHistory({ entries: {} })` instead of writing `STORE` directly, and broadcasts `update-section/history` so Continue Watching refreshes immediately.

### 3. Position lost when closing the player ✅
- `VideoPlayer.handleExit()` now calls `handleHistoryUpdate()` before `onClose()`, so quitting without pausing saves the timestamp.

### 4. History never saved when ani.zip failed / light mode ✅
- `handleHistoryUpdate`: `episodeList?.[episodeNumber] ?? { episodeNumber }` — no more throw on undefined list.
- Episode title/description reads in the source-load effect and in `changeEpisode` use optional chaining (`?.title?.en`) — missing indices no longer crash.

### 5. "Show duration" toggle flipped `dubbed` ✅
- `Tab4.handleShowDurationChange` → writes `show_duration`.

### 6. AniList progress fall-through + invalid status ✅
- `updateCurrentProgress`: `break` added to the REPEATING/COMPLETED case **and** the default; `'REWATCHING'` → `'REPEATING'` (the real AniList enum value). Rewatching no longer double-fires and no longer gets overwritten to CURRENT.

### 7. Skip-time settings conflict ✅
- `intro_skip_time` is one semantic: **seconds the "+" button jumps** (default 85). Tab4 already offered 60–95; the player gear menu now offers the same 60–95 list (85 included, so the label is no longer blank).

### 8. Provider headers & subtitles dropped ✅
- `playHlsVideo` now builds Hls with `xhrSetup` that attaches `source.headers` to every manifest/segment request.
- `changeEpisode` now passes `source.subtitles` through `setData(...)` — subtitle tracks survive episode switches.
- *Limitation (unchanged):* direct-MP4 sources (AnimeHeaven) can't carry custom headers through a native `<video src>` — browser limitation, would need a fetch/blob pipeline.

### 9. Quality wasn't Auto ✅
- `MANIFEST_PARSED` → `hls.currentLevel = -1` (true adaptive Auto) instead of `levels.length - 1`.

### 10. Update modal bugs ✅
- IPC listeners moved into `useEffect` with `removeListener` cleanup (no more per-render leak).
- Progress width fixed: `` `${info.percent}%` `` (was wrapped in literal quotes → invalid CSS).
- Bonus: `releaseNotes` arrays (electron-updater can send `string[]`) are now joined instead of coerced.

### 11. Rich Presence toggle did nothing ✅
- `rpcEnabled()` reads the `rich_presence` store key (default added: `rich_presence: true` in `storeVariables.ts`).
- Gates `RPC.login` at startup, every `setActivity()` call, and `update-presence` (clears the activity when disabled).
- *Note:* turning it **off** takes effect on the next presence update; turning it **on** after startup needs an app restart (login only runs at startup).

### 12. Tab3 scroll guard ✅
- `setLastUpdate(current)` instead of `setLastUpdate(lastUpdate)`.

### 13. Security notes ✅/ℹ️
- Stray `import { skip } from "node:test"` in `aniskip.ts` → **deleted**.
- Stray `import { stat } from 'fs'` in `AnimeModalElements.tsx` → **deleted** (same class of bug; renderer file importing Node fs).
- `clientSecret` in `clientData.ts` → **kept, deliberately.** AniList's OAuth for installed apps ships the secret inside the binary; it is already public in upstream akuse and in every packaged `app.asar`. Moving it to an env var would break the packaged login flow. If it bothers you, rotate it in AniList's client settings and treat it as public.
- `nodeIntegration: true / contextIsolation: false / webSecurity: false` → **kept** per architecture constraint #5 (that's a deliberate security refactor, not a bug fix).

---

## Part 2 — Additional bugs found in this pass & fixed

| # | Bug | Where | Fix |
|---|---|---|---|
| A1 | **Hero "Watch now" playback couldn't change episodes** — Slideshow never passed `providerAnimeId` to `VideoPlayer`, so next/prev episode called the provider with `undefined` | `Slideshow.tsx` | state added, prop passed |
| A2 | **Blank hero on refetch** — `currentIndex` could sit past the end of a shrunken slide list; empty list kept incrementing index forever | `Slideshow.tsx` | clamp effect + empty guards in `goToNext/goToPrevious` |
| A3 | **"Show more" on descriptions never appeared** — `ellipsis` state was declared but never set; the button is `display:none` without `.show-element` | `AnimeModalElements.tsx` | measure once on mount, `setEllpisis(isEllipsisActive())`, proper cleanup |
| A4 | **`deleteAnimeFromList` always truthy** — returned the whole GraphQL response object, so the UI "removed" items even when `deleted: false` | `anilistApi.ts` | returns `respData?.data?.DeleteMediaListEntry?.deleted === true` |
| A5 | **`updateRecommended` crashed on empty history** — `history[Math.random() * -1]` → `undefined.media` (unhandled rejection for logged-out, no-history users); also never picked the last element | `App.tsx` | empty guard + `Math.random() * history.length` |
| A6 | **Player force-played on mount** — `useEffect(() => { if (!isDragging) playVideo(); })` fired on initial render, racing the resume-seek | `BottomControls.tsx` | only resume after a real drag (`wasDraggingRef`) |
| A7 | **ESC closed every stacked modal** — the source-select modal and the anime modal both listened on `document` | `Modal.tsx` | ESC closes only the topmost visible `.modal-page-wrapper` (z-index, DOM-order tie-break); internal `selfRef` also makes the passed `modalRef` actually attach |
| A8 | **Duplicate React keys `[object Object]`** in every `Select` whose values are objects (section switcher, subtitle tracks) | `Select.tsx` | `key={label-index}` |
| A9 | **`NaN%` progress bars** — `entry.time / duration` when duration is 0 | `EpisodesSection.tsx` | guard `duration > 0` |
| A10 | **Junk airdates** — missing airdate rendered `"undefined undefined undefined"` | `utils.ts parseAirdate` | returns `''` for malformed input |
| A11 | **Build fragility: 6 files still imported types from the DMCA'd `@consumet/extensions`** — only compiled because ts-loader runs `transpileOnly` | `VideoPlayer, AnimeModal, Slideshow, TopControls, VideoSettings, cache.ts` | new `src/types/consumetTypes.ts` with local `ISource/IVideo/ISubtitle/IAnimeEpisode`; all imports repointed — the package name now appears only in a comment |
| A12 | **First-launch migration could silently skip entirely** — `copyFileSync` on a subdirectory throws, aborting the whole migrate block (caught → "skipped") | `main.ts` | `statSync(...).isFile()` guard |
| A13 | **Tab4 adult-content effect ran on every render** (missing deps) | `Tab4.tsx` | deps `[viewerId, userFetched]` |
| A14 | **Debug leftover** `console.log('ciao')` on every circle-button hover | `Buttons.tsx` | removed |

---

## Intentionally NOT changed

- **`build.appId` (`com.aleganza.akuse`) and the `akuse://` scheme** — AniList OAuth (client 18449, redirect `akuse://index`) is registered upstream against them; renaming silently kills login.
- **`@consumet/extensions` never reinstalled** — hard constraint #2; type imports removed instead (A11).
- **Dead code left in place** (harmless, noted for a future cleanup): `aniplay.ts`/`hianime.ts` provider wrappers (still dispatched by `api.ts` but migrated away by `getSourceFlag`), `UserNavbar.tsx` (unreferenced), `getFollowingUsers` (marked NOT WORKING), unused `ProviderCache` instances in the live wrappers, `getSourceFlag` (superseded by direct `source_flag` reads).
- **Doc drift (code kept, docs wrong):** features doc says arrow-key skip is "5/10/15/20" — every UI offers **1–5** for `key_press_skip`. Worth aligning the docs.

## Suggested follow-ups (not done — refactor scale)

1. Provider wrappers (`animeparadise/animeheaven/animeunity`) are copy-paste identical except Unity's `(ITA)` filter — collapse to one class.
2. `ipcRenderer` used directly from the renderer with `nodeIntegration:true, contextIsolation:false, webSecurity:false` — the preload/security refactor from the architecture doc.
3. Cap `provider_match_cache` growth (like `notified_airings`' 400-key cap).
4. Add a Settings toggle for `rich_presence` (the key works now; there's just no UI for it).
