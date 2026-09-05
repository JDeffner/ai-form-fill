# FAQ and Non-Goals

This page answers the questions that come up most, and says plainly what the library does not do.

## Why is there no streaming?

A fill is one request with one JSON answer, and the answer is only useful once it is complete. There
is nothing to show while the tokens arrive: a half-parsed object cannot be written to a form, and
watching fields flicker into place is worse than a spinner and a result. Streaming would add a
parser for partial JSON and a second code path for no benefit.

What you get instead: `aff:start` and `aff:done` for a progress indicator, `aff:field-filled` per
field, and `cancel()` for a request that takes too long.

## Why is there no conversation or agent engine?

The library does one thing: text in, filled form out. It holds no history, sends no follow-up
questions, and never decides to call something. That keeps the blast radius small (see
[Security and Privacy](Security-and-Privacy)) and the API tiny.

If you want a conversation, build it around the library: collect the text your way, then call
`fill(text)`. `extract` and `applyExtraction` exist exactly so a bigger flow can sit between the two
halves.

## Why is Whisper not supported?

Dictation uses the browser's Web Speech API, which needs no model download, no server and no key. A
Whisper integration means either a several hundred megabyte model in the browser or an audio upload
to a server you run, and both are decisions an application makes, not a form-filling library.

It is on the roadmap as an optional adapter behind the same `Dictation` interface, so a page could
swap the recogniser without changing anything else. Until then: `createDictation` produces text, and
so does any other transcription you wire up. `controller.fill(text)` does not care where the text
came from.

## Why no Vue or Svelte packages?

There is nothing for them to do. The library writes values through the native prototype setters and
then dispatches `input` and `change`, so controlled components in every framework already update. A
Vue package would be `onMounted` and `onUnmounted` around `createFormFill`, which is four lines you
can read; see [Framework Guides](Framework-Guides).

React gets a hook because the ref lifecycle and `useSyncExternalStore` wiring are genuinely fiddly,
and because a hook is the only way to make a fill ordinary React state.

`<ai-form-fill>` is a standard custom element, so every framework can use the full UI without any
binding at all.

## Why Ollama by default?

Because it needs no key, no account and no backend, and because the text never leaves the machine.
Form input is usually personal data, so a default that keeps it local is the right default. It also
makes the library usable in a thesis, in a demo and in an offline environment without signing up for
anything.

Ollama enforces JSON schemas, which is what makes small local models reliable enough here: the
model's answer is constrained to the form's own fields and the real option values.

Cloud providers are one option away when you need better quality on long or messy text; see
[Providers](Providers).

## Does it work without a build step?

Yes. One script tag registers the element and puts the whole API on the `AIFormFill` global. See
[Installation and Builds](Installation-and-Builds).

## Does it submit the form?

No, and it never will. The library fills fields, the user checks them, your code submits. A fill is
model output, and model output gets looked at before it becomes an action.

## Can it fill a page that is not a form?

No. `getFormFields` needs an `HTMLFormElement`. If your controls are not inside a form, wrap them in
one, or use `extract()` and write the values yourself with `applyFieldValue(element, value)`.

## Can it fill custom widgets?

Only when a native `<input>`, `<select>` or `<textarea>` is in the DOM and drives the widget. A
widget that renders a `<div>` with ARIA roles and keeps its state in a store does not update. See the
limits section in [Form Fields and Hints](Form-Fields-and-Hints).

## Is there a server-side version?

No. The library is DOM code: it reads a form element and writes to form elements. On a server there
is no form. The provider layer would be reusable, but a Node script that asks a model for JSON does
not need this library.

## What about other input types, like images or PDFs?

Out of scope. The library takes text. Extract the text first, with whatever tool fits, then pass it
to `fill(text)`.

## Thesis background

This library is the practical part of a bachelor thesis on AI-assisted form filling in the browser.
Tag `v1.0.0` is the exact state that was submitted, and it is identical to version 1.0.1 on npm. The
files in `tests/requirements/` trace to the thesis requirements (FR-01 to FR-11) and keep their
`FR-XX` prefixes for that reason.

2.0.0 is a rewrite with breaking changes: a ready-made element, dictation, a headless controller, a
React hook, standard wire formats, lifecycle events and undo. `CHANGELOG.md` lists all of them.

## How do I cite it?

```
Deffner, J. (2026). ai-form-fill: AI-assisted form filling in the browser (Version 1.0.0)
[Computer software]. https://github.com/JDeffner/ai-form-fill
```

Cite `v1.0.0` for the thesis version and the current tag for anything else. The repository is MIT
licensed, so no permission is needed to use or fork it.

## Where do I report a bug or ask for a feature?

- Bugs and features: https://github.com/JDeffner/ai-form-fill/issues
- Security problems: https://github.com/JDeffner/ai-form-fill/security/advisories/new, never a public
  issue.
- Documentation fixes: edit `docs/wiki/` in the repository and open a pull request; see
  [Contributing](Contributing).
