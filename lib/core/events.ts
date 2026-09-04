/**
 * Lifecycle events. The library reports what it does as DOM CustomEvents, so
 * a page can react to a fill without wrapping the call: progress indicators,
 * highlighting, logging, analytics.
 *
 * All events bubble and cross shadow boundaries (`composed: true`), so a
 * single listener on the form (or on an ancestor) sees everything.
 */

import type { FillResult } from './types';

/**
 * The events the library dispatches, mapped to their `detail` payload.
 *
 * - `aff:start` — before the provider request, with the source text.
 * - `aff:field-filled` — after a value was written to a field.
 * - `aff:done` — after a fill finished, with the full {@link FillResult}.
 * - `aff:error` — when extraction failed; the error is rethrown afterwards.
 */
export type AFFEventMap = {
  'aff:start': { text: string };
  'aff:field-filled': {
    /** The stable field key the value was extracted under. */
    key: string;
    /** The element that was written to. */
    element: HTMLElement;
    /** The value that was applied. */
    value: string | string[];
    /** The value the field held before the fill. */
    previous: string | string[];
  };
  'aff:done': FillResult;
  'aff:error': { error: unknown };
};

/**
 * Dispatch one of the library's {@link AFFEventMap} events on `target`.
 *
 * @param target - The element the event is dispatched on (the form, or the
 *   filled field for single-field fills).
 * @param type - The event name.
 * @param detail - The payload, typed by the event name.
 */
export function dispatchAFFEvent<K extends keyof AFFEventMap>(
  target: EventTarget,
  type: K,
  detail: AFFEventMap[K],
): void {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

declare global {
  interface HTMLElementEventMap {
    'aff:start': CustomEvent<AFFEventMap['aff:start']>;
    'aff:field-filled': CustomEvent<AFFEventMap['aff:field-filled']>;
    'aff:done': CustomEvent<AFFEventMap['aff:done']>;
    'aff:error': CustomEvent<AFFEventMap['aff:error']>;
  }
}
