import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = path => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
export const config = readJson('portal/config.json');
export const groups = readJson('data/genre-groups.json').groups;
export const provider = readJson('data/portal/catalog.json');
export const games = provider.games;
export const byId = new Map(games.map(game => [game.id, game]));
export const bySlug = new Map(games.map(game => [game.slug, game]));
export const curated = new Map(readJson('data/catalog.json').map(game => [game.id, game]));
const reviewedGuides = readJson('portal/locales/reviewed-guides.json');
export const preview = process.env.PORTAL_PREVIEW === '1';
export const localeIds = [...new Set(games.flatMap(game => game.locales))].sort();
export const copies = new Map(localeIds.map(locale => {
  const path = `portal/locales/${locale}.json`;
  if (!existsSync(resolve(process.cwd(), path))) throw new Error(`Missing localized portal UI: ${locale}`);
  return [locale, readJson(path)];
}));
export const localeGames = new Map(localeIds.map(locale => [locale, games.filter(game => game.locales.includes(locale))]));
export const collections = new Map(localeIds.map(locale => [locale, new Map(groups.map(group => [group.id, localeGames.get(locale).filter(game => game.genreIds.includes(group.id))]))]));
export const allCollections = new Map(groups.map(group => [group.id, games.filter(game => game.genreIds.includes(group.id))]));
const legacySites = readJson('data/sites.json').filter(site => site.locale === 'en');
export const recommendations = new Map(legacySites.map(site => [site.genre, site.gameIds]));
export const recommendationsAll = [...new Set(Array.from({length: Math.max(...legacySites.map(site => site.gameIds.length))}, (_, index) => legacySites.map(site => site.gameIds[index]).filter(Boolean)).flat())];
export const format = (text, values={}) => String(text).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
export const urlFor = path => new URL(path, config.origin).href;
export const playLocale = (locale, game) => game.locales.includes(locale) ? locale : game.locales.includes('en') ? 'en' : game.locales[0];
export const gamePath = (locale, game) => `/${playLocale(locale,game)}/play/${game.slug}/`;
export const listPath = (locale, genre, page=1) => `/${locale}/${genre ? `${genre}/` : ''}${page > 1 ? `page/${page}/` : ''}`;
export function editorial(game, locale) {
  if (!game.locales.includes(locale)) return null;
  const source = curated.get(game.id);
  const text = locale === 'en' ? (source || reviewedGuides.en?.[game.id]) : (source?.translations?.[locale] || reviewedGuides[locale]?.[game.id]);
  if (!text?.description || !text?.instructions) return null;
  if (text.description.trim().length < config.minimumGuideCharacters || text.instructions.trim().length < config.minimumGuideCharacters) return null;
  return { title: text.title || game.title, description: text.description, instructions: text.instructions };
}
const localizedMetadata = readJson('portal/locales/game-metadata.json');
function translateCommonTitle(source, locale) {
  if (locale === 'en') return source;
  const words = localizedMetadata.glossary?.[locale] || {};
  let title = source;
  for (const word of Object.keys(words).sort((a,b) => b.length - a.length)) {
    const pattern = '(?<![A-Za-z0-9])' + word.replaceAll(' ', '\\s+') + '(?![A-Za-z0-9])';
    title = title.replace(new RegExp(pattern, 'gi'), words[word]);
  }
  // Preserve the source name when the glossary cannot produce a complete translation.
  if (['ko','ja','zh'].includes(locale) && /[A-Za-z]{2,}/.test(title)) return source;
  return title;
}
export const titleFor = (game, locale) => {
  const manual = localizedMetadata.titles?.[locale]?.[game.id];
  if (manual) return manual;
  const written = editorial(game, locale)?.title;
  if (written) {
    if (['ko','ja','zh'].includes(locale) && /[^\x00-\x7f]/.test(written))
      return written.replace(/\s*\([A-Za-z][^)]{1,80}\)\s*$/, '').trim();
    return written;
  }
  return translateCommonTitle(game.title, locale);
};
export const summaryFor = (game, locale) => {
  const manual = localizedMetadata.summaries?.[locale]?.[game.id];
  if (manual) return manual;
  const guide = editorial(game, locale);
  const original = guide?.description || (locale === 'en' || !game.locales.includes(locale) ? game.description : '');
  if (original) {
    const plain = original.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim();
    const sentence = plain.match(/^.{20,160}?[.!?。！？](?=\s|$)/u)?.[0];
    return sentence || (plain.length > 137 ? plain.slice(0,136).replace(/\s+\S*$/, '')+'…' : plain);
  }
  const copy = copies.get(locale);
  const genre = game.genreIds.map(id => copy.genreNames[id]).find(Boolean) || copy.allGames;
  const devices = [...new Set(game.platforms.map(device => device === 'Desktop' ? copy.desktop : ['Android','iOS','Mobile'].includes(device) ? copy.mobile : '').filter(Boolean))].join(' · ');
  return format(localizedMetadata.templates[locale] || localizedMetadata.templates.en, {genre, devices:devices || copy.desktop});
};

