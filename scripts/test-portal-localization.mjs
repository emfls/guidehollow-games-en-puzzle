import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { games, localeIds, localeGames, titleFor, summaryFor, gamePath, editorial, isIndexable, listGames } from '../portal/catalog.mjs';

const file=path=>readFileSync(path,'utf8');
const byId=new Map(games.map(game=>[game.id,game]));
const coverage={};
for (const locale of localeIds) {
  let translated=0, summarized=0;
  for (const game of localeGames.get(locale)) {
    const title=titleFor(game,locale), summary=summaryFor(game,locale);
    assert.ok(title && title.trim() && !title.includes('undefined'), locale+'/'+game.id+': title');
    assert.ok(summary && summary.trim() && summary.length <= 240 && !summary.includes('undefined'), locale+'/'+game.id+': summary');
    assert.ok(gamePath(locale,game).startsWith('/'+locale+'/play/'));
    if (title !== game.title) translated++;
    summarized++;
  }
  coverage[locale]={games:summarized, titlesDifferentFromProvider:translated};
}
for (const [id,expected] of Object.entries({
  'pocket-universe':'포켓 유니버스',
  'domino-online-multiplayer':'온라인 도미노 대전',
  'car-destruction-king':'자동차 파괴왕'
})) {
  assert.ok(byId.has(id),'Missing known test game '+id);
  assert.equal(titleFor(byId.get(id),'ko'),expected);
}
assert.ok(coverage.ko.titlesDifferentFromProvider >= 30,'Korean translation coverage regressed');
const koreanGames = localeGames.get('ko');
const curatedKorean = JSON.parse(file('portal/locales/game-metadata.json')).summaries.ko;
assert.ok(Object.keys(curatedKorean).length >= 165,'Previously reviewed Korean summaries were lost');
for (const [id, expected] of Object.entries(curatedKorean)) {
  const game = byId.get(id);
  if (!game || !game.locales.includes('ko')) continue; // Retired games may leave the catalog.
  const summary = summaryFor(game,'ko');
  assert.equal(summary,expected,'Curated summary is not rendered for '+id);
  assert.ok(summary.length >= 50 && summary.length <= 240, 'Short or excessive Korean summary: '+id);
  assert.ok(!summary.includes('장르의 브라우저 게임입니다.'), 'Generic summary returned: '+id);
}
const horrorGames=listGames({locale:'ko',genre:'horror'});
const horrorHtml=file('dist-portal/ko/horror/index.html');
if(horrorGames.length <= 8) {
  assert.equal((horrorHtml.match(/data-card="/g)||[]).length,horrorGames.length,
    'Compact horror collection must show each game once');
  assert.doesNotMatch(horrorHtml,/class="featured-shelf/, 'Small genres must not repeat spotlight games');
  assert.doesNotMatch(horrorHtml,/class="portal-section popular-section/, 'Small genres must not duplicate popular games');
}
assert.match(horrorHtml,/강령술사를 피해 지하묘지에서 탈출/, 'Missing useful horror genre introduction');

const korean=file('dist-portal/ko/index.html');
assert.match(korean,/class="card-summary"/,'Korean cards lack descriptions');
assert.match(korean,/data-native-filter/,'Native language filtering is missing');
const english=file('dist-portal/en/index.html');
assert.match(english,/class="card-summary"/,'English cards lack descriptions');
const catalog=JSON.parse(file('dist-portal/assets/catalog/ko.json'));
assert.ok(catalog.length > 100);
assert.ok(catalog.every(game => typeof game.summary==='string' && game.summary.length > 0),'Search results lack localized descriptions');
const sample=catalog.find(game=>game.id==='pocket-universe');
assert.equal(sample?.title,'포켓 유니버스');
assert.ok(sample?.summary.includes('광물') && sample?.summary.includes('세계'), 'Pocket Universe summary should describe resource gathering and world expansion');

const metadata = JSON.parse(file('portal/locales/game-metadata.json'));
const newLocales = ['ja','zh','es','fr','de','ru'];
const reviewedIds = [
  'car-destruction-king','pocket-universe','domino-online-multiplayer',
  'chess-online-multiplayer','escape-from-the-crypt','dead-frequency',
  'fruit-fusion','favorite-puzzles'
];
for(const locale of newLocales) {
  assert.ok(localeIds.includes(locale), 'Missing translated portal language '+locale);
  for(const id of reviewedIds) {
    const game=byId.get(id);
    assert.ok(game, 'Game missing from accepted catalog: '+id);
    const title=metadata.titles?.[locale]?.[id];
    const summary=metadata.summaries?.[locale]?.[id];
    assert.ok(title && title.trim(), locale+'/'+id+': missing reviewed title');
    assert.ok(summary?.length >= 35 && summary.length <= 240, locale+'/'+id+': missing gameplay-specific summary');
    assert.equal(titleFor(game,locale),title,'Manual title should override glossary fallback: '+locale+'/'+id);
    assert.equal(summaryFor(game,locale),summary,'Manual summary should override genre fallback: '+locale+'/'+id);
    assert.doesNotMatch(summary,/\{(?:genre|devices|count)\}/, 'Unexpanded placeholder in '+locale+'/'+id);
  }
}
for(const locale of localeIds) {
  const horrorIntro=metadata.genreIntros?.[locale]?.horror;
  assert.ok(horrorIntro?.length >= (locale === 'zh' ? 45 : 55), 'Missing informative horror introduction: '+locale);
  assert.ok(locale === 'ko' || !horrorIntro.includes('{count}'), 'Generic horror intro remains for '+locale);
}
for(const group of [
 'puzzle','racing','sports','arcade','action','adventure','strategy','simulation',
 'horror','shooting','rpg','platform','idle','card-board','multiplayer','creative'
]) {
  assert.ok(metadata.genreIntros?.en?.[group]?.length >= 65, 'Missing English genre context: '+group);
}
const foreignHorror=file('dist-portal/ja/horror/index.html');
assert.match(foreignHorror,/不気味な地下墓地/, 'Japanese horror page must show a meaningful intro');
const translatedCatalog=JSON.parse(file('dist-portal/assets/catalog/ja.json'));
for (const id of reviewedIds) {
  const game=byId.get(id);
  if(!game?.locales.includes('ja'))continue;
  const entry=translatedCatalog.find(item=>item.id===id);
  assert.equal(entry?.title,metadata.titles.ja[id],'Japanese search catalog title mismatch: '+id);
  assert.equal(entry?.summary,metadata.summaries.ja[id],'Japanese search catalog summary mismatch: '+id);
}


// Live website QA: authored guides must render as complete instructions, not provider-original placeholders.
const reviewedGuides=JSON.parse(file('portal/locales/reviewed-guides.json'));
const expectedKo=['escape-from-the-crypt','doodle-halloween-momo-cat--sea-magic','madness-online','crush-hour','1-zombie-survival'];
const expectedEn=['madness-ward-number-6','dark-city-multiplayer','schoolboy-runaway-room-escape','check-wednesday-phone','fruitsland-escape-from-the-amusement-park','the-road-home-granny-escape','zombie-monster-survivors'];
assert.deepEqual(Object.keys(reviewedGuides.ko).sort(),expectedKo.sort(),'Korean horror guide scope changed unexpectedly');
assert.deepEqual(Object.keys(reviewedGuides.en).sort(),expectedEn.sort(),'English horror guide scope changed unexpectedly');
for(const locale of ['ko','en']) for(const [id,guide] of Object.entries(reviewedGuides[locale])) {
  const game=byId.get(id);
  assert.ok(game?.locales.includes(locale),'Reviewed game not supported in '+locale+': '+id);
  const rendered=editorial(game,locale);
  assert.equal(rendered?.description,guide.description,'Missing reviewed description: '+locale+'/'+id);
  assert.equal(rendered?.instructions,guide.instructions,'Missing reviewed instructions: '+locale+'/'+id);
  assert.ok(rendered.description.length>=180 && rendered.instructions.length>=150,'Insufficient authored guide: '+locale+'/'+id);
  assert.ok(isIndexable({type:'game',locale,id,page:1}),'Reviewed game should be index-eligible: '+locale+'/'+id);
  const html=file('dist-portal/'+locale+'/play/'+game.slug+'/index.html');
  assert.doesNotMatch(html,/content="noindex,follow"/,'Complete guide is still blocked: '+locale+'/'+id);
  assert.match(html,/class="launch-languages"><summary>/,'Native languages should be a compact expandable list');
  assert.doesNotMatch(html,/provider-description/,'Reviewed guide should not fall back to unlocalized provider block');
  assert.ok(html.includes(guide.description.split('\n')[0].slice(0,55)),'Guide overview missing from built detail: '+locale+'/'+id);
}
assert.ok(isIndexable({type:'genre',locale:'ko',genre:'horror',page:1}), 'Five authored Korean horror guides should make collection eligible');
const koreanHorrorAfter=file('dist-portal/ko/horror/index.html');
assert.doesNotMatch(koreanHorrorAfter,/content="noindex,follow"/,'Reviewed Korean horror collection should not be noindex');
assert.match(koreanHorrorAfter,/class="horror-choice-grid"/,'The guided Korean horror comparison is missing');
assert.match(koreanHorrorAfter,/어떤 공포 게임부터 해볼까/,'The comparison must explain how to choose');
assert.ok([...koreanHorrorAfter.matchAll(/<article class="game-card"[^>]*>(.*?)<\/article>/g)].every(match=>match[1].includes('<span class="eyebrow">공포</span>')),'Horror-category cards must show the current genre');
const englishHorrorAfter=file('dist-portal/en/horror/index.html');
const expectedEnglishHorror=listGames({locale:'en',genre:'horror'});
const visibleEnglishHorror=[...englishHorrorAfter.matchAll(/data-card="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(visibleEnglishHorror,expectedEnglishHorror.slice(0,24).map(game=>game.id),
  'English horror first page repeats cards across recommendation shelves');
assert.doesNotMatch(englishHorrorAfter,/class="featured-shelf|class="portal-section popular-section|class="portal-section new-section/,
  'Large horror collections should show a focused, non-duplicated catalogue');
for(const [id,fragment] of Object.entries({
  'madness-ward-number-6':'battle other psychiatric-ward patients',
  'dark-city-multiplayer':'police and bandit factions',
  'check-wednesday-phone':'cryptic student messages',
  'zombie-monster-survivors':'randomly generated maps'
})) {
  const game=byId.get(id),guide=editorial(game,'en');
  assert.ok(guide?.description.includes(fragment),'Gameplay detail missing: '+id);
  assert.equal(summaryFor(game,'en'),guide.description.split('.')[0]+'.','Card should use the useful first sentence: '+id);
}

console.log(JSON.stringify({status:'passed',supportedLanguages:localeIds.length,coverage},null,2));
