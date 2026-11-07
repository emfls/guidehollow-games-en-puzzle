import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { config, allRoutes, isIndexable, preview, urlFor } from '../portal/catalog.mjs';
import { buildFingerprint } from '../portal/assets.mjs';
import { renderPortal } from '../portal/render.mjs';

const endpoint='https://searchadvisor.naver.com/indexnow';
const receiptPath='data/portal/indexnow-receipt.json';
const deadline=Date.now()+55000;
const origin=new URL(config.origin);
const keyLocation=urlFor(`/${config.indexNowKey}.txt`);
const hash=text=>createHash('sha256').update(text).digest('hex');
function sameHost(value){const url=new URL(value);if(url.protocol!=='https:'||url.origin!==origin.origin)throw new Error('IndexNow URLs must stay on the unified HTTPS host.');return url.href;}
function report(result){
  console.log(JSON.stringify({service:'Naver IndexNow',host:origin.hostname,...result},null,2));
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Portal IndexNow\n\n- Result: ${result.status}\n- URLs: ${result.urlCount||0}\n- HTTP: ${result.httpStatus||'not sent'}\n\n${result.message}\n\nReceipt is not a guarantee of indexing or ranking.\n`);
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`indexnow_status=${result.status}\nindexnow_url_count=${result.urlCount||0}\n`);
  if(result.status==='pending')process.exitCode=2;
  if(result.status==='failed')process.exitCode=1;
}
async function request(url,options={}){
  const remaining=deadline-Date.now();if(remaining<250)throw new Error('Notification time budget reached.');
  return fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(Math.min(8000,remaining))});
}
async function main(){
  if(preview)throw new Error('Preview builds cannot submit IndexNow URLs.');
  if(origin.hostname!=='games.guidehollow.com'||origin.protocol!=='https:'||!/^\w[\w-]{7,127}$/.test(config.indexNowKey))throw new Error('Invalid unified host or IndexNow key.');
  const previous=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):{schemaVersion:1,host:origin.hostname,pages:{}};
  if(previous.host!==origin.hostname||!previous.pages||Array.isArray(previous.pages))throw new Error('Receipt belongs to another host or has an invalid page map.');
  for(const [url,digest] of Object.entries(previous.pages)){sameHost(url);if(!/^[a-f0-9]{64}$/.test(digest))throw new Error('Receipt contains an invalid content digest.');}
  const pages=Object.fromEntries(allRoutes().filter(isIndexable).map(entry=>[sameHost(urlFor(entry.path)),hash(renderPortal(entry))]));
  const changed=Object.keys(pages).filter(url=>previous.pages[url]!==pages[url]);
  const removed=Object.keys(previous.pages).filter(url=>!Object.hasOwn(pages,url));
  const urlList=[...changed,...removed];
  const context={urlCount:urlList.length,changed:changed.length,removed:removed.length,eligiblePageCount:Object.keys(pages).length};
  if(process.argv.includes('--dry-run')){report({...context,status:'dry-run',keyLocation,message:'Local validation only. No network requests, notification or receipt writes.'});return;}
  if(!config.deploymentReady){report({...context,status:'pending',message:'The unified deployment has not been enabled after its public checks. No requests were sent.'});return;}
  if(!urlList.length){report({...context,status:'unchanged',message:'No eligible page changed since its recorded successful notification.'});return;}
  const buildId=buildFingerprint();let verified=false,reason='Public key and deployment have not been verified.';
  for(let attempt=0;attempt<3&&Date.now()<deadline;attempt++){
    try{
      const [keyResponse,buildResponse]=await Promise.all([request(keyLocation,{cache:'no-store'}),request(urlFor('/build-info.json'),{cache:'no-store'})]);
      if(keyResponse.status===429||buildResponse.status===429){await keyResponse.body?.cancel();await buildResponse.body?.cancel();report({...context,status:'pending',httpStatus:429,message:'The host rate-limited validation. No POST or immediate retry was sent.'});return;}
      if(keyResponse.status!==200||buildResponse.status!==200){reason=`Public key/build returned ${keyResponse.status}/${buildResponse.status}.`;await keyResponse.body?.cancel();await buildResponse.body?.cancel();}
      else{
        const [keyText,build]=await Promise.all([keyResponse.text(),buildResponse.json()]);
        if(keyText.trim()===config.indexNowKey&&build.origin===config.origin&&build.buildId===buildId&&build.preview===false){verified=true;break;}
        reason='The live key or build fingerprint does not match this production source.';
      }
    }catch(error){reason=error.message;}
    if(attempt<2&&deadline-Date.now()>5250)await delay(5000);
  }
  if(!verified){report({...context,status:'pending',message:`${reason} No IndexNow POST was sent.`});return;}
  const accepted={...previous.pages};let submitted=0,lastStatus,status='submitted';
  for(let offset=0;offset<urlList.length;offset+=10000){
    const batch=urlList.slice(offset,offset+10000);
    let response;
    try{response=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:origin.hostname,key:config.indexNowKey,keyLocation,urlList:batch})});}
    catch(error){reason=`Response unconfirmed: ${error.message}`;status='pending';break;}
    lastStatus=response.status;await response.body?.cancel();
    if(response.status!==200){status=[202,429].includes(response.status)?'pending':'failed';reason=response.status===202?'URLs received; key verification is pending.':response.status===429?'Rate-limited; stopped without an immediate retry.':`Naver returned HTTP ${response.status}.`;break;}
    for(const url of batch){if(Object.hasOwn(pages,url))accepted[url]=pages[url];else delete accepted[url];}
    submitted+=batch.length;
  }
  if(submitted)writeFileSync(receiptPath,JSON.stringify({schemaVersion:1,host:origin.hostname,updatedAt:new Date().toISOString(),lastConfirmedBuildId:buildId,pages:accepted},null,2)+'\n');
  report({...context,status,httpStatus:lastStatus,submitted,keyVerified:true,buildVerified:true,message:status==='submitted'?'Naver received the changed or removed eligible URLs. Indexing and ranking are not confirmed.':reason});
}
try{await main();}catch(error){report({status:'failed',message:error.message});}
