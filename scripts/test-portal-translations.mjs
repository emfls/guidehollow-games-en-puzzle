import assert from 'node:assert/strict';
import {games,localeIds,titleFor,summaryFor} from '../portal/catalog.mjs';
import {catalogTranslation,sourceSummary,languageNameFor,needsTranslationRepair} from '../portal/localization.mjs';

let checked=0;
assert.ok(needsTranslationRepair({description:'A puzzle.'},{title:'\u2047 Puzzle',summary:'Un jeu de puzzle.'},'fr'),'Unknown model tokens must not appear in localized titles');
assert.ok(needsTranslationRepair({description:'Collect coins and unlock powerful cars in a new world.'},{summary:'Collect coins and unlock powerful cars in a new world.'},'ko'),'An unchanged source paragraph is not a translation');
assert.ok(needsTranslationRepair({description:'A puzzle.'},{summary:'Играй и собирай монеты каждый день.'},'ko'),'Source-language Cyrillic must not leak into Korean summaries');
assert.ok(!needsTranslationRepair({description:'A puzzle.'},{summary:'같은 색 타일을 연결하고 퍼즐을 풀어 보세요.'},'ko'));
assert.ok(needsTranslationRepair({description:'A puzzle.'},{summary:'This is a game where you collect the coins and unlock a world of adventure for your hero.'},'fr'),'English prose with minor changes must not pass as localized text');
for(const locale of localeIds.filter(locale=>locale!=='en'))for(const game of games){
  const text=catalogTranslation(game,locale);
  assert.ok(text,`Missing or stale translation: ${locale}/${game.id}`);
  assert.ok(text.title.trim() && text.summary.trim(),`Empty translation: ${locale}/${game.id}`);
  assert.ok(!catalogTranslation({...game,sourceHash:'outdated-source'},locale),'Outdated provider text must not reuse a stale translation');
  assert.ok(titleFor(game,locale).trim() && summaryFor(game,locale).trim());
  checked++;
}
assert.equal(languageNameFor('ko','en'),'영어');
assert.equal(languageNameFor('ja','en'),'英語');
assert.ok(!catalogTranslation({id:'unknown-fixture',sourceHash:'unknown'},'ko'));
assert.equal(sourceSummary({description:'<b>Find the matching tiles.</b> A second sentence.'}),'Find the matching tiles.');
console.log(`PASS ${checked} source-matched localized title/summary records across ${localeIds.length-1} languages`);
