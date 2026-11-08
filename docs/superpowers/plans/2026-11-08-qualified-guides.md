# Qualified multilingual guide rollout plan

**Goal:** Fill game-specific localized descriptions/instructions and progressively expand search-eligible pages beyond206.
**Architecture:** Shared source parsing and qualification helpers; source/text-hashed guide batches; current static renderer and sitemap; early deployment-file guard.
**Spec:** docs/superpowers/specs/2026-11-08-qualified-guides-design.md

- [x] Extract dependency-free provider text/language/control helpers. Add source-reviewed record validation and strict source-original checks. Reject stale, unsupported-evidence, wrong-language, duplicated, contradictory and incomplete candidates. Test each failure mode.
- [x] Add reviewed locale batches and first-six Korean seeds; verify exact source excerpts and hashes. Preserve known source conflicts as HOLD and report untranslated/incomplete records by language.
- [x] Share qualification across guide lookup, title precedence, clean URLs, game routes, alternates, directories, sitemap and IndexNow. Preserve actual native support. Test qualified unsupported guide vs unqualified player fallback.
- [x] Add a pre-generation file-budget guard and complete generated/public SEO verification. Run build, discovery, localization, translation, detailed-content and client tests. Obtain independent review.
- [x] Deploy qualified changes after preview/CI passes, verify exact public build and native/non-native localized pages, notify only changed eligible URLs, and save accurate ready/held counts. No recurring automation.

First release PR12 is public: 974 qualified game/language pages, 1,343 sitemap URLs, 17,531 files. Production build f38331f3bfd7411fbe113389ef65afad562fdaa54f94534cdb909dbb3cc37782 verified with preview=false. Main CI and Cloudflare passed; IndexNow run42492494924 confirmed1,343 submissions, HTTP200, buildVerified=true.

The completed expanded batch reviewed1,544 selected game/locale references:1,525 saved and19 held. An additional10 English rewrites safely omit non-core provider-copy issues. Independent parser review confirms no lost genuine named keys and correct removal of12 UI/title/verb false positives; all84 added keys in77games were source-checked. Full local production validation confirms2,302 qualified game/language pages,2,671 sitemap URLs,17,478 HTML pages and17,531 deploy files. Public build-info and confirmed IndexNow receipts identify the deployed snapshot separately from these local counts. Content eligibility is not proof of crawl, indexing, ranking, all-game execution or revenue attribution.
