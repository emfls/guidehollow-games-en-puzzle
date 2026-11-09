import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const config={type:'detail',locale:'en',game:{id:'fixture',title:'Fixture',embedUrl:'https://example.invalid/game'},copy:{loading:'Loading',loaded:'Loaded',sourcePage:'Open on Playgama'}};
const html=`<script id="portal-config" type="application/json">${JSON.stringify(config)}</script><div data-player><div data-preview><button data-play>Play</button></div><div data-frame-stage hidden></div><div data-player-toolbar hidden><span data-player-status></span><button data-close-game>Close</button></div></div>`;
function fixture(){
 const dom=new JSDOM(html,{url:'https://example.test/en/play/fixture/',runScripts:'outside-only'}), w=dom.window, timers=new Map();let n=0;
 w.setTimeout=(fn,ms)=>{const id=++n;timers.set(id,{fn,ms});return id};w.clearTimeout=id=>timers.delete(id);w.eval(readFileSync('portal/site.js','utf8'));
 const tick=()=>{for(const [id,t] of [...timers])if(t.ms===15000){timers.delete(id);t.fn()}};
 return {w,doc:w.document,tick};
}
{
 const {w,doc,tick}=fixture();doc.querySelector('[data-play]').click();assert.equal(doc.querySelector('[data-player-status]').textContent,'Loading');tick();assert.equal(doc.querySelector('[data-player-status]').textContent,'Open on Playgama','a stalled frame offers the existing provider link');doc.querySelector('[data-close-game]').click();assert.equal(doc.querySelector('[data-preview]').hidden,false);doc.querySelector('[data-play]').click();assert.equal(doc.querySelectorAll('iframe').length,1);doc.querySelector('iframe').dispatchEvent(new w.Event('load'));tick();assert.notEqual(doc.querySelector('[data-player-status]').textContent,'Open on Playgama','successful frame load cancels timeout');w.close();
}
{
 const {w,doc,tick}=fixture();doc.querySelector('[data-play]').click();const old=doc.querySelector('iframe');doc.querySelector('[data-close-game]').click();doc.querySelector('[data-play]').click();old.dispatchEvent(new w.Event('error'));assert.equal(doc.querySelector('[data-player-status]').textContent,'Loading','stale frame errors cannot change the new frame');doc.querySelector('iframe').dispatchEvent(new w.Event('error'));assert.equal(doc.querySelector('[data-player-status]').textContent,'Open on Playgama');tick();w.close();
}
{
 const {w,doc,tick}=fixture();doc.querySelector('[data-play]').click();tick();doc.querySelector('iframe').dispatchEvent(new w.Event('load'));assert.equal(doc.querySelector('[data-player-status]').textContent,'Open on Playgama','a late load does not erase the fallback');w.close();
}

console.log('PASS player timeout, close/retry, stale events and late load');
