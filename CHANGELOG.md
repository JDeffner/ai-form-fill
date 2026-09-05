# Changelog

## Unreleased

### Breaking

- **`autoInit` is removed.** It only worked for one hard-coded page layout
  (`#aff-form`, `#aff-text`, `#aff-text-button`) and returned `null` on a typo.
  Use `createFormFill({ form, source, trigger })`, which takes elements or
  selectors, has real teardown, and reports state. The `AutoInitOptions` type
  and the `data-aff-provider` / `data-aff-model` attributes are gone with it.
- **The UMD bundle is removed.** `dist/ai-form-fill.umd.cjs` is gone and
  `main` now points at `dist/ai-form-fill.cjs`. Use the ESM build
  (`dist/ai-form-fill.js`) from a bundler or a `<script type="module">`. A
  script-tag bundle comes back in a later release.

### Added

- **`ai-form-fill/voice`**, a separate entry point with `createDictation` and
  `isDictationSupported`. `createDictation` wraps the browser's Web Speech
  API: it reports the full transcript on every result (interim words
  included), stops on its own after a configurable silence window
  (`silenceMs`, 1500 ms by default), and calls `onEnd` exactly once per
  session, so one click covers speak-and-fill. Options: `lang`, `interim`,
  `silenceMs`, `onText`, `onEnd`, `onError`. New exported types `Dictation`
  and `DictationOptions`. The core bundle carries no speech code.

- **`AIFormFill.extract(form, text, opts?)`** returns the parsed model output
  (`{ data, fields, raw }`) without writing anything to the form, so callers
  can build a review-and-confirm step. `fillForm` is now implemented as
  `extract` plus the apply loop, so the two cannot drift apart. New exported
  type `ExtractResult`. Purely additive; no existing behaviour changes.
- **Lifecycle events.** A fill dispatches `aff:start`, `aff:field-filled`,
  `aff:done` and `aff:error` as bubbling, composed `CustomEvent`s on the form
  (`fillField` dispatches `aff:field-filled` on the field it wrote). The names
  are added to `HTMLElementEventMap`, so `event.detail` is typed. New exports
  `dispatchAFFEvent` and the `AFFEventMap` type.
- **`createFormFill(options)`**, a headless controller: it resolves the form,
  the text source and the trigger from elements or selectors, exposes
  `fill`, `extract`, `applyExtracted`, `cancel`, `undo`, `subscribe`,
  `getSnapshot` and `destroy`, and tracks an `idle` / `working` / `done` /
  `error` state. `getSnapshot` and `subscribe` follow the external-store
  contract, so `useSyncExternalStore` can read them directly. New exported
  types `FormFillController`, `CreateFormFillOptions`, `FormFillSnapshot`,
  `FormFillState`.
- **`FillResult` reports more.** Each `filled` entry carries `previous`, the
  value the field held before the fill, and the result carries
  `missingRequired`, the keys of required fields that are still empty after
  the fill (computed over all fields of the form, not only the targeted ones).
- **`revertFill(result, keys?)`** restores those previous values exactly,
  including empty strings, unchecked radio groups and multi-selects, through
  the same native setters and `input`/`change` events as `applyFieldValue`.
- **`FillOptions.skipFilled`** excludes fields that already hold a value from
  the prompt, the schema and the fill, for `extract` and `fillForm`.
- **`AIFormFill.applyExtraction(data, fields, opts?)`**, the apply half of
  `fillForm`, so a review step can write an edited extraction and still get a
  full `FillResult` and the same events.
- **`readFieldValue(element)`** reads a field's current value in the same
  shape the library writes it.

### Changed

- **Demo pages rebuilt on shadcn/ui.** `examples/` is now one small React app
  (hash-routed: Basic, Advanced, Voice, React controlled) styled with stock
  shadcn/ui components and Tailwind v4, replacing ~1000 lines of bespoke CSS.
  Everything added is a dev dependency; the published bundle is unchanged.
  Forms keep native controls (`NativeSelect`, native checkbox/radio), because
  the library fills native elements.
- Removed the unused `mock/form.mock.ts` endpoints; moved the executed rework
  plan to `docs/REWORK-PLAN.md`.
- The Basic and Voice demo pages create a controller in an effect and destroy
  it on unmount; the fill flash listens for `aff:field-filled` instead of
  guessing from untrusted `input` events.
- **The build has one entry per public import path.** `vite.config.js` builds
  `lib/index.ts` into `dist/ai-form-fill.*` and `lib/voice/index.ts` into
  `dist/voice.*`, each as ESM, CommonJS and a rolled-up `.d.ts`, with a
  matching `exports` key in `package.json`.
- `pnpm build` appends the `HTMLElementEventMap` augmentation to the rolled-up
  `dist/ai-form-fill.d.ts`, because API Extractor drops `declare global`
  blocks when it bundles declarations. This is now a `vite-plugin-dts`
  `afterBuild` hook instead of the separate `scripts/append-event-types.js`
  step, which is deleted.

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
