# Unified portal: Playgama partner catalog findings

## Accepted snapshot and release status

The repository-retained [runtime catalog](../data/portal/catalog.json) contains **2,846 games**, with **2,846 unique provider IDs**, **22 base-language locales**, and **8,896 native game/locale pairs**. The [synchronization state](../data/portal/sync-state.json) records the matching accepted snapshot and the complete `sourceProviderIds` set. These two files are the evidence for the current runtime. The unified portal is **not deployed**, and periodic synchronization is **not active** because its workflow has not reached the default branch. Existing genre-site deployments remain separate from this prepared portal.

The initial collection and the accepted runtime are different observations:

| Observation | Time | Identifier and meaning |
|---|---|---|
| Initial full collection started | `2026-11-07T15:14:44.664939+00:00` | Start of the historical collection audit below |
| Initial full collection completed | `2026-11-07T15:15:50.084520+00:00` | Initial candidate identifier: `2e0677cfe339e49537c41f07282ada739072fb17e26193ab5ec27c5119ff8ec7` |
| Final accepted runtime snapshot | `2026-11-07T15:33:08.103Z` | Accepted normalized-content hash: `2ba4b81eb1e8e6c3515c157a33501c417735f9b7e9e09d757670c44cddedcd4f` |

The final time and hash appear in both `catalog.json.snapshot` and `sync-state.json.lastAcceptedSnapshot`. The initial candidate identifier belongs to an intermediate representation and must not be substituted for the accepted runtime hash. The later accepted collection included a real thumbnail change to `police-chase-car-crash-3d`; see [PORTAL_SYNC.md](PORTAL_SYNC.md).

The initial audit used 29 requests: offsets 0 through 2,800 in batches of 100; the last response contained 46 games. Every response reported `totalCount: 2846`, with no duplicate provider IDs or slugs. `data/raw/` and `data/portal-provider-catalog.json` were intermediate collection artifacts and are excluded from Git. They are not repository evidence links or required inputs for a normal build/CI verification. Historical field-level observations below describe that collection; current totals, language policy and classifications are available in the retained runtime.

`sync-state.json.sourceProviderIds` preserves **2,846 unique string IDs extracted directly from the raw API input before transformation**. It is not reconstructed from the resulting runtime. The CI verifier compares this complete source set with every runtime `providerId`, checks counts against both accepted snapshots and runtime statistics, and compares the accepted content hashes. This detects an accidental game-count cap or omission without retaining a second 11.7 MB full candidate.

The completeness claim is limited to the observed public partner export, not every game on Playgama's consumer website. Only catalog metadata and public documentation/application code were collected. No game software, game asset archive, credentials, account session, or game iframe was downloaded or inspected. All 160 games in the existing curated catalog were present in the full export; missing curated IDs: `[]`.

## Verified request and provenance

