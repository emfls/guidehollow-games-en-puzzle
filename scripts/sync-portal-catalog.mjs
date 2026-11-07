import { readFile, mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PROVIDER_ENDPOINT, canonicalJson, createRuntimeCatalog, serializeRuntimeCatalog, runtimeContentHash } from './portal-provider-normalize.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_SIZE = 100;
const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAYS_MS = [1_000, 3_000];
const retryableStatus = status => [408, 425, 500, 502, 503, 504].includes(status);

class StopSyncError extends Error {}

function pageShape(data, offset, expectedTotal) {
  if (!data || !Array.isArray(data.games) || !Number.isSafeInteger(data.totalCount) || data.totalCount < 1) throw new StopSyncError(`Empty or invalid catalog response at offset ${offset}.`);
  if (expectedTotal !== undefined && data.totalCount !== expectedTotal) throw new StopSyncError(`Provider total changed during collection: ${expectedTotal} -> ${data.totalCount}. Previous catalog is retained.`);
  const expectedLength = Math.min(PAGE_SIZE, data.totalCount - offset);
  if (data.games.length !== expectedLength || expectedLength < 1) throw new StopSyncError(`Incomplete page at offset ${offset}: expected ${expectedLength}, received ${data.games.length}.`);
  return data;
}

export async function fetchFullProviderCatalog({ fetchImpl = globalThis.fetch, log = console.log, wait = delay } = {}) {
  const controller = new AbortController();
  async function page(offset, expectedTotal) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      controller.signal.throwIfAborted();
      try {
        const response = await fetchImpl(PROVIDER_ENDPOINT, {
          method: 'POST', redirect: 'error',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ pagination: { limit: PAGE_SIZE, offset }, filters: {}, sort: { type: 'ranking_default' } }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
        });
        if (response.status === 429) {
          const error = new StopSyncError('Provider returned HTTP 429; collection stopped without an immediate retry. Previous catalog is retained.');
          controller.abort(error);
          await response.body?.cancel();
          throw error;
        }
        if (!response.ok) {
          await response.body?.cancel();
          const message = `Provider HTTP ${response.status} at offset ${offset}.`;
          if (!retryableStatus(response.status)) throw new StopSyncError(message);
          throw new Error(message);
        }
        const data = pageShape(await response.json(), offset, expectedTotal);
        log(JSON.stringify({ event: 'catalog-page', offset, games: data.games.length, totalCount: data.totalCount }));
        return data;
      } catch (error) {
        if (error instanceof StopSyncError || controller.signal.aborted) throw error;
        if (attempt === RETRY_DELAYS_MS.length) throw new Error(`Page ${offset} failed after ${attempt + 1} bounded attempts: ${error.message}`, { cause: error });
        log(JSON.stringify({ event: 'catalog-retry', offset, attempt: attempt + 1, delayMs: RETRY_DELAYS_MS[attempt], reason: error.message }));
        await wait(RETRY_DELAYS_MS[attempt], undefined, { signal: controller.signal });
      }
    }
  }
  const first = await page(0);
  const pageCount = Math.ceil(first.totalCount / PAGE_SIZE);
  const pages = new Array(pageCount);
  pages[0] = first.games;
  let nextPage = 1;
  let failure = null;
  async function worker() {
    while (!controller.signal.aborted && nextPage < pageCount) {
      const index = nextPage++;
      try {
        pages[index] = (await page(index * PAGE_SIZE, first.totalCount)).games;
      } catch (error) {
        failure ||= error;
        controller.abort(error);
        return;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(0, pageCount - 1)) }, worker));
  if (failure) throw failure;
  const records = pages.flat();
  if (pages.some(page => !Array.isArray(page)) || records.length !== first.totalCount) throw new StopSyncError('Full provider snapshot is incomplete.');
  return { records, totalCount: first.totalCount, fetchedAt: new Date().toISOString() };
}

async function optionalJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function readSnapshot(path) {
  const input = JSON.parse(await readFile(path, 'utf8'));
  if (input.schemaVersion !== 1 || input.snapshot?.status !== 'complete' || !Array.isArray(input.games)) throw new Error('The input must be a complete schemaVersion 1 portal-provider-catalog snapshot.');
  const totalCount = input.snapshot.totalGames ?? input.stats?.totalGames;
  if (!Number.isSafeInteger(totalCount) || totalCount < 1 || input.games.length !== totalCount || input.stats?.duplicateRows !== 0) throw new Error('Snapshot count or uniqueness evidence is invalid.');
  if (!Array.isArray(input.stats.reportedTotalCounts) || input.stats.reportedTotalCounts.length !== 1 || input.stats.reportedTotalCounts[0] !== totalCount) throw new Error('Snapshot provider totals do not agree.');
  return { records: input.games, totalCount, fetchedAt: input.snapshot.completedAt || input.snapshot.fetchedAt };
}

async function stageFile(path, contents) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o644);
  try { await handle.writeFile(contents, 'utf8'); await handle.sync(); }
  catch (error) { await handle.close(); await rm(temporary, { force: true }); throw error; }
  await handle.close();
  return temporary;
}

