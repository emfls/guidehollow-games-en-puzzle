import { createHash } from 'node:crypto';

export const PROVIDER_ENDPOINT = 'https://widgets.playgama.com/api/v1/partner/export/catalogue/games';
export const PUBLISHER_CLID = 'p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92';
export const QUARANTINED_LANGUAGE_CODES = {
  'kr-ZZ': 'Registered components mean Kanuri with a private-use region, not Korean. Await provider clarification.',
};

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const contentHash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');

function text(value, field, { allowEmpty = true } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`Invalid ${field}: expected ${allowEmpty ? 'a string' : 'a nonempty string'}.`);
  return value;
}

function strings(value, field) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Invalid ${field}: expected an array of strings.`);
  return [...value];
}

function validDate(value, field) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${field}.`);
  return value;
}

// URL validates the boundaries; raw non-CLID tokens, host, path and fragment are
// retained byte for byte. In particular, provider slugs are not lowercased here.
export function withPublisherClid(original) {
  text(original, 'provider URL', { allowEmpty: false });
  const parsed = new URL(original);
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) throw new Error(`Invalid HTTPS provider URL: ${original}`);
  const hashAt = original.indexOf('#');
  const prefix = hashAt < 0 ? original : original.slice(0, hashAt);
  const fragment = hashAt < 0 ? '' : original.slice(hashAt);
  const queryAt = prefix.indexOf('?');
  const base = queryAt < 0 ? prefix : prefix.slice(0, queryAt);
  const query = queryAt < 0 ? '' : prefix.slice(queryAt + 1);
  const parts = query ? query.split('&').filter(part => decodeURIComponent(part.split('=', 1)[0].replaceAll('+', ' ')) !== 'clid') : [];
  parts.push(`clid=${encodeURIComponent(PUBLISHER_CLID)}`);
  const result = `${base}?${parts.join('&')}${fragment}`;
  const final = new URL(result);
  if (final.searchParams.getAll('clid').length !== 1 || final.searchParams.get('clid') !== PUBLISHER_CLID) throw new Error('Publisher attribution validation failed.');
  const withoutClid = url => [...url.searchParams].filter(([key]) => key !== 'clid');
  if (canonicalJson(withoutClid(parsed)) !== canonicalJson(withoutClid(final))) throw new Error('Provider query parameters changed.');
  return result;
}

function nativeLocales(languages) {
  const locales = new Set();
  const quarantined = [];
  for (const original of languages) {
    try {
      const canonical = new Intl.Locale(original.replaceAll('_', '-'));
      if (Object.hasOwn(QUARANTINED_LANGUAGE_CODES, canonical.toString())) {
        quarantined.push(original);
        continue;
      }
      const locale = canonical.language.toLowerCase();
      if (locale === 'und') throw new Error('Undetermined language');
      locales.add(locale);
    } catch {
      // Keep the original declaration in languages, but never invent a route.
      quarantined.push(original);
    }
  }
  return { locales: [...locales].sort(), quarantined };
}

function providerFields(record) {
  const raw = Object.hasOwn(record, 'gameURL');
  const id = text(raw ? record.slug : record.id, 'provider slug', { allowEmpty: false });
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error(`Unsupported route characters in provider slug ${id}.`);
  if (!raw && record.slug !== undefined && record.slug !== id) throw new Error(`Conflicting provider slug in snapshot: ${id}.`);
  const providerId = text(raw ? record.id : record.providerId, 'provider ID', { allowEmpty: false });
  const languages = strings(raw ? record.supportedLanguages : record.languages, `${id}/languages`);
  const categories = strings(raw ? record.genres : record.categories, `${id}/categories`);
  let orientation;
  let platforms;
  if (raw) {
    const o = record.screenOrientation;
    if (!o || typeof o.horizontal !== 'boolean' || typeof o.vertical !== 'boolean') throw new Error(`Invalid ${id}/screenOrientation.`);
    orientation = o.horizontal && !o.vertical ? 'landscape' : o.vertical && !o.horizontal ? 'portrait' : 'any';
    const deviceMap = { 'For Desktop': 'Desktop', 'For Android': 'Android', 'For IOS': 'iOS' };
    const devices = strings(record.mobileReady, `${id}/mobileReady`);
    if (devices.some(device => !deviceMap[device])) throw new Error(`Unknown provider device value for ${id}.`);
    platforms = devices.map(device => deviceMap[device]);
  } else {
    orientation = record.orientation;
    platforms = strings(record.platforms, `${id}/platforms`);
    if (!['landscape', 'portrait', 'any'].includes(orientation) || platforms.some(value => !['Desktop', 'Android', 'iOS'].includes(value))) throw new Error(`Invalid normalized device metadata for ${id}.`);
  }
  const normalizedPlatforms = ['Desktop', 'Android', 'iOS'].filter(value => platforms.includes(value));
  const originalEmbedUrl = raw ? record.gameURL : record.source?.originalGameUrl;
  const originalAffiliateUrl = raw ? record.playgamaGameUrl : record.source?.originalAffiliateUrl;
  const thumbnail = raw ? record.images?.[0] ?? null : record.thumbnail ?? null;
  if (thumbnail !== null && typeof thumbnail !== 'string') throw new Error(`Invalid ${id}/thumbnail.`);
  return {
    id, providerId, slug: id.toLowerCase(),
    title: text(record.title, `${id}/title`, { allowEmpty: false }),
    description: text(record.description, `${id}/description`),
    instructions: text(raw ? record.howToPlayText : record.instructions, `${id}/instructions`),
    originalEmbedUrl, originalAffiliateUrl, thumbnail, categories,
    platforms: normalizedPlatforms, orientation, languages,
  };
}

