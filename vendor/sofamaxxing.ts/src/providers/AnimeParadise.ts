import { UnifiedMediaInfo, UnifiedSources } from "../models/unifiedTypes";
import Provider from "../models/provider";
import { MediaResult, Search } from "../models/types";
import axios from "axios";

const API = "https://api.animeparadise.moe";
const STREAM = "https://stream.animeparadise.moe";
const REFERER = "https://www.animeparadise.moe/";

class AnimeParadise extends Provider {
  override name = "AnimeParadise";
  baseUrl: string = "https://www.animeparadise.moe";
  languages = "en";
  colorHEX = "#e83635";
  logo = `${this.baseUrl}/icon/favicon-32x32.png`;
  readonly forRN = true;

  private http = axios.create({
    baseURL: API,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Referer: REFERER,
      Origin: this.baseUrl,
    },
  });

  async search(query: string): Promise<Search<MediaResult>> {
    const res = await this.http.get("/search", { params: { q: query } });
    const items: any[] = res.data?.data ?? [];
    return {
      hasNextPage: false,
      results: items.map((el) => ({
        id: el.link,
        title: el.title,
        image: el.posterImage?.large ?? el.posterImage?.medium ?? "",
        totalEpisodes: typeof el.episodes === "number" ? el.episodes : undefined,
        releaseDate:
          el.animeSeason?.year != null ? Number(el.animeSeason.year) : undefined,
      })) as unknown as MediaResult[],
    };
  }

  async fetchInfo(id: string): Promise<UnifiedMediaInfo> {
    const info = (await this.http.get(`/anime/${id}`)).data?.data;
    if (!info) throw new Error(`Anime not found: ${id}`);

    let episodes: { id: string; number: number }[] = [];
    try {
      const eps = (await this.http.get(`/anime/${info._id}/episode`)).data?.data ?? [];
      episodes = eps.map((el: any) => ({
        id: `${el.uid}?origin=${el.origin ?? info._id}`,
        number: Number(el.number),
      }));
    } catch {
      episodes = [];
    }

    return {
      id,
      hasSeasons: false,
      title: info.title,
      description: info.synopsys ?? info.description,
      genres: info.genres,
      synonyms: info.alternativeTitle
        ? ([] as string[]).concat(info.alternativeTitle).filter(Boolean)
        : info.synonyms,
      totalEpisodes: episodes.length || undefined,
      episodes,
    } as UnifiedMediaInfo;
  }

  async fetchSources(id: string): Promise<UnifiedSources> {
    // id format: `${uid}?origin=${animeObjectId}`
    const [uid, originRaw] = String(id).split("?origin=");
    const origin = originRaw ?? "";
    const res = await this.http.get(`/ep/${uid}`, { params: { origin } });
    const ep = res.data?.episode ?? res.data?.data?.episode;
    if (!ep?.streamLink) throw new Error("No stream link found for episode");

    const master = `${STREAM}/m3u8?url=${ep.streamLink}`;
    const sources: any[] = [{ url: master, quality: "default", isM3U8: true }];
    const subtitles: any[] = (ep.subData ?? [])
      .filter((el: any) => el.type === "vtt")
      .map((el: any) => ({ url: el.src, lang: el.label }));

    // enumerate quality variants from the master playlist
    try {
      const m3u8 = await axios.get(master, {
        headers: { Referer: REFERER, "User-Agent": this.http.defaults.headers["User-Agent"] },
        timeout: 15000,
      });
      if (typeof m3u8.data === "string" && m3u8.data.includes("EXTM3U")) {
        for (const line of m3u8.data.split("#EXT-X-STREAM-INF:")) {
          if (!line.includes("BANDWIDTH")) continue;
          const res2 = line.split("\n")[0];
          const path = line.split("\n")[1]?.trim();
          if (!path) continue;
          const url = path.startsWith("http") ? path : `${STREAM}${path}`;
          const quality = res2.includes("RESOLUTION=")
            ? `${res2.split("RESOLUTION=")[1].split("\n")[0].split("x")[1].split(",FRAME-RATE")[0]}p`
            : "default";
          sources.push({ url, quality, isM3U8: true });
        }
      }
    } catch {
      // master playlist alone is enough to play
    }

    return { sources, subtitles } as UnifiedSources;
  }
}

export default AnimeParadise;
