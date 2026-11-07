import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(path, 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const css = `${read('shared/site.css')}\n${read('portal/site.css')}`;
const js = read('portal/site.js');
export const assets = {
  css: { path: `assets/static/site-${hash(css).slice(0,12)}.css`, content: css },
  js: { path: `assets/static/portal-${hash(js).slice(0,12)}.js`, content: js },
};
export function buildFingerprint() {
  return hash(['portal/config.json','data/portal/catalog.json','data/catalog.json','data/sites.json','data/genre-groups.json','portal/catalog.mjs','portal/render.mjs'].map(read).join('\n') + readdirSync('portal/locales').filter(file=>file.endsWith('.json')).sort().map(file=>read(`portal/locales/${file}`)).join('\n') + css + js);
}
