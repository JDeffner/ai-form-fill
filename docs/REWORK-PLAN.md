# ai-form-fill — Critical Analysis & Rework Plan

> Handoff document. Written 2026-07-02 after a full read of the codebase on branch `alt-dev`.
> Goal of the library: **framework-agnostic AI form filling** — take a user's raw text (or voice)
> input and populate an arbitrary HTML form. Two audiences must be served well:
> **integrators** (installing the package must be as straightforward as possible) and
> **contributors** (working on the repo must be a good experience).
>
> Thesis constraint: this is a Bachelorarbeit artifact. The `tests/requirements/FR-*.test.ts`
> files trace to thesis requirements (FR-01…FR-11) and
> `tests/integration/ollama.integration.test.ts` reproduces scenarios from prior work
> ("Kloses work") for comparison. **Do not delete these; update them to the new API.**
>
> The library currently has **no users**. Breaking changes are free: do NOT ship deprecated
> aliases, backward-compat shims, or legacy re-exports anywhere. When an API is replaced, the
> old one is deleted in the same commit and all tests/examples/docs are updated to the new one.
>
> Renaming is not just allowed but **encouraged**: any file, directory, function, class, type,
> or variable may be renamed wherever a clearer name improves readability or usability. D7 below
> gives a concrete proposed scheme — treat it as the default, and deviate where you find something
> better. Two fixed points: the package name `ai-form-fill` (already published on npm) and the
> `FR-XX` prefixes on requirement test files (thesis traceability). Every rename must update all
> references (imports, tests, examples, README, vite build entry) in the same commit.

---

## Part 1 — Critical analysis (current state)

### What is genuinely good (keep)

- Zero runtime dependencies. Small surface (~40 KB of source). Keep it that way.
- Provider abstraction (`AIProvider` base class) with a normalized `ChatRequest`/`ChatResponse` — the right shape for provider independence.
- Structured-output path (JSON schema generated from the form) — the right technique; currently underused (see below).
- `data-aff-hint` attribute for per-field AI guidance — good, keep and document.
- Requirement-traceable test naming (`FR-XX`) — great for the thesis, keep the convention.
- TSDoc on public APIs + `vite-plugin-dts` rollup so consumers get hover docs — keep.

### A. Design flaws that undermine the "easy to include" goal

**A1. The remote-provider transport is a bespoke, undocumented proxy contract.**
`OpenAICompatibleProvider` does not speak the OpenAI wire format to anything. It POSTs to
`${apiBase}/<name>/chat`, `POST ${apiBase}/<name>/models`, `POST ${apiBase}/<name>/available` —
a contract that exists nowhere except the dev mocks in `mock/*.mock.ts`. Worse, the translation
to the real OpenAI format (wrapping the schema into `response_format: { type: 'json_schema', ... }`)
lives **inside the mock** (`mock/openai.mock.ts`), i.e. required production behavior is
implemented in dev tooling. Any real adopter must reverse-engineer the mocks and build a custom
backend before the library works with any cloud provider. This is the single biggest obstacle to
adoption.

**A2. "Framework-agnostic" fails for React.** `setFieldValue` does `element.value = x` then
dispatches `input`/`change` (lib/utils/fieldUtils.ts). React overrides the `value` property with
its own tracker, so controlled React components will not register the change. The fix is the
well-known native-prototype-setter technique. Vue/Svelte/vanilla work today; React — the largest
framework — does not.

**A3. No results, no errors — the caller is blind.** `parseAndFillForm` returns `Promise<void>`,
catches provider errors and **returns silently** (only logs when a global debug flag is on).
Integrators cannot build any UX: no way to know which fields were filled, which were skipped,
whether the provider was down, or whether the model returned garbage. `fillSingleField` swallows
errors too. The `try/catch` in `initialize.ts` can never fire.

