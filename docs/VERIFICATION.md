> Historical per-genre rollout record. The current architecture is the single multilingual portal in [PORTAL_DEPLOYMENT.md](PORTAL_DEPLOYMENT.md). No additional genre repositories or DNS records will be created.

# Verification record — broad English genres

Verified locally on **2026-11-07T15:09:57.341Z**. This record distinguishes source/build verification from public deployment.

## Results

- **16 English collections**, ten games each, **160 distinct English game selections**. The selected English IDs do not overlap across genres.
- **160 catalog records** matched the primary provider snapshot for native language support, categories, export and catalog URLs, supplied images, device support and orientation. Both public publisher URLs preserve exactly one configured CLID.
- **16 sequential Astro preview builds passed**: **208 normal page routes** in total, plus a custom 404 for each site. Each collection has a home page, ten game pages, an about page and a privacy page.
- The page checks cover static routes, language, canonical host, title and description presence, game/breadcrumb structured data, sitemap count, public IndexNow key files and lazy game iframe loading.
- Preview pages carry `noindex`; preview robots disallows crawling; the notifier rejects preview mode before network access. Only the four already published sites are active in the shared rollout data.

| Collection | Games | Normal page routes | Local preview build | Publication |
| --- | ---: | ---: | --- | --- |
| en-puzzle | 10 | 13 | Passed | Published |
| en-racing | 10 | 13 | Passed | Published |
| en-sports | 10 | 13 | Passed | Published |
| en-arcade | 10 | 13 | Passed | Published |
| en-action | 10 | 13 | Passed | Prepared; not published |
| en-adventure | 10 | 13 | Passed | Prepared; not published |
| en-strategy | 10 | 13 | Passed | Prepared; not published |
| en-simulation | 10 | 13 | Passed | Prepared; not published |
| en-horror | 10 | 13 | Passed | Prepared; not published |
| en-shooting | 10 | 13 | Passed | Prepared; not published |
| en-rpg | 10 | 13 | Passed | Prepared; not published |
| en-platform | 10 | 13 | Passed | Prepared; not published |
| en-idle | 10 | 13 | Passed | Prepared; not published |
| en-card-board | 10 | 13 | Passed | Prepared; not published |
| en-multiplayer | 10 | 13 | Passed | Prepared; not published |
| en-creative | 10 | 13 | Passed | Prepared; not published |

## Same-language genre navigation

The four published sites received the shared header Genres menu and footer links. Each of their production builds passed, and public HTML was checked for ordinary links to all four English homes. Their successful Pages deployments are recorded in these Actions runs:

- [Puzzle](https://github.com/emfls/guidehollow-games-en-puzzle/actions/runs/42383483040)
- [Racing](https://github.com/emfls/guidehollow-games-en-racing/actions/runs/42383492770)
- [Sports](https://github.com/emfls/guidehollow-games-en-sports/actions/runs/42383501094)
- [Arcade](https://github.com/emfls/guidehollow-games-en-arcade/actions/runs/42383510265)

A separate read-only renderer check covered 50 pages, including inputs with active English, Korean and Japanese sites. Header and footer genre links selected only active sites in the current language. The current collection was marked exactly once in the header. Home, game, about, privacy and 404 pages used the same genre navigation. Mobile width constraints were reviewed in CSS; the new menu has not received an additional visual browser measurement.

## Editorial review

All 120 additional game guides were written from each provider description and control instructions. An independent comparison of twelve guides across shooting, simulation, horror and RPG found one camera-control phrase not explicitly stated by the provider; it was removed from both the final catalog and its reproducible import batch before these builds. This sample review is not a claim that every game was manually played.

## Remaining external steps

The twelve additional repositories, Gabia DNS records, Pages deployments, HTTPS enforcement, Google sitemap submissions and Naver IndexNow notifications have **not** been completed. Their actual status is tracked in `data/deployment-queue.json`. The connected browser reported that its originating browser context was unavailable; the GitHub connector can preserve and verify this source branch but does not provide repository creation or the DNS/Search Console controls required for the rest of this rollout.

The existing four sites remain publicly available. A successful preview does not make an additional host public. At publication, add a new host to navigation in the other repositories only after its live HTTPS checks pass.

## Reproduce

```sh
npm ci
npm run build:genres
```

The verification workflow runs the same sequential build from the committed source and saves the preview output and machine-readable report as a GitHub Actions artifact. Primary metadata and source-request provenance are in `data/provider-evidence.json`, `data/expansion-sources.json` and `docs/CATALOG_SOURCES.md`.
