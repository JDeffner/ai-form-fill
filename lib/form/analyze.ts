/**
 * Reading side of the form engine: field detection and metadata extraction.
 */

import type { FieldInfo, FieldOption } from '../core/types';

/**
 * Resolve the visible label of an input that lives inside an option group
 * (radio button, checkbox): `label[for]` first, then a wrapping `<label>`.
 */
export function getInputLabel(input: HTMLInputElement): string {
  if (input.id) {
    const labelElement = document.querySelector(`label[for="${input.id}"]`);
    if (labelElement) return labelElement.textContent?.trim() || '';
  }
  const parentLabel = input.closest('label');
  return parentLabel ? parentLabel.textContent?.trim() || '' : '';
}

/**
 * All inputs of the same type sharing `element`'s name inside its form — the
 * radio or checkbox group it belongs to. Falls back to `[element]` when the
 * input has no form or no name and therefore forms no group.
 */
export function getInputGroup(element: HTMLInputElement): HTMLInputElement[] {
  const form = element.closest('form');
  if (!form || !element.name) return [element];
  return Array.from(
    form.querySelectorAll<HTMLInputElement>(
      `input[type="${element.type}"][name="${element.name}"]`,
    ),
  );
}

/**
 * Read the current value of a field, in the same shape the library writes it.
 *
 * - text-like inputs and `<textarea>`: the value,
 * - `<select>`: the value, or the selected values when `multiple`,
 * - radio: the checked value of its group, `''` when nothing is checked,
 * - checkbox group: the checked values,
 * - single checkbox: `'true'` or `'false'`.
 */
export function readFieldValue(element: HTMLElement): string | string[] {
  if (element instanceof HTMLSelectElement) {
    if (element.multiple) return Array.from(element.selectedOptions, (option) => option.value);
    return element.value;
  }
  if (element instanceof HTMLTextAreaElement) return element.value;
  if (element instanceof HTMLInputElement) {
    if (element.type === 'radio') {
      return getInputGroup(element).find((radio) => radio.checked)?.value ?? '';
    }
    if (element.type === 'checkbox') {
      const group = getInputGroup(element);
      if (group.length > 1) {
        return group.filter((box) => box.checked).map((box) => box.value || 'on');
      }
      return element.checked ? 'true' : 'false';
    }
    return element.value;
  }
  return '';
}

/**
 * Whether a field holds no value: an empty string, no selected option, an
 * unchecked radio group, or an unchecked checkbox (single or group).
 */
export function isFieldEmpty(element: HTMLElement): boolean {
  const value = readFieldValue(element);
  if (Array.isArray(value)) return value.length === 0;
  if (element instanceof HTMLInputElement && element.type === 'checkbox') return !element.checked;
  return value === '';
}

/**
 * Whether a field is required. A radio or checkbox group counts as required
 * when any member carries the `required` attribute.
 */
export function isFieldRequired(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'radio' || element.type === 'checkbox') {
      return getInputGroup(element).some((input) => input.required);
    }
    return element.required;
  }
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.required;
  }
  return false;
}

/** Resolve `aria-label`, `aria-labelledby` (references joined) or `title`. */
function getAccessibleLabel(element: HTMLElement): string | undefined {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const title = element.getAttribute('title')?.trim();
  if (title) return title;

  return undefined;
}

/** Read the selectable options of a `<select>`, skipping empty placeholders. */
function getSelectOptions(select: HTMLSelectElement): FieldOption[] {
  return Array.from(select.options)
    .filter((option) => option.value !== '')
    .map((option) => ({
      value: option.value,
      label: option.textContent?.trim() || option.value,
    }));
}

/**
 * Extract metadata (key, type, name, label, placeholder, options, hint) from a
 * field element. The key defaults to `name` → `id` → `field`;
 * {@link getFormFields} re-derives keys with per-form collision handling.
 */
export function analyzeField(element: HTMLElement): FieldInfo {
  const fieldInfo: FieldInfo = { element, key: '', type: 'text' };

  if (element instanceof HTMLInputElement) {
    fieldInfo.type = element.type;
    fieldInfo.name = element.name || undefined;
    fieldInfo.placeholder = element.placeholder || undefined;
    fieldInfo.pattern = element.pattern || undefined;
    if (element.type === 'checkbox') fieldInfo.placeholder = element.value || 'checkbox option';
    if (element.type === 'radio') fieldInfo.placeholder = element.value || 'radio option';
  } else if (element instanceof HTMLTextAreaElement) {
    fieldInfo.type = 'textarea';
    fieldInfo.name = element.name || undefined;
    fieldInfo.placeholder = element.placeholder || undefined;
  } else if (element instanceof HTMLSelectElement) {
    fieldInfo.type = 'select';
    fieldInfo.name = element.name || undefined;
    fieldInfo.options = getSelectOptions(element);
    if (element.multiple) fieldInfo.multiple = true;
  }

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) fieldInfo.label = label.textContent?.trim();
  }
  if (!fieldInfo.label) {
    const parentLabel = element.closest('label');
    if (parentLabel) fieldInfo.label = parentLabel.textContent?.trim();
  }
  if (!fieldInfo.label) {
    fieldInfo.label = getAccessibleLabel(element);
  }

  const hint = element.dataset.affHint;
  if (hint) fieldInfo.hint = hint;

  fieldInfo.key = fieldInfo.name || element.id || 'field';
  return fieldInfo;
}

