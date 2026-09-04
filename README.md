# AI Form Fill

Framework-agnostic library for AI-powered form filling. Extract structured data from unstructured text and automatically fill forms using Ollama or any OpenAI-compatible provider (OpenAI, Perplexity, OpenRouter, or your own).

## Features

- Uses LLMs to understand and extract data from natural language
- Automatically matches data to form fields (text, email, number, textarea, select, radio, checkbox, date/time, `<select multiple>`, checkbox groups)
- Structured output: a JSON schema (with exact option values as enums) is generated from your form
- Works with Ollama and any OpenAI-compatible API — standard wire format, no custom backend contract
- Framework-agnostic: values are applied through native setters + `input`/`change` events, so vanilla JS, React (controlled components), Vue and Svelte all pick them up
- Real results and errors: `fillForm` returns a `FillResult`; failures reject with typed errors
- Field hints (`data-aff-hint`) and field targeting
- Zero runtime dependencies

## Installation

```bash
npm install ai-form-fill
```

---

## Quick start (Ollama, zero config)

The fastest path runs fully local — no API keys, no backend. Install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull gemma3:4b
```

### HTML

```html
<form id="contact">
  <input type="text" name="name" placeholder="Name" />
  <input type="email" name="email" placeholder="Email" />
  <input type="tel" name="phone" placeholder="Phone" />
</form>

<textarea id="notes" placeholder="Paste your text here..."></textarea>
<button id="fill">Fill form</button>
```

### JavaScript (one call)

```typescript
import { createFormFill } from 'ai-form-fill';

const controller = createFormFill({ form: '#contact', source: '#notes', trigger: '#fill' });
```

`createFormFill` takes elements or CSS selectors, wires a click on the trigger
to a fill from the source text, and returns a headless controller: no markup,
no styling, no framework. The provider defaults to local Ollama.

| Controller member              | Description                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `fill(text?)`                  | Fill from `text` or from the source. Never rejects; resolves to a `FillResult` or `null` |
| `extract(text?)`               | Extract without writing, for a review step                                               |
| `applyExtracted(data, fields)` | Write a reviewed extraction to the form                                                  |
| `cancel()`                     | Abort the running request, back to `idle`                                                |
| `undo()`                       | Restore the values the last fill overwrote                                               |
| `subscribe(fn)`                | Listen for state changes; returns the unsubscribe function                               |
| `getSnapshot()`                | `{ state, result, error }`, stable reference until the state changes                     |
| `destroy()`                    | Remove the trigger listener and abort running work                                       |
| `instance`                     | The underlying `AIFormFill`                                                              |

The state is `idle`, `working`, `done` or `error`. `getSnapshot` and
`subscribe` follow the external-store contract, so React can read them with
`useSyncExternalStore`; a plain page can use the `onState` callback instead:

```typescript
createFormFill({
  form: '#contact',
  source: '#notes',
  trigger: '#fill',
  onState: ({ state, result }) => {
    button.disabled = state === 'working';
    if (result) console.log(`Filled ${result.filled.length} field(s)`);
  },
});
```

Other options: `provider` (name or instance), `model`, `baseUrl`,
`targetFields`, `skipFilled`, `debug`.

---

## Using the class directly

```typescript
import { AIFormFill } from 'ai-form-fill';

const aiForm = new AIFormFill('ollama', { model: 'gemma3:4b', debug: true });

const form = document.getElementById('myForm') as HTMLFormElement;
const text = 'My name is John Doe, email john@example.com, phone 555-1234';

const result = await aiForm.fillForm(form, text);

console.log(result.filled); //  [{ key: 'name', element, value: 'John Doe', previous: '' }, ...]
console.log(result.skipped); //  [{ key: 'birthDate', reason: 'invalid-date-format' }, ...]
console.log(result.unmatchedKeys); //  keys the model answered that match no field
console.log(result.missingRequired); //  required fields that are still empty
console.log(result.raw); //  raw model output, for debugging
```

### Errors

Provider and parsing failures reject with typed errors instead of failing silently:

```typescript
import { ProviderError, ResponseParseError } from 'ai-form-fill';

