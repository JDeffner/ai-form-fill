# Errors and Troubleshooting

This page lists the error classes the library throws and the failures people actually hit, with the
fix for each.

## Error classes

| Class                | Thrown when                                            | Carries                        |
| -------------------- | ------------------------------------------------------ | ------------------------------ |
| `AFFError`           | Base class; also configuration problems                | `message`                      |
| `ProviderError`      | Network failure, HTTP error status, or timeout         | `provider`, `status?`, `cause` |
| `ResponseParseError` | The model output was empty, not JSON, or not an object | `raw`                          |

```typescript
import { AFFError, ProviderError, ResponseParseError } from 'ai-form-fill';

try {
  await aiForm.fillForm(form, text);
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`${error.provider} failed`, error.status, error.cause);
  } else if (error instanceof ResponseParseError) {
    console.error('Unusable model output:', error.raw);
  } else if (error instanceof AFFError) {
    console.error('Configuration problem:', error.message);
  }
}
```

Catch `AFFError` to handle all of them at once.

Two rules make the rest predictable:

- **Per-field problems never throw.** They land in `FillResult.skipped` with a reason.
- **An abort you triggered is not an error.** A caller's `AbortSignal` rejection passes through
  untouched, so cancelling is distinguishable from failing. The controller and the hook turn it into
  a `null` result instead.

`createFormFill` throws a plain `Error` when the form, source or trigger selector resolves to the
wrong kind of element, with the selector in the message.

## The fill does nothing and the console shows a CORS error

Ollama only answers browser requests from origins it knows. `http://localhost` works, your staging
domain does not.

```bash
OLLAMA_ORIGINS=https://app.example.com ollama serve
```

On Windows, set the `OLLAMA_ORIGINS` environment variable and restart Ollama. Several origins are
comma-separated. Use `*` for local experiments only. The failure reaches your code as a
`ProviderError` saying the connection failed, because the browser hides the reason from JavaScript.

## `ProviderError` with status 401 or 403

The request reached the service but was not authorised.

- Through a proxy: the proxy did not add the key, the key is wrong, or the proxy requires your own
  app's session and the request went out without it.
- Direct: `apiKey` is missing. In a browser, `apiKey` also needs `allowApiKeyInBrowser: true`, and
  the constructor throws an `AFFError` before any request goes out otherwise.

Check `error.status` and `error.provider` to tell the two apart, and try the same call with `curl` to
see the service's own message.

## `ProviderError` with status 404

The base URL is wrong. The library appends `/chat/completions` and `/models`, so `baseUrl` must be
the prefix, not the full endpoint. `https://api.openai.com/v1` is right,
`https://api.openai.com/v1/chat/completions` is not. Trailing slashes are stripped for you.

For a proxy: it must forward exactly those two paths.

## "does not support chat" or a 400 from Ollama

The model is not a chat model, or the local copy is incomplete. Pull it again:

```bash
ollama pull gemma3:4b
ollama run gemma3:4b "hello"
```

Embedding models (`nomic-embed-text` and friends) have no chat endpoint and cannot be used.

## The model ignores the schema

Symptoms: keys that are not in the form, prose around the JSON, option values that were never
offered.

- Check that the provider really enforces schemas. `supportsStructuredOutput()` has to be `true`, and
  a custom provider must translate `ChatRequest.format` into the service's own mechanism.
- Use a bigger or newer model. Very small models drift on long input.
- Shorten the source text. A wall of unrelated text raises the chance of invented values.
- Add `data-aff-hint` to the fields it gets wrong; see [Form Fields and Hints](Form-Fields-and-Hints).

Values that are not in the schema simply end up in `result.unmatchedKeys` and are never written, so
this is a quality problem, not a safety problem.

## `ResponseParseError`

The answer was empty, or it was not a JSON object. `error.raw` holds exactly what came back, which is
usually enough to see the cause: a refusal, a code fence around the JSON, or a truncated answer.

Turn on `debug: true` to log the extracted data and the result, and try the same prompt against the
model directly.

## The result is empty: nothing was filled

Check in this order:

1. `result.unmatchedKeys` is full. The model answered with its own key names. Give the fields proper
   `name` attributes, because keys come from `name` first.
2. `result.skipped` is full. Read the reasons: they say exactly what was rejected.
3. Both are empty. The model found nothing in the text. Check `result.raw`.
4. `skipFilled` is on and the fields already had values, so nothing was requested at all.

## Dates are skipped

The reason is `invalid-date-format`. Values must be ISO (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, `HH:MM`,
`YYYY-MM`, `YYYY-Www`) and are validated against the calendar. A local format like `15.03.1990` is
rejected rather than guessed. Add a hint that tells the model what the source text's date style
means, for example "dates are written day first".

## A select or radio group does not match

The reason is `no-matching-option`. Matching is exact on the value, then on the label, then
case-insensitive on either. There is no substring matching, on purpose.

- Give options human labels. `<option value="de">Germany</option>` matches both "de" and "Germany".
- An `<option value="">` is a placeholder and is never selected.
- Check for stray whitespace or a non-breaking space in the label.

## React state does not update

Values are written through the native prototype setters before the `input` event is dispatched, so
controlled inputs update on their own. If yours does not:

- The component is not a native `<input>`, `<textarea>` or `<select>`. A custom widget that renders a
  `<div>` with roles is not filled.
- The input is uncontrolled and you read the value from state that was never set. Read
  `form.elements` or listen for `aff:done`.
- A UI library keeps a hidden mirror input and paints from its own store. The mirror is filled but the
  visible part does not change. Use the library's native control instead.

## The custom element renders nothing

- `defineFormFillElement()` was never called. The script-tag build calls it for you, module builds do
  not.
- The import ran after the markup and the element never upgraded. Imports at module level are fine;
  a dynamic import inside a click handler is not.
- The panel shows "No form found": `for` points at a selector that does not resolve, or the element
  is not inside a form. Both are resolved with `document.querySelector` when the element connects, so
  the form has to exist at that moment.

## Nothing happens when the microphone is pressed

The browser has no Web Speech API, or permission was denied. See [Voice Input](Voice-Input): the
element hides the microphone when `isDictationSupported()` is `false`, and Firefox never has it.

## Turning on logging

```typescript
new AIFormFill('ollama', { debug: true });
createFormFill({ form: '#contact', debug: true });
```

```html
<ai-form-fill for="#contact" debug></ai-form-fill>
```

It logs the extracted data and the fill result under `[ai-form-fill]`, per instance. There is no
global switch.
