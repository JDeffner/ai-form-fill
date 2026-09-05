# ai-form-fill

Fill any HTML form from text or speech. The user pastes a paragraph or talks,
an LLM reads it, and the fields get filled. The library reads your form, builds
a JSON schema from it (with the real option values as enums), asks the model,
and writes the answer back through native setters, so vanilla pages, React,
Vue and Svelte all pick the values up. It runs against local
[Ollama](https://ollama.com) with no key and no backend, or against any
OpenAI-compatible API. Zero runtime dependencies.

- **Live demo:** https://jdeffner.github.io/ai-form-fill/
- **API reference:** https://jdeffner.github.io/ai-form-fill/api/
- **Guides and recipes:** https://github.com/JDeffner/ai-form-fill/wiki

## Three ways to use it

| You want                         | Use                                                           |
| -------------------------------- | ------------------------------------------------------------- |
| A finished panel, no build step  | A script tag plus `<ai-form-fill>`                            |
| A finished panel inside your app | `import 'ai-form-fill/ui'` plus `<ai-form-fill>`              |
| Your own interface               | `createFormFill()`, `useFormFill()` or the `AIFormFill` class |

The element is built on the controller, the controller is built on the class.
Start high and drop a level when you need to.

## Install

```bash
npm install ai-form-fill
```

Or skip the install. One script tag registers the element and puts the whole
API on the `AIFormFill` global:

```html
<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
```

## Quick start

Install Ollama and pull a model, so nothing leaves the machine:

```bash
ollama pull gemma3:4b
```

Then put the element next to your form:

```html
<form id="contact">
  <input name="name" type="text" />
  <input name="email" type="email" />
  <input name="phone" type="tel" />
</form>

<ai-form-fill for="#contact"></ai-form-fill>
```

```typescript
import { defineFormFillElement } from 'ai-form-fill/ui';

defineFormFillElement();
```

That is the whole setup. The panel gives the user a text box, a fill button,
live status, a summary of what was filled and what is still missing, and undo.
It is plain DOM in a shadow root, it injects no CSS into your page, and it
inherits the page font and text colour, so it reads on light and dark pages.
Leave `for` out when the element sits inside the form.

Attributes: `for`, `provider`, `model`, `base-url`, `target-fields`,
`skip-filled`, `voice`, `lang`, `review`, `label`, `placeholder`, `debug`.
Three things go beyond what an attribute can carry, as properties: `provider`
takes an `AIProvider` instance, `strings` replaces any text, and `controller`
is the read-only controller behind the panel.

Style it through custom properties and parts:

```css
ai-form-fill {
  --aff-accent: #111;
  --aff-radius: 4px;
}
ai-form-fill::part(submit) {
  text-transform: uppercase;
}
```

Every field the element writes carries `data-aff-filled` for 1.5 seconds, so
one CSS rule of yours can show what just changed.

## Your own interface

`createFormFill` is the same wiring without the markup. It takes elements or
selectors, and returns a headless controller.

```typescript
import { createFormFill } from 'ai-form-fill';

const controller = createFormFill({
  form: '#contact',
  source: '#notes',
  trigger: '#fill',
  onState: ({ state, result }) => {
    button.disabled = state === 'working';
    if (result) console.log(`Filled ${result.filled.length} field(s)`);
  },
});
```

It exposes `fill(text?)`, `extract(text?)`, `applyExtracted(data, fields)`,
`cancel()`, `undo()`, `subscribe(fn)`, `getSnapshot()`, `destroy()` and the
underlying `instance`. The state is `idle`, `working`, `done` or `error`.
`getSnapshot` and `subscribe` follow the external-store contract, so
`useSyncExternalStore` reads them directly. Other options: `provider`, `model`,
`baseUrl`, `targetFields`, `skipFilled`, `debug`.

The class underneath does one fill per call and holds no DOM:

```typescript
import { AIFormFill } from 'ai-form-fill';

const aiForm = new AIFormFill('ollama', { model: 'gemma3:4b' });
const result = await aiForm.fillForm(form, 'John Doe, john@example.com, 555-1234');
```

## Providers

Local Ollama is the default and needs no configuration.
`OpenAICompatibleProvider` speaks the standard OpenAI wire format
(`POST {baseUrl}/chat/completions`, `GET {baseUrl}/models`), so it works with
any compatible endpoint. Presets supply base URLs for `openai`, `openrouter`
and `perplexity`; anything else works by name plus `baseUrl`.

Point `baseUrl` at a server-side passthrough that adds your API key.
[`examples/server`](examples/server) is a 40-line, zero-dependency Node proxy;
LiteLLM or an API gateway do the same job.

```typescript
import { AIFormFill, OpenAICompatibleProvider } from 'ai-form-fill';

const provider = new OpenAICompatibleProvider('openai', {
  baseUrl: 'https://my-app.com/ai', // your proxy, the key stays server-side
});
const aiForm = new AIFormFill(provider);
```

For local prototyping you can talk to the API directly, which needs an explicit
opt-in because anyone can read a key out of a shipped page:

```typescript
const provider = new OpenAICompatibleProvider('openrouter', {
  apiKey: 'sk-or-...',
  allowApiKeyInBrowser: true, // prototyping only, never production
  model: 'openai/gpt-4o-mini',
});
```

## Review before writing

With the `review` attribute the element extracts first and writes nothing. It
lists one row per value with a checkbox, and Apply writes only the checked
rows.

```html
<ai-form-fill for="#contact" review></ai-form-fill>
```

The same pair is available directly. `extract` runs the request and the parsing
but leaves the form alone; `applyExtraction` writes a reviewed extraction and
returns the same `FillResult` as a fill.

```typescript
const { data, fields } = await aiForm.extract(form, text);
const edited = await showReviewUI(data); // { firstName: 'John', ... }
const result = aiForm.applyExtraction(edited, fields);
```

## Voice

Add the `voice` attribute and the panel shows a microphone, but only when the
browser has the Web Speech API. One gesture is enough: press, speak, stop
speaking. After 1.5 seconds of silence the dictation ends and the fill starts.

```html
<ai-form-fill for="#contact" voice lang="de-DE"></ai-form-fill>
```

Speech is a separate entry point, so importing the core pulls in no speech
code. Use it directly when you build your own panel:

```typescript
import { createDictation, isDictationSupported } from 'ai-form-fill/voice';

if (isDictationSupported()) {
  const dictation = createDictation({
    onText: (text) => (textarea.value = text), // full transcript so far
    onEnd: (text) => controller.fill(text), // once, after stop or silence
  });
  micButton.addEventListener('click', () =>
    dictation.listening ? dictation.stop() : dictation.start(),
  );
}
```

Chromium browsers and Safari have the Web Speech API, Firefox does not, so
offer typing as well. Chromium sends the audio to a Google speech service,
which is worth a line in your privacy notice.

## React

`ai-form-fill/react` is one hook. It creates the controller when the form
mounts, destroys it when the form unmounts, and reports the state as plain
React state. `react` is an optional peer dependency.

```tsx
import { useState } from 'react';
import { useFormFill } from 'ai-form-fill/react';

export function Contact() {
  const [values, setValues] = useState({ name: '', email: '' });
  const [text, setText] = useState('');
  const { formRef, fill, state, result } = useFormFill();
  const set = (key: 'name' | 'email') => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button disabled={state === 'working'} onClick={() => fill(text)}>
        Fill form
      </button>
      {result && <p>Filled {result.filled.length} field(s).</p>}
      <form ref={formRef}>
        <input name="name" value={values.name} onChange={set('name')} />
        <input name="email" value={values.email} onChange={set('email')} />
      </form>
    </>
  );
}
```

Controlled inputs need no extra code: values are written through the native
prototype setters before the `input` event, so React state updates on a fill
exactly like on typing.

## Results, events and undo

`fillForm` resolves to a `FillResult`:

```typescript
result.filled; // [{ key, element, value, previous }, ...]
result.skipped; // [{ key, reason }, ...] e.g. 'invalid-date-format'
result.unmatchedKeys; // keys the model answered that match no field
result.missingRequired; // required fields that are still empty
result.raw; // raw model output, for debugging
```

Because every entry records `previous`, a fill can be taken back exactly,
including empty strings and unchecked radio groups:

```typescript
import { revertFill } from 'ai-form-fill';

revertFill(result); // everything back
revertFill(result, ['email']); // or one field
```

Every fill also reports itself as DOM events on the form. They bubble and
cross shadow boundaries, so one listener serves a whole page, and the names are
in `HTMLElementEventMap`, so `event.detail` is typed.

| Event              | `detail`                            | When                        |
| ------------------ | ----------------------------------- | --------------------------- |
| `aff:start`        | `{ text }`                          | Before the provider request |
| `aff:field-filled` | `{ key, element, value, previous }` | After a field was written   |
| `aff:done`         | The `FillResult`                    | After the fill finished     |
| `aff:error`        | `{ error }`                         | Extraction failed           |

Provider and parsing failures reject with typed errors instead of failing
silently: `ProviderError` (with `provider` and `status`) and
`ResponseParseError` (with `raw`). Per-field problems never throw; they land in
`result.skipped` with a reason.

## API overview

| Export                                | What it is                                                               |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `AIFormFill`                          | The class: `fillForm`, `extract`, `applyExtraction`, `fillField`, models |
| `createFormFill(options)`             | Headless controller around a form, a text source and a trigger           |
| `revertFill(result, keys?)`           | Undo a fill, all fields or some                                          |
| `getFormFields`, `applyFieldValue`    | The form engine, for building your own apply step                        |
| `OllamaProvider`                      | Local Ollama, the default                                                |
| `OpenAICompatibleProvider`            | Any OpenAI-compatible endpoint                                           |
| `AIProvider`                          | Base class for a custom provider                                         |
| `ProviderError`, `ResponseParseError` | Typed failures                                                           |
| `ai-form-fill/ui`                     | `defineFormFillElement`, `AIFormFillElement`, `DEFAULT_STRINGS`          |
| `ai-form-fill/voice`                  | `createDictation`, `isDictationSupported`                                |
| `ai-form-fill/react`                  | `useFormFill`                                                            |

Every symbol, option and type is documented in the
[API reference](https://jdeffner.github.io/ai-form-fill/api/); the
[wiki](https://github.com/JDeffner/ai-form-fill/wiki) has the longer guides.
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the data flow and the
extension points.

## Security and privacy

- **API keys do not belong in shipped frontend code.** The library refuses
  `apiKey` in a browser unless you pass `allowApiKeyInBrowser: true`, which is
  for local prototyping. Production points `baseUrl` at a server-side proxy.
- **The text goes to the configured provider.** Form input is often personal
  data (names, addresses, CVs), which matters under the GDPR. With local Ollama
  the text never leaves the machine; with a cloud provider it goes to that
  vendor under your agreement with them.
- **Treat the text as untrusted.** Text a user pastes or dictates is model
  input and can contain instructions. The blast radius is limited by design,
  because extracted values only reach fields of the given form and are
  constrained by the generated schema. Still: do not auto-submit a filled form,
  validate server-side as you would any user input, and prefer the review path
  when the form carries anything consequential.

See [SECURITY.md](SECURITY.md) for what counts as a vulnerability and how to
report one.

## Browser support

Evergreen browsers (Chrome, Edge, Firefox, Safari). The library uses standard
DOM APIs, `fetch` and `AbortController` only. `<ai-form-fill>` needs custom
elements and shadow DOM, which all four have. The optional
`ai-form-fill/voice` entry additionally needs the Web Speech API, which Firefox
does not have.

## Examples

The [live demo](https://jdeffner.github.io/ai-form-fill/) runs the pages below.
Run them locally with `pnpm install && pnpm dev`.

| Page                                                    | Shows                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| [`pages/element.tsx`](examples/pages/element.tsx)       | `<ai-form-fill>` in React, with the `voice` and `review` toggles |
| [`pages/controller.tsx`](examples/pages/controller.tsx) | Headless `createFormFill`, state machine, undo, `FillResult`     |
| [`pages/voice.tsx`](examples/pages/voice.tsx)           | `createDictation` transcript into `fillForm`                     |
| [`pages/react.tsx`](examples/pages/react.tsx)           | `useFormFill` with controlled inputs                             |
| [`pages/advanced.tsx`](examples/pages/advanced.tsx)     | Provider switching, single-field fill, `aff:*` event log         |
| [`vanilla.html`](examples/vanilla.html)                 | The script tag path, no framework, no build step                 |
| [`snippets/`](examples/snippets)                        | Vue and Svelte snippets                                          |
| [`server/`](examples/server)                            | Zero-dependency passthrough proxy for cloud providers            |

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) has
the setup, the scripts, the layout of the demo app and the release process;
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies.

```bash
pnpm install
pnpm dev                                            # demo pages
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`dist/` is tracked in the repository, because the package is also installable
through Composer (`jdeffner/ai-form-fill`) for PHP asset pipelines. There are
no PHP classes; it is a JavaScript asset package.

## Thesis version

Tag `v1.0.0` is the state of the library submitted with the bachelor thesis,
and it is identical to version 1.0.1 on npm. 2.0.0 is a rewrite with breaking
changes; [CHANGELOG.md](CHANGELOG.md) lists all of them.

## License

[MIT](LICENSE)
