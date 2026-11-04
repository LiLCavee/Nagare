/**
 * Local replacements for the type-only imports that previously came from
 * the DMCA'd `@consumet/extensions` package. Shapes mirror what the code
 * actually consumes (sources/headers/subtitles on ISource, url on IVideo,
 * lang on ISubtitle, title/summary on IAnimeEpisode).
 */

export interface IVideo {
  url: string;
  isM3U8?: boolean;
  quality?: string;
  [key: string]: any;
}

export interface ISubtitle {
  lang: string;
  url: string;
  label?: string;
  [key: string]: any;
}

export interface ISource {
  sources: IVideo[];
  subtitles?: ISubtitle[];
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface IAnimeEpisode {
  id?: string;
  number?: number;
  title?: string | { romaji?: string; english?: string; native?: string };
  image?: string;
  summary?: string;
  description?: string;
  [key: string]: any;
}
