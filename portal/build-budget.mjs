export function assertPortalFileBudget(routes,assets){
  const paths=[...routes.map(entry=>entry.path==='/'?'index.html':entry.path.slice(1)+'index.html'),'404.html',...assets];
  if(new Set(paths).size!==paths.length)throw Error('Duplicate planned deployment file');
  if(paths.length>=20000)throw Error(`Deployment needs ${paths.length} files; Cloudflare Pages Free must stay below 20000. Keep excess guide candidates held.`);
  return paths.length;
}
