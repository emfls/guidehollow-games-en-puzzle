import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Read-only against the catalog and build. The sole output is the verification report.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(projectRoot);
const args = process.argv.slice(2);
const distOption = args.indexOf('--dist');
const dist = resolve(projectRoot, distOption >= 0 ? args[distOption + 1] || 'dist-portal' : 'dist-portal');
const reportPath = resolve(projectRoot, 'release-manifests/portal-verification.json');
const started = Date.now();
const expectedClid = 'p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92';
const decoder = new TextDecoder('utf-8', { fatal: true });
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  outputDirectory: relative(projectRoot, dist),
  status: 'failed',
  counts: {},
  localeCounts: {},
  pageCounts: { total: 0, byType: {}, byLocale: {} },
  indexableGameCounts: { total: 0, byLocale: {} },
  fileCount: 0,
  bytes: 0,
  maxFile: null,
  assets: { css: [], js: [] },
  cssBytes: 0,
  jsBytes: 0,
  limits: { fileCountExclusive: 20000, singleFileBytes: 25 * 1024 * 1024 },
  errors: [],
  errorCount: 0,
  verificationScope: 'Local generated files; no network requests or deployment mutations.',
  notVerified: ['Public HTTP status codes, DNS and TLS', 'Browser layout and game execution', 'Search-engine indexing or submission']
};
function problem(check, path, message) {
  report.errorCount++;
  if (report.errors.length < 300) report.errors.push({ check, path, message });
}
function expect(condition, check, path, message) {
  if (!condition) problem(check, path, message);
  return Boolean(condition);
}
function eqSet(actual, expected) {
  const expectedValues = new Set(expected);
  return actual.length === expected.length && expectedValues.size === expected.length &&
    new Set(actual).size === actual.length && actual.every(value => expectedValues.has(value));
}
function increment(target, key) { target[key] = (target[key] || 0) + 1; }
function decode(value = '') {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (whole, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    try {
      const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return String.fromCodePoint(code);
    } catch { return whole; }
  });
}
function attributes(source) {
  const result = {};
  const expression = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  for (const match of source.matchAll(expression)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
}
function tags(html, name) {
  const result = [];
  const expression = /<([A-Za-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  for (const match of html.matchAll(expression)) {
    if (!name || match[1].toLowerCase() === name) result.push({ name: match[1].toLowerCase(), attrs: attributes(match[2]) });
  }
  return result;
}
function blocks(html, name) {
  const expression = new RegExp('<' + name + '\\b([^>]*)>([\\s\\S]*?)<\\/' + name + '\\s*>', 'gi');
  return [...html.matchAll(expression)].map(match => ({ attrs: attributes(match[1]), body: match[2] }));
}
function classHas(attrs, className) { return (attrs.class || '').split(/\s+/).includes(className); }
function flatStrings(object, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatStrings(value, path, result);
    else result[path] = value;
  }
  return result;
}
function placeholders(value) { return (String(value).match(/\{[^{}]+\}/g) || []).sort().join('|'); }
function readText(file, label = relative(dist, file)) {
  try { return decoder.decode(readFileSync(file)); }
  catch (error) { problem('utf8/read', label, error.message); return null; }
}
function readJson(file, label = relative(projectRoot, file)) {
  const text = readText(file, label);
  if (text === null) return null;
  try { return JSON.parse(text); }
  catch (error) { problem('json', label, error.message); return null; }
}
function jsonBody(body, label, kind) {
  try { return JSON.parse(body); }
  catch (error) { problem(kind, label, error.message); return null; }
}
function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (entry.isFile()) files.push(path);
    else problem('file-type', relative(dist, path), 'Only regular files and directories belong in the deployment.');
  }
  return files;
}
function checkClid(value, label) {
  try {
    const url = new URL(value);
    expect(url.protocol === 'https:', 'affiliate-https', label, 'The game URL must use HTTPS.');
    const pairs = [...url.searchParams].filter(([key]) => key.toLowerCase() === 'clid');
    expect(pairs.length === 1 && pairs[0][0] === 'clid' && pairs[0][1] === expectedClid,
      'affiliate-clid', label, 'Expected exactly one clid with the publisher identifier.');
  } catch { problem('affiliate-url', label, 'Invalid absolute game URL.'); }
}
function schemaNodes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaNodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...(Array.isArray(value['@graph']) ? value['@graph'].flatMap(schemaNodes) : [])];
}

