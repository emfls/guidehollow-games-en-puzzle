"""Local, resumable guide translation candidates; never approves or publishes.

Temporary runtime: ctranslate2, sentencepiece, lingua-language-detector.
Model: michaelfeil/ct2fast-m2m100_418M at
06bd83294674f3737eb929e501aa5beafaa229d8 (MIT). Binaries stay outside repo.
"""
import argparse, hashlib, json, re, shutil, time
from datetime import datetime, timezone
from pathlib import Path
import ctranslate2
import sentencepiece as spm
from lingua import Language, LanguageDetectorBuilder

parser=argparse.ArgumentParser()
parser.add_argument('--jobs',required=True)
parser.add_argument('--model',required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args()
jobs=json.loads(Path(args.jobs).read_text())
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
sp=spm.SentencePieceProcessor(model_file=str(Path(args.model)/'sentencepiece.bpe.model'))
translator=ctranslate2.Translator(args.model,device='cpu',compute_type='int8',inter_threads=1,intra_threads=4)
names=['ENGLISH','KOREAN','JAPANESE','CHINESE','ARABIC','AZERBAIJANI','GERMAN','SPANISH','FRENCH','HINDI','INDONESIAN','ITALIAN','KAZAKH','DUTCH','POLISH','PORTUGUESE','RUSSIAN','THAI','TURKISH','UKRAINIAN','VIETNAMESE']
detector=LanguageDetectorBuilder.from_languages(*[getattr(Language,name) for name in names]).with_low_accuracy_mode().build()
engine='m2m100-guide-candidate-v1'
started=time.monotonic()
def pieces(text):
    result=[]
    for paragraph in text.splitlines():
        if not paragraph.strip():continue
        buffer=[]
        for word in paragraph.split():
            if buffer and len(sp.encode(' '.join(buffer+[word])))>350:
                result.append(' '.join(buffer));buffer=[]
            buffer.append(word)
        if buffer:result.append(' '.join(buffer))
    return result
def language(text):
    confidence=detector.compute_language_confidence_values(text)[0]
    return {'language':str(confidence.language.iso_code_639_1).rsplit('.',1)[-1].lower(),'confidence':round(confidence.value,5)}
for job in jobs:
    locale=job['locale'];file=out/(locale+'.json')
    saved=json.loads(file.read_text()) if file.exists() else {'schemaVersion':1,'locale':locale,'engine':engine,'games':{}}
    pending=[g for g in job['games'] if saved['games'].get(g['id'],{}).get('referenceHash')!=g['referenceHash'] or saved['games'].get(g['id'],{}).get('sourceHash')!=g['sourceHash']]
    for offset in range(0,len(pending),16):
        if shutil.disk_usage(out).free<8*1024**3:raise RuntimeError('Stopped: less than 8GiB free disk')
        batch=pending[offset:offset+16];sources=[];positions=[]
        for game in batch:
            for field in ['description','instructions']:
                for part in pieces(game[field]):
                    sources.append(['__en__']+sp.encode(part,out_type=str)+['</s>']);positions.append((game['id'],field))
        results=translator.translate_batch(sources,target_prefix=[['__'+locale+'__'] for _ in sources],max_batch_size=16,beam_size=2,max_decoding_length=384,repetition_penalty=1.1,no_repeat_ngram_size=3)
        translated={g['id']:{'description':[],'instructions':[],'flags':[]} for g in batch}
        for (game_id,field),result in zip(positions,results):
            tokens=result.hypotheses[0]
            if tokens[0]!='__'+locale+'__':raise RuntimeError('Wrong target language prefix')
            text=sp.decode(tokens[1:]).strip()
            if not text:translated[game_id]['flags'].append('empty-'+field)
            if len(tokens)>=384:translated[game_id]['flags'].append('possible-truncation-'+field)
            translated[game_id][field].append(text)
        for game in batch:
            text=translated[game['id']]
            description='\n'.join(text['description']);instructions='\n'.join(text['instructions'])
            checks={field:language(value) for field,value in [('description',description),('instructions',instructions)] if value}
            for field,check in checks.items():
                if locale=='uz':text['flags'].append('manual-language-review-'+field)
                elif check['language']!=locale:text['flags'].append('language-mismatch-'+field)
            if re.search('[\u2047\uFFFD]',description+instructions):text['flags'].append('unknown-model-token')
            record={'sourceHash':game['sourceHash'],'referenceHash':game['referenceHash'],'title':game['title'],'description':description,'instructions':instructions,'provenance':{'method':'offline-translation-candidate','generatedAt':datetime.now(timezone.utc).isoformat(),'modelRevision':'06bd83294674f3737eb929e501aa5beafaa229d8','descriptionQuote':game['descriptionQuote'],'instructionsQuote':game['instructionsQuote']},'languageChecks':checks,'flags':text['flags']}
            record['candidateTextHash']=hashlib.sha256((record['title']+'\n'+description+'\n'+instructions).encode()).hexdigest()
            saved['games'][game['id']]=record
        temp=file.with_suffix('.json.tmp');temp.write_text(json.dumps(saved,ensure_ascii=False,separators=(',',':'))+'\n');temp.replace(file)
        print(locale,offset+len(batch),'/',len(pending),'elapsed',round(time.monotonic()-started,1),flush=True)
    print('COMPLETE',locale,'saved',len(saved['games']),flush=True)
print('ALL_CANDIDATES_COMPLETE',flush=True)
