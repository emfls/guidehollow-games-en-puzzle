import { readFileSync, existsSync } from 'node:fs';

const catalogs=new Map();
export function catalogTranslation(game,locale) {
  if(locale==='en')return null;
  if(!catalogs.has(locale)){
    const path=`portal/locales/catalog/${locale}.json`;
    catalogs.set(locale,existsSync(path)?JSON.parse(readFileSync(path,'utf8')).games:{});
  }
  const text=catalogs.get(locale)?.[game.id];
  return text && text.sourceHash===game.sourceHash && text.title?.trim() && text.summary?.trim() && !needsTranslationRepair(game,text,locale)?text:null;
}
export function needsTranslationRepair(game,text,locale){
  const summary=text.summary || '',source=sourceSummary(game);
  if(/[\u2047\uFFFD]/.test((text.title || '')+' '+summary))return true;
  if(summary===source && source.length>35 && !(locale==='ru' && /\p{Script=Cyrillic}/u.test(source)))return true;
  const englishWords=summary.match(/\b(?:a|an|the|and|with|to|you|is|your|this|where|of|for)\b/gi) || [];
  if(locale!=='en' && englishWords.length>=5 && englishWords.length/summary.split(/\s+/).length>=0.25)return true;
  if(!['ru','uk','kk'].includes(locale) && /\p{Script=Cyrillic}/u.test(summary))return true;
  const scripts={ko:/\p{Script=Hangul}/u,ja:/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,zh:/\p{Script=Han}/u,ar:/\p{Script=Arabic}/u,hi:/\p{Script=Devanagari}/u,th:/\p{Script=Thai}/u,ru:/\p{Script=Cyrillic}/u,uk:/\p{Script=Cyrillic}/u,kk:/\p{Script=Cyrillic}/u};
  return Boolean(scripts[locale] && summary.length>20 && /[A-Za-z]{3,}/.test(summary) && !scripts[locale].test(summary));
}
export function sourceSummary(game) {
  const plain=game.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return plain.match(/^.{20,160}?[.!?。！？](?=\s|$)/u)?.[0] || (plain.length>137?plain.slice(0,136).replace(/\s+\S*$/,'')+'…':plain);
}
const languageNames=new Map();
export function languageNameFor(locale,language){
  if(!languageNames.has(locale))languageNames.set(locale,new Intl.DisplayNames([locale],{type:'language'}));
  return languageNames.get(locale).of(language);
}
