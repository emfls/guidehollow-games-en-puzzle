# Portal provider catalog synchronization

## Current accepted runtime

The portal runtime contains **2,846 games**, **22 base-language locales**, and **8,896 native game/locale pairs**. All games match at least one of the existing 16 major genres after the expanded source mappings and five reviewed overrides. There are no removal tombstones on this initial accepted runtime.

- Runtime evidence: [data/portal/catalog.json](../data/portal/catalog.json) — 5,574,088 bytes at this handoff.
- Accepted snapshot, source ID inventory and removal history: [data/portal/sync-state.json](../data/portal/sync-state.json) — 2,846 unique string `sourceProviderIds`.
- Accepted content hash: `2ba4b81eb1e8e6c3515c157a33501c417735f9b7e9e09d757670c44cddedcd4f`.
- Accepted fetch time: `2026-11-07T15:33:08.103Z`.
- Initial collection and localization findings: [PORTAL_CATALOG_FINDINGS.md](PORTAL_CATALOG_FINDINGS.md).

The two retained data files have matching `snapshot` / `lastAcceptedSnapshot` values. The unified portal is **not deployed**. Periodic synchronization is **not active**, because its prepared workflow has not reached the default branch. Documentation, local validation and a prepared schedule do not establish an operational production sync. Existing genre sites remain in place until the unified portal is launched and verified.

The findings document distinguishes the initial mapping audit, which had 90 unmapped games, from this accepted runtime. That gap is resolved through the current [genre source mapping](../data/genre-groups.json) and [reviewed overrides](../data/portal/genre-overrides.json). No seventeenth genre was added.

The initial collection ran from `2026-11-07T15:14:44.664939+00:00` to `2026-11-07T15:15:50.084520+00:00`. Its full candidate was a temporary bootstrap artifact, not the final accepted runtime. During the subsequent live smoke sync accepted at `2026-11-07T15:33:08.103Z`, the provider changed only `police-chase-car-crash-3d`'s thumbnail. Its source hash and `changedAt` changed accordingly; all routes, language/genre memberships, descriptions, instructions and counts remained the same. The current accepted runtime retains that real update. A subsequent policy-only correction retained valid `ru-KZ` support; canonical comparison confirmed that all 2,846 game records, source hashes and timestamps remained unchanged.

`data/raw/` and `data/portal-provider-catalog.json` are excluded intermediate artifacts. They are not included in a normal checkout and are not required for CI or routine synchronization. Repository evidence is the retained runtime/state pair above; references to the initial collection describe historical observations rather than missing committed files.

## Commands

Run with Node.js 24 from the repository root. The scripts use only Node's standard library.

For a normal complete provider refresh:

```sh
node scripts/sync-portal-catalog.mjs
```

A normal checkout already contains its accepted runtime/state pair. For an explicit bootstrap/import without that pair, an independently supplied complete candidate may be used:

```sh
node scripts/sync-portal-catalog.mjs --from-snapshot /path/to/complete-provider-snapshot.json
```

`--from-snapshot` requires a complete schema version 1 candidate with consistent positive totals and no reported duplicates. The example path is an operator-supplied artifact, not a tracked file. This is a bootstrap/import mode, not a scheduled fetch or CI prerequisite. An older supplied snapshot that would change an already accepted catalog is rejected, preventing accidental rollback to stale provider metadata. An identical older input can be a no-op.

A successful run prints a JSON result with `status: updated` or `status: unchanged`. Errors exit nonzero. The prepared workflow defines schedule, commit/deployment behavior and concurrency, but is not active before its default-branch release; synchronization runs must be serialized. Running the synchronizer updates only local accepted data. It does not create an external repository, DNS record or deployment.

## Observed official source

The script uses the public exporter referenced by the official widget application's code:

```http
POST https://widgets.playgama.com/api/v1/partner/export/catalogue/games
Content-Type: application/json
```

```json
{"pagination":{"limit":100,"offset":0},"filters":{},"sort":{"type":"ranking_default"}}
```

The first response supplies `totalCount`. The script requests every subsequent offset through the complete total. **There is no maximum total-game cap.** A page size of 100 is a request batch size, not a catalog limit. Collection uses at most three concurrent requests.

Each request has a 30-second timeout. Network/JSON failures and HTTP 408, 425, 500, 502, 503 or 504 receive at most two retries, after one and three seconds. HTTP 429 stops collection immediately, cancels other in-flight work, and schedules no immediate retry. Other unsuccessful HTTP statuses stop the run. No authentication cookies, API secret or private session are used.

