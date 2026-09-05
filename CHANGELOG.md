# Changelog

## Unreleased

## 2.0.0 (2026-09-05)

The library grew from a fill function into a complete path from text or speech
to a filled form: a ready-made `<ai-form-fill>` element, a dictation module, a
headless controller, a React hook, standard OpenAI and Ollama wire formats, and
DOM events plus undo around every fill.

This is a rewrite. Everything below is relative to the published 1.0.1; the
0.9.0 section further down is a development milestone that was never released
to npm. Tag `v1.0.0` marks the state submitted with the bachelor thesis and is
identical to npm 1.0.1.

### Breaking

- **Renamed API.** `parseAndFillForm` is now `fillForm` and returns a
  `FillResult`, `fillSingleField` is `fillField`, `LocalOllamaProvider` is
  `OllamaProvider`, `providerAvailable` is `isProviderAvailable`,
  `getFillTargets` is `getFormFields`, `setFieldValue` is `applyFieldValue`,
  `AvailableProviders` is `BuiltInProviderName`, and
  `ProviderConfig.apiEndpoint` is `baseUrl`.
- **`autoInit` and `initializeAFFQuick` are gone.** They worked for one
  hard-coded page layout (`#aff-form`, `#aff-text`, `#aff-text-button`) and
  returned `null` on a typo. Use `createFormFill({ form, source, trigger })`,
  which takes elements or selectors, has real teardown, and reports state, or
  drop in `<ai-form-fill>`. The `AutoInitOptions` type and the
  `data-aff-provider` / `data-aff-model` attributes went with them.
- **Standard wire formats.** `OpenAICompatibleProvider` speaks the real OpenAI
  chat-completions protocol (`POST {baseUrl}/chat/completions`,
  `GET {baseUrl}/models`, `response_format` JSON-schema wrapping done by the
  provider). The bespoke `/<name>/chat|models|available` proxy contract and the
  `affConfig.apiBase` proxy base are gone. Point `baseUrl` at the service or at
  any OpenAI-compatible passthrough (see `examples/server`).
- **The UMD bundle is replaced by the browser bundle.**
  `dist/ai-form-fill.umd.cjs` is gone and `main` points at
  `dist/ai-form-fill.cjs`. Use the ESM build (`dist/ai-form-fill.js`) from a
  bundler or a `<script type="module">`, or `dist/ai-form-fill.browser.js` from
  a plain script tag.
- **Typed errors instead of silence.** Provider failures reject with
  `ProviderError` (name, HTTP status, cause); unusable model output rejects with
  `ResponseParseError`, which carries the raw output. Per-field problems no
  longer vanish, they are collected in `FillResult.skipped` with a reason.
- **Per-instance configuration.** The mutable global `affConfig` is replaced by
  the frozen `AFF_DEFAULTS`; everything, `debug` included, is resolved when the
  instance is constructed.
- **Strict ISO date handling.** The multi-format date guesser is gone. Date and
  time values must be ISO (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, `HH:MM`) and are
  validated, otherwise the field is skipped with `invalid-date-format`. No more
  `15.03.1990` silently becoming a 1991 date.

### Added

- **`<ai-form-fill>`, the ready-made interface.** Two lines of HTML next to a
  form give the user a text box, an optional microphone, a fill button, live
  status, a summary of what was filled and what is still missing, undo, and an
  optional review step. It is plain DOM in a shadow root with no dependencies
  and no CSS injected into the page: it inherits the page font and text colour,
  exposes every node as a `::part` and every colour as an `--aff-*` variable.
  Attributes: `for`, `provider`, `model`, `base-url`, `target-fields`,
  `skip-filled`, `voice`, `lang`, `review`, `label`, `placeholder`, `debug`.
  Properties: `provider` (an `AIProvider` instance), `strings` (every piece of
  text is replaceable) and the read-only `controller`. Fields the element
  writes carry `data-aff-filled` for 1.5 seconds, so a page can highlight them.
- **`ai-form-fill/voice`, dictation.** `createDictation` wraps the browser's Web
  Speech API: it reports the full transcript on every result (interim words
  included), stops on its own after a configurable silence window (`silenceMs`,
  1500 ms by default), and calls `onEnd` exactly once per session, so one click
  covers speak-and-fill. Options: `lang`, `interim`, `silenceMs`, `onText`,
  `onEnd`, `onError`. `isDictationSupported()` is safe to import during
  server-side rendering. New types `Dictation` and `DictationOptions`.
- **`createFormFill(options)`, a headless controller.** It resolves the form,
  the text source and the trigger from elements or selectors, exposes `fill`,
  `extract`, `applyExtracted`, `cancel`, `undo`, `subscribe`, `getSnapshot` and
  `destroy`, and tracks an `idle` / `working` / `done` / `error` state.
  `getSnapshot` and `subscribe` follow the external-store contract, so
  `useSyncExternalStore` can read them directly. New types
  `FormFillController`, `CreateFormFillOptions`, `FormFillSnapshot`,
  `FormFillState`.
