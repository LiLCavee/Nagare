import { FuzzyDate, MediaEpisode, MediaFormat, MediaInfo, MediaResult, MediaStatus, Search, Sources } from './types';

/**
 * Local structural fallbacks for the consumet-shaped types.
 * (The upstream @consumet/extensions package was removed from GitHub via DMCA,
 * so we keep these definitions self-contained.)
 */
export interface CFuzzYDate {
  year?: number;
  month?: number;
  day?: number;
}
export interface IAnimeEpisode {
  id?: string | number;
  number?: number;
  title?: string;
  [key: string]: any;
}
export interface IAnimeInfo {
  id?: string | number;
  title?: any;
  episodes?: number;
  [key: string]: any;
}
export interface IAnimeResult {
  id?: string | number;
  title?: any;
  [key: string]: any;
}
export interface ISearch<T> {
  currentPage?: number;
  hasNextPage?: boolean;
  totalPages?: number;
  results: T[];
}
export interface ISource {
  sources: { url: string; quality?: string; isM3U8?: boolean; [key: string]: any }[];
  subtitles?: { url: string; lang?: string; label?: string; [key: string]: any }[];
  headers?: Record<string, string>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  [key: string]: any;
}
export type CMediaFormat = string;
export type CMediaStatus = string;

export type UnifiedMediaStatus = MediaStatus | CMediaStatus;
export type UnifiedMediaFormat = MediaFormat | CMediaFormat;
export type UnifiedSearch<T> = Search<T> | ISearch<T>;
export type UnifiedFuzzyDate = FuzzyDate | CFuzzYDate;
export type UnifiedMediaEpisode = MediaEpisode | IAnimeEpisode;
export type UnifiedMediaResult = MediaResult | IAnimeResult;
export type UnifiedMediaInfo = MediaInfo | IAnimeInfo;
export type UnifiedSources = Sources | ISource;
