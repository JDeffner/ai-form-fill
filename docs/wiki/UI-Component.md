# UI Component

This page is the full reference for `<ai-form-fill>`: attributes, properties, states, styling and
accessibility.

The element is plain DOM in a shadow root. It has no dependencies, injects no CSS into your page,
and inherits the page font and text colour, so it reads on light and dark pages.

## Register it

```typescript
import { defineFormFillElement } from 'ai-form-fill/ui';

defineFormFillElement(); // registers <ai-form-fill>
defineFormFillElement('my-fill'); // or under your own tag name
```

Calling it twice, or with a tag that is already taken, does nothing. The script-tag build registers
`ai-form-fill` on load, so there is nothing to call.

```html
<form id="contact">...</form>
<ai-form-fill for="#contact"></ai-form-fill>
```

Leave `for` out when the element sits inside the form.

## Attributes

| Attribute       | Value                                          | Default           | Effect                                                 |
| --------------- | ---------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `for`           | CSS selector                                   | closest `<form>`  | The form to fill                                       |
| `provider`      | `ollama`, `openai`, `perplexity`, `openrouter` | `ollama`          | Built-in provider by name                              |
| `model`         | model id                                       | the provider's    | Model to use                                           |
| `base-url`      | URL                                            | the provider's    | Endpoint, for example your proxy                       |
| `target-fields` | comma-separated keys                           | all fields        | Fill only these fields                                 |
| `skip-filled`   | present or absent                              | absent            | Leave fields that already hold a value alone           |
| `voice`         | present or absent                              | absent            | Show the microphone, if the browser supports dictation |
| `lang`          | BCP 47 tag, e.g. `de-DE`                       | document language | Language of the dictation                              |
| `review`        | present or absent                              | absent            | Extract first, write only what the user checks         |
| `label`         | text                                           | English default   | The label above the text box                           |
| `placeholder`   | text                                           | English default   | The text box placeholder                               |
| `debug`         | present or absent                              | absent            | Console logging for this instance                      |

Changing any of them rebuilds the controller, which cancels an in-flight fill.

## Properties

Three things cannot fit in an attribute.

| Property     | Type                                    | Notes                                                   |
| ------------ | --------------------------------------- | ------------------------------------------------------- |
| `provider`   | `AIProvider` instance or a name         | Wins over the `provider` attribute                      |
| `strings`    | `Partial<AIFormFillStrings>`            | Replaces any piece of text; assign a partial object     |
| `controller` | `FormFillController \| null`, read-only | The controller behind the panel, or `null` with no form |

```typescript
import { OpenAICompatibleProvider } from 'ai-form-fill';

const panel = document.querySelector('ai-form-fill');
panel.provider = new OpenAICompatibleProvider('openai', { baseUrl: '/api/ai' });
panel.controller.subscribe((snapshot) => console.log(snapshot.state));
```

## States

The panel node carries the current state as `data-state`, so your CSS can react to it.

| State       | What is showing                                                      |
| ----------- | -------------------------------------------------------------------- |
| `idle`      | Text box and the fill button                                         |
| `listening` | Dictation is running, the microphone is pressed                      |
| `working`   | The provider request is in flight; Cancel is shown, Fill is disabled |
| `review`    | The extracted values with one checkbox per row; Apply and Discard    |
| `done`      | The result line, the skipped fields, and Undo                        |
| `error`     | The failure message, in the error colour                             |

## Review mode

With the `review` attribute the element extracts first and writes nothing. Every value the model
produced becomes a row with a checkbox, and Apply writes only the checked rows.

```html
<ai-form-fill for="#contact" review></ai-form-fill>
```

Discard drops the extraction and returns to `idle`. The same two halves are available in code; see
[Events, Results and Review](Events-Results-and-Review).

## Undo

After a fill the panel shows Undo, which restores every value the fill overwrote, including empty
strings and unchecked radio groups. It is `revertFill(result)` behind the button.

## Follow-up fills

The text box keeps its content after a fill, so the user can correct the text and press Fill again.
A second fill overwrites what the first one wrote, and its own `previous` values become the new undo
state. Add `skip-filled` when the second pass should only complete the empty fields:

```html
<ai-form-fill for="#contact" skip-filled></ai-form-fill>
```

Fields that already hold a value are then left out of the prompt and the schema entirely.

## Wording

Every piece of text is replaceable through the `strings` property. Import `DEFAULT_STRINGS` to see
or reuse the English wording.

