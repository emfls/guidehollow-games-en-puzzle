# Complete Game Discovery Implementation Plan

> Implement inline using the existing checkout and existing tests.

**Goal:** Expose all games by default and make native support, navigation and pagination unambiguous.
**Architecture:** Keep native language eligibility separate from browse collections. Extend the existing client search catalog for the optional native filter; retain server-rendered global lists.
**Tech Stack:** Astro, Node 24, vanilla JS/CSS, JSDOM.
**Spec:** ../specs/2026-11-08-catalog-discovery-design.md

## Global Constraints
- Preserve exact provider embed/affiliate URLs and CLID.
- Keep unsupported detail routes absent and existing editorial noindex gates.
- No new dependencies, accounts, hosting projects or paid services.
- Remain below 20,000 deployment files.

## Review Focus
- Games lacking English must use their actual supported locale.
- Empty native filters must show zero results without broken pagination.
- Native filter paging and browser Back must preserve scope.
- Saved games must remain accessible across interface languages.
- The last page must expose every catalog ID exactly once.

## Tasks
- [x] Reproduce 165-game limitation and add a failing global-discovery test.
- [x] Update catalog routes, card destinations and full search JSON; assert native eligibility separately.
- [x] Replace discovery shelves with one grid, visible language filter, item ranges and explicit pagination gaps.
- [x] Update the client filter, search and history behavior; add JSDOM checks.
- [x] Replace portal CSS and inspect desktop/mobile, Arabic RTL, detail and search.
- [x] Run full static verification, localization, DOM tests and IndexNow dry-run.
- [ ] Push a reviewable PR, deploy the authorized website changes after passing checks, and verify the live fingerprint.
