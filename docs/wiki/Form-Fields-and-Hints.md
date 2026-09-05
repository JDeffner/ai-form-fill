# Form Fields and Hints

This page describes which controls the library reads, what the model is told about each one, how a
value is applied, and how to steer the extraction from your markup.

## Which controls are read

`getFormFields(form)` returns every `<input>`, `<textarea>` and `<select>` inside the form, in
document order, except `submit`, `reset`, `button`, `image`, `hidden` and `file` inputs.

| Control                                             | The model is told                                    | How the value is applied                                |
| --------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `text`, `email`, `tel`, `url`, `search`, `password` | Type, label, placeholder, `pattern`; schema `string` | Written as text (`url` also carries `format: 'uri'`)    |
| `number`, `range`                                   | Schema `number`                                      | Coerced to a string and written                         |
| `<textarea>`                                        | Type `textarea`; schema `string`                     | Written as text                                         |
| `date`                                              | Format `YYYY-MM-DD`; schema `format: 'date'`         | Validated as a real calendar date, then written         |
| `datetime-local`                                    | Format `YYYY-MM-DDTHH:MM`; regex schema              | Validated, then written                                 |
| `time`                                              | Format `HH:MM` (24h); regex schema                   | `9:30` is padded to `09:30`, then validated and written |
| `month`                                             | Format `YYYY-MM`; regex schema                       | Validated, then written                                 |
| `week`                                              | Format `YYYY-Www`; regex schema                      | Validated, then written                                 |
| `<select>`                                          | The options as an `enum` of their real values        | Matched against the options, then written               |
| `<select multiple>`                                 | An array schema with the same `enum`                 | Every matching option is selected                       |
| Radio group (same `name`)                           | One field, options as an `enum`                      | The matching radio is checked                           |
| Single checkbox                                     | Schema `boolean`                                     | Checked or unchecked                                    |
| Checkbox group (same `name`)                        | One multi-value field, options as an `enum`          | Every matching box is checked, the others are unchecked |
| Other input types (`color`, ...)                    | Schema `string`                                      | Written as text                                         |

Radio buttons and checkboxes that share a `name` become one field, positioned where the first member
sits. Values are written through the native prototype setters and followed by `input` and `change`
events, so controlled components in React, Vue and Svelte update.

## Field keys

Every field gets one stable key, and the prompt, the JSON schema and the fill step all use it. It is
derived once, in this order:

1. the `name` attribute,
2. the `id` attribute,
3. `field_<n>`, counting from 1 in document order.

Collisions are deduplicated with a numeric suffix: a second field that would be called `email`
becomes `email_2`.

The keys are what you see in a `FillResult`, and what `targetFields` matches against. Because `name`
comes first, targeting by the name attribute works naturally.

## Labels

A good label is the strongest signal the model gets. They are resolved in this order:

1. `<label for="...">` matching the field's `id`,
2. a `<label>` the field sits inside,
3. `aria-label`,
4. `aria-labelledby` (the referenced elements' text, joined),
5. `title`.

For radios and checkboxes, the label of each option is resolved the same way and becomes the option
label. The `placeholder` and the `pattern` attributes are sent as well, so they are worth filling in.

## Hints

`data-aff-hint` adds one sentence of guidance for a single field. It goes into the prompt and into
the schema description.

```html
<input name="ref" data-aff-hint="The six-digit customer number, not the invoice number." />
<input name="salary" type="number" data-aff-hint="Yearly gross, in euros, digits only." />
```

On a radio or checkbox group, the hints of all members are merged into one, so you can put a hint on
whichever option needs the explanation.

Use hints for what the label cannot say: the unit, the expected precision, which of two similar
fields wins, or a house rule ("use the legal name, not the trading name").

## Targeting fields

`targetFields` restricts a fill to a list of keys. Everything else is left out of the prompt, the
schema and the fill.

```typescript
new AIFormFill('ollama', { targetFields: ['name', 'email'] });
createFormFill({ form: '#contact', targetFields: ['name', 'email'] });
```

```html
<ai-form-fill for="#contact" target-fields="name,email"></ai-form-fill>
```

The class can change it later with `setFields(['name'])`, or `setFields(undefined)` for all fields.

`missingRequired` is still computed over the whole form, so a targeted fill still tells you what the
user has to complete by hand.

## Skipping filled fields

`skipFilled` excludes every field that already holds a value. They never reach the prompt, so the
model does not answer for them and they can never be overwritten.

```typescript
await aiForm.fillForm(form, text, { skipFilled: true });
createFormFill({ form: '#contact', skipFilled: true });
```

```html
<ai-form-fill for="#contact" skip-filled></ai-form-fill>
```

A field counts as empty when it has an empty string, no selected option, an unchecked radio group, or
an unchecked checkbox.

## Date and time formats

Values must be ISO, and they are validated before they are written. Anything else is skipped with
`invalid-date-format` rather than guessed, so `15.03.1990` never silently becomes a 1991 date.

| Input type       | Format             | Example            |
| ---------------- | ------------------ | ------------------ |
| `date`           | `YYYY-MM-DD`       | `1990-03-15`       |
| `datetime-local` | `YYYY-MM-DDTHH:MM` | `2026-09-05T14:30` |
| `time`           | `HH:MM` (24h)      | `14:30`            |
| `month`          | `YYYY-MM`          | `2026-09`          |
| `week`           | `YYYY-Www`         | `2026-W36`         |

Seconds are accepted for `time` and `datetime-local`. A `date` is also checked against the calendar,
so `2026-02-30` is rejected. Add a hint when your users write dates in a local format and the model
needs the reminder.

## How options are matched

The value the model returns is matched against the options in this order:

1. exact match on the option's `value`,
2. exact match on the option's label,
3. case-insensitive and whitespace-collapsed match on either.

There is no substring matching, so `male` can never select `Female`. If nothing matches, the field is
skipped with `no-matching-option`.

An `<option value="">` is treated as a placeholder: it is not offered to the model and never
selected. Because the schema carries the real values as an `enum`, a structured-output provider
usually returns an exact match in the first place.

For a single checkbox, `true`, `yes`, `1`, `checked` and `on` check it, `false`, `no`, `0`,
`unchecked` and `off` uncheck it, and the checkbox's own value or label also means "check it".

## Values that mean "nothing"

A model often answers with a word instead of leaving the key out. These are treated as "no value",
and the field is left untouched with the skip reason `empty-value`: an empty string, `null`, `n/a`,
`none`, `no value`, `empty`, `undefined`, `unknown`, `missing`. The comparison ignores case and extra
whitespace.

## Limits

- **File inputs are never filled.** A browser does not allow it, and the library does not try.
- **Hidden inputs are skipped**, so a token or a tracking field cannot be overwritten.
- **`contenteditable` regions are not form controls** and are not detected. Mirror the content into a
  hidden field yourself, or fill the region from `extract()` in your own code.
- **Custom widgets** (Radix, Headless UI, a `<div>` with roles) are not filled. The library writes to
  native elements. Widgets that keep a real `<input>` or `<select>` in the DOM and mirror it work;
  widgets that render a hidden mirror without a native control do not update visually.
- **Objects and arrays** in the model's answer are only usable for multi-value fields. Anywhere else
  they are skipped with `unsupported-value`.
- **Fields outside the form element** are not seen, even when they point at it with the `form`
  attribute.
- Nothing is submitted. The library fills, the user checks, your code submits.
