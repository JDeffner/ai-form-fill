/**
 * Writing side of the form engine: applying values to fields and dispatching
 * the events framework reactivity listens for.
 *
 * Values are written through the native prototype setters so that controlled
 * React components (which override `value`/`checked` with their own tracker)
 * register the change as well.
 */

import type { SkipReason } from '../core/types';
import { getInputGroup, getInputLabel } from './analyze';

/** Outcome of {@link applyFieldValue}. */
export type ApplyResult =
  { applied: true; value: string | string[] } | { applied: false; reason: SkipReason };

/** AI responses that mean "no value", so the field is left untouched. */
const EMPTY_VALUE_INDICATORS = [
  'null',
  '',
  'n/a',
  'none',
  'no value',
  'empty',
  'undefined',
  'unknown',
  'missing',
] as const;

/** Values that mean a checkbox should be checked / unchecked. */
const TRUTHY_VALUES = ['true', 'yes', '1', 'checked', 'on'] as const;
const FALSY_VALUES = ['false', 'no', '0', 'unchecked', 'off'] as const;

const applied = (value: string | string[]): ApplyResult => ({ applied: true, value });
const skipped = (reason: SkipReason): ApplyResult => ({ applied: false, reason });

/** Dispatch input and change events so framework reactivity picks up the value. */
export function dispatchFieldEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Lowercased, whitespace-collapsed comparison form. */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isEmptyText(text: string): boolean {
  return EMPTY_VALUE_INDICATORS.includes(
    normalize(text) as (typeof EMPTY_VALUE_INDICATORS)[number],
  );
}

/** Coerce a scalar model value to a string; `null` for arrays/objects. */
function coerceScalar(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

/**
 * Set `value` through the native prototype setter so React's value tracker
 * (which shadows the property on the instance) sees the change.
 */
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

/** Same as {@link setNativeValue}, for the `checked` property. */
export function setNativeChecked(element: HTMLInputElement, checked: boolean): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
  if (descriptor?.set) {
    descriptor.set.call(element, checked);
  } else {
    element.checked = checked;
  }
}

/**
 * Ordered option matching (no substring matching, see B1):
 * 1. exact `value`,
 * 2. exact label,
 * 3. case/whitespace-insensitive equality on value or label.
 */
function matchesOption(candidate: string, optionValue: string, optionLabel: string): boolean {
  if (candidate === optionValue) return true;
  if (candidate === optionLabel) return true;
  const normalized = normalize(candidate);
  return normalized === normalize(optionValue) || normalized === normalize(optionLabel);
}

/** Pick the first option matching `candidate`, honoring the pass order. */
function findOption<T>(
  candidate: string,
  options: T[],
  getValue: (option: T) => string,
  getLabel: (option: T) => string,
): T | undefined {
  const exactValue = options.find((option) => getValue(option) === candidate);
  if (exactValue) return exactValue;
  const exactLabel = options.find((option) => getLabel(option) === candidate);
  if (exactLabel) return exactLabel;
  const normalized = normalize(candidate);
  return options.find(
    (option) =>
      normalize(getValue(option)) === normalized || normalize(getLabel(option)) === normalized,
  );
}

// --- Date/time validation (strict ISO, see B2) -----------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

/** True when year/month/day form a real calendar date. */
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Validate an ISO value for a date/time input type; `null` when invalid. */
function validateDateLike(value: string, inputType: string): string | null {
  const trimmed = value.trim();
  switch (inputType) {
    case 'date': {
      const match = DATE_RE.exec(trimmed);
      if (!match) return null;
      return isRealDate(Number(match[1]), Number(match[2]), Number(match[3])) ? trimmed : null;
    }
    case 'datetime-local': {
      const match = DATETIME_RE.exec(trimmed);
      if (!match) return null;
      return isRealDate(Number(match[1]), Number(match[2]), Number(match[3])) ? trimmed : null;
    }
    case 'time': {
      // Normalize an unambiguous single-digit hour ("9:30" -> "09:30").
      const padded = /^\d:/.test(trimmed) ? `0${trimmed}` : trimmed;
      return TIME_RE.test(padded) ? padded : null;
    }
    case 'month':
      return MONTH_RE.test(trimmed) ? trimmed : null;
    case 'week':
      return WEEK_RE.test(trimmed) ? trimmed : null;
    default:
      return null;
  }
}

// --- Per-type application ---------------------------------------------------

function applyText(element: HTMLInputElement | HTMLTextAreaElement, value: unknown): ApplyResult {
  const text = coerceScalar(value);
  if (text === null) return skipped('unsupported-value');
  if (isEmptyText(text)) return skipped('empty-value');
  setNativeValue(element, text);
  dispatchFieldEvents(element);
  return applied(text);
}

function applyDateLike(element: HTMLInputElement, value: unknown): ApplyResult {
  const text = coerceScalar(value);
  if (text === null) return skipped('unsupported-value');
  if (isEmptyText(text)) return skipped('empty-value');
  const validated = validateDateLike(text, element.type);
  if (validated === null) return skipped('invalid-date-format');
  setNativeValue(element, validated);
  dispatchFieldEvents(element);
  return applied(validated);
}