The official [Import the Game Catalog guide](https://wiki.playgama.com/playgama/for-partners/import-the-game-catalog) directs partners to widgets.playgama.com, describes full JSON export, and identifies `gameURL` as the iframe source. It also explains that signed-out exports omit the publisher's CLID. The known public application uses the following request:

```http
POST https://widgets.playgama.com/api/v1/partner/export/catalogue/games
Content-Type: application/json
```

```json
{"pagination":{"limit":100,"offset":0},"filters":{},"sort":{"type":"ranking_default"}}
```

The endpoint is explicitly present in the [public type bundle](https://widgets.playgama.com/static/assets/types-B2ZHmZ7x.js). The [public application bundle](https://widgets.playgama.com/static/assets/index-BMvEMxuF.js) constructs POST bodies from pagination plus filters/sort or selected slugs, and its full-download routine traverses pages. This collection followed that observed interface with three concurrent requests at most. It did not probe guessed endpoints or parameters.

Also observed during the initial collection:

- [Catalog filters](https://widgets.playgama.com/api/v1/partner/export/catalogue/filters).
- [Catalog sort options](https://widgets.playgama.com/api/v1/partner/export/catalogue/sort). The advertised sort IDs were `ranking_default` and `created_at`; a sort name is not a per-game update timestamp or a delta-feed contract.
- The separate [API reference page](https://playgama.com/partners-api) documents the legacy `GET /api/v1/games/export-list` interface with page/pageSize/clid/category. Earlier work observed that route returning 404. This run used the working widget exporter above; it did not retry or guess alternatives to the legacy route.

The raw responses and downloaded public-reference copies were temporary collection material under `data/raw/`; they are not included in a repository checkout. The links above identify the observed official sources. This documentation cleanup did not re-query them.

## Actual schema and localization limits

Every game had the same observed field set. The following types were measured across the full snapshot:

| Provider field | Observed types and record counts |
|---|---|
| `description` | str: 2,846 |
| `gameURL` | str: 2,846 |
| `gender` | list: 2,846 |
| `genres` | list: 2,846 |
| `howToPlayText` | str: 2,846 |
| `id` | str: 2,846 |
| `images` | list: 2,846 |
| `inGamePurchases` | str: 2,846 |
| `mobileReady` | list: 2,846 |
| `playgamaGameUrl` | str: 2,846 |
| `screenOrientation` | dict: 2,846 |
| `slug` | str: 2,846 |
| `supportedLanguages` | list: 2,846 |
| `tags` | list: 2,846 |
| `title` | str: 2,846 |
| `videos` | list: 2,846 |

**No locale-keyed title, description, instructions, translation map, metadata-language identifier, active/deleted marker, or update timestamp was present in any of the 2,846 game records.** `title`, `description`, and `howToPlayText` are scalar strings on every record.

The public application maps those scalar text fields directly into its game model. Its `supportedLanguages` filter selects games by native language availability; the observed request builder has no metadata-locale argument. The official import guide describes a single title/description payload, and the public API reference does not document a metadata-localization parameter. These observations establish the limits of this export; they do not prove that Playgama has no other translated metadata internally or in another service.

Do not use `supportedLanguages` to label the provider's description as translated. The text is largely English, but the feed does not declare its metadata language. The initial script-presence scan found Cyrillic characters in 18 descriptions/instructions, Han characters in one, and kana in two; these counts indicate review candidates, not reliable language detection. The retained runtime therefore has `languagePolicy.providerMetadataLanguage: null` and `localizedProviderMetadataObserved: false`. The intermediate candidate's empty translation map is not a translated content source. An English paragraph must not be presented as a Korean or Japanese paragraph merely because the game supports those languages.

The filters endpoint advertises only nine language options (English, German, Spanish, French, Indonesian, Italian, Polish, Portuguese and Turkish), while actual game records contain 25 distinct codes. **Derive portal locale eligibility from each game's `supportedLanguages`, not from the limited filter menu.**

## Native language counts and route normalization

There are **8,904 raw native-code/game pairs**. After base-language deduplication and the quarantine below, there are **8,896 native base-language/game pairs across 22 languages**. Every game has at least one retained language. These are counts of provider declarations, not language completeness or manual gameplay verification.

### Original provider codes

| Native code | Games |
|---|---:|
| `ar-EG` | 135 |
| `az-AZ` | 34 |
| `de-DE` | 586 |
| `en-US` | 2,843 |
| `es-ES` | 655 |
| `fr-FR` | 496 |
| `hi-IN` | 106 |
| `id-ID` | 220 |
| `it-IT` | 367 |
| `ja-JP` | 233 |
| `kk-KZ` | 37 |
| `ko-KR` | 165 |
| `kr-ZZ` | 1 |
| `nl-NL` | 89 |
| `pl-PL` | 182 |
| `pt-BR` | 65 |
| `pt-PT` | 418 |
| `ru-KZ` | 1 |
| `ru-RU` | 1,186 |
| `th-TH` | 88 |
| `tr-TR` | 542 |
| `uk-UA` | 87 |
| `uz-UZ` | 38 |
| `vi-VN` | 130 |
| `zh-CN` | 200 |

### Base-language routes

| Route locale | Games |
|---|---:|
| `ar` | 135 |
| `az` | 34 |
| `de` | 586 |
| `en` | 2,843 |
| `es` | 655 |
| `fr` | 496 |
| `hi` | 106 |
| `id` | 220 |
| `it` | 367 |
| `ja` | 233 |
| `kk` | 37 |
| `ko` | 165 |
| `nl` | 89 |
| `pl` | 182 |
| `pt` | 477 |
| `ru` | 1,186 |
| `th` | 88 |
| `tr` | 542 |
| `uk` | 87 |
| `uz` | 38 |
| `vi` | 130 |
| `zh` | 200 |

The `en` route must exclude the three games without an English declaration: `cannon-basket`, `trivia-millionaire`, `number-shooter-ball-blast`. All remain in the provider catalog and can appear in their declared native locales.

### Regional variants and quarantine

`pt-PT` appears on 418 games and `pt-BR` on 65; six games declare both. A neutral `/pt/` route therefore has **477 distinct games**. Original regional codes remain in each runtime game's `languages`; a Brazil-only declaration must not be relabeled as Portugal support. The intermediate candidate also carried `localeVariants`, but that derived field is not part of the compact runtime. Regional metadata, if later supplied, should retain its variant; using a base-language route does not establish that every regional variant is supported.

The [IANA language subtag registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry), saved locally with file date 2026-09-17, identifies `ko` as Korean, `kr` as Kanuri, `ru` as Russian, `kk` as Kazakh, `KZ` as Kazakhstan, and `ZZ` as a private-use region. Both unusual declarations have syntactically registered components; neither should be silently corrected into another language.

| Quarantined code | Games | Affected slug | Handling |
|---|---:|---|---|
| `kr-ZZ` | 1 | `echolocation-shooter` | Registered BCP 47 components mean Kanuri (kr) with private-use region ZZ, not Korean (ko). Unexpected provider declaration; quarantined pending clarification. |

The same game also declares `ru-KZ`. This is a valid Russian-in-Kazakhstan declaration and the accepted runtime retains it as `ru`, deduplicating it with `ru-RU` when both occur. A game with only `ru-KZ` must still receive a Russian route. Only `kr-ZZ` remains held for review; it must not add a Korean route. The initial intermediate candidate had flagged both codes conservatively. The retained runtime's original `languages` and corrected `languagePolicy` are the current evidence; see [PORTAL_SYNC.md](PORTAL_SYNC.md). The deduplicated total remains 8,896 pairs.

## Sixteen-genre coverage

The accepted runtime uses the expanded [genre source mapping](../data/genre-groups.json) and five reviewed [genre overrides](../data/portal/genre-overrides.json), covering all 2,846 games. The following counts come from `catalog.json.stats.genreCoverage`. Source-category matches are combined with reviewed overrides. This is a browsing classification, not duplicated play-page ownership; one game can appear in several genre lists while retaining one `/{locale}/play/{slug}/` page.

| Broad genre | Matching games |
|---|---:|
| `puzzle` | 1,036 |
| `racing` | 228 |
| `sports` | 85 |
| `arcade` | 1,028 |
| `action` | 514 |
| `adventure` | 502 |
| `strategy` | 411 |
| `simulation` | 580 |
| `horror` | 133 |
| `shooting` | 258 |
| `rpg` | 78 |
| `platform` | 346 |
| `idle` | 294 |
| `card-board` | 119 |
| `multiplayer` | 224 |
| `creative` | 193 |

At the initial collection audit, the older mapping covered **2,756 games** and left **90 unmapped**. Their most frequent categories included merge, matching, mobile, funny, color, kids, cozy, ragdoll, animals, blocks, trivia and quiz. That historical gap was resolved by expanding internal source mappings and applying the reviewed overrides, without adding a seventeenth genre. The accepted runtime now has `stats.unmappedGenreGames: []`. A future unmatched game must remain available through all-games/search and be reported for classification; it must not be silently dropped.

There are **349 nonempty broad-genre/base-language combinations** under the accepted mapping. With the current 24-game page size, the route generator produces:

| Route type | Pages |
|---|---:|
| Language selector | 1 |
| Paginated language catalogs | 381 |
| Paginated genre catalogs | 1,005 |
| Game/locale pages | 8,896 |
| About, privacy and search utility pages | 66 |
| Total declared routes | 10,349 |

These are local route-generation counts from [portal/catalog.mjs](../portal/catalog.mjs), not a claim of live deployment. The separate `404.html` adds one HTML file. Sitemaps, assets, search data and other non-HTML files are additional deployment files. Earlier planning estimates used the initial mapping and are superseded by these counts. There is no separate game page for each genre membership.

## URL, identity and device integrity

- Every original `gameURL` uses HTTPS. 2,830 use `playgama.com`; 16 use distinct provider hosts. Those hosts and paths are preserved rather than reconstructed from slugs.
- Original export URLs contained no query strings in this snapshot. The normalizer still parses the URL and preserves all existing non-CLID query tokens/values and the fragment, then inserts exactly one publisher `clid` with value `p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92`. It applies the same rule to `playgamaGameUrl`.
- The temporary full candidate retained `source.originalGameUrl` and `source.originalAffiliateUrl` for direct comparison. The compact repository runtime omits that duplicate source object; its `embedUrl` and `affiliateUrl` preserve the original URL components with the publisher CLID applied.
- Provider IDs and slugs are both unique. Six slugs contain uppercase letters: `Italian-brainrot-hunting-3D`, `Ball-bounce-try-it`, `Orbadrone-robot-escape`, `Super-Frog-Adventure`, `Shopping-simulator`, `Soccer-training`. These are valid case-sensitive URL paths, not malformed URLs. Allow them or derive a separate portal route slug; never lowercase the provider embed URL. Keep provider ID as the durable synchronization identity if a slug changes.
- Device lists remain provider-declared: Desktop 2,840; Android 2,740; iOS 2,663. Do not promise desktop support for the six mobile-only entries.
- Orientation is landscape-only for 1,110 games, portrait-only for 663, and both for 1,072. The initial provider record for `supa-tic-tac-toe` declared neither orientation; runtime `any` is a schema fallback, not evidence that both orientations were explicitly supported. Detailed candidate quality flags are not retained in the compact runtime.

## Availability, removals and periodic synchronization

The initial full export had no observed `active`, `deleted`, `status`, `updatedAt`, revision, tombstone or incremental cursor field. Absence of such fields was checked across every record, not only the first page. The temporary candidate represented unknown provider status with null fields. In the retained state, `availabilityMeaning` instead states that inclusion means the game was listed in the last accepted complete export; it does not establish a provider active/deleted status.

Raw page paths, offsets and detailed collection hashes belonged to the intermediate audit representation. The retained runtime carries per-game `sourceHash`, `firstSeenAt` and `changedAt`; the paired state carries `lastAcceptedSnapshot` and the independently extracted raw `sourceProviderIds`. The synchronizer accepts an observation only after all expected pages succeed, every page total agrees, and unique provider ID and slug counts equal the reported total. A sort option named `created_at` must not be interpreted as an exposed per-game update time.

For synchronization, repeat the full observed feed, validate it, then compare stable provider IDs and metadata hashes. Retain the previous accepted catalog when a fetch fails, totals disagree, or duplicate/missing records make the snapshot incomplete. Only a successfully completed snapshot may drive a local transition to unlisted for formerly present IDs. Such a transition is an observation that the item disappeared from the feed, not proof of the provider's deletion reason. Preserve historical identity and inspect slug changes so an update does not create duplicate canonical pages. The prepared periodic workflow is not active before it reaches the default branch; see [PORTAL_SYNC.md](PORTAL_SYNC.md).

## Editorial quality and indexing boundary

Catalog inclusion and indexability are separate. All 2,846 provider entries are included. The existing [curated editorial catalog](../data/catalog.json) remains a separately reviewed overlay and is not replaced by provider metadata.

Measured review signals include 95 descriptions shorter than 25 word tokens, 340 instructions shorter than 25 word tokens, and 13 records repeating the description as instructions. Token counting is a screening heuristic, not a universal quality rule. Nonempty text alone does not establish an indexable, localized page.

The temporary candidate's conservative quality flags are not runtime indexability fields. The portal applies its own editorial gate: provider-only pages without qualifying localized guides remain `noindex`, and their source text is identified as undetermined language rather than relabeled as a translation. Native game support controls availability; independently verified metadata/guide language and useful page content control indexing. Unsupported locales do not receive game pages, and provider-only pages stay outside indexable sitemaps until they qualify.

## Evidence and publication boundaries

The initial collection produced temporary raw responses and a full candidate; those artifacts are excluded from Git and are not needed by normal CI. The retained [runtime catalog](../data/portal/catalog.json) and [synchronization state](../data/portal/sync-state.json) provide the current accepted data, original provider ID inventory, statistics and normalization policy. Detailed initial field observations above are historical collection findings, not claims that excluded raw files are present in a checkout.

This documentation update did not fetch live data, change accepted data or code, or publish anything. The unified host remains undeployed and the scheduled workflow remains inactive before its default-branch release. Existing sites are to remain in place until the unified portal is launched and verified.
