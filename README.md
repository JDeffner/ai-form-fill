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
<form id="aff-form" data-aff-provider="ollama">
  <input type="text" name="name" placeholder="Name" />
  <input type="email" name="email" placeholder="Email" />
  <input type="tel" name="phone" placeholder="Phone" />
</form>

<textarea id="aff-text" placeholder="Paste your text here..."></textarea>
<button id="aff-text-button">Fill Form</button>
```

### JavaScript (one line)

```typescript
import { autoInit } from 'ai-form-fill';

autoInit(); // that's it
```

`autoInit` returns the created `AIFormFill` instance (or `null` with a console
warning when a required element is missing — it never throws).

| Element id        | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `aff-form`        | The form to fill (configurable via `autoInit({ formId })`) |
| `aff-text`        | Textarea holding the source text                           |
| `aff-text-button` | Button that triggers the fill                              |

Attributes on the form: `data-aff-provider` (`ollama`, `openai`, `perplexity`, `openrouter` — case-insensitive, defaults to `ollama`) and optional `data-aff-model`.

---

## Using the class directly

```typescript
import { AIFormFill } from 'ai-form-fill';

const aiForm = new AIFormFill('ollama', { model: 'gemma3:4b', debug: true });

const form = document.getElementById('myForm') as HTMLFormElement;
const text = 'My name is John Doe, email john@example.com, phone 555-1234';

const result = await aiForm.fillForm(form, text);

console.log(result.filled); //  [{ key: 'name', element, value: 'John Doe' }, ...]
console.log(result.skipped); //  [{ key: 'birthDate', reason: 'invalid-date-format' }, ...]
console.log(result.unmatchedKeys); //  keys the model answered that match no field
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
into the same `fillForm` call. See [`examples/voice`](examples/voice) for a
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
  any user input.

---

## API overview

### `AIFormFill`

```typescript
new AIFormFill(provider: BuiltInProviderName | AIProvider, options?: AIFormFillOptions)
```

| Method                                                  | Description                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `fillForm(form, text, opts?)`                           | Parse text, fill matching fields → `Promise<FillResult>`     |
| `fillField(element, opts?)`                             | Generate + apply content for one field → `{ value } \| null` |
| `setProvider(provider)` / `getProvider()`               | Swap / read the active provider                              |
| `setFields(keys)` / `getFields()`                       | Restrict which fields are filled                             |
| `getAvailableModels()`                                  | Models offered by the provider                               |
| `setSelectedModel(model, opts?)` / `getSelectedModel()` | Choose the model                                             |
| `isProviderAvailable()`                                 | Reachability check (never throws)                            |

### `autoInit(options?)`

One-line setup for the quick-start layout. `{ formId?, provider?, model?, debug? }` → `AIFormFill | null`.

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

Run `pnpm dev` and open the landing page:

| Example                          | Description                                                   |
| -------------------------------- | ------------------------------------------------------------- |
| [`basic/`](examples/basic)       | One-line `autoInit()` setup                                   |
| [`advanced/`](examples/advanced) | Provider/model switching, single-field fill, `FillResult` log |
| [`voice/`](examples/voice)       | Web Speech API transcript into `fillForm`                     |
| [`react/`](examples/react)       | Controlled React components receive AI-filled values          |
| [`server/`](examples/server)     | Zero-dependency passthrough proxy for cloud providers         |

The dev server ships passthrough proxies (`mock/*.mock.ts`) for OpenAI,
OpenRouter and Perplexity: copy `.env.example` to `.env`, add a key, pick the
provider in the advanced demo.

---

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
