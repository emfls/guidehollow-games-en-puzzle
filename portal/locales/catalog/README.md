# Saved catalog translations

Each record is keyed by the immutable provider game ID and carries the provider source hash. Existing authored metadata takes precedence. Missing or stale translations fail production verification; titles alone do not make a guide indexable.

Initial machine translations use Google Translate. Locally completed/ repaired records use Meta M2M100418M, via CTranslate2 (MIT). Model conversion source: https://huggingface.co/michaelfeil/ct2fast-m2m100_418M at06bd83294674f3737eb929e501aa5beafaa229d8; original model: https://huggingface.co/facebook/m2m100_418M. Model binaries are not included in the repository or production website.

When a translation engine cannot produce a usable localized summary, show only localized genre/device facts, marked summaryFromFacts in data. The public UI discloses machine translation; original names remain searchable. Game-internal language support is preserved separately.

Additional targeted local completion uses Google MADLAD4003B (Apache-2.0), converted by Nextcloud-AI: https://huggingface.co/Nextcloud-AI/madlad400-3b-mt-ct2-int8 ataa32bbdeba7880eff2096ec044cb155a340a9400. Uzbek Cyrillic output is transliterated to the Latin script used by the UI. Scarce-resource summaries with unreliable semantic output use only reviewed localized genre/device facts and carry summaryFromFacts=true.
