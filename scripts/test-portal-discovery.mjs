import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { games, localeGames, listGames, gamePath, allRoutes, config, titleFor } from '../portal/catalog.mjs';
import { renderPortal } from '../portal/render.mjs';

const partial={id:'unreviewed-title-fixture',title:'Build And Run',locales:['en']};
assert.equal(titleFor(partial,'ko'),partial.title,'Unknown game names must not become half English, half Korean');
const entry={type:'language',locale:'ko',page:1,path:'/ko/'};
assert.equal(listGames(entry).length,games.length,'Korean UI must expose the complete catalog, not only native Korean games');
assert.equal(localeGames.get('ko').length,games.filter(game=>game.locales.includes('ko')).length,'Native language eligibility must remain separate');
const routes=new Set(allRoutes().map(route=>route.path));
for(const game of games){
  const path=gamePath('ko',game);
  assert.ok(routes.has(path),'Every global card needs a real detail route: '+path);
  assert.ok(game.locales.includes(path.split('/')[1]),'Card must not invent Korean game support: '+game.id);
}
assert.ok(routes.has('/ko/page/'+Math.ceil(games.length/config.pageSize)+'/'),'The final global page must exist');
const document=new JSDOM(renderPortal(entry)).window.document;
assert.equal(document.querySelectorAll('#collection [data-card]').length,24);
assert.equal(new Set([...document.querySelectorAll('[data-card]')].map(card=>card.dataset.card)).size,24,'Home must not repeat cards in discovery shelves');
assert.ok(document.querySelector('.pagination .page-gap'),'Skipped page numbers need a visible ellipsis');
assert.ok(document.querySelector('[data-native-filter]'),'Native support must be an explicit filter');
assert.ok(document.querySelector('[data-range]')?.textContent.includes(new Intl.NumberFormat('ko').format(games.length)),'Show the current item range and total');
const chooser=new JSDOM(renderPortal({type:'selector',locale:'en',path:'/'})).window.document;
assert.doesNotMatch(chooser.body.textContent,/Each collection includes only games/,'Language selection must not imply native support for the whole global catalog');
console.log('PASS global catalog, valid supported routes, complete pagination and explicit native-language filter');
