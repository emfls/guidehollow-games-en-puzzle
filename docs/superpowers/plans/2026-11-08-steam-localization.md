# Steam catalog and localization implementation plan

**Goal:** Restore Steam-inspired presentation and consistently localized discovery/player UI.
**Architecture:** Existing Astro static renderer and dependency-free DOM client; saved per-locale provider translations and one noindex player shell per UI locale.
**Spec:** docs/superpowers/specs/2026-11-08-steam-localization-design.md

## Tasks

- [x] Add source-hashed localization data and bounded/resumable translation sync. Keep manual/guide translations first. Test missing/stale records and all current game/locale coverage. Include the saved data in build fingerprints and daily catalog maintenance.
- [x] Preserve UI language for unsupported game links with noindex locale player shells. Populate from trusted same-origin catalog records, retain CLID and explicit-play loading. Test invalid IDs, fetch failure, favorites/recent/share and language switches.
- [x] Apply navy/blue-gray/cyan library styling and a wide compact feature using existing game art, with localized copy. Preserve one complete grid, filters, pagination and guide links. Verify desktop/mobile/RTL screenshots before and after.
- [ ] Run full build/static verification, discovery/localization/client checks and IndexNow dry-run. Obtain independent review, fix findings, create/merge PR and verify exact public build before notifying changed eligible URLs.

## Review focus

No invented native game support; no unvalidated iframe URLs; no auto-loading advertisements; no mixed-language fallback in visible summaries; no stale translation after provider updates; no change to authored-guide indexing gates; stay under 20,000 deployed files.

## Execution record

- Native/unsupported UI language paths implemented and discovery check passed.
- Interim full build:17324 HTML files,17377 deploy files,575 indexable URLs,206 guides,zero static errors.
- Interim client check:21 scenarios,251 assertions,zero prohibited network attempts.
- Local desktop1440/mobile390/RTL1440 checked; no horizontal overflow.
- Translation provider returned429; saved progress retained, waited10 minutes, reduced to1 request worker with900ms inter-batch delay.
- Quality repair detects unchanged English paragraphs, unexpected Cyrillic and missing target scripts; retry individual source text with language detection, then use truthful localized genre/device facts if the service still returns source text.
- Reviewer findings fixed:machine-translation disclosure on native details; untranslated controls link to the attributed original instead of claiming the provider omitted controls.
- Operational limit:large failed hosted translation runs require a candidate cache once updates exceed the15-minute workflow budget; current daily job fails closed and preserves the deployed catalog.

- Provider remained429 after10-minute cooldown. Stop further online requests. Fill remaining data locally using pinned MIT M2M100/CTranslate2 model; no paid API or repository runtime dependency added.

- Local completion uses one bounded CPU translator; low-resource summary failures use localized genre/device facts. Model binaries stay outside the repository. Reviewed display titles repair obvious English retention and unknown model tokens.
- Final code review: no blockers in CLID/origin validation, explicit Play, locale-preserving routes, stale-source rejection and coverage guards.

- Final local validation passed:59,766 source-matched pairs;17,324 HTML pages;17,377 deploy files;575 indexable URLs;206 guides reachable in two indexable clicks;21 client scenarios and254 assertions;575-URL IndexNow dry-run. Public release pending.