function applyCheckbox(element: HTMLInputElement, value: unknown): ApplyResult {
  const group = getInputGroup(element);

  // Multi-option group: the value is a list of option values/labels to check.
  if (group.length > 1 || Array.isArray(value)) {
    const rawValues = Array.isArray(value) ? value : [value];
    const candidates = rawValues
      .map(coerceScalar)
      .filter((text): text is string => text !== null && !isEmptyText(text));
    if (candidates.length === 0) return skipped('empty-value');

    const checkedValues: string[] = [];
    for (const checkbox of group) {
      const optionValue = checkbox.value || 'on';
      const optionLabel = getInputLabel(checkbox) || optionValue;
      const shouldCheck = candidates.some((candidate) =>
        matchesOption(candidate, optionValue, optionLabel),
      );
      if (shouldCheck !== checkbox.checked) {
        setNativeChecked(checkbox, shouldCheck);
        dispatchFieldEvents(checkbox);
      }
      if (shouldCheck) checkedValues.push(optionValue);
    }
    if (checkedValues.length === 0) return skipped('no-matching-option');
    return applied(checkedValues);
  }

  // Single checkbox: boolean semantics.
  if (typeof value === 'boolean') {
    setNativeChecked(element, value);
    dispatchFieldEvents(element);
    return applied(String(value));
  }
  const text = coerceScalar(value);
  if (text === null) return skipped('unsupported-value');
  if (text.trim() === '') return skipped('empty-value');
  const normalized = normalize(text);
  let checked: boolean;
  if (TRUTHY_VALUES.includes(normalized as (typeof TRUTHY_VALUES)[number])) checked = true;
  else if (FALSY_VALUES.includes(normalized as (typeof FALSY_VALUES)[number])) checked = false;
  // The model may answer with the checkbox's own value ("technology") to mean "check it".
  else if (matchesOption(text, element.value || 'on', getInputLabel(element))) checked = true;
  else if (isEmptyText(text)) return skipped('empty-value');
  else return skipped('unsupported-value');
  setNativeChecked(element, checked);
  dispatchFieldEvents(element);
  return applied(String(checked));
}

function applyRadio(element: HTMLInputElement, value: unknown): ApplyResult {
  const text = coerceScalar(value);
  if (text === null) return skipped('unsupported-value');
  if (isEmptyText(text)) return skipped('empty-value');

  const radios = getInputGroup(element);

  const match = findOption(
    text,
    radios,
    (radio) => radio.value,
    (radio) => getInputLabel(radio) || radio.value,
  );
  if (!match) return skipped('no-matching-option');
  setNativeChecked(match, true);
  dispatchFieldEvents(match);
  return applied(match.value);
}

function applySelect(element: HTMLSelectElement, value: unknown): ApplyResult {
  if (element.multiple) return applyMultiSelect(element, value);

  const text = coerceScalar(value);
  if (text === null) return skipped('unsupported-value');
  if (isEmptyText(text)) return skipped('empty-value');

  const options = Array.from(element.options).filter((option) => option.value !== '');
  const match = findOption(
    text,
    options,
    (option) => option.value,
    (option) => option.textContent?.trim() || option.value,
  );
  if (!match) return skipped('no-matching-option');
  setNativeValue(element, match.value);
  dispatchFieldEvents(element);
  return applied(match.value);
}

function applyMultiSelect(element: HTMLSelectElement, value: unknown): ApplyResult {
  const rawValues = Array.isArray(value) ? value : [value];
  const candidates = rawValues
    .map(coerceScalar)
    .filter((text): text is string => text !== null && !isEmptyText(text));
  if (candidates.length === 0) return skipped('empty-value');

  const options = Array.from(element.options).filter((option) => option.value !== '');
  const selectedValues: string[] = [];
  for (const option of options) {
    const label = option.textContent?.trim() || option.value;
    const selected = candidates.some((candidate) => matchesOption(candidate, option.value, label));
    option.selected = selected;
    if (selected) selectedValues.push(option.value);
  }
  if (selectedValues.length === 0) return skipped('no-matching-option');
  dispatchFieldEvents(element);
  return applied(selectedValues);
}

/**
 * Apply a model value to a field and trigger change events for framework
 * reactivity. Handles text, checkbox (single and group), radio, date/time and
 * select (single and multiple) inputs.
 *
 * Never throws for value problems — returns a discriminated result instead so
 * callers can report per-field outcomes.
 */
export function applyFieldValue(element: HTMLElement, value: unknown): ApplyResult {
  if (value === null || value === undefined) return skipped('empty-value');

  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case 'checkbox':
        return applyCheckbox(element, value);
      case 'radio':
        return applyRadio(element, value);
      case 'date':
      case 'datetime-local':
      case 'time':
      case 'month':
      case 'week':
        return applyDateLike(element, value);
      default:
        return applyText(element, value);
    }
  }
  if (element instanceof HTMLTextAreaElement) {
    return applyText(element, value);
  }
  if (element instanceof HTMLSelectElement) {
    return applySelect(element, value);
  }
  return skipped('unsupported-value');
}
