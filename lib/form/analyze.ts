/**
 * Reading side of the form engine: field detection and metadata extraction.
 */

import type { FieldInfo } from '../core/types';

/** Resolve the visible label of a radio button. */
export function getRadioLabel(radio: HTMLInputElement): string {
  if (radio.id) {
    const labelElement = document.querySelector(`label[for="${radio.id}"]`);
    if (labelElement) return labelElement.textContent?.trim() || '';
  }
  const parentLabel = radio.closest('label');
  return parentLabel ? parentLabel.textContent?.trim() || '' : '';
}

/**
 * Extract metadata (type, name, label, placeholder, hint) from a field element.
 */
export function analyzeField(element: HTMLElement): FieldInfo {
  const fieldInfo: FieldInfo = { element, type: 'text' };

  if (element instanceof HTMLInputElement) {
    fieldInfo.type = element.type;
    fieldInfo.name = element.name;
    fieldInfo.placeholder = element.placeholder;
    fieldInfo.pattern = element.pattern;
    if (element.type === 'checkbox') fieldInfo.placeholder = element.value || 'checkbox option';
    if (element.type === 'radio') fieldInfo.placeholder = element.value || 'radio option';
  } else if (element instanceof HTMLTextAreaElement) {
    fieldInfo.type = 'textarea';
    fieldInfo.name = element.name;
    fieldInfo.placeholder = element.placeholder;
  } else if (element instanceof HTMLSelectElement) {
    fieldInfo.type = 'select';
    fieldInfo.name = element.name;
  }

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) fieldInfo.label = label.textContent?.trim();
  }
  if (!fieldInfo.label) {
    const parentLabel = element.closest('label');
    if (parentLabel) fieldInfo.label = parentLabel.textContent?.trim();
  }

  const hint = element.dataset.affHint;
  if (hint) fieldInfo.hint = hint;

  return fieldInfo;
}

/**
 * Return every fillable field in a form. Radio buttons are grouped by name into
 * a single {@link FieldInfo} carrying all options.
 */
export function getFormFields(formElement: HTMLFormElement): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const radioGroups = new Map<string, HTMLInputElement[]>();

  const elements = formElement.querySelectorAll(
    'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select',
  );

  elements.forEach((element) => {
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      if (element.name) {
        if (!radioGroups.has(element.name)) radioGroups.set(element.name, []);
        radioGroups.get(element.name)!.push(element);
      }
    } else if (element instanceof HTMLElement) {
      fields.push(analyzeField(element));
    }
  });

  for (const [, radioGroup] of radioGroups.entries()) {
    if (radioGroup.length === 0) continue;
    const fieldInfo = analyzeField(radioGroup[0]);
    fieldInfo.options = radioGroup.map((radio) => ({
      value: radio.value,
      label: getRadioLabel(radio) || radio.value,
    }));
    for (const radio of radioGroup) {
      const hint = radio.dataset.affHint;
      if (hint) fieldInfo.hint = `${fieldInfo.hint ?? ''} ${hint}`.trim();
    }
    fields.push(fieldInfo);
  }

  return fields;
}

/**
 * The best identifier for a field: name, then label, then placeholder,
 * else `'unknown'`.
 */
export function getFieldIdentifier(field: FieldInfo): string {
  return field.name || field.label || field.placeholder || 'unknown';
}
