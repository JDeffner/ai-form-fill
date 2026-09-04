# Architecture

A short orientation for contributors. The library is small on purpose: zero
runtime dependencies, one data flow, three domains.

## Data flow

```
HTMLFormElement
      │  lib/form/analyze.ts   getFormFields()
      ▼
FieldInfo[]              stable keys (name → id → field_<n>), labels
      │                  (label[for], wrapping label, aria-*, title),
      │                  normalized options, checkbox/radio grouping
      ▼
lib/prompt/build.ts      buildExtractionPrompt()  +  buildFormSchema()
      │                  prompt text                JSON schema with enums
      ▼
AIProvider.chat()        lib/providers/*  — standard wire formats
      │                  (Ollama REST, OpenAI chat-completions)
      ▼
raw model output
      │  lib/prompt/parse-response.ts   parseModelResponse()
      ▼
Record<string, unknown>  throws ResponseParseError on garbage
      │  lib/core/ai-form-fill.ts       applyExtraction() loop, by field.key
      ▼
lib/form/apply.ts        applyFieldValue(): per-type coercion, exact option
      │                  matching, strict ISO date validation, native
      ▼                  prototype setters + input/change events
FillResult               { filled(+previous), skipped(+reason),
                         unmatchedKeys, missingRequired, raw }
```

`extract()` is the same flow stopped one step early, at
`Record<string, unknown>`: everything above the apply loop, nothing below it.
The loop itself is `applyExtraction(data, fields)`, and `fillForm()` is
literally `extract()` followed by that call, so the two cannot drift. A review
step calls the two halves separately, with the user's edits in between.

`fillField` is the single-field variant of the same flow: `analyzeField` →
`buildFieldPrompt` → `chat` → `applyFieldValue`.

Every step reports itself as a bubbling `CustomEvent` on the form
(`lib/core/events.ts`): `aff:start` before the request, `aff:field-filled`
per written field, `aff:done` with the `FillResult`, `aff:error` when the
extraction throws. Nothing in the library listens to them; they exist so a UI
does not have to wrap the calls.

`lib/form/revert.ts` runs the flow backwards: `revertFill(result)` writes each
`filled` entry's `previous` value back through the same setters and events.

`lib/core/controller.ts` sits on top of all of it. `createFormFill()` resolves
a form, a text source and a trigger, owns one `AIFormFill`, and turns the
promise into an observable `idle` / `working` / `done` / `error` snapshot with
`cancel` and `undo`. It adds no DOM of its own, so UI layers (a web component,
a React hook) build on the snapshot instead of on the promise.

## Domains

| Directory        | Responsibility                                                             |
| ---------------- | -------------------------------------------------------------------------- |
| `lib/core/`      | Public class, controller, events, types, typed errors, defaults            |
| `lib/form/`      | DOM work: reading (`analyze.ts`), writing (`apply.ts`), undo (`revert.ts`) |
| `lib/prompt/`    | LLM-facing text/schema (`build.ts`), output parsing (`parse-response.ts`)  |
| `lib/providers/` | Transport: base class, Ollama, OpenAI-compatible, shared HTTP helper       |

## Key invariants

- **`FieldInfo.key` is the single source of field identity.** The prompt, the
  schema and the fill loop all use it. Keys are derived once in
  `getFormFields` and deduplicated; never re-derive identity elsewhere.
- **Option matching is exact** (value → label → case/whitespace-insensitive
  equality). No substring matching — `"male"` must never select `Female`.
  The schema's `enum` values make exact model answers likely in the first place.
- **Application never throws for value problems.** `applyFieldValue` returns
  `{ applied: false, reason }`; only provider/parse failures throw
  (`ProviderError`, `ResponseParseError`).
- **Values go through native prototype setters** and `input` + `change`
  events, so controlled React/Vue/Svelte components observe the change.
- **Configuration is per-instance.** `AFF_DEFAULTS` is frozen; there is no
  global mutable state.
- **Schemas avoid provider-hostile constructs**: no `required` (extraction is
  optional per field), and date/time constraints use `[0-9]` regex patterns
  because grammar-based enforcers (Ollama/llama.cpp) reject `\d` and would
  turn `format: 'time'` into RFC 3339 full-time (with UTC offset), which HTML
  inputs reject.

## Adding a provider

Extend `AIProvider` (`lib/providers/provider.ts`):

1. Implement `chat`, `listModels`, `isAvailable` using
   `requestJson` (`lib/providers/http.ts`) for uniform timeout/abort/error
   handling — failures must surface as `ProviderError`.
2. Set `supportsStructured = true` if the service accepts a JSON schema, and
   translate `ChatRequest.format` into the service's mechanism
   (`response_format` for OpenAI-style, top-level `format` for Ollama).
3. Export it from `lib/index.ts`; add wire-format tests with a stubbed
   `fetch` (see `tests/providers/`).

## Adding a field type

1. `lib/form/analyze.ts`: make `analyzeField` extract whatever metadata the
   type needs (options, multiplicity, ...).
2. `lib/prompt/build.ts`: give it a schema shape and, if needed, a format
   hint in the extraction prompt.
3. `lib/form/apply.ts`: add an application branch returning
   `applied`/`skipped` outcomes.
4. Add unit tests for all three layers plus an end-to-end case in
   `tests/core/ai-form-fill.test.ts`.