async function verify() {
  if (!existsSync(dist)) throw new Error('Build directory does not exist: ' + dist);
  const catalog = await import('../portal/catalog.mjs');
  const {detailFor}=await import('../portal/details.mjs');
  const { config, groups, games, byId, localeIds, copies, localeGames, collections, editorial, titleFor,
    isIndexable, allRoutes, routeFile, alternatives, preview, provider, listGames, gamePath } = catalog;
  const { buildFingerprint } = await import('../portal/assets.mjs');
  const {catalogTranslation}=await import('../portal/localization.mjs');
  const {guideDecision}=await import('../portal/guides.mjs');
  report.guideCoverage={gameLocaleCombinations:games.length*localeIds.length,qualified:0,byOrigin:{},byLocale:{},gamesWithAnyQualifiedGuide:0,notQualified:0};
  const qualifiedGameIds=new Set();
  for(const locale of localeIds){
    const counts={qualified:0,byOrigin:{},pendingByReason:{}};
    for(const game of games){
      const guide=editorial(game,locale);
      if(guide){counts.qualified++;report.guideCoverage.qualified++;increment(counts.byOrigin,guide.origin);increment(report.guideCoverage.byOrigin,guide.origin);qualifiedGameIds.add(game.id);}
      else{increment(counts.pendingByReason,guideDecision(game,locale).reason);report.guideCoverage.notQualified++;}
    }
    report.guideCoverage.byLocale[locale]=counts;
  }
  report.guideCoverage.gamesWithAnyQualifiedGuide=qualifiedGameIds.size;
  for(const locale of localeIds.filter(locale=>locale!=='en'))for(const game of games){
    expect(Boolean(catalogTranslation(game,locale)),'catalog-translation',locale+'/'+game.id,'Missing or stale localized title/summary.');
  }
  const origin = new URL(config.origin);
  expect(origin.protocol === 'https:' && origin.hostname === 'games.guidehollow.com' &&
    origin.pathname === '/' && !origin.search && !origin.hash, 'origin', 'portal/config.json', 'Expected the HTTPS unified portal origin.');
  const absolute = path => new URL(path, origin).href;
  const routes = allRoutes();
  const entries = [...routes, { type: '404', locale: 'en', path: '/404.html' }];
  const entryUrl = entry => absolute(entry.path);
  const entryFile = entry => entry.type === '404' ? '404.html' : routeFile(entry).split(sep).join('/');
  const routeByUrl = new Map(entries.map(entry => [entryUrl(entry), entry]));
  const expectedHtml = new Set(entries.map(entryFile));
  const expectedIndexable = new Set(routes.filter(isIndexable).map(entryUrl));
  report.preview = preview;
  report.origin = origin.origin;
  report.counts = { games: games.length, locales: localeIds.length, genres: groups.length, routes: routes.length,
    htmlPagesIncluding404: entries.length, gameRoutes: routes.filter(entry => entry.type === 'game').length,
    indexablePages: expectedIndexable.size };
  expect(new Set(routes.map(entry => entry.path)).size === routes.length, 'route-uniqueness', 'routes', 'Duplicate route paths.');
  expect(expectedHtml.size === entries.length, 'route-file-uniqueness', 'routes', 'More than one route maps to the same file.');
  expect(new Set(groups.map(group => group.id)).size === groups.length && groups.length === 16,
    'genre-count', 'data/genre-groups.json', 'Expected exactly 16 distinct broad genres.');
  expect(new Set(games.map(game => game.id)).size === games.length &&
    new Set(games.map(game => game.slug)).size === games.length &&
    new Set(games.map(game => String(game.providerId))).size === games.length,
    'game-uniqueness', 'data/portal/catalog.json', 'Game IDs, slugs and provider IDs must be unique.');

  // Synchronization records these IDs directly from the complete provider input,
  // independently of the runtime catalog. Keep this small accepted-state record in
  // CI; an optional older full candidate must not block later catalog additions.
  const statePath = 'data/portal/sync-state.json';
  const state = readJson(resolve(projectRoot, statePath));
  if (state) {
    const sourceIds = Array.isArray(state.sourceProviderIds) ? state.sourceProviderIds : [];
    const accepted = state.lastAcceptedSnapshot || {};
    expect(Array.isArray(state.sourceProviderIds) && sourceIds.length > 0 &&
      sourceIds.every(id => typeof id === 'string' && id.trim().length > 0) &&
      new Set(sourceIds).size === sourceIds.length && Number.isSafeInteger(accepted.totalCount) &&
      accepted.totalCount > 0 && sourceIds.length === accepted.totalCount,
      'source-complete', statePath, 'Accepted source IDs must be nonempty unique strings and match the complete source count.');
    expect(eqSet(games.map(game => String(game.providerId)), sourceIds),
      'catalog-coverage', 'data/portal/catalog.json', 'Normalized catalog must contain every accepted source game exactly once.');
    expect(games.length === accepted.totalCount && games.length === provider.snapshot?.totalCount &&
      games.length === provider.stats?.totalGames, 'catalog-count', 'catalog', 'Accepted source, normalized snapshot and game counts differ.');
    expect(/^[a-f0-9]{64}$/i.test(accepted.contentHash || '') && accepted.contentHash === provider.snapshot?.contentHash,
      'source-snapshot', statePath, 'Accepted source and runtime snapshot content hashes differ or are invalid.');
    report.counts.sourceGames = sourceIds.length;
    report.sourceSnapshot = accepted.contentHash;
  }

  const seed = readJson(resolve(projectRoot, 'portal/locales/en.json'));
  const seedFields = seed ? flatStrings(seed) : {};
  const groupIds = groups.map(group => group.id);
  for (const locale of localeIds) {
    const copy = copies.get(locale);
    const fields = flatStrings(copy || {});
    const label = 'portal/locales/' + locale + '.json';
    expect(eqSet(Object.keys(fields), Object.keys(seedFields)), 'ui-keys', label, 'Localized key paths differ from the English seed.');
    expect(eqSet(Object.keys(copy?.genreNames || {}), groupIds), 'ui-genres', label, 'Expected every broad-genre label once.');
    expect(copy?.dir === (locale === 'ar' ? 'rtl' : 'ltr'), 'ui-direction', label, 'Unexpected text direction.');
    for (const [key, value] of Object.entries(seedFields)) {
      expect(typeof fields[key] === 'string' && fields[key].trim().length > 0, 'ui-value', label + ':' + key, 'Expected a nonempty string.');
      expect(placeholders(value) === placeholders(fields[key]), 'ui-placeholders', label + ':' + key, 'Placeholder names or multiplicity differ.');
      for (const brand of ['GuideHollow', 'Playgama']) {
        const count = text => String(text).split(brand).length - 1;
        expect(count(value) === count(fields[key]), 'ui-brand', label + ':' + key, 'Brand spelling/count changed: ' + brand);
      }
    }
    report.localeCounts[locale] = localeGames.get(locale).length;
    report.indexableGameCounts.byLocale[locale] = 0;
  }
  const quarantined = new Set(Object.keys(provider.languagePolicy?.quarantinedCodes || {}));
  const allGamePairs = new Set();
  const routedIds = new Set();
  for (const game of games) {
    const native = [...new Set((game.languages || []).filter(code => !quarantined.has(code))
      .map(code => code.split('-')[0].toLowerCase()))].sort();
    expect(eqSet(game.locales || [], native), 'native-locales', game.id, 'Routed languages must exactly match non-quarantined native base languages.');
    expect(Array.isArray(game.genreIds) && new Set(game.genreIds).size === game.genreIds.length &&
      game.genreIds.length <= 16 && game.genreIds.every(id => groupIds.includes(id)),
      'game-genres', game.id, 'Invalid, duplicate or excessive broad genres.');
    checkClid(game.embedUrl, game.id + ':embedUrl');
    checkClid(game.affiliateUrl, game.id + ':affiliateUrl');
    for (const locale of localeIds.filter(locale=>catalog.hasGamePage(locale,game))) allGamePairs.add(locale + '/' + game.id);
  }
  const actualPairs = new Set();
  for (const entry of routes.filter(entry => entry.type === 'game')) {
    const game = byId.get(entry.id);
    if (!expect(Boolean(game), 'route-game', entry.path, 'Unknown game ID.')) continue;
    expect(catalog.hasGamePage(entry.locale,game), 'route-language', entry.path, 'Game needs native support or a stored/qualified localized guide route.');
    expect(entry.path === '/' + entry.locale + '/play/' + game.slug + '/', 'game-route-shape', entry.path, 'A game must have one genre-independent URL per language.');
    const pair = entry.locale + '/' + game.id;
    expect(!actualPairs.has(pair), 'game-route-duplicate', entry.path, 'Duplicate game/language page.');
    actualPairs.add(pair);
    routedIds.add(game.id);
  }
  expect(eqSet([...actualPairs], [...allGamePairs]), 'game-route-coverage', 'routes', 'Missing or extra native/qualified guide routes.');
  expect(routedIds.size === games.length, 'game-route-cap', 'routes', 'One or more catalog games has no play page.');

  const files = walk(dist).sort();
  const fileSet = new Set(files.map(file => relative(dist, file).split(sep).join('/')));
  report.fileCount = files.length;
  expect(files.length < report.limits.fileCountExclusive, 'cloudflare-file-count', 'dist-portal', 'Deployment must stay below 20,000 files.');
  for (const file of files) {
    const path = relative(dist, file).split(sep).join('/');
    const bytes = statSync(file).size;
    report.bytes += bytes;
    if (!report.maxFile || bytes > report.maxFile.bytes) report.maxFile = { path, bytes };
    expect(bytes <= report.limits.singleFileBytes, 'cloudflare-file-size', path, 'File exceeds 25 MiB.');
    if (path.endsWith('.html')) expect(expectedHtml.has(path), 'unexpected-html', path, 'HTML file has no declared portal route.');
    else if (['.js', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest'].includes(extname(path)) || path === '_headers' || path === '_redirects') readText(file, path);
    if (['.js', '.css'].includes(extname(path))) {
      const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
      const kind = path.endsWith('.css') ? 'css' : 'js';
      report.assets[kind].push({ path, bytes, sha256 });
      report[kind + 'Bytes'] += bytes;
      const expectedName = kind === 'css' ? /^assets\/static\/site-([a-f0-9]{12})\.css$/ : /^assets\/static\/portal-([a-f0-9]{12})\.js$/;
      const match = path.match(expectedName);
      expect(Boolean(match) && match[1] === sha256.slice(0, 12), 'asset-fingerprint', path, 'Expected content-hashed portal asset filename.');
    }
  }
  expect(report.assets.css.length === 1 && report.assets.js.length === 1, 'asset-set', 'assets/static', 'Expected one hashed CSS and one hashed JS asset.');
  const cssPath = report.assets.css[0] ? '/' + report.assets.css[0].path : '';
  const jsPath = report.assets.js[0] ? '/' + report.assets.js[0].path : '';
  const buildInfo = readJson(resolve(dist, 'build-info.json'), 'build-info.json');
  if (buildInfo) {
    const expected = { origin: config.origin, preview, gameCount: games.length, localeCount: localeIds.length,
      routeCount: routes.length, indexableCount: expectedIndexable.size, catalogFetchedAt: provider.snapshot.fetchedAt };
    for (const [key, value] of Object.entries(expected)) expect(buildInfo[key] === value, 'build-info', 'build-info.json:' + key, 'Build metadata does not match the current source.');
    expect(buildInfo.buildId === buildFingerprint(), 'build-fingerprint', 'build-info.json', 'Build is stale relative to source/UI/assets.');
    report.buildId = buildInfo.buildId;
  }

  function internalFile(url) {
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return null; }
    if (path.includes('\0') || path.includes('\\')) return null;
    const file = path.endsWith('/') ? path.slice(1) + 'index.html' : path.slice(1);
    const absoluteFile = resolve(dist, file);
    return absoluteFile.startsWith(dist + sep) ? relative(dist, absoluteFile).split(sep).join('/') : null;
  }
  function resolveLink(value, pageUrl, label) {
    try {
      const url = new URL(value, pageUrl);
      if (url.protocol === 'javascript:') { problem('link-protocol', label, 'Executable URL in generated markup.'); return null; }
      if (url.origin !== origin.origin) return { url, internal: false };
      const file = internalFile(url);
      expect(file && fileSet.has(file), 'internal-link', label, 'Missing internal target: ' + url.href);
      const bare = new URL(url); bare.search = ''; bare.hash = '';
      return { url, internal: true, entry: routeByUrl.get(bare.href), file };
    } catch { problem('link-url', label, 'Malformed link: ' + value); return null; }
  }
  function expectedAlternates(entry) {
    if (!isIndexable(entry)) return new Map();
    const variants = alternatives(entry, true);
    const result = new Map(variants.map(other => [other.locale, absolute(other.path)]));
    const fallback = ['selector', 'language'].includes(entry.type) ? '/' : variants.find(other => other.locale === 'en')?.path;
    if (fallback) result.set('x-default', absolute(fallback));
    return result;
  }
  function compareAlternates(actual, expected, label) {
    expect(actual.size === expected.size && [...expected].every(([lang, href]) => actual.get(lang) === href),
      'hreflang-set', label, 'Alternate language URLs differ from the actual indexable counterparts.');
  }
  const pageAlternates = new Map();
  const listingBins = new Map();
  let processed = 0;
  for (const entry of entries) {
    const file = entryFile(entry), pageUrl = entryUrl(entry);
    increment(report.pageCounts.byType, entry.type);
    increment(report.pageCounts.byLocale, entry.locale);
    report.pageCounts.total++;
    if (!expect(fileSet.has(file), 'route-file', entry.path, 'Missing generated HTML: ' + file)) continue;
    const html = readText(resolve(dist, file), file);
    if (html === null) continue;
    const allTags = tags(html);
    const named = name => allTags.filter(tag => tag.name === name);
    const htmlTags = named('html');
    expect(htmlTags.length === 1 && htmlTags[0].attrs.lang === entry.locale &&
      htmlTags[0].attrs.dir === copies.get(entry.locale).dir, 'html-language', file, 'HTML lang/dir does not match the route.');
    expect(named('meta').some(tag => /^utf-8$/i.test(tag.attrs.charset || '')), 'html-charset', file, 'Missing UTF-8 charset.');
    const titles = blocks(html, 'title');
    const descriptions = named('meta').filter(tag => tag.attrs.name === 'description');
    expect(titles.length === 1 && decode(titles[0].body).trim().length > 0, 'html-title', file, 'Expected one nonempty title.');
    expect(descriptions.length === 1 && descriptions[0].attrs.content?.trim().length > 0, 'html-description', file, 'Expected one nonempty meta description.');
    const canonical = named('link').filter(tag => tag.attrs.rel === 'canonical');
    expect(canonical.length === 1 && canonical[0].attrs.href === pageUrl, 'canonical', file, 'Canonical must point to this exact HTTPS page.');
    const robots = named('meta').filter(tag => /^(robots|googlebot|naverbot)$/i.test(tag.attrs.name || ''));
    const noindex = robots.some(tag => /\bnoindex\b/i.test(tag.attrs.content || ''));
    expect(noindex === !isIndexable(entry), 'indexability', file, 'Robots noindex disagrees with the editorial/indexing policy.');
    expect(!/<iframe\b/i.test(html), 'lazy-player', file, 'Initial HTML must not contain a game iframe.');
    if (entry.type === '404') expect(noindex && decode(html).includes(copies.get('en').notFound), '404-page', file, 'The not-found page must be localized and noindex.');
    const ids = new Set(allTags.map(tag => tag.attrs.id).filter(Boolean));
    expect(ids.has('main'), 'main-target', file, 'Missing main skip-link destination.');
    const styles = named('link').filter(tag => tag.attrs.rel === 'stylesheet');
    const scripts = blocks(html, 'script');
    expect(styles.length === 1 && styles[0].attrs.href === cssPath, 'css-reference', file, 'Page must reference the current hashed stylesheet.');
    const externalScripts = scripts.filter(script => script.attrs.src);
    expect(externalScripts.length === 1 && externalScripts[0].attrs.src === jsPath, 'js-reference', file, 'Page must reference the current hashed client script.');
    for (const tag of allTags) {
      const attr = ['a', 'link'].includes(tag.name) ? 'href' : ['script', 'img'].includes(tag.name) ? 'src' : tag.name === 'form' ? 'action' : null;
      if (!attr || !tag.attrs[attr]) continue;
      const target = resolveLink(tag.attrs[attr], pageUrl, file);
      if (target?.internal && target.url.hash && target.url.pathname === new URL(pageUrl).pathname) {
        expect(ids.has(decodeURIComponent(target.url.hash.slice(1))), 'fragment-link', file, 'Missing local fragment: ' + target.url.hash);
      }
      if (tag.name === 'a' && target?.entry?.type === 'game' && !tag.attrs.lang) {
        expect(target.url.pathname === gamePath(entry.locale,byId.get(target.entry.id)), 'supported-game-link', file, 'A game card must preserve UI language when supported or use its declared fallback language.');
      }
      if (tag.name === 'a' && tag.attrs.lang && target?.entry) {
        expect(tag.attrs.lang === target.entry.locale, 'language-switch', file, 'Language label and target route disagree.');
        if (entry.type === 'game') {
          const hasPage = catalog.hasGamePage(target.entry.locale,byId.get(entry.id));
          expect(hasPage ? target.entry.type === 'game' && target.entry.id === entry.id :
            target.entry.type === 'player' && target.url.searchParams.get('game') === entry.id,
            'game-language-switch', file, 'Use the same game and preserve UI language through the localized player when unsupported.');
        }
      }
    }
    const navs = blocks(html, 'nav');
    const genrePaths = groups.filter(group => games.some(game => game.genreIds.includes(group.id)))
      .map(group => '/' + entry.locale + '/' + group.id + '/');
    for (const [className, expected] of [['portal-genres', ['/' + entry.locale + '/', ...genrePaths]], ['footer-genres', genrePaths]]) {
      const matches = navs.filter(nav => classHas(nav.attrs, className));
      expect(matches.length === 1, 'genre-navigation', file, 'Missing or duplicate ' + className + '.');
      if (matches.length) expect(eqSet(tags(matches[0].body, 'a').map(tag => tag.attrs.href), expected),
        'genre-navigation', file, className + ' must contain only this language’s available genres.');
    }
    const actualAlternate = new Map();
    for (const tag of named('link').filter(tag => tag.attrs.rel === 'alternate' && tag.attrs.hreflang)) {
      const lang = tag.attrs.hreflang;
      expect(!actualAlternate.has(lang), 'hreflang-duplicate', file, 'Duplicate hreflang: ' + lang);
      actualAlternate.set(lang, tag.attrs.href);
      expect(expectedIndexable.has(tag.attrs.href), 'hreflang-indexability', file, 'Alternate points to a nonindexable or missing page.');
    }
    compareAlternates(actualAlternate, expectedAlternates(entry), file);
    pageAlternates.set(pageUrl, actualAlternate);
    const configs = scripts.filter(script => script.attrs.id === 'portal-config');
    expect(configs.length === 1, 'client-config', file, 'Expected one portal-config JSON block.');
    const client = configs.length ? jsonBody(configs[0].body, file, 'client-json') : null;
    if (client) expect(client.locale === entry.locale && client.type === entry.type && client.canonical === pageUrl,
      'client-route', file, 'Client config points to another page.');
    const schemas = scripts.filter(script => script.attrs.type === 'application/ld+json')
      .flatMap(script => schemaNodes(jsonBody(script.body, file, 'json-ld')));
    expect(schemas.length > 0, 'json-ld', file, 'Missing structured data.');
    if (entry.type === 'game') {
      const game = byId.get(entry.id), guide = editorial(game, entry.locale);
      const expectedTitle = titleFor(game, entry.locale);
      if (client) {
        expect(client.game?.id === game.id && client.game?.slug === game.slug &&
          client.game?.embedUrl === game.embedUrl && client.game?.affiliateUrl === game.affiliateUrl,
          'player-config', file, 'Player URLs or identity differ from the catalog.');
        checkClid(client.game?.embedUrl, file + ':player');
        checkClid(client.game?.affiliateUrl, file + ':provider');
      }
      const affiliate = named('a').filter(tag => tag.attrs.href === game.affiliateUrl);
      expect(affiliate.length === 1 && /\bsponsored\b/.test(affiliate[0].attrs.rel || ''),
        'provider-link', file, 'Expected the exact attributed provider link marked sponsored.');
      const video = schemas.filter(node => node['@type'] === 'VideoGame');
      const webPage=schemas.find(node=>node['@type']==='WebPage');
      const crumbs = schemas.filter(node => node['@type'] === 'BreadcrumbList');
      expect(video.length === 1 && video[0].url === pageUrl && video[0].name === expectedTitle &&
        eqSet(video[0].inLanguage || [], game.locales), 'game-schema', file, 'VideoGame identity, URL or native languages differ.');
      const items = crumbs[0]?.itemListElement || [];
      expect(webPage?.inLanguage===entry.locale && webPage.url===pageUrl && webPage.mainEntity?.['@id']===video[0]?.['@id'],'game-webpage-schema',file,'Page language and main game entity must match the visible detail.');
      expect(crumbs.length === 1 && items.length === 3 && items[0].position === 1 &&
        items[0].item === absolute('/' + entry.locale + '/') && items[1].position === 2 &&
        items[1].item===absolute('/'+entry.locale+'/'+game.genreIds[0]+'/') && items[2].position===3 && items[2].item === pageUrl, 'breadcrumb-schema', file, 'BreadcrumbList must lead from the language home through the primary genre to this game.');
      for(const id of ['game-overview','game-how-to','game-compatibility'])expect(allTags.some(tag=>tag.attrs.id===id),'game-detail-section',file,'Missing visible game detail section: '+id);
      expect(descriptions[0]?.attrs.content?.startsWith(expectedTitle.slice(0,40)),'game-description-identity',file,'Meta description must identify this game.');
      if (!guide) {
        expect(noindex&&decode(html).includes(copies.get(entry.locale).sourceNote),'source-derived-guide',file,'Source-derived details must retain noindex and source attribution.');
        if(!detailFor(game,entry.locale).sourceMatched)expect(/<div\b[^>]*\blang=["'](?:en|ru|und)["'][^>]*>/.test(html),'original-source-language',file,'Translated summaries must retain an explicitly tagged original source.');
      }
      if (isIndexable(entry)) { report.indexableGameCounts.total++; increment(report.indexableGameCounts.byLocale, entry.locale); }
    }
    if (['language', 'genre'].includes(entry.type)) {
      if(entry.type==='language'&&(entry.page||1)===1){
        const expected=catalog.recommendedGames(entry.locale,null,6).length||Math.min(6,localeGames.get(entry.locale).length);
        const slides=named('div').filter(tag=>'data-slide' in tag.attrs);
        expect(slides.length===expected&&slides.filter(tag=>!('hidden' in tag.attrs)).length===1,'carousel-static-fallback',file,'Recommendations must have one usable server-rendered slide and hidden alternatives.');
        if(expected>1)expect(named('div').some(tag=>'data-carousel-controls' in tag.attrs&&'inert' in tag.attrs&&tag.attrs['aria-hidden']==='true'&&!('hidden' in tag.attrs)),'carousel-layout-reservation',file,'Inactive initial controls must reserve layout without exposing dead buttons.');
      }
      const list = listGames(entry);
      const page = entry.page || 1, pages = Math.ceil(list.length / config.pageSize);
      const bin = entry.locale + '/' + (entry.genre || '');
      if (!listingBins.has(bin)) listingBins.set(bin, []);
      listingBins.get(bin).push(page);
      const collection = blocks(html, 'section').find(section => section.attrs.id === 'collection');
      expect(Boolean(collection), 'listing-collection', file, 'Missing complete collection section.');
      if (collection) {
        const cards = tags(collection.body, 'article').filter(tag => 'data-card' in tag.attrs).map(tag => tag.attrs['data-card']);
        const expected = list.slice((page - 1) * config.pageSize, page * config.pageSize).map(game => game.id);
        expect(cards.length === expected.length && cards.every((id, index) => id === expected[index]),
          'listing-page-content', file, 'Pagination omitted, duplicated or reordered catalog entries.');
      }
      const pagination = navs.filter(nav => classHas(nav.attrs, 'pagination'));
      expect(pagination.length === (pages > 1 ? 1 : 0), 'pagination', file, 'Unexpected pagination presence.');
      if (pagination.length) {
        const anchors = tags(pagination[0].body, 'a');
        const prev = anchors.filter(tag => tag.attrs.rel === 'prev'), next = anchors.filter(tag => tag.attrs.rel === 'next');
        const current = anchors.filter(tag => tag.attrs['aria-current'] === 'page');
        const pathForPage = n => '/' + entry.locale + '/' + (entry.genre ? entry.genre + '/' : '') + (n > 1 ? 'page/' + n + '/' : '');
        expect(prev.length === (page > 1 ? 1 : 0) && (!prev.length || prev[0].attrs.href === pathForPage(page - 1)),
          'pagination-prev', file, 'Previous page target is incorrect.');
        expect(next.length === (page < pages ? 1 : 0) && (!next.length || next[0].attrs.href === pathForPage(page + 1)),
          'pagination-next', file, 'Next page target is incorrect.');
        expect(current.length === 1 && current[0].attrs.href === entry.path, 'pagination-current', file, 'Current page marker is incorrect.');
      }
    }
    processed++;
    if (processed % 2500 === 0) console.log('Verified ' + processed + ' HTML pages…');
  }
  for (const [bin, pages] of listingBins) {
    const [locale, genre] = bin.split('/');
    const total = listGames({locale,genre}).length;
    const expected = Array.from({ length: Math.ceil(total / config.pageSize) }, (_, index) => index + 1);
    expect(eqSet(pages, expected), 'pagination-coverage', bin, 'Listing pages do not cover the complete collection.');
  }
  for (const [url, variants] of pageAlternates) {
    const entry = routeByUrl.get(url);
    if (!isIndexable(entry) || entry.type === 'selector') continue;
    for (const [lang, target] of variants) {
      if (lang === 'x-default') continue;
      expect(pageAlternates.get(target)?.get(entry.locale) === url, 'hreflang-return', entry.path, 'Missing reciprocal alternate from ' + target);
    }
  }
  for (const locale of localeIds) {
    const path = 'assets/catalog/' + locale + '.json';
    const data = readJson(resolve(dist, path), path);
    if (!expect(Array.isArray(data), 'search-catalog', path, 'Search data must be an array.')) continue;
    expect(eqSet(data.map(item => item.id), games.map(game => game.id)),
      'search-coverage', path, 'Search data must include the complete provider catalog exactly once.');
    for (const item of data) {
      const game = byId.get(item.id);
      if (!game) continue;
      expect(item.path === gamePath(locale,game) && item.native === game.locales.includes(locale) && item.thumbnail === game.thumbnail &&
        eqSet(item.genres || [], game.genreIds), 'search-entry', path + ':' + item.id, 'Search metadata/path differs from the game.');
      expect(eqSet(item.pageLocales||[],localeIds.filter(target=>catalog.hasGamePage(target,game))),'search-page-locales',path+':'+item.id,'Clean guide routes must be separate from actual game language support.');
      resolveLink(item.path, origin, path);
    }
  }

  // Verify the sitemap index, every shard, inclusion policy, and XML alternates.
  const indexPath = 'sitemap.xml', indexXml = readText(resolve(dist, indexPath), indexPath);
  const expectedShards = ['sitemaps/global.xml', ...localeIds.map(locale => 'sitemaps/' + locale + '.xml')];
  const sitemapUrls = new Set();
  if (indexXml !== null) {
    expect(/<sitemapindex\b/.test(indexXml) && /<\/sitemapindex>/.test(indexXml), 'sitemap-index', indexPath, 'Expected a sitemap index document.');
    const locs = blocks(indexXml, 'loc').map(block => decode(block.body.trim()));
    expect(eqSet(locs, expectedShards.map(path => absolute('/' + path))), 'sitemap-shards', indexPath, 'Index must reference the global shard and every locale shard.');
  }
  for (const path of expectedShards) {
    const xml = readText(resolve(dist, path), path);
    if (xml === null) continue;
    expect(Buffer.byteLength(xml, 'utf8') <= 50 * 1024 * 1024, 'sitemap-size', path, 'Sitemap exceeds 50 MiB uncompressed.');
    expect(/<urlset\b/.test(xml) && /<\/urlset>/.test(xml), 'sitemap-format', path, 'Expected a URL set document.');
    const urls = blocks(xml, 'url');
    expect(urls.length <= 50000, 'sitemap-url-limit', path, 'Sitemap exceeds 50,000 URLs.');
    for (const block of urls) {
      const locs = blocks(block.body, 'loc');
      if (!expect(locs.length === 1, 'sitemap-loc', path, 'Each URL entry needs one loc.')) continue;
      const url = decode(locs[0].body.trim()), entry = routeByUrl.get(url);
      expect(!sitemapUrls.has(url), 'sitemap-duplicate', path, 'Duplicate URL: ' + url);
      sitemapUrls.add(url);
      if (!expect(entry && expectedIndexable.has(url), 'sitemap-indexability', path, 'Unknown or noindex URL in sitemap: ' + url)) continue;
      const shard = entry.type === 'selector' ? 'sitemaps/global.xml' : 'sitemaps/' + entry.locale + '.xml';
      expect(path === shard, 'sitemap-locale', path, 'URL is in the wrong locale/global shard: ' + url);
      const alternatesInXml = new Map();
      for (const tag of tags(block.body).filter(tag => tag.name === 'xhtml:link')) {
        expect(tag.attrs.rel === 'alternate' && !alternatesInXml.has(tag.attrs.hreflang), 'sitemap-hreflang', path, 'Invalid or duplicate XML alternate.');
        alternatesInXml.set(tag.attrs.hreflang, tag.attrs.href);
      }
      compareAlternates(alternatesInXml, expectedAlternates(entry), path + ':' + entry.path);
    }
  }
  expect(eqSet([...sitemapUrls], [...expectedIndexable]), 'sitemap-coverage', 'sitemap.xml', 'Sitemap URL set must equal all and only indexable routes.');
  report.counts.sitemapUrls = sitemapUrls.size;
  report.counts.sitemapShards = expectedShards.length;
  const robots = readText(resolve(dist, 'robots.txt'), 'robots.txt');
  if (robots !== null) {
    expect(preview ? /^\s*Disallow:\s*\/\s*$/m.test(robots) : !/^\s*Disallow:\s*\/\s*$/m.test(robots),
      'robots-policy', 'robots.txt', 'Crawl policy differs from preview/production mode.');
    if (!preview) expect(robots.includes('Sitemap: ' + absolute('/sitemap.xml')), 'robots-sitemap', 'robots.txt', 'Missing the canonical sitemap index URL.');
  }
  expect(/^[a-f0-9-]{8,128}$/i.test(config.indexNowKey || ''), 'indexnow-key-format', 'portal/config.json', 'Invalid IndexNow key format.');
  const key = readText(resolve(dist, config.indexNowKey + '.txt'), 'IndexNow key file');
  expect(key === config.indexNowKey, 'indexnow-key-content', 'IndexNow key file', 'The public key file must contain exactly the configured key.');
  report.counts.checkedHtmlPages = processed;
}

try { await verify(); }
catch (error) { problem('fatal', relative(projectRoot, dist), error.stack || error.message); }
report.status = report.errorCount === 0 ? 'passed' : 'failed';
report.durationMs = Date.now() - started;
report.omittedErrorDetails = Math.max(0, report.errorCount - report.errors.length);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  status: report.status, preview: report.preview, games: report.counts.games,
  languages: report.counts.locales, htmlPages: report.counts.checkedHtmlPages,
  indexableGamePages: report.indexableGameCounts.total, sitemapUrls: report.counts.sitemapUrls,
  fileCount: report.fileCount, bytes: report.bytes, errors: report.errorCount,
  report: relative(projectRoot, reportPath), durationMs: report.durationMs
}, null, 2));
if (report.errorCount) {
  for (const error of report.errors.slice(0, 15)) console.error(error.check + ' [' + error.path + '] ' + error.message);
  process.exitCode = 1;
}
