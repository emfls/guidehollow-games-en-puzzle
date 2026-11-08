import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

// Exercise the shipped DOM and real client code. No network transport is used.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const distIndex = args.indexOf('--dist');
const dist = resolve(root, distIndex < 0 ? 'dist-portal' : args[distIndex + 1] || 'dist-portal');
const output = resolve(root, 'release-manifests/portal-client-tests.json');
const started = Date.now();
const hash = value => createHash('sha256').update(value).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const storageKeys = {
  favorites: 'guidehollow:games:favorites',
  recent: 'guidehollow:games:recent'
};
const expectedClid = 'p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92';
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  status: 'failed',
  runtime: { node: process.version, jsdom: '31.0.0' },
  method: 'Built HTML parsed by JSDOM outside-only; actual portal/site.js evaluated with window.eval; DOM events exercise behavior.',
  inputs: { outputDirectory: relative(root, dist), html: [], catalogs: {} },
  network: {
    automaticSubresourceLoading: false,
    externalRequestsMade: 0,
    policy: 'JSDOM subresources disabled; fetch serves only local /assets/catalog/<supported-locale>.json GET requests. Other client network APIs throw.',
    mockedFetches: [],
    injectedCatalogFailures: [],
    prohibitedAttempts: []
  },
  limitations: [
    'JSDOM is a DOM emulator, not a real browser or visual/layout test.',
    'External iframe content, advertisements, gameplay, provider uptime, TLS, cookies, and real game load events are not tested.',
    'Fullscreen is tested only in its unsupported fallback; clipboard is an in-memory mock.',
    'Navigation between documents is simulated with a new JSDOM document and copied localStorage where persistence is under test.',
    'Language support is checked against recorded provider metadata; in-game translations are not independently observed.'
  ],
  cases: [],
  warnings: [],
  totals: { passed: 0, failed: 0, assertions: 0, documents: 0 }
};
let clientSource, portalConfig, runtimeGames, runtimeById, supportedLocales;
const loadedHtml = new Map();
const localCatalogs = new Map();