No game executable, game source, archive or image file is downloaded. The runtime stores metadata and the provider's original HTTPS embed/asset URLs.

## Completion and integrity gates

The existing accepted files are untouched until fetching and normalization finish. Acceptance requires:

- A positive safe-integer total and exactly the expected number of records on each page.
- The same reported total throughout the run, with no empty or missing page.
- A final record count equal to the reported total.
- Unique provider IDs, unique original slugs and unique lowercased portal route slugs.
- Provider IDs with the observed string type; objects and booleans cannot become new string identities.
- Valid source metadata, HTTPS export/catalog URLs and exactly one correct publisher CLID.
- Valid source-genre definitions and overrides limited to the configured major genres.

The source's top-performance ranking can change between offset requests. If that creates duplicates or inconsistent totals, the run fails and leaves the accepted catalog in place. A feed reorder that still returns the same complete game set does not change the content hash.

An existing runtime and state file must both be present, have compatible schemas, and reference the same accepted snapshot hash. The runtime's actual semantic content is also rehashed before use. A mismatched or corrupt pair is rejected before network collection or replacement.

## Retained source inventory and CI coverage

`sync-state.json.sourceProviderIds` stores the complete, sorted set of provider IDs from the accepted input. For live synchronization, IDs are extracted directly from the raw API records **before runtime conversion**; an explicit candidate import uses its original `providerId` fields. The inventory is not reconstructed from the normalized output. The current accepted inventory contains **2,846 unique nonempty strings**, matching `lastAcceptedSnapshot.totalCount`.

Every successful collection refreshes the inventory from that run's full input. The observed total of 2,846 is not a maximum, a selection size or a hardcoded verifier limit. New provider games can increase both the source inventory and runtime together.

[scripts/verify-portal.mjs](../scripts/verify-portal.mjs) checks:

- Nonempty, unique string source IDs and an inventory length equal to the accepted total.
- Exact set equality between `sourceProviderIds` and all runtime `providerId` values.
- Equal counts in the actual game array, `catalog.json.snapshot.totalCount`, `catalog.json.stats.totalGames` and `sync-state.json.lastAcceptedSnapshot.totalCount`.
- Equal accepted content hashes in the runtime snapshot and synchronization state.

The verification report's `sourceSnapshot` is the accepted normalized-content hash. An excluded old candidate is not read or required by this check, so a stale bootstrap file cannot block legitimate additions on the next complete sync. This small independent source inventory detects transformation omissions or accidental game-count caps without keeping a duplicate 11.7 MB candidate. The count/set checks depend on the synchronizer's complete-page acceptance gates; they do not assert that the partner export contains every game on the consumer website.

## Compact runtime contract

The top-level object is:

```json
{
  "schemaVersion": 1,
  "snapshot": {
    "fetchedAt": "ISO timestamp",
    "source": "official exporter URL",
    "totalCount": 2846,
    "contentHash": "SHA-256 of normalized semantic content"
  },
  "stats": {},
  "languagePolicy": {},
  "games": []
}
```

Every game has exactly these 18 fields:

```text
id, providerId, slug, title, description, instructions,
embedUrl, affiliateUrl, thumbnail, categories, platforms,
orientation, languages, locales, genreIds,
firstSeenAt, changedAt, sourceHash
```

`id` preserves the provider's original slug; `providerId` is the durable provider identity. `slug` is a separate lowercase portal path key. Six current source slugs contain uppercase letters, so the portal key and provider path intentionally differ. Lowercase collisions abort the whole update.

`embedUrl` and `affiliateUrl` retain the original host, case-sensitive path, non-CLID query tokens/values and fragment. Only the CLID parameter is replaced/appended. It is set exactly once to `p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92`. URLs are never rebuilt from the lowercase portal slug.

The runtime excludes the full image list, videos, raw response paths, duplicated metadata and other unused candidate fields. Each game is serialized on one JSON line, and games are sorted by stable provider ID, so metadata edits produce focused Git diffs. Changing feed rank alone does not reorder the runtime.

## Native language and genre treatment

Original language codes are preserved in `languages`. `locales` deduplicates their BCP 47 base languages. Portuguese variants therefore share one `pt` game route while the source variants remain visible in the original metadata.