export const genreIntroFor = (locale, genre, count) =>
  format(localizedMetadata.genreIntros?.[locale]?.[genre] || copies.get(locale).genreDescription, {count});
export const launchLanguageNoticeFor = locale => localizedMetadata.launchLanguageNotices?.[locale] || localizedMetadata.launchLanguageNotices.en;
export function listGames(entry) {
  return entry.genre ? allCollections.get(entry.genre) : games;
}
export function isIndexable(entry) {
  if (preview || ['search', '404'].includes(entry.type) || entry.page > 1) return false;
  if (entry.type === 'game') return Boolean(editorial(byId.get(entry.id), entry.locale));
  if (entry.type === 'genre') {
    const selected = collections.get(entry.locale).get(entry.genre);
    if (selected.length >= config.minimumIndexableCollectionGames) return true;
    // The five-game Korean horror guide is intentionally authored and fully supported.
    // Keep other undersized collections out of the index until their content is reviewed.
    return entry.locale === 'ko' && entry.genre === 'horror' && selected.length === 5
      && selected.every(game => Boolean(editorial(game, 'ko')));
  }
  return true;
}
export function relatedGames(game, locale, limit=6) {
  const candidates = new Map();
  for (const genre of game.genreIds) for (const other of collections.get(locale).get(genre).slice(0,60)) {
    if (other.id !== game.id) candidates.set(other.id, other);
  }
  const related = [...candidates.values()].sort((a,b) => b.genreIds.filter(g => game.genreIds.includes(g)).length - a.genreIds.filter(g => game.genreIds.includes(g)).length).slice(0,limit);
  const selected = new Set([game.id, ...related.map(other => other.id)]);
  for (const other of localeGames.get(locale)) {
    if (related.length >= limit) break;
    if (!selected.has(other.id)) { related.push(other); selected.add(other.id); }
  }
  return related;
}
export function recommendedGames(locale, genre, limit=6) {
  return (genre ? recommendations.get(genre) || [] : recommendationsAll).map(id => byId.get(id)).filter(game => game?.locales.includes(locale)).slice(0,limit);
}
export function counterpart(entry, locale) {
  if (entry.type === 'game') {
    const game = byId.get(entry.id);
    return game.locales.includes(locale) ? { ...entry, locale, path: gamePath(locale, game) } : null;
  }
  if (entry.type === 'genre') {
    const count = allCollections.get(entry.genre).length;
    if (!count) return null;
    const page = Math.min(entry.page || 1, Math.ceil(count/config.pageSize));
    return { ...entry, locale, page, path: listPath(locale, entry.genre, page) };
  }
  if (entry.type === 'language') return { ...entry, locale, page: 1, path: listPath(locale) };
  if (['about','privacy','search'].includes(entry.type)) return { ...entry, locale, path: `/${locale}/${entry.type}/` };
  return {type:'language',locale,page:1,path:`/${locale}/`};
}
export function alternatives(entry, indexableOnly=false) {
  return localeIds.map(locale => counterpart(entry, locale)).filter(other => other && (!indexableOnly || isIndexable(other)));
}
export function allRoutes() {
  const routes = [{ type:'selector', locale:'en', path:'/' }];
  for (const locale of localeIds) {
    const all = games;
    for (let page=1;page<=Math.ceil(all.length/config.pageSize);page++) routes.push({type:'language',locale,page,path:listPath(locale,null,page)});
    for (const group of groups) {
      const selected = allCollections.get(group.id);
      for (let page=1;page<=Math.ceil(selected.length/config.pageSize);page++) routes.push({type:'genre',locale,genre:group.id,page,path:listPath(locale,group.id,page)});
    }
    for (const type of ['about','privacy','search']) routes.push({type,locale,path:`/${locale}/${type}/`});
    for (const game of localeGames.get(locale)) routes.push({type:'game',locale,id:game.id,path:gamePath(locale,game)});
  }
  if (new Set(routes.map(route => route.path)).size !== routes.length) throw new Error('Duplicate portal route');
  return routes;
}
export const routeFile = entry => entry.path === '/' ? 'index.html' : `${entry.path.slice(1)}index.html`;
