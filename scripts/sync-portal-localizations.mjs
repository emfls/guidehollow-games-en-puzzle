import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {games,localeIds,summaryFor} from '../portal/catalog.mjs';
import {sourceSummary,needsTranslationRepair} from '../portal/localization.mjs';

const directory='portal/locales/catalog';
mkdirSync(directory,{recursive:true});
let stopped=false,requests=0;
const stagedWrites=new Map();
async function translate(lines,locale){
  if(stopped)throw new Error('Translation stopped after an earlier failure.');
  const url=new URL('https://translate.googleapis.com/translate_a/single');
  for(const [key,value] of Object.entries({client:'gtx',sl:'auto',tl:locale==='zh'?'zh-CN':locale,dt:'t',q:lines.join('\n')}))url.searchParams.set(key,value);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});requests++;
  if(response.status===429)throw new Error(`DEFERRED: Translation HTTP 429 for ${locale}; no retry; committed catalog and translations remain unchanged.`);
  if(!response.ok)throw new Error(`Translation HTTP ${response.status} for ${locale}; no immediate retry.`);
  const data=await response.json();
  if(!Array.isArray(data[0]) || data[0].some(segment=>typeof segment[0]!=='string'))throw new Error(`Invalid translation response: ${locale}`);
  const translated=data[0].map(segment=>segment[0]).join('').trim().split(/\r?\n/).map(text=>text.trim());
  if(lines.length===1 && translated.some(text=>text))return [translated.join(' ')];
  if(translated.length!==lines.length || translated.some(text=>!text)){
    if(lines.length>1){const half=lines.length===2?1:Math.floor(lines.length/4)*2;return [...await translate(lines.slice(0,half),locale),...await translate(lines.slice(half),locale)];}
    throw new Error(`Translation alignment failed: ${locale}, ${lines.length} -> ${translated.length}`);
  }
  return translated;
}
const requested=process.argv.slice(2),pending=(requested.length?requested:[...new Set(['ko','ja','zh',...localeIds])]).filter(locale=>locale!=='en');
if(pending.some(locale=>!localeIds.includes(locale)))throw new Error('Unsupported translation locale.');
async function worker(){
  while(pending.length && !stopped){
    const locale=pending.shift(),path=`${directory}/${locale}.json`;
    const saved=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{schemaVersion:1,engine:'Google Translate (machine translation)',games:{}};
    const missing=games.filter(game=>saved.games[game.id]?.sourceHash!==game.sourceHash || !saved.games[game.id]?.title || !saved.games[game.id]?.summary || needsTranslationRepair(game,saved.games[game.id],locale));
    let done=0;
    while(missing.length && !stopped){
      const batch=[];let size=0;
      while(missing.length && (size<4200 || !batch.length)){
        const game=missing.shift(),summary=sourceSummary(game) || game.title;
        batch.push({game,summary});size+=game.title.length+summary.length+2;
      }
      const result=await translate(batch.flatMap(({game,summary})=>[game.title.replace(/\s+/g,' ').trim(),summary]),locale);
      for(let index=0;index<batch.length;index++){
        const {game,summary:source}=batch[index];
        const record={sourceHash:game.sourceHash,title:result[index*2],summary:result[index*2+1]};
        if(needsTranslationRepair(game,record,locale)){
          [record.summary]=await translate([source],locale);
          if(needsTranslationRepair(game,record,locale)){record.summary=summaryFor(game,locale);record.summaryFromFacts=true;}
        }
        saved.games[game.id]=record;
      }
      saved.updatedAt=new Date().toISOString();
      stagedWrites.set(path,JSON.stringify(saved)+'\n');
      done+=batch.length;
      if(done%200<batch.length || !missing.length)console.log(`${locale}: translated ${done}, remaining ${missing.length}, requests ${requests}`);
      await delay(900);
    }
    if(!stopped)console.log(`${locale}: complete ${games.length} records`);
  }
}
try{
  await Promise.all(Array.from({length:1},()=>worker().catch(error=>{stopped=true;throw error;})));
  for(const [path,content] of stagedWrites){writeFileSync(path+'.tmp',content);renameSync(path+'.tmp',path);}
}
catch(error){console.error(error.message);process.exitCode=1;}
