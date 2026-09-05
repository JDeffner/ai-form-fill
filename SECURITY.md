# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| 1.x     | No        |
| 0.x     | No        |

Only the current 2.x release gets fixes. 1.0.1 is the version submitted with the
bachelor thesis and is kept for reference only.

## Reporting a vulnerability

Report privately through GitHub, not in a public issue:

https://github.com/JDeffner/ai-form-fill/security/advisories/new

Please include the version, the entry point and provider you used, a minimal
form and text that reproduce the problem, and what an attacker gains. You get a
first answer within 14 days. If a fix is needed, the advisory stays private
until the release is out.

## What counts as a vulnerability

- **API key leakage.** Any path where a key reaches a browser bundle, the
  network log of a page, or a provider other than the configured one. The
  library refuses `apiKey` in a browser unless the caller passes
  `allowApiKeyInBrowser: true`, so a way around that check is a bug.
- **Prompt injection that writes outside the form.** Extracted values must only
  reach fields of the form that was passed in. Text that makes the library write
  to another element, to storage, or to the network is a bug.
- **Cross-site scripting through model output.** Model output is written as
  field values through native setters and rendered as text in the
  `<ai-form-fill>` shadow root. Output that ends up as markup or as executed
  script is a bug.
- **Escape from the shadow root.** Element internals that let page content or
  model output reach the host page beyond the documented `::part` and `--aff-*`
  surface.

## What does not count

- A model returning wrong or nonsensical values. Field values are visible and
  reviewable by design. Do not auto-submit a filled form.
- Text being sent to the configured provider. That is what the library does. Use
  the local Ollama provider when the text must not leave the machine.
- A key that leaks because the page shipped it on purpose with
  `allowApiKeyInBrowser: true`. That flag is for local prototyping and says so.
- Vulnerabilities in a provider service, in Ollama, or in the browser speech
  API. Report those to their vendors.
