(() => {
  'use strict';
  const element=document.getElementById('portal-config');
  if(!element)return;
  let config;try{config=JSON.parse(element.textContent);}catch{return;}
  const copy=config.copy,$=(selector,parent=document)=>parent.querySelector(selector),$$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
  const storageKey=type=>`guidehollow:games:${type}`;
  const read=type=>{try{const value=JSON.parse(localStorage.getItem(storageKey(type))||'[]');return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'))]:[];}catch{return [];}};
  const write=(type,value)=>{try{localStorage.setItem(storageKey(type),JSON.stringify(value));}catch{}};
  let favorites=new Set(read('favorites')),recent=read('recent').slice(0,50),toastTimer;
  const toast=text=>{const target=$('[data-toast]');if(!target)return;clearTimeout(toastTimer);target.textContent=text;target.hidden=false;toastTimer=setTimeout(()=>target.hidden=true,4000);};
  function updateFavorites(){
    $$('[data-favorite]').forEach(button=>{const saved=favorites.has(button.dataset.favorite);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',`${saved?copy.saved:copy.save}: ${button.dataset.gameTitle || ''}`);const text=$('.favorite-text',button);if(text)text.textContent=saved?copy.saved:copy.save;});
    $$('[data-favorite-count]').forEach(target=>target.textContent=String(favorites.size));
    $$('.favorites-link').forEach(link=>link.setAttribute('aria-label',`${copy.favorites} (${favorites.size})`));
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-favorite]');if(!button)return;
    const id=button.dataset.favorite;if(favorites.has(id))favorites.delete(id);else favorites.add(id);
    write('favorites',[...favorites]);updateFavorites();
    if(config.type==='search'&&new URLSearchParams(location.search).get('view')==='favorites')runSearch();
  });
  function watchImages(parent=document){$$('[data-game-image]',parent).forEach(image=>{const fail=()=>image.closest('.game-art')?.classList.add('is-unavailable');image.addEventListener('error',fail,{once:true});if(image.complete&&!image.naturalWidth)fail();});}
  const menus=$$('[data-menu]');
  const carousel=$('[data-carousel]');
  if(carousel){
    const slides=$$('[data-slide]',carousel),controls=$('[data-carousel-controls]',carousel);
    if(slides.length>1&&controls){
      const motion=matchMedia('(prefers-reduced-motion: reduce)'),pause=$('[data-carousel-pause]',carousel);
      let index=0,timer,paused=false,hovered=false,focused=false,visible=true;
      function schedule(){
        clearTimeout(timer);
        if(!paused&&!hovered&&!focused&&visible&&!document.hidden&&!motion.matches)timer=setTimeout(()=>show(index+1),6000);
      }
      function show(next){
        index=(next+slides.length)%slides.length;
        slides.forEach((slide,n)=>slide.hidden=n!==index);
        const position=$('[data-carousel-position]',carousel);
        position.textContent=`${index+1} / ${slides.length}`;
        position.setAttribute('aria-label',copy.carouselPosition.replace('{position}',index+1).replace('{total}',slides.length));
        schedule();
      }
      $('[data-carousel-prev]',carousel).addEventListener('click',()=>show(index-1));
      $('[data-carousel-next]',carousel).addEventListener('click',()=>show(index+1));
      pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?copy.carouselResume:copy.carouselPause);pause.title=paused?copy.carouselResume:copy.carouselPause;schedule();});
      carousel.addEventListener('mouseenter',()=>{hovered=true;schedule();});
      carousel.addEventListener('mouseleave',()=>{hovered=false;schedule();});
      carousel.addEventListener('focusin',()=>{focused=true;schedule();});
      carousel.addEventListener('focusout',event=>{focused=carousel.contains(event.relatedTarget);schedule();});
      document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',schedule);
      if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(carousel);
      controls.dataset.ready='true';controls.inert=false;controls.removeAttribute('aria-hidden');schedule();
    }
  }
  document.addEventListener('pointerdown',event=>menus.forEach(menu=>{if(menu.open&&!menu.contains(event.target))menu.open=false;}));
  $('[data-clear-storage]')?.addEventListener('click',()=>{favorites.clear();recent=[];try{localStorage.removeItem(storageKey('favorites'));localStorage.removeItem(storageKey('recent'));}catch{}updateFavorites();toast(copy.storageCleared);});
  addEventListener('storage',event=>{if(event.key&&!event.key.startsWith('guidehollow:games:'))return;favorites=new Set(read('favorites'));recent=read('recent').slice(0,50);updateFavorites();if(config.type==='search'&&['favorites','recent'].includes(new URLSearchParams(location.search).get('view')))runSearch();});
  $('[data-share]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:config.game?.title||document.title,url:config.canonical});else if(navigator.clipboard){await navigator.clipboard.writeText(config.canonical);toast(copy.copied);}}catch(error){if(error.name!=='AbortError')toast(config.canonical);}});

  // Only the explicit Play action creates a third-party game frame.
  const player=$('[data-player]'),preview=$('[data-preview]'),stage=$('[data-frame-stage]'),toolbar=$('[data-player-toolbar]'),status=$('[data-player-status]'),play=$('[data-play]');
  let frame=null;
  function closeGame(focus=true){
    if(document.fullscreenElement===player)document.exitFullscreen?.().catch(()=>{});
    frame?.remove();frame=null;
    if(stage){stage.hidden=true;stage.replaceChildren();}if(preview)preview.hidden=false;if(toolbar)toolbar.hidden=true;
    if(focus)play?.focus();
  }
  play?.addEventListener('click',()=>{
    if(frame||!stage||!config.game?.embedUrl)return;
    const iframe=document.createElement('iframe');iframe.title=config.game.title;iframe.allow='autoplay; fullscreen; gamepad';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.addEventListener('load',()=>{if(frame===iframe&&status)status.textContent=copy.loaded;});
    iframe.addEventListener('error',()=>{if(status)status.textContent=copy.sourcePage;});
    iframe.src=config.game.embedUrl;frame=iframe;stage.replaceChildren(iframe);stage.hidden=false;preview.hidden=true;toolbar.hidden=false;status.textContent=copy.loading;
    recent=[config.game.id,...recent.filter(id=>id!==config.game.id)].slice(0,50);write('recent',recent);iframe.focus();
  });
  $('[data-close-game]')?.addEventListener('click',()=>closeGame());
  $('[data-fullscreen]')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(player?.requestFullscreen)await player.requestFullscreen();else toast(copy.fullscreenHelp);}catch{toast(copy.fullscreenHelp);}});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=menus.find(menu=>menu.open);if(menu){menu.open=false;$('summary',menu)?.focus();return;}if(frame&&!document.fullscreenElement)closeGame();});
  addEventListener('pagehide',()=>closeGame(false));

  // Native game pages need no catalog fetch; language-preserving player shells do.
  const normalize=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase(config.locale);
  let catalogPromise=null,searchVersion=0,visibleResults=[],shown=0;
  function searchCatalog(){return catalogPromise ||= fetch(`/assets/catalog/${config.locale}.json`).then(response=>{if(!response.ok)throw new Error('Catalog request failed');return response.json();}).then(data=>{if(!Array.isArray(data))throw new Error('Invalid catalog data');return data;}).catch(error=>{catalogPromise=null;throw error;});}
  async function loadPlayer(){
    const error=$('[data-player-error]');
    try{
      const id=new URLSearchParams(location.search).get('game');
      if(!id){error.textContent=copy.notFound;return;}
      $$('.language-panel a').forEach(a=>a.href=`/${a.lang}/play/?game=${encodeURIComponent(id)}`);
      const catalog=await searchCatalog(),game=catalog.find(game=>game.id===id);
      if(!game){error.textContent=copy.notFound;return;}
      for(const field of ['embedUrl','affiliateUrl']){
        const url=new URL(game[field]);
        if(url.protocol!=='https:' || url.username || url.password || !config.providerOrigins[field].includes(url.origin) || url.searchParams.getAll('clid').length!==1 || url.searchParams.get('clid')!==config.publisherClid)throw new Error('Invalid provider URL');
      }
      config.game=game;config.canonical=new URL(game.path,location.origin).href;
      document.title=copy.gameTitle.replace('{title}',()=>game.title)+' | GuideHollow';
      $('meta[name="description"]').content=game.summary;
      $('meta[property="og:title"]').content=document.title;
      $('meta[property="og:description"]').content=game.summary;
      $$('[data-player-title]').forEach(node=>node.textContent=game.title);
      $('[data-shell-genres]').textContent=game.genres.map(genre=>config.genreNames[genre]).join(' · ');
      const detail=game.detail;
      if(!detail||!['description','instructions','compatibility'].every(key=>typeof detail[key]==='string')||!['controls','mechanics'].every(key=>Array.isArray(detail[key])&&detail[key].every(value=>typeof value==='string')))throw new Error('Invalid game detail');
      $('[data-shell-summary]').textContent=detail.description;
      $('[data-shell-instructions]').textContent=detail.instructions;
      $('[data-shell-compatibility]').textContent=detail.compatibility;
      $('[data-shell-language-facts]').textContent=game.languages.map(language=>language.name).join(' · ');
      for(const [key,section] of [['controls','control'],['mechanics','mechanic']]){
        const list=$(`[data-shell-${key}]`);
        list.replaceChildren(...detail[key].map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));
        $(`[data-shell-${section}-section]`).hidden=!detail[key].length;
      }
      $('[data-shell-guide-note]').hidden=detail.hasGuide||detail.sourceMatched;
      $('[data-shell-platforms]').textContent=game.platformsLabel;
      $('[data-shell-orientation]').textContent=game.orientationLabel;
      const image=$('[data-shell-image]');image.src=game.thumbnail;image.alt=game.title;image.dataset.gameImage='';
      const favorite=$('[data-shell-favorite]');favorite.dataset.favorite=game.id;favorite.dataset.gameTitle=game.title;
      $$('[data-shell-source]').forEach(a=>a.href=game.affiliateUrl);
      const path=locale=>game.languages.some(language=>language.locale===locale)?`/${locale}/play/${game.slug}/`:`/${locale}/play/?game=${encodeURIComponent(game.id)}`;
      $('[data-shell-languages]').replaceChildren(...game.languages.map(language=>{const a=document.createElement('a');a.href=path(language.locale);a.lang=language.locale;a.textContent=language.name;return a;}));
      $$('.language-panel a').forEach(a=>a.href=path(a.lang));
      error.hidden=true;$('[data-player-content]').hidden=false;updateFavorites();watchImages(preview);
    }catch{error.textContent=copy.catalogLoadError;}
  }
  function cardIcon(name){
    const namespace='http://www.w3.org/2000/svg',svg=document.createElementNS(namespace,'svg');
    for(const [key,value] of Object.entries({class:`icon icon-${name}`,'aria-hidden':'true',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
    const path=document.createElementNS(namespace,'path');path.setAttribute('d',name==='heart'?'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z':'M4 12h16m-6-6 6 6-6 6');svg.append(path);return svg;
  }
  function searchCard(game){
    const article=document.createElement('article');article.className='game-card';article.dataset.card=game.id;article.dataset.native=String(game.native);
    const link=document.createElement('a');link.className='card-link';link.href=game.path;
    const art=document.createElement('span');art.className='game-art';const image=document.createElement('img');image.src=game.thumbnail;image.alt=game.title;image.width=720;image.height=480;image.loading='lazy';image.decoding='async';image.dataset.gameImage='';art.append(image);
    const text=document.createElement('div');text.className='card-copy';const genre=document.createElement('span');genre.className='eyebrow';genre.textContent=config.genreNames[config.listing?.genre||game.genres[0]]||'';const title=document.createElement('h3');title.textContent=game.title;const summary=document.createElement('p');summary.className='card-summary';summary.textContent=game.summary||'';const action=document.createElement('span');action.className='card-action';action.append(document.createTextNode(copy.play+' '),cardIcon('arrow'));const language=document.createElement('span');language.className='game-language';language.textContent=game.language||'';text.append(genre,title,summary,language,action);link.append(art,text);
    const save=document.createElement('button');save.type='button';save.className='favorite-button';save.dataset.favorite=game.id;save.dataset.gameTitle=game.title;const saveText=document.createElement('span');saveText.className='favorite-text';saveText.textContent=copy.save;save.append(cardIcon('heart'),saveText);save.setAttribute('aria-label',copy.save);article.append(link,save);return article;
  }
  function showMore(){const grid=$('[data-search-results]');if(!grid)return;const fragment=document.createDocumentFragment();for(const game of visibleResults.slice(shown,shown+24))fragment.append(searchCard(game));shown+=24;grid.append(fragment);const button=$('[data-more-results]');if(button)button.hidden=shown>=visibleResults.length;updateFavorites();watchImages(grid);}
  async function runSearch(){
    if(config.type!=='search')return;
    const version=++searchVersion,params=new URLSearchParams(location.search),view=params.get('view')||'all',query=params.get('q')||'',input=$('#site-search'),status=$('[data-search-status]'),heading=$('[data-search-heading]');
    if(input&&input.value!==query)input.value=query;heading.textContent=view==='favorites'?copy.favorites:view==='recent'?copy.recent:copy.search;status.textContent=copy.loading;
    $$('.search-views a').forEach(link=>{const target=new URL(link.href).searchParams.get('view')||'all';if(target===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    try{
      const catalog=await searchCatalog();if(version!==searchVersion)return;
      syncFilters(params.get('native')==='1',catalog);
      const term=normalize(query.trim());visibleResults=catalog.filter(game=>(params.get('native')!=='1'||game.native)&&(!term||normalize([game.title,game.originalTitle,game.summary,...game.genres.map(genre=>config.genreNames[genre])].join(' ')).includes(term))&&(view!=='favorites'||favorites.has(game.id))&&(view!=='recent'||recent.includes(game.id)));
      if(view==='recent')visibleResults.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
      status.textContent=visibleResults.length?copy.gameCount.replace('{count}',new Intl.NumberFormat(config.locale).format(visibleResults.length)):`${copy.noResults}. ${copy.noResultsText}`;shown=0;$('[data-search-results]').replaceChildren();showMore();
    }catch{if(version!==searchVersion)return;status.textContent=copy.catalogLoadError;visibleResults=[];shown=0;$('[data-search-results]').replaceChildren();$('[data-more-results]').hidden=true;}
  }
  function syncFilters(native,catalog){
    $$('[data-native-filter]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.nativeFilter==='native')===native)));
    $$('.portal-genres a,.footer-genres a,.search-views a').forEach(link=>{const url=new URL(link.href);if(native)url.searchParams.set('native','1');else url.searchParams.delete('native');link.href=url;const count=$('.genre-nav-count',link),genre=url.pathname.split('/')[2];if(count&&catalog)count.textContent=new Intl.NumberFormat(config.locale).format(catalog.filter(game=>game.genres.includes(genre)&&(!native||game.native)).length);});
  }
  async function runListing(){
    const params=new URLSearchParams(location.search),native=params.get('native')==='1',version=++searchVersion;
    const error=$('[data-catalog-error]');error.hidden=true;
    try{
      const catalog=await searchCatalog();if(version!==searchVersion)return;
      const selected=catalog.filter(game=>(!config.listing.genre||game.genres.includes(config.listing.genre))&&(!native||game.native));
      const pages=Math.ceil(selected.length/24),requested=Number(native?params.get('page')||1:location.pathname.match(/\/page\/(\d+)\//)?.[1]||1);
      const page=Math.max(1,Math.min(Number.isSafeInteger(requested)?requested:1,pages||1));
      const grid=$('[data-catalog-grid]'),fragment=document.createDocumentFragment();
      for(const game of selected.slice((page-1)*24,page*24))fragment.append(searchCard(game));
      if(!selected.length){const empty=document.createElement('p');empty.className='catalog-empty';empty.textContent=copy.noResults;fragment.append(empty);}
      grid.replaceChildren(fragment);grid.dataset.count=String(Math.min(24,selected.length-(page-1)*24));
      const number=n=>new Intl.NumberFormat(config.locale).format(n);
      $('[data-range]').textContent=selected.length?`${number((page-1)*24+1)}–${number(Math.min(page*24,selected.length))} / ${number(selected.length)}`:'0 / 0';
      const path=n=>native?`${config.listing.basePath}?native=1&page=${n}`:config.listing.basePath+(n>1?`page/${n}/`:'');
      const nav=document.createElement('nav');nav.className='pagination';nav.setAttribute('aria-label',copy.pageOf.replace('{page}',page).replace('{pages}',pages));
      const link=(n,label,rel)=>{const a=document.createElement('a');a.href=path(n);a.textContent=label;if(native)a.dataset.nativePage=String(n);if(rel)a.rel=rel;else{a.setAttribute('aria-label',copy.pageOf.replace('{page}',n).replace('{pages}',pages));if(n===page)a.setAttribute('aria-current','page');}nav.append(a);};
      if(page>1)link(page-1,copy.previous,'prev');
      const start=Math.max(1,Math.min(page-2,pages-4)),numbers=[...new Set([1,...Array.from({length:Math.min(5,pages)},(_,i)=>start+i),pages])].filter(n=>n>0).sort((a,b)=>a-b);
      numbers.forEach((n,i)=>{if(i&&n-numbers[i-1]>1){const gap=document.createElement('span');gap.className='page-gap';gap.setAttribute('aria-hidden','true');gap.textContent='…';nav.append(gap);}link(n,String(n));});
      if(page<pages)link(page+1,copy.next,'next');
      const pagination=$('[data-catalog-pagination]');pagination.replaceChildren();
      if(pages>1){const counter=document.createElement('p');counter.className='page-counter';counter.textContent=copy.pageOf.replace('{page}',page).replace('{pages}',pages);pagination.append(nav,counter);}
      syncFilters(native,catalog);updateFavorites();watchImages(grid);
    }catch{if(version===searchVersion){error.textContent=copy.catalogLoadError;error.hidden=false;}}
  }
  $$('[data-native-filter]').forEach(button=>button.addEventListener('click',()=>{
    const url=new URL(config.listing?config.listing.basePath:location.href,location.origin);
    if(button.dataset.nativeFilter==='native')url.searchParams.set('native','1');else url.searchParams.delete('native');
    url.searchParams.delete('page');history.pushState(null,'',url);if(config.listing)runListing();else runSearch();
  }));
  $('[data-catalog-pagination]')?.addEventListener('click',event=>{const link=event.target.closest('[data-native-page]');if(!link)return;event.preventDefault();history.pushState(null,'',link.href);runListing();});
  addEventListener('popstate',()=>{if(config.listing)runListing();else if(config.type==='search')runSearch();});
  if(config.listing&&new URLSearchParams(location.search).get('native')==='1')runListing();
  if(config.type==='search'){
    let timer;const input=$('#site-search');
    const update=()=>{const url=new URL(location.href);if(input.value.trim())url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');history.replaceState(null,'',url);runSearch();};
    input?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,160);});
    input?.form?.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);update();});
    $('[data-more-results]')?.addEventListener('click',showMore);runSearch();
  }
  if(config.type==='player')loadPlayer();
  updateFavorites();watchImages();
})();
