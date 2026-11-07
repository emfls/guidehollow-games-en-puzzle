import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./portal/config.json', import.meta.url), 'utf8'));
export default defineConfig({
  site: config.origin,
  srcDir: './portal/src',
  publicDir: './.generated/portal-public',
  outDir: './dist-portal',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
});
