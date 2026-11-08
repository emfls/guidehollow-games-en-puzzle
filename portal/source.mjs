export function sourcePlainText(text='') {
  return String(text).replace(/<\s*(?:br\s*\/?|\/p|\/li|\/div)\s*>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':' '}[entity])).split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
export function sourceLanguageFor(text=''){
  const plain=sourcePlainText(text),letters=plain.match(/\p{L}/gu)||[],cyrillic=plain.match(/\p{Script=Cyrillic}/gu)||[],latin=plain.match(/\p{Script=Latin}/gu)||[];
  if(cyrillic.length>letters.length*0.7)return 'ru';
  if(latin.length>letters.length*0.8&&(plain.match(/\b(?:the|and|your|with|this|you|use|click|tap|move|press|game|play|to|is)\b/gi)||[]).length>=(letters.length<60?1:2))return 'en';
  return 'und';
}
export function sourceSignals(text='') {
  const positive=sourcePlainText(text).replace(/[^.!?\n]*(?:\bdo not\b|\bdon't\b|\bnever\b|\bwithout\b)[^.!?\n]*(?:[.!?]|$)/gi,'');
  const patterns={WASD:/\bW\s*[,/]?\s*A\s*[,/]?\s*S\s*[,/]?\s*D\b/i,arrows:/arrow\s*(?:keys|buttons)|(?:^|[:;\n])\s*[↑↓←→⇦⇨](?:\s|[(/:])/im,space:/\bspace[- ]?bar\b|\b(?:press|hold|hit|tap|use)\s+(?:the\s+)?space\b|\bspace\s*(?:key|button|[-:=–—])|(?:^|[\n.;])\s*space\s+to\b/im,mouse:/\bmouse\b|\bclick(?:ing)?\b|\b[LR]MB\b/i,touch:/\btouch\s+(?:the\s+)?screen\b|\btouchscreen\b|\btouch[- ](?:controls|input|device)\b|\b(?:tap|swipe)(?:ping|ing)?\s+(?:on\s+)?(?:the\s+)?(?:screen|display|buttons?)\b|\b(?:tap|swipe)(?:ping|ing)?\s+to\b/i,screen:/on[- ]screen\s*(?:buttons|controls)/i};
  const keys=[...new Set([...positive.matchAll(/^(?:[-•]\s*)?([A-Z])\s*(?:[-:=–—]|to\b)/gm),...positive.matchAll(/\b(?:key|press)\s*["']?([A-Z])\b/g)].map(match=>match[1]))];
  for(const match of positive.matchAll(/\b(?:press|hold|hit|use)\s+(?:the\s+)?(?:left\s+|right\s+)?(Shift|Backspace|Enter|Esc(?:ape)?|Ctrl|Alt|Tab)\b|\b(Shift|Backspace|Enter|Esc(?:ape)?|Ctrl|Alt|Tab)\s*(?:key\b|to\b|[-:=–—])/gi)){
    const key=match[1]||match[2],canonical={shift:'Shift',backspace:'Backspace',enter:'Enter',esc:'Esc',escape:'Esc',ctrl:'Ctrl',alt:'Alt',tab:'Tab'}[key.toLowerCase()];
    if(!keys.includes(canonical))keys.push(canonical);
  }
  const mechanics={move:/\bmov(?:e|ement|ing)\b/i,jump:/\bjump(?:ing)?\b/i,collect:/\bcollect(?:ing)?\b/i,match:/\bmatch(?:ing)?\b/i,merge:/\bmerg(?:e|ing)\b/i,build:/\bbuild(?:ing)?\b/i,upgrade:/\bupgrad(?:e|es|ing)\b/i,survive:/\bsurviv(?:e|al|ing)\b/i,shoot:/\bshoot(?:ing)?\b/i,solve:/\bsolv(?:e|ing)\b/i,avoid:/\bavoid(?:ing)?\b/i,race:/\brac(?:e|ing)\b/i};
  return {inputs:Object.keys(patterns).filter(key=>patterns[key].test(positive)),keys,mechanics:Object.keys(mechanics).filter(key=>mechanics[key].test(positive)).slice(0,6)};
}