function check(context, condition, message) {
  context.result.assertions++;
  assert.ok(condition, message);
}
function equal(context, actual, expected, message) {
  context.result.assertions++;
  assert.equal(actual, expected, message);
}
function same(context, actual, expected, message) {
  context.result.assertions++;
  assert.deepEqual(actual, expected, message);
}
async function until(condition, message, timeout = 2500) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (condition()) return;
    await delay(12);
  }
  assert.fail('Timed out: ' + message);
}
function required(document, selector) {
  const element = document.querySelector(selector);
  assert.ok(element, 'Missing interactive element: ' + selector);
  return element;
}
function click(node, window) {
  if (typeof node.click === 'function') node.click();
  else node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function escapeKey(page) {
  page.document.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}
function pointerDown(page, node) {
  const Pointer = page.window.PointerEvent || page.window.MouseEvent;
  node.dispatchEvent(new Pointer('pointerdown', { bubbles: true, cancelable: true }));
}
function stored(page, type) {
  return JSON.parse(page.window.localStorage.getItem(storageKeys[type]) || '[]');
}
function storageSnapshot(page) {
  const result = {};
  for (let index = 0; index < page.window.localStorage.length; index++) {
    const key = page.window.localStorage.key(index);
    result[key] = page.window.localStorage.getItem(key);
  }
  return result;
}
function storageEventFromAnotherTab(page, type, value) {
  const key = storageKeys[type], oldValue = page.window.localStorage.getItem(key);
  const newValue = JSON.stringify(value);
  // A receiving tab observes the updated shared storage before its StorageEvent.
  page.window.localStorage.setItem(key, newValue);
  page.window.dispatchEvent(new page.window.StorageEvent('storage', {
    key, oldValue, newValue, storageArea: page.window.localStorage,
    url: new URL('/en/privacy/', portalConfig.origin).href
  }));
}
function favoriteName(context, page, button, title, saved) {
  equal(context, button.dataset.gameTitle, title, 'Favorite button retains its individual game title');
  equal(context, button.getAttribute('aria-label'), (saved ? page.config.copy.saved : page.config.copy.save) + ': ' + title,
    'Favorite accessible name includes the localized action and individual game title');
}
function favoritesLinkName(context, page, count) {
  equal(context, required(page.document, '.favorites-link').getAttribute('aria-label'),
    page.config.copy.favorites + ' (' + count + ')', 'Header favorite link has a localized name and current count');
}
function searchCards(page) {
  return Array.from(page.document.querySelectorAll('[data-search-results] .game-card'));
}
function searchIds(page) {
  return searchCards(page).map(card => required(card, '[data-favorite]').dataset.favorite);
}
function catalogFor(locale) {
  if (!localCatalogs.has(locale)) {
    const path = 'assets/catalog/' + locale + '.json';
    const body = readFileSync(resolve(dist, path), 'utf8');
    const data = JSON.parse(body);
    assert.ok(Array.isArray(data), path + ' must be an array');
    localCatalogs.set(locale, { body, data, path });
    report.inputs.catalogs[locale] = { path, count: data.length, sha256: hash(body) };
  }
  return localCatalogs.get(locale);
}
function lateSearchTarget(catalog) {
  // Pick a real, distinctive title far beyond the first results page.
  for (let index = catalog.length - 1; index >= 48; index--) {
    const candidate = catalog[index], needle = candidate.title.trim().toLowerCase();
    if (needle.length >= 8 && catalog.filter(game =>
      (game.title + ' ' + game.originalTitle).toLowerCase().includes(needle)).length === 1) return candidate;
  }
  assert.fail('No distinctive full-catalog search fixture beyond the first 48 games.');
}
function forbidden(context, api, value) {
  const attempt = { test: context.result.name, api, value: String(value ?? '') };
  report.network.prohibitedAttempts.push(attempt);
  throw new Error('Network access prohibited by DOM test harness: ' + api);
}
function openPage(context, path, initialStorage = {}, behavior = {}) {
  const url = new URL(path, portalConfig.origin);
  assert.equal(url.origin, new URL(portalConfig.origin).origin, 'Only local portal documents may be opened');
  const relativeFile = url.pathname.endsWith('/') ? url.pathname.slice(1) + 'index.html' : url.pathname.slice(1);
  const html = readFileSync(resolve(dist, relativeFile), 'utf8');
  loadedHtml.set(relativeFile, { path: relativeFile, sha256: hash(html) });
  const errors = [];
  const carouselTimers=new Map();let carouselTimer=0,mediaChange,intersectionChange,hidden=false;
  const media={matches:Boolean(behavior.reducedMotion),addEventListener:(name,callback)=>mediaChange=callback};
  let remainingCatalogFailures = behavior.rejectCatalogFetches || 0;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push({ type: error.type, message: error.cause?.message || error.message }));
  virtualConsole.on('error', (...items) => errors.push({ type: 'console.error', message: items.map(String).join(' ') }));
  const dom = new JSDOM(html, {
    url: url.href,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
    // Deliberately omit "resources": jsdom 31 then never loads stylesheet,
    // image, script or iframe subresources. Only window.eval below runs code.
    beforeParse(window) {
      window.matchMedia=()=>media;
      if(behavior.carouselClock){
        const timeout=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);
        window.setTimeout=(callback,ms,...args)=>ms===6000?(carouselTimers.set(++carouselTimer,callback),`carousel:${carouselTimer}`):timeout(callback,ms,...args);
        window.clearTimeout=id=>typeof id==='string'&&id.startsWith('carousel:')?carouselTimers.delete(Number(id.slice(9))):clear(id);
        Object.defineProperty(window.document,'hidden',{configurable:true,get:()=>hidden});
        window.IntersectionObserver=class{constructor(callback){intersectionChange=callback;}observe(){}};
      }
      window.fetch = async (input, options = {}) => {
        const requested = new URL(typeof input === 'string' ? input : input.url || String(input), window.location.href);
        const method = String(options.method || input?.method || 'GET').toUpperCase();
        const match = requested.pathname.match(/^\/assets\/catalog\/([a-z]{2})\.json$/);
        if (method !== 'GET' || requested.origin !== url.origin || requested.search || requested.hash ||
            !match || !supportedLocales.has(match[1])) return forbidden(context, 'fetch', requested.href);
        const fixture = catalogFor(match[1]);
        const record = { test: context.result.name, url: requested.href, method, source: fixture.path, count: fixture.data.length, outcome: 'fulfilled' };
        report.network.mockedFetches.push(record);
        if (remainingCatalogFailures > 0) {
          remainingCatalogFailures--;
          record.outcome = 'injected-rejection';
          report.network.injectedCatalogFailures.push({ test: context.result.name, url: requested.href, reason: 'Intentional local fetch rejection for retry regression' });
          throw new TypeError('Intentional local catalog fetch failure (test fixture)');
        }
        return { ok: true, status: 200, url: requested.href, json: async () => {
          const data=JSON.parse(fixture.body);
          return behavior.catalogTransform?behavior.catalogTransform(data):data;
        } };
      };
      for (const api of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
        Object.defineProperty(window, api, { configurable: true, value: function (...values) { return forbidden(context, api, values[0]); } });
      }
      Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: value => forbidden(context, 'sendBeacon', value) });
      window.addEventListener('error', event => {
        errors.push({ type: 'window.error', message: event.error?.message || event.message });
        event.preventDefault();
      });
      window.addEventListener('unhandledrejection', event => {
        errors.push({ type: 'unhandledrejection', message: String(event.reason) });
        event.preventDefault();
      });
    }
  });
  context.pages.push(dom);
  report.totals.documents++;
  const { window } = dom;
  for (const [key, value] of Object.entries(initialStorage)) window.localStorage.setItem(key, value);
  const document = window.document;
  const config = JSON.parse(required(document, '#portal-config').textContent);
  const builtScript = document.querySelector('script[src]');
  if (builtScript) {
    const path = new URL(builtScript.src).pathname.slice(1);
    const builtFile = resolve(dist, path);
    const matches = existsSync(builtFile) && hash(readFileSync(builtFile)) === report.inputs.client.sha256;
    const warning = 'Built client asset differs from the executed source: ' + path;
    if (!matches && !report.warnings.includes(warning)) report.warnings.push(warning);
  }
  window.eval(clientSource + '\n//# sourceURL=portal/site.js');
  const page = { dom, window, document, config, errors,carousel:{pending:()=>carouselTimers.size,tick:()=>{const [id,callback]=carouselTimers.entries().next().value||[];if(callback){carouselTimers.delete(id);callback();}},motion:value=>{media.matches=value;mediaChange?.();},visible:value=>intersectionChange?.([{isIntersecting:value}]),hidden:value=>{hidden=value;document.dispatchEvent(new window.Event('visibilitychange'));}} };
  context.opened.push(page);
  return page;
}
async function searchReady(page, expectedCount) {
  await until(() => searchCards(page).length === expectedCount &&
    required(page.document, '[data-search-status]').textContent !== page.config.copy.loading,
  'search results to render (' + expectedCount + ')');
}
async function queryByInput(page, title, expectedId) {
  const input = required(page.document, '#site-search');
  input.value = title;
  input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
  await until(() => new URL(page.window.location.href).searchParams.get('q') === title &&
    searchIds(page).includes(expectedId), 'debounced input to find a game beyond the first page');
}
function verifyFrame(context, page, game) {
  const frames = page.document.querySelectorAll('iframe');
  equal(context, frames.length, 1, 'Exactly one iframe is created after Play');
  const frame = frames[0];
  equal(context, frame.getAttribute('src'), game.embedUrl, 'Iframe retains the exact catalog embed URL');
  const url = new URL(frame.src);
  same(context, Array.from(url.searchParams).filter(([name]) => name.toLowerCase() === 'clid'),
    [['clid', expectedClid]], 'The iframe has exactly one correct publisher CLID');
  equal(context, required(page.document, '[data-frame-stage]').hidden, false, 'The frame stage is shown');
  equal(context, required(page.document, '[data-preview]').hidden, true, 'The preview is hidden during play');
  equal(context, required(page.document, '[data-player-toolbar]').hidden, false, 'Player controls are shown');
  return frame;
}
async function test(name, callback) {
  const result = { name, status: 'failed', assertions: 0, details: {} };
  const context = { result, pages: [], opened: [] };
  const start = Date.now(), prohibitedBefore = report.network.prohibitedAttempts.length;
  try {
    await callback(context);
    await delay(0);
    for (const page of context.opened) same(context, page.errors, [], 'No client exception or JSDOM error');
    equal(context, report.network.prohibitedAttempts.length, prohibitedBefore, 'No prohibited client network request');
    result.status = 'passed';
    report.totals.passed++;
  } catch (error) {
    result.error = { message: error.message, stack: error.stack?.split('\n').slice(0, 8).join('\n') };
    report.totals.failed++;
  } finally {
    for (const dom of context.pages) dom.window.close();
    result.durationMs = Date.now() - start;
    report.totals.assertions += result.assertions;
    report.cases.push(result);
    console.log(result.status.toUpperCase() + ' ' + name + ' (' + result.assertions + ' assertions)');
  }
}

