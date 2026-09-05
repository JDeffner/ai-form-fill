# ai-form-fill wiki

This is the entry point of the guides: what the library does, and where every topic lives.

`ai-form-fill` fills any HTML form from text or speech. The user pastes a paragraph or talks, the
library reads the form, builds a JSON schema from it, asks a model, and writes the answer back
through native setters. It runs against local [Ollama](https://ollama.com) with no key and no
backend, or against any OpenAI-compatible API, and it has zero runtime dependencies.

## The shortest working page

```html
<form id="contact">
  <input name="name" type="text" />
  <input name="email" type="email" />
</form>
<ai-form-fill for="#contact"></ai-form-fill>
<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
```

Install Ollama and run `ollama pull gemma3:4b` once, then open the page. See
[Getting Started](Getting-Started) for the same thing with npm, and for the controller and class
paths.

## Use it

- [Getting Started](Getting-Started) — install, Ollama, the first fill in three ways.
- [Installation and Builds](Installation-and-Builds) — npm, script tag, entry points, types.
- [UI Component](UI-Component) — every attribute, part and custom property of `<ai-form-fill>`.
- [Voice Input](Voice-Input) — `createDictation`, browser support, permissions.
- [Framework Guides](Framework-Guides) — vanilla, React, Vue, Svelte, server-rendered pages.

## Configure

- [Providers](Providers) — Ollama, OpenAI-compatible services, custom providers.
- [Running a Proxy](Running-a-Proxy) — keep the API key on the server.
- [Form Fields and Hints](Form-Fields-and-Hints) — supported controls, keys, labels, hints.
- [Events, Results and Review](Events-Results-and-Review) — `aff:*` events, `FillResult`, undo.

## Understand

- [Architecture](Architecture) — the data flow and the extension points.
- [Security and Privacy](Security-and-Privacy) — where the data goes, and what to guard.
- [Errors and Troubleshooting](Errors-and-Troubleshooting) — error classes and common failures.

## Contribute

- [Contributing](Contributing) — setup, scripts, tests, pull request rules.
- [Releasing](Releasing) — version policy, tags, npm publish, docs deploy.
- [FAQ and Non-Goals](FAQ-and-Non-Goals) — what the library does not do, and why.

## Elsewhere

- Live demo: https://jdeffner.github.io/ai-form-fill/
- API reference: https://jdeffner.github.io/ai-form-fill/api/
- Source: https://github.com/JDeffner/ai-form-fill
