# Framework Guides

This page shows the shortest working integration for each environment: vanilla JavaScript, React,
Vue, Svelte, any framework through the custom element, and server-rendered pages.

The library writes values through the native prototype setters and then dispatches `input` and
`change`, so controlled components in every framework observe a fill exactly like typing. No adapter
is needed.

## Vanilla with your own markup

`createFormFill` resolves elements or selectors and gives you a state machine.

```html
<textarea id="notes"></textarea>
<button id="fill">Fill form</button>
<button id="undo" hidden>Undo</button>
<p id="status"></p>

<form id="contact">
  <input name="name" type="text" />
  <input name="email" type="email" />
</form>
```

```typescript
import { createFormFill } from 'ai-form-fill';

const fillButton = document.querySelector('#fill');
const undoButton = document.querySelector('#undo');
const status = document.querySelector('#status');

const controller = createFormFill({
  form: '#contact',
  source: '#notes',
  trigger: '#fill',
  onState: ({ state, result, error }) => {
    fillButton.disabled = state === 'working';
    undoButton.hidden = state !== 'done';
    if (state === 'working') status.textContent = 'Filling the form.';
    if (state === 'done') status.textContent = `Filled ${result.filled.length} field(s).`;
    if (state === 'error') status.textContent = String(error);
  },
});

undoButton.addEventListener('click', () => controller.undo());
window.addEventListener('pagehide', () => controller.destroy());
```

`fill()` never rejects: a failure lands in the snapshot and resolves to `null`.

## React

`ai-form-fill/react` is one hook. It creates the controller when the form mounts and destroys it
when the form unmounts.

```tsx
import { useState } from 'react';
import { useFormFill } from 'ai-form-fill/react';

export function Contact() {
  const [values, setValues] = useState({ name: '', email: '' });
  const [text, setText] = useState('');
  const { formRef, fill, undo, state, result } = useFormFill();
  const set = (key: 'name' | 'email') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <button disabled={state === 'working'} onClick={() => fill(text)}>
        Fill form
      </button>
      {state === 'done' && <button onClick={undo}>Undo</button>}
      {result && <p>Filled {result.filled.length} field(s).</p>}

      <form ref={formRef}>
        <input name="name" value={values.name} onChange={set('name')} />
        <input name="email" value={values.email} onChange={set('email')} />
      </form>
    </>
  );
}
```

The hook returns `formRef`, `fill`, `extract`, `applyExtracted`, `cancel`, `undo`, `state`, `result`
and `error`. It takes the same options as `createFormFill` minus `form`, `source`, `trigger` and
`onState`.

**Options are read once**, when the controller is created for the mounted form. A new object on
every render does not rebuild it. To switch provider or model, remount the form:

```tsx
<form key={provider} ref={formRef}>
  ...
</form>
```

**StrictMode** mounts, unmounts and remounts in development. The ref callback destroys the
controller and builds a new one, so this is safe; the only visible effect is that the state resets to
`idle` on the second mount.

## Vue

`createFormFill` is plain DOM code, so it belongs in `onMounted`.

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createFormFill, type FormFillController } from 'ai-form-fill';

const form = ref<HTMLFormElement>();
const filled = ref(0);
let controller: FormFillController;

onMounted(() => {
  controller = createFormFill({ form: form.value!, source: '#notes', trigger: '#fill' });
  form.value!.addEventListener('aff:done', (e) => (filled.value = e.detail.filled.length));
});
onUnmounted(() => controller.destroy());
</script>

<template>
  <textarea id="notes"></textarea>
  <button id="fill">Fill form</button>
  <form ref="form">...</form>
  <p v-if="filled">Filled {{ filled }} field(s).</p>
</template>
```

The one-line alternative, with no controller to own:

```vue
<script setup lang="ts">
import { defineFormFillElement } from 'ai-form-fill/ui';
defineFormFillElement();
</script>

<template>
  <ai-form-fill for="#contact" voice />
</template>
```

Add `ai-form-fill` to `compilerOptions.isCustomElement` in your Vite config so Vue leaves the tag
alone.

## Svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createFormFill } from 'ai-form-fill';

  let form: HTMLFormElement;
  let filled = 0;

  onMount(() => {
    const controller = createFormFill({ form, source: '#notes', trigger: '#fill' });
    form.addEventListener('aff:done', (e) => (filled = e.detail.filled.length));
    return () => controller.destroy();
  });
</script>

<textarea id="notes"></textarea>
<button id="fill">Fill form</button>
<form bind:this={form}>...</form>
{#if filled}<p>Filled {filled} field(s).</p>{/if}
```

Svelte passes unknown tags through untouched, so the element needs no compiler configuration.

## Any framework, through the element

`<ai-form-fill>` is a standard custom element, so every framework can render it. Register it once at
module level:

```typescript
import { defineFormFillElement } from 'ai-form-fill/ui';

defineFormFillElement();
```

- **React** renders custom elements natively since 19; for TypeScript, declare the tag once (see
  [Installation and Builds](Installation-and-Builds)).
- **Vue** needs `isCustomElement`, as above.
- **Angular** needs `CUSTOM_ELEMENTS_SCHEMA` on the module or component.
- **Svelte, Solid, Lit and plain HTML** need nothing.

The element resolves its form with `document.querySelector`, so `for` has to point at a form that is
in the document. Inside a component that renders both, put the form before the element.

## Server-rendered pages

Rails, Laravel, Django, ASP.NET, WordPress or any template engine: add one script tag and one
element. There is no build step and nothing to import.

```html
<form id="signup" method="post" action="/signup">
  <input name="full_name" type="text" required />
  <input name="email" type="email" required />
  <select name="country">
    <option value="">Choose</option>
    <option value="de">Germany</option>
    <option value="at">Austria</option>
  </select>
  <button type="submit">Sign up</button>
</form>

<ai-form-fill for="#signup" voice></ai-form-fill>
<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
```

The panel writes values into the form; your existing submit handler and your server-side validation
stay exactly as they are. Never auto-submit after a fill, and validate on the server as you would
for any user input.

For a cloud provider, point `base-url` at a route of your own application that adds the API key:

```html
<ai-form-fill for="#signup" provider="openai" base-url="/ai"></ai-form-fill>
```

See [Running a Proxy](Running-a-Proxy).