try {
  await aiForm.fillForm(form, text);
} catch (error) {
  if (error instanceof ProviderError) {
    // network / HTTP / timeout — error.provider, error.status
  } else if (error instanceof ResponseParseError) {
    // the model returned something unusable — error.raw has the output
  }
}
```

Per-field problems (an option that doesn't exist, a malformed date) never
throw — they land in `result.skipped` with a reason.

### Review before applying

`fillForm` writes straight to the form. When you want the user to confirm
first, call `extract` instead: same request, same parsing, but nothing is
written. Write the reviewed data back with `applyExtraction`, the second half
of `fillForm`, which returns the same `FillResult`.

```typescript
const { data, fields } = await aiForm.extract(form, text);

// data is keyed by field key: { firstName: 'John', email: 'john@example.com' }
const edited = await showReviewUI(data);

const result = aiForm.applyExtraction(edited, fields);
```

`fillForm` is exactly `extract` followed by `applyExtraction`, so the two never
drift apart. The controller exposes the same pair as `extract()` and
`applyExtracted()`. To write a single value yourself, use the exported
`applyFieldValue(field.element, value)`.

### Lifecycle events

Every fill reports itself as DOM `CustomEvent`s on the form. They bubble and
cross shadow boundaries, so one listener can serve a whole page.

| Event              | `detail`                            | When                        |
| ------------------ | ----------------------------------- | --------------------------- |
| `aff:start`        | `{ text }`                          | Before the provider request |
| `aff:field-filled` | `{ key, element, value, previous }` | After a field was written   |
| `aff:done`         | The `FillResult`                    | After the fill finished     |
| `aff:error`        | `{ error }`                         | Extraction failed           |

```typescript
form.addEventListener('aff:start', () => spinner.show());
form.addEventListener('aff:field-filled', (event) => flash(event.detail.element));
form.addEventListener('aff:done', (event) => {
  spinner.hide();
  console.log(`Filled ${event.detail.filled.length} field(s)`);
});
```

The event names are added to `HTMLElementEventMap`, so `event.detail` is typed
without a cast. `aff:error` fires before the error is rethrown, so
`await fillForm(...)` still rejects as usual. `fillField` dispatches
`aff:field-filled` on the field it wrote.

### Undo a fill

`FillResult.filled` records the value each field held before, so a fill can be
taken back exactly, including empty strings and unchecked radio groups.

```typescript
import { revertFill } from 'ai-form-fill';

const result = await aiForm.fillForm(form, text);
revertFill(result); // everything back
revertFill(result, ['email']); // or a single field
```

The controller wraps this as `controller.undo()`.

### Required fields that are still empty

`FillResult.missingRequired` lists the keys of required fields that hold no
value after the fill, over all fields of the form and not only the ones that
were filled. A radio or checkbox group counts as required when any member is
required, and as empty when nothing in it is checked.

```typescript
if (result.missingRequired.length > 0) {
  showHint(`Please complete: ${result.missingRequired.join(', ')}`);
}
```

### Fill only the empty fields

`skipFilled` leaves fields that already hold a value alone. They are dropped
from the prompt and the schema, so the model never answers for them and they
are never written, which also makes the request smaller.

```typescript
await aiForm.fillForm(form, text, { skipFilled: true });
```

### Fill a single field

```typescript
const bio = document.querySelector('#bio') as HTMLElement;
const outcome = await aiForm.fillField(bio); // { value } or null
```

### Cancellation

```typescript
const controller = new AbortController();
aiForm.fillForm(form, text, { signal: controller.signal });
controller.abort(); // rejects with the abort reason
```

---

## Cloud providers (OpenAI, OpenRouter, Perplexity, ...)

`OpenAICompatibleProvider` speaks the standard OpenAI wire format
(`POST {baseUrl}/chat/completions`, `GET {baseUrl}/models`), so it works with
**any** OpenAI-compatible endpoint. The recommended production setup is
pointing `baseUrl` at a small server-side passthrough that injects your API
key — see [`examples/server`](examples/server) for a ~40-line, zero-dependency
Node proxy (LiteLLM or an API gateway work just as well):

```typescript
import { AIFormFill, OpenAICompatibleProvider } from 'ai-form-fill';