/** Merge the `data-aff-hint` values of all inputs in a group. */
function mergeGroupHints(fieldInfo: FieldInfo, inputs: HTMLInputElement[]): void {
  fieldInfo.hint = undefined;
  for (const input of inputs) {
    const hint = input.dataset.affHint;
    if (hint) fieldInfo.hint = `${fieldInfo.hint ?? ''} ${hint}`.trim();
  }
}

/** Build a single FieldInfo for a group of same-name radios. */
function buildRadioGroup(radios: HTMLInputElement[]): FieldInfo {
  const fieldInfo = analyzeField(radios[0]);
  fieldInfo.options = radios.map((radio) => ({
    value: radio.value,
    label: getInputLabel(radio) || radio.value,
  }));
  mergeGroupHints(fieldInfo, radios);
  return fieldInfo;
}

/** Build a single multi-value FieldInfo for a group of same-name checkboxes. */
function buildCheckboxGroup(checkboxes: HTMLInputElement[]): FieldInfo {
  const fieldInfo = analyzeField(checkboxes[0]);
  fieldInfo.multiple = true;
  fieldInfo.placeholder = undefined;
  fieldInfo.options = checkboxes.map((checkbox) => ({
    value: checkbox.value || 'on',
    label: getInputLabel(checkbox) || checkbox.value || 'on',
  }));
  mergeGroupHints(fieldInfo, checkboxes);
  return fieldInfo;
}

/**
 * Assign stable keys to the detected fields: `name` → `id` → `field_<index>`,
 * with collisions deduplicated (`email`, `email_2`, ...). All later steps
 * (prompt, schema, fill loop) use these keys.
 */
function assignKeys(fields: FieldInfo[]): void {
  const used = new Set<string>();
  fields.forEach((field, index) => {
    const base = field.name || field.element.id || `field_${index + 1}`;
    let key = base;
    let suffix = 2;
    while (used.has(key)) {
      key = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(key);
    field.key = key;
  });
}

/**
 * Return every fillable field in a form, in DOM order.
 *
 * - Radio buttons sharing a `name` are grouped into one {@link FieldInfo}
 *   carrying all options.
 * - Checkboxes sharing a `name` are grouped into one multi-value field.
 * - Every field receives a stable, unique {@link FieldInfo.key}.
 */
export function getFormFields(formElement: HTMLFormElement): FieldInfo[] {
  const elements = Array.from(
    formElement.querySelectorAll(
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select',
    ),
  );

  // Bucket radios/checkboxes by name so groups can be emitted at the position
  // of their first member.
  const radiosByName = new Map<string, HTMLInputElement[]>();
  const checkboxesByName = new Map<string, HTMLInputElement[]>();
  for (const element of elements) {
    if (!(element instanceof HTMLInputElement) || !element.name) continue;
    const bucket =
      element.type === 'radio'
        ? radiosByName
        : element.type === 'checkbox'
          ? checkboxesByName
          : undefined;
    if (!bucket) continue;
    if (!bucket.has(element.name)) bucket.set(element.name, []);
    bucket.get(element.name)!.push(element);
  }

  const fields: FieldInfo[] = [];
  const emittedGroups = new Set<string>();

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    if (element instanceof HTMLInputElement && element.type === 'radio') {
      if (!element.name) continue; // a nameless radio cannot form a group
      if (emittedGroups.has(`radio:${element.name}`)) continue;
      emittedGroups.add(`radio:${element.name}`);
      fields.push(buildRadioGroup(radiosByName.get(element.name)!));
      continue;
    }

    if (
      element instanceof HTMLInputElement &&
      element.type === 'checkbox' &&
      element.name &&
      checkboxesByName.get(element.name)!.length > 1
    ) {
      if (emittedGroups.has(`checkbox:${element.name}`)) continue;
      emittedGroups.add(`checkbox:${element.name}`);
      fields.push(buildCheckboxGroup(checkboxesByName.get(element.name)!));
      continue;
    }

    fields.push(analyzeField(element));
  }

  assignKeys(fields);
  return fields;
}
