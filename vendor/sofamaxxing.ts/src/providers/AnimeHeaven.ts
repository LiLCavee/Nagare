import axios from "axios";
import { UnifiedMediaInfo, UnifiedSources } from "../models/unifiedTypes";
import Provider from "../models/provider";
import { MediaResult, Search } from "../models/types";
const cheerio = require("react-native-cheerio");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

class AnimeHeaven extends Provider {
  override name = "AnimeHeaven";
  baseUrl = "https://animeheaven.me";
  languages = "en";
  colorHEX = "#e81e2f";
  logo = "https://animeheaven.me/favicon.ico";
  readonly forRN = true;

  private http = axios.create({
    baseURL: this.baseUrl,
    headers: { "User-Agent": UA, Referer: `${this.baseUrl}/` },
    timeout: 20000,
  });

  async search(query: string): Promise<Search<MediaResult>> {
    const res = await this.http.get(`/search.php?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(res.data);
    if (!$) return { results: [] };
    const searchResult: Search<MediaResult> = {
      hasNextPage: false,
      results: [],
    };
    $(".similarimg").each((_: number, el: any) => {
      const href = $(el)?.find("a")?.attr("href") ?? "";
      searchResult.results.push({
        id: href.split("anime.php?")[1] ?? "",
        title: $(el)?.find(".similarname.c a.c")?.text().trim(),
        image: `${this.baseUrl}/${$(el)?.find("img.coverimg")?.attr("src")}`,
      } as unknown as MediaResult);
    });
    return searchResult;
  }

  async fetchInfo(id: string): Promise<UnifiedMediaInfo> {
    const res = await this.http.get(`/anime.php?${id}`);
    const $ = cheerio.load(res.data);
    const info: any = {
      id,
      hasSeasons: false,
      title: $(".infotitle.c")?.text().trim(),
      description: $(".infodes.c")?.text().trim(),
      genres: $("boxitem.bc2.c1")
        .map((_: number, el: any) => $(el).text().trim())
        .get(),
      totalEpisodes: parseInt($($(".inline.c2")[0]).text().trim(), 10),
      releaseDate: {
        year: parseInt($($(".inline.c2")[1]).text().split("/")[0].trim(), 10),
      },
      rating: parseFloat($($(".inline.c2")[2]).text().trim().split("/")[0]),
      cover: $(".posterimg").attr("src"),
      synonyms: $(".infotitlejp.c")
        ? [$(".infotitlejp.c").text().trim()]
        : undefined,
      episodes: [] as { id: string; number: number }[],
    };

    // current markup: <a onclick='gatea("<hash>")' id="<hash>"> with .watch2 holding the number
    $("a[onclick*='gatea']").each((_: number, el: any) => {
      const hash = $(el).attr("id");
      const num = parseFloat($(el).find(".watch2.bc").text().trim());
      if (hash && !isNaN(num)) info.episodes.push({ id: hash, number: num });
    });

    // legacy fallback
    if (info.episodes.length === 0) {
      $(".ac3").each((_: number, el: any) => {
        info.episodes.push({
          id: $(el).attr("href")?.split("episode.php?")[1] ?? "",
          number: parseFloat($(el).find(".watch2.bc").text().trim()),
        });
      });
    }

    return info as UnifiedMediaInfo;
  }

  async fetchSources(id: string): Promise<UnifiedSources> {
    // id = episode hash; the gate requires a `key` cookie holding that hash
    const res = await this.http.get(`/gate.php`, {
      headers: { Cookie: `key=${id}`, Referer: `${this.baseUrl}/anime.php` },
    });
    const $ = cheerio.load(res.data);
    const episodeSources: UnifiedSources = { sources: [] } as UnifiedSources;

    $("#vid source, video source").each((i: number, el: any) => {
      const url = $(el).attr("src");
      if (!url) return;
      (episodeSources as any).sources.push({
        url: url.startsWith("http") ? url : `${this.baseUrl}${url}`,
        quality: i === 0 ? "default" : `backup ${i}`,
        isM3U8: false,
      });
    });

    if ((episodeSources as any).sources.length === 0)
      throw new Error("No sources found for episode");

    return episodeSources;
  }
}

export default AnimeHeaven;