async function replacePair(files) {
  const prepared = [];
  const replaced = [];
  try {
    for (const [path, contents] of files) {
      let old = null;
      try { old = await readFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      prepared.push({ path, old, temporary: await stageFile(path, contents) });
    }
    for (const item of prepared) { await rename(item.temporary, item.path); replaced.push(item); }
  } catch (error) {
    // Validation and fetching happen before this function. Each replacement is
    // atomic; an ordinary second-file failure also rolls back the first file.
    const rollbackErrors = [];
    for (const item of replaced.reverse()) {
      try {
        if (item.old === null) await rm(item.path, { force: true });
        else await rename(await stageFile(item.path, item.old), item.path);
      } catch (rollbackError) { rollbackErrors.push(rollbackError.message); }
    }
    if (rollbackErrors.length) {
      const failure = new Error(`${error.message}; rollback needs attention: ${rollbackErrors.join('; ')}`, { cause: error });
      failure.previousCatalogRetained = false;
      throw failure;
    }
    throw error;
  } finally {
    await Promise.allSettled(prepared.map(item => rm(item.temporary, { force: true })));
  }
}

export async function syncCatalog({ rootDir = projectRoot, fromSnapshot = null, fetchImpl = globalThis.fetch, log = console.log } = {}) {
  const catalogPath = resolve(rootDir, 'data/portal/catalog.json');
  const statePath = resolve(rootDir, 'data/portal/sync-state.json');
  const [groupFile, overrides, previousCatalog, previousState] = await Promise.all([
    optionalJson(resolve(rootDir, 'data/genre-groups.json')),
    optionalJson(resolve(rootDir, 'data/portal/genre-overrides.json')),
    optionalJson(catalogPath), optionalJson(statePath),
  ]);
  if (!groupFile?.groups) throw new Error('Missing data/genre-groups.json/groups.');
  if (previousCatalog && (previousCatalog.schemaVersion !== 1 || !Array.isArray(previousCatalog.games) || !previousCatalog.snapshot?.contentHash)) throw new Error('Existing runtime catalog has an invalid schema; refusing to overwrite it.');
  if (previousState && (previousState.schemaVersion !== 1 || !Array.isArray(previousState.tombstones))) throw new Error('Existing synchronization state has an invalid schema; refusing to overwrite it.');
  if (Boolean(previousCatalog) !== Boolean(previousState)) throw new Error('Only one runtime catalog/state file exists. Restore a matching pair before synchronizing.');
  if (previousCatalog && previousState.lastAcceptedSnapshot?.contentHash !== previousCatalog.snapshot.contentHash) throw new Error('Catalog/state snapshot hashes differ. Restore a matching pair before synchronizing.');
  if (previousCatalog && runtimeContentHash(previousCatalog) !== previousCatalog.snapshot.contentHash) throw new Error('Existing runtime catalog content does not match its snapshot hash. Restore the last accepted catalog before synchronizing.');
  const input = fromSnapshot ? await readSnapshot(resolve(rootDir, fromSnapshot)) : await fetchFullProviderCatalog({ fetchImpl, log });
  const { catalog, state } = createRuntimeCatalog({ ...input, groups: groupFile.groups, overrides: overrides || {}, previousCatalog, previousState });
  const sameCatalog = previousCatalog?.snapshot.contentHash === catalog.snapshot.contentHash;
  const sameTombstones = canonicalJson(previousState?.tombstones ?? null) === canonicalJson(state.tombstones);
  const sameSourceProviderIds = canonicalJson(previousState?.sourceProviderIds ?? null) === canonicalJson(state.sourceProviderIds);
  if (fromSnapshot && previousCatalog && !sameCatalog && Date.parse(input.fetchedAt) < Date.parse(previousCatalog.snapshot.fetchedAt)) {
    throw new Error('The supplied snapshot predates the accepted catalog and would change its content. Use a fresh full sync instead of rolling back to an older provider snapshot.');
  }
  if (sameCatalog && sameTombstones && sameSourceProviderIds && previousState?.lastAcceptedSnapshot?.contentHash === previousCatalog.snapshot.contentHash) {
    const result = { status: 'unchanged', checkedAt: input.fetchedAt, totalCount: catalog.games.length, localeGamePairs: catalog.stats.localeGamePairs, contentHash: catalog.snapshot.contentHash, writes: 0 };
    log(JSON.stringify(result));
    return result;
  }
  await mkdir(dirname(catalogPath), { recursive: true });
  // The state and catalog carry the same content hash. State is staged first;
  // neither destination is touched until both new files are fully written.
  await replacePair([
    [statePath, `${JSON.stringify(state, null, 2)}\n`],
    [catalogPath, serializeRuntimeCatalog(catalog)],
  ]);
  const oldIds = new Set((previousCatalog?.games || []).map(game => game.providerId));
  const newIds = new Set(catalog.games.map(game => game.providerId));
  const result = {
    status: 'updated', fetchedAt: catalog.snapshot.fetchedAt, totalCount: catalog.games.length,
    localeGamePairs: catalog.stats.localeGamePairs,
    added: catalog.games.filter(game => !oldIds.has(game.providerId)).length,
    unlisted: [...oldIds].filter(id => !newIds.has(id)).length,
    tombstones: state.tombstones.length, unmappedGenres: catalog.stats.unmappedGenreGames.length,
    contentHash: catalog.snapshot.contentHash, writes: 2,
  };
  log(JSON.stringify(result));
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/sync-portal-catalog.mjs [--from-snapshot data/portal-provider-catalog.json]\nWithout --from-snapshot, fetches the complete public partner catalog.');
    return;
  }
  let fromSnapshot = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from-snapshot' && args[i + 1]) fromSnapshot = args[++i];
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  await syncCatalog({ fromSnapshot });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(JSON.stringify({ status: 'failed', message: error.message, previousCatalogRetained: error.previousCatalogRetained !== false }));
    process.exitCode = 1;
  });
}
