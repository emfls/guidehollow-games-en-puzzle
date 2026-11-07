import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { publisherClid } from './build-context.mjs';

const batches = [
  'data/expansion-horror-idle.json',
  'data/expansion-shooting-simulation.json',
  'data/expansion-adventure-rpg-platform.json',
  'data/expansion-action-strategy-multiplayer.json',
  'data/expansion-card-board-creative.json',
];
const catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const byId = new Map(catalog.map(game => [game.id, game]));
const sites = JSON.parse(readFileSync('data/sites.json', 'utf8'));
const publicationOwners = new Map(sites.filter(site => site.locale === 'en').flatMap(site => site.gameIds.map(id => [id, site.genre])));
const sources = [];
let updated = 0;
for (const path of batches) {
  if (!existsSync(path)) continue;
  const batch = JSON.parse(readFileSync(path, 'utf8'));
  for (const game of batch.games) {
    if (!game.languages.some(language => language.replaceAll('_', '-').split('-')[0] === 'en')) throw new Error(`No native English support: ${game.id}`);
    for (const field of ['embedUrl', 'affiliateUrl']) {
      const url = new URL(game[field]);
      if (url.protocol !== 'https:' || url.searchParams.getAll('clid').length !== 1 || url.searchParams.get('clid') !== publisherClid) throw new Error(`Invalid publisher link: ${game.id}/${field}`);
    }
    const existing = byId.get(game.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(game)) throw new Error(`Batch would overwrite a different existing game: ${game.id}`);
    if (!existing) { catalog.push(game); byId.set(game.id, game); }
  }
  for (const [genre, gameIds] of Object.entries(batch.selections)) {
    const site = sites.find(site => site.id === `en-${genre}`);
    if (!site) throw new Error(`Unconfigured genre ${genre}`);
    if (gameIds.length !== 10 || new Set(gameIds).size !== 10) throw new Error(`Expected ten distinct selected games: ${genre}`);
    for (const id of gameIds) {
      const game = byId.get(id);
      if (!game) throw new Error(`Missing game ${id}`);
      const owner = publicationOwners.get(id);
      if (owner && owner !== genre) throw new Error(`English game ${id} belongs to both ${owner} and ${genre}`);
      if (!game.categories.some(category => site.sourceGenres.includes(category))) throw new Error(`Category mismatch: ${genre}/${id}`);
      publicationOwners.set(id, genre);
    }
    site.gameIds = gameIds;
    const frequency = new Map();
    for (const id of gameIds) for (const category of byId.get(id).categories) {
      if (category !== genre) frequency.set(category, (frequency.get(category) || 0) + 1);
    }
    site.subcategories = [...frequency.keys()].sort((a, b) => frequency.get(b) - frequency.get(a) || a.localeCompare(b));
    updated++;
  }
  sources.push(...(batch.sources || []));
}
writeFileSync('data/catalog.json', `${JSON.stringify(catalog, null, 2)}\n`);
writeFileSync('data/sites.json', `${JSON.stringify(sites, null, 2)}\n`);
writeFileSync('data/expansion-sources.json', `${JSON.stringify(sources, null, 2)}\n`);
console.log(`Merged ${updated} editorial genre selections; ${catalog.length} distinct games in the catalog. Publication flags were not changed.`);
