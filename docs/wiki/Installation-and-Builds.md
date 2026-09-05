# Installation and Builds

This page covers every way to get the library into a page, and what each build output contains.

## Package managers

```bash
npm install ai-form-fill
pnpm add ai-form-fill
yarn add ai-form-fill
```

Node 20 or newer is required for the build tooling; the library itself only needs a browser with
`fetch` and `AbortController`. `react` is an optional peer dependency (`>=18`) and is only needed
for `ai-form-fill/react`.

## Script tag

One tag registers `<ai-form-fill>` and puts the whole API on the `AIFormFill` global. No bundler, no
import.

```html
<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
```

unpkg serves the same file:

```html
<script src="https://unpkg.com/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
```

Pin the version for production. `@2` follows every 2.x release, `@2.0.0` never changes:

```html
<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2.0.0/dist/ai-form-fill.browser.js"></script>
```

From the global:

```html
<script>
  const { createFormFill, revertFill, OllamaProvider } = window.AIFormFill;
  const controller = createFormFill({ form: '#contact', source: '#notes', trigger: '#fill' });
</script>
```

Load the script after the form, or at the end of `<body>`, so the element finds the form it points
at on its first connect. If you load it in `<head>`, add `defer`.

## Entry points

| Import path          | ESM file                       | What it holds                                                   |
| -------------------- | ------------------------------ | --------------------------------------------------------------- |
| `ai-form-fill`       | `dist/ai-form-fill.js`         | `AIFormFill`, `createFormFill`, providers, form engine, errors  |
| `ai-form-fill/ui`    | `dist/ui.js`                   | `defineFormFillElement`, `AIFormFillElement`, `DEFAULT_STRINGS` |
| `ai-form-fill/voice` | `dist/voice.js`                | `createDictation`, `isDictationSupported`                       |
| `ai-form-fill/react` | `dist/react.js`                | `useFormFill`                                                   |
| script tag           | `dist/ai-form-fill.browser.js` | All of the above on the `AIFormFill` global, element registered |

The split is deliberate: importing the core pulls in no markup, no speech code and no React.

## ESM and CommonJS

Every entry point ships both. `import` resolves to the `.js` file, `require` to the `.cjs` file:

```typescript
import { AIFormFill } from 'ai-form-fill';
```

```javascript
const { AIFormFill } = require('ai-form-fill');
```

`dist/ai-form-fill.browser.js` is a minified IIFE for plain script tags. It is the only file with a
side effect (it registers the element on load).

## TypeScript

Types ship with the package; no `@types` install is needed. Each entry point has a rolled-up
declaration file (`dist/ai-form-fill.d.ts`, `dist/ui.d.ts`, `dist/voice.d.ts`, `dist/react.d.ts`)
with the TSDoc comments preserved.

The core declaration also augments `HTMLElementEventMap`, so `event.detail` is typed in a listener:

```typescript
form.addEventListener('aff:done', (event) => {
  console.log(event.detail.filled.length); // FillResult
});
```

The custom element is not in React's tag list, so a React app declares it once. An empty string
means "attribute present":

```tsx
import type { HTMLAttributes } from 'react';

type FormFillElementProps = HTMLAttributes<HTMLElement> & {
  for?: string;
  voice?: '';
  review?: '';
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ai-form-fill': FormFillElementProps;
    }
  }
}
```

## Composer and git installs

`dist/` is tracked in the repository, so the package can be installed straight from git. This is for
PHP asset pipelines; there are no PHP classes, it is a JavaScript asset package.

```json
{
  "repositories": [{ "type": "vcs", "url": "https://github.com/JDeffner/ai-form-fill" }],
  "require": { "jdeffner/ai-form-fill": "^2.0" }
}
```

The files land in `vendor/jdeffner/ai-form-fill/dist/`. Serve
`dist/ai-form-fill.browser.js` from your asset route, or point your bundler at `dist/ai-form-fill.js`.

The same applies to a plain git dependency in `package.json`:

```json
{ "dependencies": { "ai-form-fill": "github:JDeffner/ai-form-fill#v2.0.0" } }
```

Because `dist/` is committed, no install-time build step runs.
