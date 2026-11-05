import axios from 'axios';
import {
  UnifiedMediaResult,
  UnifiedSources,
} from 'sofamaxxing.ts/dist/models/unifiedTypes';

/**
 * AniFam provider — talks directly to AniFam's public app API
 * (https://anifam.net/api/v1/app), the backend that powers the official
 * AniFam Android app.
 *
 * Playback comes back pre-aggregated from their server:
 *  - POST /episodes/{id}/play   → sources[] (self-hosted HLS relay + iframes)
 *  - POST /episodes/{id}/resolve → direct m3u8 for an iframe server_id
 *
 * The HLS relay (hls.dramahot.top) and the resolved megaplay CDN enforce
 * hotlink protection; Referer/Origin/User-Agent are injected for these hosts
 * at the network layer in src/main/main.ts (renderer XHR cannot set them).
 *
 * Sub/dub: search items carry sub/dub counts, episodes carry has_sub/has_dub,
 * and play accepts {"track":"sub"|"dub"}.
 */

const BASE_URL = 'https://anifam.net/api/v1/app';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

interface AniFamItem {
  id: number;
  slug: string;
  title: string;
  poster?: string | null;
  type?: string;
  sub?: number;
  dub?: number;
  eps?: number;
  score?: number;
  status?: string;
}

interface AniFamEpisode {
  id: number;
  number: number;
  title?: string;
  has_sub?: boolean;
  has_dub?: boolean;
  has_hsub?: boolean;
}

interface AniFamPlaySource {
  kind: 'hls' | 'iframe' | string;
  server?: string;
  server_id?: number;
  url?: string;
  media_headers?: Record<string, string>;
  qualities?: { height?: number; bandwidth?: number }[];
  subtitles?: { lang?: string; label?: string; url?: string }[];
  mirrors?: unknown[];
}

interface AniFamPlayResponse {
  episode_id?: number;
  track?: string;
  tracks?: string[];
  sources?: AniFamPlaySource[];
}

const toMediaResult = (item: AniFamItem): UnifiedMediaResult => ({
  id: String(item.id),
  title: item.title,
  image: !item.poster
    ? ''
    : item.poster.startsWith('http')
      ? item.poster
      : `https://anifam.net${item.poster}`,
  type: item.type,
  sub: item.sub,
  dub: item.dub,
  eps: item.eps,
  score: item.score,
  status: item.status,
});

const trackMatches = (item: AniFamItem, dubbed: boolean): boolean =>
  dubbed ? (item.dub ?? 0) > 0 : (item.sub ?? 0) > 0;

const qualityLabel = (height?: number): string => {
  if (!height) return 'default';
  if (height >= 900) return '1080p';
  if (height >= 600) return '720p';
  if (height >= 400) return '480p';
  return '360p';
};

const episodeCache = new Map<string, Promise<AniFamEpisode[]>>();

const fetchEpisodes = (animeId: string): Promise<AniFamEpisode[]> => {
  const cached = episodeCache.get(animeId);
  if (cached) return cached;

  const request = http
    .get(`/anime/${animeId}/episodes`)
    .then((response) => (response.data?.data ?? []) as AniFamEpisode[])
    .catch((error) => {
      console.log(error);
      episodeCache.delete(animeId);
      return [] as AniFamEpisode[];
    });

  episodeCache.set(animeId, request);
  return request;
};