- **`ai-form-fill/react`, a React hook.** `useFormFill(options?)` returns a
  `formRef` for the form plus `fill`, `extract`, `applyExtracted`, `cancel`,
  `undo` and the current `state`, `result` and `error`. It creates the
  controller when the form mounts and destroys it when the form unmounts, so a
  fill is ordinary React state and controlled inputs need no extra code.
  `react` is an optional peer dependency (`>=18`) and stays external in the
  build. New types `UseFormFillOptions` and `UseFormFillResult`.
- **Lifecycle events.** A fill dispatches `aff:start`, `aff:field-filled`,
  `aff:done` and `aff:error` as bubbling, composed `CustomEvent`s on the form
  (`fillField` dispatches `aff:field-filled` on the field it wrote). The names
  are added to `HTMLElementEventMap`, so `event.detail` is typed. New exports
  `dispatchAFFEvent` and the `AFFEventMap` type.
- **Undo.** Each `FillResult.filled` entry carries `previous`, the value the
  field held before the fill, and `revertFill(result, keys?)` restores those
  values exactly, including empty strings, unchecked radio groups and
  multi-selects, through the same native setters and `input` / `change` events
  as `applyFieldValue`. The controller wraps it as `undo()`.
- **A review path.** `extract(form, text, opts?)` returns the parsed model
  output (`{ data, fields, raw }`) without writing anything, and
  `applyExtraction(data, fields, opts?)` writes a reviewed extraction and
  returns a full `FillResult`. `fillForm` is exactly the two in sequence, so
  they cannot drift apart. New type `ExtractResult`.
- **`FillOptions.skipFilled`** excludes fields that already hold a value from
  the prompt, the schema and the fill, for both `extract` and `fillForm`.
- **`FillResult.missingRequired`** lists the keys of required fields that are
  still empty after the fill, computed over all fields of the form and not only
  the targeted ones.
- **`readFieldValue(element)`** reads a field's current value in the same shape
  the library writes it.
- **`dist/ai-form-fill.browser.js`, a script-tag build.** One minified IIFE with
  core, voice and ui. It registers `<ai-form-fill>` on load and puts the whole
  API on the `AIFormFill` global. The `unpkg` and `jsdelivr` fields point at it,
  so `https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js`
  works without a bundler.
- **A multi-entry build.** One file set per public import path: `lib/index.ts`
  becomes `dist/ai-form-fill.*`, `lib/voice/index.ts` becomes `dist/voice.*`,
  `lib/ui/index.ts` becomes `dist/ui.*` and `lib/react/index.ts` becomes
  `dist/react.*`, each as ESM, CommonJS and a rolled-up `.d.ts`, with a matching
  `exports` key in `package.json`. The core bundle carries no speech code, no
  markup and no React.
- **A `FillResult`** (`filled` / `skipped` / `unmatchedKeys` / `raw`) so
  integrators can build real UX around the outcome, with stable field keys
  (`name`, then `id`, then `field_<n>`, deduplicated) used consistently across
  prompt, schema and fill.
- JSON-schema `enum`s for select, radio and checkbox-group options; multi-value
  fields (`<select multiple>`, same-name checkbox groups) use array schemas.
- Label detection via `aria-label`, `aria-labelledby` and `title`; per-field
  guidance via `data-aff-hint`.
- Optional `AbortSignal` support (`fillForm(form, text, { signal })`).
- API keys: direct browser use requires an explicit `allowApiKeyInBrowser: true`
  and the recommended setup stays proxy-first.
- A documentation site: the demo app and the generated API reference are
  published to GitHub Pages by `.github/workflows/pages.yml`.

### Changed

- **Demo pages rebuilt on shadcn/ui and reorganised around the ready-made
  paths.** `examples/` is one small React app styled with stock shadcn/ui
  components and Tailwind v4, replacing about 1000 lines of bespoke CSS. The
  hash-routed pages are Element, Controller, Voice, React hook, Advanced and
  Script tag, next to `examples/vanilla.html`, a static page served against the
  built bundle. `examples/snippets/` adds Vue and Svelte snippets. Everything
  added is a dev dependency; the published bundle is unchanged. The forms keep
  native controls, because the library fills native elements.
- React compatibility: values are written through the native prototype setters,
  so controlled components update.
- `pnpm build` appends the `HTMLElementEventMap` augmentation to the rolled-up
  `dist/ai-form-fill.d.ts`, because API Extractor drops `declare global` blocks
  when it bundles declarations. This is a `vite-plugin-dts` `afterBuild` hook,
  replacing the separate `scripts/append-event-types.js` step.
- `setSelectedModel` no longer reports success when the model list cannot be
  fetched; `{ validate: false }` sets a model unvalidated on purpose.
- Removed the unused `mock/form.mock.ts` endpoints; moved the executed rework
  plan to `docs/REWORK-PLAN.md`.

### Fixed

- Option matching no longer uses bidirectional substring matching, so "male" can
  no longer select "Female".
- `parseModelResponse` keeps JSON types (numbers, booleans, arrays) instead of
  flattening everything to strings.
- JSON-schema date and time constraints are grammar-safe regex patterns. The
  previous `format: 'time'` and `'date-time'` made schema-enforcing providers
  (Ollama) generate RFC 3339 values that HTML inputs reject.

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
