import {copies,editorial,summaryFor,titleFor,format} from './catalog.mjs';
import {languageNameFor} from './localization.mjs';
import {readFileSync} from 'node:fs';
const reviewed=JSON.parse(readFileSync('portal/locales/game-details.json','utf8'));

import {sourcePlainText,sourceLanguageFor,sourceSignals} from './source.mjs';
export {sourcePlainText,sourceLanguageFor,sourceSignals} from './source.mjs';
const signals=new Map();
export function detailFor(game,locale) {
  const copy=copies.get(locale),guide=editorial(game,locale);
  const saved=reviewed[locale]?.[game.id],manual=saved?.sourceHash===game.sourceHash?saved:null;
  if(!signals.has(game.id))signals.set(game.id,sourceSignals(game.instructions));
  const signal=signals.get(game.id),descriptionLanguage=sourceLanguageFor(game.description),instructionsLanguage=sourceLanguageFor(game.instructions);
  const descriptionMatched=locale===descriptionLanguage,instructionsMatched=locale===instructionsLanguage,sourceMatched=descriptionMatched&&(!game.instructions?.trim()||instructionsMatched);
  const platforms=[...new Set(game.platforms.map(platform=>platform==='Desktop'?copy.desktop:['Android','iOS','Mobile'].includes(platform)?copy.mobile:platform))].join(' · ');
  const orientation=game.orientation==='portrait'?copy.portrait:game.orientation==='landscape'?copy.landscape:copy.anyOrientation;
  const controls=[...signal.inputs.map(input=>copy.controlNames[input]),...signal.keys];
  const instructions=guide?.instructions || manual?.instructions || (instructionsMatched?sourcePlainText(game.instructions):'') || (controls.length?format(copy.controlsText,{controls:controls.join(' · ')}):game.instructions?.trim()?copy.guidePending:copy.instructionsUnavailable);
  return {description:guide?.description || manual?.description || (descriptionMatched?sourcePlainText(game.description):summaryFor(game,locale)),instructions,hasGuide:Boolean(guide||manual),hasManualOnly:Boolean(manual&&!guide),sourceMatched,descriptionLanguage,instructionsLanguage,sourceDescription:sourcePlainText(game.description),sourceInstructions:sourcePlainText(game.instructions),controls,mechanics:signal.mechanics.map(mechanic=>copy.mechanicNames[mechanic]),platforms,orientation,languages:game.locales.map(language=>({locale:language,name:languageNameFor(locale,language)})),compatibility:format(copy.compatibilityText,{title:titleFor(game,locale),platforms,orientation,count:game.locales.length})};
}
