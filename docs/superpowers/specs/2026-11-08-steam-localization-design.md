# Steam-inspired catalog and complete UI localization

The user asks to restore the Steam-inspired direction and localize game titles and descriptions in every selected UI language. Use navy backgrounds, blue-gray surfaces, cyan accents, a compact library sidebar and a wide editorial feature. Keep GuideHollow identity and existing free browser-game actions; do not copy Steam branding, prices or purchase UI.

Keep the complete catalog and optional native-language filter. Preserve existing authored translations and indexability policy. Fill missing card titles/summaries with saved machine translations of provider metadata, explicitly label machine translation, retain original names for search, and display game language names in the selected UI language.

Native supported game pages keep their existing URLs. Unsupported UI/game combinations use one noindex player shell per UI locale with a validated game query. This keeps the UI language without producing more than 60,000 static files or pretending the game itself supports that language. Only an explicit Play action may create an iframe; publisher attribution remains exact.

Alternatives: a palette-only change would leave the localization/navigation defects. Generating every locale/game URL would exceed the hosting file limit. Use shared localized catalog data and 22 small player shells instead.

Scope: renderer/CSS, catalog helpers/data, catalog preparation/sync workflow, client player setup, fingerprinting, static/localization/client tests. Validate all translations by source hash and line alignment; stop on rate limits or incomplete responses. Preserve native guide/sitemap gates. Check 1440px desktop, 390px mobile and RTL.
