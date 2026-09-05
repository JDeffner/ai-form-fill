# Architecture

This page is the orientation for contributors: the data flow, the layers on top of it, the domains,
the invariants, and how to extend the library. It mirrors `docs/ARCHITECTURE.md` in the repository.

The library is small on purpose: zero runtime dependencies, one data flow, three domains.

## Data flow

```
HTMLFormElement
      |  lib/form/analyze.ts   getFormFields()
      v
FieldInfo[]              stable keys (name -> id -> field_<n>), labels
      |                  (label[for], wrapping label, aria-*, title),
      |                  normalized options, checkbox/radio grouping
      v
lib/prompt/build.ts      buildExtractionPrompt()  +  buildFormSchema()
      |                  prompt text                JSON schema with enums
      v
AIProvider.chat()        lib/providers/*  - standard wire formats
      |                  (Ollama REST, OpenAI chat-completions)
      v
raw model output
      |  lib/prompt/parse-response.ts   parseModelResponse()
      v
Record<string, unknown>  throws ResponseParseError on garbage
      |  lib/core/ai-form-fill.ts       applyExtraction() loop, by field.key
      v
lib/form/apply.ts        applyFieldValue(): per-type coercion, exact option
      |                  matching, strict ISO date validation, native
      v                  prototype setters + input/change events
FillResult               { filled(+previous), skipped(+reason),
                         unmatchedKeys, missingRequired, raw }
```

`extract()` is the same flow stopped one step early, at `Record<string, unknown>`: everything above
the apply loop, nothing below it. The loop itself is `applyExtraction(data, fields)`, and
`fillForm()` is literally `extract()` followed by that call, so the two cannot drift. A review step
calls the two halves separately, with the user's edits in between. See
[Events, Results and Review](Events-Results-and-Review).

`fillField` is the single-field variant of the same flow: `analyzeField` -> `buildFieldPrompt` ->
`chat` -> `applyFieldValue`.

Every step reports itself as a bubbling `CustomEvent` on the form (`lib/core/events.ts`):
`aff:start` before the request, `aff:field-filled` per written field, `aff:done` with the
`FillResult`, `aff:error` when the extraction throws. Nothing in the library listens to them; they
exist so a UI does not have to wrap the calls.

`lib/form/revert.ts` runs the flow backwards: `revertFill(result)` writes each `filled` entry's
`previous` value back through the same setters and events.

`lib/core/controller.ts` sits on top of all of it. `createFormFill()` resolves a form, a text source
and a trigger, owns one `AIFormFill`, and turns the promise into an observable `idle` / `working` /
`done` / `error` snapshot with `cancel` and `undo`. It adds no DOM of its own, so UI layers build on
the snapshot instead of on the promise.

## Layers

```
        <ai-form-fill>            useFormFill()          your own UI
        lib/ui/element.ts       lib/react/use-form-fill.ts
                \                     |                    /
                 \                    |                   /
                  ------------  createFormFill()  --------
                                lib/core/controller.ts
                                        |
                                  new AIFormFill()
                              lib/core/ai-form-fill.ts
                                        |
                 form engine  +  prompt/schema  +  providers
                  lib/form/        lib/prompt/     lib/providers/

        createDictation()  ->  text  ->  any of the three layers above
        lib/voice/dictation.ts
```

Each layer is a separate entry point, so nothing is paid for twice:

| Entry point          | Builds on      | Contains                                  |
| -------------------- | -------------- | ----------------------------------------- |
| `ai-form-fill`       | -              | Class, controller, form engine, providers |
| `ai-form-fill/ui`    | the controller | The custom element, its markup and CSS    |
| `ai-form-fill/react` | the controller | One hook, `react` stays external          |
| `ai-form-fill/voice` | nothing        | The Web Speech wrapper                    |

The voice module is text-out only. It never calls the core, so the two are independent: dictation
produces text, and what happens with it is the caller's decision.

## Domains

| Directory        | Responsibility                                                                |
| ---------------- | ----------------------------------------------------------------------------- |
| `lib/core/`      | Public class, controller, events, types, typed errors, defaults               |
| `lib/form/`      | DOM work: reading (`analyze.ts`), writing (`apply.ts`), undo (`revert.ts`)    |
| `lib/prompt/`    | LLM-facing text and schema (`build.ts`), output parsing (`parse-response.ts`) |
| `lib/providers/` | Transport: base class, Ollama, OpenAI-compatible, shared HTTP helper          |
| `lib/ui/`        | The `<ai-form-fill>` element and its stylesheet                               |
| `lib/react/`     | The `useFormFill` hook                                                        |
| `lib/voice/`     | Dictation through the Web Speech API                                          |

## Key invariants

- **`FieldInfo.key` is the single source of field identity.** The prompt, the schema and the fill
  loop all use it. Keys are derived once in `getFormFields` and deduplicated; never re-derive
  identity elsewhere.
- **Option matching is exact** (value, then label, then case and whitespace insensitive equality). No
  substring matching: `"male"` must never select `Female`. The schema's `enum` values make exact
  model answers likely in the first place.
- **Application never throws for value problems.** `applyFieldValue` returns
  `{ applied: false, reason }`; only provider and parse failures throw (`ProviderError`,
  `ResponseParseError`).
- **Values go through native prototype setters** and `input` plus `change` events, so controlled
  React, Vue and Svelte components observe the change.
- **Configuration is per-instance.** `AFF_DEFAULTS` is frozen; there is no global mutable state.
- **Schemas avoid provider-hostile constructs**: no `required` (extraction is optional per field),
  and date and time constraints use `[0-9]` regex patterns, because grammar-based enforcers (Ollama,
  llama.cpp) reject `\d` and would turn `format: 'time'` into RFC 3339 full-time with a UTC offset,
  which HTML inputs reject.

## Adding a provider

Extend `AIProvider` (`lib/providers/provider.ts`):

1. Implement `chat`, `listModels` and `isAvailable` using `requestJson`
   (`lib/providers/http.ts`) for uniform timeout, abort and error handling. Failures must surface as
   `ProviderError`.
2. Set `supportsStructured = true` if the service accepts a JSON schema, and translate
   `ChatRequest.format` into the service's mechanism (`response_format` for OpenAI-style, top-level
   `format` for Ollama).
3. Export it from `lib/index.ts`; add wire-format tests with a stubbed `fetch` (see
   `tests/providers/`).

A worked example is in [Providers](Providers).

## Adding a field type

1. `lib/form/analyze.ts`: make `analyzeField` extract whatever metadata the type needs (options,
   multiplicity, and so on).
2. `lib/prompt/build.ts`: give it a schema shape and, if needed, a format hint in the extraction
   prompt.
3. `lib/form/apply.ts`: add an application branch returning `applied` or `skipped` outcomes.
4. Add unit tests for all three layers plus an end-to-end case in `tests/core/ai-form-fill.test.ts`.

See [Contributing](Contributing) for the workflow around these changes.
