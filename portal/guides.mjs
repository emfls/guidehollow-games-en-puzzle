import{readFileSync,readdirSync,existsSync}from'node:fs';
import{createHash}from'node:crypto';
import{sourcePlainText,sourceLanguageFor,sourceSignals}from'./source.mjs';
import{needsTranslationRepair}from'./localization.mjs';

const records=new Map(),duplicateReviewed=new Set(),duplicateSources=new Set(),cache=new Map();
const holds=JSON.parse(readFileSync('portal/locales/guide-holds.json','utf8')).games;
const providerReviews=existsSync('portal/locales/provider-reviews.json')?JSON.parse(readFileSync('portal/locales/provider-reviews.json','utf8')).games:{};
const normalize=text=>sourcePlainText(text).replace(/\s+/g,' ').trim();
const identity=text=>normalize(text).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const hash=text=>createHash('sha256').update(text).digest('hex');
// shortcut: strong function-word evidence catches misplaced Latin-language batches; individual review still establishes translation fidelity.
const languageWords=Object.fromEntries(Object.entries({
  de:'und der die das den dem des ein eine einen einem ist sind mit zum zur durch drücken kannst nicht auf',
  es:'el los las una unos unas para del pulsa haz clic puedes cuando también mientras pantalla mover juego',
  fr:'le les une des du pour dans sur avec vous cliquez appuyez lorsque écran jeu puis faites',
  it:'il gli una uno per nel nella sul sulla con premi puoi quando dello gioco schermo oppure',
  nl:'het een van voor naar op met om kun je druk klik scherm spel bewegen wordt',
  pt:'os as uma umas um dos das para no na com você clique pressione não jogo tela também',
  id:'yang dan untuk dengan pada atau dari ini ke tombol layar permainan tekan gerakkan dapat',
  az:'və üçün ilə düyməsi düyməsini istifadə oyun oyunu edin hərəkət sonra ekrandakı sürükləyin',
  tr:'ve için ile düğmesi düğmesini kullan oyun oyunu edin hareket sonra ekrandaki sürükleyin',
  uz:'va uchun bilan tugmasi tugmasini foydalaning o‘yin o‘yinni harakat keyin ekrandagi bosing',
  vi:'và của để trong với bạn khi nhấn trò chơi màn hình hoặc chọn di chuyển'
}).map(([locale,words])=>[locale,new Set(words.split(' '))]));
export const guideTextHash=record=>hash([record.title,record.description,record.instructions].join('\n'));
export const hasSavedGuide=(game,locale)=>records.has(locale+'/'+game.id);
for(const file of readdirSync('portal/locales/guides').filter(file=>file.endsWith('.json')).sort()){
  const data=JSON.parse(readFileSync('portal/locales/guides/'+file,'utf8'));
  if(data.schemaVersion!==1||!/^[a-z]{2}$/.test(data.locale)||!data.games)throw Error('Invalid guide batch: '+file);
  for(const[id,record]of Object.entries(data.games)){
    const key=data.locale+'/'+id;if(records.has(key))throw Error('Duplicate guide record: '+key);
    records.set(key,record);
  }
}
export function indexGuideSources(games){
  const sources=new Map(),reviewed=new Map();
  for(const game of games){
    const signature=hash(identity(game.description)+'\n'+identity(game.instructions));
    if(sources.has(signature)){duplicateSources.add(game.id);duplicateSources.add(sources.get(signature));}else sources.set(signature,game.id);
    for(const[key,record]of records)if(key.endsWith('/'+game.id)){
      const locale=key.slice(0,key.indexOf('/'));
      const text=identity(record.description+'\n'+record.instructions).replaceAll(identity(record.title),'').replaceAll(identity(game.title),'');
      const signature=locale+'/'+hash(text);
      if(reviewed.has(signature)){duplicateReviewed.add(key);duplicateReviewed.add(reviewed.get(signature));}else reviewed.set(signature,key);
    }
  }
}
function languageMatches(text,locale){
  if(locale==='en')return sourceLanguageFor(text)==='en';
  if(languageWords[locale]){
    const tokens=text.toLowerCase().match(/[\p{L}‘’]+/gu)||[];
    const score=words=>tokens.filter(token=>words.has(token)).length;
    const target=score(languageWords[locale]),strongest=Math.max(...Object.values(languageWords).map(score));
    if(strongest>=6&&target<strongest*.55)return false;
  }
  const scripts={ko:/\p{Script=Hangul}/gu,ja:/[\p{Script=Hiragana}\p{Script=Katakana}]/gu,zh:/\p{Script=Han}/gu,ar:/\p{Script=Arabic}/gu,hi:/\p{Script=Devanagari}/gu,th:/\p{Script=Thai}/gu,ru:/\p{Script=Cyrillic}/gu,uk:/\p{Script=Cyrillic}/gu,kk:/\p{Script=Cyrillic}/gu};
  return (!scripts[locale]||(text.match(scripts[locale])||[]).length>=20)&&!needsTranslationRepair({description:''},{summary:text},locale);
}
export function reviewedGuideDecision(game,locale,record){
  const fail=reason=>({ready:false,reason,kind:'source-reviewed'});
  if(!record||record.sourceHash!==game.sourceHash)return fail('stale-source');
  if(!['title','description','instructions'].every(key=>typeof record[key]==='string'&&record[key].trim()))return fail('missing-guide-field');
  if(record.reviewedTextHash!==guideTextHash(record))return fail('unreviewed-text-change');
  const p=record.provenance;
  if(p?.method!=='assistant-source-review'||!/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt||''))return fail('review-evidence-missing');
  for(const[field,quote]of [['description',p.descriptionQuote],['instructions',p.instructionsQuote]])if(typeof quote!=='string'||normalize(quote).length<20||!normalize(game[field]).includes(normalize(quote)))return fail('unsupported-source-evidence');
  const description=normalize(record.description),instructions=normalize(record.instructions);
  if(/\bTODO(?:\s*[:：]|\s+(?:replace|write|fill|translate))|lorem ipsum|\{(?:title|genre|controls)\}|[\u2047\uFFFD]/i.test(description+' '+instructions))return fail('placeholder-content');
  if(!languageMatches(description,locale)||!languageMatches(instructions,locale))return fail('wrong-language');
  const cjk=['ko','ja','zh'].includes(locale),compact=['ar','hi','th'].includes(locale);
  if(description.length<(cjk?220:compact?300:450)||record.description.split(/\n+/).filter(Boolean).length<2)return fail('insufficient-description');
  if(instructions.length<(cjk?100:compact?140:180))return fail('insufficient-instructions');
  if(identity(description)===identity(instructions)||duplicateReviewed.has(locale+'/'+game.id))return fail('duplicate-content');
  for(const key of sourceSignals(game.instructions).keys)if(!new RegExp(`(?<![A-Za-z0-9])${key==='Esc'?'Esc(?:ape)?':key}(?![A-Za-z0-9])`,'i').test(record.instructions))return fail('missing-source-control-key');
  return {ready:true,kind:'source-reviewed',guide:{title:record.title,description:record.description,instructions:record.instructions,origin:'source-reviewed',sourceHash:record.sourceHash}};
}
export function providerGuideDecision(game,locale,review=providerReviews[game.id]){
  const fail=reason=>({ready:false,reason,kind:'provider-source'});
  const description=sourcePlainText(game.description),instructions=sourcePlainText(game.instructions);
  if(sourceLanguageFor(description)!==locale||sourceLanguageFor(instructions)!==locale)return fail('localized-guide-missing');
  if(description.split(/\s+/).length<70||instructions.split(/\s+/).length<40)return fail('source-content-incomplete');
  if(!identity(description).includes(identity(game.title)))return fail('source-identity-unconfirmed');
  const signals=sourceSignals(instructions);
  if(!signals.inputs.length&&!signals.keys.length)return fail('source-inputs-unavailable');
  if(!signals.mechanics.length)return fail('source-progression-unavailable');
  if(/\bTODO(?:\s*[:：]|\s+(?:replace|write|fill|translate))|lorem ipsum|[\u2047\uFFFD]/i.test(description+' '+instructions))return fail('placeholder-content');
  if(duplicateSources.has(game.id)||identity(description)===identity(instructions))return fail('duplicate-source-content');
  if(!review)return fail('source-review-required');
  if(review.sourceHash!==game.sourceHash||review.sourceTextHash!==hash(normalize(game.description)+'\n'+normalize(game.instructions)))return fail('stale-source-review');
  if(review.status!=='consistent')return fail('source-review-hold');
  if(review.method!=='assistant-source-review'||!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt||'')||!review.reviewNote?.trim()||normalize(review.instructionQuote||'').length<30||!normalize(game.instructions).includes(normalize(review.instructionQuote)))return fail('source-review-evidence-missing');
  return {ready:true,kind:'provider-source',guide:{title:game.title,description,instructions,origin:'provider-source',sourceHash:game.sourceHash}};
}
export function guideDecision(game,locale){
  if(!game)return{ready:false,reason:'unknown-game'};
  const key=locale+'/'+game.id+'/'+game.sourceHash;if(cache.has(key))return cache.get(key);
  let decision;
  if(holds[game.id])decision={ready:false,reason:holds[game.id].reason,kind:'source-hold'};
  else if(providerReviews[game.id]?.sourceHash===game.sourceHash&&providerReviews[game.id]?.status==='hold'&&String(records.get(locale+'/'+game.id)?.provenance?.sourceIssueResolution||'').trim().length<40)decision={ready:false,reason:'source-review-hold',kind:'source-hold'};
  else if(records.has(locale+'/'+game.id))decision=reviewedGuideDecision(game,locale,records.get(locale+'/'+game.id));
  else decision=providerGuideDecision(game,locale);
  cache.set(key,decision);return decision;
}
