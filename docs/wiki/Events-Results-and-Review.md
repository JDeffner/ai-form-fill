# Events, Results and Review

This page covers what a fill reports: the `aff:*` DOM events, the `FillResult`, undo, and the review
path that writes nothing until the user agrees.

## Events

Every fill reports itself as `CustomEvent`s on the form. They bubble and cross shadow boundaries, so
one listener on the form or on any ancestor sees everything. The names are in `HTMLElementEventMap`,
so `event.detail` is typed.

| Event              | `detail`                            | When                                           |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| `aff:start`        | `{ text }`                          | Before the provider request                    |
| `aff:field-filled` | `{ key, element, value, previous }` | After a field was written                      |
| `aff:done`         | The `FillResult`                    | After the fill finished                        |
| `aff:error`        | `{ error }`                         | Extraction failed; the error is rethrown after |

Nothing in the library listens to them, so you can use them freely.

```typescript
const form = document.querySelector('#contact');

form.addEventListener('aff:start', () => spinner.show());
form.addEventListener('aff:field-filled', (event) => {
  event.detail.element.classList.add('just-filled');
});
form.addEventListener('aff:done', (event) => {
  spinner.hide();
  status.textContent = `Filled ${event.detail.filled.length} field(s).`;
});
form.addEventListener('aff:error', (event) => {
  spinner.hide();
  console.error(event.detail.error);
});
```

`fillField` dispatches `aff:field-filled` on the field it wrote, not on the form, because a single
field fill has no form context of its own. `revertFill` dispatches the plain `input` and `change`
events, not `aff:*` ones.

## FillResult

Both `fillForm` and `applyExtraction` resolve to the same shape.

| Field             | Type                                       | Meaning                                                     |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `filled`          | `Array<{ key, element, value, previous }>` | Every field that was written, with the value it held before |
| `skipped`         | `Array<{ key, reason }>`                   | Fields the model answered for, whose value was not usable   |
| `unmatchedKeys`   | `string[]`                                 | Keys in the answer that match no field of the form          |
| `missingRequired` | `string[]`                                 | Required fields that are still empty, over the whole form   |
| `raw`             | `string`                                   | The unmodified model output, for debugging                  |

```typescript
const result = await aiForm.fillForm(form, text);

for (const entry of result.filled) console.log(entry.key, entry.value);
for (const { key, reason } of result.skipped) console.warn(`${key}: ${reason}`);
if (result.missingRequired.length) {
  status.textContent = `Still needed: ${result.missingRequired.join(', ')}.`;
}
```

`value` and `previous` are a `string` for single-value fields and a `string[]` for multi-value ones
(checkbox groups and `<select multiple>`). A radio group that had nothing checked reports `''`.

### Skip reasons

| Reason                | Cause                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `empty-value`         | The answer was empty or one of the "no value" words               |
| `invalid-date-format` | The date or time did not match the required ISO format            |
| `no-matching-option`  | No option of a select, radio group or checkbox group matched      |
| `unsupported-value`   | The value's type cannot go into this field, for example an object |

A skip is never an error: application problems land here, only provider and parse failures throw.
See [Errors and Troubleshooting](Errors-and-Troubleshooting).

### Missing required fields

`missingRequired` is computed after the fill, over **all** fields of the form, not only the targeted
ones. A radio or checkbox group counts as required when any member carries `required`. Use it to
tell the user what is left to do by hand.

## Undo

Every `filled` entry records `previous`, so a fill can be taken back exactly, including empty
strings, unchecked radio groups and multi-selects. The restore goes through the same native setters
and events, so frameworks observe it too.

```typescript
import { revertFill } from 'ai-form-fill';

const result = await aiForm.fillForm(form, text);
revertFill(result); // everything back
revertFill(result, ['email']); // or one field
```

The controller wraps it as `undo()`, which also clears the result and returns the state to `idle`.
The element shows an Undo button after a fill.

## Review before writing

`extract` runs the request and the parsing but leaves the form alone. `applyExtraction` writes a
reviewed extraction and returns the same `FillResult` as a fill. `fillForm` is exactly the two in
sequence, so they cannot drift apart.

### With the class

```typescript
const { data, fields, raw } = await aiForm.extract(form, text);
// data: { firstName: 'John', email: 'john@example.com', ... }

const edited = await showReviewUI(data); // your UI, your rules
const result = aiForm.applyExtraction(edited, fields, { raw, form });
```

`fields` is the `FieldInfo[]` the schema was built from, in document order. Pass it back unchanged;
it carries the element each key belongs to. Drop a key from `data` and that field is never written.
`raw` and `form` are optional: `raw` only travels into the result, and `form` is where the events are
dispatched (it is derived from the fields when omitted).

### With the controller

```typescript
const controller = createFormFill({ form: '#contact', source: '#notes' });

const { data, fields } = await controller.extract();
const approved = Object.fromEntries(Object.entries(data).filter(([key]) => userAccepted.has(key)));
const result = controller.applyExtracted(approved, fields);
```

`extract` rejects the way `AIFormFill.extract` does and leaves the state untouched.
`applyExtracted` puts the result into the snapshot, so `undo()` works afterwards.

### With the React hook

```tsx
const { formRef, extract, applyExtracted } = useFormFill();

async function review(text: string) {
  const { data, fields } = await extract(text);
  setPending({ data, fields }); // render checkboxes from data
}

function apply(chosen: Record<string, unknown>) {
  const result = applyExtracted(chosen, pending.fields);
}
```

### With the element

The `review` attribute does all of it: the panel lists one row per value with a checkbox, and Apply
writes only the checked rows.

```html
<ai-form-fill for="#contact" review></ai-form-fill>
```

Use the review path whenever the form carries anything consequential. Model output is not to be
trusted blindly, and a fill is never a submit.