const postPlay = async (
  episodeId: number,
  track: 'sub' | 'dub',
): Promise<AniFamPlayResponse | null> => {
  try {
    const { data } = await http.post(`/episodes/${episodeId}/play`, {
      track,
    });
    return data as AniFamPlayResponse;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const postResolve = async (
  episodeId: number,
  serverId: number,
): Promise<AniFamPlaySource | null> => {
  try {
    const { data } = await http.post(`/episodes/${episodeId}/resolve`, {
      server_id: serverId,
    });
    return data as AniFamPlaySource;
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * Cheap sanity check for resolved fallback streams: the playlist must be
 * HLS and must not reference the anti-hotlink image slideshow that
 * megaplay.buzz currently serves instead of video (tiktokcdn ad images).
 * Header-bearing requests work from the renderer because Referer/Origin
 * are injected for these hosts in src/main/main.ts.
 */
const isPlayableStream = async (
  url: string,
  headers: Record<string, string>,
): Promise<boolean> => {
  try {
    const { data } = await axios.get(url, {
      headers,
      timeout: 10000,
      responseType: 'text',
      transformResponse: [(body) => body],
    });
    const text = String(data);
    if (!text.includes('#EXTM3U')) return false;

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    let segment = lines.find((line) => !line.startsWith('#'));
    if (!segment) return false;

    let baseUrl = url;
    // master playlist → follow the first variant before judging segments
    if (text.includes('#EXT-X-STREAM-INF')) {
      const variantUrl = new URL(segment, url).href;
      const variant = await axios.get(variantUrl, {
        headers,
        timeout: 10000,
        responseType: 'text',
        transformResponse: [(body) => body],
      });
      const variantText = String(variant.data);
      if (!variantText.includes('#EXTM3U')) return false;
      baseUrl = variantUrl;
      const variantLines = variantText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      segment = variantLines.find((line) => !line.startsWith('#'));
      if (!segment) return false;
    }

    const segmentUrl = new URL(segment, baseUrl).href;
    if (/tiktokcdn\.com|ad-site-sign|\.image(\?|$)/i.test(segmentUrl))
      return false;

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const toSubtitles = (
  subtitles?: { lang?: string; label?: string; url?: string }[],
): { url: string; lang: string; label?: string }[] =>
  (subtitles ?? [])
    .filter((subtitle) => !!subtitle.url)
    .map((subtitle) => ({
      url: subtitle.url!,
      lang: subtitle.lang ?? 'en',
      label: subtitle.label ?? subtitle.lang ?? 'English',
    }));

class AniFamAPI {
  searchInProvider = async (
    query: string,
    dubbed: boolean,
  ): Promise<UnifiedMediaResult[] | null> => {
    try {
      const { data } = await http.get('/search', { params: { q: query } });
      const items: AniFamItem[] = data?.data ?? [];
      if (!items.length) return [];

      const matching = items.filter((item) => trackMatches(item, dubbed));
      return (matching.length ? matching : items).map(toMediaResult);
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  /**
   * @returns best title match for automatic provider matching
   */
  searchMatchInProvider = async (
    animeTitles: string[],
    index: number,
    dubbed: boolean,
    releaseDate: number,
  ): Promise<UnifiedMediaResult | null> => {
    try {
      for (const animeSearch of animeTitles) {
        const { data } = await http.get('/search', {
          params: { q: animeSearch },
        });
        const items: AniFamItem[] = data?.data ?? [];
        if (!items.length) continue;

        const matching = items.filter((item) => trackMatches(item, dubbed));
        const pool = matching.length ? matching : items;

        const normalize = (value: string) => value.toLowerCase().trim();
        const target = normalize(animeSearch);

        // exact title first, then partial containment
        const exact = pool.filter((item) => normalize(item.title) === target);
        const partial = pool.filter((item) => {
          const title = normalize(item.title);
          return title.includes(target) || target.includes(title);
        });

        const picked = exact[index] ?? partial[index] ?? null;
        if (picked) return toMediaResult(picked);
      }

      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  getEpisodeSource = async (
    animeId: string,
    episode: number,
    dubbed: boolean,
  ): Promise<UnifiedSources | null> => {
    try {
      const episodes = await fetchEpisodes(animeId);
      const target = episodes.find(
        (entry) => Number(entry.number) === Number(episode),
      );
      if (!target) return null;

      // requested track first, then fall back to the other one
      const requestedTrack: 'sub' | 'dub' = dubbed ? 'dub' : 'sub';
      let play = await postPlay(target.id, requestedTrack);
      if (!play?.sources?.length) {
        const fallbackTrack = requestedTrack === 'sub' ? 'dub' : 'sub';
        play = await postPlay(target.id, fallbackTrack);
      }
      if (!play?.sources?.length) return null;

      // preferred: AniFam's own relayed HLS mirror
      const relay = play.sources.find(
        (source) => source.kind === 'hls' && !!source.url,
      );
      if (relay?.url) {
        return {
          sources: [
            {
              url: relay.url,
              quality: qualityLabel(relay.qualities?.[0]?.height),
              isM3U8: true,
            },
          ],
          headers: relay.media_headers ?? {},
          subtitles: toSubtitles(relay.subtitles),
        } as UnifiedSources;
      }

      // otherwise resolve iframe servers (megaplay) in advertised order
      const iframeServers = play.sources.filter(
        (source) => source.kind === 'iframe' && !!source.server_id,
      );
      for (const iframe of iframeServers) {
        const resolved = await postResolve(target.id, iframe.server_id!);
        if (!resolved?.url) continue;

        const headers = resolved.media_headers ?? {};
        // eslint-disable-next-line no-await-in-loop
        if (!(await isPlayableStream(resolved.url, headers))) continue;

        return {
          sources: [
            {
              url: resolved.url,
              quality: qualityLabel(resolved.qualities?.[0]?.height),
              isM3U8: true,
            },
          ],
          headers,
          subtitles: toSubtitles(resolved.subtitles),
        } as UnifiedSources;
      }

      // no playable source: relay missing and all fallbacks dead
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };
}

export default AniFamAPI;