function withoutTimes(game) {
  const { firstSeenAt, changedAt, ...rest } = game;
  return rest;
}

export function runtimeContentHash(catalog) {
  return contentHash({
    schemaVersion: 1, source: catalog.snapshot.source,
    stats: catalog.stats, languagePolicy: catalog.languagePolicy,
    games: catalog.games.map(withoutTimes),
  });
}

export function createRuntimeCatalog({ records, totalCount, fetchedAt, groups, overrides = {}, previousCatalog = null, previousState = null }) {
  validDate(fetchedAt, 'snapshot fetchedAt');
  if (!Number.isSafeInteger(totalCount) || totalCount < 1 || !Array.isArray(records) || records.length !== totalCount) throw new Error(`Incomplete or empty provider snapshot: expected ${totalCount}, received ${records?.length}.`);
  // Independent completeness evidence comes from the provider INPUT records,
  // never from normalized/filtered runtime games. Candidate imports retain the
  // original provider ID explicitly; live API records expose it as id.
  const sourceProviderIds = records.map(record => text(Object.hasOwn(record, 'gameURL') ? record.id : record.providerId, 'source provider ID', { allowEmpty: false })).sort();
  if (new Set(sourceProviderIds).size !== totalCount) throw new Error('Duplicate provider IDs in source snapshot.');
  if (!Array.isArray(groups) || groups.length < 1 || groups.length > 16) throw new Error('Expected between one and sixteen major genre definitions.');
  const genreIds = new Set();
  for (const group of groups) {
    if (!group || typeof group.id !== 'string' || genreIds.has(group.id) || !Array.isArray(group.sources)) throw new Error('Invalid or duplicate major genre definition.');
    strings(group.sources, `${group.id}/sources`);
    genreIds.add(group.id);
  }
  for (const [id, override] of Object.entries(overrides.games || {})) {
    if (!override || !Array.isArray(override.genres) || override.genres.some(genre => !genreIds.has(genre))) throw new Error(`Invalid genre override for ${id}.`);
  }
  const previousById = new Map((previousCatalog?.games || []).map(game => [game.providerId, game]));
  const tombstonesById = new Map((previousState?.tombstones || []).map(game => [game.providerId, game]));
  const seenProviderIds = new Set();
  const seenIds = new Set();
  const seenSlugs = new Map();
  const nativeCodeCounts = new Map();
  const localeCounts = new Map();
  const quarantineCounts = new Map();
  const games = [];
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  for (const record of records) {
    const source = providerFields(record);
    if (seenProviderIds.has(source.providerId) || seenIds.has(source.id)) throw new Error(`Duplicate provider ID or slug: ${source.providerId}/${source.id}.`);
    if (seenSlugs.has(source.slug)) throw new Error(`Lowercase route collision: ${seenSlugs.get(source.slug)} and ${source.id}.`);
    seenProviderIds.add(source.providerId); seenIds.add(source.id); seenSlugs.set(source.slug, source.id);
    const native = nativeLocales(source.languages);
    for (const code of new Set(source.languages)) increment(nativeCodeCounts, code);
    for (const locale of native.locales) increment(localeCounts, locale);
    for (const code of new Set(native.quarantined)) increment(quarantineCounts, code);
    const overrideGenres = new Set(overrides.games?.[source.id]?.genres || []);
    const matchingGenres = groups.filter(group => overrideGenres.has(group.id) || group.sources.some(category => source.categories.includes(category))).map(group => group.id);
    const normalized = {
      id: source.id, providerId: source.providerId, slug: source.slug,
      title: source.title, description: source.description, instructions: source.instructions,
      embedUrl: withPublisherClid(source.originalEmbedUrl), affiliateUrl: withPublisherClid(source.originalAffiliateUrl),
      thumbnail: source.thumbnail, categories: source.categories, platforms: source.platforms,
      orientation: source.orientation, languages: source.languages, locales: native.locales,
      genreIds: matchingGenres,
      sourceHash: contentHash(source),
    };
    const previous = previousById.get(source.providerId);
    const tombstone = tombstonesById.get(source.providerId);
    const firstSeenAt = previous?.firstSeenAt || tombstone?.firstSeenAt || fetchedAt;
    const unchanged = previous && canonicalJson(withoutTimes(previous)) === canonicalJson(normalized);
    const changedAt = unchanged ? previous.changedAt : fetchedAt;
    games.push({ ...normalized, firstSeenAt: validDate(firstSeenAt, `${source.id}/firstSeenAt`), changedAt: validDate(changedAt, `${source.id}/changedAt`) });
  }
  // Ranking is not game metadata. A feed reorder alone must not create a commit.
  games.sort((a, b) => a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0);
  const sortedObject = map => Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
  const genreCoverage = Object.fromEntries(groups.map(group => {
    const matching = games.filter(game => game.genreIds.includes(group.id));
    const counts = new Map();
    for (const game of matching) for (const locale of game.locales) increment(counts, locale);
    return [group.id, { gameCount: matching.length, localeCounts: sortedObject(counts) }];
  }));
  const stats = {
    totalGames: games.length,
    nativeCodeCounts: sortedObject(nativeCodeCounts),
    nativeCodeGamePairs: [...nativeCodeCounts.values()].reduce((sum, n) => sum + n, 0),
    localeCounts: sortedObject(localeCounts),
    localeGamePairs: [...localeCounts.values()].reduce((sum, n) => sum + n, 0),
    genreCoverage,
    unmappedGenreGames: games.filter(game => !game.genreIds.length).map(game => game.id),
    quarantinedLanguageCodeCounts: sortedObject(quarantineCounts),
    gamesWithoutEligibleLocale: games.filter(game => !game.locales.length).map(game => game.id),
  };
  const languagePolicy = {
    routeStrategy: 'BCP-47-base-language',
    locales: [...localeCounts.keys()].sort(),
    preserveOriginalCodes: true,
    deduplicateRegionalVariantsPerGame: true,
    quarantinedCodes: QUARANTINED_LANGUAGE_CODES,
    providerMetadataLanguage: null,
    localizedProviderMetadataObserved: false,
    nativeSupportSource: 'supportedLanguages',
    nativeSupportDoesNotEstablishLocalizedPageCopy: true,
  };
  const semantic = { schemaVersion: 1, source: PROVIDER_ENDPOINT, stats, languagePolicy, games: games.map(withoutTimes) };
  const catalog = {
    schemaVersion: 1,
    snapshot: { fetchedAt, source: PROVIDER_ENDPOINT, totalCount, contentHash: contentHash(semantic) },
    stats, languagePolicy, games,
  };
  const currentIds = new Set(games.map(game => game.providerId));
  const tombstones = new Map([...tombstonesById].filter(([id]) => !currentIds.has(id)));
  for (const old of previousCatalog?.games || []) {
    if (!currentIds.has(old.providerId)) {
      tombstones.set(old.providerId, {
        providerId: old.providerId, id: old.id, slug: old.slug,
        status: 'unlisted-from-complete-provider-snapshot', providerDeleted: null,
        firstSeenAt: old.firstSeenAt, changedAt: old.changedAt,
        lastListedSnapshotAt: previousCatalog.snapshot.fetchedAt,
        unlistedAt: fetchedAt, sourceHash: old.sourceHash,
      });
    }
  }
  const state = {
    schemaVersion: 1,
    source: PROVIDER_ENDPOINT,
    lastAcceptedSnapshot: catalog.snapshot,
    sourceProviderIds,
    availabilityMeaning: 'Listed in the last accepted complete export. No provider active/deleted flag is exposed.',
    tombstones: [...tombstones.values()].sort((a, b) => a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0),
  };
  return { catalog, state };
}

export function serializeRuntimeCatalog(catalog) {
  const { games, ...header } = catalog;
  return `${JSON.stringify(header, null, 2).slice(0, -2)},\n  "games": [\n${games.map(game => `    ${JSON.stringify(game)}`).join(',\n')}\n  ]\n}\n`;
}
