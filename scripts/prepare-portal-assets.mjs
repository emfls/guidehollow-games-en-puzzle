import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config, games, provider, localeIds, localeGames, groups, copies, titleFor, summaryFor, allRoutes, isIndexable, alternatives, urlFor, gamePath, playLocale, preview } from '../portal/catalog.mjs';
import { assets, buildFingerprint } from '../portal/assets.mjs';
const root=resolve('.generated/portal-public');
rmSync(root,{recursive:true,force:true});mkdirSync(root,{recursive:true});
const write=(path,content)=>{const file=resolve(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,content);};
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const routes=allRoutes();
const indexable=routes.filter(isIndexable);
for(const asset of Object.values(assets))write(asset.path,asset.content);
write('favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0c1220"/><path d="m32 10 6 16 16 6-16 6-6 16-6-16-16-6 16-6Z" fill="#d4ee91"/></svg>');
for(const locale of localeIds){
  const search=games.map(game=>({id:game.id,title:titleFor(game,locale),summary:summaryFor(game,locale),originalTitle:game.title,path:gamePath(locale,game),thumbnail:game.thumbnail,genres:game.genreIds,native:game.locales.includes(locale),language:copies.get(playLocale(locale,game)).name}));
  write(`assets/catalog/${locale}.json`,JSON.stringify(search));
}
function sitemap(entries){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.map(entry=>{
    const variants=alternatives(entry,true);
    const fallback=entry.type==='selector'||entry.type==='language'?'/':variants.find(other=>other.locale==='en')?.path;
    return `<url><loc>${xml(urlFor(entry.path))}</loc>${variants.map(other=>`<xhtml:link rel="alternate" hreflang="${other.locale}" href="${xml(urlFor(other.path))}"/>`).join('')}${fallback?`<xhtml:link rel="alternate" hreflang="x-default" href="${xml(urlFor(fallback))}"/>`:''}</url>`;
  }).join('')}</urlset>\n`;
}
const sitemapPaths=['sitemaps/global.xml',...localeIds.map(locale=>`sitemaps/${locale}.xml`)];
write('sitemaps/global.xml',sitemap(indexable.filter(entry=>entry.type==='selector')));
for(const locale of localeIds)write(`sitemaps/${locale}.xml`,sitemap(indexable.filter(entry=>entry.type!=='selector'&&entry.locale===locale)));
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(path=>`<sitemap><loc>${xml(urlFor(`/${path}`))}</loc></sitemap>`).join('')}</sitemapindex>\n`);
write('robots.txt',preview?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);
write(`${config.indexNowKey}.txt`,config.indexNowKey);
write('_headers',`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${preview?'  X-Robots-Tag: noindex\n':''}/assets/static/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/catalog/*\n  Cache-Control: public, max-age=300\n/build-info.json\n  Cache-Control: no-cache\n`);
write('build-info.json',JSON.stringify({origin:config.origin,buildId:buildFingerprint(),preview,gameCount:games.length,localeCount:localeIds.length,routeCount:routes.length,indexableCount:indexable.length,catalogFetchedAt:provider.snapshot.fetchedAt},null,2)+'\n');
mkdirSync('release-manifests',{recursive:true});
writeFileSync('release-manifests/portal-routes.json',JSON.stringify(routes.map(entry=>({...entry,indexable:isIndexable(entry)})))+'\n');
console.log(`Prepared ${games.length} games, ${localeIds.length} languages, ${groups.length} broad genres and ${routes.length} routes (${indexable.length} indexable).`);