`kr-ZZ` is held for review; equivalent case/underscore spellings are canonicalized before the quarantine check. `kr` denotes Kanuri, not Korean. `ru-KZ` is a valid declaration of Russian in Kazakhstan and is retained, normalized to `ru`, and deduplicated with `ru-RU` when both occur. A game declaring only `ru-KZ` still receives a Russian route. Malformed future language declarations are preserved in `languages` and quarantined from routes rather than guessed.

The provider does not declare the language of its scalar title/description/instruction fields or provide a locale-keyed translation map in this export. `languagePolicy.providerMetadataLanguage` remains `null`. A native game-language declaration does not make the provider description localized. Localized editorial overlays and the portal's separate quality gate determine indexability; the synchronizer does not invent translations or indexability claims.

`genreIds` is recalculated on every sync from the current major-genre `sources` lists. Matches are unioned with reviewed `genres` from `data/portal/genre-overrides.json`. The classifier does not create additional genres, silently assign an unmatched game, or discard a game because its editorial text is poor. Unmatched game IDs, if any appear later, are reported in `stats.unmappedGenreGames`.

## Change tracking, removals and unchanged runs

`sourceHash` covers the provider metadata used by the compact game record. `firstSeenAt` is preserved by provider ID. `changedAt` advances only when that normalized game changes, including a changed portal genre classification or reappearance after being unlisted.

The snapshot content hash excludes observation timestamps and feed order. If semantic content, tombstones and the original source ID inventory are unchanged, **neither accepted data file is written**. This avoids timestamp-only commits and preserves file modification times. The JSON log still reports the new `checkedAt`; persisted `snapshot.fetchedAt` denotes the provider snapshot underlying the last accepted content, not the time of every no-op check. A policy-only normalization preserves that provider observation time.

Only after a completely successful collection can a previously listed provider ID be removed from active `games`. Its history is retained in `sync-state.json` as a tombstone with status `unlisted-from-complete-provider-snapshot`, its prior identity/timestamps/hash, and the new `unlistedAt`. This does not assert deletion: the provider exposes no active/deleted flag, so tombstones retain `providerDeleted: null`.

If a game returns, its tombstone is removed and its original `firstSeenAt` is restored. Invalid, incomplete, empty, rate-limited or duplicate responses never generate removal tombstones.

## File replacement and recovery

Both new files are staged beside their destinations, written fully and fsynced before replacement. Each destination is then replaced with an atomic rename. A caught second-file failure rolls back the earlier replacement; a failed rollback is reported honestly rather than claiming the old catalog was retained.

Two separate filesystem renames are not a single crash-atomic transaction. A process interruption between them can leave different generations. The next run detects the hash mismatch and stops. Restore **both** `data/portal/catalog.json` and `data/portal/sync-state.json` from the same last accepted repository revision before retrying; do not repair a mismatch by deleting just one file or fabricating history. No automatic deletion or recovery of accepted history occurs.

## Verification completed

The initial complete candidate generated 2,846 runtime records successfully. A subsequent real 29-page fetch also completed with stable totals and detected the single real thumbnail update described above. A read-only audit verified all 18 fields on every record, all lowercase route keys, all 2,846 genre assignments, 22 locales, 8,896 game/locale pairs, CLID uniqueness and matching state/runtime content hashes.

The retained source inventory was also checked against the original 29-page API input and all 2,846 runtime provider IDs. Adding `sourceProviderIds` to state preserved the accepted runtime bytes, `fetchedAt` and content hash; it did not represent another live collection.

Seventeen focused fixture checks passed in temporary directories: repeat/reordered-content idempotence; changedAt behavior; removal and reappearance history; lowercase collisions; duplicate/empty snapshots; exact URL/query/fragment retention; language quarantine including spelling variants; no retry after 429; bounded 503 retries; changing totals; byte-and-mtime preservation for no-ops; preservation of both files on invalid/partial/duplicate/rate-limited collection; malformed provider-ID rejection; mixed-generation rejection; stale-archive rollback rejection; and retention of a Russian route for a game declaring only `ru-KZ`. Actual runtime files were never altered by destructive/removal fixtures.

After the real thumbnail update and final read-only audit, runtime data was frozen for the final portal build. This documentation cleanup did not re-query the live API or modify either accepted data file. Local checks do not constitute deployment: the unified portal is still undeployed, and periodic synchronization remains inactive before the prepared workflow reaches the default branch.
