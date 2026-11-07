import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const groups = JSON.parse(readFileSync('data/genre-groups.json', 'utf8')).groups;
const sites = JSON.parse(readFileSync('data/sites.json', 'utf8'));
const results = [];
for (const group of groups) {
  const site = sites.find(site => site.id === `en-${group.id}`);
  if (!site || site.gameIds.length !== 10) throw new Error(`${group.id} does not yet have ten selected games.`);
  // Shared generated assets make these builds intentionally sequential.
  const result = spawnSync('npm', ['run', 'build'], {
    env: { ...process.env, SITE_GENRE: group.id, SITE_LOCALE: 'en', SITE_STAGE: 'preview', OUTPUT_DIR: `dist-preview/${site.id}` },
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
  results.push({ site: site.id, gameCount: site.gameIds.length, pages: site.gameIds.length + 3, previewOnly: true, status: 'passed' });
}
mkdirSync('release-manifests', { recursive: true });
writeFileSync('release-manifests/major-genres-build.json', JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2));
console.log(`Built and verified all ${results.length} broad English genre previews. No sites were activated or published.`);