```typescript
import { DEFAULT_STRINGS } from 'ai-form-fill/ui';

const panel = document.querySelector('ai-form-fill');
panel.strings = {
  label: 'Formular mit KI ausfüllen',
  placeholder: 'Beschreiben Sie, was in das Formular soll.',
  fill: 'Ausfüllen',
  statusDone: (filled) => `${filled} Feld(er) ausgefüllt.`,
};
```

| Key               | Type                                            | Where it shows                          |
| ----------------- | ----------------------------------------------- | --------------------------------------- |
| `label`           | `string`                                        | Label above the text box                |
| `placeholder`     | `string`                                        | Text box placeholder                    |
| `fill`            | `string`                                        | Fill button                             |
| `dictate`         | `string`                                        | Microphone button while idle            |
| `listening`       | `string`                                        | Microphone tooltip while listening      |
| `stop`            | `string`                                        | Microphone button while listening       |
| `cancel`          | `string`                                        | Cancel button                           |
| `undo`            | `string`                                        | Undo button                             |
| `apply`           | `string`                                        | Apply button in review mode             |
| `discard`         | `string`                                        | Discard button in review mode           |
| `statusListening` | `string`                                        | Status while dictating                  |
| `statusWorking`   | `string`                                        | Status while the request runs           |
| `statusEmpty`     | `string`                                        | Fill pressed with an empty text box     |
| `statusDone`      | `(filled: number) => string`                    | Status after a fill                     |
| `statusMissing`   | `(labels: string[]) => string`                  | Appended when required fields are empty |
| `statusSkipped`   | `(label: string, reason: SkipReason) => string` | One line per skipped field              |
| `statusReview`    | `string`                                        | Status while the review list is shown   |
| `statusUndone`    | `string`                                        | Status after undo                       |
| `statusNoForm`    | `string`                                        | No form resolved                        |
| `errorProvider`   | `(provider: string, status?: number) => string` | Provider failure                        |
| `errorParse`      | `string`                                        | Unreadable model answer                 |
| `errorUnknown`    | `string`                                        | Anything else                           |

## Styling

### Custom properties

Set them on the element or on any ancestor.

| Property          | Default                                             | Used for                                              |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `--aff-accent`    | `#1d4ed8`                                           | Fill and Apply buttons, focus ring, active microphone |
| `--aff-accent-fg` | `#fff`                                              | Text on the accent buttons                            |
| `--aff-border`    | `color-mix(in srgb, currentColor 22%, transparent)` | Panel, text box and button borders                    |
| `--aff-muted`     | `color-mix(in srgb, currentColor 65%, transparent)` | Status line and review values                         |
| `--aff-radius`    | `8px`                                               | Corner radius everywhere                              |
| `--aff-gap`       | `8px`                                               | Gap between rows and buttons                          |
| `--aff-font`      | `inherit`                                           | Panel font shorthand                                  |

```css
ai-form-fill {
  --aff-accent: #111;
  --aff-radius: 4px;
}
```

### Parts

Every node is exposed, so `::part()` can restyle it.

| Part                                                         | Node                                |
| ------------------------------------------------------------ | ----------------------------------- |
| `panel`                                                      | The outer box, carries `data-state` |
| `label`, `textarea`, `actions`, `status`, `summary`          | The main regions                    |
| `mic`, `mic-label`                                           | Microphone button and its text      |
| `submit`, `cancel`, `undo`, `apply`, `discard`               | The buttons                         |
| `summary-row`                                                | One skipped-field line              |
| `review-row`, `review-check`, `review-label`, `review-value` | One review row and its three parts  |

```css
ai-form-fill::part(submit) {
  text-transform: uppercase;
}
ai-form-fill::part(panel) {
  border-style: dashed;
}
```

### Highlighting the filled fields

Every field the element writes carries `data-aff-filled` for 1.5 seconds. The attribute is on your
own inputs, not in the shadow root, so one plain rule is enough:

```css
[data-aff-filled] {
  outline: 2px solid #3b82f6;
  transition: outline-color 0.4s;
}
```

## Accessibility

- The status line is a live region (`role="status"`, `aria-live="polite"`), so a screen reader
  announces "Filling the form", the result and the missing required fields. On a failure the role
  switches to `alert`.
- The panel gets `aria-busy="true"` while the request is in flight.
- The microphone button is a toggle with `aria-pressed`, and its tooltip changes with the state.
- Keyboard: `Ctrl` + `Enter` (or `Cmd` + `Enter`) runs a fill from the text box, `Escape` stops a
  running dictation and drops what it heard.
- The focus ring uses `--aff-accent` through `:focus-visible`, so it follows your accent colour.
- The text box has a real `<label>`, so set `label` to something your users understand.