// Via your proxy (recommended): the key stays server-side.
const provider = new OpenAICompatibleProvider('openai', {
  baseUrl: 'https://my-app.com/ai', // your passthrough
});
const aiForm = new AIFormFill(provider);
```

For quick local prototyping you can talk to the API directly — this requires
an explicit opt-in because anyone can read the key from a shipped page:

```typescript
const provider = new OpenAICompatibleProvider('openrouter', {
  apiKey: 'sk-or-...',
  allowApiKeyInBrowser: true, // prototyping only, never production
  model: 'openai/gpt-4o-mini',
});
```

Presets supply default base URLs and models: `openai` → `https://api.openai.com/v1`, `openrouter` → `https://openrouter.ai/api/v1`, `perplexity` → `https://api.perplexity.ai`. Any other OpenAI-compatible service works by name + `baseUrl`:

```typescript
const lmstudio = new OpenAICompatibleProvider('lmstudio', {
  baseUrl: 'http://localhost:1234/v1',
  model: 'qwen2.5-7b-instruct',
});
```

> Note: Perplexity has no `GET /models` endpoint, so `listModels()` /
> `isAvailable()` fail against it directly — set the model explicitly or let
> your proxy answer `/models` (the dev mocks in this repo do exactly that).

---

## Configuration

### Provider options

```typescript
new AIFormFill('ollama', {
  model: 'gemma3:4b',
  baseUrl: 'http://localhost:11434', // optional
  timeout: 40000, // optional, ms
  targetFields: ['firstName', 'email'], // optional whitelist of field keys
  debug: true, // per-instance logging
});
```

Defaults live in the frozen `AFF_DEFAULTS` export; all configuration is
per-instance (there is no global mutable state).

### Field targeting

```typescript
aiForm.setFields(['name', 'phone']); // only fill these
aiForm.setFields(undefined); // back to all fields
```

Fields are identified by a stable key: `name` attribute → `id` →
`field_<n>`, deduplicated on collision. Targeting by `name` therefore works
naturally.

### Field hints (`data-aff-hint`)

Give the model per-field guidance:

```html
<input type="date" name="startDate" data-aff-hint="Use the earliest date mentioned in the text" />
<textarea name="bio" data-aff-hint="Professional summary, max 2 sentences"></textarea>
```

### Models

```typescript
await aiForm.getAvailableModels(); // string[] (throws ProviderError when unreachable)
await aiForm.setSelectedModel('mistral'); // validated against the list; false if not offered
await aiForm.setSelectedModel('sonar', { validate: false }); // set unvalidated
```

---

## Voice input

Voice stays out of the core: speech becomes text (Web Speech API), text goes
into the same `fillForm` call. See [`examples/pages/voice.tsx`](examples/pages/voice.tsx) for a
complete page — the essence is:

```typescript
const recognition = new (window.SpeechRecognition ?? window.webkitSpeechRecognition)();
recognition.onresult = (event) => {
  textarea.value = event.results[0][0].transcript;
};
recognition.start(); // then: aiForm.fillForm(form, textarea.value)
```

Best supported in Chrome; other browsers fall back to typing.

---

## Security & privacy

- **API keys never belong in shipped frontend code.** The library refuses
  `apiKey` in the browser unless you explicitly pass
  `allowApiKeyInBrowser: true` (for local prototyping). Production setups
  point `baseUrl` at a server-side proxy that injects the key —
  [`examples/server`](examples/server) is a complete reference.
- **The source text is sent to the configured provider.** Form-filling input
  is frequently personal data (names, addresses, resumes), which matters
  under GDPR: with the local Ollama provider the text never leaves the
  machine; with cloud providers it goes to that vendor under your agreements
  with them.
