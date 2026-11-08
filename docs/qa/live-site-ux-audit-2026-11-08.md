# GuideHollow Games live-site UX and content audit — 2026-11-08

## Observed live pages

These findings are from actual public HTML/content and metadata, not from a mocked preview.

- [Korean horror collection](https://games.guidehollow.com/ko/horror/): five Korean-supported horror games, substantial brief introduction, but `noindex,follow`. The Escape from the Crypt card initially presented its first broad category ("퍼즐"), obscuring its relationship to the horror list.
- [Korean Escape from the Crypt detail](https://games.guidehollow.com/ko/play/escape-from-the-crypt/): one useful Korean paragraph followed by a generic "full guide not ready" notice; the actual control mapping was only in a collapsed English-language original-description area.
- [English horror collection](https://games.guidehollow.com/en/horror/): 133 games. The feature, popular/new shelves, and full catalogue repeat items. The featured/current top catalogue game "Madness: Ward number 6" initially had the unhelpful card preview "In this game you are a patient of a psychiatric hospital." Other prominent entries repeated boilerplate opening lines.
- [Public build information](https://games.guidehollow.com/build-info.json): 2,846 games, 22 languages, `preview:false` at inspection.
- Examined public game detail pages for all five Korean horror games and seven English horror games, including their original provider instructions, before authoring longer guides.

A controlled graphical browser click-through / device viewport screenshot check was **not completed**: the connected browser automation lacked funds, and the user's existing browser session could not be accessed from this environment. The factual findings above are from live rendered HTML and page-extracted text/metadata, **not claims of tested taps or screenshots**.

## Changes in this PR

1. Source-grounded gameplay descriptions and usable controls for five Korean horror games: `escape-from-the-crypt`, `doodle-halloween-momo-cat--sea-magic`, `madness-online`, `crush-hour`, `1-zombie-survival`.
2. Source-grounded English descriptions and controls for seven prominent English horror titles: `madness-ward-number-6`, `dark-city-multiplayer`, `schoolboy-runaway-room-escape`, `check-wednesday-phone`, `fruitsland-escape-from-the-amusement-park`, `the-road-home-granny-escape`, `zombie-monster-survivors`.
3. Preserve existing Korean titles and 165 card summaries. The seven new English long guides now provide gameplay-specific card previews automatically through the first sentence.
4. Make larger genre collection pages use one clear, paginated, non-repeated card grid rather than repeating the same games through feature, popular, and new shelves. The multilingual home remains a discovery dashboard, but its popular shelf no longer repeats its spotlight cards.
5. On Korean horror collection, offer four play-style comparison blocks linking to the five actual titles. Label every card according to its current genre context, not just its first catalogue category.
6. Make the game detail's native-language link list a compact disclosure so gameplay instructions are not pushed down by 18–22 links, while preserving all native language destinations.
7. Raise small-screen summary readability and preserve extra lines in compact collections.
8. Permit only the fully authored five-game Korean horror collection to be indexable below the general six-game floor. The five Korean and seven English reviewed game guides are indexable under the existing editorial rules. Other incomplete content stays `noindex,follow`.

## Preserved constraints

- Do not change the Playgama `embedUrl`, partner `clid`, affiliate destinations, iframe initiation rules, provider ads, existing language support or DNS.
- No invented controls; author text based on exact provider details observed on these live games.
- Other smaller/non-reviewed collections and unreviewed game details remain `noindex,follow`. An IndexNow HTTP response is not proof of Google/Naver indexing or ranking.
- Existing English, Korean and Japanese long guides in `data/catalog.json` take precedence over supplemental guides. No unverified starting-language query parameter is appended to third-party games.
- Do not claim independently successful Playgama game execution or revenue attribution based on HTML or unit tests.

## Verification checklist

- [ ] GitHub Actions full Astro build and static route verifier pass
- [ ] Localization regression checks: 12 reviewed guides, indexed Korean horror list, genre-context labels and no duplicate English horror cards
- [ ] DOM client and IndexNow dry-run pass
- [ ] PR merge and `main` regression pass
- [ ] Check live Cloudflare build fingerprint and effective HTML after deployment
- [ ] Perform interactive mobile/desktop QA when a browser session is available
- [ ] Verify Playgama partner-account CLID ownership, attributed game plays, and revenue independently

On completion, record PR/commit/CI references and the public build fingerprint separately; a successful merge alone is not an observed deployment.
