/**
 * Undo side of the form engine: restore the values a fill overwrote.
 */

import type { FillResult } from '../core/types';
import { getInputGroup } from './analyze';
import { dispatchFieldEvents, setNativeChecked, setNativeValue } from './apply';

/** Restore an unchecked/checked state on every input of a group. */
function restoreGroup(group: HTMLInputElement[], checkedValues: string[]): void {
  for (const input of group) {
    const shouldCheck = checkedValues.includes(input.value || 'on');
    if (shouldCheck === input.checked) continue;
    setNativeChecked(input, shouldCheck);
    dispatchFieldEvents(input);
  }
}

/** Restore one field to the value it held before the fill. */
function restoreField(element: HTMLElement, previous: string | string[]): void {
  if (element instanceof HTMLSelectElement) {
    if (element.multiple) {
      const values = Array.isArray(previous) ? previous : [previous];
      for (const option of element.options) option.selected = values.includes(option.value);
      dispatchFieldEvents(element);
      return;
    }
    setNativeValue(element, Array.isArray(previous) ? (previous[0] ?? '') : previous);
    dispatchFieldEvents(element);
    return;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'radio') {
      // `''` means nothing was checked, which no radio value can match.
      const value = Array.isArray(previous) ? (previous[0] ?? '') : previous;
      restoreGroup(getInputGroup(element), value === '' ? [] : [value]);
      return;
    }
    if (element.type === 'checkbox') {
      const group = getInputGroup(element);
      if (group.length > 1 || Array.isArray(previous)) {
        restoreGroup(group, Array.isArray(previous) ? previous : [previous]);
        return;
      }
      setNativeChecked(element, previous === 'true');
      dispatchFieldEvents(element);
      return;
    }
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, Array.isArray(previous) ? previous.join(', ') : previous);
    dispatchFieldEvents(element);
  }
}

/**
 * Undo a fill: write every field in `result.filled` back to the value it held
 * before, using the same native setters and `input`/`change` events as
 * `applyFieldValue`, so frameworks observe the restore too.
 *
 * @param result - The {@link FillResult} returned by `fillForm`.
 * @param keys - Restore only these field keys; omit to restore all of them.
 *
 * @example
 * ```typescript
 * const result = await aiForm.fillForm(form, text);
 * revertFill(result); // back to the state before the fill
 * ```
 */
export function revertFill(result: FillResult, keys?: string[]): void {
  for (const entry of result.filled) {
    if (keys && !keys.includes(entry.key)) continue;
    restoreField(entry.element, entry.previous);
  }
}
