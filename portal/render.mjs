import { assets } from './assets.mjs';
import { languageNameFor } from './localization.mjs';
import { PUBLISHER_CLID } from '../scripts/portal-provider-normalize.mjs';
import { config, groups, games, byId, localeIds, copies, localeGames, collections, allCollections, editorial, titleFor, summaryFor, genreIntroFor, launchLanguageNoticeFor, format, urlFor, gamePath, playLocale, listPath, listGames, isIndexable, alternatives, relatedGames, recommendedGames } from './catalog.mjs';

export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const excerpt = (text, length=165) => { const value=String(text || '').replace(/\s+/g,' ').trim(); return value.length>length ? `${value.slice(0,length-1).replace(/\s+\S*$/,'')}…` : value; };
const paragraphs = text => String(text || '').split(/\n+/).filter(Boolean).map(line=>`<p>${escape(line)}</p>`).join('');
const symbols = {play:'<path d="m9 5 11 7-11 7Z"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',search:'<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',star:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'};
Object.assign(symbols, {
  puzzle:'<path d="M9 3H4v6a3 3 0 1 1 0 6v6h6a3 3 0 1 1 6 0h5v-6a3 3 0 1 0 0-6V3h-6a3 3 0 1 1-6 0Z"/>',
  racing:'<path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0m5-10v10m5-9v10M5 9c5-4 9 4 15 0"/>',
  sports:'<circle cx="12" cy="12" r="9"/><path d="m12 7 5 4-2 6H9l-2-6 5-4Zm0-4v4m8 0-3 4m1 9-3-3M6 20l3-3M4 7l3 4"/>',
  arcade:'<rect x="4" y="14" width="16" height="7" rx="2"/><path d="M12 14V7m4 11h1"/><circle cx="12" cy="5" r="2"/>',
  action:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  adventure:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  strategy:'<path d="m3 7 4 4 5-7 5 7 4-4-2 13H5L3 7Zm2 9h14"/>',
  simulation:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8m-9 5v9"/>',
  horror:'<path d="M5 20V10a7 7 0 0 1 14 0v10l-3-2-4 3-4-3-3 2Z"/><path d="M9 10v2m6-2v2"/>',
  shooting:'<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/><circle cx="12" cy="12" r="1"/>',
  rpg:'<path d="m14 3 7 0 0 7-12 10-5-5L14 3Zm-9 9 7 7M3 21l4-4M17 7l-7 7"/>',
  platform:'<path d="M3 20h6v-5h6v-5h6M3 4h4m-2-2v4"/>',
  idle:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  'card-board':'<rect x="7" y="3" width="13" height="17" rx="2"/><path d="M7 6H4a1 1 0 0 0-1 1v13a2 2 0 0 0 2 2h11m-3-15 3 4-3 4-3-4 3-4Z"/>',
  multiplayer:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  creative:'<path d="m14 4 6 6-9 9-7 1 1-7 9-9Zm-4 5 5 5M4 20l4-4"/>'
});
const icon = name => `<svg class="icon icon-${name}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${symbols[name] || symbols.star}</svg>`;
const availableGenres = locale => groups.filter(group=>allCollections.get(group.id).length);
const ui = entry => copies.get(entry.locale);
function image(game, locale, eager=false, large=false) {
  let srcset='';
  const source=new URL(game.thumbnail);
  if (source.hostname==='static.playgama.com') srcset=[320,480,720,1100].map(width=>{const url=new URL(source);url.searchParams.set('width',width);return `${escape(url.href)} ${width}w`;}).join(', ');
  return `<span class="game-art"><img src="${escape(game.thumbnail)}"${srcset?` srcset="${srcset}" sizes="${large?'(max-width: 760px) 94vw, 900px':'(max-width: 560px) 46vw, (max-width: 960px) 30vw, 280px'}"`:''} width="720" height="480" alt="${escape(titleFor(game,locale))}" loading="${eager?'eager':'lazy'}"${eager?' fetchpriority="high"':''} decoding="async" data-game-image></span>`;
}
function favorite(game, locale, labeled=false) {
  const copy=copies.get(locale);
  return `<button type="button" class="favorite-button${labeled?' labeled-favorite':''}" data-favorite="${escape(game.id)}" data-game-title="${escape(titleFor(game,locale))}" aria-pressed="false" aria-label="${escape(copy.save)}: ${escape(titleFor(game,locale))}">${icon('heart')}<span class="favorite-text">${escape(copy.save)}</span></button>`;
}
export function card(game, locale, selectedGenre=null) {
  const copy=copies.get(locale);
  const displayGenre=selectedGenre && game.genreIds.includes(selectedGenre) ? selectedGenre : game.genreIds[0];
  return `<article class="game-card" data-card="${escape(game.id)}" data-native="${game.locales.includes(locale)}"><a class="card-link" href="${gamePath(locale,game)}">${image(game,locale)}<div class="card-copy"><span class="eyebrow">${escape(copy.genreNames[displayGenre] || copy.allGames)}</span><h3>${escape(titleFor(game,locale))}</h3><p class="card-summary">${escape(summaryFor(game,locale))}</p><span class="game-language" title="${escape(copy.languagesLabel)}">${escape(languageNameFor(locale,playLocale(locale,game)))}</span><span class="card-action">${escape(copy.play)} ${icon('arrow')}</span></div></a>${favorite(game,locale)}</article>`;
}
function languageLinks(entry) {
  const supported = new Map(alternatives(entry).map(other => [other.locale, other]));
  const destinations = localeIds.map(locale => entry.type==='game'?{locale,path:gamePath(locale,byId.get(entry.id))}:supported.get(locale) || { locale, path: `/${locale}/` });
  return destinations.map(other=>`<a href="${other.path}" lang="${other.locale}" hreflang="${other.locale}"${other.locale===entry.locale?' aria-current="true"':''}>${escape(copies.get(other.locale).name)}</a>`).join('');
}
function header(entry) {
  const copy=ui(entry), home=`/${entry.locale}/`;
  return `<a class="skip-link" href="#main">${escape(copy.skip)}</a><header class="site-header"><div class="header-main wrap"><a class="brand" href="${home}" aria-label="GuideHollow Games"><span class="brand-mark">${icon('star')}</span><span class="brand-type">GuideHollow<span class="brand-genre">Games</span></span></a><form class="search-form" role="search" action="/${entry.locale}/search/"><label class="sr-only" for="site-search">${escape(copy.search)}</label>${icon('search')}<input id="site-search" name="q" type="search" placeholder="${escape(copy.searchPlaceholder)}" autocomplete="off"></form><div class="portal-tools"><a class="favorites-link" href="/${entry.locale}/search/?view=favorites" aria-label="${escape(copy.favorites)}">${icon('heart')}<span>${escape(copy.favorites)}</span><span data-favorite-count class="favorite-count">0</span></a><details class="language-picker" data-menu><summary>${icon('globe')}<span>${escape(copy.name)}</span><span aria-hidden="true">⌄</span></summary><nav class="language-panel" aria-label="${escape(copy.languages)}">${languageLinks(entry)}</nav></details></div></div><nav class="portal-genres wrap" aria-label="${escape(copy.genres)}"><a href="${home}"${entry.type==='language'?' aria-current="page"':''}>${escape(copy.allGames)}</a>${availableGenres(entry.locale).map(group=>`<a href="/${entry.locale}/${group.id}/"${entry.genre===group.id?' aria-current="page"':''}>${icon(group.id)}<span>${escape(copy.genreNames[group.id])}</span><span class="genre-nav-count">${new Intl.NumberFormat(entry.locale).format(allCollections.get(group.id).length)}</span></a>`).join('')}</nav></header>`;
}
function footer(entry) {
  const copy=ui(entry);
  return `<footer class="site-footer"><div class="wrap portal-footer"><div><a class="footer-brand" href="/${entry.locale}/">GuideHollow Games</a><p>${escape(copy.affiliateText)}</p><div class="footer-pages"><a href="/${entry.locale}/about/">${escape(copy.about)}</a><a href="/${entry.locale}/privacy/">${escape(copy.privacy)}</a><a href="/">${escape(copy.languages)}</a></div></div><nav class="footer-genres" aria-label="${escape(copy.genres)}">${availableGenres(entry.locale).map(group=>`<a href="/${entry.locale}/${group.id}/">${escape(copy.genreNames[group.id])}</a>`).join('')}</nav></div></footer>`;
}
function section(title, list, locale, note='', link='', variant='') {
  if (!list.length) return '';
  const copy=copies.get(locale);
  return `<section class="portal-section${variant?` ${variant}`:''}"><div class="section-heading"><div><h2>${escape(title)}</h2>${note?`<p class="section-note">${escape(note)}</p>`:''}</div>${link?`<a class="text-link" href="${link}">${escape(copy.more)} ${icon('arrow')}</a>`:''}</div><div class="game-grid${variant?' discovery-grid':''}">${list.map(game=>card(game,locale)).join('')}</div></section>`;
}
function pagination(entry,total) {
  const pages=Math.ceil(total/config.pageSize), page=entry.page || 1,copy=ui(entry);
  if(pages<2)return '';
  const start=Math.max(1,Math.min(page-2,pages-4));
  const numbers=[...new Set([1,...Array.from({length:Math.min(5,pages)},(_,i)=>start+i),pages])].sort((a,b)=>a-b);
  return `<nav class="pagination" aria-label="${escape(format(copy.pageOf,{page,pages}))}">${page>1?`<a href="${listPath(entry.locale,entry.genre,page-1)}" rel="prev">${escape(copy.previous)}</a>`:''}${numbers.map((n,i)=>`${i&&n-numbers[i-1]>1?'<span class="page-gap" aria-hidden="true">…</span>':''}<a href="${listPath(entry.locale,entry.genre,n)}" aria-label="${escape(format(copy.pageOf,{page:n,pages}))}"${n===page?' aria-current="page"':''}>${n}</a>`).join('')}${page<pages?`<a href="${listPath(entry.locale,entry.genre,page+1)}" rel="next">${escape(copy.next)}</a>`:''}</nav><p class="page-counter">${escape(format(copy.pageOf,{page,pages}))}</p>`;
}
function nativeFilters(locale,total,native) {
  const copy=copies.get(locale),number=n=>new Intl.NumberFormat(locale).format(n);
  return `<div class="catalog-filters" role="group" aria-label="${escape(copy.languages)}"><button type="button" data-native-filter="all" aria-pressed="true">${escape(copy.allGames)} <span>${number(total)}</span></button><button type="button" data-native-filter="native" aria-pressed="false">${escape(copy.nativeOnly)} <span>${number(native)}</span></button></div>`;
}
function horrorQuickGuide(entry) {
  if (entry.locale!=='ko' || entry.genre!=='horror' || (entry.page || 1)!==1) return '';
  const selected=collections.get('ko').get('horror');
  const expected=['escape-from-the-crypt','doodle-halloween-momo-cat--sea-magic','madness-online','crush-hour','1-zombie-survival'];
  if (selected.length!==5 || !expected.every(id=>selected.some(game=>game.id===id && editorial(game,'ko')))) return '';
  const options=[
    {heading:'생각하며 탈출하는 퍼즐',text:'강령술사가 따라올 길을 계산하고 장애물을 이용해 탈출합니다.',ids:['escape-from-the-crypt']},
    {heading:'문양을 그리는 반응형',text:'다가오는 유령의 기호를 손가락이나 마우스로 빠르게 그려 물리칩니다.',ids:['doodle-halloween-momo-cat--sea-magic']},
    {heading:'좀비와 오래 버티는 생존형',text:'사격·회피·자원 수집과 거점 방어가 중심이어서 비교적 긴 플레이에 적합합니다.',ids:['madness-online','1-zombie-survival']},
    {heading:'순간 판단이 필요한 러너',text:'자동으로 달리는 트럭의 차선을 바꾸고 연료와 충돌을 관리하며 기록에 도전합니다.',ids:['crush-hour']}
  ];
  return `<section class="portal-section horror-choice" aria-label="공포 게임 선택 안내"><div class="section-heading"><div><h2>어떤 공포 게임부터 해볼까?</h2><p class="section-note">공포 장르라도 게임마다 목표와 조작 방식이 다릅니다. 원하는 플레이 방식으로 골라보세요.</p></div></div><div class="horror-choice-grid">${options.map(option=>`<div class="horror-choice-item"><h3>${escape(option.heading)}</h3><p>${escape(option.text)}</p><div class="horror-choice-links">${option.ids.map(id=>{const game=byId.get(id);return `<a href="${gamePath('ko',game)}">${escape(titleFor(game,'ko'))} ${icon('arrow')}</a>`}).join('')}</div></div>`).join('')}</div></section>`;
}
function guideLinks(entry) {
  if ((entry.page || 1)!==1) return '';
  const copy=ui(entry);
  let selected=(entry.genre?collections.get(entry.locale).get(entry.genre):localeGames.get(entry.locale)).filter(game=>editorial(game,entry.locale));
  if (!entry.genre) selected=selected.slice(0,6);
  if (!selected.length) return '';
  return `<section class="portal-section guide-links"><div class="section-heading"><div><h2>${escape(copy.guidesTitle)}</h2><p class="section-note">${escape(copy.guidesNote)}</p></div></div><ul>${selected.map(game=>`<li><a href="${gamePath(entry.locale,game)}">${escape(titleFor(game,entry.locale))} ${icon('arrow')}</a></li>`).join('')}</ul></section>`;
}
function feature(entry) {
  if(entry.type!=='language' || (entry.page || 1)!==1)return '';
  const copy=ui(entry),game=recommendedGames(entry.locale,null,1)[0] || games[0];
  return `<section class="featured-banner" aria-label="${escape(copy.recommended)}"><a class="feature-art" href="${gamePath(entry.locale,game)}">${image(game,entry.locale,true,true)}</a><div class="feature-copy"><p class="eyebrow">${escape(copy.recommended)}</p><h2><a href="${gamePath(entry.locale,game)}">${escape(titleFor(game,entry.locale))}</a></h2><p class="feature-description">${escape(summaryFor(game,entry.locale))}</p><div class="feature-tags">${game.genreIds.slice(0,3).map(genre=>`<a href="/${entry.locale}/${genre}/">${escape(copy.genreNames[genre])}</a>`).join('')}</div><a class="button" href="${gamePath(entry.locale,game)}">${icon('play')}${escape(copy.play)}</a></div></section>`;
}
function playerPage(entry) {
  const copy=ui(entry);
  return `<main id="main" class="game-page wrap"><p data-player-error role="status">${escape(copy.loading)}</p><div data-player-content hidden><nav class="breadcrumbs" aria-label="${escape(copy.home)}"><a href="/${entry.locale}/">${escape(copy.home)}</a><span>/</span><span data-player-title></span></nav><div class="game-heading"><div><p class="eyebrow" data-shell-genres></p><h1 data-player-title></h1></div><div class="detail-actions"><button type="button" class="favorite-button labeled-favorite" data-shell-favorite aria-pressed="false">${icon('heart')}<span class="favorite-text">${escape(copy.save)}</span></button><button class="button secondary compact" type="button" data-share>${escape(copy.share)}</button></div></div><section class="player-section"><div class="player" data-player><div class="player-preview" data-preview><span class="game-art"><img data-shell-image width="720" height="480" alt=""></span><div class="preview-shade"></div><div class="play-callout"><h2 data-player-title></h2><button class="button play-button" type="button" data-play>${icon('play')}${escape(copy.play)}</button><p>${escape(copy.launchNote)}</p></div></div><div class="frame-stage" data-frame-stage hidden></div><div class="player-toolbar" data-player-toolbar hidden><p data-player-status role="status"></p><div><button class="icon-button" type="button" data-fullscreen aria-label="${escape(copy.fullscreen)}">${icon('full')}</button><button class="icon-button" type="button" data-close-game aria-label="${escape(copy.close)}">${icon('close')}</button></div></div></div><div class="launch-notes"><p>${escape(copy.launchNote)}</p><a data-shell-source target="_blank" rel="noopener sponsored">${escape(copy.sourcePage)} ↗</a></div><details class="launch-languages"><summary>${escape(copy.languagesLabel)}</summary><div class="launch-language-options" data-shell-languages></div></details><p class="launch-language-notice">${escape(launchLanguageNoticeFor(entry.locale))}</p></section><div class="game-information"><article class="editorial portal-editorial"><h2>${escape(copy.aboutGame)}</h2><p data-shell-summary></p><p class="translation-note">${escape(copy.translationNotice)}</p><h2>${escape(copy.howToPlay)}</h2><p>${escape(copy.guidePending)}</p><a data-shell-source target="_blank" rel="noopener sponsored">${escape(copy.sourceText)} ↗</a></article><aside class="game-facts"><h2>${escape(copy.aboutGame)}</h2><dl><div><dt>${escape(copy.devices)}</dt><dd data-shell-platforms></dd></div><div><dt>${escape(copy.orientation)}</dt><dd data-shell-orientation></dd></div></dl></aside></div></div><noscript><p>${escape(copy.sourceText)}</p><a href="/${entry.locale}/">${escape(copy.allGames)}</a></noscript></main>`;
}
function listing(entry) {
  const copy=ui(entry), all=listGames(entry),page=entry.page || 1,selected=all.slice((page-1)*config.pageSize,page*config.pageSize);
  const heading=entry.genre?format(copy.genreTitle,{genre:copy.genreNames[entry.genre]}):copy.catalogTitle;
  const intro=entry.genre?genreIntroFor(entry.locale,entry.genre,all.length):format(copy.catalogDescription,{count:new Intl.NumberFormat(entry.locale).format(all.length)});
  const native=entry.genre?collections.get(entry.locale).get(entry.genre).length:localeGames.get(entry.locale).length;
  const number=n=>new Intl.NumberFormat(entry.locale).format(n);
  return `<main id="main" class="wrap portal-main portal-catalog"><section class="catalog-intro"><div class="intro-copy"><p class="eyebrow">GUIDEHOLLOW / ${escape(copy.allGames)}</p><h1>${escape(heading)}</h1><p class="catalog-description">${escape(intro)}</p></div><a class="text-link recent-shortcut" href="/${entry.locale}/search/?view=recent">${icon('idle')}${escape(copy.recent)}</a></section>${feature(entry)}<section id="collection" class="portal-section">${nativeFilters(entry.locale,all.length,native)}<div class="collection-meta"><p class="catalog-language-note">${escape(copy.catalogNote)}</p><p class="translation-note">${escape(copy.translationNotice)}</p><p class="item-range" data-range aria-live="polite">${number((page-1)*config.pageSize+1)}–${number(Math.min(page*config.pageSize,all.length))} / ${number(all.length)}</p></div><p class="catalog-error" data-catalog-error role="status" hidden></p><div class="game-grid" data-catalog-grid data-count="${selected.length}">${selected.map(game=>card(game,entry.locale,entry.genre)).join('')}</div><div data-catalog-pagination>${pagination(entry,all.length)}</div></section>${horrorQuickGuide(entry)}${guideLinks(entry)}</main>`;
}
function gamePage(entry) {
  const game=byId.get(entry.id),copy=ui(entry),guide=editorial(game,entry.locale),title=titleFor(game,entry.locale);
  const facts=game.genreIds.map(genre=>`<a href="/${entry.locale}/${genre}/">${escape(copy.genreNames[genre])}</a>`).join('');
  const platforms=game.platforms.map(platform=>platform==='Desktop'?copy.desktop:platform).join(' · ');
  const description=guide?`<h2>${escape(copy.aboutGame)}</h2>${paragraphs(guide.description)}<h2>${escape(copy.howToPlay)}</h2>${paragraphs(guide.instructions)}`:`<h2>${escape(copy.aboutGame)}</h2><p>${escape(summaryFor(game,entry.locale))}</p><p>${escape(copy.guidePending)}</p><details class="provider-description"><summary>${escape(copy.sourceText)}</summary><div lang="und">${paragraphs(game.description)}${paragraphs(game.instructions || copy.instructionsUnavailable)}</div></details>`;
  return `<main id="main" class="game-page wrap"><nav class="breadcrumbs" aria-label="${escape(copy.home)}"><a href="/${entry.locale}/">${escape(copy.home)}</a><span>/</span><span aria-current="page">${escape(title)}</span></nav><div class="game-heading"><div><p class="eyebrow">${escape(game.genreIds.map(id=>copy.genreNames[id]).join(' · '))}</p><h1>${escape(title)}</h1></div><div class="detail-actions">${favorite(game,entry.locale,true)}<button class="button secondary compact" type="button" data-share>${escape(copy.share)}</button></div></div><section class="player-section" aria-label="${escape(title)}"><div class="player" data-player><div class="player-preview" data-preview>${image(game,entry.locale,true,true)}<div class="preview-shade"></div><div class="play-callout"><h2>${escape(title)}</h2><button class="button play-button" type="button" data-play>${icon('play')}${escape(copy.play)}</button><p>${escape(copy.launchNote)}</p></div></div><div class="frame-stage" data-frame-stage hidden></div><div class="player-toolbar" data-player-toolbar hidden><p data-player-status role="status">${escape(copy.loading)}</p><div><button class="icon-button" type="button" data-fullscreen aria-label="${escape(copy.fullscreen)}">${icon('full')}</button><button class="icon-button" type="button" data-close-game aria-label="${escape(copy.close)}">${icon('close')}</button></div></div></div><div class="launch-notes"><p>${escape(copy.launchNote)}</p><a href="${escape(game.affiliateUrl)}" target="_blank" rel="noopener sponsored">${escape(copy.sourcePage)} ↗</a></div><details class="launch-languages"><summary>${escape(copy.languagesLabel)} (${game.locales.length})</summary><div class="launch-language-options">${game.locales.map(locale=>`<a href="${gamePath(locale,game)}" lang="${locale}">${escape(languageNameFor(entry.locale,locale))}</a>`).join(' · ')}</div></details><p class="launch-language-notice">${escape(launchLanguageNoticeFor(entry.locale))}</p></section><div class="game-information"><article class="editorial portal-editorial"><p class="translation-note">${escape(copy.translationNotice)}</p>${description}</article><aside class="game-facts"><h2>${escape(copy.aboutGame)}</h2><dl><div><dt>${escape(copy.genres)}</dt><dd class="fact-tags">${facts}</dd></div><div><dt>${escape(copy.devices)}</dt><dd>${escape(platforms)}</dd></div><div><dt>${escape(copy.orientation)}</dt><dd>${escape(game.orientation==='portrait'?copy.portrait:game.orientation==='landscape'?copy.landscape:copy.anyOrientation)}</dd></div></dl></aside></div>${section(copy.related,relatedGames(game,entry.locale),entry.locale)}</main>`;
}
function article(entry) {
  const copy=ui(entry),privacy=entry.type==='privacy';
  return `<main id="main" class="article-page wrap"><div class="article-heading"><p class="eyebrow">GuideHollow Games</p><h1>${escape(privacy?copy.privacy:copy.aboutTitle)}</h1></div><div class="article-body"><section>${paragraphs(privacy?copy.privacyText:copy.aboutText)}${paragraphs(copy.affiliateText)}</section>${privacy?`<div class="policy-links"><a href="https://playgama.com/confidential" target="_blank" rel="noopener">${escape(copy.providerPolicy)} ↗</a></div><button class="button secondary" type="button" data-clear-storage>${escape(copy.clearStorage)}</button>`:`<a class="button" href="/${entry.locale}/">${escape(copy.allGames)}</a>`}</div></main>`;
}
function selector(entry) {
  const copy=ui(entry);
  const covers=recommendedGames('en',null,6).slice(1,5);
  return `<main id="main" class="wrap language-home"><section class="language-intro"><div class="language-welcome"><p class="eyebrow">GuideHollow Games</p><h1>${escape(copy.chooseLanguage)}</h1><p>${escape(copy.catalogNote)}</p><p class="translation-note">${escape(copy.translationNotice)}</p></div><div class="language-mosaic" aria-hidden="true">${covers.map(game=>image(game,'en').replace(/alt="[^"]*"/,'alt=""')).join('')}</div></section><nav class="language-cards" aria-label="${escape(copy.languages)}">${localeIds.map(locale=>`<a href="/${locale}/" lang="${locale}"><strong>${escape(copies.get(locale).name)}</strong><span>${escape(format(copies.get(locale).gameCount,{count:games.length}))}</span>${icon('arrow')}</a>`).join('')}</nav></main>`;
}
function search(entry) {
  const copy=ui(entry);
  return `<main id="main" class="wrap portal-main"><section class="portal-search"><div class="search-intro"><p class="eyebrow">${escape(copy.name)}</p><h1 data-search-heading>${escape(copy.search)}</h1></div><nav class="search-views"><a href="/${entry.locale}/search/">${escape(copy.allGames)}</a><a href="/${entry.locale}/search/?view=favorites">${icon('heart')}${escape(copy.favorites)}</a><a href="/${entry.locale}/search/?view=recent">${icon('idle')}${escape(copy.recent)}</a></nav>${nativeFilters(entry.locale,games.length,localeGames.get(entry.locale).length)}<p class="catalog-language-note">${escape(copy.catalogNote)}</p><p class="translation-note">${escape(copy.translationNotice)}</p><p data-search-status aria-live="polite"></p><div class="game-grid" data-search-results></div><button class="button secondary" data-more-results hidden>${escape(copy.next)}</button><noscript><p>${escape(copy.noResultsText)} <a href="/${entry.locale}/">${escape(copy.allGames)}</a></p></noscript></section></main>`;
}
export function renderPortal(entry) {
  const copy=ui(entry),game=entry.type==='game'?byId.get(entry.id):null,guide=game?editorial(game,entry.locale):null;
  const title=entry.type==='selector'?`${copy.chooseLanguage} | GuideHollow Games`:game?`${format(copy.gameTitle,{title:titleFor(game,entry.locale)})} | GuideHollow`:entry.type==='genre'?`${format(copy.genreTitle,{genre:copy.genreNames[entry.genre]})}${entry.page>1?` · ${entry.page}`:''} | GuideHollow Games`:entry.type==='language'?`${copy.catalogTitle}${entry.page>1?` · ${entry.page}`:''} | GuideHollow`:entry.type==='404'?copy.notFound:`${entry.type==='about'?copy.about:entry.type==='privacy'?copy.privacy:copy.search} | GuideHollow Games`;
  const description=excerpt(game?(guide?.description || summaryFor(game,entry.locale)):entry.type==='genre'?genreIntroFor(entry.locale,entry.genre,listGames(entry).length):entry.type==='language'?format(copy.catalogDescription,{count:games.length}):entry.type==='privacy'?copy.privacyText:copy.aboutText);
  const canonical=urlFor(entry.path),indexable=isIndexable(entry);
  const alternate=indexable?alternatives(entry,true):[];
  const schema=[{'@context':'https://schema.org','@type':game?'VideoGame':entry.type==='genre'?'CollectionPage':'WebPage',name:game?titleFor(game,entry.locale):title,description,url:canonical,inLanguage:game?game.locales:entry.locale,...(game?{image:game.thumbnail,genre:game.genreIds.map(id=>copy.genreNames[id]),gamePlatform:game.platforms}:{} )}];
  if(game)schema.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:copy.home,item:urlFor(`/${entry.locale}/`)},{'@type':'ListItem',position:2,name:titleFor(game,entry.locale),item:canonical}]});
  if(['genre','language'].includes(entry.type))schema[0].mainEntity={'@type':'ItemList',itemListElement:listGames(entry).slice(((entry.page||1)-1)*config.pageSize,(entry.page||1)*config.pageSize).map((game,index)=>({'@type':'ListItem',position:((entry.page||1)-1)*config.pageSize+index+1,url:urlFor(gamePath(entry.locale,game)),name:titleFor(game,entry.locale)}))};
  const clientKeys=['save','saved','loading','loaded','close','fullscreenHelp','sourcePage','noResults','noResultsText','copied','storageCleared','gameCount','search','favorites','recent','play','next','catalogLoadError','previous','pageOf','nativeOnly','gameTitle','notFound'];
  const client={publisherClid:PUBLISHER_CLID,providerOrigins:entry.type==='player'?Object.fromEntries(['embedUrl','affiliateUrl'].map(field=>[field,[...new Set(games.map(game=>new URL(game[field]).origin))]])):null,locale:entry.locale,type:entry.type,canonical,copy:Object.fromEntries(clientKeys.map(key=>[key,copy[key]])),genreNames:copy.genreNames,listing:['language','genre'].includes(entry.type)?{genre:entry.genre||null,page:entry.page||1,basePath:listPath(entry.locale,entry.genre),pageSize:config.pageSize}:null,game:game?{id:game.id,slug:game.slug,title:titleFor(game,entry.locale),embedUrl:game.embedUrl,affiliateUrl:game.affiliateUrl}:null};
  const body=entry.type==='selector'?selector(entry):entry.type==='game'?gamePage(entry):entry.type==='player'?playerPage(entry):entry.type==='genre'||entry.type==='language'?listing(entry):entry.type==='search'?search(entry):entry.type==='404'?`<main id="main" class="not-found wrap"><p>404</p><h1>${escape(copy.notFound)}</h1><a class="button" href="/">${escape(copy.backHome)}</a></main>`:article(entry);
  const defaultAlt=entry.type==='selector'||entry.type==='language'?'/':alternate.find(other=>other.locale==='en')?.path;
  return `<!doctype html><html lang="${entry.locale}" dir="${copy.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="naver-site-verification" content="a317d4fe8c057098d11167a944d93c38100fd604"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}">${!indexable?'<meta name="robots" content="noindex,follow">':''}${alternate.map(other=>`<link rel="alternate" hreflang="${other.locale}" href="${urlFor(other.path)}">`).join('')}${indexable&&defaultAlt?`<link rel="alternate" hreflang="x-default" href="${urlFor(defaultAlt)}">`:''}<meta name="theme-color" content="#182b3d"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="GuideHollow Games">${game?`<meta property="og:image" content="${escape(game.thumbnail)}"><meta name="twitter:card" content="summary_large_image">`:''}<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/${assets.css.path}">${schema.map(value=>`<script type="application/ld+json">${json(value)}</script>`).join('')}<script id="portal-config" type="application/json">${json(client)}</script><script src="/${assets.js.path}" defer></script></head><body data-theme="shooting" data-page="${entry.type}" class="portal">${header(entry)}${body}${footer(entry)}<div class="toast" role="status" aria-live="polite" data-toast hidden></div></body></html>`;
}
