import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { games, localeGames, listGames, gamePath, allRoutes, config, titleFor, isIndexable, localeIds,hasGamePage } from '../portal/catalog.mjs';
import { renderPortal } from '../portal/render.mjs';

const partial={id:'unreviewed-title-fixture',title:'Build And Run',locales:['en']};
assert.equal(titleFor(partial,'ko'),partial.title,'Unknown game names must not become half English, half Korean');
const entry={type:'language',locale:'ko',page:1,path:'/ko/'};
assert.equal(listGames(entry).length,games.length,'Korean UI must expose the complete catalog, not only native Korean games');
assert.equal(localeGames.get('ko').length,games.filter(game=>game.locales.includes('ko')).length,'Native language eligibility must remain separate');
const routes=new Set(allRoutes().map(route=>route.path));
for(const game of games){
  const path=gamePath('ko',game);
  assert.ok(routes.has(new URL(path,'https://games.guidehollow.com').pathname),'Every global card needs a real detail route: '+path);
  assert.ok(path.startsWith('/ko/play/'),'The player must preserve the selected UI language: '+game.id);
  if(!hasGamePage('ko',game))assert.equal(new URL(path,'https://games.guidehollow.com').searchParams.get('game'),game.id);
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
const horror=new JSDOM(renderPortal({type:'genre',locale:'ko',genre:'horror',page:1,path:'/ko/horror/'})).window.document;
assert.equal(horror.title,'공포 게임 무료 플레이 | GuideHollow Games','Genre titles should describe the game collection');
assert.ok(document.querySelector('.guide-links a'),'Home should introduce the authored guides');
assert.equal(new JSDOM(renderPortal({...entry,page:2,path:'/ko/page/2/'})).window.document.querySelector('.guide-links'),null,'Do not repeat the guide directory on every paginated page');
const indexed=allRoutes().filter(isIndexable);
const graph=new Map(indexed.map(route=>[route.path,[...renderPortal(route).matchAll(/<a\b[^>]*href="(\/[^"?#]*)"/g)].map(match=>match[1])]));
let reachableGuides=0;
for(const locale of localeIds){
  const home=`/${locale}/`,distance=new Map([[home,0]]),queue=[home];
  for(let i=0;i<queue.length;i++)for(const target of graph.get(queue[i]) || []){
    if(target.startsWith(home) && graph.has(target) && !distance.has(target)){
      distance.set(target,distance.get(queue[i])+1);queue.push(target);
    }
  }
  for(const guide of indexed.filter(route=>route.locale===locale && route.type==='game')){
    assert.ok((distance.get(guide.path) ?? Infinity)<=2,'Authored guides must be within two crawlable, indexable clicks of their language home: '+guide.path);
    reachableGuides++;
  }
}
console.log(`PASS ${reachableGuides} qualified game guides reachable within two indexable clicks`);
console.log('PASS global catalog, valid supported routes, complete pagination and explicit native-language filter');