- **Treat the text as untrusted (prompt injection).** The text pasted or
  dictated by a user is model input and can contain instructions. The blast
  radius is limited by design — extracted values only land in form fields the
  user can review, constrained by the generated schema — but do **not**
  auto-submit forms after filling, and validate server-side as you would for
  any user input. When the form carries anything consequential, prefer
  [`extract`](#review-before-applying) and an explicit confirmation step over
  `fillForm`.

---

## API overview

### `AIFormFill`

```typescript
new AIFormFill(provider: BuiltInProviderName | AIProvider, options?: AIFormFillOptions)
```

| Method                                                  | Description                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `fillForm(form, text, opts?)`                           | Parse text, fill matching fields → `Promise<FillResult>`     |
| `extract(form, text, opts?)`                            | Parse text only, form untouched → `Promise<ExtractResult>`   |
| `fillField(element, opts?)`                             | Generate + apply content for one field → `{ value } \| null` |
| `setProvider(provider)` / `getProvider()`               | Swap / read the active provider                              |
| `setFields(keys)` / `getFields()`                       | Restrict which fields are filled                             |
| `getAvailableModels()`                                  | Models offered by the provider                               |
| `setSelectedModel(model, opts?)` / `getSelectedModel()` | Choose the model                                             |
| `applyExtraction(data, fields, opts?)`                  | Write a reviewed extraction → `FillResult`                   |
| `isProviderAvailable()`                                 | Reachability check (never throws)                            |

### `createFormFill(options)`

Headless controller around `AIFormFill`:
`{ form, source?, trigger?, provider?, model?, baseUrl?, targetFields?, skipFilled?, debug?, onState? }`
→ `FormFillController`. Throws when an element or selector does not resolve.

### `revertFill(result, keys?)`

Restore the values a `FillResult` overwrote, all of them or only `keys`.

### Providers

`OllamaProvider`, `OpenAICompatibleProvider`, and the `AIProvider` base class
for custom providers (implement `chat`, `listModels`, `isAvailable`). See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow and extension
points.

### Browser support

Evergreen browsers (Chrome, Edge, Firefox, Safari). The library uses standard
DOM APIs, `fetch` and `AbortController` only. The optional voice example
additionally needs the Web Speech API (Chrome).

---

## Examples

Run `pnpm dev` and open the landing page. The demos are one small React app
(`examples/`) styled with [shadcn/ui](https://ui.shadcn.com); React, Tailwind
and shadcn are dev dependencies only, the library itself ships nothing but
the bundle.

| Page                                                    | Description                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| [`pages/basic.tsx`](examples/pages/basic.tsx)           | One-call `createFormFill()` setup                             |
| [`pages/advanced.tsx`](examples/pages/advanced.tsx)     | Provider/model switching, single-field fill, `FillResult` log |
| [`pages/voice.tsx`](examples/pages/voice.tsx)           | Web Speech API transcript into `fillForm`                     |
| [`pages/controlled.tsx`](examples/pages/controlled.tsx) | Controlled React components receive AI-filled values          |
| [`server/`](examples/server)                            | Zero-dependency passthrough proxy for cloud providers         |

The dev server ships passthrough proxies (`mock/*.mock.ts`) for OpenAI,
OpenRouter and Perplexity: copy `.env.example` to `.env`, add a key, pick the
provider in the advanced demo.

## Development

```bash
pnpm install
pnpm dev              # demo pages
pnpm test             # unit tests (no network needed)
pnpm test:integration # requires Ollama + gemma3:4b
pnpm lint && pnpm typecheck && pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.

## Building

`pnpm build` emits to `dist/`:

- `ai-form-fill.js` / `ai-form-fill.umd.cjs` — the bundled library (ESM and UMD)
- `ai-form-fill.d.ts` — rolled-up type declarations

The `.d.ts` keeps all TSDoc comments from the source, so consumers get hover
documentation and IntelliSense. Keep doc comments on exported APIs and leave
`declaration: true` plus the `vite-plugin-dts` plugin enabled.

### PHP / Composer

The package is installable via Composer (`jdeffner/ai-form-fill`) for use in
PHP asset pipelines: `dist/` is tracked in the repository, so include
`dist/ai-form-fill.umd.cjs` (script tag / asset pipeline) or the ESM build
from your bundler. There are no PHP classes — it is a JavaScript asset
package.

## License

[MIT](LICENSE)
