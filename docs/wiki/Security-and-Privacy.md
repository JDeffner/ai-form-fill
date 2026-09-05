# Security and Privacy

This page describes where the data goes, what the library guarantees, and what you have to do
yourself.

Vulnerability reports go through
[the security policy](https://github.com/JDeffner/ai-form-fill/security/advisories/new), not through
a public issue.

## Where the data goes

One fill moves the user's text through this path:

```
user text (typed or dictated)
  -> the browser (never stored by the library)
  -> the configured provider: Ollama on the machine, or an HTTP endpoint you configured
  -> the model's answer, back into the form's fields
```

Nothing else happens. The library writes no storage, sends no telemetry, and calls no endpoint other
than the configured `baseUrl`. It has zero runtime dependencies, so no third-party code is loaded
either.

If the user dictates, there is one more hop **before** all of this: the browser sends the audio to
its vendor's speech service. See [Voice Input](Voice-Input).

## Local versus cloud

|                     | Local Ollama             | Cloud provider                                   |
| ------------------- | ------------------------ | ------------------------------------------------ |
| Where the text goes | Stays on the machine     | To that vendor, under your contract with them    |
| API key             | None                     | Required, and it must stay on your server        |
| GDPR footprint      | None beyond the browser  | A processor, a legal basis, and a privacy notice |
| Quality             | Good with a decent model | Usually better on long or messy text             |

Local Ollama is the default for this reason: a form full of personal data can be filled with nothing
leaving the machine.

## API keys

**Keys do not belong in shipped frontend code.** Anyone can read them out of a bundle or a network
log. `OpenAICompatibleProvider` refuses an `apiKey` in a browser and throws an `AFFError` that says
so.

The escape hatch is explicit and named after what it is:

```typescript
new OpenAICompatibleProvider('openrouter', {
  apiKey: 'sk-or-...',
  allowApiKeyInBrowser: true, // local prototyping only
});
```

Use it on your own machine while you try something, and never in a page you deploy. A key that leaks
because a page shipped it on purpose with this flag is not a library vulnerability; a way around the
check is.

The production setup is a server-side passthrough: [Running a Proxy](Running-a-Proxy). Your proxy
holds the key, authenticates your own users, and rate-limits them.

## Prompt injection

Text the user pastes or dictates is model input, and it can contain instructions. Assume it does.

The design bounds the damage rather than trying to detect the attack:

- Extracted values only ever reach fields of the form that was passed in. There is no selector, no
  path and no element reference in the model's answer, only keys.
- Keys that match no field are collected in `result.unmatchedKeys` and are never written.
- Option-based fields are constrained by an `enum` of the real option values, and matching is exact.
  A value that was not offered cannot be selected.
- Model output is written as a field **value** through native setters and rendered as **text** in the
  element's shadow root. It never becomes markup.
- Nothing is submitted, nothing is stored, and no request other than the provider call is made.

The worst case is therefore a form filled with wrong values, in front of a user who can see them.
That is why the library never auto-submits, and why review mode exists.

Your side of the bargain:

- **Never auto-submit a filled form.** The user has to look at it.
- **Validate on the server** exactly as you would for typed input. A filled field is user input.
- **Prefer the review path** when the form carries anything consequential: money, permissions,
  contracts, medical data.
- Do not feed the model text from an untrusted third party and then submit the result automatically.

## Cross-site scripting

Model output is never inserted as HTML. Field values go through `value`, `checked` and `selected`,
and the element's own labels and summaries are set with `textContent`. Anything that turns model
output into markup or into an executed script is a bug worth reporting.

The element lives in an open shadow root and exposes only the documented `::part` names and `--aff-*`
properties. Anything that reaches the host page beyond that surface is also a bug.

## GDPR notes

This is a practical checklist, not legal advice.

- **Form input is usually personal data.** Names, addresses, dates of birth, CVs. So is the source
  text the user pastes, which is often a whole letter or CV.
- **A cloud provider is a processor.** You need a legal basis, a data processing agreement, and an
  entry in your record of processing activities. Check where the vendor runs and what it does with
  the input.
- **Say it in the privacy notice**: which provider receives the text, in which country, and that
  dictation sends audio to the browser vendor.
- **Local Ollama avoids all of it.** The text never leaves the device, so there is no transfer and no
  processor.
- **Data minimisation.** Use `targetFields` so only the fields you need are described to the model,
  and do not log the source text. Log status codes and timing instead.
- **The library stores nothing.** Retention is entirely a question about your provider and your own
  logs.

## Voice

Dictation uses the browser's Web Speech API. In Chromium the audio is sent to a Google speech
service, in Safari to Apple's. The library never touches the microphone stream itself; it only
receives the transcript. Firefox has no such API, so the microphone is hidden there.

Mention this in your privacy notice, and keep typing available as an alternative.

## What counts as a vulnerability

Reportable: an API key reaching the browser or a provider other than the configured one, extracted
values written outside the given form, model output that becomes markup or script, and any escape
from the shadow root beyond the documented surface.

Not reportable: a model returning wrong values, text going to the provider you configured, a key
leaking because the page shipped it with `allowApiKeyInBrowser: true`, and vulnerabilities in a
provider service, in Ollama, or in the browser's speech API.
