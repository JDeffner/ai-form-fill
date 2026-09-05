# Getting Started

This page takes you from an empty project to a first filled form, with local Ollama and no API key.

## Install

```bash
npm install ai-form-fill
```

`pnpm add ai-form-fill` and `yarn add ai-form-fill` work the same. You can also skip the install and
use a script tag; see [Installation and Builds](Installation-and-Builds).

## Set up Ollama

Ollama runs the model on your machine, so no text leaves it and no key is needed.

1. Install [Ollama](https://ollama.com).
2. Pull the default model:

   ```bash
   ollama pull gemma3:4b
   ```

3. Check that it answers: `curl http://localhost:11434/api/tags`.

The library talks to `http://localhost:11434` by default.

### CORS, when your page is not on localhost

Ollama only accepts browser requests from origins it knows. A page on `http://localhost:5173`
works out of the box. A page on any other origin needs the origin in `OLLAMA_ORIGINS`:

```bash
OLLAMA_ORIGINS=https://app.example.com ollama serve
```

On Windows set the `OLLAMA_ORIGINS` environment variable and restart Ollama. Without it the fill
fails with a `ProviderError` that says the connection failed, and the browser console shows a CORS
error. See [Errors and Troubleshooting](Errors-and-Troubleshooting).

## The first fill, three ways

All three do the same work. Pick the highest one that fits, and drop a level when you need more
control.

### 1. The element

The panel with a text box, a fill button, status, a summary and undo.

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

Full reference: [UI Component](UI-Component).

### 2. The controller

Your markup, the library's wiring: it resolves the form, the text source and the trigger, and
reports an `idle` / `working` / `done` / `error` state.

```html
<textarea id="notes"></textarea>
<button id="fill">Fill form</button>
<form id="contact">
  <input name="name" type="text" />
  <input name="email" type="email" />
</form>
```

```typescript
import { createFormFill } from 'ai-form-fill';

const button = document.querySelector('#fill');

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

Call `controller.destroy()` when the page or the component goes away.

### 3. The class

One fill per call, no DOM of its own.

```typescript
import { AIFormFill } from 'ai-form-fill';

const form = document.querySelector('#contact');
const aiForm = new AIFormFill('ollama', { model: 'gemma3:4b' });

const result = await aiForm.fillForm(form, 'John Doe, john@example.com, 555-1234');
console.log(result.filled.map((entry) => entry.key));
```

## What happens under the hood

1. `getFormFields(form)` reads every fillable control and gives each a stable key.
2. The prompt and a JSON schema are built from those fields, with the real option values as enums.
3. The provider is called (`POST /api/chat` for Ollama).
4. The answer is parsed into a `Record<string, unknown>` keyed by the field keys.
5. Each value is written through the native setters, with `input` and `change` events, and the
   outcome is reported as a `FillResult`.

The details are in [Architecture](Architecture).

## Next

- Change the model or the service: [Providers](Providers).
- Let the user speak instead of typing: [Voice Input](Voice-Input).
- React to a fill in your own code: [Events, Results and Review](Events-Results-and-Review).
