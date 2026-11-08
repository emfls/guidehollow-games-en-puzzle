# Qualified multilingual guide rollout plan

**Goal:** Fill game-specific localized descriptions/instructions and progressively expand search-eligible pages beyond206.
**Architecture:** Shared source parsing and qualification helpers; source/text-hashed guide batches; current static renderer and sitemap; early deployment-file guard.
**Spec:** docs/superpowers/specs/2026-11-08-qualified-guides-design.md

- [ ] Extract dependency-free provider text/language/control helpers. Add source-reviewed record validation and strict source-original checks. Reject stale, unsupported-evidence, wrong-language, duplicated, contradictory and incomplete candidates. Test each failure mode.
- [ ] Add reviewed locale batches and first-six Korean seeds; verify exact source excerpts and hashes. Preserve known source conflicts as HOLD and report untranslated/incomplete records by language.
- [ ] Share qualification across guide lookup, title precedence, clean URLs, game routes, alternates, directories, sitemap and IndexNow. Preserve actual native support. Test qualified unsupported guide vs unqualified player fallback.
- [ ] Add a pre-generation file-budget guard and complete generated/public SEO verification. Run build, discovery, localization, translation, detailed-content and client tests. Obtain independent review.
- [ ] Deploy qualified changes after preview/CI passes, verify exact public build and native/non-native localized pages, notify only changed eligible URLs, and save accurate ready/held counts. No recurring automation.
