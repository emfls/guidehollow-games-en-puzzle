> Historical per-genre rollout record. The current architecture is the single multilingual portal in [PORTAL_DEPLOYMENT.md](PORTAL_DEPLOYMENT.md). No additional genre repositories or DNS records will be created.

# Broad English genre expansion

The approved grouping is **16 broad English game sites**, including the four already published sites. The provider's 197 category links are not 197 deployment targets. Detailed types such as zombies, cars, mahjong, cooking and dress-up stay inside the relevant broad collections.

## Sites

| Broad genre | Site | Provider types grouped within the site | Publication status |
| --- | --- | --- | --- |
| Puzzle | en-puzzle.guidehollow.com | Logic, number, matching, word and bubble puzzles | Published |
| Racing | en-racing.guidehollow.com | Car racing, motorcycles, drifting and driving challenges | Published |
| Sports | en-sports.guidehollow.com | Football, basketball, golf, bowling and other sports | Published |
| Arcade | en-arcade.guidehollow.com | Short action loops, reactions, timing and skill challenges | Published |
| Action | en-action.guidehollow.com | Action, fighting and movement-focused encounters | Prepared separately; not yet published |
| Adventure | en-adventure.guidehollow.com | Exploration, stories, escape and hidden-object adventures | Prepared separately; not yet published |
| Strategy | en-strategy.guidehollow.com | Resource decisions, tactics and tower defense | Prepared separately; not yet published |
| Simulation | en-simulation.guidehollow.com | Roles, jobs, vehicles, businesses and simulated activities | Prepared separately; not yet published |
| Horror | en-horror.guidehollow.com | Tense exploration, frightening scenes and horror escape | Prepared separately; not yet published |
| Shooting | en-shooting.guidehollow.com | Aiming, guns, precision and shooting encounters | Prepared separately; not yet published |
| RPG | en-rpg.guidehollow.com | Character development, role-playing and progression | Prepared separately; not yet published |
| Platformers | en-platform.guidehollow.com | Jumping, navigating obstacles, obby and parkour | Prepared separately; not yet published |
| Idle & Clicker | en-idle.guidehollow.com | Incremental growth, clickers, upgrades and tycoons | Prepared separately; not yet published |
| Card & Board | en-card-board.guidehollow.com | Cards, solitaire, boards, chess and related rulesets | Prepared separately; not yet published |
| Multiplayer | en-multiplayer.guidehollow.com | Online, shared-device and cooperative games, as actually supported | Prepared separately; not yet published |
| Dress Up & Creative | en-creative.guidehollow.com | Styling, dress-up, drawing and decoration | Prepared separately; not yet published |

These are editorial groupings of Playgama's real metadata, not a claim that Playgama publishes an official list of exactly 16 genres. The mapping is in `data/genre-groups.json`. Provider audience, device and engine tags are not separate site deployments. Games can be filtered by their real detailed categories within each collection.

## Navigation between genre sites

Every page has a native expandable **Genres** menu in the header and links to other genre sites in the footer. Both use only active sites with the same locale as the current site. The header includes the current collection with a current-state marker; the footer links to the other collections. Links are ordinary crawlable anchors and work without JavaScript. Keyboard users can open the native menu with Enter/Space; Escape closes it and returns focus to its summary.

The four published English sites received this navigation on 2026-11-07. All four Actions deployments completed successfully, and their public HTML was checked for the four exact English home URLs. The additional twelve hosts join the same navigation when their actual publication status is activated consistently across the repositories.

## Quality and language rules

- Every selected game must list native English support in the provider data.
- English editorial introductions and controls are written for each game from the provider's description and control instructions. No firsthand-play claims, invented ratings or invented player counts are added.
- Each English game ID belongs to one of the 16 collections. The merger rejects duplicate English selections across sites, avoiding repeated game pages on multiple English subdomains.
- All provider export hosts and existing URL parameters are preserved. Exactly one publisher CLID is required on each embed and fallback URL.
- All twelve new sites remain inactive in the shared rollout configuration. Inactive hosts do not appear in public navigation or hreflang. At first publication, activate the target only in its own repository after repository and domain setup; add it to the other published repositories only after its live HTTPS checks pass.

## Build the full set for review

All 16 collections and 160 game pages passed the local build and metadata checks. See [the verification record](VERIFICATION.md) for the checked scope, live navigation deployments and remaining external steps.

```sh
npm ci
node scripts/configure-major-genres.mjs
node scripts/merge-editorial-batches.mjs
npm run build:genres
```

The committed selection files make the full-set build reproducible without downloading the provider catalog. The compact primary metadata snapshot is in `data/provider-evidence.json`; provenance and its validation procedure are described in `docs/CATALOG_SOURCES.md`.

The full-set command builds sequentially because Astro's public asset preparation uses a shared temporary directory. It creates `dist-preview/en-<genre>/` and `release-manifests/major-genres-build.json`. These are previews: every page is marked `noindex`, robots disallows crawling, and the notification script refuses IndexNow submissions in preview mode.

A production build still requires the selected site's `active` flag. The regular Pages workflow does not set preview mode. Creating a preview is not recorded as creating a repository, changing DNS or deploying a live site.

## Publication order and rate limits

Use the 12 entries in `data/deployment-queue.json` as the remaining work list. The queue records actual progress rather than assuming that preparing code completed external setup.

1. Inspect existing Gabia records and register the missing twelve CNAME records first, while the user's DNS session is available. Preserve unrelated records. The prepared values are in `docs/new-genre-dns-records.tsv`.
2. Inspect the current GitHub account state and create repositories serially, with a README commit to initialize `main`.
3. Prepare the matching `deployment.json`, enable Actions publishing, and set the exact custom host.
4. Activate the target site only in that new repository's configuration, publish the verified source, wait for the real Pages result, and enable Enforce HTTPS after certificate provisioning. Other published repositories still link only to previously verified live hosts during this first deployment.
5. Verify the public home, key file, sitemap and game detail pages before recording the site as live.
6. Submit its sitemap in the existing verified `guidehollow.com` Google Domain property. Record Google's actual fetch/discovery result.
7. Send IndexNow only after the live key is verified. Record the response separately from deployment. HTTP 200 is receipt, not proof of indexing.
8. Update active-site navigation consistently after a batch is actually live.

No fixed safe repository count per day is asserted. GitHub states that secondary content-creation limits may differ by endpoint and may be undisclosed. Stop on a real limit response and follow its retry guidance; do not rotate accounts or try another channel to evade it.

## Sources

- https://playgama.com/all/categories
- https://wiki.playgama.com/playgama/for-partners/import-the-game-catalog
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- https://support.google.com/webmasters/answer/7451001
- https://searchadvisor.naver.com/guide/indexnow-request
