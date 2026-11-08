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

  // Search data is fetched only on the search utility page, never on every game page.
  const normalize=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase(config.locale);
  let catalogPromise=null,searchVersion=0,visibleResults=[],shown=0;
  function searchCatalog(){return catalogPromise ||= fetch(`/assets/catalog/${config.locale}.json`).then(response=>{if(!response.ok)throw new Error('Catalog request failed');return response.json();}).then(data=>{if(!Array.isArray(data))throw new Error('Invalid catalog data');return data;}).catch(error=>{catalogPromise=null;throw error;});}
  function cardIcon(name){
    const namespace='http://www.w3.org/2000/svg',svg=document.createElementNS(namespace,'svg');
    for(const [key,value] of Object.entries({class:`icon icon-${name}`,'aria-hidden':'true',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
    const path=document.createElementNS(namespace,'path');path.setAttribute('d',name==='heart'?'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z':'M4 12h16m-6-6 6 6-6 6');svg.append(path);return svg;
  }
  function searchCard(game){
    const article=document.createElement('article');article.className='game-card';article.dataset.card=game.id;
    const link=document.createElement('a');link.className='card-link';link.href=game.path;
    const art=document.createElement('span');art.className='game-art';const image=document.createElement('img');image.src=game.thumbnail;image.alt=game.title;image.width=720;image.height=480;image.loading='lazy';image.decoding='async';image.dataset.gameImage='';art.append(image);
    const text=document.createElement('div');text.className='card-copy';const genre=document.createElement('span');genre.className='eyebrow';genre.textContent=config.genreNames[game.genres[0]]||'';const title=document.createElement('h3');title.textContent=game.title;const action=document.createElement('span');action.className='card-action';action.append(document.createTextNode(copy.play+' '),cardIcon('arrow'));text.append(genre,title,action);link.append(art,text);
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
      const term=normalize(query.trim());visibleResults=catalog.filter(game=>(!term||normalize([game.title,game.originalTitle,...game.genres.map(genre=>config.genreNames[genre])].join(' ')).includes(term))&&(view!=='favorites'||favorites.has(game.id))&&(view!=='recent'||recent.includes(game.id)));
      if(view==='recent')visibleResults.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
      status.textContent=visibleResults.length?copy.gameCount.replace('{count}',visibleResults.length):`${copy.noResults}. ${copy.noResultsText}`;shown=0;$('[data-search-results]').replaceChildren();showMore();
    }catch{if(version!==searchVersion)return;status.textContent=copy.catalogLoadError;visibleResults=[];shown=0;$('[data-search-results]').replaceChildren();$('[data-more-results]').hidden=true;}
  }
  if(config.type==='search'){
    let timer;const input=$('#site-search');
    const update=()=>{const url=new URL(location.href);if(input.value.trim())url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');history.replaceState(null,'',url);runSearch();};
    input?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,160);});
    input?.form?.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);update();});
    $('[data-more-results]')?.addEventListener('click',showMore);runSearch();
  }
  updateFavorites();watchImages();
})();
