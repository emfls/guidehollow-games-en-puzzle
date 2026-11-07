import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

// Run after the local editorial import. The compact evidence is committed;
// large provider descriptions and the complete raw catalog are not copied.
const directory = 'data/raw';
const records = new Map();
for (const file of readdirSync(directory).filter(file => file.endsWith('.json')).sort((a,b) => statSync(`${directory}/${a}`).mtimeMs - statSync(`${directory}/${b}`).mtimeMs)) {
  let value;
  try { value = JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')); } catch { continue; }
  for (const game of value.games || []) {
    if (game.slug && game.gameURL && game.supportedLanguages) records.set(game.slug, { game, file, retrievedAt: statSync(`${directory}/${file}`).mtime.toISOString() });
  }
}
const catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const evidence = [];
const sameSet = (a,b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
function withoutClid(value) {
  const url = new URL(value);
  url.searchParams.delete('clid');
  url.searchParams.sort();
  return url.href;
}
for (const selected of catalog) {
  const source = records.get(selected.id);
  if (!source) throw new Error(`No primary provider record: ${selected.id}`);
  const game = source.game;
  for (const [target, original] of [['languages','supportedLanguages'],['categories','genres']]) {
    if (!sameSet(selected[target], game[original])) throw new Error(`Provider ${target} mismatch: ${selected.id}`);
  }
  if (withoutClid(selected.embedUrl) !== withoutClid(game.gameURL)) throw new Error(`Provider embed URL mismatch: ${selected.id}`);
  if (withoutClid(selected.affiliateUrl) !== withoutClid(game.playgamaGameUrl)) throw new Error(`Provider page URL mismatch: ${selected.id}`);
  if (!game.images.includes(selected.thumbnail)) throw new Error(`Provider image mismatch: ${selected.id}`);
  const platforms = game.mobileReady.map(platform => ({'For Desktop':'Desktop','For Android':'Android','For IOS':'iOS'}[platform] || platform));
  if (!sameSet(selected.platforms, platforms)) throw new Error(`Provider device mismatch: ${selected.id}`);
  const { horizontal, vertical } = game.screenOrientation;
  const orientation = horizontal && vertical ? 'any' : horizontal ? 'landscape' : vertical ? 'portrait' : 'any';
  if (selected.orientation !== orientation) throw new Error(`Provider orientation mismatch: ${selected.id}`);
  evidence.push({ id: selected.id, retrievedAt: source.retrievedAt, sourceFile: source.file, title: game.title, gameURL: game.gameURL, playgamaGameUrl: game.playgamaGameUrl, genres: game.genres, supportedLanguages: game.supportedLanguages, mobileReady: game.mobileReady, screenOrientation: game.screenOrientation, images: game.images });
}
writeFileSync('data/provider-evidence.json', JSON.stringify({ source: 'https://widgets.playgama.com/api/v1/partner/export/catalogue/games', verifiedAt: new Date().toISOString(), gameCount: evidence.length, games: evidence }, null, 2) + '\n');
console.log(`Verified ${evidence.length} catalog entries against primary provider metadata and wrote a compact evidence snapshot.`);
