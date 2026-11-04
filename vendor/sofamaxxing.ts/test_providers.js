// Test harness for akuse providers
const path = require('path');

const providers = [
  ['AnimeParadise', './dist/providers/AnimeParadise'],
  ['AnimeHeaven', './dist/providers/AnimeHeaven'],
  ['AnimeUnity', './dist/providers/AnimeUnity'],
  ['AnimeToast', './dist/providers/AnimeToast'],
  ['AniPlay', './dist/providers/AniPlay'],
];

const QUERY = process.env.TEST_QUERY || 'Naruto';

async function testProvider(name, modPath) {
  const t0 = Date.now();
  try {
    const C = require(modPath).default;
    const api = new C();
    console.log(`\n[${name}] baseUrl=${api.baseUrl}`);

    const searchResults = await api.search(QUERY);
    const results = searchResults?.results ?? [];
    console.log(`[${name}] search OK → ${results.length} results (${Date.now() - t0}ms)`);
    if (!results.length) return { name, status: 'NO_RESULTS' };

    const first = results[0];
    console.log(`[${name}] first: ${typeof first.title === 'object' ? JSON.stringify(first.title) : first.title} id=${first.id} ${first.releaseDate ? 'year=' + first.releaseDate : ''}`);

    const info = await api.fetchInfo(first.id);
    const eps = info?.episodes ?? [];
    console.log(`[${name}] info OK → ${eps.length} episodes`);
    if (!eps.length) return { name, status: 'NO_EPISODES', search: true };

    const ep1 = eps.find((e) => e.number === 1) || eps[0];
    const src = await api.fetchSources(ep1.id);
    const srcs = src?.sources ?? [];
    console.log(`[${name}] sources OK → ${srcs.length} sources, first: ${srcs[0]?.url?.slice(0, 120) ?? 'none'} ${srcs[0]?.quality ? '(' + srcs[0].quality + ')' : ''}`);
    return { name, status: srcs.length ? 'FULL_OK' : 'NO_SOURCES', search: true, info: true };
  } catch (err) {
    console.error(`[${name}] FAILED: ${err.message?.slice(0, 300)}`);
    return { name, status: 'ERROR', error: err.message?.slice(0, 200) };
  }
}

(async () => {
  const summary = [];
  for (const [name, mod] of providers) {
    summary.push(await testProvider(name, mod));
  }
  console.log('\n===== SUMMARY =====');
  for (const s of summary) console.log(`${s.name}: ${s.status}`);
})();
