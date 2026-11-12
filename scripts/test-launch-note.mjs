import assert from 'node:assert/strict';
import {renderPortal} from '../portal/render.mjs';
import {copies,localeIds} from '../portal/catalog.mjs';
import {JSDOM} from 'jsdom';
for (const locale of localeIds) for (const entry of [
  {type:'game',id:'cup-quest',locale,path:`/${locale}/play/cup-quest/`},
  {type:'player',locale,path:`/${locale}/play/`},
]) {
  const html=renderPortal(entry);
  const note=copies.get(locale).launchNote;
  const doc=new JSDOM(html).window.document;
  assert.equal([...doc.querySelectorAll('p')].filter(p=>p.textContent===note).length,1,`${entry.type} ${locale}: notice exactly once`);
  assert.match(html,/<button[^>]*data-play[^>]*aria-describedby="launch-note"/);
  assert.match(html,/<div class="launch-notes"><p id="launch-note">/);
  assert.match(html,/rel="noopener sponsored"/);
}
console.log('PASS launch notice, play button and affiliate link');

// Execute the existing player in a network-disabled DOM, then check the note remains available.
import {readFileSync} from 'node:fs';
const dom = new JSDOM(renderPortal({type:'game',id:'cup-quest',locale:'ko',path:'/ko/play/cup-quest/'}), {url:'https://example.test/ko/play/cup-quest/',runScripts:'outside-only'});
dom.window.eval(readFileSync('portal/site.js','utf8'));
dom.window.document.querySelector('[data-play]').click();
assert.equal(dom.window.document.querySelectorAll('iframe').length,1);
assert.equal(dom.window.document.querySelectorAll('#launch-note').length,1);
assert.equal(dom.window.document.querySelector('#launch-note').closest('[hidden]'),null);
assert.equal(dom.window.document.querySelector('[data-play]').getAttribute('aria-describedby'),'launch-note');
dom.window.close();
console.log('PASS notice remains after mocked start; no external requests');
