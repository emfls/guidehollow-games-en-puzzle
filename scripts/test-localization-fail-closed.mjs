import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {games} from '../portal/catalog.mjs';

const root = mkdtempSync(join(tmpdir(), 'portal-localization-test-'));
try {
  const dir = join(root, 'portal/locales/catalog');
  mkdirSync(dir, {recursive:true});
  symlinkSync(resolve('data'), join(root, 'data'), 'dir');
  symlinkSync(resolve('portal/config.json'), join(root, 'portal/config.json'));
  for (const name of readdirSync('portal/locales')) {
    if (name !== 'catalog') symlinkSync(resolve('portal/locales', name), join(root, 'portal/locales', name));
  }
  const file = join(dir, 'ko.json');
  const saved = JSON.parse(readFileSync('portal/locales/catalog/ko.json', 'utf8'));
  saved.games[games[0].id].sourceHash = 'outdated-source-hash';
  const before = JSON.stringify(saved) + '\n';
  const script = resolve('scripts/sync-portal-localizations.mjs');
  for (const [name, implementation, expected] of [
    ['429', "return {ok:false,status:429}", 'DEFERRED: Translation HTTP 429'],
    ['network', "throw new Error('MOCK_NETWORK_FAILURE')", 'MOCK_NETWORK_FAILURE'],
    ['malformed', "return {ok:true,status:200,json:async()=>({})}", 'Invalid translation response'],
  ]) {
    writeFileSync(file, before);
    const mock = join(root, `mock-${name}.mjs`);
    writeFileSync(mock, `let n=0;globalThis.fetch=async()=>{n++;${implementation}};process.on('exit',()=>console.error('MOCK_REQUESTS='+n));`);
    const child = spawnSync(process.execPath, ['--import', mock, script, 'ko'], {cwd:root, encoding:'utf8', timeout:30000});
    assert.equal(child.status, 1, `${name} must hold`);
    assert.match(child.stderr, new RegExp(expected));
    assert.match(child.stderr, /MOCK_REQUESTS=1/, `${name} must not retry`);
    assert.equal(readFileSync(file,'utf8'),before, `${name} must not overwrite saved translations`);
  }
  for (const game of games.slice(0, 150)) saved.games[game.id].sourceHash = 'outdated-source-hash';
  const multiBefore = JSON.stringify(saved) + '\n';
  writeFileSync(file, multiBefore);
  const multiMock = join(root, 'mock-multiple-batches.mjs');
  writeFileSync(multiMock, `let n=0;globalThis.fetch=async url=>{n++;if(n>1)return {ok:false,status:429};const lines=new URL(url).searchParams.get('q').split('\\n');return {ok:true,status:200,json:async()=>[[[lines.map((_,i)=>'테스트 번역 '+i).join('\\n')]]]}};process.on('exit',()=>console.error('MOCK_REQUESTS='+n));`);
  const multi = spawnSync(process.execPath, ['--import', multiMock, script, 'ko'], {cwd:root, encoding:'utf8', timeout:30000});
  assert.equal(multi.status,1);
  assert.match(multi.stderr,/MOCK_REQUESTS=2/);
  assert.match(multi.stderr,/DEFERRED: Translation HTTP 429/);
  assert.equal(readFileSync(file,'utf8'),multiBefore,'later failure must not write an earlier successful batch');
  console.log('PASS 429, network error and malformed output: one request, fail closed, prior data retained');
} finally { rmSync(root,{recursive:true,force:true}); }