**A4. Global mutable singleton config.** `affConfig` is a mutable module-level object;
`new AIFormFill(p, { debug: true })` **mutates the global** debug flag for every other instance.
Providers read some values at construction, others at call time. Classic library footgun
(test bleed, two instances can't differ).

**A5. Fragile field identity.** Fields are keyed by `name || label || placeholder || 'unknown'`
(`getFieldIdentifier`). Collisions are unhandled; multiple unnamed fields all become `'unknown'`;
`targetFields` filtering only matches `field.name` — so label-keyed fields can never be targeted;
the prompt, schema, and fill step each re-derive the key and can disagree.

**A6. Voice input doesn't exist.** The project goal explicitly mentions voice; nothing in the
repo addresses it, not even documentation. (Right answer: keep the core text-only, add a tiny
example/recipe using the Web Speech API — voice becomes text, text goes into `parseAndFillForm`.)

**A7. `initializeAFFQuick` is not shippable.** Hardcodes `debug: true`; crashes with a raw
`TypeError` if `#aff-form` is absent; README claims the `data-aff-provider` value is
case-insensitive but the code never lowercases it; no way to pass model/endpoint options.

### B. Correctness bugs

**B1. Bidirectional substring matching mis-selects options.** In `setRadioValue`/`setSelectValue`,
matching uses `a.includes(b) || b.includes(a)`. `"female".includes("male") === true`, so an AI
answer of `male` can select the _Female_ radio/option if it appears first in the DOM. Same class
of bug for any option pair where one string contains the other ("Engineering" / "Engineer",
"No" / "Norway").

**B2. Date parsing is wrong for non-US formats and tolerates invalid dates.**
`formatDateValue` assumes `MM/DD/YYYY` for ambiguous numeric dates (`15.03.1990` → month 15 →
JS `Date` silently rolls over into 1991). Week numbers are computed with a non-ISO-8601 formula.
All of this is unnecessary: the prompt/schema already demand ISO formats from the model.

**B3. `parseJsonResponse` flattens everything to strings** (`String(fieldValue)`) — arrays/objects
become `"[object Object]"`; type information from the JSON schema (`number`, `boolean`) is
destroyed and then re-guessed via string lists (`TRUTHY_VALUES`). It also `console.error`s
unconditionally (ignores the debug flag) and returns `{}` on failure, indistinguishable from
"model found nothing".

**B4. The generated JSON schema omits `enum`.** For selects and radios the option values are known —
putting them in the schema as `enum` makes structured-output providers return exact values and
would eliminate most of the fuzzy-matching problems in B1. Currently options are only prose in
the prompt.

**B5. Accessibility attributes ignored.** `analyzeField` reads only `label[for]` and a wrapping
`<label>`; `aria-label`, `aria-labelledby`, and `title` are ignored — common in real forms.

**B6. Inconsistent option handling.** Radio options live in `FieldInfo.options`; select options are
re-read from the live DOM inside `buildParsePrompt`. Checkbox groups sharing a `name` are not
grouped at all (each gets the same key, all receive the same boolean). `<select multiple>`
unsupported.

**B7. Duplicated transport code.** Timeout/AbortController/fetch-error-translation is copy-pasted
between `localOllama.ts` and `openAICompatible.ts`. No caller-supplied `AbortSignal`.

**B8. `setSelectedModel` returns `true` on validation failure.** If `listModels()` throws, the model
is set unvalidated and the method reports success.

### C. Repo hygiene & contributor experience

**C1. `.gitignore` contains `tests/`.** Tests are tracked only because they were added before the
rule; any **new** test file is silently ignored. This will eat a contributor's work.
**C2. `dist/` is committed** to git (stale relative to source, guaranteed merge noise).
**C3. Tracked file `env`** is an incomplete template (missing `VITE_OPENROUTER_KEY`, non-standard
name); should be `.env.example`.
**C4. `composer.json` is broken as-is**: PSR-4 autoload maps a PHP namespace to `dist/` which
contains JavaScript. (FR-08 requires composer installability — see decision D3.)
**C5. No linting, no formatting, no CI, no CONTRIBUTING.md, no CHANGELOG, no .editorconfig,
no pinned package manager.** `package.json` has an empty `repository.url`.
**C6. `pnpm test` runs vitest in watch mode** (CI-hostile) **and includes the Ollama integration
suite**, whose tests `return` early when Ollama is down — i.e. they _silently pass green without
testing anything_. False confidence + confusing for contributors.
**C7. Test boilerplate**: every test file hand-builds a JSDOM and assigns 7 globals even though
`vite.config.js` already sets `test.environment: 'jsdom'`.
**C8. Dead/confusing config**: `server.proxy '^/api' → http://example.com/` in vite.config.js;
`index.html` is a meta-refresh redirect hack; version is `2.0.0` locally while `1.0.1` is the
published npm version (package name is owned by the author — confirmed via `npm view`).
**C9. README drift**: claims case-insensitive provider names (false); the "APIs" section is an
unfinished prose block with typos; the proxy contract integrators must implement is not
documented anywhere.

---

## Part 2 — Target design decisions (already made — implement these)

**D1. Providers speak standard wire formats directly.**

- `OpenAICompatibleProvider` sends real OpenAI chat-completions requests
  (`POST {baseUrl}/chat/completions`, `GET {baseUrl}/models`) and performs the
  `response_format: { type: 'json_schema', json_schema: { name, schema } }` wrapping **itself**.
- Config: `{ baseUrl, apiKey?, model, timeout?, headers?, fetch? }`. Presets map to default
  baseUrls: `openai → https://api.openai.com/v1`, `openrouter → https://openrouter.ai/api/v1`,
  `perplexity → https://api.perplexity.ai`.
- Security posture stays "proxy-first": the recommended production setup is pointing `baseUrl`
  at **any OpenAI-compatible passthrough** (own 15-line proxy, LiteLLM, gateway). Because the
  wire format is standard, the proxy is now trivial instead of bespoke. Supplying `apiKey`
  directly in the browser is allowed for prototyping but requires an explicit
  `allowApiKeyInBrowser: true` option (throw otherwise) and is documented as unsafe for prod.
- `isAvailable()` = successful `GET {baseUrl}/models`. Delete the `/available` endpoint concept.
- Ollama provider unchanged conceptually (direct local REST), but shares the new HTTP helper.

**D2. Keep the class, rename the methods, fix the semantics.** `AIFormFill` stays; since there
are no users, the awkward names are simply replaced (no aliases):

- `parseAndFillForm` → **`fillForm(form, text, opts?) : Promise<FillResult>`**
- `fillSingleField` → **`fillField(element) : Promise<{ value: string } | null>`**
- Typed errors thrown instead of swallowed: `AFFError` (base) → `ProviderError`
  (network/HTTP/timeout, carries status + provider name), `ResponseParseError` (carries raw
  model output). Per-field application problems do **not** throw; they are collected in the result.
- `FillResult = { filled: Array<{ key, element, value }>, skipped: Array<{ key, reason }>,
unmatchedKeys: string[], raw: string }`.
- **The mutable global `affConfig` is deleted.** Replace with a frozen exported `AFF_DEFAULTS`
  (endpoints, models, timeout) used as constructor fallbacks; all configuration — including
  `debug` — is per-instance, resolved once at construction. (FR-07 "configurable defaults" is
  still satisfied: defaults exist and are overridable via constructor options; update the FR-07
  test accordingly.)
- Optional `opts.signal?: AbortSignal` threaded through to fetch.

**D3. Composer/PHP distribution (FR-08).** Keep `composer.json` because the thesis requirement
demands it, but fix it: remove the bogus `autoload` block entirely (a JS asset package has no PHP
classes). Because composer installs from git, `dist/` must exist in the repo for this path —
therefore **keep `dist/` tracked**, but make it a release artifact: add a `pnpm release:build`
script and a CI check (job that runs the build and fails if `dist/` is stale on `main`).
Document PHP usage = include the UMD file / serve `dist/` via the asset pipeline.
_(If FR-08 is renegotiated in the thesis, the better long-term setup is untracking `dist/` and
attaching build artifacts to GitHub Releases — noted as future work, do not do it now.)_

**D4. Quick start.** Delete `initializeAFFQuick` and replace it with a robust `autoInit(options?)`:

- Signature: `autoInit({ formId?, provider?, model?, debug? })`; still one line for the happy path.
- Reads `data-aff-provider` (lowercased), optional `data-aff-model`.
- Returns the created `AIFormFill` instance; logs a clear warning and returns `null` when required
  elements are missing (never throws a raw TypeError).

**D5. Voice input = example, not core.** Add `examples/voice/` using the Web Speech API
(`SpeechRecognition`/`webkitSpeechRecognition`): mic button → transcript into the textarea →
same `fillForm` call. README gets a "Voice input" section pointing at it. Core stays
text-in only.

**D6. Versioning/publishing.** npm name `ai-form-fill` is already owned by the author (published
`1.0.1`). The rework ships as **`2.0.0`** (local package.json already says 2.0.0 and it was never
published). Fill in `repository.url`.

**D7. Naming & structure overhaul.** Full renaming of files and symbols is encouraged; this is
the proposed default scheme. Convention: kebab-case file names, folders grouped by domain
(`form/` for DOM work, `providers/` for transport, `prompt/` for LLM-facing text/schema).
Apply all renames as the **first, behavior-free commit of Phase 2** so the subsequent behavioral
diffs stay reviewable.

Files:

| Current                             | New                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/core/main.ts`                  | `lib/index.ts` (conventional entry; update vite `build.lib.entry`)                                                                                       |
| `lib/core/aiFormFill.ts`            | `lib/core/ai-form-fill.ts`                                                                                                                               |
| `lib/core/initialize.ts`            | `lib/core/auto-init.ts`                                                                                                                                  |
| `lib/core/config.ts`                | `lib/core/defaults.ts`                                                                                                                                   |
| `lib/core/types.ts`                 | `lib/core/types.ts` (unchanged)                                                                                                                          |
| _(new)_                             | `lib/core/errors.ts`                                                                                                                                     |
| `lib/providers/aiProvider.ts`       | `lib/providers/provider.ts`                                                                                                                              |
| `lib/providers/localOllama.ts`      | `lib/providers/ollama.ts`                                                                                                                                |
| `lib/providers/openAICompatible.ts` | `lib/providers/openai-compatible.ts`                                                                                                                     |
| `lib/utils/fieldUtils.ts`           | split: `lib/form/analyze.ts` (read: `analyzeField`, `getFormFields`) and `lib/form/apply.ts` (write: `applyFieldValue`, event dispatch, option matching) |
| `lib/utils/prompts.ts`              | `lib/prompt/build.ts`                                                                                                                                    |
| `lib/utils/jsonParser.ts`           | `lib/prompt/parse-response.ts`                                                                                                                           |
| _(new, Phase 2a)_                   | `lib/providers/http.ts` (shared fetch helper — lives with its only consumers)                                                                            |

Symbols (beyond the D2/D4 renames already specified):

| Current                        | New                                           | Why                                              |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------ |
| `LocalOllamaProvider`          | `OllamaProvider`                              | "Local" is redundant; Ollama is inherently local |
| `getFillTargets`               | `getFormFields`                               | says what it returns                             |
| `setFieldValue`                | `applyFieldValue`                             | distinguishes DOM write from config setters      |
| `getFieldIdentifier`           | _(deleted — replaced by `field.key`, see 2c)_ |                                                  |
| `buildParsePrompt`             | `buildExtractionPrompt`                       | the task is extraction, not parsing              |
| `generateFormSchema`           | `buildFormSchema`                             | consistency with other `build*` helpers          |
| `SYSTEM_PROMPTS.PARSE_EXTRACT` | `SYSTEM_PROMPTS.EXTRACT`                      |                                                  |
| `parseJsonResponse`            | `parseModelResponse`                          | it parses model output specifically              |
| `AvailableProviders` (type)    | `BuiltInProviderName`                         | it's a name union, not a provider list           |
| `providerAvailable()`          | `isProviderAvailable()`                       | boolean-returning methods read as predicates     |
| `affConfig`                    | `AFF_DEFAULTS` (frozen, see D2)               |                                                  |

Class names `AIFormFill`, `AIProvider`, `OpenAICompatibleProvider`, `MockAIProvider` and the
`data-aff-*` attribute namespace are already clear — keep them. The executing model may rename
further where it demonstrably reads better, under the same all-references-updated rule.

---

## Part 3 — Implementation plan (phased, in order)

### Phase 0 — Repo hygiene (small, do first, one PR)

1. `.gitignore`: **remove the `tests/` line**; add `dist/` is _not_ added (see D3) but add
   `coverage/`, `*.tsbuildinfo`.
2. Rename `env` → `.env.example`; include all three keys (`VITE_OPEN_AI_KEY`,
   `VITE_PERPLEXITY_KEY`, `VITE_OPENROUTER_KEY`) with comments. Update README reference.
3. `composer.json`: delete the `autoload` block; add `repository`/homepage fields.
4. `package.json`: set `repository.url` (git remote), add `sideEffects: false`,
   `engines: { "node": ">=20" }`, `packageManager: "pnpm@<installed major>"`, add
   `"./package.json": "./package.json"` to `exports`.
5. `vite.config.js`: delete the dead `server.proxy` block (the mock plugin handles `/api`).
6. Replace `index.html` meta-refresh with a minimal landing page linking `examples/basic` and
   `examples/advanced` (and later `examples/voice`).
7. Add `.editorconfig` (2-space, LF, final newline — matches existing source).

### Phase 1 — Tooling & test infrastructure (one PR)

1. **ESLint** (flat config, `typescript-eslint` recommended-type-checked on `lib/`, relaxed on
   `examples/`/`tests/`) + **Prettier** (defaults; singleQuote to match existing style).
   Scripts: `lint`, `lint:fix`, `format`, `format:check`.
2. **Scripts rework** in package.json:
   - `test` → `vitest run --project unit`
   - `test:watch` → `vitest --project unit`
   - `test:integration` → `vitest run --project integration`
   - `typecheck` → `tsc --noEmit` (build becomes `tsc --noEmit && vite build` — same behavior,
     clearer name available separately)
3. **Vitest projects** (in vite.config or vitest.config): project `unit` = everything except
   `tests/integration/**`; project `integration` = only that folder.
4. **Fix silent-pass integration tests**: replace the `if (!isOllamaAvailable) return;` pattern
   with a `beforeAll` that _throws_ a clear "Ollama not reachable at http://localhost:11434 —
   start Ollama or skip via test:integration" error, or use `describe.skipIf(!env.OLLAMA)` so
   skipped tests are _reported as skipped_, never green.
5. **Delete JSDOM boilerplate** from all test files — `test.environment: 'jsdom'` already provides
   `document`/`HTMLElement` globals. Remove `jsdom` + `@types/jsdom` devDependencies if nothing
   else needs them.
6. **CI (GitHub Actions)** `.github/workflows/ci.yml`: on push/PR → pnpm install (with cache) →
   `lint` → `typecheck` → `test` → `build`. Add a `dist`-freshness check job on `main` (build,
   `git diff --exit-code dist/`).
7. `CONTRIBUTING.md`: setup (pnpm, Ollama optional), scripts table, how to run integration tests,
   PR expectations. Link from README. Add basic PR/issue templates if quick.

### Phase 2 — Core correctness (the big PR; touches `lib/` broadly)

**2·0. Renames first.** Apply the full D7 file/symbol rename scheme as the first, behavior-free
commit (git detects the moves; reviewable in minutes). All steps below use the new names.

**2a. Shared HTTP helper** — new `lib/providers/http.ts`:
`requestJson(url, { method, body?, timeout, signal?, headers? })` implementing the
AbortController-timeout + error-translation currently duplicated in both providers; merges an
external `AbortSignal`. Both providers use it. Errors become `ProviderError` (new
`lib/core/errors.ts` with `AFFError`, `ProviderError`, `ResponseParseError`).

**2b. Provider transport rework (D1)** — rewrite `lib/providers/openai-compatible.ts`:

- standard endpoints, apiKey header (`Authorization: Bearer`), `allowApiKeyInBrowser` guard,
  in-provider `response_format` wrapping, `listModels` = `GET /models` (parse `data[].id`),
  `isAvailable` = models call succeeds.
- Update `mock/*.mock.ts` to be plain passthrough proxies of the _standard_ format (they become
  reference implementations of "your 15-line proxy"; move the OpenAI SDK usage to a documented
  server example — see Phase 4).
- `AFF_DEFAULTS` carries `openai.baseUrl` etc.; the bespoke `apiBase` proxy base is removed.
- Fix `setSelectedModel` to return `false` when validation fails (B8) and document the
  "unvalidated set" path explicitly (or split into `setModel` unvalidated + validate option).

**2c. Field engine rework** — `lib/form/analyze.ts`, `lib/form/apply.ts` (split from
`fieldUtils.ts`, see D7) + `lib/core/types.ts`:

- **Stable keys**: derive once in `getFormFields` — `name` → `id` → `field_<index>`; dedupe
  collisions (`email`, `email_2`). Store on `FieldInfo.key`. Prompt builder, schema generator,
  and fill loop all use `field.key`. `targetFields` matches keys (keys are name-first, so
  targeting by `name` continues to work naturally).
- **Labels**: extend `analyzeField` to also read `aria-label`, `aria-labelledby` (resolve and
  join referenced text), `title`.
- **Options**: normalize — selects get `FieldInfo.options` populated like radios (value + label);
  group same-name checkboxes into one multi-option field; support `<select multiple>` by
  accepting array values (schema `type: 'array', items: { enum } }`).
- **Matching (B1)**: replace bidirectional-includes with ordered exact matching:
  exact `value` → exact label → case/whitespace-insensitive equality. No substring matching.
  (With schema enums from 2d, the model returns exact values, so this loses nothing.)
- **React compatibility (A2)**: in `applyFieldValue`, set values via the native prototype setter:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)` (and the
  `HTMLTextAreaElement`/`HTMLSelectElement` equivalents), then dispatch `input` + `change`.
- **Dates (B2)**: delete the multi-format guessing parser. Accept ISO (`YYYY-MM-DD`,
  `YYYY-MM-DDTHH:MM`, `HH:MM`) validated by strict regex + real-date check; on mismatch, leave the
  field and record `{ key, reason: 'invalid-date-format' }` in the result. Delete the week-number
  math (`type=week` gets ISO `yyyy-Www` passthrough with regex validation only).

**2d. Schema/prompt improvements** — `lib/prompt/build.ts`:

- `buildFormSchema`: add `enum` (option values) for select/radio/checkbox-group fields; keep
  formats; use `field.key` for property names; keep `additionalProperties: false`.
- `buildExtractionPrompt`: use `field.key` consistently; read options from `FieldInfo.options`
  (no live DOM reads); state exact enum values.
- Keep the schema non-strict (OpenAI `strict: true` would require every property in `required` —
  wrong for optional extraction).

**2e. Parse & fill flow** — `lib/core/ai-form-fill.ts` + `lib/prompt/parse-response.ts`:

- `parseModelResponse` returns `Record<string, unknown>` (no String() flattening), throws
  `ResponseParseError` with the raw response attached; markdown-fence stripping stays. Respect
  debug flag for logging (or drop logging — the error now carries the info).
- `fillForm` (renamed from `parseAndFillForm`, D2) implements `FillResult`, per-type coercion at
  fill time (boolean for checkboxes, `String()` only for scalars, arrays allowed for multi-value
  fields), throws typed errors upward, collects per-field failures.
- `lib/core/defaults.ts` replaces the mutable singleton with frozen `AFF_DEFAULTS` (D2). All
  modules that currently read `affConfig` at call time (providers, field-apply debug logging)
  take their values from instance/constructor state instead.
- `fillField` (renamed from `fillSingleField`) returns `Promise<{ value: string } | null>` and
  throws typed errors.

**2f. `autoInit` (D4)** — rewrite `lib/core/auto-init.ts` (formerly `initialize.ts`) as
specified; `initializeAFFQuick` is deleted, the entry point `lib/index.ts` exports only the
new name.

**2g. Update all tests to the new behavior.** Update FR-* acceptance tests to still map to their
requirement texts (they largely test the same surface). Add new regression tests:

- option matching: "male"/"female" case, exact-label match, no-substring-match assertion
- key stability & collision dedupe; unnamed-field keys
- schema enums for select/radio; array schema for multi-value
- React value-tracker test: assert prototype setter is used (spy on the descriptor) — no React dep
- ISO date validation accept/reject cases
- typed error paths: provider HTTP error → `ProviderError`; garbage JSON → `ResponseParseError`
- `FillResult` contents for mixed success/skip cases
- provider wire-format tests with a stubbed `fetch` (assert URL, headers, `response_format` body)

### Phase 3 — Docs & examples (one PR)

1. **README rewrite** (keep overall structure, fix content):
   - Quick start: Ollama zero-config path first; then cloud via any OpenAI-compatible
     `baseUrl` (+ proxy recipe link); `autoInit` one-liner; `FillResult` usage example.
   - New **Security & privacy** section replacing the unfinished "APIs" section: API keys never
     in shipped frontend (proxy-first, `allowApiKeyInBrowser` is dev-only), PII goes to the
     configured provider (relevant for GDPR — local Ollama keeps data on-device), prompt-injection
     caveat (form-filling text is untrusted model input; values land in a user-reviewable form,
     but integrators should not auto-submit).
   - Fix false claims (case-insensitivity now true via D4), document `data-aff-*` attributes,
     browser support statement, voice-input section (D5).
2. **Server proxy example**: `examples/server/` — a ~20-line Node (Hono or Express) passthrough
   proxy that injects the API key server-side; referenced from README. The OpenAI-SDK logic
   currently living in `mock/openai.mock.ts` moves here in documented form; mocks stay as thin
   dev fakes.
3. **`examples/voice/`** (D5) and a minimal **`examples/react/`** (single CDN-based JSX or a tiny
   Vite React page) proving controlled-component filling works — this is the proof of the
   "framework-agnostic" claim.
4. `docs/ARCHITECTURE.md` (1–2 pages for contributors): data flow
   (form → FieldInfo[] → prompt+schema → provider → JSON → coercion → DOM), where to add a
   provider, where to add a field type.
5. `CHANGELOG.md` starting with the 2.0.0 entry. 2.0.0 is a clean rewrite relative to the
   published 1.0.1: bespoke proxy contract replaced by standard OpenAI wire format, methods
   renamed (`fillForm`/`fillField`/`autoInit`), mutable `affConfig` replaced by `AFF_DEFAULTS` +
   per-instance options, typed errors + `FillResult`. No deprecated aliases are shipped.

### Phase 4 — Release (small PR)

1. Verify `files`/`exports`/types still correct after changes; `pnpm build`, commit fresh `dist/`
   (D3), tag `v2.0.0`, `npm publish` (manual or a `release.yml` workflow with `NPM_TOKEN` —
   manual is fine for a thesis).
2. Confirm install smoke test: `npm pack`, install the tarball into a scratch Vite app, run the
   basic example against Ollama.

---

## Part 4 — Explicitly out of scope (document as future work, do not build)

- Streaming responses / progressive field filling
- Framework wrapper packages (`@ai-form-fill/react` hooks etc.)
- `contenteditable`, ARIA combobox widgets (react-select style), file inputs
- Retry/backoff, response caching
- Untracking `dist/` + GitHub-Release artifacts (blocked by FR-08 composer decision, see D3)

## Part 5 — Verification checklist (run after each phase, all before release)

1. `pnpm lint && pnpm typecheck && pnpm test` — green, no watch mode, integration suite excluded.
2. `pnpm test:integration` with Ollama running (`ollama pull gemma3:4b`) — green; with Ollama
   stopped — **fails or reports skipped, never silently green**.
3. `pnpm build` — dist emits ESM + UMD + rolled-up `.d.ts` with TSDoc preserved (hover a symbol
   in a scratch consumer).
4. `pnpm dev` → basic example fills the form via Ollama; advanced example provider/model switching
   works; voice example transcribes and fills (Chrome); react example: typing state AND AI fill
   both update React state.
5. Cloud path: run `examples/server` proxy with a real key (any one provider), point
   `baseUrl` at it, fill the advanced form. Verify no key appears in browser network requests.
6. Negative paths: stop Ollama → `fillForm` rejects with `ProviderError` and the demo
   shows the error status; feed a select whose options are "Male"/"Female" and text "male" →
   correct option chosen.
7. `git status` clean after `pnpm test` (no stray artifacts); create a new file under `tests/` and
   confirm `git status` shows it (gitignore fix).
