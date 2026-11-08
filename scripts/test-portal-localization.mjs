import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { games, localeIds, localeGames, titleFor, summaryFor, gamePath } from '../portal/catalog.mjs';

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
const korean=file('dist-portal/ko/index.html');
assert.match(korean,/class="card-summary"/,'Korean cards lack descriptions');
assert.match(korean,/포켓 유니버스/,'Localized title missing from Korean page');
const english=file('dist-portal/en/index.html');
assert.match(english,/class="card-summary"/,'English cards lack descriptions');
const catalog=JSON.parse(file('dist-portal/assets/catalog/ko.json'));
assert.ok(catalog.length > 100);
assert.ok(catalog.every(game => typeof game.summary==='string' && game.summary.length > 0),'Search results lack localized descriptions');
const sample=catalog.find(game=>game.id==='pocket-universe');
assert.equal(sample?.title,'포켓 유니버스');
assert.ok(sample?.summary.includes('자원'));
console.log(JSON.stringify({status:'passed',supportedLanguages:localeIds.length,coverage},null,2));