async function main() {
  portalConfig = readJson(resolve(root, 'portal/config.json'));
  runtimeGames = readJson(resolve(root, 'data/portal/catalog.json')).games;
  runtimeById = new Map(runtimeGames.map(game => [game.id, game]));
  supportedLocales = new Set(runtimeGames.flatMap(game => game.locales));
  clientSource = readFileSync(resolve(root, 'portal/site.js'), 'utf8');
  report.inputs.client = { path: 'portal/site.js', sha256: hash(clientSource) };
  report.inputs.runtimeCatalog = { path: 'data/portal/catalog.json', sha256: hash(readFileSync(resolve(root, 'data/portal/catalog.json'))), count: runtimeGames.length };
  report.inputs.buildInfo = readJson(resolve(dist, 'build-info.json'));
  const curated = new Set(readJson(resolve(root, 'data/catalog.json')).map(game => game.id));
  const game = runtimeGames.find(item => curated.has(item.id) && item.locales.includes('en') &&
    new URL(item.embedUrl).hostname === 'playgama.com');
  assert.ok(game, 'Need a curated English game with the normal provider embed host');
  const otherEnglish = runtimeGames.find(item => item.id !== game.id && item.locales.includes('en'));
  const gamePath = '/en/play/' + game.slug + '/';
  const en = catalogFor('en').data, ko = catalogFor('ko').data.filter(game=>game.native);
  assert.ok(en.length > 48 && ko.length > 48, 'Need real paginated English and Korean catalogs');
  const englishOnly = en.find(item => !runtimeById.get(item.id)?.locales.includes('ko'));
  assert.ok(englishOnly, 'Need an English-only fixture to test Korean native-language filtering');
  await test('carousel: automatic rotation, wrapping, manual controls and explicit pause',async context=>{
    const page=openPage(context,'/ko/',{},{carouselClock:true}),slides=[...page.document.querySelectorAll('[data-slide]')];
    equal(context,slides.length,6,'Home renders six source-backed recommendations');
    const active=()=>slides.findIndex(slide=>!slide.hidden);
    equal(context,active(),0,'The first recommendation is visible without waiting');
    equal(context,page.carousel.pending(),1,'Exactly one six-second timer is scheduled');
    page.carousel.tick();equal(context,active(),1,'Timer advances to the next game');
    equal(context,required(page.document,'[data-carousel-position]').textContent,'2 / 6','The compact mobile counter keeps position and total on one line');
    equal(context,required(page.document,'[data-carousel-position]').getAttribute('aria-label'),page.config.copy.carouselPosition.replace('{position}',2).replace('{total}',6),'The counter retains a descriptive localized accessible name');
    equal(context,page.carousel.pending(),1,'Automatic rotation keeps one timer');
    click(required(page.document,'[data-carousel-prev]'),page.window);equal(context,active(),0,'Previous returns to the first game');
    click(required(page.document,'[data-carousel-prev]'),page.window);equal(context,active(),5,'Previous wraps to the last game');
    click(required(page.document,'[data-carousel-next]'),page.window);equal(context,active(),0,'Next wraps to the first game');
    click(required(page.document,'[data-carousel-pause]'),page.window);equal(context,page.carousel.pending(),0,'Explicit pause cancels automatic rotation');
    equal(context,required(page.document,'[data-carousel-pause]').getAttribute('aria-label'),page.config.copy.carouselResume,'Paused state offers a localized resume label');
    equal(context,required(page.document,'[data-carousel-controls]').getAttribute('aria-hidden'),null,'Controls are accessible after client initialization');
    click(required(page.document,'[data-carousel-next]'),page.window);equal(context,active(),1,'Manual browsing works while paused');
    equal(context,page.carousel.pending(),0,'Manual browsing does not cancel the explicit pause');
    click(required(page.document,'[data-carousel-pause]'),page.window);equal(context,page.carousel.pending(),1,'Resume restarts a single timer');
    equal(context,slides.filter(slide=>!slide.hidden).length,1,'Only one slide remains exposed');
  });
  await test('carousel: hover, keyboard focus, visibility and reduced-motion pauses',async context=>{
    const page=openPage(context,'/ko/',{},{carouselClock:true}),root=required(page.document,'[data-carousel]');
    root.dispatchEvent(new page.window.Event('mouseenter'));equal(context,page.carousel.pending(),0,'Hover pauses rotation');
    root.dispatchEvent(new page.window.Event('mouseleave'));equal(context,page.carousel.pending(),1,'Leaving resumes rotation');
    required(page.document,'[data-carousel-next]').focus();equal(context,page.carousel.pending(),0,'Keyboard focus prevents a moving target');
    required(page.document,'input[name=q]').focus();equal(context,page.carousel.pending(),1,'Leaving carousel focus resumes rotation');
    page.carousel.hidden(true);equal(context,page.carousel.pending(),0,'A background document does not rotate');
    page.carousel.hidden(false);equal(context,page.carousel.pending(),1,'Returning to the document resumes rotation');
    page.carousel.visible(false);equal(context,page.carousel.pending(),0,'An off-screen carousel does not rotate');
    page.carousel.visible(true);equal(context,page.carousel.pending(),1,'Visible carousel resumes');
    page.carousel.motion(true);equal(context,page.carousel.pending(),0,'Reduced motion disables automatic rotation');
    click(required(page.document,'[data-carousel-next]'),page.window);equal(context,page.carousel.pending(),0,'Reduced motion still permits manual browsing');
    page.carousel.motion(false);equal(context,page.carousel.pending(),1,'Updated motion preference is respected');
    const reduced=openPage(context,'/ar/',{},{carouselClock:true,reducedMotion:true});equal(context,reduced.carousel.pending(),0,'Reduced-motion preference is honored from initialization');
  });
  await test('localized player: unsupported game keeps Korean UI and explicit attributed play',async context=>{
    const selected=catalogFor('ko').data.find(item=>item.id===englishOnly.id);
    const page=openPage(context,selected.path);
    equal(context,required(page.document,'.language-panel a[lang="ja"]').getAttribute('href'),'/ja/play/?game='+encodeURIComponent(selected.id),'Language switch preserves identity while metadata is loading');
    await until(()=>!required(page.document,'[data-player-content]').hidden,'localized player ready');
    equal(context,page.document.documentElement.lang,'ko','Game UI retains selected language');
    equal(context,required(page.document,'h1').textContent,selected.title,'Game heading uses the saved localized name');
    equal(context,required(page.document,'[data-shell-summary]').textContent,selected.detail.description,'Game description uses the full selected-language detail');
    equal(context,required(page.document,'[data-shell-instructions]').textContent,selected.detail.instructions,'Game-specific instructions are exposed in the article');
    check(context,required(page.document,'[data-shell-compatibility]').textContent.includes(selected.title),'Compatibility details identify this game');
    check(context,!required(page.document,'.portal-editorial').textContent.includes('제공업체가 이 게임의 자세한 조작법을 제공하지 않았습니다'),'An untranslated guide must not claim provider controls are absent');
    equal(context,required(page.document,'.portal-editorial [data-shell-source]').href,selected.affiliateUrl,'Original control instructions remain accessible through the attributed source');
    equal(context,page.document.querySelectorAll('iframe').length,0,'Loading translated metadata does not start a game or advertisement');
    equal(context,required(page.document,'.language-panel a[lang="ja"]').getAttribute('href'),'/ja/play/?game='+encodeURIComponent(selected.id),'Language switch retains this unsupported game');
    const save=required(page.document,'[data-shell-favorite]');click(save,page.window);
    same(context,stored(page,'favorites'),[selected.id],'Favorite uses original stable identity');
    click(required(page.document,'[data-play]'),page.window);
    equal(context,required(page.document,'iframe').src,selected.embedUrl,'Explicit Play retains exact attributed source URL');
    same(context,stored(page,'recent'),[selected.id],'Translated player records stable recent identity');
    const copied=[];Object.defineProperty(page.window.navigator,'clipboard',{configurable:true,value:{writeText:async text=>copied.push(text)}});
    click(required(page.document,'[data-share]'),page.window);
    await until(()=>copied.length===1,'localized share');
    equal(context,copied[0],new URL(selected.path,portalConfig.origin).href,'Share retains the selected UI language and game query');
  });
  await test('localized player: invalid IDs, rejected fetch and unsafe provider URL fail closed',async context=>{
    const invalid=openPage(context,'/ko/play/?game='+encodeURIComponent('<img src=x onerror=alert(1)>'));
    await until(()=>required(invalid.document,'[data-player-error]').textContent===invalid.config.copy.notFound,'invalid game rejection');
    equal(context,invalid.document.querySelectorAll('iframe').length,0,'Invalid query never creates a frame');
    const failed=openPage(context,'/ko/play/?game='+encodeURIComponent(englishOnly.id),{},{rejectCatalogFetches:1});
    await until(()=>required(failed.document,'[data-player-error]').textContent===failed.config.copy.catalogLoadError,'fetch failure');
    check(context,required(failed.document,'[data-player-content]').hidden,'Fetch failure keeps the player hidden');
    const unsafe=openPage(context,'/ko/play/?game='+encodeURIComponent(englishOnly.id),{},{catalogTransform:data=>data.map(item=>item.id===englishOnly.id?{...item,embedUrl:'https://example.invalid/export?clid='+expectedClid}:item)});
    await until(()=>required(unsafe.document,'[data-player-error]').textContent===unsafe.config.copy.catalogLoadError,'provider origin rejection');
    equal(context,unsafe.document.querySelectorAll('iframe').length,0,'Unknown provider origins never produce a frame');
  });
  await test('localized player: official custom provider export host remains playable',async context=>{
    const selected=catalogFor('ko').data.find(item=>new URL(item.embedUrl).hostname!=='playgama.com' && !item.native);
    assert.ok(selected,'Need a valid non-Playgama provider origin');
    const page=openPage(context,selected.path);
    await until(()=>!required(page.document,'[data-player-content]').hidden,'custom provider metadata');
    click(required(page.document,'[data-play]'),page.window);
    equal(context,required(page.document,'iframe').src,selected.embedUrl,'Custom host retains the exact approved export and CLID');
  });
  await test('localized detail text: provider markup stays text and malformed details fail closed',async context=>{
    const path='/ko/play/?game='+encodeURIComponent(englishOnly.id);
    const page=openPage(context,path,{},{catalogTransform:data=>data.map(item=>item.id===englishOnly.id?{...item,detail:{...item.detail,description:'<img src=x onerror=alert(1)>',instructions:'<script>alert(1)</script>'}}:item)});
    await until(()=>!required(page.document,'[data-player-content]').hidden,'escaped detail ready');
    equal(context,required(page.document,'[data-shell-summary]').textContent,'<img src=x onerror=alert(1)>','Provider markup is rendered as literal text');
    equal(context,page.document.querySelectorAll('.portal-editorial img,.portal-editorial script').length,0,'Detail payloads cannot add active DOM');
    equal(context,page.document.querySelectorAll('iframe').length,0,'Detail loading does not request a game');
    const invalid=openPage(context,path,{},{catalogTransform:data=>data.map(item=>item.id===englishOnly.id?{...item,detail:{...item.detail,controls:[{}]}}:item)});
    await until(()=>required(invalid.document,'[data-player-error]').textContent===invalid.config.copy.catalogLoadError,'malformed detail rejection');
    check(context,required(invalid.document,'[data-player-content]').hidden,'Invalid detail shape never exposes the player');
  });

  await test('player: explicit launch, duplicate prevention, close, Escape and recent persistence', async context => {
    const page = openPage(context, gamePath, { [storageKeys.recent]: JSON.stringify([otherEnglish.id, game.id]) });
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'No iframe exists before explicit Play');
    const play = required(page.document, '[data-play]');
    click(play, page.window);
    const first = verifyFrame(context, page, game);
    click(play, page.window);
    equal(context, page.document.querySelectorAll('iframe').length, 1, 'Repeated Play does not create a duplicate iframe');
    equal(context, page.document.querySelector('iframe'), first, 'Repeated Play keeps the existing frame');
    same(context, stored(page, 'recent'), [game.id, otherEnglish.id], 'Played game moves to the front once in persisted recent history');
    click(required(page.document, '[data-close-game]'), page.window);
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'Close removes the iframe');
    equal(context, required(page.document, '[data-preview]').hidden, false, 'Close restores the preview');
    equal(context, required(page.document, '[data-frame-stage]').hidden, true, 'Close hides the frame stage');
    equal(context, required(page.document, '[data-player-toolbar]').hidden, true, 'Close hides player controls');
    equal(context, page.document.activeElement, play, 'Close returns keyboard focus to Play');
    click(play, page.window);
    verifyFrame(context, page, game);
    escapeKey(page);
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'Escape closes the active game');
    equal(context, page.document.activeElement, play, 'Escape restores Play focus');
    const recentPage = openPage(context, '/en/search/?view=recent', storageSnapshot(page));
    await searchReady(recentPage, 2);
    same(context, searchIds(recentPage), [game.id, otherEnglish.id], 'The recent view displays persisted play order');
    equal(context, required(recentPage.document, '[data-search-heading]').textContent, recentPage.config.copy.recent, 'Recent view uses its localized heading');
    context.result.details = { gameId: game.id, embedHost: new URL(game.embedUrl).hostname, recentOrder: searchIds(recentPage) };
  });

  await test('player: fun-fishing external provider URL and attribution are preserved', async context => {
    const external = runtimeById.get('fun-fishing');
    check(context, external?.locales.includes('en'), 'The external-provider fixture supports English');
    const host = new URL(external.embedUrl).hostname;
    check(context, host !== 'playgama.com' && !host.endsWith('.playgama.com'), 'Fixture is hosted by an external provider');
    const page = openPage(context, '/en/play/' + external.slug + '/');
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'External-host game is also lazy');
    click(required(page.document, '[data-play]'), page.window);
    verifyFrame(context, page, external);
    const providerLink = Array.from(page.document.querySelectorAll('a')).find(link => link.href === external.affiliateUrl);
    check(context, Boolean(providerLink), 'External-host game retains its exact attributed provider link');
    click(required(page.document, '[data-close-game]'), page.window);
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'External-provider iframe is removed on Close');
    context.result.details = { gameId: external.id, embedHost: host, embedUrl: external.embedUrl };
  });

  await test('favorites: delegated click, state, localStorage and saved-view removal', async context => {
    const page = openPage(context, gamePath);
    const button = Array.from(page.document.querySelectorAll('[data-favorite]')).find(item => item.dataset.favorite === game.id);
    check(context, Boolean(button), 'Game has a favorite button');
    equal(context, button.getAttribute('aria-pressed'), 'false', 'Favorite starts unselected');
    favoriteName(context, page, button, page.config.game.title, false);
    favoritesLinkName(context, page, 0);
    click(button.querySelector('svg') || button, page.window);
    same(context, stored(page, 'favorites'), [game.id], 'A nested icon click persists the game as a favorite');
    equal(context, button.getAttribute('aria-pressed'), 'true', 'Favorite state is announced as selected');
    equal(context, required(button, '.favorite-text').textContent, page.config.copy.saved, 'Favorite text changes to Saved');
    favoriteName(context, page, button, page.config.game.title, true);
    equal(context, required(page.document, '[data-favorite-count]').textContent, '1', 'Header favorite count updates');
    favoritesLinkName(context, page, 1);
    click(button, page.window);
    same(context, stored(page, 'favorites'), [], 'A second click removes the favorite');
    equal(context, button.getAttribute('aria-pressed'), 'false', 'Removed favorite is announced as unselected');
    favoriteName(context, page, button, page.config.game.title, false);
    equal(context, required(page.document, '[data-favorite-count]').textContent, '0', 'Header count returns to zero');
    favoritesLinkName(context, page, 0);
    click(button, page.window);
    const savedPage = openPage(context, '/en/search/?view=favorites', storageSnapshot(page));
    await searchReady(savedPage, 1);
    same(context, searchIds(savedPage), [game.id], 'Saved view reads the persisted favorite');
    equal(context, required(savedPage.document, '[data-search-heading]').textContent, savedPage.config.copy.favorites, 'Saved view heading is localized');
    favoriteName(context, savedPage, required(savedPage.document, '[data-search-results] [data-favorite]'),
      required(savedPage.document, '[data-search-results] h3').textContent, true);
    click(required(savedPage.document, '[data-search-results] [data-favorite]'), savedPage.window);
    await until(() => searchCards(savedPage).length === 0 &&
      required(savedPage.document, '[data-search-status]').textContent.includes(savedPage.config.copy.noResults),
    'removing the last favorite to update the saved results');
    same(context, stored(savedPage, 'favorites'), [], 'Saved-view removal updates localStorage');
    equal(context, required(savedPage.document, '[data-more-results]').hidden, true, 'Empty saved view hides More');
  });

  await test('privacy: clear saved and recent history without clearing unrelated storage', async context => {
    const page = openPage(context, '/en/privacy/', {
      [storageKeys.favorites]: JSON.stringify([game.id]),
      [storageKeys.recent]: JSON.stringify([game.id, otherEnglish.id]),
      'unrelated:test-setting': 'preserve'
    });
    equal(context, required(page.document, '[data-favorite-count]').textContent, '1', 'Existing saved state is reflected on the privacy page');
    click(required(page.document, '[data-clear-storage]'), page.window);
    equal(context, page.window.localStorage.getItem(storageKeys.favorites), null, 'Clear removes saved games');
    equal(context, page.window.localStorage.getItem(storageKeys.recent), null, 'Clear removes recent history');
    equal(context, page.window.localStorage.getItem('unrelated:test-setting'), 'preserve', 'Clear leaves unrelated storage intact');
    equal(context, required(page.document, '[data-favorite-count]').textContent, '0', 'Clear updates the header count');
    equal(context, required(page.document, '[data-toast]').textContent, page.config.copy.storageCleared, 'Clear announces its localized result');
    equal(context, required(page.document, '[data-toast]').hidden, false, 'Clear confirmation is visible');
  });

  await test('language menu: real summary click, Escape focus, outside close and player priority', async context => {
    const page = openPage(context, gamePath);
    const menu = required(page.document, '[data-menu]'), summary = required(menu, 'summary');
    click(summary, page.window);
    equal(context, menu.open, true, 'Clicking the summary opens the language menu');
    required(menu, 'a').focus();
    escapeKey(page);
    equal(context, menu.open, false, 'Escape closes the language menu');
    equal(context, page.document.activeElement, summary, 'Escape returns focus to the language summary');
    click(summary, page.window);
    pointerDown(page, required(menu, 'nav'));
    equal(context, menu.open, true, 'A pointer event inside the menu keeps it open');
    pointerDown(page, required(page.document, 'main'));
    equal(context, menu.open, false, 'An outside pointer event closes the menu');
    click(required(page.document, '[data-play]'), page.window);
    click(summary, page.window);
    escapeKey(page);
    equal(context, menu.open, false, 'Escape closes the menu before closing the game');
    equal(context, page.document.querySelectorAll('iframe').length, 1, 'The game remains open after closing the menu');
    escapeKey(page);
    equal(context, page.document.querySelectorAll('iframe').length, 0, 'A subsequent Escape closes the game');
  });

  await test('language menu: every locale remains reachable with unsupported-game home fallback', async context => {
    const fixture = runtimeGames.find(item => item.locales.includes('en') && item.locales.length > 1 &&
      item.locales.length < supportedLocales.size);
    check(context, Boolean(fixture), 'Fixture has both supported and unsupported portal languages');
    const page = openPage(context, '/en/play/' + fixture.slug + '/');
    const menu = required(page.document, '[data-menu]');
    click(required(menu, 'summary'), page.window);
    equal(context, menu.open, true, 'The complete language menu opens through its summary');
    const links = Array.from(menu.querySelectorAll('nav a'));
    same(context, links.map(link => link.lang).sort(), Array.from(supportedLocales).sort(),
      'Menu contains each portal language exactly once');
    for (const link of links) {
      const expected = fixture.locales.includes(link.lang) ? '/' + link.lang + '/play/' + fixture.slug + '/' : '/' + link.lang + '/play/?game='+encodeURIComponent(fixture.id);
      equal(context, link.getAttribute('href'), expected, 'Language destination preserves the selected game and UI language: ' + link.lang);
    }
    const fallback = links.find(link => !fixture.locales.includes(link.lang));
    check(context, Boolean(fallback), 'An unsupported language has an explicit menu entry');
    let clickedDestination;
    fallback.addEventListener('click', event => {
      event.preventDefault(); // JSDOM does not implement document navigation.
      clickedDestination = fallback.href;
    }, { once: true });
    click(fallback, page.window);
    equal(context, new URL(clickedDestination).pathname, '/' + fallback.lang + '/play/', 'Click resolves to the selected language player');
    const destination = openPage(context, clickedDestination);
    equal(context, destination.config.type, 'player', 'Fallback opens a real localized player document');
    equal(context, destination.config.locale, fallback.lang, 'Fallback document uses the selected language');
    same(context, Array.from(page.document.querySelectorAll('.launch-languages a')).map(link => link.lang).sort(),
      fixture.locales.slice().sort(), 'Game-native language list still excludes unsupported fallback languages');
    context.result.details = { gameId: fixture.id, menuLanguageCount: links.length, fallbackLocale: fallback.lang, fallbackPath: new URL(clickedDestination).pathname };
  });

  for (const locale of ['en', 'ko']) {
    await test(locale + ' search retry: rejected first fetch recovers on user input', async context => {
      const beforeFetch = report.network.mockedFetches.length;
      const page = openPage(context, '/' + locale + '/search/', {}, { rejectCatalogFetches: 1 });
      check(context, typeof page.config.copy.catalogLoadError === 'string' && page.config.copy.catalogLoadError.length > 0,
        'Client config contains the localized catalog-loading error');
      await until(() => required(page.document, '[data-search-status]').textContent === page.config.copy.catalogLoadError,
        'localized initial catalog fetch failure');
      equal(context, searchCards(page).length, 0, 'Failed catalog load leaves no stale result cards');
      equal(context, required(page.document, '[data-more-results]').hidden, true, 'Failed load hides More');
      check(context, required(page.document, '[data-search-status]').textContent !== page.config.copy.noResultsText,
        'Fetch failure is distinct from an empty search result');
      const target = lateSearchTarget(locale === 'en' ? en : ko);
      await queryByInput(page, target.title, target.id);
      check(context, searchIds(page).includes(target.id), 'A new search recovers actual results after the rejected fetch');
      check(context, required(page.document, '[data-search-status]').textContent !== page.config.copy.catalogLoadError,
        'Successful retry replaces the failure notice');
      const requests = report.network.mockedFetches.slice(beforeFetch);
      same(context, requests.map(request => request.outcome), ['injected-rejection', 'fulfilled'],
        'Retry performs a new local fetch instead of reusing the rejected promise');
      check(context, requests.every(request => new URL(request.url).pathname === '/assets/catalog/' + locale + '.json'),
        'Both attempts use the selected language catalog');
      const input = required(page.document, '#site-search');
      input.value = '';
      input.form.dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
      await searchReady(page, 24);
      equal(context, report.network.mockedFetches.length - beforeFetch, 2, 'A successful retry remains cached for later searches');
      context.result.details = { locale, intentionalMockFailures: 1, recoveredGameId: target.id, catalogFetchAttempts: 2 };
    });
  }

  await test('English search: full catalog, 24-result pagination, input debounce and query reset', async context => {
    const beforeFetch = report.network.mockedFetches.length;
    const page = openPage(context, '/en/search/');
    await searchReady(page, 24);
    same(context, searchIds(page), en.slice(0, 24).map(item => item.id), 'First results contain the first 24 actual catalog games');
    equal(context, required(page.document, '[data-more-results]').hidden, false, 'More is offered for the full English catalog');
    click(required(page.document, '[data-more-results]'), page.window);
    equal(context, searchCards(page).length, 48, 'More appends another 24 games');
    same(context, searchIds(page), en.slice(0, 48).map(item => item.id), 'More neither duplicates nor skips results');
    const target = lateSearchTarget(en);
    check(context, !searchIds(page).includes(target.id), 'Search fixture is outside the already rendered results');
    await queryByInput(page, target.title, target.id);
    check(context, searchIds(page).includes(target.id), 'Typing finds a game from the complete catalog');
    const link = searchCards(page).find(card => required(card, '[data-favorite]').dataset.favorite === target.id).querySelector('a');
    equal(context, link.getAttribute('href'), target.path, 'Search result points to the actual English game path');
    const input = required(page.document, '#site-search');
    input.value = '';
    input.form.dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
    await searchReady(page, 24);
    equal(context, new URL(page.window.location.href).searchParams.has('q'), false, 'Submitting an empty query removes it from the URL');
    same(context, searchIds(page), en.slice(0, 24).map(item => item.id), 'Clearing the query restores the first full-catalog results');
    const requests = report.network.mockedFetches.slice(beforeFetch);
    equal(context, requests.length, 1, 'Search input and More reuse one fetched catalog');
    equal(context, new URL(requests[0].url).pathname, '/assets/catalog/en.json', 'English search requests its own local catalog');
    check(context, en.every(item => item.native === runtimeById.get(item.id)?.locales.includes('en')), 'Every English search record accurately declares native support');
    same(context, en.map(item => item.id).sort(), runtimeGames.map(item => item.id).sort(), 'English UI includes the complete provider catalog');
    context.result.details = { totalCatalogGames: en.length, deepSearchGameId: target.id, deepSearchIndex: en.indexOf(target) };
  });

  await test('Korean search: own catalog, native-only results, final pagination and deep search', async context => {
    const beforeFetch = report.network.mockedFetches.length;
    const page = openPage(context, '/ko/search/?native=1');
    await searchReady(page, 24);
    favoritesLinkName(context, page, 0);
    for (const card of searchCards(page).slice(0, 2)) {
      favoriteName(context, page, required(card, '[data-favorite]'), required(card, 'h3').textContent, false);
    }
    check(context, ko.every(item => runtimeById.get(item.id)?.locales.includes('ko')), 'Every Korean catalog record declares native Korean support');
    same(context, ko.map(item => item.id).sort(), runtimeGames.filter(item => item.locales.includes('ko')).map(item => item.id).sort(), 'Korean search includes every native-supported game');
    const more = required(page.document, '[data-more-results]');
    let clicks = 0;
    while (!more.hidden && clicks <= Math.ceil(ko.length / 24)) { click(more, page.window); clicks++; }
    same(context, searchIds(page), ko.map(item => item.id), 'Repeated More reaches every Korean game once');
    equal(context, more.hidden, true, 'More disappears after the final partial page');
    check(context, searchCards(page).every(card => required(card, 'a').getAttribute('href').startsWith('/ko/play/')), 'All rendered links retain Korean paths');
    const target = lateSearchTarget(ko);
    await queryByInput(page, target.originalTitle || target.title, target.id);
    check(context, searchIds(page).includes(target.id), 'Korean search finds a deep-catalog game by its original title');
    const requests = report.network.mockedFetches.slice(beforeFetch);
    equal(context, requests.length, 1, 'Korean paging and querying reuse one catalog');
    equal(context, new URL(requests[0].url).pathname, '/assets/catalog/ko.json', 'Korean search never fetches English fallback data');
    context.result.details = { totalCatalogGames: ko.length, moreClicks: clicks, deepSearchGameId: target.id };
  });

  await test('Korean saved view: excludes unsupported saved games and updates after removal', async context => {
    const chosen = [ko[0], ko.at(-1)];
    const page = openPage(context, '/ko/search/?view=favorites&native=1', {
      [storageKeys.favorites]: JSON.stringify([englishOnly.id, ...chosen.map(item => item.id)])
    });
    await searchReady(page, 2);
    favoritesLinkName(context, page, 3);
    same(context, searchIds(page).slice().sort(), chosen.map(item => item.id).sort(), 'Saved view excludes games without native Korean support');
    check(context, !searchIds(page).includes(englishOnly.id), 'An English-only favorite does not leak into Korean results');
    const remove = required(page.document, '[data-search-results] [data-favorite]');
    const removedId = remove.dataset.favorite;
    click(remove, page.window);
    await searchReady(page, 1);
    check(context, !searchIds(page).includes(removedId), 'Removing a favorite updates the current saved view');
    check(context, stored(page, 'favorites').includes(englishOnly.id), 'Language filtering does not delete favorites for other languages');
    favoritesLinkName(context, page, 2);
    context.result.details = { excludedGameId: englishOnly.id, displayedNativeGames: chosen.map(item => item.id) };
  });

  await test('Korean recent view: preserves played order while excluding unsupported games', async context => {
    const ordered = [ko.at(-1).id, ko[0].id];
    const page = openPage(context, '/ko/search/?view=recent&native=1', {
      [storageKeys.recent]: JSON.stringify([englishOnly.id, ...ordered])
    });
    await searchReady(page, 2);
    same(context, searchIds(page), ordered, 'Recent view preserves history order among native-supported games');
    equal(context, required(page.document, '[data-search-heading]').textContent, page.config.copy.recent, 'Korean recent heading is localized');
    check(context, !searchIds(page).includes(englishOnly.id), 'Recent view excludes an English-only game');
    same(context, stored(page, 'recent'), [englishOnly.id, ...ordered], 'Filtering leaves persisted cross-language history intact');
  });

  await test('cross-tab saved storage: StorageEvent replaces, adds and removes visible cards', async context => {
    const beforeFetch = report.network.mockedFetches.length;
    const page = openPage(context, '/en/search/?view=favorites', {
      [storageKeys.favorites]: JSON.stringify([game.id])
    });
    await searchReady(page, 1);
    same(context, searchIds(page), [game.id], 'Saved view initially displays its persisted game');
    storageEventFromAnotherTab(page, 'favorites', [otherEnglish.id]);
    await until(() => searchIds(page).length === 1 && searchIds(page)[0] === otherEnglish.id,
      'saved cards to replace their IDs after another tab changes storage');
    same(context, searchIds(page), [otherEnglish.id], 'StorageEvent replaces saved cards, not only the header count');
    favoriteName(context, page, required(page.document, '[data-search-results] [data-favorite]'),
      required(page.document, '[data-search-results] h3').textContent, true);
    storageEventFromAnotherTab(page, 'favorites', [game.id, otherEnglish.id]);
    await searchReady(page, 2);
    same(context, searchIds(page).sort(), [game.id, otherEnglish.id].sort(), 'StorageEvent adds a newly saved card');
    favoritesLinkName(context, page, 2);
    storageEventFromAnotherTab(page, 'favorites', []);
    await until(() => searchCards(page).length === 0 &&
      required(page.document, '[data-search-status]').textContent.includes(page.config.copy.noResults),
    'saved cards to empty after another tab clears favorites');
    equal(context, searchCards(page).length, 0, 'StorageEvent removes obsolete saved cards');
    favoritesLinkName(context, page, 0);
    equal(context, report.network.mockedFetches.length - beforeFetch, 1, 'Storage refresh uses the already loaded catalog');
  });

  await test('cross-tab recent storage: StorageEvent refreshes order and native-language filtering', async context => {
    const first = ko[0].id, last = ko.at(-1).id;
    const page = openPage(context, '/ko/search/?view=recent&native=1', {
      [storageKeys.recent]: JSON.stringify([first, last])
    });
    await searchReady(page, 2);
    same(context, searchIds(page), [first, last], 'Recent view starts in its persisted order');
    storageEventFromAnotherTab(page, 'recent', [englishOnly.id, last, first]);
    await until(() => searchIds(page).join('|') === [last, first].join('|'),
      'recent cards to reorder after another tab plays a game');
    same(context, searchIds(page), [last, first], 'StorageEvent updates the visible recent order');
    check(context, !searchIds(page).includes(englishOnly.id), 'A cross-tab update still excludes games without native Korean support');
    storageEventFromAnotherTab(page, 'recent', []);
    await until(() => searchCards(page).length === 0 &&
      required(page.document, '[data-search-status]').textContent.includes(page.config.copy.noResults),
    'recent cards to clear after another tab removes history');
    equal(context, searchCards(page).length, 0, 'StorageEvent clears stale recent cards');
    equal(context, required(page.document, '[data-search-heading]').textContent, page.config.copy.recent,
      'Recent heading remains localized after storage refresh');
  });

  await test('global home: full catalog, support filter, last native page and browser Back', async context => {
    const number=n=>new Intl.NumberFormat('ko').format(n),nativePages=Math.ceil(ko.length/24);
    const globalRange='1–24 / '+number(runtimeGames.length),nativeRange='1–24 / '+number(ko.length);
    const finalRange=number((nativePages-1)*24+1)+'–'+number(ko.length)+' / '+number(ko.length);
    const page=openPage(context,'/ko/');
    equal(context,page.document.querySelectorAll('#collection [data-card]').length,24,'Global home renders its first 24 cards without a fetch');
    check(context,required(page.document,'[data-range]').textContent.includes(number(runtimeGames.length)),'Global range exposes the full catalog count');
    click(required(page.document,'[data-native-filter="native"]'),page.window);
    await until(()=>required(page.document,'[data-native-filter="native"]').getAttribute('aria-pressed')==='true','native filter to finish');
    equal(context,required(page.document,'[data-range]').textContent,nativeRange,'Native filter retains the separately measured native games');
    check(context,Array.from(page.document.querySelectorAll('[data-catalog-grid] [data-card]')).every(card=>card.dataset.native==='true'),'Native filter excludes unsupported games');
    click(required(page.document,'[data-native-page="'+nativePages+'"]'),page.window);
    await until(()=>required(page.document,'[data-range]').textContent===finalRange,'last native page to finish');
    equal(context,page.document.querySelectorAll('[data-catalog-grid] [data-card]').length,ko.length-(nativePages-1)*24,'Last native page contains exactly the remaining games');
    check(context,required(page.document,'.pagination [aria-current="page"]').href.includes('page='+nativePages),'Native pagination retains its current page');
    click(required(page.document,'[data-native-filter="all"]'),page.window);
    await until(()=>required(page.document,'[data-range]').textContent===globalRange,'all games to return');
    equal(context,new URL(page.window.location.href).search,'','Returning to all games clears native paging');
    page.window.history.back();
    await until(()=>required(page.document,'[data-range]').textContent===finalRange,'Back to restore native scope and page');
  });
  await test('global Korean search and saved view retain non-Korean games with valid fallback routes', async context => {
    const page=openPage(context,'/ko/search/?view=favorites',{[storageKeys.favorites]:JSON.stringify([englishOnly.id])});
    await searchReady(page,1);
    equal(context,searchIds(page)[0],englishOnly.id,'A saved English game remains accessible from the Korean UI');
    equal(context,required(page.document,'[data-search-results] a').getAttribute('href'),catalogFor('ko').data.find(game=>game.id===englishOnly.id).path,'Cross-language card uses the actual supported detail route');
    check(context,Boolean(required(page.document,'.game-language').textContent),'Fallback card announces its game language');
    click(required(page.document,'[data-native-filter="native"]'),page.window);
    await until(()=>searchCards(page).length===0,'native filter to exclude the English saved game');
    same(context,stored(page,'favorites'),[englishOnly.id],'Support filtering preserves saved history');
  });

  await test('native filter: unsupported genre has an explicit empty state', async context => {
    const genres=[...new Set(runtimeGames.flatMap(game=>game.genreIds))];
    const fixture=[...supportedLocales].flatMap(locale=>genres.filter(genre=>!runtimeGames.some(game=>game.locales.includes(locale)&&game.genreIds.includes(genre))).map(genre=>({locale,genre})))[0];
    if(!fixture){context.result.details={notApplicable:'Every current language/genre combination has native support'};return;}
    const {locale,genre}=fixture,total=runtimeGames.filter(game=>game.genreIds.includes(genre)).length;
    const page=openPage(context,'/'+locale+'/'+genre+'/?native=1');
    await until(()=>required(page.document,'[data-range]').textContent==='0 / 0','zero-supported genre to finish');
    equal(context,page.document.querySelectorAll('[data-catalog-grid] [data-card]').length,0,'No unsupported game is shown in the native filter');
    equal(context,required(page.document,'[data-catalog-pagination]').childElementCount,0,'Empty filter has no invented page number');
    check(context,Boolean(required(page.document,'.catalog-empty').textContent),'Empty filter explains that no matching game exists');
    click(required(page.document,'[data-native-filter="all"]'),page.window);
    await until(()=>required(page.document,'[data-range]').textContent==='1–'+new Intl.NumberFormat(locale).format(Math.min(24,total))+' / '+new Intl.NumberFormat(locale).format(total),'global games to return from the empty native filter');
  });

  await test('fullscreen fallback and clipboard sharing', async context => {
    const page = openPage(context, gamePath);
    const player = required(page.document, '[data-player]');
    Object.defineProperty(player, 'requestFullscreen', { configurable: true, value: undefined });
    Object.defineProperty(page.document, 'fullscreenElement', { configurable: true, value: null });
    click(required(page.document, '[data-play]'), page.window);
    click(required(page.document, '[data-fullscreen]'), page.window);
    await until(() => required(page.document, '[data-toast]').textContent === page.config.copy.fullscreenHelp, 'unsupported fullscreen help');
    equal(context, required(page.document, '[data-toast]').hidden, false, 'Unsupported fullscreen gives visible guidance');
    equal(context, page.document.querySelectorAll('iframe').length, 1, 'Fullscreen fallback keeps the game open');
    const copied = [];
    Object.defineProperty(page.window.navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(page.window.navigator, 'clipboard', { configurable: true, value: { writeText: async text => copied.push(text) } });
    click(required(page.document, '[data-share]'), page.window);
    await until(() => copied.length === 1 && required(page.document, '[data-toast]').textContent === page.config.copy.copied, 'clipboard share confirmation');
    same(context, copied, [page.config.canonical], 'Clipboard receives the exact canonical game URL');
    equal(context, required(page.document, '[data-toast]').hidden, false, 'Clipboard success is visibly announced');
    context.result.details = { copiedCanonical: copied[0], fullscreenMode: 'unsupported fallback' };
  });
}

try { await main(); }
catch (error) {
  report.totals.failed++;
  report.cases.push({ name: 'harness setup', status: 'failed', assertions: 0, error: { message: error.message, stack: error.stack } });
}
report.inputs.html = Array.from(loadedHtml.values());
report.status = report.totals.failed === 0 && report.network.prohibitedAttempts.length === 0 ? 'passed' : 'failed';
report.inputs.clientMatchesBuiltAssets = !report.warnings.some(message => message.startsWith('Built client asset differs'));
report.durationMs = Date.now() - started;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  status: report.status,
  ...report.totals,
  mockedCatalogFetches: report.network.mockedFetches.length,
  injectedCatalogFailures: report.network.injectedCatalogFailures.length,
  prohibitedNetworkAttempts: report.network.prohibitedAttempts.length,
  clientMatchesBuiltAssets: report.inputs.clientMatchesBuiltAssets,
  durationMs: report.durationMs,
  report: relative(root, output)
}, null, 2));
if (report.status !== 'passed') {
  for (const result of report.cases.filter(item => item.status !== 'passed')) console.error(result.name + ': ' + result.error?.message);
  process.exitCode = 1;
}
