> ## 🟢 revival notice (2026-11)
> **Rebranded as NAGARE (流)** — installs under the name **NAGARE** while
> keeping the `akuse://` protocol handler (required by AniList OAuth).
> Windows artifact: `win-nagare-<version>.exe`.
> This is a **working fork** of the archived `akuse-app/akuse`.
> The original sources (Yuki/Maze/Pahe, HiAnime, Gogoanime) are permanently dead —
> this fork rewires **AnimeParadise** (new JSON API), **AnimeHeaven** (cookie-gate),
> and **AnimeUnity** (new domain), removes the DMCA'd `@consumet/extensions` dependency,
> and builds a fresh Windows installer. See **[AKUSE_FIXES.md](./AKUSE_FIXES.md)**
> for the full diagnosis, test results, and how to build (`npm run package:win`).

<p align="center">
    <img width="120px" src="./assets/icon.png"/>
    <h1 align="center">NAGARE <sub>流</sub></h1>
</p>

<p align="center">
  <strong>Simple and easy to use anime streaming desktop app without ads.</strong>
</p>

<p align="center">
    <img alt="license" src="https://img.shields.io/github/license/LiLCavee/Nagare?style=for-the-badge&labelColor=1a1d24"> 
    <img alt="GitHub release (with filter)" src="https://img.shields.io/github/v/release/LiLCavee/Nagare?style=for-the-badge&labelColor=1a1d24">
    <img alt="total-downloads" src="https://img.shields.io/github/downloads/LiLCavee/Nagare/total?style=for-the-badge&labelColor=1a1d24">
    <a href="https://discord.gg/f3wdnqSNX5">
        <img alt="Discord" src="https://img.shields.io/discord/1163970236224118796?style=for-the-badge&labelColor=1a1d24&label=discord&logo=discord&color=%235567E3">
    </a>
</p>

<p align="center">
    <a href="https://ko-fi.com/aleganza">
      <img width="400px" src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/64f1a9ddd0246590df69ea0b_kofi_long_button_red%402x.png"/>
    </a>
</p>

<img title="img" alt="img" src="./assets/screenshot.jpg">

<br/>

# Why should you choose NAGARE?

- **🚀 Fast:** Smooth and quick streaming with minimal buffering (HLS with adaptive **Auto** quality).
- **🎨 Sleek UI:** User-friendly and eye-catching.
- **🔔 Never miss a release:** "This Week" schedule calendar + desktop episode-release notifications.
- **🛠 Actually maintained:** actively fixed, tested, and shipped via [GitHub Releases](https://github.com/LiLCavee/Nagare/releases) with in-app updates.
- **🆓 Free & open source:** no ads, no accounts required (optional AniList login for lists/progress).

<br/>

# Languages & sources

All sources below are live and selectable in **Settings → source**. Dead upstream sources (Yuki, Maze, Pahe, HiAnime, Gogoanime) were removed from the app.

| Source           | Languages       | Sub               | Dub               | Notes                                             |
| ---------------- | --------------- | ----------------- | ----------------- | ------------------------------------------------- |
| 🇺🇸 AnimeParadise | English + more  | ✅ (captions)     | ✅ when provided  | Default source; in-player captions + AniSkip data |
| 🇺🇸 AnimeHeaven   | English         | ✅ when provided  | ✅ when provided  | Direct MP4 mirrors (fast, no HLS buffering)       |
| 🇮🇹 AnimeUnity    | Italian         | ✅                | ✅                | Italian recommended                               |
| 🌐 AniFam         | English         | ✅                | ✅                | Official-app API; sub/dub tracks + English captions |

- Subtitles are configurable in the player gear menu: **language, size, and color**.
- Dub preference: **Settings → Player → Watch dubbed** (used whenever the source offers a dub track).
- Multi-audio streams expose an **Audio Track** switcher in the player.

# Other info

<details>
  <summary><h2>⚙️ Running locally for development</h2></summary>

Start cloning NAGARE:

```
git clone https://github.com/LiLCavee/Nagare.git
```

Next, go to [this link](https://anilist.co/settings/developer) and create a new AniList API Client.
As Redirect Uri, you can insert `akuse://index,https://anilist.co/api/v2/oauth/pin` (these are two space seprated uri) and it should work.
The repo ships with `src/modules/clientData.ts` already filled in (test credentials). For your own development, replace it with your own AniList API Client data, structured like this:

```bash
import { ClientData } from "../types/types";

export const clientData: ClientData = {
  clientId: ,
  redirectUri: "",
  clientSecret: "",
};
```

Fill it with the data retrieved from the creation of your AniList API Client.

```bash
# Example:
import { ClientData } from "../types/types";

export const clientData: ClientData = {
  clientId: 12345,
  redirectUri: 'akuse://index',
  clientSecret: 'iA04TKLO3k3LaVWhxucJwck0glR6uhiv',
};
```

Next, install its dependencies (make sure npm is installed on your machine):

```
npm install
```

To start, run:

```
npm start
```

</details>
<details>
  <summary><h2>⚠ How to Log-In in AppImage & Development</h2></summary>

In AppImage and in a Development environment, the Log-In redirect doesn't work since the app is not packed/installed. If you need to work with an authenticated instance, follow these steps:

1. open the app using one of the method e.g.

   ```
   npm start
   ```

   or

   ```
   ./path/to/app.AppImage
   ```

2. Now click on the login button and authenticate in the browser. Next, copy the code you are given, go back to NAGARE and click the navbar element with a laptop icon. Here you can paste your code.

3. Finally, paste your code and push the button. If the code you entered is correct, you are now Logged-in, othwerise repeat these steps and see what has gone wrong.

**NOTE:** This is not needed in Installed App.

</details>
<details>
  <summary><h2>⌨ Shortcuts</h2></summary>

- Pages
  - F1: go to Discover page
  - F2: go to Library page
  - F3: go to Search page
- Video player - Space: play/pause video - Left arrow: fast rewind (5s) - Right arrow: fast forward (5s) - Upper arrow: increase volume - Lower arrow: decrease volume - F11: fullscreen toggler - F: fullscreen toggler - M: mute/unmute video - P: play previous episode - N: play next episode
</details>

## 🐛 Known Issues

- If Log-In in installed apps doesn't work, make sure you have set a default browser.
- Some anime may not work due to different names compared to AniList. Feel free to open a new issue if you find any, so they can be fixed.

## 🌟 Contributors

[![](https://contrib.rocks/image?repo=akuse-app/akuse)](https://github.com/akuse-app/akuse/graphs/contributors)

## 🙌 Credits

- [sofamaxxing.ts](https://github.com/search?q=sofamaxxing): vendored scraper library (successor of the DMCA'd Consumet) used to fetch episode links
- [This API](https://api.ani.zip/mappings?anilist_id=21): used to fetch episodes info and thumbnails
- [AniSkip API](https://api.aniskip.com/api-docs#/skip-times/SkipTimesControllerV2_getSkipTimes): used to fetch episode intros & outros.
  <br/>

# Legal

## 📢 Disclaimer

- NAGARE helps users find anime by simply scraping links from various websites.
- NAGARE or its developers do not host the content found on NAGARE. All images and anime information found in the app are retrieved from AniList public API.
- Additionally, all anime links found on NAGARE are from various third party anime hosting websites.
- NAGARE or its owner are not responsible for the misuse of any content inside or outside the app and shall not be responsible for the dissemination of any content within the app.
- By using this app, you agree that the app developer is not responsible for the content within the app. Nevertheless, they may or may not come from legitimate sources.
- For internet violations, please contact the source website. The developer is not legally responsible.

## 📜 License

Licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html#license-text).
