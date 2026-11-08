import assert from 'node:assert/strict';
import {games,localeIds,editorial,summaryFor,isIndexable,copies,titleFor} from '../portal/catalog.mjs';
import {detailFor,sourcePlainText,sourceSignals,sourceLanguageFor} from '../portal/details.mjs';

assert.equal(sourcePlainText('<p>Move <b>left</b> &amp; right.</p><br>Tap.'),'Move left & right.\nTap.');
assert.deepEqual(sourceSignals('Use WASD or arrow keys. Space to jump. Drag with the mouse; tap the screen.').inputs,['WASD','arrows','space','mouse','touch']);
assert.deepEqual(sourceSignals('A wonderful world. We enjoy creating games.').inputs,[],'Ordinary prose must not invent W/E/A keys');
assert.deepEqual(sourceSignals('Q to build a platform\nW to build a ramp\nE to build a slope\nR to use weapons').keys,['Q','W','E','R']);
assert.deepEqual(sourceSignals('Do not press Space. Do not use WASD.').inputs,[],'Negative instructions must not become supported inputs');
assert.deepEqual(sourceSignals('Free up space on the bolt. Add the finishing touch. Find and touch the Finish Crystal.').inputs,[],'Ordinary space and touch words do not identify hardware inputs');
assert.deepEqual(sourceSignals('Press the Space key to jump. Touch the screen to move.').inputs,['space','touch']);
assert.equal(sourceLanguageFor('Меrge the blocks and shoot the enemies with your weapons.'),'en','A Cyrillic lookalike must not turn English into Russian');
assert.equal(sourceLanguageFor('Собирайте цифры и решайте головоломки каждый день.'),'ru');
assert.equal(sourceLanguageFor('123 + 456'),'und');
assert.equal(titleFor({id:'title-spacing-fixture',title:'  A   game  ',description:'',locales:[]},'en'),'A game','Display titles normalize provider whitespace');
const clicker=games.find(game=>game.id==='click-click-clicker-playgama');
assert.equal(detailFor({...clicker,id:'fixture-no-input',instructions:'Roll the dice and move your piece.'},'ko').instructions,copies.get('ko').guidePending,'Untranslated controls must not be described as missing provider instructions');
assert.ok(detailFor(clicker,'en').instructions.includes('passive'),'English details expose the complete source instructions');
assert.ok(!detailFor(clicker,'en').description.includes('<strong>'),'Provider HTML is normalized before rendering');
const build=games.find(game=>game.id==='build-and-run-playgama');
const mixed=detailFor({...clicker,id:'mixed-language-fixture',description:'Решайте головоломки и собирайте числа каждый день.',instructions:'Use the mouse and click the cells to play this game.'},'ru');
assert.equal(mixed.description,'Решайте головоломки и собирайте числа каждый день.');
assert.notEqual(mixed.instructions,'Use the mouse and click the cells to play this game.','Instructions are classified separately from the description');
assert.ok(detailFor(build,'ko').instructions.includes('Q')&&detailFor(build,'ko').instructions.includes('발판'),'Reviewed Korean control mappings preserve the provider’s actual key actions');
assert.ok(detailFor(clicker,'ko').description.length>200,'Common unsupported games need a fuller Korean explanation');
assert.ok(!detailFor({...build,sourceHash:'stale-fixture'},'ko').instructions.includes('발판'),'Stale manual instructions must not survive a source change');
const authored=games.find(game=>editorial(game,'ko'));
assert.equal(detailFor(authored,'ko').instructions,editorial(authored,'ko').instructions,'Authored controls take precedence');
let checked=0;
for(const locale of localeIds)for(const game of games){
 const detail=detailFor(game,locale);
 assert.ok(detail.description.trim() && detail.instructions.trim());
 assert.ok(detail.compatibility.includes(detail.platforms));
 assert.ok(detail.languages.every(language=>language.name && language.locale));
 assert.ok(!JSON.stringify(detail).includes('undefined'));
 if(!editorial(game,locale))assert.ok(!isIndexable({type:'game',id:game.id,locale}),'Factual additions must not silently expand indexing');
 checked++;
}
console.log(`PASS ${checked} localized game details; source-confirmed inputs, authored priority and indexability preserved`);
