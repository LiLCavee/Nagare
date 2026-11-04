const providers = [
  ['AnimeParadise', './dist/providers/AnimeParadise'],
  ['AnimeHeaven', './dist/providers/AnimeHeaven'],
  ['AnimeUnity', './dist/providers/AnimeUnity'],
  ['AniPlay', './dist/providers/AniPlay'],
];
const QUERY = 'Naruto';
(async () => {
  for (const [name, mod] of providers) {
    try {
      const C = require(mod).default;
      const api = new C();
      const sr = await api.search(QUERY);
      const results = sr?.results ?? [];
      if (!results.length) { console.log(`${name}: NO_RESULTS`); continue; }
      const first = results[0];
      const info = await api.fetchInfo(first.id);
      const eps = info?.episodes ?? [];
      if (!eps.length) { console.log(`${name}: search OK (${results.length}) but NO_EPISODES`); continue; }
      const ep1 = eps.find(e => e.number === 1) || eps[0];
      const src = await api.fetchSources(ep1.id);
      const n = src?.sources?.length ?? 0;
      console.log(`${name}: search=${results.length} eps=${eps.length} sources=${n} subs=${src?.subtitles?.length ?? 0} ${n ? '✅' : '❌'}`);
      if (n) console.log(`   url0: ${src.sources[0].url.slice(0, 110)}`);
    } catch (e) {
      console.log(`${name}: ERROR ${e.message?.slice(0, 160)}`);
    }
  }
})();
