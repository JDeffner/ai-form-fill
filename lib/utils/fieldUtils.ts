/**
 * Utilities for reading form fields and writing values back to them.
 */

import type { FieldInfo } from '../core/types';
import { affConfig } from '../core/config';

/** AI responses that mean "no value", so the field is left untouched. */
const EMPTY_VALUE_INDICATORS = [
  'null', '', 'n/a', 'none', 'no value', 'empty', 'undefined', 'unknown', 'missing',
] as const;

/** Values that mean a checkbox should be checked. */
const TRUTHY_VALUES = ['true', 'yes', '1', 'checked', 'on'] as const;

/** Dispatch input and change events so framework reactivity picks up the value. */
function dispatchFieldEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function isEmptyValue(normalizedValue: string): boolean {
  return EMPTY_VALUE_INDICATORS.includes(normalizedValue as typeof EMPTY_VALUE_INDICATORS[number]);
}

/** Resolve the visible label of a radio button. */
function getRadioLabel(radio: HTMLInputElement): string {
  if (radio.id) {
    const labelElement = document.querySelector(`label[for="${radio.id}"]`);
    if (labelElement) return labelElement.textContent?.trim() || '';
  }
  const parentLabel = radio.closest('label');
  return parentLabel ? parentLabel.textContent?.trim() || '' : '';
}

/**
 * Parse various date formats into the value expected by an HTML date/time input.
 * @returns The formatted value, or `null` if parsing failed.
 */
function formatDateValue(value: string, inputType: string): string | null {
  let date: Date | null = null;
  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
    date = new Date(trimmedValue);
  } else if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(trimmedValue)) {
    const parts = trimmedValue.split(/[\/.-]/);
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    date = new Date(year, month - 1, day);
  } else {
    const parsed = Date.parse(trimmedValue);
    if (!isNaN(parsed)) date = new Date(parsed);
  }

  if (inputType === 'time') {
    const timeMatch = trimmedValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const ampm = timeMatch[4]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return null;
  }

  if (!date || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  switch (inputType) {
    case 'datetime-local':
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    case 'month':
      return `${year}-${month}`;
    case 'week': {
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }
    default:
      return `${year}-${month}-${day}`;
  }
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
export function getFillTargets(formElement: HTMLFormElement): FieldInfo[] {
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

function setCheckboxValue(element: HTMLInputElement, normalizedValue: string): void {
  element.checked = TRUTHY_VALUES.includes(normalizedValue as typeof TRUTHY_VALUES[number]);
  dispatchFieldEvents(element);
}

function setRadioValue(element: HTMLInputElement, normalizedValue: string): void {
  const form = element.closest('form');
  if (!form || !element.name) return;

  const radios = form.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][name="${element.name}"]`,
  );
  for (const radio of radios) {
    const radioLabel = getRadioLabel(radio).toLowerCase();
    const radioValue = radio.value.toLowerCase();
    if (
      radioValue === normalizedValue ||
      radioLabel === normalizedValue ||
      radioValue.includes(normalizedValue) ||
      radioLabel.includes(normalizedValue) ||
      normalizedValue.includes(radioValue) ||
      normalizedValue.includes(radioLabel)
    ) {
      radio.checked = true;
      dispatchFieldEvents(radio);
      break;
    }
  }
}

function setDateValue(element: HTMLInputElement, value: string): void {
  const formattedValue = formatDateValue(value, element.type);
  if (formattedValue) {
    element.value = formattedValue;
    dispatchFieldEvents(element);
  } else if (affConfig.debug) {
    console.warn(`Could not parse date value "${value}" for ${element.type} input`);
  }
}

function setSelectValue(element: HTMLSelectElement, normalizedValue: string, originalValue: string): void {
  let option = Array.from(element.options).find(
    (opt) => opt.value.toLowerCase() === normalizedValue || opt.text.toLowerCase() === normalizedValue,
  );
  if (!option) {
    option = Array.from(element.options).find(
      (opt) =>
        opt.value.toLowerCase().includes(normalizedValue) ||
        opt.text.toLowerCase().includes(normalizedValue) ||
        normalizedValue.includes(opt.value.toLowerCase()) ||
        normalizedValue.includes(opt.text.toLowerCase()),
    );
  }
  if (option) {
    element.value = option.value;
    dispatchFieldEvents(element);
  } else if (affConfig.debug) {
    console.warn(
      `No matching option for select. Value: "${originalValue}", Options:`,
      Array.from(element.options).map((opt) => `${opt.value} (${opt.text})`),
    );
  }
}

/**
 * Set a field's value and trigger change events for framework reactivity.
 * Handles text, checkbox, radio, date/time and select inputs.
 */
export function setFieldValue(element: HTMLElement, value: string): void {
  const normalizedValue = value.trim().toLowerCase();
  if (isEmptyValue(normalizedValue)) return;

  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case 'checkbox':
        setCheckboxValue(element, normalizedValue);
        break;
      case 'radio':
        setRadioValue(element, normalizedValue);
        break;
      case 'date':
      case 'datetime-local':
      case 'time':
        setDateValue(element, value);
        break;
      default:
        element.value = value;
        dispatchFieldEvents(element);
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = value;
    dispatchFieldEvents(element);
  } else if (element instanceof HTMLSelectElement) {
    setSelectValue(element, normalizedValue, value);
  }
}

/**
 * The best identifier for a field: name, then label, then placeholder,
 * else `'unknown'`.
 */
export function getFieldIdentifier(field: FieldInfo): string {
  return field.name || field.label || field.placeholder || 'unknown';
}
