# Featured carousel and game detail SEO implementation plan

**Goal:** Rotate recommendations and make every detail page more useful and technically consistent for search.
**Architecture:** Existing Astro renderer and DOM client, a shared source-derived detail helper, and existing locale catalogs/copies.
**Spec:** docs/superpowers/specs/2026-11-08-carousel-game-seo-design.md

- [x] Add source-confirmed detail extraction and localized labels. Test source HTML, absent instructions, false positive keys, locale fallback, authored priority and all current games/locales.
- [x] Render the same detailed sections in native pages and locale shells; preserve source attribution, CLID and explicit Play. Improve metadata, WebPage/VideoGame schema and breadcrumbs. Extend whole-build SEO verification.
- [x] Render up to six feature slides and accessible controls, preserving one static fallback. Implement a single six-second timer with interaction/visibility/reduced-motion pauses; test manual/automatic transitions, wrapping and pause/resume.
- [ ] Run build, discovery/localization/translation/client checks and IndexNow dry-run. Review independently, inspect desktop/mobile/RTL/browser timing, create/merge PR after CI/preview passes, verify public build/assets and notify changed eligible URLs.

Review focus: untrusted provider text must stay escaped; source mentions must not fabricate control semantics; unsupported UI languages must remain localized; hidden slides must be unfocusable; no timer while paused or hidden; source-derived factual additions must not silently expand indexing.

- Local validation passed:17,324 HTML pages and8,896 game routes;62,612 localized detail records;59,766 source-matched title/summary pairs;24 client scenarios and297 assertions;zero prohibited network attempts.575-URL IndexNow dry-run and206-guide discovery passed.
- Independent review fixes:require explicit Space/touch input context;classify description/instructions independently;preserve separate original-language regions;normalize provider title whitespace. Follow-up review found no blockers.
- Browser:real six-second advance observed,390px mobile controls remain on one line with reserved49px height,desktop1440 and Arabic RTL without horizontal overflow. Public release pending.
