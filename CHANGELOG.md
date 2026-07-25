# Changelog

## Unreleased

### Added

- **`AIFormFill.extract(form, text, opts?)`** returns the parsed model output
  (`{ data, fields, raw }`) without writing anything to the form, so callers
  can build a review-and-confirm step. `fillForm` is now implemented as
  `extract` plus the apply loop, so the two cannot drift apart. New exported
  type `ExtractResult`. Purely additive; no existing behaviour changes.

### Fixed

- **Demo pages: secondary submit buttons rendered as primary.** The bare
  `button[type='submit']` fallback (0,1,1) outranked the `.btn-secondary`
  class (0,1,0), so any secondary button that was also a submit button came
  out vermilion. The element fallbacks are now wrapped in `:where()`.
- **Demo pages: ragged control heights.** Text inputs, selects and date/time
  inputs have different intrinsic content-box heights and rendered 40/42/43px
  side by side. All single-line controls are now pinned to `--control-h`.
- **Demo pages: native checkboxes, radios and select chrome.** `accent-color`
  recolors the tick but leaves the operating system's own box, which was the
  only undesigned surface left on the pages. Ticks and the select chevron are
  now drawn from the same ink rule and vermilion as everything else.
- **Demo pages: misaligned labels in mixed-height rows.** `.form-row` was
  `align-items: flex-end`, which pushed the shorter group's label down
  whenever two groups in a row differed in height (a 4-item radio group beside
  a 3-item one). Now top-aligned.

## 0.9.0 (2026-07-02)

Clean rewrite relative to the published 1.0.1. The library has no users yet,
so breaking changes ship without deprecated aliases or compatibility shims.

### Breaking

- **Standard wire formats.** `OpenAICompatibleProvider` now speaks the real
  OpenAI chat-completions protocol (`POST {baseUrl}/chat/completions`,
  `GET {baseUrl}/models`, `response_format` JSON-schema wrapping done by the
  provider itself). The bespoke `/​<name>/chat|models|available` proxy contract
  and the `affConfig.apiBase` proxy base are gone — point `baseUrl` at the
  service or at any OpenAI-compatible passthrough proxy
  (see `examples/server`).
- **Renamed API.** `parseAndFillForm` → `fillForm` (returns a `FillResult`),
  `fillSingleField` → `fillField`, `initializeAFFQuick` → `autoInit`,
  `LocalOllamaProvider` → `OllamaProvider`, `providerAvailable` →
  `isProviderAvailable`, `getFillTargets` → `getFormFields`, `setFieldValue`
  → `applyFieldValue`, `AvailableProviders` → `BuiltInProviderName`,
  `ProviderConfig.apiEndpoint` → `baseUrl`.
- **Typed errors instead of silence.** Provider failures reject with
  `ProviderError` (name, HTTP status, cause); unusable model output rejects
  with `ResponseParseError` (carries the raw output). Per-field problems no
  longer vanish — they are collected in `FillResult.skipped` with a reason.
- **Per-instance configuration.** The mutable global `affConfig` is replaced
  by the frozen `AFF_DEFAULTS`; everything (including `debug`) is resolved at
  construction time.
- **Strict ISO date handling.** The multi-format date guesser is gone;
  date/time values must be ISO (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, `HH:MM`)
  and are validated, otherwise the field is skipped with
  `invalid-date-format`. No more `15.03.1990` silently becoming a 1991 date.

### Added

- `FillResult` (`filled` / `skipped` / `unmatchedKeys` / `raw`) so integrators
  can build real UX around the outcome.
- Stable field keys (`name` → `id` → `field_<n>`, deduplicated) used
  consistently across prompt, schema and fill.
- JSON-schema `enum`s for select/radio/checkbox-group options; multi-value
  fields (`<select multiple>`, same-name checkbox groups) use array schemas.
- React compatibility: values are written via the native prototype setters,
  so controlled components update.
- Label detection via `aria-label`, `aria-labelledby` and `title`.
- `autoInit` quick start: lowercased `data-aff-provider`, optional
  `data-aff-model`, returns the instance, warns instead of throwing.
- Optional `AbortSignal` support (`fillForm(form, text, { signal })`).
- API keys: direct browser use requires an explicit
  `allowApiKeyInBrowser: true`; the recommended setup stays proxy-first.
- `setSelectedModel` no longer reports success when the model list cannot be
  fetched; `{ validate: false }` sets a model unvalidated on purpose.

### Fixed

- Option matching no longer uses bidirectional substring matching ("male"
  can no longer select "Female").
- `parseModelResponse` keeps JSON types (numbers, booleans, arrays) instead
  of flattening everything to strings.
- JSON-schema date/time constraints are grammar-safe regex patterns; the
  previous `format: 'time'`/`'date-time'` made schema-enforcing providers
  (Ollama) generate RFC 3339 values that HTML inputs reject.
