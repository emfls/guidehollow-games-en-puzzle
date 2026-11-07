# Catalog provenance

Catalog checked on 2026-11-07 using the public Playgama partner catalog. Public application code identifies the export request below; no account cookies, private credentials or API secrets were used for the catalog download.

```
POST https://widgets.playgama.com/api/v1/partner/export/catalogue/games
Content-Type: application/json

{"pagination":{"limit":100,"offset":0},"filters":{"interests":["puzzle"]},"sort":{"type":"ranking_default"}}
```

The same request was made for racing, sports and arcade. Forty games were curated for the initial four English sites. Provider titles, game links, preview images, device lists, screen orientation and supported languages are retained. Editorial introductions and instructions were rewritten from the provider's descriptions and control instructions; they do not claim firsthand gameplay, ratings, verified performance or independent reviews.

The public application references these endpoints and metadata sources:

- https://widgets.playgama.com/static/assets/index-BMvEMxuF.js
- https://widgets.playgama.com/static/assets/types-B2ZHmZ7x.js
- https://widgets.playgama.com/api/v1/partner/export/catalogue/filters
- https://widgets.playgama.com/api/v1/partner/export/catalogue/sort

The account-specific publisher CLID was copied from the signed-in catalog's visible embed link and attached to the unmodified provider export and affiliate URLs. Images remain served by the provider; game software is not copied into this repository.

## Broad-genre expansion

The same primary catalog endpoint supplies the twelve additional English collections. The completed catalog contains 160 distinct games: 40 from the four published collections and 120 from the twelve additional collections, with ten games per broad genre. All 160 entries were compared against their primary provider records on 2026-11-07. Requests use the real provider category slugs recorded in `data/genre-groups.json`; the broad grouping is an editorial organization of those categories. Audience, engine and device tags are not deployment targets.

Each expansion batch records its selections and source requests in `data/expansion-*.json`. `scripts/merge-editorial-batches.mjs` requires ten distinct games per selection, native English support, actual category membership and exactly one publisher CLID. It also rejects a game being selected for two English genre sites.

The compact `data/provider-evidence.json` preserves the selected games' original export URLs, catalog page URLs, titles, image URLs, category lists, supported languages, device lists and orientation. `scripts/snapshot-provider-evidence.mjs` compares the curated catalog against the downloaded primary records before writing that evidence. The full provider descriptions and raw catalog downloads are not committed. Game guides are original editorial text derived from each game's supplied description and controls.

Metadata verification does not establish that every embedded game has been manually played. A successful static build establishes page generation and the checks listed in the verification report; live domain, certificate and search-submission checks remain separate rollout steps.
